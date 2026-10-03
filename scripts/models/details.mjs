import * as THREE from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

export function optimize(root,hitboxes=false){
 root.updateMatrixWorld(true);
 if(hitboxes){
  root.userData.hitboxes=[];
  root.traverse(node=>{if(node.isMesh&&!node.userData.noCollision){node.geometry.computeBoundingBox();root.userData.hitboxes.push({name:node.name,min:node.geometry.boundingBox.min.toArray(),max:node.geometry.boundingBox.max.toArray(),matrix:node.matrixWorld.toArray()});}});
 }
 function batch(parent){
  const buckets=new Map();
  for(const node of [...parent.children]){
   if(!node.isMesh){batch(node);continue;}
   // Flippers move on their own, and skinned hides must keep their bone weights.
   if(node.name.startsWith('Flipper')||node.isSkinnedMesh)continue;
   const m=node.material;
   const key=[m.color.getHex(),m.roughness,m.metalness,m.vertexColors,m.side,m.userData.surface,node.userData.noCollision,Object.keys(node.geometry.attributes).sort().join()].join(':');
   if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(node);
  }
  for(const parts of buckets.values()){
   if(parts.length<2)continue;
   const geometries=parts.map(part=>{part.updateMatrix();const geometry=part.geometry.clone().applyMatrix4(part.matrix);return geometry.index?geometry.toNonIndexed():geometry;});
   // Weld shared corners again after merging: smaller files and fewer vertices for the GPU.
   const joined=mergeGeometries(geometries,false);if(!joined)throw new Error('Cannot batch '+parent.name);
   const merged=mergeVertices(joined,1e-4);
   const model=new THREE.Mesh(merged,parts[0].material);model.name=parts[0].name+'Assembly';model.userData.parts=parts.map(part=>part.name);model.userData.noCollision=parts[0].userData.noCollision??false;
   parts.forEach(part=>parent.remove(part));parent.add(model);
  }
 }
 batch(root);return root;
}

const materials=new Map();
export function material(color,roughness=.55,metalness=0){
 const key=[color,roughness,metalness].join(':');
 if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));
 return materials.get(key);
}
export function mesh(geometry,color,name,position=[0,0,0],roughness=.55,metalness=0){
 const result=new THREE.Mesh(geometry,material(color,roughness,metalness));result.name=name;result.position.set(...position);return result;
}
export function block(size,color,name,position=[0,0,0]){return mesh(new THREE.BoxGeometry(...size),color,name,position);}
export function oval(size,color,name,position=[0,0,0]){const result=mesh(new THREE.SphereGeometry(1,20,12),color,name,position);result.scale.set(...size);return result;}
export function rod(a,b,radius,color,name,segments=10){
 const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);
 const result=mesh(new THREE.CylinderGeometry(radius,radius,delta.length(),segments),color,name,from.clone().add(to).multiplyScalar(.5).toArray(),.45,.2);
 result.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return result;
}
export function tube(points,radius,color,name,segments=24,radial=6){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments,radius,radial,false),color,name);}
export function group(name){const result=new THREE.Group();result.name=name;return result;}
export function foil(points,thickness,color,name){
 const shape=new THREE.Shape();shape.moveTo(...points[0]);for(const point of points.slice(1))shape.lineTo(...point);shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:true,bevelSize:thickness*.3,bevelThickness:thickness*.25,bevelSegments:2,steps:1});
 geometry.translate(0,0,-thickness*.5);return mesh(geometry,color,name);
}
export function latheBody(profile,color,name,rings=64,around=32){
 const points=profile.map(([z,width,height])=>new THREE.Vector3(z,width,height));
 const sections=new THREE.CatmullRomCurve3(points).getPoints(rings),vertices=[],indices=[],colors=[];
 for(const p of sections)for(let j=0;j<=around;j++){
  const angle=j/around*Math.PI*2,vertical=Math.sin(angle);
  vertices.push(Math.max(.015,p.y)*Math.cos(angle),Math.max(.015,p.z)*vertical,p.x);
  // A crisp line low on the flank separates the dark back from the pale belly.
  const c=new THREE.Color(color).lerp(new THREE.Color(0xd5d8c8),THREE.MathUtils.smoothstep(-vertical,.05,.5)*.9);colors.push(c.r,c.g,c.b);
 }
 for(let i=0;i<sections.length-1;i++)for(let j=0;j<around;j++){const a=i*(around+1)+j,b=a+around+1;indices.push(a,a+1,b,b,a+1,b+1);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const result=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.4}));result.name=name;return result;
}
// A rounded hydrofoil: span along +Y, leading edge toward -Z, tapering to a swept tip.
export function fin(name,color,{span,chord,sweep,thickness=.1,taper=1.5,down=false,rings=16,segments=14}){
 const vertices=[],colors=[],indices=[],base=new THREE.Color(color),edge=base.clone().multiplyScalar(.7);
 for(let i=0;i<=rings;i++){
  const t=i/rings,c=Math.max(.02,chord*Math.pow(1-t,taper)),leading=sweep*Math.pow(t,.8),half=Math.max(.006,thickness*.5*Math.pow(1-t,.9));
  for(let j=0;j<segments;j++){
   const a=j/segments*Math.PI*2;
   vertices.push(Math.sin(a)*half,(down?-1:1)*t*span,leading+c*.5-Math.cos(a)*c*.5);
   const shade=base.clone().lerp(edge,t*.6);colors.push(shade.r,shade.g,shade.b);
  }
 }
 for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){
  const a=i*segments+j,a1=i*segments+(j+1)%segments,b=a+segments,b1=a1+segments;
  if(down)indices.push(a,a1,b,b,a1,b1);else indices.push(a,b,a1,b,b1,a1);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const result=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.4}));result.name=name;return result;
}

