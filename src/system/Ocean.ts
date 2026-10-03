import * as THREE from 'three';
import {ModelAssets, type AssetName} from './ModelAssets';
import layout from '../assets/maps/coast.layout.json';
export function createOcean(scene:THREE.Scene,assets:ModelAssets){
 const map=assets.instantiate('coast');
 const water=map.getObjectByName('Water');
 const effects=assets.instantiate('bubbles');
 const bubbles=effects.getObjectByName('Bubbles');
 if(!(water instanceof THREE.Mesh)||!(water.material instanceof THREE.MeshStandardMaterial)||!(bubbles instanceof THREE.Points)){
  throw new Error('Map requires Water; bubble effect requires Bubbles');
 }
 // Deform a private copy, retaining the loaded model as a reusable template.
 water.geometry=water.geometry.clone();water.material=water.material.clone();
 water.material.depthWrite=false;
 const pointsMaterial=bubbles.material as THREE.PointsMaterial;
 pointsMaterial.size=Number(bubbles.userData.pointSize??.12);
 const objects=new THREE.Group();objects.name='MapObjects';
 const propNames=new Set(['rock','palm','umbrella','umbrellaOrange','platform']);
 for(const placement of layout.objects){
  if(!propNames.has(placement.asset))throw new Error('Unknown map object: '+placement.asset);
  const object=assets.instantiate(placement.asset as AssetName);
  object.position.fromArray(placement.position);
  if(placement.scale)object.scale.fromArray(placement.scale);
  objects.add(object);
 }
 scene.add(map,objects,effects);
 return (t:number)=>{
  const a=water.geometry.attributes.position;
  for(let i=0;i<a.count;i++)a.setY(i,Math.sin(a.getX(i)*.08+t)*.28+Math.cos(a.getZ(i)*.09+t*.8)*.24);
  a.needsUpdate=true;
 };
}
