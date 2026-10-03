import * as THREE from 'three';
import {random} from '../utils/random';
export type PreyKind='diver'|'shark'|'boat'|'patrol';
export class Human{
 mesh=new THREE.Group(); heading=random(0,Math.PI*2);phase=random(0,8);alive=true;respawn=0;
 constructor(public kind:PreyKind,model:THREE.Object3D){
 this.mesh.add(model);this.reset();
 }
 reset(){this.alive=true;this.mesh.visible=true;this.mesh.position.set(random(-95,95),this.kind==='boat'||this.kind==='patrol'?0:random(-19,-1),random(-105,80));}
 update(dt:number,time:number,player:THREE.Vector3,panic:number){
 if(!this.alive){this.respawn-=dt;if(this.respawn<=0)this.reset();return;}
 const delta=this.mesh.position.clone().sub(player);const near=delta.length()<24;
 if(near&&panic>10)this.heading=Math.atan2(delta.x,delta.z);
 else this.heading+=Math.sin(time*.4+this.phase)*dt*.2;
 let speed=this.kind==='diver'?1.2:this.kind==='shark'?3:2.5;
 if(this.kind==='patrol'){this.heading=Math.atan2(-delta.x,-delta.z);speed=5;}
 else if(near)speed*=2;
 this.mesh.position.x+=Math.sin(this.heading)*speed*dt;this.mesh.position.z+=Math.cos(this.heading)*speed*dt;
 if(Math.abs(this.mesh.position.x)>125||Math.abs(this.mesh.position.z)>125)this.heading+=Math.PI;
 this.mesh.position.x=THREE.MathUtils.clamp(this.mesh.position.x,-126,126);this.mesh.position.z=THREE.MathUtils.clamp(this.mesh.position.z,-126,126);
 this.mesh.rotation.y=this.heading+Math.PI;this.mesh.rotation.z=Math.sin(time*2+this.phase)*.05;
 if(this.kind==='boat'||this.kind==='patrol')this.mesh.position.y=Math.sin(time*1.5+this.phase)*.18;
 }
 get points(){return this.kind==='diver'?25:this.kind==='shark'?40:this.kind==='boat'?70:100}
 get label(){return {diver:'ダイバー捕食',shark:'サメ捕食',boat:'小型船を破壊',patrol:'迎撃艇を撃破'}[this.kind]}
}
