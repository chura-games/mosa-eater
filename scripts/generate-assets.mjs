import * as THREE from 'three';
import * as details from './models/details.mjs';
import * as scenery from './models/scenery.mjs';
import * as extras from './models/extras.mjs';
import * as fleet from './models/fleet.mjs';
import {terrain,shoreZ,groundHeight,profile as coast} from './models/beach.mjs';
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
// lining(position,normal) marks the vertices that are the inside of the mouth.
function finish(geometry,name,lining){
 geometry.computeVertexNormals();
 const points=geometry.attributes.position,normals=geometry.attributes.normal,colors=[];
 for(let i=0;i<points.count;i++){
  const position=new THREE.Vector3().fromBufferAttribute(points,i),normal=new THREE.Vector3().fromBufferAttribute(normals,i);
  const color=lining?.(position,normal)?new THREE.Color(0x6a2a32).multiplyScalar(.85+.3*Math.abs(Math.sin(position.z*23)*Math.sin(position.x*17))):pigment(position,normal);
  colors.push(color.r,color.g,color.b);
 }
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const mesh=new THREE.Mesh(geometry,skinMaterial());mesh.name=name;return mesh;
}
// Height of the line where the jaws meet, rising gently towards the snout.
const lip=z=>-.03-(z+3.05)*.057;
function loft(profile,name,centerY=0,ringCount=64){
 const curve=new THREE.CatmullRomCurve3(profile.map(p=>new THREE.Vector3(...p)));
 const rings=curve.getPoints(ringCount),segments=32,points=[],indices=[];
 for(let i=0;i<rings.length;i++){
  const p=rings[i];
  for(let j=0;j<=segments;j++){
   const a=j/segments*Math.PI*2;
   const headLift=name==='Body'?.15*(1-THREE.MathUtils.smoothstep(p.x,-3.3,-2.2)):0;
   let y=centerY+headLift+Math.max(.015,p.z)*Math.sin(a);
   // The skull is cut flat along the lip line: the underside of the snout is the palate,
   // and the lower jaw takes the place of what was removed.
   if(name==='Body')y=THREE.MathUtils.lerp(y,Math.max(y,lip(p.x)),1-THREE.MathUtils.smoothstep(p.x,-3.3,-2.95));
   points.push(Math.max(.015,p.y)*Math.cos(a),y,p.x);
  }
 }
 for(let i=0;i<rings.length-1;i++)for(let j=0;j<segments;j++){
  const a=i*(segments+1)+j,b=a+segments+1;
  indices.push(a,a+1,b,b,a+1,b+1);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setIndex(indices);
 return finish(geometry,name,name==='Body'?(position,normal)=>position.z<-3&&position.y<=lip(position.z)+.004&&normal.y<-.5:undefined);
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
// The spine: one bone per joint from the skull to the tail tip. The root sits at the centre of
// mass and the chain runs out from it in both directions, so the head can stay steady while
// the wave travels down the tail. Each entry is [name, joint z, parent].
const joints=[['Spine',0,null],['Chest',-1,'Spine'],['Neck',-2,'Chest'],['Head',-2.9,'Neck'],
 ['Lumbar',.8,'Spine'],['Hip',1.6,'Lumbar'],['Tail',2.6,'Hip'],['Tail2',3.4,'Tail'],['Tail3',4.2,'Tail2'],['Tail4',5,'Tail3'],['Tail5',5.8,'Tail4'],['Tail6',6.5,'Tail5']];
const bones={};
for(const [name,z,parent] of joints){
 const bone=new THREE.Bone();bone.name=name;bone.userData.z=z;bones[name]=bone;
 if(parent){bone.position.z=z-bones[parent].userData.z;bones[parent].add(bone);}else model.add(bone);
}
model.updateMatrixWorld(true);
const skeleton=new THREE.Skeleton(joints.map(([name])=>bones[name]));
// Each bone fully owns the middle of its segment and blends smoothly into its neighbours
// across the joints, so the hide bends without creases.
const owners=joints.map(([name,z],index)=>{
 const child=joints.find(joint=>joint[2]===name&&Math.sign(joint[1]-z)===Math.sign(z||joint[1]));
 return {index,center:name==='Spine'?0:child?(z+child[1])/2:z+Math.sign(z)*.45};
}).sort((a,b)=>a.center-b.center);
function skinned(mesh,offsetZ=0){
 const geometry=mesh.geometry;geometry.translate(0,0,offsetZ);
 const points=geometry.attributes.position,indices=[],weights=[];
 for(let i=0;i<points.count;i++){
  const z=points.getZ(i);let k=0;
  while(k<owners.length-2&&z>owners[k+1].center)k++;
  const a=owners[k],b=owners[k+1],t=THREE.MathUtils.smoothstep(z,a.center,b.center);
  indices.push(a.index,b.index,0,0);weights.push(1-t,t,0,0);
 }
 geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
 geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
 const result=new THREE.SkinnedMesh(geometry,mesh.material);result.name=mesh.name;
 model.add(result);result.bind(skeleton,new THREE.Matrix4());return result;
}
// Rigid parts ride on the nearest bone and keep the place they were modelled in.
function mount(bone,...nodes){for(const node of nodes){model.add(node);model.updateMatrixWorld(true);bones[bone].attach(node);}}
// Snout to tail tip is one continuous hide.
const bodyProfile=[[-5.6,.018,.02],[-5.3,.28,.13],[-4.8,.48,.22],[-4,.68,.33],[-3.2,.79,.42],[-2.5,.87,.60],[-1.4,1.09,.78],[.2,1.16,.90],[1.5,.94,.72],[2.6,.62,.54],[3.6,.45,.44],[4.6,.28,.3],[5.8,.16,.23],[6.6,.08,.12]];
skinned(loft(bodyProfile,'Body',0,112));
// Half-width of the skull at the lip line, to seat the teeth and fit the lower jaw under it.
const skull=new THREE.CatmullRomCurve3(bodyProfile.map(p=>new THREE.Vector3(...p))).getPoints(400);
const lipWidth=z=>{
 const p=skull.reduce((best,q)=>Math.abs(q.x-z)<Math.abs(best.x-z)?q:best),centre=.15*(1-THREE.MathUtils.smoothstep(z,-3.3,-2.2));
 return p.y*Math.sqrt(Math.max(.05,1-((lip(z)-centre)/p.z)**2));
};
// The lower jaw hinges behind the tooth row, level with the lips.
const hinge=new THREE.Vector3(0,-.06,-3);
jaw.position.copy(hinge);
{
 // Deep at the hinge and slender at the tip, flat on top where the tongue lies:
 // [z, depth below the lip line].
 const depth=new THREE.CatmullRomCurve3([[-5.58,.012],[-5.5,.05],[-5.3,.105],[-4.8,.165],[-4,.23],[-3.3,.275],[-3.05,.3],[-2.82,.32]].map(([z,d])=>new THREE.Vector3(z,d,0))).getPoints(56);
 const segments=28,vertices=[],indices=[];
 for(const {x:z,y:d} of depth){
  const width=Math.max(.012,lipWidth(z)*.84*THREE.MathUtils.smoothstep(z,-5.6,-5.42)),top=lip(z)-.012;
  for(let j=0;j<=segments;j++){
   const a=j/segments*Math.PI*2,s=Math.sin(a);
   vertices.push(width*Math.cos(a)-hinge.x,(s>0?top+s*.012:top-d*Math.pow(-s,.75))-hinge.y,z-hinge.z);
  }
 }
 for(let i=0;i<depth.length-1;i++)for(let j=0;j<segments;j++){const a=i*(segments+1)+j,b=a+segments+1;indices.push(a,a+1,b,b,a+1,b+1);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);
 jaw.add(finish(geometry,'LowerJaw',(position,normal)=>normal.y>.75));
}
mount('Head',jaw);
const flesh=(color,scale,position,name)=>{const part=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),new THREE.MeshStandardMaterial({color,roughness:.45}));part.scale.set(...scale);part.position.set(...position);part.name=name;return part;};
// The dark back of the throat fills the gape when the jaws open.
mount('Head',flesh(0x35101a,[.52,.2,.42],[0,-.11,-3.2],'Throat'));
const tongue=flesh(0x8f3f4c,[.2,.04,.78],[0,lip(-4.1)-.004-hinge.y,-4.1-hinge.z],'Tongue');tongue.rotation.x=.057;jaw.add(tongue);
const ivory=new THREE.MeshStandardMaterial({color:0xd6d5b7,roughness:.34}),gum=new THREE.MeshStandardMaterial({color:0x8a4650,roughness:.5});
function tooth(height,radius=.052){return new THREE.Mesh(new THREE.ConeGeometry(radius,height,8),ivory);}
for(const s of [-1,1]){
 const rim=details.oval([.065,.092,.12],0x2a403c,'EyeSocket',[s*.65,.27,-3.94]);mount('Head',rim);
 const eye=new THREE.Mesh(new THREE.SphereGeometry(.064,20,14),new THREE.MeshStandardMaterial({color:0xa99052,roughness:.24}));
 eye.scale.set(.55,.85,1);eye.position.set(s*.697,.27,-3.94);mount('Head',eye);
 const pupil=new THREE.Mesh(new THREE.SphereGeometry(.032,16,10),new THREE.MeshStandardMaterial({color:0x070e10,roughness:.08}));
 pupil.scale.set(.45,1,1);pupil.position.set(s*.728,.27,-3.955);mount('Head',pupil);
 mount('Head',details.oval([.055,.018,.09],0x122729,'Nostril',[s*.16,.30,-5.08]));
 mount('Chest',flipper(s,-1.5,2.1,'FlipperFront'+s));mount('Hip',flipper(s,1.7,1.5,'FlipperRear'+s));
 // Gums run along both tooth rows.
 const upperGum=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([-5.46,-5,-4.4,-3.75].map(z=>new THREE.Vector3(s*lipWidth(z)*.9,lip(z)-.004,z))),24,.03,6),gum);upperGum.name='UpperGum';mount('Head',upperGum);
 const lowerGum=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([-5.42,-5,-4.4,-3.8].map(z=>new THREE.Vector3(s*lipWidth(z)*.72,lip(z)-.006,z).sub(hinge))),24,.028,6),gum);lowerGum.name='LowerGum';jaw.add(lowerGum);
 // Recurved teeth of uneven size: the upper row hangs outside the lower jaw, the lower row
 // closes inside it, each tooth meeting a gap in the other row.
 for(let i=0;i<15;i++){
  const z=-5.44+i*.118,height=.17+.07*Math.sin(i*.42)+.035*Math.cos(i*2.3);
  const upper=tooth(height);upper.rotation.set(Math.PI-.24,0,s*.14);upper.position.set(s*lipWidth(z)*.92,lip(z)-height*.46,z+height*.1);mount('Head',upper);
  if(i===14)continue;
  const zl=z+.059,low=height*.82;
  const lower=tooth(low,.045);lower.name='LowerTooth';lower.rotation.set(.24,0,-s*.1);lower.position.set(s*lipWidth(zl)*.74,lip(zl)-.012+low*.46,zl+low*.1).sub(hinge);jaw.add(lower);
 }
 // A second, smaller row on the palate drags prey down the throat.
 for(let i=0;i<6;i++){
  const z=-4.35+i*.13,palatal=tooth(.085,.03);palatal.rotation.set(Math.PI-.4,0,0);palatal.position.set(s*.14,lip(z)-.035,z);mount('Head',palatal);
 }
}
const tailFin=new THREE.Shape();
tailFin.moveTo(2.8,0);tailFin.bezierCurveTo(3.2,.55,3.7,1.5,4.75,2.0);
tailFin.quadraticCurveTo(4.88,2.04,4.73,1.74);tailFin.bezierCurveTo(4.46,1.16,3.97,.53,4.02,.08);
tailFin.bezierCurveTo(4.07,-.4,4.68,-1.2,4.84,-1.52);tailFin.quadraticCurveTo(4.66,-1.75,4.20,-1.36);tailFin.quadraticCurveTo(3.40,-.55,2.8,0);
const finGeometry=new THREE.ExtrudeGeometry(tailFin,{depth:.05,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.07,bevelThickness:.035,curveSegments:12});
finGeometry.rotateY(-Math.PI/2);finGeometry.translate(.025,0,0);
finGeometry.scale(1,.83,1);
// The fluke was modelled from the tail joint, 2.6 m behind the centre.
skinned(finish(finGeometry,'TailFluke'),2.6);
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
for(const name of ['fish','dolphin','turtle','swimmer','jetski','sailboat','buoy','ray','seal','jellyfish','kayak','surfer','orca','whale'])await save('objects/'+name,detailed(extras[name](),true));
for(const name of ['battleship','ferry','submarine','helicopter','shrimp','crab','squid'])await save('objects/'+name,detailed(fleet[name](),true));
await save('objects/gull',detailed(extras.gull()));
await save('maps/coast',terrain());

