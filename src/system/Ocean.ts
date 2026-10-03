import * as THREE from 'three';
import {box,ellipsoid,random} from '../utils/geometry';
export function createOcean(scene:THREE.Scene){
 const geometry=new THREE.PlaneGeometry(650,650,90,90);geometry.rotateX(-Math.PI/2);
 const water=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x218e97,transparent:true,opacity:.42,roughness:.28,metalness:.35,side:THREE.DoubleSide,depthWrite:false}));scene.add(water);
 const bottom=new THREE.Mesh(new THREE.PlaneGeometry(650,650),new THREE.MeshStandardMaterial({color:0x497578,roughness:1}));bottom.rotation.x=-Math.PI/2;bottom.position.y=-34;scene.add(bottom);
 for(let i=0;i<70;i++){scene.add(ellipsoid(0x587b75,[random(1,5),random(1,5),random(1,5)],[random(-145,145),-33,random(-145,145)]));}
 const island=ellipsoid(0xb7ba89,[34,6,26],[65,-1,-65]);scene.add(island,ellipsoid(0x648b65,[25,5,17],[70,2,-69]));
 for(let i=0;i<12;i++){const x=random(42,84),z=random(-80,-52);scene.add(box(0x6b6251,[.5,8,.5],[x,7,z]));for(let j=0;j<5;j++){const leaf=ellipsoid(0x3d7851,[3.8,.3,1],[x,11,z]);leaf.rotation.y=j*Math.PI*.4;scene.add(leaf);}}
 for(let i=0;i<6;i++){const x=42+i*5;const umbrella=new THREE.Mesh(new THREE.ConeGeometry(2.2,.8,8),new THREE.MeshStandardMaterial({color:i%2?0xe6a16c:0xe9e2b6}));umbrella.position.set(x,4.5,-43);scene.add(umbrella,box(0x8e7861,[.12,2,.12],[x,3.2,-43]));}
 const platform=new THREE.Group();platform.position.set(-70,0,-70);
 platform.add(box(0xa18d68,[19,1.3,17],[0,8,0]),box(0xdca857,[6,5,5],[3,11,2]),box(0x526674,[4,15,4],[-5,16,-3]));
 for(let x of [-7,7])for(let z of [-6,6])platform.add(box(0x526674,[1.3,40,1.3],[x,-11,z]));
 scene.add(platform);
 const bubblesGeo=new THREE.BufferGeometry();const coords=new Float32Array(450*3);for(let i=0;i<coords.length;i+=3){coords[i]=random(-140,140);coords[i+1]=random(-32,-1);coords[i+2]=random(-140,140);}bubblesGeo.setAttribute('position',new THREE.BufferAttribute(coords,3));scene.add(new THREE.Points(bubblesGeo,new THREE.PointsMaterial({color:0xbce9d5,size:.12,transparent:true,opacity:.5})));
 return (t:number)=>{const a=geometry.attributes.position;for(let i=0;i<a.count;i++)a.setY(i,Math.sin(a.getX(i)*.08+t)*.28+Math.cos(a.getZ(i)*.09+t*.8)*.24);a.needsUpdate=true;};
}
