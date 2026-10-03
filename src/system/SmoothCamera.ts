import * as THREE from 'three';

export class SmoothCamera{
 readonly view={yaw:0,pitch:0};
 private previous=new THREE.Vector3();
 private velocity=new THREE.Vector3();
 private distance=17;
 private lift=0;
 private initialized=false;
 // Call after the player has moved this frame. ground(x,z) keeps the camera out of the terrain.
 update(camera:THREE.PerspectiveCamera,dt:number,target:{yaw:number,pitch:number},player:THREE.Vector3,scale:number,impact=0,ground?:(x:number,z:number)=>number){
  const angle=Math.atan2(Math.sin(target.yaw-this.view.yaw),Math.cos(target.yaw-this.view.yaw));
  this.view.yaw+=angle*(1-Math.exp(-dt*14));
  this.view.pitch=THREE.MathUtils.damp(this.view.pitch,target.pitch,14,dt);
  const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(this.view.pitch,this.view.yaw,0,'YXZ'));
  const direction=new THREE.Vector3(0,0,-1).applyQuaternion(rotation);
  // Start at the right range for the animal's size instead of zooming in from afar.
  if(!this.initialized){this.previous.copy(player);this.distance=17*Math.pow(scale,.87);this.initialized=true;}
  // Trail by a fixed time behind a smoothed velocity. Chasing the position itself makes the
  // gap depend on the frame time, which shows up as shaking whenever frames are uneven.
  if(dt>0){
   const step=player.clone().sub(this.previous);
   if(step.length()>12)this.velocity.set(0,0,0);
   else this.velocity.lerp(step.divideScalar(dt),1-Math.exp(-dt*5));
  }
  this.previous.copy(player);
  // A 10 cm hatchling is watched from a hand's breadth away, a 60 m giant from 70 m.
  this.distance=THREE.MathUtils.damp(this.distance,17*Math.pow(scale,.87),3,dt);
  const zoom=this.distance/17;
  const position=player.clone().addScaledVector(this.velocity,-.11*Math.min(1,zoom*3)).addScaledVector(direction,-this.distance);position.y+=3.6*zoom;
  if(ground){
   const needed=Math.max(0,ground(position.x,position.z)+Math.min(1.2,.1+zoom)-position.y);
   this.lift=needed>this.lift?THREE.MathUtils.damp(this.lift,needed,18,dt):THREE.MathUtils.damp(this.lift,needed,3,dt);
   position.y+=this.lift;
  }
  camera.position.copy(position);
  // Impact moves only the rendered camera; it never feeds noise back into follow state.
  camera.position.y+=Math.sin(impact*34)*impact*.08*Math.min(1.5,zoom);
  // Close-up views of a small animal need a nearer clipping plane.
  const near=THREE.MathUtils.clamp(this.distance*.04,.02,.1);
  if(Math.abs(camera.near-near)>.002){camera.near=near;camera.updateProjectionMatrix();}
  camera.quaternion.copy(rotation);
 }
}
