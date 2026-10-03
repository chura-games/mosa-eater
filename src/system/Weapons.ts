import * as THREE from 'three';
import {random} from '../utils/random';
import type {Effects} from './Effects';
import type {Sound} from './Sound';

type Shot={kind:'gun'|'shell'|'torpedo',mesh:THREE.Mesh,from:THREE.Vector3,aim:THREE.Vector3,age:number,span:number,trail:number};
type Victim={position:THREE.Vector3,length:number};

// Bullets, shells and torpedoes fired at the predator. Each shot is aimed at where the animal
// was when the trigger was pulled, so it can be dodged; bullets and shells also lose their
// force in deep water, so diving is a defence.
export class Weapons{
 private readonly shots:Shot[]=[];
 private readonly tracer=new THREE.Mesh(new THREE.BoxGeometry(.06,.06,1.8),new THREE.MeshBasicMaterial({color:0xffe08a}));
 private readonly shell=new THREE.Mesh(new THREE.SphereGeometry(.4,10,8),new THREE.MeshStandardMaterial({color:0x2b2d2f,roughness:.5,metalness:.6}));
 private readonly torpedo=new THREE.Mesh(new THREE.CylinderGeometry(.27,.27,3.4,10).rotateX(Math.PI/2),new THREE.MeshStandardMaterial({color:0x3a4348,roughness:.45,metalness:.5}));
 constructor(private scene:THREE.Scene,private effects:Effects,private sound:Sound,private surface:(x:number,z:number,time:number)=>number){}
 fire(kind:Shot['kind'],from:THREE.Vector3,victim:Victim){
  const reach=from.distanceTo(victim.position),loud=THREE.MathUtils.clamp(1-reach/260,.15,1);
  // Gunners are not perfect: the further away, the wider the scatter.
  const scatter=kind==='gun'?.5+reach*.035+victim.length*.08:kind==='shell'?3+reach*.03:0;
  const aim=victim.position.clone().add(new THREE.Vector3(random(-1,1),random(-.3,.3),random(-1,1)).multiplyScalar(scatter));
  const mesh=(kind==='gun'?this.tracer:kind==='shell'?this.shell:this.torpedo).clone();
  mesh.position.copy(from);this.scene.add(mesh);
  const span=kind==='gun'?Math.max(.12,reach/140):kind==='shell'?1.2+reach/130:reach/17+1.5;
  this.shots.push({kind,mesh,from:from.clone(),aim,age:0,span,trail:0});
  if(kind==='gun')this.sound.gun(loud);else if(kind==='shell'){this.sound.cannon(loud);this.effects.explosion(from,1.4);}else this.sound.splash(.6*loud);
 }
 // Moves every shot and returns the damage that landed on the predator this frame.
 update(dt:number,time:number,victim:Victim){
  let damage=0;
  for(let i=this.shots.length-1;i>=0;i--){
   const shot=this.shots[i];shot.age+=dt;
   const t=Math.min(1,shot.age/shot.span),before=shot.mesh.position.clone();
   if(shot.kind==='torpedo'){
    // A torpedo runs straight for a moment, then turns to follow.
    shot.aim.lerp(victim.position,1-Math.exp(-dt*.9));
    const toward=shot.aim.clone().sub(shot.mesh.position),step=17*dt;
    if(toward.length()>step)shot.mesh.position.addScaledVector(toward.normalize(),step);else shot.mesh.position.copy(shot.aim);
    shot.trail-=dt;if(shot.trail<=0){shot.trail=.07;this.effects.wisp(before,1.1);}
   }else{
    shot.mesh.position.lerpVectors(shot.from,shot.aim,t);
    // Shells are lobbed in a high arc.
    if(shot.kind==='shell')shot.mesh.position.y+=Math.sin(t*Math.PI)*shot.from.distanceTo(shot.aim)*.16;
   }
   shot.mesh.lookAt(shot.mesh.position.clone().multiplyScalar(2).sub(before));
   const gap=shot.mesh.position.distanceTo(victim.position),body=victim.length;
   const hit=shot.kind==='torpedo'?gap<1.5+body*.3:t>=1;
   if(!hit&&shot.age<shot.span+(shot.kind==='torpedo'?6:0))continue;
   const at=shot.mesh.position,level=this.surface(at.x,at.z,time),top=new THREE.Vector3(at.x,level,at.z),depth=level-victim.position.y;
   if(shot.kind==='gun'){
    this.effects.splash(top,.3);
    // Bullets are spent after a few metres of water.
    if(gap<.8+body*.28&&depth<4+body*.2)damage+=4*THREE.MathUtils.clamp(8/body,.2,1);
   }else if(shot.kind==='shell'){
    this.effects.splash(top,3.2);this.effects.explosion(top.clone().setY(level+1),2.4);this.sound.boom(THREE.MathUtils.clamp(1.4-gap/200,.3,1.2));
    if(gap<8+body*.3&&depth<12+body*.3)damage+=24*THREE.MathUtils.clamp(30/body,.4,1.2)*THREE.MathUtils.clamp(1.3-gap/(10+body*.3),.4,1);
   }else{
    this.effects.explosion(at,2.2,true);this.effects.splash(top,THREE.MathUtils.clamp(2.4-depth*.08,.4,2.4));this.sound.boom(THREE.MathUtils.clamp(1.3-gap/150,.3,1.1));
    if(hit)damage+=22*THREE.MathUtils.clamp(20/body,.4,1.2);
   }
   this.scene.remove(shot.mesh);this.shots.splice(i,1);
  }
  return damage;
 }
}