export function diver(){
 // Built standing, then laid prone so the head leads while swimming. Legs pivot at the hips for kicking.
 const model=group('Diver'),body=group('DiverBody');body.rotation.x=-Math.PI/2;model.add(body);
 body.add(oval([.29,.43,.19],0x172732,'WetsuitTorso',[0,.04,0]),oval([.23,.24,.18],0x1d303a,'Hips',[0,-.39,.015]));
 body.add(oval([.205,.245,.19],0xc79576,'Head',[0,.68,-.015]),oval([.212,.19,.195],0x172732,'Hood',[0,.77,.02]));
 body.add(block([.37,.16,.08],0x253f44,'MaskFrame',[0,.72,-.19]),block([.30,.105,.018],0x64b5be,'MaskGlass',[0,.725,-.237]));
 body.add(oval([.09,.065,.065],0x10191c,'Regulator',[0,.55,-.20]));
 const tank=mesh(new THREE.CapsuleGeometry(.13,.6,4,12),0xb1b8b5,'AirTank',[0,.08,.26],.3,.65);body.add(tank);
 body.add(block([.33,.06,.18],0x142027,'TankStrap',[0,.16,.25]),block([.3,.06,.18],0x142027,'TankStrapLower',[0,-.15,.25]));
 body.add(tube([[0,.53,-.23],[.28,.50,-.1],[.32,.2,.12],[.1,.39,.26]],.028,0x171e23,'BreathingHose'));
 for(const side of [-1,1]){
  // Arms reach forward past the head, as a diver glides.
  body.add(rod([side*.23,.32,0],[side*.3,.72,-.08],.095,0x182d38,'UpperArm'),rod([side*.3,.72,-.08],[side*.2,1.05,-.1],.073,0x182d38,'Forearm'));
  body.add(oval([.075,.10,.085],0x2d4148,'Glove',[side*.19,1.1,-.1]));
  const leg=group(side<0?'LegL':'LegR');leg.position.set(side*.13,-.42,0);body.add(leg);
  leg.add(rod([0,0,0],[side*.06,-.39,.08],.10,0x182d38,'Thigh'),rod([side*.06,-.39,.08],[side*.07,-.68,-.02],.075,0x182d38,'Shin'));
  const flipper=foil([[-.11,0],[.11,0],[.19,.55],[-.19,.55]],.04,0xdfae43,'SwimFin');flipper.rotation.x=Math.PI;flipper.position.set(side*.07,-.7,-.02);leg.add(flipper);
  body.add(rod([side*.21,.36,-.17],[side*.19,-.25,-.19],.028,0xe3ac49,'Harness'));
 }
 return model;
}

