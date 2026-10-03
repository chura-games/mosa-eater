import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const urls={
 mosasaurus:new URL('../assets/mosasaurus.glb',import.meta.url).href,
 diver:new URL('../assets/diver.glb',import.meta.url).href,
 shark:new URL('../assets/shark.glb',import.meta.url).href,
 boat:new URL('../assets/boat.glb',import.meta.url).href,
 patrol:new URL('../assets/patrol.glb',import.meta.url).href,
 environment:new URL('../assets/environment.glb',import.meta.url).href,
 particle:new URL('../assets/bite-particle.glb',import.meta.url).href,
 sonar:new URL('../assets/sonar-ring.glb',import.meta.url).href,
};
export type AssetName=keyof typeof urls;
export class ModelAssets{
 private constructor(private models:Record<AssetName,THREE.Group>){}
 static async load(){
  const loader=new GLTFLoader();
  const entries=await Promise.all(Object.entries(urls).map(async([name,url])=>{
   const gltf=await loader.loadAsync(url);return [name,gltf.scene] as const;
  }));
  return new ModelAssets(Object.fromEntries(entries) as Record<AssetName,THREE.Group>);
 }
 // Share immutable geometry; each instance has independent animated transforms.
 instantiate(name:AssetName){return this.models[name].clone(true);}
 effect(name:'particle'|'sonar'){
  const node=this.models[name].getObjectByName(name==='particle'?'BiteParticle':'SonarRing');
  if(!(node instanceof THREE.Mesh)||!(node.material instanceof THREE.MeshBasicMaterial))throw new Error('Invalid effect model: '+name);
  const mesh=node.clone();mesh.material=node.material.clone();
  return mesh as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
 }
}
