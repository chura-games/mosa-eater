import * as THREE from 'three';
import * as details from './models/details.mjs';
import * as scenery from './models/scenery.mjs';
import * as extras from './models/extras.mjs';
import {terrain,shoreZ,groundHeight} from './models/beach.mjs';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mkdir, writeFile } from 'node:fs/promises';

// GLTFExporter uses the browser FileReader API, supplied here for Node.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => {
      this.result = result;
      this.onloadend?.();
    }).catch(error => this.onerror?.(error));
  }
};

function ellipsoid(color, scale, position = [0, 0, 0]) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 12, 8),
    new THREE.MeshStandardMaterial({ color, roughness: .65, flatShading: true }),
  );
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  return mesh;
}

const model = new THREE.Group();
model.name = 'Mosasaurus';
const tail = new THREE.Group();
tail.name = 'Tail';
const jaw = new THREE.Group();
jaw.name = 'Jaw';

// Smooth anatomical profiles and tapered flippers, with vertex-colored countershading.
function skinMaterial(){
 const skin=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.52,metalness:0});skin.userData.surface='skin';return skin;
}
function pigment(position,normal){
 const belly=THREE.MathUtils.smoothstep(-normal.y,-.25,.7);
 const color=new THREE.Color(0x304b48).lerp(new THREE.Color(0xb4b69a),belly);
 const mottling=Math.sin(position.x*17.3+position.z*4.1)*Math.sin(position.z*13.7-position.y*8.6);
 color.multiplyScalar(1+mottling*.1);return color;
}
function finish(geometry,name){
 geometry.computeVertexNormals();
 const points=geometry.attributes.position,normals=geometry.attributes.normal,colors=[];
 for(let i=0;i<points.count;i++){
  const color=pigment(new THREE.Vector3().fromBufferAttribute(points,i),new THREE.Vector3().fromBufferAttribute(normals,i));
  colors.push(color.r,color.g,color.b);
 }
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const mesh=new THREE.Mesh(geometry,skinMaterial());mesh.name=name;return mesh;
}
function loft(profile,name,centerY=0){
 const curve=new THREE.CatmullRomCurve3(profile.map(p=>new THREE.Vector3(...p)));
 const rings=curve.getPoints(64),segments=32,points=[],indices=[];
 for(let i=0;i<rings.length;i++){
  const p=rings[i];
  for(let j=0;j<=segments;j++){
   const a=j/segments*Math.PI*2;
   const headLift=name==='Body'?.15*(1-THREE.MathUtils.smoothstep(p.x,-3.3,-2.2)):0;
   points.push(Math.max(.015,p.y)*Math.cos(a),centerY+headLift+Math.max(.015,p.z)*Math.sin(a),p.x);
  }
 }
 for(let i=0;i<rings.length-1;i++)for(let j=0;j<segments;j++){
  const a=i*(segments+1)+j,b=a+segments+1;
  indices.push(a,a+1,b,b,a+1,b+1);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setIndex(indices);
 return finish(geometry,name);
}
function flipper(side,z,length,name){
 // Rounded hydrofoil sections taper into a swept tip instead of flat polygon wings.
 const vertices=[],indices=[],rings=24,segments=16;
 for(let i=0;i<=rings;i++){
  const t=i/rings,width=Math.max(.012,.60*Math.pow(1-t,.62)),thickness=Math.max(.009,.14*Math.pow(1-t,.8));
  for(let j=0;j<=segments;j++){
   const a=j/segments*Math.PI*2;
   vertices.push(side*t*length,-t*.24+Math.sin(a)*thickness,t*t*.92+Math.cos(a)*width);
  }
 }
 for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){
  const a=i*(segments+1)+j,b=a+segments+1;
  if(side>0)indices.push(a,b,a+1,b,b+1,a+1);else indices.push(a,a+1,b,b,a+1,b+1);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);
 const mesh=finish(geometry,name);mesh.position.set(side*.8,-.35,z);return mesh;
}
model.add(loft([[-5.6,.018,.02],[-5.3,.28,.13],[-4.8,.48,.22],[-4,.68,.33],[-3.2,.79,.42],[-2.5,.87,.60],[-1.4,1.09,.78],[.2,1.16,.90],[1.5,.94,.72],[2.6,.62,.53],[3.8,.25,.28]],'Body'));
jaw.position.set(0,-.34,-2.8);
jaw.add(loft([[-2.65,.035,.03],[-2.45,.25,.12],[-1.85,.48,.16],[-1,.68,.2],[0,.75,.19]],'LowerJaw'));
model.add(jaw);
const mouth=new THREE.Mesh(new THREE.SphereGeometry(1,24,12),new THREE.MeshStandardMaterial({color:0x423438,roughness:.72}));
mouth.scale.set(.66,.06,1.25);mouth.position.set(0,-.14,-4.05);model.add(mouth);
for(const s of [-1,1]){
 const rim=details.oval([.065,.092,.12],0x2a403c,'EyeSocket',[s*.65,.27,-3.94]);model.add(rim);
 const eye=new THREE.Mesh(new THREE.SphereGeometry(.064,20,14),new THREE.MeshStandardMaterial({color:0xa99052,roughness:.24}));
 eye.scale.set(.55,.85,1);eye.position.set(s*.697,.27,-3.94);model.add(eye);
 const pupil=new THREE.Mesh(new THREE.SphereGeometry(.032,16,10),new THREE.MeshStandardMaterial({color:0x070e10,roughness:.08}));
 pupil.scale.set(.45,1,1);pupil.position.set(s*.728,.27,-3.955);model.add(pupil);
 model.add(details.oval([.055,.018,.09],0x122729,'Nostril',[s*.16,.30,-5.08]));
 model.add(details.tube([[s*.22,-.10,-5.2],[s*.47,-.10,-4.6],[s*.70,-.11,-3.9],[s*.77,-.10,-3.35]],.016,0x243837,'LipSeam'));
 model.add(flipper(s,-1.5,2.1,'FlipperFront'+s),flipper(s,1.7,1.5,'FlipperRear'+s));
 for(let i=0;i<13;i++){
  const z=-5.22+i*.16,x=.22+(z+5.22)*.27;
  const tooth=new THREE.Mesh(new THREE.ConeGeometry(.055,.2+Math.sin(i*.9)*.03,8),new THREE.MeshStandardMaterial({color:0xd6d5b7,roughness:.34}));
  tooth.position.set(s*x,-.14,z);tooth.rotation.z=Math.PI;model.add(tooth);
  const lowerTooth=new THREE.Mesh(new THREE.ConeGeometry(.045,.15,8),tooth.material);lowerTooth.position.set(s*(x*.92),.16,z+2.8);lowerTooth.name='LowerTooth';jaw.add(lowerTooth);
 }
}
tail.position.z=2.6;
tail.add(loft([[0,.62,.56],[1,.45,.44],[2,.28,.3],[3.2,.16,.23],[4,.08,.12]],'TailBase'));
const tailFin=new THREE.Shape();
tailFin.moveTo(2.8,0);tailFin.bezierCurveTo(3.2,.55,3.7,1.5,4.75,2.0);
tailFin.quadraticCurveTo(4.88,2.04,4.73,1.74);tailFin.bezierCurveTo(4.46,1.16,3.97,.53,4.02,.08);
tailFin.bezierCurveTo(4.07,-.4,4.68,-1.2,4.84,-1.52);tailFin.quadraticCurveTo(4.66,-1.75,4.20,-1.36);tailFin.quadraticCurveTo(3.40,-.55,2.8,0);
const finGeometry=new THREE.ExtrudeGeometry(tailFin,{depth:.05,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.07,bevelThickness:.035,curveSegments:12});
finGeometry.rotateY(-Math.PI/2);finGeometry.translate(.025,0,0);
finGeometry.scale(1,.83,1);
tail.add(finish(finGeometry,'TailFluke'));model.add(tail);
function box(color, scale, position = [0,0,0]) {
 const mesh = new THREE.Mesh(new THREE.BoxGeometry(...scale), new THREE.MeshStandardMaterial({color,roughness:.7}));
 mesh.position.set(...position);return mesh;
}
// Keep the original environment repeatable when rebuilding assets.
let seed = 246813579;
function random(a,b) {
 seed = (Math.imul(seed,1664525)+1013904223)>>>0;
 return a+(seed/4294967296)*(b-a);
}
async function save(name,object){
 const destination=new URL('../src/assets/'+name+'.glb',import.meta.url);
 const buffer=await new GLTFExporter().parseAsync(object,{binary:true});
 await mkdir(new URL('.',destination),{recursive:true});
 await writeFile(destination,Buffer.from(buffer));
 console.log(name+'.glb: '+buffer.byteLength+' bytes');
}
function detailed(object,hitboxes=false){
 object.traverse(node=>{
  if(!node.isMesh)return;
  node.material=node.material.clone();
  const name=node.name;
  if(/Timber|Wood|Plank|Beam|CurvedTrunk|BarCounter|StoolSeat/.test(name))node.material.userData.surface='wood';
  if(/Fabric|Seat$|RecliningBack/.test(name)&&!name.includes('Stool'))node.material.userData.surface='fabric';
  if(/^(Shark|Fish|Dolphin|Seal)(Body|Fin)/.test(name))node.material.userData.surface='hide';
  // Wind and current sway, applied by the vertex shader in MarineLight.
  if(/Leaflet|FrondStem/.test(name))node.material.userData.surface='foliage';
  if(/GrassBlades/.test(name))node.material.userData.surface='blade';
  if(/KelpStrand/.test(name)){node.material.userData.surface='weed';node.material.side=THREE.DoubleSide;}
  if(/Rail|Propeller|Radar|EngineLeg|PileBolt/.test(name)){node.material.metalness=.72;node.material.roughness=.28;}
  if(/Window|Windshield|MaskGlass/.test(name)){node.material.metalness=.3;node.material.roughness=.12;}
  if(/CoralBranch|CoralTwig|RoofReed|GrassBlades|KelpStrand/.test(name))node.userData.noCollision=true;
 });
 return details.optimize(object,hitboxes);
}
await mkdir(new URL('../src/assets/',import.meta.url),{recursive:true});
await save('objects/mosasaurus',detailed(model));
await save('objects/diver',detailed(details.diver(),true));
await save('objects/shark',detailed(details.shark(),true));
await save('objects/boat',detailed(details.boat(),true));
await save('objects/patrol',detailed(details.boat(true),true));
for(const name of ['fish','dolphin','turtle','swimmer','jetski','sailboat','buoy','ray','seal','jellyfish','kayak','surfer'])await save('objects/'+name,detailed(extras[name](),true));
await save('objects/gull',detailed(extras.gull()));
await save('maps/coast',terrain());

