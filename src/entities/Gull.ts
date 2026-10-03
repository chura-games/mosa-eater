import * as THREE from 'three';
import {random} from '../utils/random';

// Scenery only: gulls wheel over the beach, flapping in bursts and gliding between them.
export class Gull{
 mesh=new THREE.Group();
 private readonly wings:THREE.Object3D[];
 private readonly center=new THREE.Vector3(random(-60,60),0,random(-45,20));
 private readonly radius=random(9,26);
 private readonly height=random(9,20);
 private readonly rate=random(.18,.34)*(Math.random()<.5?-1:1);
 private angle=random(0,6.28);private phase=random(0,6.28);
 constructor(model:THREE.Object3D){
  this.wings=['WingL','WingR'].map(name=>model.getObjectByName(name)).filter((node):node is THREE.Object3D=>!!node);
  model.scale.setScalar(1.6);this.mesh.rotation.order='YXZ';this.mesh.add(model);this.update(0,0);
 }
 update(dt:number,time:number){
  this.angle+=this.rate*dt;
  const climb=Math.sin(time*.35+this.phase);
  this.mesh.position.set(this.center.x+Math.cos(this.angle)*this.radius,this.height+climb*1.8,this.center.z+Math.sin(this.angle)*this.radius);
  // Face along the circle and lean into it.
  const direction=Math.sign(this.rate);
  this.mesh.rotation.set(Math.cos(time*.35+this.phase)*.12,-this.angle+(direction>0?Math.PI:0),-direction*.32);
  // Flap while climbing, hold the wings out while sinking.
  const effort=THREE.MathUtils.smoothstep(Math.cos(time*.35+this.phase),-.2,.6);
  const flap=Math.sin(time*9+this.phase)*.55*effort+.12;
  this.wings.forEach((wing,i)=>{wing.rotation.z=(i?1:-1)*flap;});
 }
}
