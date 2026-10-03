import * as THREE from 'three';
import './style.css';
import {Mosasaurus} from './entities/Mosasaurus';
import {Human, type PreyKind} from './entities/Human';
import {Gull} from './entities/Gull';
import {createOcean} from './system/Ocean';
import {ModelAssets} from './system/ModelAssets';
import {resolveBox} from './system/Collision';
import {SmoothCamera} from './system/SmoothCamera';
import {MarineLight} from './system/MarineLight';
import {createAtmosphere} from './system/Atmosphere';
import {Effects} from './system/Effects';
import {Sound} from './system/Sound';
import {groundHeight} from './system/Coast';
const $=(id:string)=>document.getElementById(id)!;
// The studio logo plays once in the middle of a black screen while the models load.
function createLoadingScreen(){
 const root=$('loading'),video=$('loadingVideo') as HTMLVideoElement;
 let ready=false,played=false,closing=false;
 const close=()=>{
  if(closing||!ready||!played)return;
  closing=true;root.classList.add('done');setTimeout(()=>{root.hidden=true;video.pause();},650);
 };
 const finishVideo=()=>{played=true;close();};
 video.addEventListener('ended',finishVideo);video.addEventListener('error',finishVideo);
 void video.play().catch(finishVideo);
 // Once everything is loaded, any key or click skips the rest of the logo.
 const skip=()=>{if(ready)finishVideo();};
 root.addEventListener('pointerdown',skip);addEventListener('keydown',skip);
 return {
  progress(loaded:number,total:number){const percent=Math.round(loaded/total*100);$('loadingBar').style.width=percent+'%';$('loadingText').textContent='LOADING '+percent+'%';},
  finish(){ready=true;if(!played)$('loadingText').textContent='READY — クリックでスキップ';close();},
  get open(){return !root.hidden;},
 };
}
type Settings={volume:number,sound:boolean,quality:'low'|'medium'|'high',shadows:boolean,gore:'mild'|'normal'|'extreme'};
function loadSettings():Settings{
 const defaults:Settings={volume:.7,sound:true,quality:'high',shadows:true,gore:'extreme'};
 try{return {...defaults,...JSON.parse(localStorage.getItem('abyssal-settings')??'{}')};}catch{return defaults;}
}
async function initialize(){
const loading=createLoadingScreen();
const settings=loadSettings(),sound=new Sound();
const scene=new THREE.Scene();scene.background=new THREE.Color(0x9dc8d1);scene.fog=new THREE.FogExp2(0x9dc8d1,.0022);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,2000);
let renderer:THREE.WebGLRenderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{$('start').textContent='WebGLを利用できません';loading.finish();throw new Error('WebGL unavailable');}
renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('world').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xd0edff,0x5b6651,.65));const sun=new THREE.DirectionalLight(0xffefce,3.3);sun.position.set(-70,105,-49);
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-105,right:105,top:105,bottom:-105,near:1,far:280});sun.shadow.normalBias=.08;sun.shadow.bias=-.00015;scene.add(sun);
async function loadAssets(){
 const start=$('start') as HTMLButtonElement;
 start.disabled=true;start.textContent='海を準備中…';
 try{
 const assets=await ModelAssets.load((loaded,total)=>loading.progress(loaded,total));
 const player=Mosasaurus.fromModel(assets.instantiate('mosasaurus'));
 const ocean=createOcean(scene,assets);
 start.disabled=false;start.innerHTML='狩りを始める <span>→</span>';
 return {assets,player,ocean};
 }catch(error){
 start.textContent='モデル読み込み失敗：ページを再読み込み';
 console.error('Failed to load game assets',error);
 throw error;
 }finally{loading.finish();}
}
const {assets,player,ocean}=await loadAssets();scene.add(player.mesh);
const atmosphere=createAtmosphere(scene,renderer,assets);
const effects=new Effects(scene,ocean.surfaceHeight,groundHeight);
const prey:Human[]=[];
function spawn(kind:PreyKind){const p=Human.create(kind,assets);prey.push(p);scene.add(p.mesh);return p;}
const population:[PreyKind,number][]=[['diver',8],['shark',5],['turtle',3],['dolphin',3],['swimmer',5],['tourist',8],['surfer',3],['seal',3],['ray',3],['tuna',3],['orca',1],['jellyfish',6],['boat',3],['jetski',2],['kayak',2],['sailboat',2],['buoy',3]];
for(const [kind,count] of population)for(let i=0;i<count;i++)spawn(kind);
// Three schools: each fish keeps a slot beside the first of its group.
for(let school=0;school<3;school++){
 const leader=spawn('fish');
 for(let i=0;i<6;i++){const fish=spawn('fish');fish.leader=leader;fish.slot.set((i%3-1)*1.3+Math.random()*.5,(i%2)*.8-.4,1+Math.floor(i/3)*1.4+Math.random()*.5);fish.reset();}
}
const gulls=Array.from({length:7},()=>{const gull=new Gull(assets.instantiate('gull'));scene.add(gull.mesh);return gull;});
// A nearby first hunt makes the controls easy to learn.
prey[0].station(0,-2,3,0);prey[1].station(7,-3,-8,0);
const keys=new Set<string>();let running=false,paused=false,bio=0,panic=0,eaten=0,patrolSpawned=false,cooldown=0,rippleTimer=0,toastTimer=0,shake=0,time=0,flash=0,grownTo=0,wasAbove=false;
// A body carried in the jaws: shaken, bled, then torn apart and swallowed.
let held:{prey:Human,timer:number,next:number,size:number}|undefined;
function toast(message:string){$('toast').textContent=message;toastTimer=2.5;}
let biteHit=false;
function eat(){
 if(!running||paused||cooldown>0)return;
 cooldown=.55;player.bite=.45;player.lunge=1;biteHit=false;sound.snap();
}
function waterline(position:THREE.Vector3){return new THREE.Vector3(position.x,ocean.surfaceHeight(position.x,position.z,time),position.z);}
const people:PreyKind[]=['diver','swimmer','surfer','tourist'];
function damage(p:Human,amount:number,impact:THREE.Vector3){
 p.health-=amount;shake=.25;
 const length=p.localBounds.getSize(new THREE.Vector3()).length(),size=THREE.MathUtils.clamp(length/2.6,.4,2.2);
 if(p.health>0){
  if(p.creature){
   // A wounded animal bleeds and bolts.
   effects.blood(impact,size*.5);effects.gibs(impact,size*.4);sound.crunch(size*.6);flash=.5;player.gore=1;
   toast('深手を負わせた — あと'+p.health+'回');return;
  }
  // A wounded hull sheds a few pieces where it was struck.
  effects.shatter(p.mesh,impact,5);effects.splash(waterline(impact),.6);sound.thud();sound.splash(.6);
  toast('船体に命中 — あと'+p.health+'回');return;
 }
 p.alive=false;p.respawn=18;bio+=p.points;eaten++;panic=Math.min(100,panic+p.spec.panic);
 toast(p.label+' +'+p.points+' BP');
 if(p.creature){
  sound.crunch(size);if(people.includes(p.kind))sound.scream();
  const ashore=impact.y>.4;
  effects.blood(impact,size*.7,ashore);flash=1;player.gore=1;
  if(!ashore&&p.mesh.position.y>-1.6){effects.splash(waterline(p.mesh.position),.6,0xc64a4a);ocean.ripple(p.mesh.position.x,p.mesh.position.z,.8);}
  if(length<1.7){
   // Small prey goes down whole in a puff of blood.
   p.mesh.visible=false;effects.gibs(impact,.35);effects.slick(impact,.4,ashore?groundHeight(impact.x,impact.z)+.06:undefined);player.chew=.5;sound.gulp();
  }else{
   const span=.55+Math.min(.65,length*.1);
   held={prey:p,timer:span,next:0,size};player.feeding=span;cooldown=span+.3;
  }
 }else{
  p.mesh.visible=false;
  effects.shatter(p.mesh,impact);effects.splash(waterline(p.mesh.position),THREE.MathUtils.clamp(length/5,.7,2));ocean.ripple(p.mesh.position.x,p.mesh.position.z,1.4);
  if(p.kind!=='buoy'&&p.kind!=='sailboat'&&p.kind!=='kayak')effects.smoke(waterline(p.mesh.position).add(new THREE.Vector3(0,.8,0)),THREE.MathUtils.clamp(length/7,.5,1.3));
  sound.smash(size,p.kind==='patrol'||p.kind==='boat'||p.kind==='buoy');sound.splash(1.2);
  // Whoever was aboard does not get away either.
  if(p.kind==='jetski'||p.kind==='kayak'){effects.blood(p.mesh.position,.9);effects.gibs(p.mesh.position,.8);effects.slick(p.mesh.position,.8);sound.scream();flash=.8;}
 }
}
const crosswise=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,Math.PI/2,.3));
function carry(dt:number){
 if(!held)return;
 const mouth=player.mouth(),side=new THREE.Vector3(1,0,0).applyQuaternion(player.mesh.quaternion);
 held.timer-=dt;held.next-=dt;
 // The body lies across the jaws and whips with every shake of the head.
 held.prey.mesh.position.copy(mouth).addScaledVector(side,Math.sin(time*31)*.4*player.scale);
 held.prey.mesh.quaternion.copy(player.mesh.quaternion).multiply(crosswise);held.prey.mesh.rotateZ(Math.sin(time*31)*.5);
 if(held.next<=0){
  held.next=.13;shake=.3;flash=Math.max(flash,.45);
  effects.spurt(mouth,side.multiplyScalar(Math.sin(time*31)>0?1:-1),held.size);sound.tear();
 }
 if(held.timer<=0){
  const ashore=mouth.y>.4;
  effects.shatter(held.prey.mesh,mouth,16,true);effects.gibs(mouth,held.size);effects.blood(mouth,held.size,ashore);effects.slick(mouth,held.size,ashore?groundHeight(mouth.x,mouth.z)+.06:undefined);
  held.prey.mesh.visible=false;sound.gulp();player.chew=.8;held=undefined;
 }
}
function biteTarget(){
 const mouth=player.mouth(),box=player.biteBox();
 return prey.filter(p=>p.alive&&p.mesh.position.distanceToSquared(mouth)<Math.pow(p.localBounds.getSize(new THREE.Vector3()).length()/2+3*player.scale,2)&&box.intersectsOBB(p.collider())&&p.colliders().some(part=>box.intersectsOBB(part))&&!ocean.collisions.blocked(mouth,p.mesh.position))
  .sort((a,b)=>a.mesh.position.distanceToSquared(mouth)-b.mesh.position.distanceToSquared(mouth))[0];
}
function placePrey(p:Human){
 const spheres=[new THREE.Sphere(new THREE.Vector3(),p.ship?2:1)];
 for(let attempt=0;attempt<40;attempt++){
  if(!ocean.collisions.resolve(p.mesh,spheres))return;
  p.reset();
 }
 p.mesh.position.set(0,p.ship?0:-8,65);
}
for(const p of prey)placePrey(p);
const marineLight=new MarineLight();marineLight.apply(scene);
// Sound, picture and gore options live in the pause menu and persist between visits.
function applySettings(){
 sound.setVolume(settings.volume);sound.setEnabled(settings.sound);
 $('sound').textContent=settings.sound?'SOUND ON':'SOUND OFF';
 ($('volume') as HTMLInputElement).value=String(Math.round(settings.volume*100));$('volumeValue').textContent=Math.round(settings.volume*100)+'%';
 ($('quality') as HTMLSelectElement).value=settings.quality;($('shadows') as HTMLSelectElement).value=settings.shadows?'on':'off';($('gore') as HTMLSelectElement).value=settings.gore;
 renderer.setPixelRatio(settings.quality==='high'?Math.min(devicePixelRatio,1.75):settings.quality==='medium'?Math.min(devicePixelRatio,1):Math.min(devicePixelRatio,1)*.7);
 renderer.setSize(innerWidth,innerHeight);
 const shadows=settings.shadows&&settings.quality!=='low';
 if(renderer.shadowMap.enabled!==shadows||sun.castShadow!==shadows){
  renderer.shadowMap.enabled=shadows;sun.castShadow=shadows;
  // Materials are compiled with or without shadow sampling, so rebuild them.
  scene.traverse(node=>{if(node instanceof THREE.Mesh)for(const material of Array.isArray(node.material)?node.material:[node.material])material.needsUpdate=true;});
 }
 effects.gore=settings.gore==='extreme'?1.8:settings.gore==='normal'?1:.4;
 try{localStorage.setItem('abyssal-settings',JSON.stringify(settings));}catch{/* private browsing: settings last for this visit only */}
}
applySettings();
$('volume').oninput=()=>{settings.volume=Number(($('volume') as HTMLInputElement).value)/100;if(settings.volume>0)settings.sound=true;applySettings();};
$('volume').onchange=()=>sound.click();
$('quality').onchange=()=>{settings.quality=($('quality') as HTMLSelectElement).value as Settings['quality'];applySettings();};
$('shadows').onchange=()=>{settings.shadows=($('shadows') as HTMLSelectElement).value==='on';applySettings();};
$('gore').onchange=()=>{settings.gore=($('gore') as HTMLSelectElement).value as Settings['gore'];applySettings();};
$('sound').onclick=()=>{settings.sound=!settings.sound;sound.start();applySettings();sound.click();};
const view={yaw:0,pitch:-.08};const followCamera=new SmoothCamera();
const skyColor=new THREE.Color(0x9dc8d1),underwaterColor=new THREE.Color(0x115061);
function lockMouse(){const request=renderer.domElement.requestPointerLock();if(request)void request.catch(()=>toast('海の画面をクリックしてマウス操作を開始'));}
function setPaused(value:boolean){paused=value;keys.clear();$('paused').hidden=!paused;sound.suspend(paused);}
function togglePause(){if(!running)return;setPaused(!paused);if(paused)document.exitPointerLock();else lockMouse();}
function begin(){if(running||loading.open||($('start') as HTMLButtonElement).disabled)return;running=true;$('overlay').style.display='none';sound.start();lockMouse();toast('マウスで向き、WASDで泳ぐ。上を向いて加速すると跳べる。');}
$('start').onclick=begin;
$('resume').onclick=togglePause;
renderer.domElement.addEventListener('pointerdown',()=>{if(running&&!paused&&document.pointerLockElement!==renderer.domElement)lockMouse();else eat();});
document.addEventListener('mousemove',event=>{
 if(!running||paused||document.pointerLockElement!==renderer.domElement)return;
 view.yaw-=event.movementX*.0024;view.pitch=THREE.MathUtils.clamp(view.pitch-event.movementY*.0024,-1.25,1.25);
});
document.addEventListener('pointerlockchange',()=>{if(running&&!paused&&document.pointerLockElement!==renderer.domElement)setPaused(true);});
addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();if(e.code==='Escape'&&!e.repeat){togglePause();return;}if(!running&&e.code==='KeyW')begin();if(!running||paused)return;keys.add(e.code);if(e.repeat)return;if(e.code==='Space')eat();});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();if(running&&!paused)togglePause();});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
// The body grows by itself with everything eaten: one size step per 100 BP, up to eight.
const maxLevel=8,stepPoints=100;
function hud(){
 $('bio').textContent=String(bio);$('length').textContent=(12*player.scale).toFixed(1);
 $('boostValue').textContent=Math.round(player.energy)+'%';$('boostBar').style.width=player.energy+'%';$('panicValue').textContent=Math.round(panic)+'%';$('panicBar').style.width=panic+'%';
 const stage=Math.min(maxLevel,Math.floor(bio/stepPoints));
 $('growthValue').textContent='Lv '+(stage+1);$('growthBar').style.width=(stage>=maxLevel?100:bio%stepPoints/stepPoints*100)+'%';
 $('growthText').textContent=stage>=maxLevel?'最大の体格に到達した。':'次の成長まで '+(stepPoints-bio%stepPoints)+' BP';
 $('count').textContent=Math.min(eaten,10)+' / 10';$('missionBar').style.width=Math.min(eaten*10,100)+'%';
 if(eaten>=10)$('missionText').textContent='海岸の覇者になった。狩りは続く。';
 $('status').textContent=panic>=50?'迎撃艇が接近中。船ごと噛み砕け。':panic>20?'観光客が逃走中。浜まで追い詰めろ。':'海岸は穏やかだ。狩りを始めよう。';
 $('depth').textContent='DEPTH '+Math.max(0,-player.mesh.position.y).toFixed(0)+'m';
}
let previous=performance.now(),hudTimer=0;
function loop(now:number){
 requestAnimationFrame(loop);const dt=Math.min((now-previous)/1000,.05);previous=now;
 if(!paused){
 time+=dt;marineLight.update(time);
 for(const gull of gulls)gull.update(dt,time);
 if(running){
  let boost=false;
  for(const p of prey){
   const wasAlive=p.alive;
   p.update(dt,time,player.mesh.position,panic);
   if(!p.alive)continue;
   if(!wasAlive)placePrey(p);
   // Terrain pushes the body clear; it then steers back to open water instead of bouncing.
   const proxy=[new THREE.Sphere(new THREE.Vector3(),p.ship?1.6:.55)];
   if(p.kind!=='buoy'&&ocean.collisions.resolve(p.mesh,proxy))p.avoid();
   if(p.splashed){p.splashed=false;effects.splash(waterline(p.mesh.position),.7);ocean.ripple(p.mesh.position.x,p.mesh.position.z,.7);if(p.mesh.position.distanceTo(player.mesh.position)<45)sound.splash(.5);}
  }

 // Small simulation steps keep fast boosts and turning from crossing thin obstacles.
 const steps=Math.ceil(dt/(1/120)),stepDt=dt/steps,before=new THREE.Vector3();
 for(let step=0;step<steps;step++){
  const stepTime=time-dt+(step+1)*stepDt;
  boost=player.update(stepDt,stepTime,keys,followCamera.view);
  // Report the push-out direction so the body glides along sand and rock instead of sticking.
  before.copy(player.mesh.position);
  if(ocean.collisions.resolve(player.mesh,player.bodySpheres)){const push=player.mesh.position.clone().sub(before);if(push.lengthSq()>1e-10)player.touch(push.normalize());}
  cooldown=Math.max(0,cooldown-stepDt);
  if(cooldown<=0&&player.bite<=0&&!held&&biteTarget())eat();
  if(player.biteActive&&!biteHit){
   const target=biteTarget();
   if(target){biteHit=true;damage(target,1,player.mouth());}
  }
  for(const p of prey){
   if(!p.alive||!p.ship)continue;
   if(p.mesh.position.distanceToSquared(player.mesh.position)>Math.pow(8+6*player.scale,2))continue;
   const hulls=p.colliders();
   player.mesh.updateMatrixWorld(true);
   const touching=player.bodySpheres.some(local=>hulls.some(hull=>hull.intersectsSphere(local.clone().applyMatrix4(player.mesh.matrixWorld))));
   if(!touching)continue;
   const toward=p.mesh.position.clone().sub(player.mesh.position).normalize();
   const forward=new THREE.Vector3(0,0,-1).transformDirection(player.mesh.matrixWorld);
   if(boost&&player.speed>15&&forward.dot(toward)>.35&&p.ramCooldown<=0){
    p.ramCooldown=.9;damage(p,2,player.mouth());
   }
   if(p.alive){let contact=false;for(const hull of hulls)contact=resolveBox(player.mesh,player.bodySpheres,hull)||contact;if(contact)player.speed*=Math.exp(-stepDt*2);}
  }
 }
 carry(dt);
 // Breaking the surface throws spray, going up and coming down.
 const above=player.mesh.position.y>-.25,spot=player.mesh.position;
 if(above!==wasAbove&&!player.grounded){
  // A breach and the crash back in both throw spray and send rings across the water.
  if(player.speed>6){effects.splash(waterline(spot),1.4*player.scale);sound.splash(1.3);}
  ocean.ripple(spot.x,spot.z,Math.min(2,.6+player.speed*.08)*player.scale);
 }
 wasAbove=above;
 // Cruising with the back awash keeps the surface stirring.
 rippleTimer-=dt;
 if(rippleTimer<=0&&spot.y>-1.6&&!player.grounded&&groundHeight(spot.x,spot.z)<-.5){rippleTimer=.7;ocean.ripple(spot.x,spot.z,.35+Math.min(.6,player.speed*.04));}
 // Grow smoothly toward the size earned so far.
 const earned=Math.min(maxLevel,Math.floor(bio/stepPoints));
 if(earned>grownTo){grownTo=earned;toast('成長：体長 '+(12*(1+earned*.16)).toFixed(1)+' m');sound.roar();shake=.35;}
 player.level=THREE.MathUtils.damp(player.level,earned,1.1,dt);
 camera.fov=THREE.MathUtils.damp(camera.fov,boost?72:62,3,dt);camera.updateProjectionMatrix();
 $('crosshair').style.color=biteTarget()?'#c3f865':'#d1f8cb66';
 panic=Math.max(0,panic-dt*.45);toastTimer-=dt;if(toastTimer<=0)$('toast').textContent='';

 if(panic>=50&&!patrolSpawned){patrolSpawned=true;for(let i=0;i<4;i++){const p=spawn('patrol');p.mesh.position.set(-40+i*22,0,65);placePrey(p);marineLight.apply(p.mesh);}toast('警戒レベル上昇 — 迎撃艇出動');sound.alarm();}
 for(const p of prey){if(p.kind==='patrol'&&p.alive&&p.mesh.position.distanceTo(player.mesh.position)<8){player.energy=Math.max(0,player.energy-dt*12);}}
 }
 else{player.tail.rotation.y=0;}
 // Follow after everything has moved, so the camera never trails by a frame.
 followCamera.update(camera,dt,running?view:{yaw:-.5,pitch:0},player.mesh.position,player.scale,shake,groundHeight);
 shake=Math.max(0,shake-dt);flash=Math.max(0,flash-dt*1.1);$('bloodFlash').style.opacity=String(Math.min(1,flash)*(settings.gore==='mild'?.3:.75));
 effects.update(dt,time);
 const cameraWaterline=ocean.surfaceHeight(camera.position.x,camera.position.z,time);
 const submerged=THREE.MathUtils.smoothstep(cameraWaterline-camera.position.y,-.5,.5);
 scene.fog!.color.copy(skyColor).lerp(underwaterColor,submerged);
 (scene.fog as THREE.FogExp2).density=THREE.MathUtils.lerp(.0022,.019,submerged);
 (scene.background as THREE.Color).copy(skyColor).lerp(underwaterColor,submerged);
 atmosphere.update(camera,submerged);
 ocean.update(time,camera,player,prey);
 sound.update(submerged,running?player.speed:0,panic);
 hudTimer+=dt;if(hudTimer>=.08){hud();hudTimer=0;}
 }
 renderer.render(scene,camera);
}
camera.position.set(14,9,39);camera.lookAt(player.mesh.position);requestAnimationFrame(loop);
}
void initialize().catch(()=>{});
