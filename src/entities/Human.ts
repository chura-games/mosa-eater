import * as THREE from 'three';
import {random} from '../utils/random';
import {modelBounds,orientedBounds,transformedBounds} from '../system/Collision';
import {groundHeight,shoreZ,playBounds} from '../system/Coast';
import {surfaceHeight} from '../system/Water';
import type {AssetName,ModelAssets} from '../system/ModelAssets';
export type PreyKind='diver'|'shark'|'boat'|'patrol'|'fish'|'turtle'|'dolphin'|'swimmer'|'jetski'|'sailboat'|'buoy'|'tuna'|'orca'|'ray'|'seal'|'jellyfish'|'kayak'|'surfer'|'tourist'|'whale'|'sealion'
 |'krill'|'shrimp'|'minnow'|'crab'|'sardine'|'squid'|'barracuda'|'megalodon'|'giantsquid'|'ferry'|'battleship'|'submarine'|'helicopter';
// What the animals and crews react to: where the predator is and how long it has grown.
// hidden = it cannot be targeted for the moment (just hatched, or recovering).
export type Target={position:THREE.Vector3,length:number,hidden:boolean};
export type Weapon={kind:'gun'|'shell'|'torpedo',range:number,cooldown:number,minLength:number};
// asset/size/length/tint let one model serve several kinds (a tuna is a large fish, a megalodon a huge shark).
// near = respawns within this many metres of the predator instead of anywhere on the map.
// window = the range of predator lengths (m) for which the kind is present at all.
type Spec={asset?:AssetName,size?:number,length?:number,tint?:number,upright?:boolean,speed:number,flee:number,turn:number,points:number,health:number,panic:number,label:string,creature:boolean,floats?:boolean,beat:number,
 near?:number,window?:[number,number],hunter?:boolean,weapon?:Weapon,flies?:boolean,crawls?:boolean,deep?:boolean,person?:boolean};