export function shark(){
 const model=group('Shark'),hide=0x4f6a75;
 const profile=[[-2.05,.02,.02],[-1.88,.17,.13],[-1.5,.36,.31],[-.9,.5,.5],[-.2,.53,.55],[.6,.41,.43],[1.2,.24,.26],[1.7,.11,.14],[2,.06,.09]];
 model.add(latheBody(profile,0x57747f,'SharkBody'));
 // Half-width (y) and half-height (z) of the body at a length station, to seat parts on the skin.
 const stations=new THREE.CatmullRomCurve3(profile.map(p=>new THREE.Vector3(...p))).getPoints(240);
 const girth=z=>stations.reduce((best,p)=>Math.abs(p.x-z)<Math.abs(best.x-z)?p:best);
 const flank=(z,y)=>{const g=girth(z);return g.y*Math.sqrt(Math.max(0,1-(y/g.z)**2));};
 const belly=(z,x)=>{const g=girth(z);return -g.z*Math.sqrt(Math.max(0,1-(x/g.y)**2));};
 const dorsal=fin('SharkFinDorsal',hide,{span:.74,chord:.8,sweep:.64,thickness:.11});dorsal.position.set(0,girth(-.1).z-.09,-.52);model.add(dorsal);
 const rear=fin('SharkFinSecondDorsal',hide,{span:.16,chord:.2,sweep:.16,thickness:.04});rear.position.set(0,girth(1.15).z-.03,1.05);model.add(rear);
 const anal=fin('SharkFinAnal',hide,{span:.17,chord:.2,sweep:.17,thickness:.04,down:true});anal.position.set(0,-girth(1.2).z+.03,1.1);model.add(anal);
 const tail=group('SharkTail');tail.position.z=1.6;
 tail.add(fin('SharkFinTailUpper',hide,{span:1.08,chord:.55,sweep:.78,thickness:.09,taper:1.3}));
 tail.add(fin('SharkFinTailLower',hide,{span:.8,chord:.5,sweep:.5,thickness:.08,taper:1.3,down:true}));model.add(tail);
 for(const side of [-1,1]){
  const pectoral=fin('SharkFinPectoral',hide,{span:1.05,chord:.6,sweep:.7,thickness:.09});
  pectoral.rotation.z=-side*(Math.PI/2+.35);pectoral.position.set(side*(flank(-.7,-.22)-.07),-.22,-.98);model.add(pectoral);
  const pelvic=fin('SharkFinPelvic',hide,{span:.3,chord:.3,sweep:.25,thickness:.05});
  pelvic.rotation.z=-side*(Math.PI/2+.9);pelvic.position.set(side*(flank(.6,-.3)-.05),-.3,.45);model.add(pelvic);
  model.add(oval([.026,.034,.034],0x05090b,'SharkEye',[side*(flank(-1.6,.1)-.01),.1,-1.6]));
  for(let i=0;i<5;i++){
   const z=-1.2+i*.085;
   model.add(tube([.2,0,-.24].map((y,k)=>[side*(flank(z+k*.025,y)-.003),y,z+k*.025]),.011,0x2c474e,'GillSlit'));
  }
 }
 model.add(tube([-.2,-.1,0,.1,.2].map(x=>{const z=-1.55-(.2-Math.abs(x))*.9;return [x,belly(z,x)+.004,z];}),.013,0x1f2c30,'SharkMouth'));
 return model;
}