const layout={map:'coast',objects:[]};
function place(asset,x,z,scale=[1,1,1],rotation=0,offset=0){layout.objects.push({asset,position:[x,groundHeight(x,z)+offset,z],scale,rotation:[0,rotation,0]});}
await save('objects/rock',details.rock());
for(let i=0;i<28;i++){
 const side=i%2?1:-1,x=side*random(54,86),z=shoreZ(x)+random(-5,18),size=random(1.4,4.2);
 place('rock',x,z,[size,random(1.8,4.4),size*.85],random(0,6.28),-.3);
}
for(let i=0;i<14;i++){const x=random(-66,66),z=random(6,70);if(Math.hypot(x,z-12)>15)place('rock',x,z,[random(.8,2.7),random(.5,1.5),random(1,3)],random(0,6.28),-.3);}
await save('objects/palm',detailed(details.palm()));
for(let i=0;i<18;i++){
 const x=-68+i*8+random(-2,2),z=shoreZ(x)-random(15,27),size=random(.83,1.25);
 place('palm',x,z,[size,size,size],random(-Math.PI,Math.PI));
}
await save('objects/umbrella',detailed(details.umbrella()));
await save('objects/umbrella-orange',detailed(details.umbrella(true)));
await save('objects/lounger',detailed(details.lounger()));
for(let i=0;i<8;i++){
 const x=-48+i*13+random(-1.2,1.2),z=shoreZ(x)-9-(i%2)*4;
 if(Math.abs(x+34)<5)continue;
 place(i%2?'umbrellaOrange':'umbrella',x,z,[1,1,1],random(-.25,.25));
 for(const side of [-1,1]){
  const lx=x+side*1.25,lz=z+1.5;
  place('lounger',lx,lz,[1,1,1],Math.PI+random(-.12,.12),.02);
 }
}
await save('objects/platform',detailed(details.platform()));
layout.objects.push({asset:'platform',position:[64,0,59],scale:[.65,.8,.65]});
await save('objects/pier',detailed(scenery.pier()));
layout.objects.push({asset:'pier',position:[-34,0,shoreZ(-34)+8]});
await save('objects/beach-bar',detailed(scenery.beachBar()));
place('beachBar',13,shoreZ(13)-22,[1,1,1],-.05);
await save('objects/grass',detailed(scenery.grass()));
for(let i=0;i<125;i++){
 const x=random(-100,100),z=shoreZ(x)-random(19,50);
 if(Math.hypot(x-13,z-(shoreZ(13)-22))<8)continue;
 const size=random(.7,1.6);place('grass',x,z,[size,size,size],random(0,6.28));
}
await save('objects/coral',detailed(scenery.coral()));
for(let i=0;i<24;i++){
 const side=i%2?1:-1,x=side*random(22,65),z=random(-8,58),size=random(.7,1.5);
 place('coral',x,z,[size,size,size],random(0,6.28));
}
await save('objects/kelp',detailed(extras.kelp()));
for(let i=0;i<34;i++){
 const x=random(-74,74),z=shoreZ(x)+random(18,70),size=random(.8,1.5);
 if(Math.hypot(x-64,z-59)<14)continue;
 place('kelp',x,z,[size,size*random(.8,1.3),size],random(0,6.28));
}
await writeFile(new URL('../src/assets/maps/coast.layout.json',import.meta.url),JSON.stringify(layout,null,2)+'\n');
const bubblesGeo=new THREE.BufferGeometry();const coords=new Float32Array(450*3);
for(let i=0;i<coords.length;i+=3){coords[i]=random(-78,78);coords[i+1]=random(-28,-1);coords[i+2]=random(-22,76);}
bubblesGeo.setAttribute('position',new THREE.BufferAttribute(coords,3));
const bubbles=new THREE.Points(bubblesGeo,new THREE.MeshBasicMaterial({color:0xbce9d5,transparent:true,opacity:.5}));
bubbles.name='Bubbles';bubbles.userData.pointSize=.12;
await save('effects/bubbles',bubbles);
const sky=new THREE.Mesh(new THREE.SphereGeometry(1000,32,16),new THREE.MeshBasicMaterial({color:0x7ab8d2,side:THREE.BackSide}));sky.name='Sky';sky.userData.noCollision=true;await save('effects/sky',sky);

const particle=new THREE.Mesh(new THREE.IcosahedronGeometry(.2,0),new THREE.MeshBasicMaterial({color:0xd2f4cb,transparent:true,opacity:.9}));
particle.name='BiteParticle';await save('effects/bite-particle',particle);
const ring=new THREE.Mesh(new THREE.RingGeometry(.98,1,80),new THREE.MeshBasicMaterial({color:0xc3f865,transparent:true,opacity:.7,side:THREE.DoubleSide}));
ring.name='SonarRing';ring.rotation.x=-Math.PI/2;await save('effects/sonar-ring',ring);