// speed/flee in m/s, turn in rad/s, beat = swim-cycle rate per m/s of speed.
const specs:Record<PreyKind,Spec>={
 // The smallest life, present only while the predator is small enough to bother with it.
 krill:{asset:'shrimp',length:.025,tint:0xffb9a8,speed:.12,flee:.5,turn:3,points:1,health:1,panic:0,label:'オキアミを捕食',creature:true,beat:14,near:9,window:[0,.5]},
 shrimp:{length:.06,speed:.18,flee:.9,turn:3,points:2,health:1,panic:0,label:'エビを捕食',creature:true,beat:9,near:12,window:[0,1.2]},
 minnow:{asset:'fish',length:.085,tint:0xcfe0e8,speed:.5,flee:1.6,turn:4,points:3,health:1,panic:0,label:'小魚を捕食',creature:true,beat:9,near:16,window:[0,1.6]},
 // Scuttles over the seabed.
 crab:{length:.12,speed:.1,flee:.45,turn:3,points:4,health:1,panic:0,label:'カニを捕食',creature:true,crawls:true,beat:10,near:18,window:[0,3]},
 sardine:{asset:'fish',length:.22,tint:0xb9c9d6,speed:1,flee:3,turn:3.8,points:5,health:1,panic:0,label:'イワシを捕食',creature:true,beat:6,near:30,window:[.12,5]},
 squid:{length:.4,speed:.7,flee:3.2,turn:2.2,points:10,health:1,panic:0,label:'イカを捕食',creature:true,beat:4,near:40,window:[.2,8]},
 // Hunters go for a predator that is still small enough to be their prey.
 barracuda:{asset:'fish',length:1.3,tint:0x9aa7a4,speed:1.6,flee:5.2,turn:2.4,points:22,health:1,panic:0,label:'バラクーダを捕食',creature:true,beat:2.6,near:55,window:[0,6],hunter:true},
 diver:{speed:1.1,flee:2.3,turn:1.2,points:25,health:1,panic:9,label:'ダイバー捕食',creature:true,beat:3.2,person:true},
 swimmer:{speed:.9,flee:1.9,turn:1.5,points:20,health:1,panic:10,label:'遊泳者を捕食',creature:true,floats:true,beat:3.6,person:true},
 shark:{speed:3.2,flee:7,turn:1.5,points:40,health:1,panic:4,label:'サメ捕食',creature:true,beat:1.5,near:130,hunter:true},
 fish:{speed:2.4,flee:7.5,turn:3.6,points:8,health:1,panic:1,label:'魚を捕食',creature:true,beat:4.5,near:90},
 turtle:{speed:.9,flee:2.2,turn:.9,points:30,health:1,panic:3,label:'ウミガメ捕食',creature:true,beat:2.6,near:110},
 dolphin:{speed:4.5,flee:10,turn:2,points:60,health:1,panic:5,label:'イルカ捕食',creature:true,beat:1.1,near:150},
 boat:{speed:3,flee:7,turn:.7,points:70,health:2,panic:15,label:'小型船を破壊',creature:false,floats:true,beat:0},
 patrol:{speed:6.5,flee:6.5,turn:.9,points:100,health:3,panic:15,label:'迎撃艇を撃破',creature:false,floats:true,beat:0,weapon:{kind:'gun',range:45,cooldown:.5,minLength:2.2}},
 jetski:{speed:7,flee:12,turn:1.5,points:50,health:1,panic:14,label:'水上バイクを破壊',creature:false,floats:true,beat:0},
 sailboat:{speed:1.8,flee:2.6,turn:.35,points:90,health:3,panic:16,label:'ヨットを破壊',creature:false,floats:true,beat:0},
 tuna:{asset:'fish',size:2.3,tint:0x8f9fb8,speed:4.2,flee:11,turn:2.2,points:35,health:1,panic:2,label:'マグロを捕食',creature:true,beat:2,near:130},
 orca:{speed:4,flee:8.5,turn:1.2,points:120,health:2,panic:6,label:'シャチを捕食',creature:true,beat:.75,near:200,hunter:true,deep:true},
 // Too big to carry off: it takes several bites and comes up to blow.
 whale:{speed:2,flee:4.2,turn:.45,points:250,health:4,panic:8,label:'クジラを捕食',creature:true,beat:.42,near:240,deep:true},
 sealion:{asset:'seal',size:1.35,tint:0xd2a877,speed:3,flee:7.5,turn:2.6,points:55,health:1,panic:4,label:'アシカを捕食',creature:true,beat:1.8,near:120},
 ray:{speed:1.6,flee:4.5,turn:1.3,points:35,health:1,panic:2,label:'エイを捕食',creature:true,beat:1.6,near:110},
 seal:{speed:2.6,flee:6.5,turn:2.4,points:45,health:1,panic:4,label:'アザラシを捕食',creature:true,beat:2,near:120},
 jellyfish:{speed:.25,flee:.25,turn:.5,points:5,health:1,panic:0,label:'クラゲを捕食',creature:true,beat:6,near:70},
 surfer:{speed:1.3,flee:2.4,turn:1.2,points:30,health:1,panic:11,label:'サーファーを捕食',creature:true,floats:true,beat:2.6,person:true},
 kayak:{speed:2,flee:3.6,turn:1,points:45,health:1,panic:12,label:'カヤックを破壊',creature:false,floats:true,beat:1.6},
 // Walks the sand; the only prey that has to be fetched from dry land.
 tourist:{asset:'swimmer',upright:true,speed:1.1,flee:4.4,turn:2.6,points:20,health:1,panic:12,label:'観光客を捕食',creature:true,beat:2.4,person:true},
 buoy:{speed:0,flee:0,turn:0,points:15,health:1,panic:2,label:'ブイを破壊',creature:false,floats:true,beat:0},
 // Giants of the deep, a match for a predator that has outgrown the sharks.
 megalodon:{asset:'shark',length:17,tint:0x9a9fa6,speed:3.4,flee:9,turn:.8,points:320,health:3,panic:6,label:'メガロドンを捕食',creature:true,beat:.5,near:260,window:[1.5,999],hunter:true,deep:true},
 giantsquid:{asset:'squid',length:13,tint:0xb5504a,speed:2,flee:6.5,turn:1,points:260,health:2,panic:4,label:'ダイオウイカを捕食',creature:true,beat:.7,near:230,window:[1.2,999],hunter:true,deep:true},
 ferry:{speed:3.4,flee:5,turn:.18,points:400,health:4,panic:30,label:'フェリーを撃沈',creature:false,floats:true,beat:0},
 // The armed response. Each opens fire once the predator is big enough to be worth the ammunition.
 helicopter:{speed:13,flee:13,turn:1.1,points:300,health:2,panic:25,label:'ヘリコプターを撃墜',creature:false,flies:true,beat:0,weapon:{kind:'gun',range:60,cooldown:.3,minLength:5}},
 submarine:{speed:4.5,flee:4.5,turn:.3,points:700,health:4,panic:25,label:'潜水艦を撃沈',creature:false,beat:0,deep:true,weapon:{kind:'torpedo',range:150,cooldown:5,minLength:9}},
 battleship:{speed:4,flee:4,turn:.14,points:1200,health:6,panic:40,label:'戦艦を撃沈',creature:false,floats:true,beat:0,weapon:{kind:'shell',range:230,cooldown:3.2,minLength:14}},
};
// Height of a standing person's centre above the sand.
const standing=.97;
const tinted=new Map<string,THREE.Material>();
const wrap=(angle:number)=>Math.atan2(Math.sin(angle),Math.cos(angle));
export class Human{
 // Where the predator is: kinds with a spawn radius reappear around this point.
 static focus?:THREE.Vector3;
 mesh=new THREE.Group(); heading=random(0,Math.PI*2);phase=random(0,8);alive=true;respawn=0;
 readonly localBounds:THREE.Box3;health=1;ramCooldown=0;speed=0;
 // Longest dimension in metres: what decides who can eat whom.
 readonly length:number;
 // Not present at the predator's current size.
 dormant=false;
 // Set when the body breaks the surface; the game turns it into a splash.
 splashed=false;
 // Set at the moment a person first sees the danger; the game turns it into a scream.
 alarmed=false;
 // Damage dealt by a bite that has just landed on the predator; the game applies it.
 struck=0;
 // Set when a weapon has just been fired; the game launches the shot.
 fired=false;
 // Set at the moment a hunter picks the predator as its prey; the game warns the player.
 stalking=false;
 private wasHunting=false;
 private wasThreatened=false;
 // Schooling fish hold a slot beside their leader.
 leader?:Human;slot=new THREE.Vector3();
 private readonly parts:{bounds:THREE.Box3,matrix:THREE.Matrix4}[]=[];
 private readonly model:THREE.Object3D;
 private baked=false;
 private readonly rig:{tail?:THREE.Object3D,tailV?:THREE.Object3D,wings:THREE.Object3D[],arms:THREE.Object3D[],legs:THREE.Object3D[],rotor?:THREE.Object3D,tailRotor?:THREE.Object3D,screw?:THREE.Object3D};
 private wander=this.heading;private wanderTimer=0;private depthGoal=-5;
 private pitch=0;private roll=0;private turnRate=0;private swim=random(0,6);private vertical=0;private leaping=false;private leapTimer=random(4,12);private breath=random(6,18);
 private attackCooldown=0;private retreat=0;private chase=0;private rest=0;private fireCooldown=random(1,3);
 static create(kind:PreyKind,assets:ModelAssets){
  const spec=specs[kind],model=assets.instantiate(spec.asset??kind as AssetName);
  if(spec.size)model.scale.setScalar(spec.size);
  if(spec.length){const size=modelBounds(model).getSize(new THREE.Vector3());model.scale.setScalar(spec.length/Math.max(size.x,size.y,size.z));}
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
 const size=this.localBounds.getSize(new THREE.Vector3());this.length=Math.max(size.x,size.y,size.z);
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
 this.rig={tail:named(['Tail','SharkTail'])[0],tailV:named(['TailV'])[0],wings:named(['WingL','WingR']),arms:named(['ArmL','ArmR']),legs:named(['LegL','LegR']),rotor:named(['Rotor'])[0],tailRotor:named(['TailRotor'])[0],screw:named(['Screw'])[0]};
 this.mesh.rotation.order='YXZ';
 this.mesh.add(model);this.reset();
 }
 get spec(){return specs[this.kind];}
 get creature(){return this.spec.creature;}
 get ship(){return !this.spec.creature;}
 collider(){return orientedBounds(this.localBounds,this.mesh);}
 colliders(){this.mesh.updateMatrixWorld(true);return this.parts.map(part=>transformedBounds(part.bounds,new THREE.Matrix4().multiplyMatrices(this.baked?this.model.matrixWorld:this.mesh.matrixWorld,part.matrix)));}
 // Room the body needs above the seabed and below the surface.
 private get clearance(){return Math.max(.1,Math.min(this.length*.4,4));}
 private get ceiling(){return this.kind==='whale'?-1.8:-Math.max(.08,Math.min(this.length*.35,3.5));}
 reset(){
 const spec=this.spec,focus=Human.focus;
 this.alive=true;this.health=spec.health;this.mesh.visible=true;this.speed=0;this.leaping=false;this.vertical=0;this.retreat=0;this.chase=0;this.struck=0;this.fired=false;
 const margin=this.length<.6?3:14,inside=(x:number)=>THREE.MathUtils.clamp(x,-playBounds.halfWidth+12,playBounds.halfWidth-12);
 let x=random(-playBounds.halfWidth+12,playBounds.halfWidth-12),z=random(shoreZ(x)+14,playBounds.maxZ-12);
 // Swimmers stay within sight of the beach; a school regroups around its leader.
 if(this.kind==='swimmer')z=shoreZ(x)+random(12,30);
 if(this.kind==='tourist'){z=shoreZ(x)-random(4,20);this.mesh.position.set(x,groundHeight(x,z)+standing,z);this.wander=this.heading;this.wanderTimer=random(1,5);return;}
 if(spec.near&&focus){
  // Reappear in a ring around the predator: close enough to matter, far enough not to pop into view.
  const angle=random(0,Math.PI*2),reach=random(spec.near*(spec.hunter?.55:.3),spec.near);
  x=inside(focus.x+Math.sin(angle)*reach);z=focus.z+Math.cos(angle)*reach;
 }
 if(this.leader){x=inside(this.leader.mesh.position.x+this.slot.x);z=this.leader.mesh.position.z+this.slot.z;}
 // The big animals and the submarines keep to deep water.
 z=THREE.MathUtils.clamp(z,shoreZ(x)+(spec.deep?75:margin),playBounds.maxZ-12);
 const floor=groundHeight(x,z),low=floor+this.clearance,high=Math.min(this.ceiling,-.5*this.clearance);
 let y=random(Math.max(spec.deep?-55:-19,low),Math.max(low,high));
 if(spec.near&&focus&&!spec.deep)y=THREE.MathUtils.clamp(focus.y+random(-.3,.3)*spec.near,low,Math.max(low,high));
 if(this.leader)y=THREE.MathUtils.clamp(this.leader.mesh.position.y+this.slot.y,low,Math.max(low,high));
 if(spec.floats)y=0;
 if(spec.crawls)y=floor+this.length*.12;
 if(spec.flies)y=17;
 this.mesh.position.set(x,y,z);this.depthGoal=y;this.wander=this.heading;this.wanderTimer=random(1,5);
 }
 // Put the animal somewhere specific, holding that depth and course for a while.
 station(x:number,y:number,z:number,heading:number){this.mesh.position.set(x,y,z);this.heading=this.wander=heading;this.depthGoal=y;this.wanderTimer=25;}
 // Called when terrain or a structure blocks the way: turn back toward open water.
 avoid(){
  if(this.kind==='tourist'){this.wander=this.heading+Math.PI*.6;this.wanderTimer=random(1,2);return;}this.wander=Math.atan2(-this.mesh.position.x*.2,30)+random(-.5,.5);this.wanderTimer=random(2,4);}
 update(dt:number,time:number,target:Target,panic:number){
 const spec=this.spec,position=this.mesh.position,player=target.position,size=target.length;
 const delta=position.clone().sub(player),distance=delta.length();
 if(this.dormant&&!spec.window)return;
 if(spec.window){
  const present=size>=spec.window[0]&&size<=spec.window[1];
  if(this.dormant){if(!present)return;this.dormant=false;this.reset();return;}
  // Leave once out of sight, never in front of the player's eyes.
  if(!present&&(!this.alive||distance>Math.min(this.length*45+12,140))){this.dormant=true;this.alive=false;this.mesh.visible=false;return;}
 }
 this.ramCooldown=Math.max(0,this.ramCooldown-dt);this.attackCooldown-=dt;this.fireCooldown-=dt;this.rest-=dt;
 if(!this.alive){this.respawn-=dt;if(this.respawn<=0)this.reset();return;}
 if(this.kind==='tourist'){this.walk(dt,delta,distance,size);return;}
 // A school follows its leader's jump; anything else left far behind rejoins the action.
 if(spec.near&&!this.leader&&distance>Math.max(spec.near*2.4,25)){this.reset();return;}
 // Only what the predator could actually eat runs from it; people run from anything that looks dangerous.
 const edible=this.length<=size*1.3;
 const armed=!!spec.weapon&&size>=spec.weapon.minLength&&!target.hidden;
 let hunting=!!spec.hunter&&!target.hidden&&this.rest<=0&&size>this.length*.035&&size<this.length*.7&&player.y<.3&&distance<6+this.length*4;
 if(hunting){this.chase+=dt;if(this.chase>8){this.chase=0;this.rest=9;hunting=false;}}else this.chase=Math.max(0,this.chase-dt);
 if(hunting&&!this.wasHunting)this.stalking=true;
 this.wasHunting=hunting;
 const notice=THREE.MathUtils.clamp(size*2.4,1.2,spec.creature?26:32),close=THREE.MathUtils.clamp(size*.5,.3,6);
 const threatened=!armed&&!hunting&&distance<notice&&(panic>10||distance<close)&&(edible||(!!spec.person&&size>1));
 if(threatened&&!this.wasThreatened&&(spec.person||this.kind==='kayak'||this.kind==='jetski'||this.kind==='boat'||this.kind==='sailboat'||this.kind==='ferry'))this.alarmed=true;
 this.wasThreatened=threatened;
 this.wanderTimer-=dt;
 const floor=groundHeight(position.x,position.z),low=floor+this.clearance,high=Math.max(low,this.ceiling);
 if(this.wanderTimer<=0){
  this.wander=this.heading+random(-1.3,1.3);this.wanderTimer=random(3,8);
  this.depthGoal=this.kind==='turtle'||this.kind==='ray'?random(floor+1.5,floor+5):this.kind==='dolphin'?random(-5,-1.2):spec.near&&!spec.deep&&this.length<1?THREE.MathUtils.clamp(position.y+random(-.4,.4)*spec.near,low,high):random(Math.max(spec.deep?-55:-19,low),Math.min(high,spec.deep?-8:-1.5));
 }
 let desired=this.wander,cruise=spec.speed*(.75+.25*Math.sin(time*.3+this.phase));
 if(armed){
  // Close in, then circle and keep firing instead of stopping on top of the target.
  const orbit=distance<spec.weapon!.range*.3;
  desired=Math.atan2(-delta.x,-delta.z)+(orbit?1.25:0);cruise=orbit?spec.speed*.6:spec.speed;
  this.depthGoal=THREE.MathUtils.clamp(player.y,floor+5,-6);
  if(distance<spec.weapon!.range&&this.fireCooldown<=0){this.fired=true;this.fireCooldown=spec.weapon!.cooldown*random(.8,1.3);}
 }else if(hunting){
  // Rush in, bite, sheer away, and come round again.
  if(this.retreat>0){this.retreat-=dt;desired=Math.atan2(delta.x,delta.z)+.6;}else desired=Math.atan2(-delta.x,-delta.z);
  cruise=spec.flee*.7;this.depthGoal=player.y;
  if(distance<this.length*.45+size*.5+.15&&this.attackCooldown<=0){this.struck=9+17*(1-size/(this.length*.7));this.attackCooldown=2.6;this.retreat=1.4;}
 }else if(threatened){
  desired=Math.atan2(delta.x,delta.z);cruise=spec.flee;
  // Divers bolt for the surface; everything else dives away from the jaws.
  this.depthGoal=this.kind==='diver'?-1.2:Math.min(position.y,player.y-Math.min(4,size));
 }else if(this.leader?.alive){
  const leader=this.leader,goal=this.slot.clone().applyAxisAngle(new THREE.Vector3(0,1,0),leader.heading).add(leader.mesh.position);
  const gap=Math.hypot(goal.x-position.x,goal.z-position.z);
  if(spec.near&&gap>spec.near){this.reset();return;}
  desired=gap>this.length*1.2?Math.atan2(goal.x-position.x,goal.z-position.z):leader.heading;
  cruise=leader.speed+Math.min(spec.flee*.5,gap*.9);this.depthGoal=goal.y;
 }
 const edge=playBounds.halfWidth-5,shallow=this.length<.6?2.5:this.kind==='swimmer'?7:spec.deep?60:9;
 if(Math.abs(position.x)>edge||position.z>playBounds.maxZ-5||position.z<shoreZ(position.x)+shallow)desired=this.wander=Math.atan2(-position.x,playBounds.maxZ*.4-position.z);
 // Steer with a limited turn rate and ease the throttle, so nothing snaps to a new course.
 const maxTurn=spec.turn*(threatened||hunting?1.7:1)*dt,step=THREE.MathUtils.clamp(wrap(desired-this.heading),-maxTurn,maxTurn);
 this.heading+=step;this.turnRate=THREE.MathUtils.damp(this.turnRate,dt>0?step/dt:0,6,dt);
 this.speed=THREE.MathUtils.damp(this.speed,cruise,spec.creature?2.4:1.1,dt);
 position.x+=Math.sin(this.heading)*this.speed*dt;position.z+=Math.cos(this.heading)*this.speed*dt;
 position.x=THREE.MathUtils.clamp(position.x,-edge-1,edge+1);position.z=THREE.MathUtils.clamp(position.z,playBounds.minZ,playBounds.maxZ-4);
 this.swim+=dt*(1.2+this.speed*spec.beat);
 const stroke=Math.sin(this.swim);
 let pitch=0,roll=0;
 if(spec.flies){
  // Hold a patrol height, dropping low over the target to shoot.
  const height=(armed&&distance<spec.weapon!.range*1.6?10:17)+Math.sin(time*.7+this.phase)*.8;
  position.y=THREE.MathUtils.damp(position.y,height,1.2,dt);
  pitch=-.04-this.speed*.012;roll=this.turnRate*.45;
 }else if(spec.crawls){
  position.y=floor+this.length*.12;
 }else if(spec.floats){
  // Ride the swell: height and trim come from the same waves the water renders.
  const bounds=this.localBounds.getSize(new THREE.Vector3()),half=Math.max(.5,bounds.z*.4),beam=Math.max(.3,bounds.x*.4);
  const fx=Math.sin(this.heading),fz=Math.cos(this.heading),at=(along:number,across:number)=>surfaceHeight(position.x+fx*along-fz*across,position.z+fz*along+fx*across,time);
  // A long hull bridges the waves instead of following each one.
  const steady=this.length>20?.35:1;
  position.y=at(0,0)*steady+(spec.creature?-.22:-.1);
  pitch=Math.atan2(at(half,0)-at(-half,0),half*2)*steady;roll=Math.atan2(at(0,beam)-at(0,-beam),beam*2)*steady;
  if(this.kind==='buoy'){pitch=pitch*1.6+Math.sin(time*1.1+this.phase)*.05;roll=roll*1.6+Math.cos(time*.9+this.phase)*.05;}
  else if(spec.creature)roll+=stroke*.22;
  else{pitch+=Math.min(.14,this.speed/Math.max(spec.flee,1)*.12)*steady;roll+=(this.turnRate*(this.kind==='sailboat'?-.25:.3)+(this.kind==='sailboat'?.1:0))*steady;}
 }else if(this.leaping){
  // A leap is a free ballistic arc until the body falls back through the surface.
  this.vertical-=9.8*dt;position.y+=this.vertical*dt;pitch=Math.atan2(this.vertical,Math.max(this.speed,1));
  if(position.y<-.6&&this.vertical<0){this.leaping=false;this.leapTimer=random(5,13);this.vertical=-2;this.splashed=true;this.depthGoal=-3;}
 }else{
  const goal=THREE.MathUtils.clamp(this.depthGoal,low,high);
  const limit=Math.max(Math.min(.4,this.length*2),this.speed*.45);
  this.vertical=THREE.MathUtils.damp(this.vertical,THREE.MathUtils.clamp((goal-position.y)*.7,-limit,limit),3,dt);
  position.y=THREE.MathUtils.clamp(position.y+this.vertical*dt,Math.min(low,high),high);
  pitch=Math.atan2(this.vertical,Math.max(this.speed,Math.min(.6,this.length*3)));roll=this.turnRate*.28;
  if(this.kind==='dolphin'){
   this.leapTimer-=dt;
   if(this.leapTimer<0&&floor<-5){this.depthGoal=-1;if(position.y>-1.4&&this.speed>3){this.leaping=true;this.vertical=5.5+this.speed*.25;this.splashed=true;}}
  }
  if(this.kind==='diver')roll+=stroke*.07;
  if(this.kind==='whale'){
   // Surface to breathe every so often; the game turns the flag into a spout.
   this.breath-=dt;
   if(this.breath<0){this.depthGoal=-1.8;if(position.y>-2.6){this.splashed=true;this.breath=random(14,26);this.depthGoal=random(Math.max(-30,floor+3),-6);this.wanderTimer=random(6,10);}}
  }
 }
 this.pitch=THREE.MathUtils.damp(this.pitch,pitch,spec.floats?5:4,dt);this.roll=THREE.MathUtils.damp(this.roll,roll,spec.floats?5:4,dt);
 this.mesh.rotation.set(this.pitch,this.heading+Math.PI,this.roll);
 // Limbs and tails follow the stroke; the body counters the tail so the head stays steadier.
 const effort=THREE.MathUtils.clamp(this.speed/Math.max(spec.speed,.1),.35,1.6);
 if(this.rig.tail){this.rig.tail.rotation.y=stroke*.38*effort-this.turnRate*.25;this.model.rotation.y=-Math.sin(this.swim-.9)*.07*effort;}
 if(this.rig.tailV){this.rig.tailV.rotation.x=stroke*.42*effort;if(!spec.upright)this.model.rotation.x=-Math.sin(this.swim-.9)*.06*effort;}
 this.rig.wings.forEach((wing,i)=>{wing.rotation.z=(i?-1:1)*(Math.sin(this.swim*.5)*.55-.1);});
 this.rig.legs.forEach((leg,i)=>{leg.rotation.x=(i?-1:1)*stroke*.38;});
 if(this.kind==='kayak')this.rig.arms.forEach(arm=>{arm.rotation.z=stroke*.42;arm.rotation.y=Math.cos(this.swim)*.25;});
 else this.rig.arms.forEach((arm,i)=>{arm.rotation.x=-this.swim*.5+i*Math.PI;});
 if(this.rig.rotor)this.rig.rotor.rotation.y+=dt*34;
 if(this.rig.tailRotor)this.rig.tailRotor.rotation.x+=dt*60;
 if(this.rig.screw)this.rig.screw.rotation.z+=dt*(2+this.speed*2.5);
 // A jellyfish pumps its bell: squeeze, then drift.
 if(this.kind==='jellyfish'){const squeeze=Math.pow(Math.max(0,stroke),2);this.model.scale.set(1-squeeze*.18,1+squeeze*.2,1-squeeze*.18);position.y+=squeeze*dt*.5;}
 }
 // Strolling on the beach, or running from something that has come up out of the sea.
 private walk(dt:number,delta:THREE.Vector3,distance:number,size:number){
  const spec=this.spec,position=this.mesh.position,scared=distance<22&&size>1;
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
 // The plain name of the kind, taken from its kill message.
 get name(){return this.spec.label.replace(/を?(捕食|破壊|撃破|撃沈|撃墜)$/,'');}
}
