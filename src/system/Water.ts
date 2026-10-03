import * as THREE from 'three';
import {Water} from 'three/addons/objects/Water.js';
import vertexShader from '../assets/shaders/water.vert?raw';
import fragmentShader from '../assets/shaders/water.frag?raw';
import profile from '../assets/maps/coast.profile.json';

// Six swells with sharp crests and flat troughs: [kx, kz, amplitude, angular speed].
// Keep in sync with the tables in shaders/water.vert and water.frag.
const swell=[[.0304,-.0963,.42,.996],[-.0743,-.147,.24,1.27],[.191,-.194,.13,1.64],[-.0898,-.44,.075,2.1],[.68,-.288,.04,2.69],[-.966,-.725,.022,3.44]];
export function surfaceHeight(x:number,z:number,t:number){
 let height=0;
 for(const [kx,kz,amplitude,speed] of swell){const u=.5+.5*Math.sin(x*kx+z*kz-t*speed);height+=amplitude*(2*u*Math.sqrt(u)-.849);}
 return height;
}
export function createWater(water:THREE.Mesh){
 const boats=Array.from({length:10},()=>new THREE.Vector4(0,0,0,0));
 // Rings spreading from where something broke the surface: x, z, start time, strength.
 const ripples=Array.from({length:8},()=>new THREE.Vector4(0,0,-100,0));
 let nextRipple=0;
 const uniforms={uTime:{value:0},uUnderwater:{value:0},uPredator:{value:new THREE.Vector4()},uForward:{value:new THREE.Vector2(0,-1)},uBoats:{value:boats},uCoast:{value:new THREE.Vector4(profile.shoreZ,profile.curveAmplitude,profile.curveFrequency,profile.seaSlope)},uBeach:{value:new THREE.Vector2(profile.beachSlope,profile.floorDepth)},uRipples:{value:ripples},uMirror:{value:1},uHaze:{value:.019},uDeep:{value:new THREE.Vector3(profile.deepDepth,profile.deepStart,profile.deepEnd)}};
 // Water's mirror camera expects a local XY plane. The source GLB remains an XZ surface.
 const geometry=water.geometry.clone();geometry.rotateX(Math.PI/2);
 const reflective=new Water(geometry,{textureWidth:768,textureHeight:768,clipBias:.02,side:THREE.DoubleSide});
 reflective.name='Water';reflective.rotation.x=-Math.PI/2;
 const material=reflective.material;
 material.vertexShader=vertexShader;material.fragmentShader=fragmentShader;
 Object.assign(material.uniforms,uniforms);material.lights=false;material.transparent=true;material.depthWrite=false;
 water.parent!.add(reflective);water.removeFromParent();
 // The mirror pass draws the whole scene again. Skip it when it cannot be seen (camera under
 // water), every other frame on medium quality, and entirely on low.
 let mirrorMode:'off'|'half'|'full'='full',mirrorFrame=0;
 const renderMirror=reflective.onBeforeRender;
 reflective.onBeforeRender=function(...parameters){
  if(mirrorMode==='off'||uniforms.uUnderwater.value>.98)return;
  if(mirrorMode==='half'&&mirrorFrame++%2)return;
  renderMirror.apply(this,parameters);
 };
 // Geometry stays in the map asset; waves and their normals are computed on the GPU.
 geometry.computeBoundingBox();geometry.boundingBox!.expandByScalar(2);
 geometry.computeBoundingSphere();geometry.boundingSphere!.radius+=2;
 const update=(time:number,camera:THREE.Camera,player?:{mesh:THREE.Object3D,heading:number,speed:number},ships:{mesh:THREE.Object3D,heading:number,alive:boolean,ship:boolean,speed?:number}[]=[],haze=.019)=>{
  uniforms.uTime.value=time;uniforms.uHaze.value=haze;
  // The sheet is finest at its centre, so it stays under the camera.
  reflective.position.x=camera.position.x;reflective.position.z=camera.position.z;
  uniforms.uUnderwater.value=THREE.MathUtils.smoothstep(surfaceHeight(camera.position.x,camera.position.z,time)-camera.position.y,-.45,.45);
  // A small body barely stirs the surface: its depth is measured in body sizes, so the
  // heave and the wake fade out as it shrinks.
  if(player){const p=player.mesh.position,small=THREE.MathUtils.clamp(player.mesh.scale.x,.01,1);uniforms.uPredator.value.set(p.x,p.y/small,p.z,Math.abs(player.speed)*small);uniforms.uForward.value.set(-Math.sin(player.heading),-Math.cos(player.heading));}
  // The shader draws ten wakes: give them to the fastest hulls.
  const active=ships.filter(ship=>ship.ship&&ship.alive&&Math.abs(ship.mesh.position.y)<1.5).sort((a,b)=>(b.speed??0)-(a.speed??0)).slice(0,10);
  boats.forEach((boat,i)=>{const ship=active[i];if(ship)boat.set(ship.mesh.position.x,ship.mesh.position.z,ship.heading,Math.min(.65,(ship.speed??5)*.13));else boat.w=0;});
 };
 return Object.assign(update,{setMirror(mode:'off'|'half'|'full'){mirrorMode=mode;uniforms.uMirror.value=mode==='off'?0:1;},ripple(x:number,z:number,strength=1){ripples[nextRipple++%ripples.length].set(x,z,uniforms.uTime.value,strength);}});
}
