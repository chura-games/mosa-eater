import * as THREE from 'three';
import {orientedBounds} from '../system/Collision';
import {playBounds} from '../system/Coast';
// The back just breaks the surface at this depth.
const swimDepth=-.8;
const toothColor=new THREE.Color(0xd6d5b7),bloodColor=new THREE.Color(0x7d0f12);
export class Mosasaurus{
 mesh=new THREE.Group(); tail:THREE.Object3D=new THREE.Group();jaw:THREE.Object3D=new THREE.Group();heading=0;energy=100;level=0;speed=0;bite=0;
 private swimPhase=0;
 private swimStrength=0;
 pitch=0;
 private drift=new THREE.Vector3(0,0,-1);
 private bank=0;
 private turnFlex=0;
 private tilt=0;
 private vertical=0;
 private groundTimer=0;
 private contactNormal=new THREE.Vector3();
 private contactTimer=0;
 // Set by the game: a forward snap on each bite, thrashing while a body is held, chewing after.
 lunge=0;feeding=0;chew=0;
 // 0..1: how bloodied the teeth are. Fades slowly.
 gore=0;
 private teeth:THREE.MeshStandardMaterial[]=[];
 private body?:THREE.Object3D;
 private fins:THREE.Object3D[]=[];
 constructor(){
 this.mesh.position.set(0,-2,16);
 }
 static fromModel(model:THREE.Object3D){
 const tail=model.getObjectByName('Tail'),jaw=model.getObjectByName('Jaw');
 if(!tail||!jaw)throw new Error('Mosasaurus model requires Tail and Jaw nodes');
 const player=new Mosasaurus();
 player.tail=tail;player.jaw=jaw;
 model.traverse(node=>{
  if(node.name.startsWith('Flipper'))player.fins.push(node);
  if(node instanceof THREE.Mesh&&node.material instanceof THREE.MeshStandardMaterial&&Math.abs(node.material.color.r-toothColor.r)+Math.abs(node.material.color.g-toothColor.g)+Math.abs(node.material.color.b-toothColor.b)<.03&&!player.teeth.includes(node.material))player.teeth.push(node.material);
 });
 player.body=model;player.mesh.add(model);
 return player;
 }
 get scale(){return 1+this.level*.16}
 readonly bodySpheres=[[-4,.75],[-2,1.05],[0,1.25],[2,.9],[4,.55]].map(([z,r])=>new THREE.Sphere(new THREE.Vector3(0,0,z),r));
 private readonly biteBounds=new THREE.Box3(new THREE.Vector3(-1.05,-.85,-5.7),new THREE.Vector3(1.05,.6,-3.3));
 get biteActive(){return this.bite<=.34&&this.bite>.12;}
 // Terrain pushed the body out along this normal: slide along the surface instead of ploughing in.
 touch(normal:THREE.Vector3){
  this.contactNormal.copy(normal);this.contactTimer=.12;
  // Something solid underneath: stop falling and count as standing on it.
  if(normal.y>.35){this.groundTimer=.15;if(this.vertical<0)this.vertical=0;}
 }
 // True while hauled out on the beach or resting on anything above the waterline.
 get grounded(){return this.mesh.position.y>swimDepth+.01&&this.groundTimer>0;}
 biteBox(){return orientedBounds(this.biteBounds,this.mesh);}
 update(dt:number,time:number,keys:Set<string>,view?:{yaw:number,pitch:number}){
 let turn=0;
 if(view&&keys.has('KeyW')){
  const delta=Math.atan2(Math.sin(view.yaw-this.heading),Math.cos(view.yaw-this.heading));
  turn=THREE.MathUtils.clamp(delta,-1,1);
  const limit=(keys.has('ShiftLeft')||keys.has('ShiftRight')?1.15:1.8)*dt;
  this.heading+=THREE.MathUtils.clamp(delta*(1-Math.exp(-dt*4)), -limit,limit);
  this.pitch=THREE.MathUtils.damp(this.pitch,view.pitch,4,dt);
 }
 const pitch=this.pitch;
 const boosting=(keys.has('ShiftLeft')||keys.has('ShiftRight'))&&this.energy>1&&keys.has('KeyW');
 this.energy=THREE.MathUtils.clamp(this.energy+dt*(boosting?-24:15),0,100);
 const forwardInput=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0);
 const strafeInput=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
 const moving=Math.hypot(forwardInput,strafeInput)>0,position=this.mesh.position;
 // Above swimming depth the body is either in the air (a breach) or hauled out on the sand.
 const out=position.y>swimDepth+.01;
 this.groundTimer-=dt;
 const grounded=out&&this.groundTimer>0;
 // On land it drags itself along; in the air nothing changes its speed.
 const target=moving?(grounded?(boosting?8:4.5):boosting?24:10):0;
 if(!out||grounded)this.speed=THREE.MathUtils.damp(this.speed,target,grounded?4:target>this.speed?2.6:1.3,dt);
 const forward=new THREE.Vector3(-Math.sin(this.heading)*Math.cos(pitch),Math.sin(pitch),-Math.cos(this.heading)*Math.cos(pitch));
 const right=new THREE.Vector3(Math.cos(view?.yaw??this.heading),0,-Math.sin(view?.yaw??this.heading));
 const movement=forward.multiplyScalar(forwardInput).addScaledVector(right,strafeInput);
 if(grounded)movement.y=0;
 if(movement.lengthSq()>1e-6&&(!out||grounded))this.drift.copy(movement.normalize());
 this.contactTimer-=dt;
 if(this.contactTimer>0){
  const into=this.drift.dot(this.contactNormal);
  // Keep the motion along the surface; only a head-on hit costs real speed.
  if(into<0){this.drift.addScaledVector(this.contactNormal,-into);this.speed*=Math.max(0,1+into*dt*1.5);}
 }
 const lift=((keys.has('KeyR')?1:0)-(keys.has('KeyQ')?1:0))*7;
 if(out){
  // Gravity takes over: a leap follows its arc, a beached body settles onto the sand.
  this.vertical-=22*dt;
  position.x+=this.drift.x*this.speed*dt;position.z+=this.drift.z*this.speed*dt;position.y+=this.vertical*dt;
  if(position.y<=swimDepth){position.y=swimDepth;this.vertical=0;this.drift.y=-Math.abs(this.drift.y)*.5;}
 }else{
  position.addScaledVector(this.drift,this.speed*dt);position.y+=lift*dt;
  if(position.y>swimDepth){
   // Rising fast enough carries the body clear of the water; otherwise it levels off at the surface.
   const rise=this.drift.y*this.speed+lift;
   if(rise>3.5)this.vertical=rise;else position.y=swimDepth;
  }
  position.y=Math.max(position.y,-30);
 }
 this.mesh.position.x=THREE.MathUtils.clamp(this.mesh.position.x,-playBounds.halfWidth,playBounds.halfWidth);this.mesh.position.z=THREE.MathUtils.clamp(this.mesh.position.z,playBounds.minZ,playBounds.maxZ);
 this.bank=THREE.MathUtils.damp(this.bank,-turn*.3-strafeInput*.06,3.5,dt);
 this.turnFlex=THREE.MathUtils.damp(this.turnFlex,turn,3,dt);
 // While sliding, the nose follows the surface instead of staying buried in it.
 const sliding=this.contactTimer>0&&this.drift.lengthSq()>.01,flying=out&&!grounded;
 this.tilt=THREE.MathUtils.damp(this.tilt,flying?Math.atan2(this.vertical,Math.max(1,this.speed*Math.hypot(this.drift.x,this.drift.z))):sliding?Math.asin(THREE.MathUtils.clamp(this.drift.y/this.drift.length(),-1,1))*Math.sign(forwardInput||1):pitch,sliding?7:14,dt);
 this.mesh.rotation.set(this.tilt,this.heading,this.bank,'YXZ');
 const swimming=movement.lengthSq()>0||keys.has('KeyQ')||keys.has('KeyR');
 this.swimStrength=THREE.MathUtils.damp(this.swimStrength,swimming?Math.min(1,this.speed/8+.25):0,3,dt);
 this.swimPhase+=dt*(1.6+Math.abs(this.speed)*.42);
 // The tail drives; the trunk yaws against it and the whole body bends into a turn.
 this.tail.rotation.y=Math.sin(this.swimPhase)*.34*this.swimStrength+this.turnFlex*.3;
 if(this.body){this.body.rotation.y=-Math.sin(this.swimPhase-.8)*.05*this.swimStrength;this.body.position.x=Math.sin(this.swimPhase-1.6)*.07*this.swimStrength;this.body.position.y=Math.sin(time*.8)*.06;}
 // Flippers trail at speed and paddle when manoeuvring slowly.
 const paddle=1-Math.min(1,this.speed/14);
 this.fins.forEach((fin,i)=>{const side=fin.position.x<0?-1:1;fin.rotation.z=side*Math.sin(this.swimPhase*.5+(i%2)*1.3)*.16*paddle+this.turnFlex*.12;fin.rotation.y=-side*(1-paddle)*.3;});
 this.bite=Math.max(0,this.bite-dt);
 // Gape wide, then snap shut much faster than it opened.
 const progress=1-this.bite/.45;
 let open=this.bite>0?(progress<.4?Math.sin(progress/.4*Math.PI/2):Math.max(0,1-(progress-.4)/.14)):0,shake=0;
 this.feeding=Math.max(0,this.feeding-dt);this.chew=Math.max(0,this.chew-dt);
 // A held body is worried from side to side; afterwards the jaws work it down.
 if(this.feeding>0){open=Math.max(open,.4+.18*Math.sin(time*26));shake=Math.sin(time*31)*Math.min(1,this.feeding*5);}
 else if(this.chew>0)open=Math.max(open,.26*Math.abs(Math.sin(this.chew*13)));
 this.jaw.rotation.x=-open*.85;
 this.lunge=THREE.MathUtils.damp(this.lunge,0,7,dt);
 if(this.body){this.body.rotation.y+=shake*.2;this.body.rotation.z=shake*.13;this.body.rotation.x=open*.06;this.body.position.z=-this.lunge*.7;}
 this.gore=Math.max(0,this.gore-dt*.03);
 for(const tooth of this.teeth)tooth.color.copy(toothColor).lerp(bloodColor,Math.min(1,this.gore));
 this.mesh.scale.setScalar(this.scale);
 return boosting;
 }
 mouth(){this.mesh.updateMatrixWorld(true);return this.mesh.localToWorld(new THREE.Vector3(0,-.1,-4.7));}
}
