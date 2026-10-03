import * as THREE from 'three';
import {random} from '../utils/random';
import {modelBounds,orientedBounds,transformedBounds} from '../system/Collision';
import {groundHeight,shoreZ,playBounds} from '../system/Coast';
import {surfaceHeight} from '../system/Water';
import type {AssetName,ModelAssets} from '../system/ModelAssets';
export type PreyKind='diver'|'shark'|'boat'|'patrol'|'fish'|'turtle'|'dolphin'|'swimmer'|'jetski'|'sailboat'|'buoy'|'tuna'|'orca'|'ray'|'seal'|'jellyfish'|'kayak'|'surfer'|'tourist'|'whale'|'sealion';
// asset/size/tint let one model serve several kinds (a tuna is a large fish, an orca a dark, heavy dolphin).
type Spec={asset?:AssetName,size?:number,tint?:number,upright?:boolean,speed:number,flee:number,turn:number,points:number,health:number,panic:number,label:string,creature:boolean,floats?:boolean,beat:number};
// speed/flee in m/s, turn in rad/s, beat = swim-cycle rate per m/s of speed.
const specs:Record<PreyKind,Spec>={
 diver:{speed:1.1,flee:2.3,turn:1.2,points:25,health:1,panic:9,label:'ダイバー捕食',creature:true,beat:3.2},
 swimmer:{speed:.9,flee:1.9,turn:1.5,points:20,health:1,panic:10,label:'遊泳者を捕食',creature:true,floats:true,beat:3.6},
 shark:{speed:3.2,flee:7,turn:1.5,points:40,health:1,panic:4,label:'サメ捕食',creature:true,beat:1.5},
 fish:{speed:2.4,flee:7.5,turn:3.6,points:8,health:1,panic:1,label:'魚を捕食',creature:true,beat:4.5},
 turtle:{speed:.9,flee:2.2,turn:.9,points:30,health:1,panic:3,label:'ウミガメ捕食',creature:true,beat:2.6},
 dolphin:{speed:4.5,flee:10,turn:2,points:60,health:1,panic:5,label:'イルカ捕食',creature:true,beat:1.1},
 boat:{speed:3,flee:7,turn:.7,points:70,health:2,panic:15,label:'小型船を破壊',creature:false,floats:true,beat:0},
 patrol:{speed:6.5,flee:6.5,turn:.9,points:100,health:3,panic:15,label:'迎撃艇を撃破',creature:false,floats:true,beat:0},
 jetski:{speed:7,flee:12,turn:1.5,points:50,health:1,panic:14,label:'水上バイクを破壊',creature:false,floats:true,beat:0},
 sailboat:{speed:1.8,flee:2.6,turn:.35,points:90,health:3,panic:16,label:'ヨットを破壊',creature:false,floats:true,beat:0},
 tuna:{asset:'fish',size:2.3,tint:0x8f9fb8,speed:4.2,flee:11,turn:2.2,points:35,health:1,panic:2,label:'マグロを捕食',creature:true,beat:2},
 orca:{speed:4,flee:8.5,turn:1.2,points:120,health:2,panic:6,label:'シャチを捕食',creature:true,beat:.75},
 // Too big to carry off: it takes four bites and comes up to blow.
 whale:{speed:2,flee:4.2,turn:.45,points:250,health:4,panic:8,label:'クジラを捕食',creature:true,beat:.42},
 sealion:{asset:'seal',size:1.35,tint:0xd2a877,speed:3,flee:7.5,turn:2.6,points:55,health:1,panic:4,label:'アシカを捕食',creature:true,beat:1.8},
 ray:{speed:1.6,flee:4.5,turn:1.3,points:35,health:1,panic:2,label:'エイを捕食',creature:true,beat:1.6},
 seal:{speed:2.6,flee:6.5,turn:2.4,points:45,health:1,panic:4,label:'アザラシを捕食',creature:true,beat:2},
 jellyfish:{speed:.25,flee:.25,turn:.5,points:5,health:1,panic:0,label:'クラゲを捕食',creature:true,beat:6},
 surfer:{speed:1.3,flee:2.4,turn:1.2,points:30,health:1,panic:11,label:'サーファーを捕食',creature:true,floats:true,beat:2.6},
 kayak:{speed:2,flee:3.6,turn:1,points:45,health:1,panic:12,label:'カヤックを破壊',creature:false,floats:true,beat:1.6},
 // Walks the sand; the only prey that has to be fetched from dry land.
 tourist:{asset:'swimmer',upright:true,speed:1.1,flee:4.4,turn:2.6,points:20,health:1,panic:12,label:'観光客を捕食',creature:true,beat:2.4},
 buoy:{speed:0,flee:0,turn:0,points:15,health:1,panic:2,label:'ブイを破壊',creature:false,floats:true,beat:0},
};
// Height of a standing person's centre above the sand.
const standing=.97;
const tinted=new Map<string,THREE.Material>();
const wrap=(angle:number)=>Math.atan2(Math.sin(angle),Math.cos(angle));
export class Human{
 mesh=new THREE.Group(); heading=random(0,Math.PI*2);phase=random(0,8);alive=true;respawn=0;
 readonly localBounds:THREE.Box3;health=1;ramCooldown=0;speed=0;
 // Set when the body breaks the surface; the game turns it into a splash.
 splashed=false;
 // Set at the moment a person first sees the danger; the game turns it into a scream.
 alarmed=false;
 private wasThreatened=false;
 // Schooling fish hold a slot beside their leader.
 leader?:Human;slot=new THREE.Vector3();
 private readonly parts:{bounds:THREE.Box3,matrix:THREE.Matrix4}[]=[];
 private readonly model:THREE.Object3D;
 private baked=false;
 private readonly rig:{tail?:THREE.Object3D,tailV?:THREE.Object3D,wings:THREE.Object3D[],arms:THREE.Object3D[],legs:THREE.Object3D[]};
 private wander=this.heading;private wanderTimer=0;private depthGoal=-5;
 private pitch=0;private roll=0;private turnRate=0;private swim=random(0,6);private vertical=0;private leaping=false;private leapTimer=random(4,12);private breath=random(6,18);
 static create(kind:PreyKind,assets:ModelAssets){
  const spec=specs[kind],model=assets.instantiate(spec.asset??kind as AssetName);
  if(spec.size)model.scale.setScalar(spec.size);
  // The swimmer is modelled lying down; stood on end it walks.
  if(spec.upright)model.rotation.x=Math.PI/2;
  if(spec.tint!==undefined)model.traverse(node=>{
   if(!(node instanceof THREE.Mesh)||Array.isArray(node.material))return;
   // One tinted copy of each material per kind, shared by every instance.
   const key=kind+':'+node.material.uuid;
   if(!tinted.has(key)){const material=node.material.clone();(material as THREE.MeshStandardMaterial).color.multiply(new THREE.Color(spec.tint!));material.userData={...node.material.userData};tinted.set(key,material);}
   node.material=tinted.get(key)!;
  });
  return new Human(kind,model);
 }
 constructor(public kind:PreyKind,model:THREE.Object3D){
 this.localBounds=modelBounds(model);this.model=model;
 let baked:{min:number[],max:number[],matrix:number[]}[]|undefined;
 model.traverse(node=>{if(node.userData.hitboxes)baked=node.userData.hitboxes;});
 this.baked=!!baked;
 if(baked)for(const part of baked)this.parts.push({bounds:new THREE.Box3(new THREE.Vector3().fromArray(part.min),new THREE.Vector3().fromArray(part.max)),matrix:new THREE.Matrix4().fromArray(part.matrix)});
 else model.traverse(node=>{
  if(!(node instanceof THREE.Mesh))return;
  node.geometry.computeBoundingBox();
  this.parts.push({bounds:node.geometry.boundingBox!.clone(),matrix:node.matrixWorld.clone()});
 });
 const named=(names:string[])=>names.map(name=>model.getObjectByName(name)).filter((node):node is THREE.Object3D=>!!node);
 this.rig={tail:named(['Tail','SharkTail'])[0],tailV:named(['TailV'])[0],wings:named(['WingL','WingR']),arms:named(['ArmL','ArmR']),legs:named(['LegL','LegR'])};
 this.mesh.rotation.order='YXZ';
 this.mesh.add(model);this.reset();
 }
 get spec(){return specs[this.kind];}
 get creature(){return this.spec.creature;}
 get ship(){return !this.spec.creature;}
 collider(){return orientedBounds(this.localBounds,this.mesh);}
 colliders(){this.mesh.updateMatrixWorld(true);return this.parts.map(part=>transformedBounds(part.bounds,new THREE.Matrix4().multiplyMatrices(this.baked?this.model.matrixWorld:this.mesh.matrixWorld,part.matrix)));}
 reset(){
 this.alive=true;this.health=this.spec.health;this.mesh.visible=true;this.speed=0;this.leaping=false;this.vertical=0;
 let x=random(-playBounds.halfWidth+12,playBounds.halfWidth-12),z=random(shoreZ(x)+14,playBounds.maxZ-12);
 // Swimmers stay within sight of the beach; a school regroups around its leader.
 if(this.kind==='swimmer')z=shoreZ(x)+random(12,30);
 // The big animals keep to deep water.
 if(this.kind==='whale'||this.kind==='orca')z=random(shoreZ(x)+70,playBounds.maxZ-15);
 if(this.kind==='tourist'){z=shoreZ(x)-random(4,20);this.mesh.position.set(x,groundHeight(x,z)+standing,z);this.wander=this.heading;this.wanderTimer=random(1,5);return;}
 if(this.leader){x=THREE.MathUtils.clamp(this.leader.mesh.position.x+this.slot.x,-playBounds.halfWidth+12,playBounds.halfWidth-12);z=THREE.MathUtils.clamp(this.leader.mesh.position.z+this.slot.z,shoreZ(x)+14,playBounds.maxZ-12);}
 const floor=groundHeight(x,z);
 const y=this.spec.floats?0:this.leader?THREE.MathUtils.clamp(this.leader.mesh.position.y+this.slot.y,floor+2,-1):random(Math.max(-19,floor+2),-1);
 this.mesh.position.set(x,y,z);this.depthGoal=y;this.wander=this.heading;this.wanderTimer=random(1,5);
 }
 // Put the animal somewhere specific, holding that depth and course for a while.
 station(x:number,y:number,z:number,heading:number){this.mesh.position.set(x,y,z);this.heading=this.wander=heading;this.depthGoal=y;this.wanderTimer=25;}
 // Called when terrain or a structure blocks the way: turn back toward open water.
 avoid(){
  if(this.kind==='tourist'){this.wander=this.heading+Math.PI*.6;this.wanderTimer=random(1,2);return;}this.wander=Math.atan2(-this.mesh.position.x,24-this.mesh.position.z)+random(-.5,.5);this.wanderTimer=random(2,4);}
 update(dt:number,time:number,player:THREE.Vector3,panic:number){
 this.ramCooldown=Math.max(0,this.ramCooldown-dt);
 if(!this.alive){this.respawn-=dt;if(this.respawn<=0)this.reset();return;}
 const spec=this.spec,position=this.mesh.position;
 const delta=position.clone().sub(player),distance=delta.length();
 if(this.kind==='tourist'){this.walk(dt,delta,distance);return;}
 const threatened=this.kind!=='patrol'&&distance<(spec.creature?26:32)&&(panic>10||distance<6);
 if(threatened&&!this.wasThreatened&&(this.kind==='diver'||this.kind==='swimmer'||this.kind==='surfer'||this.kind==='kayak'||this.kind==='jetski'||this.kind==='boat'||this.kind==='sailboat'))this.alarmed=true;
 this.wasThreatened=threatened;
 this.wanderTimer-=dt;
 if(this.wanderTimer<=0){
  this.wander=this.heading+random(-1.3,1.3);this.wanderTimer=random(3,8);
  const floor=groundHeight(position.x,position.z);
  this.depthGoal=this.kind==='turtle'||this.kind==='ray'?random(floor+1.5,floor+5):this.kind==='dolphin'?random(-5,-1.2):random(Math.max(-19,floor+2),-1.5);
 }
 let desired=this.wander,cruise=spec.speed*(.75+.25*Math.sin(time*.3+this.phase));
 if(this.kind==='patrol'){
  // Close in, then circle instead of stopping on top of the target.
  desired=Math.atan2(-delta.x,-delta.z)+(distance<12?1.25:0);cruise=distance<12?spec.speed*.6:spec.speed;
 }else if(threatened){
  desired=Math.atan2(delta.x,delta.z);cruise=spec.flee;
  // Divers bolt for the surface; everything else dives away from the jaws.
  this.depthGoal=this.kind==='diver'?-1.2:Math.min(position.y,player.y-4);
 }else if(this.leader?.alive){
  const leader=this.leader,goal=this.slot.clone().applyAxisAngle(new THREE.Vector3(0,1,0),leader.heading).add(leader.mesh.position);
  const gap=Math.hypot(goal.x-position.x,goal.z-position.z);
  desired=gap>1.2?Math.atan2(goal.x-position.x,goal.z-position.z):leader.heading;
  cruise=leader.speed+Math.min(3,gap*.9);this.depthGoal=goal.y;
 }
 const edge=playBounds.halfWidth-5;
 if(Math.abs(position.x)>edge||position.z>playBounds.maxZ-5||position.z<shoreZ(position.x)+(this.kind==='swimmer'?7:9))desired=this.wander=Math.atan2(-position.x,20-position.z);
 // Steer with a limited turn rate and ease the throttle, so nothing snaps to a new course.
 const maxTurn=spec.turn*(threatened?1.7:1)*dt,step=THREE.MathUtils.clamp(wrap(desired-this.heading),-maxTurn,maxTurn);
 this.heading+=step;this.turnRate=THREE.MathUtils.damp(this.turnRate,dt>0?step/dt:0,6,dt);
 this.speed=THREE.MathUtils.damp(this.speed,cruise,spec.creature?2.4:1.1,dt);
 position.x+=Math.sin(this.heading)*this.speed*dt;position.z+=Math.cos(this.heading)*this.speed*dt;
 position.x=THREE.MathUtils.clamp(position.x,-edge-1,edge+1);position.z=THREE.MathUtils.clamp(position.z,playBounds.minZ,playBounds.maxZ-4);
 this.swim+=dt*(1.2+this.speed*spec.beat);
 const stroke=Math.sin(this.swim);
 let pitch=0,roll=0;
 if(spec.floats){
  // Ride the swell: height and trim come from the same waves the water renders.
  const size=this.localBounds.getSize(new THREE.Vector3()),half=Math.max(.5,size.z*.4),beam=Math.max(.3,size.x*.4);
  const fx=Math.sin(this.heading),fz=Math.cos(this.heading),at=(along:number,across:number)=>surfaceHeight(position.x+fx*along-fz*across,position.z+fz*along+fx*across,time);
  position.y=at(0,0)+(spec.creature?-.22:-.1);
  pitch=Math.atan2(at(half,0)-at(-half,0),half*2);roll=Math.atan2(at(0,beam)-at(0,-beam),beam*2);
  if(this.kind==='buoy'){pitch=pitch*1.6+Math.sin(time*1.1+this.phase)*.05;roll=roll*1.6+Math.cos(time*.9+this.phase)*.05;}
  else if(spec.creature)roll+=stroke*.22;
  else{pitch+=Math.min(.14,this.speed/Math.max(spec.flee,1)*.12);roll+=this.turnRate*(this.kind==='sailboat'?-.25:.3)+(this.kind==='sailboat'?.1:0);}
 }else if(this.leaping){
  // A leap is a free ballistic arc until the body falls back through the surface.
  this.vertical-=9.8*dt;position.y+=this.vertical*dt;pitch=Math.atan2(this.vertical,Math.max(this.speed,1));
  if(position.y<-.6&&this.vertical<0){this.leaping=false;this.leapTimer=random(5,13);this.vertical=-2;this.splashed=true;this.depthGoal=-3;}
 }else{
  const floor=groundHeight(position.x,position.z),goal=THREE.MathUtils.clamp(this.depthGoal,floor+(this.kind==='whale'?2.6:1),this.kind==='whale'?-1.8:-.9);
  const limit=Math.max(.4,this.speed*.45);
  this.vertical=THREE.MathUtils.damp(this.vertical,THREE.MathUtils.clamp((goal-position.y)*.7,-limit,limit),3,dt);
  position.y=THREE.MathUtils.clamp(position.y+this.vertical*dt,floor+.8,-.7);
  pitch=Math.atan2(this.vertical,Math.max(this.speed,.6));roll=this.turnRate*.28;
  if(this.kind==='dolphin'){
   this.leapTimer-=dt;
   if(this.leapTimer<0&&floor<-5){this.depthGoal=-1;if(position.y>-1.4&&this.speed>3){this.leaping=true;this.vertical=5.5+this.speed*.25;this.splashed=true;}}
  }
  if(this.kind==='diver')roll+=stroke*.07;
  if(this.kind==='whale'){
   // Surface to breathe every so often; the game turns the flag into a spout.
   this.breath-=dt;
   if(this.breath<0){this.depthGoal=-1.8;if(position.y>-2.6){this.splashed=true;this.breath=random(14,26);this.depthGoal=random(Math.max(-19,floor+3),-6);this.wanderTimer=random(6,10);}}
  }
 }
 this.pitch=THREE.MathUtils.damp(this.pitch,pitch,spec.floats?5:4,dt);this.roll=THREE.MathUtils.damp(this.roll,roll,spec.floats?5:4,dt);
 this.mesh.rotation.set(this.pitch,this.heading+Math.PI,this.roll);
 // Limbs and tails follow the stroke; the body counters the tail so the head stays steadier.
 const effort=THREE.MathUtils.clamp(this.speed/Math.max(spec.speed,.1),.35,1.6);
 if(this.rig.tail){this.rig.tail.rotation.y=stroke*.38*effort-this.turnRate*.25;this.model.rotation.y=-Math.sin(this.swim-.9)*.07*effort;}
 if(this.rig.tailV){this.rig.tailV.rotation.x=stroke*.42*effort;this.model.rotation.x=-Math.sin(this.swim-.9)*.06*effort;}
 this.rig.wings.forEach((wing,i)=>{wing.rotation.z=(i?-1:1)*(Math.sin(this.swim*.5)*.55-.1);});
 this.rig.legs.forEach((leg,i)=>{leg.rotation.x=(i?-1:1)*stroke*.38;});
 if(this.kind==='kayak')this.rig.arms.forEach(arm=>{arm.rotation.z=stroke*.42;arm.rotation.y=Math.cos(this.swim)*.25;});
 else this.rig.arms.forEach((arm,i)=>{arm.rotation.x=-this.swim*.5+i*Math.PI;});
 // A jellyfish pumps its bell: squeeze, then drift.
 if(this.kind==='jellyfish'){const squeeze=Math.pow(Math.max(0,stroke),2);this.model.scale.set(1-squeeze*.18,1+squeeze*.2,1-squeeze*.18);position.y+=squeeze*dt*.5;}
 }
 // Strolling on the beach, or running from something that has come up out of the sea.
 private walk(dt:number,delta:THREE.Vector3,distance:number){
  const spec=this.spec,position=this.mesh.position,scared=distance<22;
  if(scared&&!this.wasThreatened)this.alarmed=true;
  this.wasThreatened=scared;
  this.wanderTimer-=dt;
  if(this.wanderTimer<=0){this.wander=this.heading+random(-1.6,1.6);this.wanderTimer=random(2,6);}
  let desired=scared?Math.atan2(delta.x,delta.z):this.wander;
  // Keep to the strip of sand between the waterline and the dunes.
  const inland=shoreZ(position.x)-position.z,edge=playBounds.halfWidth-8;
  if(inland<3)desired=Math.PI;else if(inland>21)desired=scared?(delta.x>0?Math.PI/2:-Math.PI/2):0;
  if(Math.abs(position.x)>edge)desired=position.x>0?-Math.PI/2:Math.PI/2;
  const maxTurn=spec.turn*(scared?2:1)*dt;
  this.heading+=THREE.MathUtils.clamp(wrap(desired-this.heading),-maxTurn,maxTurn);
  this.speed=THREE.MathUtils.damp(this.speed,scared?spec.flee:spec.speed,3,dt);
  position.x=THREE.MathUtils.clamp(position.x+Math.sin(this.heading)*this.speed*dt,-edge-2,edge+2);position.z+=Math.cos(this.heading)*this.speed*dt;
  position.y=groundHeight(position.x,position.z)+standing;
  this.swim+=dt*(1.5+this.speed*spec.beat);
  const stride=Math.sin(this.swim);
  this.mesh.rotation.set(0,this.heading+Math.PI,0);
  this.rig.legs.forEach((leg,i)=>{leg.rotation.x=(i?-1:1)*stride*.55;});
  // Arms swing at the sides on a stroll and are thrown up when running for it.
  this.rig.arms.forEach((arm,i)=>{arm.rotation.x=scared?(i?-1:1)*stride*.5:Math.PI+(i?1:-1)*stride*.45;});
 }
 get points(){return this.spec.points}
 get label(){return this.spec.label}
}
