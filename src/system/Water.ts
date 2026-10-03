import * as THREE from 'three';
import {Water} from 'three/addons/objects/Water.js';
import vertexShader from '../assets/shaders/water.vert?raw';
import fragmentShader from '../assets/shaders/water.frag?raw';
import profile from '../assets/maps/coast.profile.json';

export function surfaceHeight(x:number,z:number,t:number){
 return .52*Math.sin(x*.072+z*.038+t*.8)+.25*Math.sin(-x*.11+z*.085+t*1.15)+.12*Math.sin(x*.19-z*.14+t*1.7);
}
export function createWater(water:THREE.Mesh){
 const boats=Array.from({length:10},()=>new THREE.Vector4(0,0,0,0));
 // Rings spreading from where something broke the surface: x, z, start time, strength.
 const ripples=Array.from({length:8},()=>new THREE.Vector4(0,0,-100,0));
 let nextRipple=0;
 const uniforms={uTime:{value:0},uUnderwater:{value:0},uPredator:{value:new THREE.Vector4()},uForward:{value:new THREE.Vector2(0,-1)},uBoats:{value:boats},uCoast:{value:new THREE.Vector4(profile.shoreZ,profile.curveAmplitude,profile.curveFrequency,profile.seaSlope)},uBeach:{value:new THREE.Vector2(profile.beachSlope,profile.floorDepth)},uRipples:{value:ripples}};
 // Water's mirror camera expects a local XY plane. The source GLB remains an XZ surface.
 const geometry=water.geometry.clone();geometry.rotateX(Math.PI/2);
 const reflective=new Water(geometry,{textureWidth:768,textureHeight:768,clipBias:.02,side:THREE.DoubleSide});
 reflective.name='Water';reflective.rotation.x=-Math.PI/2;
 const material=reflective.material;
 material.vertexShader=vertexShader;material.fragmentShader=fragmentShader;
 Object.assign(material.uniforms,uniforms);material.lights=false;material.transparent=true;material.depthWrite=false;
 water.parent!.add(reflective);water.removeFromParent();
 // Geometry stays in the map asset; waves and their normals are computed on the GPU.
 geometry.computeBoundingBox();geometry.boundingBox!.expandByScalar(1);
 geometry.computeBoundingSphere();geometry.boundingSphere!.radius+=1;
 const update=(time:number,camera:THREE.Camera,player?:{mesh:THREE.Object3D,heading:number,speed:number},ships:{mesh:THREE.Object3D,heading:number,alive:boolean,ship:boolean,speed?:number}[]=[])=>{
  uniforms.uTime.value=time;
  uniforms.uUnderwater.value=THREE.MathUtils.smoothstep(surfaceHeight(camera.position.x,camera.position.z,time)-camera.position.y,-.45,.45);
  if(player){const p=player.mesh.position;uniforms.uPredator.value.set(p.x,p.y,p.z,Math.abs(player.speed));uniforms.uForward.value.set(-Math.sin(player.heading),-Math.cos(player.heading));}
  // The shader draws ten wakes: give them to the fastest hulls.
  const active=ships.filter(ship=>ship.ship&&ship.alive).sort((a,b)=>(b.speed??0)-(a.speed??0)).slice(0,10);
  boats.forEach((boat,i)=>{const ship=active[i];if(ship)boat.set(ship.mesh.position.x,ship.mesh.position.z,ship.heading,Math.min(.65,(ship.speed??5)*.13));else boat.w=0;});
 };
 return Object.assign(update,{ripple(x:number,z:number,strength=1){ripples[nextRipple++%ripples.length].set(x,z,uniforms.uTime.value,strength);}});
}
