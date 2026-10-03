import * as THREE from 'three';
import {ModelAssets} from './ModelAssets';
export function createOcean(scene:THREE.Scene,assets:ModelAssets){
 const environment=assets.instantiate('environment');
 const water=environment.getObjectByName('Water');
 const bubbles=environment.getObjectByName('Bubbles');
 if(!(water instanceof THREE.Mesh)||!(water.material instanceof THREE.MeshStandardMaterial)||!(bubbles instanceof THREE.Points)){
  throw new Error('Environment model requires Water and Bubbles nodes');
 }
 // Deform a private copy, retaining the loaded model as a reusable template.
 water.geometry=water.geometry.clone();water.material=water.material.clone();
 water.material.depthWrite=false;
 const pointsMaterial=bubbles.material as THREE.PointsMaterial;
 pointsMaterial.size=Number(bubbles.userData.pointSize??.12);
 scene.add(environment);
 return (t:number)=>{
  const a=water.geometry.attributes.position;
  for(let i=0;i<a.count;i++)a.setY(i,Math.sin(a.getX(i)*.08+t)*.28+Math.cos(a.getZ(i)*.09+t*.8)*.24);
  a.needsUpdate=true;
 };
}