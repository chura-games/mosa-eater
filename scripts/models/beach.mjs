import * as THREE from 'three';
import {readFile} from 'node:fs/promises';
export const profile=JSON.parse(await readFile(new URL('../../src/assets/maps/coast.profile.json',import.meta.url),'utf8'));
export function shoreZ(x){return profile.shoreZ+profile.curveAmplitude*Math.sin(x*profile.curveFrequency)+2*Math.sin(x*.041);}
// Keep in sync with src/system/Coast.ts and the ground formula in shaders/water.frag.
export function groundHeight(x,z){
 const d=shoreZ(x)-z;
 if(d<0)return -profile.floorDepth*Math.tanh(-d*profile.seaSlope/profile.floorDepth)+.6*Math.sin(x*.083+1)*Math.sin(z*.071)*THREE.MathUtils.smoothstep(-d,4,24);
 return d*profile.beachSlope+THREE.MathUtils.smoothstep(d,12,50)*(1+.65*Math.sin(x*.02))*(.6+.4*Math.sin(d*.035));
}
const coreInland=140,coreSeaward=-390;
function sandColor(x,y,z){
 const c=new THREE.Color(0x637d78).lerp(new THREE.Color(0xaeaa83),THREE.MathUtils.smoothstep(y,-17,-2)).lerp(new THREE.Color(0xe4cd9a),THREE.MathUtils.smoothstep(y,-.25,2.3));
 return c.multiplyScalar(.98+.028*Math.sin(x*2.41+z*3.1)*Math.cos(z*1.73));
}
// Distant hills and headlands close the bay so the land never ends in a straight edge.
function backdrop(){
 const {smoothstep}=THREE.MathUtils,half=profile.mapHalfWidth,xs=[],ds=[],vertices=[],colors=[],heights=[],indices=[];
 for(let x=-640;x<=640;x+=16)xs.push(x);
 for(let d=-400;d<=620;d+=20)ds.push(d);
 for(const x of xs)for(const d of ds){
  const z=shoreZ(x)-d,outside=Math.max(d-coreInland,Math.abs(x)-half,0);
  let y=groundHeight(x,shoreZ(x)-Math.min(d,coreInland));
  y+=smoothstep(d,coreInland,330)*(20+13*Math.sin(x*.011+1.3)+8*Math.sin(x*.027)*Math.cos(d*.013));
  const headland=(17+7*Math.sin(x*.021+d*.012))*smoothstep(-d,170,20);
  y=THREE.MathUtils.lerp(y,Math.max(y,headland),smoothstep(Math.abs(x),half+10,half+140));
  // Sit just below the detailed tiles where the two overlap.
  y-=.4*(1-smoothstep(outside,0,20));
  vertices.push(x,y,z);heights.push(y);
  const rough=.5+.5*Math.sin(x*.19+d*.13)*Math.sin(x*.071-d*.093);
  const green=new THREE.Color(0x7c8f58).lerp(new THREE.Color(0x4d6a45),smoothstep(y,9,30)).lerp(new THREE.Color(0x3f5a40),rough*.45);
  const c=sandColor(x,y,z).lerp(green,smoothstep(outside,0,70)*smoothstep(y,.8,5));colors.push(c.r,c.g,c.b);
 }
 for(let i=0;i<xs.length-1;i++)for(let j=0;j<ds.length-1;j++){
  const a=i*ds.length+j,b=a+ds.length;
  // The detailed tiles cover the middle, overlapped by one cell; open water needs no distant seabed.
  if(Math.max(Math.abs(xs[i]),Math.abs(xs[i+1]))<=half-16&&ds[j]>=coreSeaward+10&&ds[j+1]<=coreInland-20)continue;
  if(Math.max(heights[a],heights[a+1],heights[b],heights[b+1])<-14)continue;
  indices.push(a,b,a+1,b,b+1,a+1);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96}));mesh.name='CoastalHills';mesh.userData.noCollision=true;return mesh;
}
export function terrain(){
 const map=new THREE.Group();map.name='CoastMap';
 const geometry=new THREE.PlaneGeometry(1280,1280,256,256);geometry.rotateX(-Math.PI/2);
 const water=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x218e97,transparent:true,opacity:.42,roughness:.28,metalness:.35,side:THREE.DoubleSide}));water.name='Water';map.add(water);
 const sand=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94});sand.userData.surface='sand';
 for(const [name,minD,maxD] of [['Seabed',coreSeaward,-12],['Beach',-12,32],['SandDune',32,coreInland]]){
  const band=new THREE.Group();band.name=name;map.add(band);
  for(let tile=0;tile<8;tile++){
   const nx=20,nz=Math.ceil((maxD-minD)/(name==='Seabed'?5:2)),vertices=[],colors=[],indices=[];
   for(let ix=0;ix<=nx;ix++)for(let iz=0;iz<=nz;iz++){
    const x=-profile.mapHalfWidth+(tile+ix/nx)*profile.mapHalfWidth/4,d=minD+(maxD-minD)*iz/nz,z=shoreZ(x)-d,y=groundHeight(x,z);
    vertices.push(x,y,z);
    const c=sandColor(x,y,z);colors.push(c.r,c.g,c.b);
   }
   for(let ix=0;ix<nx;ix++)for(let iz=0;iz<nz;iz++){const a=ix*(nz+1)+iz,b=a+nz+1;indices.push(a,b,a+1,b,b+1,a+1);}
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
   const mesh=new THREE.Mesh(geometry,sand);mesh.name=name+'Tile'+tile;band.add(mesh);
  }
 }
 map.add(backdrop());
 return map;
}
