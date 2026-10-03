import * as THREE from 'three';
import {random} from '../utils/random';

type Puff={sprite:THREE.Sprite,velocity:THREE.Vector3,life:number,span:number,from:number,to:number,opacity:number,gravity:number,ceiling:boolean};
type Fragment={mesh:THREE.Mesh,velocity:THREE.Vector3,spin:THREE.Vector3,life:number,scale:THREE.Vector3,floats:boolean,wet:boolean,bleed:number,drip:number};
type Slick={mesh:THREE.Mesh,life:number,span:number,size:number,height?:number};

// Blood, flesh, spray, smoke and wreckage. Everything is generated here: no image files.
export class Effects{
 // Scales how much blood and flesh is shown (settings: 0.4 mild, 1 normal, 1.8 extreme).
 gore=1.8;
 private readonly puffs:Puff[]=[];
 private readonly fragments:Fragment[]=[];
 private readonly slicks:Slick[]=[];
 private readonly soft:THREE.Texture;
 private readonly pieces=new Map<string,{geometry:THREE.BufferGeometry,center:THREE.Vector3}[]>();
 private readonly broken=new Map<string,THREE.Material>();
 private readonly chunk=new THREE.IcosahedronGeometry(1,0);
 private readonly flesh=[0x6d1014,0x8a1a1c,0x4a070a].map(color=>new THREE.MeshStandardMaterial({color,roughness:.35}));
 private readonly bone=new THREE.MeshStandardMaterial({color:0xd9cdb4,roughness:.6});
 constructor(private scene:THREE.Scene,private surface:(x:number,z:number,time:number)=>number,private ground:(x:number,z:number)=>number){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const context=canvas.getContext('2d')!,gradient=context.createRadialGradient(32,32,0,32,32,32);
  gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.45,'rgba(255,255,255,.55)');gradient.addColorStop(1,'rgba(255,255,255,0)');
  context.fillStyle=gradient;context.fillRect(0,0,64,64);
  this.soft=new THREE.CanvasTexture(canvas);
 }
 private puff(position:THREE.Vector3,velocity:THREE.Vector3,color:number,span:number,from:number,to:number,opacity:number,gravity=0,ceiling=false){
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:this.soft,color,transparent:true,opacity,depthWrite:false}));
  sprite.position.copy(position);sprite.scale.setScalar(from);this.scene.add(sprite);
  this.puffs.push({sprite,velocity,life:span,span,from,to,opacity,gravity,ceiling});
 }
 // A cloud that billows out from the wound, then hangs and thins in the water.
 // In the open air (a kill on the beach) it sprays and falls instead of hanging.
 blood(position:THREE.Vector3,size=1,air=false){
  const count=Math.round((12+size*9)*this.gore);
  for(let i=0;i<count;i++){
   // A dense dark core with thin, fast wisps streaming off it.
   const wisp=i%3===0,velocity=new THREE.Vector3(random(-1,1),random(-.5,.9),random(-1,1)).multiplyScalar((wisp?random(3,5.5):random(.8,2.6))*size);
   this.puff(position.clone().add(new THREE.Vector3(random(-.4,.4),random(-.4,.4),random(-.4,.4)).multiplyScalar(size)),velocity,wisp?0x6a0a0d:0x3a0407,random(4,7.5),(wisp?random(.4,.7):random(.9,1.5))*size,(wisp?random(2,3.2):random(3.6,6))*size,wisp?random(.2,.32):random(.3,.46),air?-4:0,!air);
  }
 }
 // A quick spurt, used for each shake of a body held in the jaws.
 spurt(position:THREE.Vector3,direction:THREE.Vector3,size=1){
  for(let i=0;i<Math.round(5*this.gore);i++){
   const velocity=direction.clone().multiplyScalar(random(2,6)).add(new THREE.Vector3(random(-1,1),random(-1,1),random(-1,1)).multiplyScalar(1.6));
   this.puff(position.clone(),velocity,i%2?0x7a0c10:0x4a0609,random(1.6,3),random(.25,.5)*size,random(1.4,2.6)*size,random(.35,.55),0,true);
  }
 }
 // Blood spreading across the surface above a kill; it rides the waves and lingers.
 // Given a height, it is a pool soaking into the sand instead.
 slick(position:THREE.Vector3,size=1,height?:number){
  const material=new THREE.MeshBasicMaterial({map:this.soft,color:0x5c0508,transparent:true,opacity:0,depthWrite:false});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);mesh.rotation.x=-Math.PI/2;mesh.rotation.z=random(0,6.28);
  mesh.position.set(position.x+random(-1,1),0,position.z+random(-1,1));mesh.renderOrder=2;this.scene.add(mesh);
  const span=random(14,20);this.slicks.push({mesh,life:span,span,size:(height===undefined?random(7,11):random(3,5))*size*Math.sqrt(this.gore),height});
 }
 // Torn flesh and bone that tumbles away, trailing blood.
 gibs(position:THREE.Vector3,size=1){
  for(let i=0;i<Math.round((5+size*5)*this.gore);i++){
   const white=i%5===4,mesh=new THREE.Mesh(this.chunk,white?this.bone:this.flesh[i%3]);
   mesh.position.copy(position).add(new THREE.Vector3(random(-.3,.3),random(-.3,.3),random(-.3,.3)).multiplyScalar(size));
   mesh.scale.set(random(.06,.2),random(.05,.14),random(.08,white?.36:.24)).multiplyScalar(size);mesh.rotation.set(random(0,6),random(0,6),random(0,6));this.scene.add(mesh);
   const velocity=new THREE.Vector3(random(-1,1),random(-.4,1),random(-1,1)).multiplyScalar(random(2,6.5));
   this.fragments.push({mesh,velocity,spin:new THREE.Vector3(random(-7,7),random(-7,7),random(-7,7)),life:random(7,11),scale:mesh.scale.clone(),floats:false,wet:true,bleed:white?0:random(1.5,3),drip:0});
  }
 }
 splash(position:THREE.Vector3,size=1,color=0xf2fbff){
  for(let i=0;i<Math.round(8+size*8);i++){
   const velocity=new THREE.Vector3(random(-1,1)*2.2*size,random(3,7.5)*Math.sqrt(size),random(-1,1)*2.2*size);
   this.puff(position.clone(),velocity,color,random(.7,1.2),random(.3,.6)*size,random(1,1.9)*size,.85,-9.8);
  }
 }
 smoke(position:THREE.Vector3,size=1){
  for(let i=0;i<10;i++)this.puff(position.clone().add(new THREE.Vector3(random(-1,1),random(0,1),random(-1,1)).multiplyScalar(size)),new THREE.Vector3(random(-.5,.5),random(1.4,3),random(-.5,.5)),i%2?0x2c2c2c:0x4a4744,random(2.2,3.8),random(.8,1.4)*size,random(3,5)*size,.6);
 }
 // Split a merged mesh into chunks by position so a hull breaks into recognisable pieces.
 private split(source:THREE.Mesh){
  const key=source.geometry.uuid,cached=this.pieces.get(key);if(cached)return cached;
  const original=source.geometry.index?source.geometry.toNonIndexed():source.geometry;
  original.computeBoundingBox();const box=original.boundingBox!,size=box.getSize(new THREE.Vector3());
  const longest=Math.max(size.x,size.y,size.z),cell=Math.max(longest/(original.attributes.position.count>240||longest>1.5?3:1.01),.05);
  // Cut long triangles first, so wide flat panels (sails, decks, hull plates) break up too.
  const names=['position','normal','color'].filter(name=>original.attributes[name]),data=names.map(name=>Array.from(original.attributes[name].array as ArrayLike<number>));
  const corner=(i:number)=>new THREE.Vector3(data[0][i*3],data[0][i*3+1],data[0][i*3+2]);
  for(let pass=0;pass<3;pass++){
   const count=data[0].length/9;
   for(let t=0;t<count;t++){
    const points=[corner(t*3),corner(t*3+1),corner(t*3+2)],lengths=[0,1,2].map(e=>points[e].distanceTo(points[(e+1)%3])),edge=lengths.indexOf(Math.max(...lengths));
    if(lengths[edge]<cell*.8)continue;
    const i0=t*3+edge,i1=t*3+(edge+1)%3,i2=t*3+(edge+2)%3;
    for(const values of data){
     const at=(i:number)=>values.slice(i*3,i*3+3),p0=at(i0),p1=at(i1),p2=at(i2),middle=p0.map((value,k)=>(value+p1[k])/2);
     // Replace the triangle with its first half and append the second, keeping the winding.
     [p0,middle,p2].forEach((value,v)=>{for(let k=0;k<3;k++)values[(t*3+v)*3+k]=value[k];});
     values.push(...middle,...p1,...p2);
    }
   }
  }
  const geometry=new THREE.BufferGeometry();names.forEach((name,n)=>geometry.setAttribute(name,new THREE.Float32BufferAttribute(data[n],3)));
  const position=geometry.attributes.position,buckets=new Map<string,number[]>();
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  for(let i=0;i<position.count;i+=3){
   a.fromBufferAttribute(position,i);b.fromBufferAttribute(position,i+1);c.fromBufferAttribute(position,i+2);
   a.add(b).add(c).divideScalar(3).sub(box.min).divideScalar(cell).floor();
   const id=a.x+':'+a.y+':'+a.z;if(!buckets.has(id))buckets.set(id,[]);buckets.get(id)!.push(i);
  }
  const result:{geometry:THREE.BufferGeometry,center:THREE.Vector3}[]=[];
  for(const triangles of buckets.values()){
   const piece=new THREE.BufferGeometry();
   for(const name of names){
    const attribute=geometry.attributes[name],values=new Float32Array(triangles.length*9);
    triangles.forEach((start,t)=>{for(let v=0;v<3;v++)for(let k=0;k<3;k++)values[t*9+v*3+k]=attribute.getComponent(start+v,k);});
    piece.setAttribute(name,new THREE.BufferAttribute(values,3));
   }
   piece.computeBoundingBox();const center=piece.boundingBox!.getCenter(new THREE.Vector3());piece.translate(-center.x,-center.y,-center.z);
   result.push({geometry:piece,center});
  }
  this.pieces.set(key,result);return result;
 }
 // Break a model apart around an impact point. A limit knocks off only the nearest pieces.
 // With flesh set, the pieces are torn, bloodied body parts that sink trailing blood.
 shatter(model:THREE.Object3D,impact:THREE.Vector3,limit=Infinity,flesh=false){
  model.updateMatrixWorld(true);
  const sources:THREE.Mesh[]=[];model.traverse(node=>{if(node instanceof THREE.Mesh&&!Array.isArray(node.material))sources.push(node);});
  const all=sources.flatMap(source=>this.split(source).map(piece=>({source,piece})));
  const chosen=limit<all.length?all.sort((x,y)=>x.piece.center.clone().applyMatrix4(x.source.matrixWorld).distanceToSquared(impact)-y.piece.center.clone().applyMatrix4(y.source.matrixWorld).distanceToSquared(impact)).slice(0,limit):all;
  for(const {source,piece} of chosen){
   const original=source.material as THREE.MeshStandardMaterial,key=original.uuid+(flesh?':flesh':'');
   // Open shells need both faces once the insides are exposed.
   if(!this.broken.has(key)){const material=original.clone();material.side=THREE.DoubleSide;if(flesh){material.color.multiply(new THREE.Color(0xc05a55));material.transparent=false;material.opacity=1;}this.broken.set(key,material);}
   const mesh=new THREE.Mesh(piece.geometry,this.broken.get(key)!);
   source.matrixWorld.decompose(mesh.position,mesh.quaternion,mesh.scale);
   mesh.position.copy(piece.center).applyMatrix4(source.matrixWorld);mesh.castShadow=true;this.scene.add(mesh);
   const away=mesh.position.clone().sub(impact);if(!flesh)away.y=Math.abs(away.y)*.4;
   const velocity=flesh?away.normalize().multiplyScalar(random(1.5,5)).add(new THREE.Vector3(random(-1.5,1.5),random(-1,2),random(-1.5,1.5))):away.normalize().multiplyScalar(random(2,7)).add(new THREE.Vector3(random(-1.5,1.5),random(2.5,7),random(-1.5,1.5)));
   this.fragments.push({mesh,velocity,spin:new THREE.Vector3(random(-4,4),random(-4,4),random(-4,4)),life:flesh?random(9,14):random(6,9),scale:mesh.scale.clone(),floats:flesh?Math.random()<.2:Math.random()<.55,wet:mesh.position.y<0,bleed:flesh?random(2.5,5):0,drip:0});
  }
 }
 update(dt:number,time:number){
  for(let i=this.puffs.length-1;i>=0;i--){
   const puff=this.puffs[i],sprite=puff.sprite;puff.life-=dt;
   if(puff.life<=0){this.scene.remove(sprite);sprite.material.dispose();this.puffs.splice(i,1);continue;}
   puff.velocity.y+=puff.gravity*dt;
   // Water soaks up momentum; spray keeps flying.
   if(!puff.gravity)puff.velocity.multiplyScalar(Math.exp(-dt*1.6));
   sprite.position.addScaledVector(puff.velocity,dt);
   if(puff.ceiling)sprite.position.y=Math.min(sprite.position.y,this.surface(sprite.position.x,sprite.position.z,time)-.15);
   const age=1-puff.life/puff.span;
   sprite.scale.setScalar(THREE.MathUtils.lerp(puff.from,puff.to,1-Math.pow(1-age,2)));
   sprite.material.opacity=puff.opacity*Math.min(1,age*8)*Math.pow(1-age,1.3);
  }
  for(let i=this.slicks.length-1;i>=0;i--){
   const slick=this.slicks[i],mesh=slick.mesh;slick.life-=dt;
   if(slick.life<=0){this.scene.remove(mesh);mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();this.slicks.splice(i,1);continue;}
   const age=1-slick.life/slick.span;
   mesh.position.y=slick.height??this.surface(mesh.position.x,mesh.position.z,time)+.04;
   mesh.scale.setScalar(slick.size*(.25+.75*(1-Math.pow(1-age,3))));
   (mesh.material as THREE.MeshBasicMaterial).opacity=.62*Math.min(1,age*10)*Math.pow(1-age,.8);
  }
  for(let i=this.fragments.length-1;i>=0;i--){
   const fragment=this.fragments[i],mesh=fragment.mesh;fragment.life-=dt;
   if(fragment.life<=0){this.scene.remove(mesh);this.fragments.splice(i,1);continue;}
   const level=this.surface(mesh.position.x,mesh.position.z,time),submerged=mesh.position.y<level;
   if(submerged){
    if(!fragment.wet){fragment.wet=true;if(Math.abs(fragment.velocity.y)>3)this.splash(new THREE.Vector3(mesh.position.x,level,mesh.position.z),.35);}
    // Light pieces bob back up and drift; heavy ones sink slowly, turning as they go.
    fragment.velocity.multiplyScalar(Math.exp(-dt*2.6));fragment.spin.multiplyScalar(Math.exp(-dt*1.4));
    fragment.velocity.y+=(fragment.floats?Math.min(6,(level-mesh.position.y)*9):-1.6)*dt;
    if(fragment.bleed>0){
     fragment.bleed-=dt;fragment.drip-=dt;
     if(fragment.drip<=0){fragment.drip=.16/this.gore;this.puff(mesh.position.clone(),new THREE.Vector3(random(-.3,.3),random(-.1,.4),random(-.3,.3)),0x560709,random(2,3.5),.25,random(.9,1.7),random(.25,.4),0,true);}
    }
   }else{fragment.wet=false;fragment.velocity.y-=9.8*dt;}
   mesh.position.addScaledVector(fragment.velocity,dt);
   // Pieces come to rest on the seabed or the sand rather than falling through it.
   const floor=this.ground(mesh.position.x,mesh.position.z)+.12;
   if(mesh.position.y<floor){mesh.position.y=floor;fragment.velocity.set(0,0,0);fragment.spin.set(0,0,0);}
   mesh.rotation.x+=fragment.spin.x*dt;mesh.rotation.y+=fragment.spin.y*dt;mesh.rotation.z+=fragment.spin.z*dt;
   mesh.scale.copy(fragment.scale).multiplyScalar(Math.min(1,fragment.life/1.2));
  }
 }
}
