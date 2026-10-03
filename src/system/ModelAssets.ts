import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';
const urls={
 mosasaurus:new URL('../assets/objects/mosasaurus.glb',import.meta.url).href,
 diver:new URL('../assets/objects/diver.glb',import.meta.url).href,
 shark:new URL('../assets/objects/shark.glb',import.meta.url).href,
 boat:new URL('../assets/objects/boat.glb',import.meta.url).href,
 patrol:new URL('../assets/objects/patrol.glb',import.meta.url).href,
 coast:new URL('../assets/maps/coast.glb',import.meta.url).href,
 rock:new URL('../assets/objects/rock.glb',import.meta.url).href,
 palm:new URL('../assets/objects/palm.glb',import.meta.url).href,
 umbrella:new URL('../assets/objects/umbrella.glb',import.meta.url).href,
 umbrellaOrange:new URL('../assets/objects/umbrella-orange.glb',import.meta.url).href,
 platform:new URL('../assets/objects/platform.glb',import.meta.url).href,
 lounger:new URL('../assets/objects/lounger.glb',import.meta.url).href,
 pier:new URL('../assets/objects/pier.glb',import.meta.url).href,
 beachBar:new URL('../assets/objects/beach-bar.glb',import.meta.url).href,
 grass:new URL('../assets/objects/grass.glb',import.meta.url).href,
 coral:new URL('../assets/objects/coral.glb',import.meta.url).href,
 fish:new URL('../assets/objects/fish.glb',import.meta.url).href,
 dolphin:new URL('../assets/objects/dolphin.glb',import.meta.url).href,
 turtle:new URL('../assets/objects/turtle.glb',import.meta.url).href,
 swimmer:new URL('../assets/objects/swimmer.glb',import.meta.url).href,
 jetski:new URL('../assets/objects/jetski.glb',import.meta.url).href,
 sailboat:new URL('../assets/objects/sailboat.glb',import.meta.url).href,
 buoy:new URL('../assets/objects/buoy.glb',import.meta.url).href,
 gull:new URL('../assets/objects/gull.glb',import.meta.url).href,
 kelp:new URL('../assets/objects/kelp.glb',import.meta.url).href,
 ray:new URL('../assets/objects/ray.glb',import.meta.url).href,
 seal:new URL('../assets/objects/seal.glb',import.meta.url).href,
 jellyfish:new URL('../assets/objects/jellyfish.glb',import.meta.url).href,
 kayak:new URL('../assets/objects/kayak.glb',import.meta.url).href,
 surfer:new URL('../assets/objects/surfer.glb',import.meta.url).href,
 orca:new URL('../assets/objects/orca.glb',import.meta.url).href,
 whale:new URL('../assets/objects/whale.glb',import.meta.url).href,
 battleship:new URL('../assets/objects/battleship.glb',import.meta.url).href,
 ferry:new URL('../assets/objects/ferry.glb',import.meta.url).href,
 submarine:new URL('../assets/objects/submarine.glb',import.meta.url).href,
 helicopter:new URL('../assets/objects/helicopter.glb',import.meta.url).href,
 shrimp:new URL('../assets/objects/shrimp.glb',import.meta.url).href,
 crab:new URL('../assets/objects/crab.glb',import.meta.url).href,
 squid:new URL('../assets/objects/squid.glb',import.meta.url).href,
 sky:new URL('../assets/effects/sky.glb',import.meta.url).href,
 bubbles:new URL('../assets/effects/bubbles.glb',import.meta.url).href,
 particle:new URL('../assets/effects/bite-particle.glb',import.meta.url).href,
 sonar:new URL('../assets/effects/sonar-ring.glb',import.meta.url).href,
};
export type AssetName=keyof typeof urls;
export class ModelAssets{
 private constructor(private models:Record<AssetName,THREE.Group>){}
 static async load(onProgress?:(loaded:number,total:number)=>void){
  const loader=new GLTFLoader(),total=Object.keys(urls).length;let loaded=0;
  const entries=await Promise.all(Object.entries(urls).map(async([name,url])=>{
   const gltf=await loader.loadAsync(url);onProgress?.(++loaded,total);return [name,gltf.scene] as const;
  }));
  return new ModelAssets(Object.fromEntries(entries) as Record<AssetName,THREE.Group>);
 }
 // Share immutable geometry; each instance has independent animated transforms.
 // A skinned model needs its own bones, which a plain clone would keep sharing with the original.
 instantiate(name:AssetName){
  const model=this.models[name];let skinned=false;
  model.traverse(node=>{if(node instanceof THREE.SkinnedMesh)skinned=true;});
  return skinned?cloneSkinned(model) as THREE.Group:model.clone(true);
 }
 effect(name:'particle'|'sonar'){
  const node=this.models[name].getObjectByName(name==='particle'?'BiteParticle':'SonarRing');
  if(!(node instanceof THREE.Mesh)||!(node.material instanceof THREE.MeshBasicMaterial))throw new Error('Invalid effect model: '+name);
  const mesh=node.clone();mesh.material=node.material.clone();
  return mesh as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
 }
}
