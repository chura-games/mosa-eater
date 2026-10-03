import * as THREE from 'three';
import {CollisionWorld,orientedBounds,resolveBox} from './Collision';
import {Mosasaurus} from '../entities/Mosasaurus';
import {SmoothCamera} from './SmoothCamera';
import {surfaceHeight} from './Water';

export function runCollisionTests(){
 let count=0;
 const assert=(condition:boolean,message:string)=>{if(!condition)throw new Error(message);count++;};
 const player=new Mosasaurus();player.mesh.position.set(0,-4,0);
 const target=new THREE.Group();
 const diverBounds=new THREE.Box3(new THREE.Vector3(-.3,-1,-.3),new THREE.Vector3(.3,1,.3));
 const hits=()=>player.biteBox().intersectsOBB(orientedBounds(diverBounds,target));
 target.position.set(0,-4,-4.7);assert(hits(),'Front prey should be inside the jaw');
 target.position.x=2;assert(!hits(),'Side prey must not be eaten');
 target.position.set(0,-4,2);assert(!hits(),'Prey behind the body must not be eaten');
 target.position.set(0,-7,-4.7);assert(!hits(),'Prey at another depth must not be eaten');
 player.heading=Math.PI/2;player.mesh.rotation.y=player.heading;
 target.position.set(-4.7,-4,0);assert(hits(),'Bite must follow player rotation');
 player.mesh.rotation.y=0;player.length=19.68;player.mesh.scale.setScalar(player.scale);
 target.position.set(0,-4,-4.7*player.scale);assert(hits(),'Jaw collider must grow with the model');
 player.bite=.45;assert(!player.biteActive,'Opening jaw should not deal damage');
 player.bite=.25;assert(player.biteActive,'Closing jaw should deal damage');
 player.bite=.05;assert(!player.biteActive,'Finished bite must not deal damage');

 const world=new CollisionWorld();
 const wall=new THREE.Mesh(new THREE.BoxGeometry(12,12,.2));wall.position.z=-8;world.add(wall);
 assert(world.blocked(new THREE.Vector3(0,0,-6),new THREE.Vector3(0,0,-10)),'Wall should block a bite');
 assert(!world.blocked(new THREE.Vector3(9,0,-6),new THREE.Vector3(9,0,-10)),'Open water should not block a bite');
 player.length=12;player.mesh.scale.setScalar(1);player.mesh.position.set(0,-2,0);player.heading=-.2;player.speed=24;
 const keys=new Set(['KeyW','ShiftLeft']);
 for(let i=0;i<80;i++){
  player.update(1/120,i/120,keys);world.resolve(player.mesh,player.bodySpheres);
  player.mesh.updateMatrixWorld(true);
  for(const local of player.bodySpheres){
   const sphere=local.clone().applyMatrix4(player.mesh.matrixWorld);
   assert(sphere.center.z-sphere.radius>=-7.9-.035,'Boost must not tunnel through a thin wall');
  }
 }
 assert(player.mesh.position.x>1,'Oblique contact should slide along the wall');
 const hull=orientedBounds(new THREE.Box3(new THREE.Vector3(-2,-1,-4),new THREE.Vector3(2,1,4)),new THREE.Group());
 const body=new THREE.Group();body.position.set(2.2,0,0);
 assert(resolveBox(body,[new THREE.Sphere(new THREE.Vector3(),.7)],hull),'Ship hull should block the predator');
 assert(body.position.x>=2.7,'Ship contact must separate the body from the hull');
 const floor=new CollisionWorld();const plane=new THREE.Mesh(new THREE.PlaneGeometry(10,10));plane.rotation.x=-Math.PI/2;floor.add(plane);
 body.position.set(0,.2,0);floor.resolve(body,[new THREE.Sphere(new THREE.Vector3(),1)]);
 assert(body.position.y>=1,'Seabed must stop sinking');
 const swimmer=new Mosasaurus();swimmer.mesh.position.set(0,-10,0);swimmer.speed=10;
 swimmer.update(.1,0,new Set(['KeyW']),{yaw:Math.PI/2,pitch:0});
 assert(swimmer.heading>0&&swimmer.heading<Math.PI/2&&swimmer.mesh.position.x<0,'W must start a gradual turn toward the camera');
 for(let i=0;i<120;i++)swimmer.update(1/60,i/60,new Set(['KeyW']),{yaw:Math.PI/2,pitch:0});
 assert(Math.abs(swimmer.heading-Math.PI/2)<.01,'Body must eventually align with camera direction');
 const heldHeading=swimmer.heading,heldPitch=swimmer.pitch;
 swimmer.update(.1,0,new Set(),{yaw:-1,pitch:1});
 assert(swimmer.heading===heldHeading&&swimmer.pitch===heldPitch,'Moving the camera at rest must not turn the body');
 swimmer.mesh.position.set(0,-10,0);
 swimmer.speed=10;
 swimmer.update(.1,0,new Set(['KeyD']),{yaw:0,pitch:0});
 assert(swimmer.mesh.position.x>.9&&Math.abs(swimmer.mesh.position.z)<.001,'D must strafe rather than turn');
 swimmer.mesh.position.set(0,-10,0);
 swimmer.update(.1,0,new Set(['KeyW']),{yaw:0,pitch:.6});
 assert(swimmer.mesh.position.y>-10&&swimmer.mesh.position.z<0,'Looking up and W must ascend');
 swimmer.mesh.position.set(0,-10,0);
 swimmer.update(.1,0,new Set(['KeyW']),{yaw:0,pitch:-.6});
 for(let i=0;i<60;i++)swimmer.update(1/60,i/60,new Set(['KeyW']),{yaw:0,pitch:-.6});
 assert(swimmer.mesh.position.y<-10,'Looking down and W must gradually turn and descend');
 swimmer.mesh.position.set(0,-10,0);
 swimmer.update(.1,0,new Set(['KeyW','KeyD']),{yaw:0,pitch:0});
 assert(swimmer.mesh.position.distanceTo(new THREE.Vector3(0,-10,0))<=1.001,'Diagonal movement must not be faster');
 const idle=new Mosasaurus(),idlePosition=idle.mesh.position.clone();
 idle.update(.1,0,new Set());idle.update(.1,1,new Set());
 assert(idle.mesh.position.equals(idlePosition)&&idle.tail.rotation.y===0,'Idle predator must stay still');
 for(let i=0;i<20;i++)idle.update(1/60,i/60,new Set(['KeyW']));
 assert(idle.mesh.position.z<idlePosition.z&&Math.abs(idle.tail.rotation.y)>.01,'Forward input must start swimming and tail animation');
 for(let i=0;i<120;i++)idle.update(1/60,i/60,new Set());
 assert(Math.abs(idle.tail.rotation.y)<.001,'Tail animation must settle after input stops');
 const camera=new THREE.PerspectiveCamera(),follow=new SmoothCamera();
 const center=new THREE.Vector3(0,-4,0);
 follow.update(camera,1/60,{yaw:0,pitch:0},center,1);
 const before=camera.quaternion.clone();follow.update(camera,1/60,{yaw:1,pitch:.4},center,1);
 const targetRotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(.4,1,0,'YXZ'));
 assert(camera.quaternion.angleTo(before)>0&&camera.quaternion.angleTo(targetRotation)>.1,'Mouse turn must interpolate rather than snap');
 for(let i=0;i<120;i++)follow.update(camera,1/60,{yaw:1,pitch:.4},center,1);
 assert(camera.quaternion.angleTo(targetRotation)<.001,'Smoothed view must reach the requested direction');
 const simulate=(fps:number)=>{
  const camera=new THREE.PerspectiveCamera(),follow=new SmoothCamera();
  follow.update(camera,1/fps,{yaw:0,pitch:0},center,1);
  for(let i=0;i<fps*2;i++)follow.update(camera,1/fps,{yaw:1,pitch:.3},center,1);
  return camera;
 };
 const slow=simulate(30),fast=simulate(120);
 assert(slow.position.distanceTo(fast.position)<.01&&slow.quaternion.angleTo(fast.quaternion)<.001,'Camera follow must be consistent at different frame rates');
 assert([1,2,3].some(t=>Math.abs(surfaceHeight(3,6,0)-surfaceHeight(3,6,t))>.05),'Water must animate over time');
 assert([0,2,5,9].every(t=>Math.abs(surfaceHeight(3,6,t))<=1.1),'Water height must remain bounded');
 return {assertions:count};
}
