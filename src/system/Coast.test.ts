import * as THREE from 'three';
import {ModelAssets} from './ModelAssets';
import {CollisionWorld} from './Collision';
import {groundHeight,shoreZ,playBounds} from './Coast';
import profile from '../assets/maps/coast.profile.json';
import {Human} from '../entities/Human';
import layout from '../assets/maps/coast.layout.json';
export async function runCoastTests(){
 const assets=await ModelAssets.load(),map=assets.instantiate('coast');
 const beach=map.getObjectByName('Beach')!,bounds=new THREE.Box3().setFromObject(beach);
 if(Math.abs(bounds.max.x-bounds.min.x-profile.mapHalfWidth*2)>.01)throw new Error('Beach must extend across the compact map');
 const terrain=new CollisionWorld(groundHeight);terrain.add(map);
 for(const x of [-140,0,140]){
  const z=shoreZ(x)-20,y=groundHeight(x,z);
  if(!terrain.blocked(new THREE.Vector3(x,y+3,z),new THREE.Vector3(x,y-3,z)))throw new Error('Missing continuous beach collision');
  if(groundHeight(x,shoreZ(x)+30)>=0||groundHeight(x,shoreZ(x)-40)<=0)throw new Error('Beach must separate sea and inland');
 }
 for(const p of layout.objects){
  if(['palm','umbrella','umbrellaOrange','lounger'].includes(p.asset)&&Math.abs(p.position[1]-groundHeight(p.position[0],p.position[2]))>.06)throw new Error('Floating beach prop: '+p.asset);
 }
 for(const kind of ['diver','shark','boat','patrol'] as const){
  const actor=new Human(kind,assets.instantiate(kind));
  if(actor.colliders().length<10)throw new Error('Detailed part hitboxes missing: '+kind);
  for(let i=0;i<25;i++){
   actor.reset();if(actor.mesh.position.y<groundHeight(actor.mesh.position.x,actor.mesh.position.z)+.7)throw new Error('Actor spawned below terrain');
   if(Math.abs(actor.mesh.position.x)>playBounds.halfWidth||actor.mesh.position.z>playBounds.maxZ||actor.mesh.position.z<playBounds.minZ)throw new Error('Actor spawned outside compact play area');
  }
 }
 for(const name of ['pier','beachBar','grass','coral'] as const){if(!assets.instantiate(name).children.length)throw new Error('Missing detailed scenery: '+name);}
 return {continuousBeach:true,groundedProps:true,partHitboxes:true,compactSpawns:true};
}
