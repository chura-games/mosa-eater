import * as THREE from 'three';
export function ellipsoid(color:number, scale:number[], position:number[]=[0,0,0]) {
  const m=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshStandardMaterial({color,roughness:.65,flatShading:true}));
  m.scale.set(scale[0],scale[1],scale[2]);m.position.set(position[0],position[1],position[2]);return m;
}
export function box(color:number, scale:number[], position:number[]=[0,0,0]){
 const m=new THREE.Mesh(new THREE.BoxGeometry(...scale as [number,number,number]),new THREE.MeshStandardMaterial({color,roughness:.7}));
 m.position.set(...position as [number,number,number]);return m;
}
export const random=(a:number,b:number)=>a+Math.random()*(b-a);