const layout={map:'coast',objects:[]};
function place(asset,x,z,scale=[1,1,1],rotation=0,offset=0){layout.objects.push({asset,position:[x,groundHeight(x,z)+offset,z],scale,rotation:[0,rotation,0]});}
await save('objects/rock',details.rock());
const wide=coast.playHalfWidth,far=coast.playMaxZ;
for(let i=0;i<90;i++){
 const side=i%2?1:-1,x=side*(i<28?random(54,86):random(150,wide)),z=shoreZ(x)+random(-5,18),size=random(1.4,4.2);
 place('rock',x,z,[size,random(1.8,4.4),size*.85],random(0,6.28),-.3);
}
for(let i=0;i<110;i++){const x=random(-wide+15,wide-15),z=random(6,far-10);if(Math.hypot(x,z-12)>15)place('rock',x,z,[random(.8,2.7),random(.5,1.5),random(1,3)],random(0,6.28),-.3);}
await save('objects/palm',detailed(details.palm()));
for(let i=0;i<74;i++){
 const x=-wide+12+i*11.5+random(-3,3),z=shoreZ(x)-random(15,27),size=random(.83,1.25);
 place('palm',x,z,[size,size,size],random(-Math.PI,Math.PI));
}
await save('objects/umbrella',detailed(details.umbrella()));
await save('objects/umbrella-orange',detailed(details.umbrella(true)));
await save('objects/lounger',detailed(details.lounger()));
for(let i=0;i<34;i++){
 const x=-270+i*16+random(-2,2),z=shoreZ(x)-9-(i%2)*4;
 if(Math.abs(x+34)<5)continue;
 place(i%2?'umbrellaOrange':'umbrella',x,z,[1,1,1],random(-.25,.25));
 for(const side of [-1,1]){
  const lx=x+side*1.25,lz=z+1.5;
  place('lounger',lx,lz,[1,1,1],Math.PI+random(-.12,.12),.02);
 }
}
await save('objects/platform',detailed(details.platform()));
layout.objects.push({asset:'platform',position:[64,0,59],scale:[.65,.8,.65]});
layout.objects.push({asset:'platform',position:[-120,0,140],scale:[.65,.8,.65],rotation:[0,1.1,0]});
layout.objects.push({asset:'platform',position:[250,0,210],scale:[.65,.8,.65],rotation:[0,2.3,0]});
await save('objects/pier',detailed(scenery.pier()));
layout.objects.push({asset:'pier',position:[-34,0,shoreZ(-34)+8]});
await save('objects/beach-bar',detailed(scenery.beachBar()));
place('beachBar',13,shoreZ(13)-22,[1,1,1],-.05);
await save('objects/grass',detailed(scenery.grass()));
for(let i=0;i<400;i++){
 const x=random(-wide,wide),z=shoreZ(x)-random(19,50);
 if(Math.hypot(x-13,z-(shoreZ(13)-22))<8)continue;
 const size=random(.7,1.6);place('grass',x,z,[size,size,size],random(0,6.28));
}
await save('objects/coral',detailed(scenery.coral()));
for(let i=0;i<120;i++){
 const side=i%2?1:-1,x=side*random(18,wide-10),z=random(-8,330),size=random(.7,1.5);
 place('coral',x,z,[size,size,size],random(0,6.28));
}
await save('objects/kelp',detailed(extras.kelp()));
for(let i=0;i<150;i++){
 const x=random(-wide+5,wide-5),z=shoreZ(x)+random(18,360),size=random(.8,1.5);
 if(Math.hypot(x-64,z-59)<14||Math.hypot(x+120,z-140)<14||Math.hypot(x-250,z-210)<14)continue;
 place('kelp',x,z,[size,size*random(.8,1.3),size],random(0,6.28));
}
await writeFile(new URL('../src/assets/maps/coast.layout.json',import.meta.url),JSON.stringify(layout,null,2)+'\n');
const bubblesGeo=new THREE.BufferGeometry();const coords=new Float32Array(450*3);
for(let i=0;i<coords.length;i+=3){coords[i]=random(-45,45);coords[i+1]=random(-28,-1);coords[i+2]=random(-45,45);}
bubblesGeo.setAttribute('position',new THREE.BufferAttribute(coords,3));
const bubbles=new THREE.Points(bubblesGeo,new THREE.MeshBasicMaterial({color:0xbce9d5,transparent:true,opacity:.5}));
bubbles.name='Bubbles';bubbles.userData.pointSize=.12;
await save('effects/bubbles',bubbles);
const sky=new THREE.Mesh(new THREE.SphereGeometry(1000,32,16),new THREE.MeshBasicMaterial({color:0x7ab8d2,side:THREE.BackSide}));sky.name='Sky';sky.userData.noCollision=true;await save('effects/sky',sky);

const particle=new THREE.Mesh(new THREE.IcosahedronGeometry(.2,0),new THREE.MeshBasicMaterial({color:0xd2f4cb,transparent:true,opacity:.9}));
particle.name='BiteParticle';await save('effects/bite-particle',particle);
const ring=new THREE.Mesh(new THREE.RingGeometry(.98,1,80),new THREE.MeshBasicMaterial({color:0xc3f865,transparent:true,opacity:.7,side:THREE.DoubleSide}));
ring.name='SonarRing';ring.rotation.x=-Math.PI/2;await save('effects/sonar-ring',ring);
