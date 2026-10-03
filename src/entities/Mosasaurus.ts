import * as THREE from 'three';
import {ellipsoid} from '../utils/geometry';
export class Mosasaurus{
 mesh=new THREE.Group(); tail=new THREE.Group();jaw=new THREE.Group();heading=0;energy=100;level=0;speed=0;bite=0;
 constructor(){
 this.mesh.add(ellipsoid(0x315e63,[1.45,1,3.7]),ellipsoid(0x9fae8a,[1.15,.56,3.2],[0,-.5,-.2]),ellipsoid(0x355d5d,[1.05,.62,1.8],[0,.12,-3.7]));
 this.jaw.position.set(0,-.32,-2.6);this.jaw.add(ellipsoid(0x79907a,[.91,.27,1.55],[0,0,-1.1]));this.mesh.add(this.jaw);
 for(let s of [-1,1]){
 this.mesh.add(ellipsoid(0x101b16,[.14,.15,.14],[s*.84,.48,-4.15]),ellipsoid(0xd6da94,[.08,.08,.08],[s*.93,.5,-4.18]));
 for(let z of [-1.4,2]){const fin=ellipsoid(0x2a5257,[2,.16,.64],[s*1.9,-.5,z]);fin.rotation.y=s*.42;this.mesh.add(fin);}
 for(let i=0;i<8;i++){const tooth=new THREE.Mesh(new THREE.ConeGeometry(.1,.35,4),new THREE.MeshStandardMaterial({color:0xe4e6c9}));tooth.position.set(s*.7,-.18,-3-i*.29);tooth.rotation.z=Math.PI;this.mesh.add(tooth);}
 }
 this.tail.position.z=2.8;this.tail.add(ellipsoid(0x315c60,[.7,.65,2.7],[0,0,1.8]),ellipsoid(0x315c60,[.2,1.9,1.1],[0,.5,4]));this.mesh.add(this.tail);
 this.mesh.position.set(0,-4,18);
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
