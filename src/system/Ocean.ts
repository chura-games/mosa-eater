import * as THREE from 'three';
import {ModelAssets, type AssetName} from './ModelAssets';
import layout from '../assets/maps/coast.layout.json';
import {CollisionWorld} from './Collision';
import {createWater,surfaceHeight} from './Water';
export function createOcean(scene:THREE.Scene,assets:ModelAssets){
 const map=assets.instantiate('coast');
 const water=map.getObjectByName('Water');
 const effects=assets.instantiate('bubbles');
 const bubbles=effects.getObjectByName('Bubbles');
 if(!(water instanceof THREE.Mesh)||!(water.material instanceof THREE.MeshStandardMaterial)||!(bubbles instanceof THREE.Points)){
  throw new Error('Map requires Water; bubble effect requires Bubbles');
 }
 // Deform a private copy, retaining the loaded model as a reusable template.
 water.geometry=water.geometry.clone();
 const updateWater=createWater(water);
 // Bubbles rise on a private copy of the positions and re-enter at the seabed.
 bubbles.geometry=bubbles.geometry.clone();
 const bubblePositions=bubbles.geometry.attributes.position as THREE.BufferAttribute;
 let bubbleTime=0;
 const update=(time:number,camera:THREE.Camera,player?:Parameters<typeof updateWater>[2],ships?:Parameters<typeof updateWater>[3])=>{
  const dt=Math.min(.1,Math.max(0,time-bubbleTime));bubbleTime=time;
  // The cloud of bubbles is a 90 m box that wraps around the camera, so it covers any size of map.
  const wrapAround=(value:number,center:number)=>value-Math.round((value-center)/90)*90;
  for(let i=0;i<bubblePositions.count;i++){
   let y=bubblePositions.getY(i)+dt*(.5+(i%5)*.16);
   if(y>-.4)y=-28;
   bubblePositions.setXYZ(i,wrapAround(bubblePositions.getX(i)+Math.sin(time*1.7+i)*dt*.12,camera.position.x),y,wrapAround(bubblePositions.getZ(i),camera.position.z));
  }
  bubblePositions.needsUpdate=true;updateWater(time,camera,player,ships);
  // Under water nothing beyond about 125 m shows through the haze, so those sectors are not drawn.
  const submerged=camera.position.y<surfaceHeight(camera.position.x,camera.position.z,time)-.5;
  for(const sector of sectors){const sphere=sector.boundingSphere!;sector.visible=!submerged||sphere.center.distanceTo(camera.position)<125+sphere.radius;}
 };
 const pointsMaterial=bubbles.material as THREE.PointsMaterial;
 pointsMaterial.size=Number(bubbles.userData.pointSize??.12);
 const objects=new THREE.Group();objects.name='MapObjects';
 const propNames=new Set(['rock','palm','umbrella','umbrellaOrange','platform','lounger','pier','beachBar','grass','coral','kelp']);
 for(const placement of layout.objects){
  if(!propNames.has(placement.asset))throw new Error('Unknown map object: '+placement.asset);
  const object=assets.instantiate(placement.asset as AssetName);
  object.position.fromArray(placement.position);
  if(placement.scale)object.scale.fromArray(placement.scale);
  if(placement.rotation)object.rotation.set(placement.rotation[0],placement.rotation[1],placement.rotation[2]);
  objects.add(object);
 }
 const collisions=new CollisionWorld();collisions.add(map);collisions.add(objects);
 // Build collisions from every placed part, then instance only the static render meshes.
 // The source assets and individual collision triangles retain their exact transforms.
 const batches=new Map<string,{mesh:THREE.Mesh,matrices:THREE.Matrix4[]}>();
 objects.traverse(node=>{
  if(!(node instanceof THREE.Mesh)||Array.isArray(node.material))return;
  // One batch per 70 m sector, so the renderer can skip sectors that are off screen,
  // outside the shadow box, or lost in the underwater haze.
  const key=node.geometry.uuid+':'+node.material.uuid+':'+Math.floor(node.matrixWorld.elements[12]/70)+':'+Math.floor(node.matrixWorld.elements[14]/70);
  if(!batches.has(key))batches.set(key,{mesh:node,matrices:[]});
  batches.get(key)!.matrices.push(node.matrixWorld.clone());
 });
 const scenery=new THREE.Group();scenery.name='MapObjects';
 const sectors:THREE.InstancedMesh[]=[];
 for(const {mesh,matrices} of batches.values()){
  const batch=new THREE.InstancedMesh(mesh.geometry,mesh.material,matrices.length);
  batch.name=mesh.name;batch.userData={...mesh.userData};
  matrices.forEach((matrix,i)=>batch.setMatrixAt(i,matrix));batch.computeBoundingSphere();scenery.add(batch);sectors.push(batch);
 }
 scene.add(map,scenery,effects);
 bubbles.frustumCulled=false;
 return {update,collisions,surfaceHeight,ripple:updateWater.ripple,setMirror:updateWater.setMirror};
}