export function hull(patrol){
 const frames=[[-3.8,.045,.23],[-3.25,.8,.1],[-2,1.45,0],[0,1.65,0],[2.6,1.48,0],[3.2,1.36,0]];
 const vertices=[],indices=[];
 for(const [z,w,lift]of frames)for(const [x,y]of [[-w,.38+lift],[-w*.88,-.18+lift],[0,-.75+lift],[w*.88,-.18+lift],[w,.38+lift]])vertices.push(x,y,z);
 for(let i=0;i<frames.length-1;i++)for(let j=0;j<4;j++){const a=i*5+j,b=a+5;indices.push(a,a+1,b,b,a+1,b+1);}
 const end=(frames.length-1)*5;indices.push(end,end+2,end+1,end,end+4,end+2,end+2,end+4,end+3,0,1,2,0,2,4,2,3,4);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 return mesh(geometry,patrol?0x637b85:0xe8e3d3,'VHull');
}
export function boat(patrol=false){
 const model=group(patrol?'PatrolBoat':'LeisureBoat');model.add(hull(patrol));
 const deck=foil([[-.05,-3.72],[.74,-3.2],[1.40,-2],[1.58,0],[1.4,3.12],[-1.4,3.12],[-1.58,0],[-1.40,-2],[-.74,-3.2]],.12,0xc4b99d,'Deck');deck.rotation.x=Math.PI/2;deck.position.y=.4;model.add(deck);
 model.add(block([2.05,.95,1.9],patrol?0xd4ddda:0xe9e9dd,'Cabin',[0,.93,.05]));
 const glass=block([1.9,.53,.09],0x245766,'Windshield',[0,1.32,-.94]);glass.rotation.x=-.2;model.add(glass);
 model.add(block([2.25,.10,2.1],0xf1f0e5,'Roof',[0,1.65,.05]));
 for(const side of [-1,1]){
  model.add(block([.04,.46,1.42],0x326274,'SideWindow',[side*1.04,1.26,.08]));
  const railPoints=[[side*.3,.94,-3.5],[side*1.25,.87,-2.25],[side*1.48,.82,0],[side*1.31,.8,2.8]];
  model.add(tube(railPoints,.026,0xb8c3c3,'SafetyRail'));
  for(const p of railPoints.slice(1))model.add(rod([p[0],.4,p[2]],p,.025,0xb8c3c3,'RailPost'));
  model.add(oval([.14,.37,.14],0xdadcd1,'Fender',[side*1.6,.1,1.5]));
  model.add(block([.06,.16,2.7],patrol?0xe8783e:0x376a7a,'HullStripe',[side*1.49,.06,.65]));
 }
 model.add(block([1.5,.4,.62],0xe0d9c7,'SternSeat',[0,.7,2.3]));
 for(const x of patrol?[-.55,.55]:[0]){
  model.add(oval([.32,.52,.33],0x25343d,'Outboard',[x,.38,3.42]),block([.13,.55,.17],0x42505a,'EngineLeg',[x,-.4,3.45]));
  model.add(rod([x-.26,-.68,3.58],[x+.26,-.68,3.58],.045,0x9ba8a7,'Propeller'));
 }
 model.add(rod([0,1.7,.55],[0,2.65,.55],.035,0x9caaa9,'Mast'));
 if(patrol){
  model.add(block([.9,.09,.17],0xdce1d7,'Radar',[0,2.58,.55]),block([.8,.11,.25],0x152a38,'Lightbar',[0,1.78,-.25]));
  model.add(oval([.16,.10,.12],0xd95642,'PortBeacon',[-.25,1.88,-.25]),oval([.16,.10,.12],0x477da0,'StarboardBeacon',[.25,1.88,-.25]));
  const ring=mesh(new THREE.TorusGeometry(.30,.065,8,24),0xe77d41,'LifeRing',[1.1,.94,1.15]);ring.rotation.y=Math.PI/2;model.add(ring);
 }
 return model;
}

