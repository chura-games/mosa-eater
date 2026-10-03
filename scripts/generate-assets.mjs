import * as THREE from 'three';
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

 model.add(ellipsoid(0x315e63,[1.45,1,3.7]),ellipsoid(0x9fae8a,[1.15,.56,3.2],[0,-.5,-.2]),ellipsoid(0x355d5d,[1.05,.62,1.8],[0,.12,-3.7]));
 jaw.position.set(0,-.32,-2.6);jaw.add(ellipsoid(0x79907a,[.91,.27,1.55],[0,0,-1.1]));model.add(jaw);
 for(let s of [-1,1]){
 model.add(ellipsoid(0x101b16,[.14,.15,.14],[s*.84,.48,-4.15]),ellipsoid(0xd6da94,[.08,.08,.08],[s*.93,.5,-4.18]));
 for(let z of [-1.4,2]){const fin=ellipsoid(0x2a5257,[2,.16,.64],[s*1.9,-.5,z]);fin.rotation.y=s*.42;model.add(fin);}
 for(let i=0;i<8;i++){const tooth=new THREE.Mesh(new THREE.ConeGeometry(.1,.35,4),new THREE.MeshStandardMaterial({color:0xe4e6c9}));tooth.position.set(s*.7,-.18,-3-i*.29);tooth.rotation.z=Math.PI;model.add(tooth);}
 }
 tail.position.z=2.8;tail.add(ellipsoid(0x315c60,[.7,.65,2.7],[0,0,1.8]),ellipsoid(0x315c60,[.2,1.9,1.1],[0,.5,4]));model.add(tail);



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
 await writeFile(destination,Buffer.from(buffer));
 console.log(name+'.glb: '+buffer.byteLength+' bytes');
}
await mkdir(new URL('../src/assets/',import.meta.url),{recursive:true});
await save('mosasaurus',model);
for(const kind of ['diver','shark','boat','patrol']){
 const preyModel=new THREE.Group();preyModel.name=kind;

 if(kind==='diver'){preyModel.add(ellipsoid(0xf0b899,[.3,.3,.3],[0,.6,0]),box(0xf0b04a,[.5,.8,.28]),box(0x192d3d,[.2,.65,.22],[-.18,-.65,0]),box(0x192d3d,[.2,.65,.22],[.18,-.65,0]),box(0x192d3d,[.3,.6,.3],[0,0,.3]),box(0x63d6d4,[.4,.15,.12],[0,.6,-.26]));}
 else if(kind==='shark'){preyModel.add(ellipsoid(0x78989e,[.65,.5,1.9]));const fin=new THREE.Mesh(new THREE.ConeGeometry(.65,1.4,3),new THREE.MeshStandardMaterial({color:0x688a91}));fin.position.set(0,.75,.25);preyModel.add(fin,ellipsoid(0x729197,[.15,.9,.55],[0,.2,2]));}
 else{preyModel.add(ellipsoid(kind==='patrol'?0x344553:0xeee0b9,[1.8,.65,3.8]),box(0xffffff,[2,1.3,2.5],[0,1,0]),box(0x6abcc7,[1.7,.55,.1],[0,1.3,-1.3]),box(kind==='patrol'?0xe48155:0xd5ac58,[.2,2.4,.2],[0,2,1]));}

 await save(kind,preyModel);
}
const environment=new THREE.Group();environment.name='Environment';

 const geometry=new THREE.PlaneGeometry(650,650,90,90);geometry.rotateX(-Math.PI/2);
 const water=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x218e97,transparent:true,opacity:.42,roughness:.28,metalness:.35,side:THREE.DoubleSide,depthWrite:false}));environment.add(water);
 water.name='Water';
 const bottom=new THREE.Mesh(new THREE.PlaneGeometry(650,650),new THREE.MeshStandardMaterial({color:0x497578,roughness:1}));bottom.name='Seabed';bottom.rotation.x=-Math.PI/2;bottom.position.y=-34;environment.add(bottom);
 for(let i=0;i<70;i++){environment.add(ellipsoid(0x587b75,[random(1,5),random(1,5),random(1,5)],[random(-145,145),-33,random(-145,145)]));}
 let rockIndex=0;for(const child of environment.children){if(child!==water&&child!==bottom)child.name='Rock_'+rockIndex++;}
 const island=ellipsoid(0xb7ba89,[34,6,26],[65,-1,-65]);island.name='Beach';environment.add(island,ellipsoid(0x648b65,[25,5,17],[70,2,-69]));
 for(let i=0;i<12;i++){const x=random(42,84),z=random(-80,-52);environment.add(box(0x6b6251,[.5,8,.5],[x,7,z]));for(let j=0;j<5;j++){const leaf=ellipsoid(0x3d7851,[3.8,.3,1],[x,11,z]);leaf.rotation.y=j*Math.PI*.4;environment.add(leaf);}}
 for(let i=0;i<6;i++){const x=42+i*5;const umbrella=new THREE.Mesh(new THREE.ConeGeometry(2.2,.8,8),new THREE.MeshStandardMaterial({color:i%2?0xe6a16c:0xe9e2b6}));umbrella.position.set(x,4.5,-43);environment.add(umbrella,box(0x8e7861,[.12,2,.12],[x,3.2,-43]));}
 const platform=new THREE.Group();platform.name='Platform';platform.position.set(-70,0,-70);
 platform.add(box(0xa18d68,[19,1.3,17],[0,8,0]),box(0xdca857,[6,5,5],[3,11,2]),box(0x526674,[4,15,4],[-5,16,-3]));
 for(let x of [-7,7])for(let z of [-6,6])platform.add(box(0x526674,[1.3,40,1.3],[x,-11,z]));
 environment.add(platform);
 const bubblesGeo=new THREE.BufferGeometry();const coords=new Float32Array(450*3);for(let i=0;i<coords.length;i+=3){coords[i]=random(-140,140);coords[i+1]=random(-32,-1);coords[i+2]=random(-140,140);}bubblesGeo.setAttribute('position',new THREE.BufferAttribute(coords,3));environment.add(new THREE.Points(bubblesGeo,new THREE.MeshBasicMaterial({color:0xbce9d5,transparent:true,opacity:.5})));

// Give every editable environment object a stable name.
let objectIndex=0;
environment.traverse(object=>{if(!object.name)object.name='EnvironmentPart_'+objectIndex++;});
const bubbles=environment.children.find(object=>object.isPoints);
bubbles.name='Bubbles';bubbles.userData.pointSize=.12;
await save('environment',environment);
const particle=new THREE.Mesh(new THREE.IcosahedronGeometry(.2,0),new THREE.MeshBasicMaterial({color:0xd2f4cb,transparent:true,opacity:.9}));
particle.name='BiteParticle';await save('bite-particle',particle);
const ring=new THREE.Mesh(new THREE.RingGeometry(.98,1,80),new THREE.MeshBasicMaterial({color:0xc3f865,transparent:true,opacity:.7,side:THREE.DoubleSide}));
ring.name='SonarRing';ring.rotation.x=-Math.PI/2;await save('sonar-ring',ring);