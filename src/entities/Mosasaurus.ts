import * as THREE from 'three';
export class Mosasaurus{
 mesh=new THREE.Group(); tail:THREE.Object3D=new THREE.Group();jaw:THREE.Object3D=new THREE.Group();heading=0;energy=100;level=0;speed=0;bite=0;
 constructor(){
 this.mesh.position.set(0,-4,18);
 }
 static fromModel(model:THREE.Object3D){
 const tail=model.getObjectByName('Tail'),jaw=model.getObjectByName('Jaw');
 if(!tail||!jaw)throw new Error('Mosasaurus model requires Tail and Jaw nodes');
 const player=new Mosasaurus();
 player.tail=tail;player.jaw=jaw;
 player.mesh.add(model);
 return player;
 }
 get scale(){return 1+this.level*.16}
 update(dt:number,time:number,keys:Set<string>){
 this.heading+=((keys.has('KeyA')?1:0)-(keys.has('KeyD')?1:0))*dt*1.55;
 const boosting=(keys.has('ShiftLeft')||keys.has('ShiftRight'))&&this.energy>1&&keys.has('KeyW');
 this.energy=THREE.MathUtils.clamp(this.energy+dt*(boosting?-24:15),0,100);
 const target=keys.has('KeyW')?(boosting?24:10):keys.has('KeyS')?-5:0;
 this.speed=THREE.MathUtils.damp(this.speed,target,3,dt);
 this.mesh.position.x-=Math.sin(this.heading)*this.speed*dt;this.mesh.position.z-=Math.cos(this.heading)*this.speed*dt;
 this.mesh.position.y+=((keys.has('KeyR')?1:0)-(keys.has('KeyQ')?1:0))*dt*7;
 this.mesh.position.y=THREE.MathUtils.clamp(this.mesh.position.y,-30,boosting?4:-.8);
 if(this.mesh.position.y>-.8&&!keys.has('KeyR'))this.mesh.position.y-=dt*8;
 this.mesh.position.x=THREE.MathUtils.clamp(this.mesh.position.x,-135,135);this.mesh.position.z=THREE.MathUtils.clamp(this.mesh.position.z,-135,135);
 this.mesh.rotation.set(Math.sin(time*2)*.025,this.heading,-Math.sin(time*2)*.035);
 this.tail.rotation.y=Math.sin(time*(4+Math.abs(this.speed)*.2))*.27;this.bite=Math.max(0,this.bite-dt);this.jaw.rotation.x=-Math.sin(this.bite/.45*Math.PI)*.6;this.mesh.scale.setScalar(this.scale);
 return boosting;
 }
 mouth(){return new THREE.Vector3(0,0,-4.7*this.scale).applyAxisAngle(new THREE.Vector3(0,1,0),this.heading).add(this.mesh.position)}
}