export function rock(){
 const geometry=new THREE.IcosahedronGeometry(1,4),positions=geometry.attributes.position,colors=[];
 for(let i=0;i<positions.count;i++){
  const v=new THREE.Vector3().fromBufferAttribute(positions,i),r=1+.11*Math.sin(v.x*7+v.z*4)*Math.cos(v.y*6-v.x*2);
  v.multiplyScalar(r);v.y*=.72;positions.setXYZ(i,v.x,v.y,v.z);
  const c=new THREE.Color(0x6b7771).lerp(new THREE.Color(0x4c6952),Math.max(0,v.y)*.5);c.multiplyScalar(.9+.13*Math.sin(v.x*14+v.z*8));colors.push(c.r,c.g,c.b);
 }
 // Smooth displaced surface; the shader supplies the fine stone grain.
 geometry.computeVertexNormals();geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const result=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95}));result.material.userData.surface='rock';result.name='WeatheredRock';return result;
}

export function palm(){
 const model=group('Palm'),curve=new THREE.CatmullRomCurve3([[0,0,0],[.12,2,0],[.42,4,-.1],[.95,6.5,-.2],[1.35,8.5,-.3]].map(p=>new THREE.Vector3(...p)));
 const trunk=mesh(new THREE.TubeGeometry(curve,24,.21,10,false),0x8e7b5c,'CurvedTrunk');model.add(trunk);
 for(let i=1;i<22;i++){
  const t=i/23,pos=curve.getPoint(t),ring=mesh(new THREE.TorusGeometry(.214,.018,4,10),0x665940,'BarkRing',pos.toArray());
  ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),curve.getTangent(t));model.add(ring);
 }
 const crown=curve.getPoint(1);model.add(oval([.45,.35,.4],0x546d3b,'Crown',crown.toArray()));
 for(let i=0;i<11;i++){
  const a=i*Math.PI*2/11,dir=new THREE.Vector3(Math.cos(a),0,Math.sin(a)),start=crown.clone();
  const points=[start,start.clone().addScaledVector(dir,1.5).add(new THREE.Vector3(0,.55,0)),start.clone().addScaledVector(dir,3.4).add(new THREE.Vector3(0,-.6,0)),start.clone().addScaledVector(dir,4.1).add(new THREE.Vector3(0,-1.9,0))];
  const spine=new THREE.CatmullRomCurve3(points);model.add(mesh(new THREE.TubeGeometry(spine,16,.032,5,false),0x667643,'FrondStem'));
  for(let j=1;j<19;j++)for(const side of [-1,1]){
   const t=j/20,p=spine.getPoint(t),across=new THREE.Vector3(-dir.z,0,dir.x).multiplyScalar(side*(1.0*Math.sin(t*Math.PI)+.1));
   const tip=p.clone().add(across).addScaledVector(dir,.30).add(new THREE.Vector3(0,-.20,0));
   const g=new THREE.BufferGeometry().setFromPoints([p.clone().addScaledVector(dir,-.18),tip,p.clone().addScaledVector(dir,.22)]);g.computeVertexNormals();
   const leaf=mesh(g,j%2?0x4f7847:0x678746,'Leaflet');leaf.material=leaf.material.clone();leaf.material.side=THREE.DoubleSide;leaf.userData.noCollision=true;model.add(leaf);
  }
 }
 for(let i=0;i<3;i++)model.add(oval([.16,.22,.16],0x786444,'Coconut',[crown.x+Math.cos(i*2)*.27,crown.y-.35,crown.z+Math.sin(i*2)*.27]));
 return model;
}

