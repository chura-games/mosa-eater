import * as THREE from 'three';
import {group,block,rod,oval,mesh,tube} from './details.mjs';

export function pier(){
 const root=group('TimberPier');
 for(let i=0;i<66;i++)root.add(block([4.1,.18,.40],i%3?0x987452:0xad8560,'TimberPlank',[0,1.95,-13.2+i*.41]));
 for(let i=0;i<5;i++)root.add(block([3.8,.18,.38],0xa2825c,'BeachAccessStep',[0,1.7-i*.22,-13.65-i*.36]));
 for(const x of [-1.8,1.8]){
  root.add(block([.22,.32,28],0x635441,'LongitudinalBeam',[x,1.65,0]));
  for(let z=-12;z<=12;z+=4){
   root.add(rod([x,-9,z],[x,3.1,z],.14,0x716048,'TimberPile',12));
   root.add(rod([x-.2,1.1,z],[x+.2,1.1,z],.055,0x485553,'PileBolt'));
   if(z<12)root.add(tube([[x,2.95,z],[x,2.6,z+2],[x,2.95,z+4]],.035,0xd3c39b,'RopeRail'));
  }
 }
 for(let i=0;i<6;i++){
  const z=12.5+i*.3;root.add(rod([2.0,2-i*.38,z],[2.9,2-i*.38,z],.045,0xb6bab1,'SwimLadderRung'));
 }
 const ring=mesh(new THREE.TorusGeometry(.36,.09,10,28),0xcd6842,'LifeRing',[2.0,2.45,9]);ring.rotation.y=Math.PI/2;root.add(ring);
 return root;
}

export function beachBar(){
 const root=group('BeachBar');
 for(let i=0;i<22;i++)root.add(block([8.5,.17,.29],i%3?0x9f7b55:0xb79065,'TimberDeck',[0,.23,-3.2+i*.30]));
 for(const x of [-3.8,3.8])for(const z of [-2.8,2.8])root.add(rod([x,.2,z],[x,3.65,z],.14,0x97744e,'WoodPost',12));
 root.add(block([6,.16,1.0],0xc6ac81,'BarCounter',[0,1.4,-.45]));
 for(let x=-2.8;x<=2.8;x+=.28)root.add(block([.24,1.1,.14],0x3a7473,'PaintedSlat',[x,.82,-.9]));
 for(let i=0;i<4;i++){
  const x=-2.3+i*1.53;
  root.add(oval([.31,.09,.31],0xb89161,'StoolSeat',[x,1,.9]));
  for(const side of [-1,1])root.add(rod([x+side*.22,.3,.75],[x+side*.19,.95,.9],.035,0x646b61,'StoolLeg'));
 }
 for(const s of [-1,1]){
  const roof=block([9,.12,3.75],0x8d7449,'ThatchedRoof',[0,3.72,s*1.62]);roof.rotation.x=s*.38;root.add(roof);
  for(let i=0;i<80;i++){
   const x=-4.4+i*.111,y=3.79+(Math.sin(i*37)*.02);
   root.add(rod([x,4.39,0],[x,y-1.31,s*3.44],.027,i%2?0xb49a64:0x8b7148,'RoofReed',5));
  }
 }
 for(const z of [-2.8,2.8])root.add(rod([-3.8,3.42,z],[3.8,3.42,z],.12,0x86694b,'CrossBeam'));
 root.add(block([2.8,.65,.10],0x244f50,'BarSign',[0,3.08,2.96]));
 // Three raised brass marks remain legible at game distance.
 for(let i=0;i<3;i++)root.add(oval([.16,.16,.022],0xd3b472,'SignEmblem',[-.6+i*.6,3.08,3.03]));
 for(let i=0;i<7;i++){
  const bottle=mesh(new THREE.CylinderGeometry(.047,.067,.3,10),i%2?0x578568:0xcca85c,'GlassBottle',[-2+i*.33,1.64,-.5],.16,.15);root.add(bottle);
 }
 return root;
}

export function grass(){
 const root=group('BeachGrass'),verts=[],colors=[];
 for(let i=0;i<44;i++){
  const a=i*2.3999,r=Math.sqrt(i/44)*.7,x=Math.cos(a)*r,z=Math.sin(a)*r;
  const h=.4+.55*(.5+.5*Math.sin(i*16.43)),w=.022;
  const dx=Math.cos(a)*.25,dz=Math.sin(a)*.25;
  const points=[[x-w,0,z],[x+w,0,z],[x+dx*.3,h*.6,z+dz*.3],[x+dx*.3,h*.6,z+dz*.3],[x+w,0,z],[x+dx,h,z+dz]];
  for(let j=0;j<6;j++){verts.push(...points[j]);const c=new THREE.Color(j%3===2?0x8e9857:0x4c6539);colors.push(c.r,c.g,c.b);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();
 const blades=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,side:THREE.DoubleSide}));blades.name='GrassBlades';blades.userData.noCollision=true;root.add(blades);return root;
}

export function coral(){
 const root=group('ReefCoral');
 root.add(oval([.65,.16,.5],0x807b62,'ReefBase'));
 for(let i=0;i<9;i++){
  const a=i*2.3999,x=Math.cos(a)*.42,z=Math.sin(a)*.4,h=.45+(i%3)*.2;
  root.add(tube([[x,0,z],[x*1.1,h*.5,z],[x*1.3,h,z*1.2]],.067,0xaf795d,'CoralBranch'));
  for(const side of [-1,1])root.add(tube([[x*1.1,h*.45,z],[x+side*.18,h*.7,z+.13],[x+side*.24,h*.9,z+.15]],.038,0xc39070,'CoralTwig'));
 }
 return root;
}