export function umbrella(orange=false){
 const model=group('Umbrella');model.add(rod([0,0,0],[0,2.8,0],.045,0xd6c2a0,'Pole'));
 for(let i=0;i<10;i++){
  const vertices=[],indices=[];
  for(let row=0;row<=6;row++)for(let col=0;col<=4;col++){
   const r=Math.max(.015,row/6*2.2),a=(i+col/4)*Math.PI*.2;
   const y=2.8-.46*Math.pow(r/2.2,1.5)-.09*Math.sin(col/4*Math.PI)*(r/2.2);
   vertices.push(Math.cos(a)*r,y,Math.sin(a)*r);
  }
  for(let r=0;r<6;r++)for(let c=0;c<4;c++){const a=r*5+c,b=a+5;indices.push(a,a+1,b,b,a+1,b+1);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const panel=mesh(geometry,i%2?0xe9dfc5:orange?0xce805a:0x3e8187,'FabricPanel');panel.material=panel.material.clone();panel.material.side=THREE.DoubleSide;model.add(panel);
  const angle=i*Math.PI*.2;model.add(rod([0,2.65,0],[Math.cos(angle)*2.18,2.27,Math.sin(angle)*2.18],.014,0xc7b793,'CanopyRib'));
 }
 model.add(oval([.12,.08,.12],0xc4a879,'Finial',[0,2.86,0]));return model;
}

export function lounger(){
 const model=group('Lounger');
 model.add(block([.75,.09,1.25],0xe3d9bc,'Seat',[0,.43,.3]));
 const back=block([.75,.08,.8],0xe3d9bc,'RecliningBack',[0,.7,-.62]);back.rotation.x=-.55;model.add(back);
 for(const s of [-1,1]){model.add(rod([s*.4,.12,.9],[s*.4,.5,-.45],.033,0xaeb7b0,'Frame'),rod([s*.4,.1,-.55],[s*.4,.48,.65],.033,0xaeb7b0,'FoldingLeg'));}
 return model;
}

export function platform(){
 const model=group('Platform');model.add(block([19,1,17],0x596d72,'SteelDeck',[0,8,0]),block([18.4,.1,16.4],0xb6ab89,'DeckSurface',[0,8.56,0]));
 for(const x of [-7,7])for(const z of [-6,6])model.add(rod([x,-33,z],[x,8,z],.65,0x59696c,'FoundationLeg',12));
 for(const y of [-20,-8,4])for(const z of [-6,6]){
  model.add(rod([-7,y-6,z],[7,y+6,z],.17,0x788585,'CrossBrace'),rod([7,y-6,z],[-7,y+6,z],.17,0x788585,'CrossBrace'));
 }
 model.add(block([6,3.8,5],0xcdab69,'ServiceCabin',[3,10.5,2]));
 for(let i=0;i<3;i++)model.add(block([1.15,1,.06],0x315963,'CabinWindow',[1+i*1.6,11.2,-.53]));
 for(const x of [-9.1,9.1]){
  model.add(rod([x,9.8,-8],[x,9.8,8],.05,0xe3b95d,'GuardRail'));
  for(let z=-8;z<=8;z+=2)model.add(rod([x,8.6,z],[x,9.8,z],.045,0xe3b95d,'RailPost'));
 }
 for(const z of [-8,8])model.add(rod([-9.1,9.8,z],[9.1,9.8,z],.05,0xe3b95d,'GuardRail'));
 for(let i=0;i<3;i++){
  const tank=mesh(new THREE.CylinderGeometry(.6,.6,2.3,16),0xb6c0b5,'StorageTank',[-5+i*1.6,9.8,4]);model.add(tank);
  model.add(tube([[-5+i*1.6,10.9,4],[-5+i*1.6,11.2,3],[-5+i*1.6,8.8,1]],.09,0xa16d45,'ProcessPipe'));
 }
 for(const x of [-5.8,-4.2])for(const z of [-3.8,-2.2])model.add(rod([x,8.6,z],[x,21,z],.11,0xb7a55f,'CraneTower'));
 for(let y=9;y<21;y+=2)model.add(rod([-5.8,y,-3.8],[-4.2,y+2,-3.8],.065,0x9f955a,'TowerBrace'));
 model.add(rod([-5,21,-3],[4,21,-7],.14,0xd2b262,'CraneBoom'),rod([-5,23,-3],[4,21,-7],.025,0x707b7d,'CraneCable'),rod([4,21,-7],[4,13,-7],.025,0x707b7d,'HoistCable'));
 model.add(rod([-8,8.5,-7],[-8,1,-7],.045,0xb3bab0,'LadderRail'),rod([-7.4,8.5,-7],[-7.4,1,-7],.045,0xb3bab0,'LadderRail'));
 for(let y=1;y<8.5;y+=.42)model.add(rod([-8,y,-7],[-7.4,y,-7],.03,0xb3bab0,'LadderRung'));
 return model;
}
