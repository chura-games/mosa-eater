import * as THREE from 'three';
import './style.css';
import {Mosasaurus} from './entities/Mosasaurus';
import {Human, type PreyKind, type Target} from './entities/Human';
import {Gull} from './entities/Gull';
import {createOcean} from './system/Ocean';
import {ModelAssets} from './system/ModelAssets';
import {resolveBox} from './system/Collision';
import {SmoothCamera} from './system/SmoothCamera';
import {MarineLight} from './system/MarineLight';
import {createAtmosphere} from './system/Atmosphere';
import {Effects} from './system/Effects';
import {Sound} from './system/Sound';
import {random} from './utils/random';
import {groundHeight,playBounds} from './system/Coast';
import {Weapons} from './system/Weapons';
import {News} from './system/News';
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
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,2600);
let renderer:THREE.WebGLRenderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{$('start').textContent='WebGLを利用できません';loading.finish();throw new Error('WebGL unavailable');}
renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('world').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xd0edff,0x5b6651,.65));const sun=new THREE.DirectionalLight(0xffefce,3.3);sun.position.set(-70,105,-49);
// The shadow box follows the player, so it stays sharp however large the map is.
const sunOffset=new THREE.Vector3(-70,105,-49);
Object.assign(sun.shadow.camera,{left:-85,right:85,top:85,bottom:-85,near:1,far:280});sun.shadow.normalBias=.08;sun.shadow.bias=-.00015;scene.add(sun,sun.target);
renderer.shadowMap.autoUpdate=false;
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
// The predator hatches at 10 cm and grows with everything it eats.
// (Adding ?size=12 to the address starts at that length in metres, for trying out later stages.)
const maxLength=60,startLength=THREE.MathUtils.clamp(Number(new URLSearchParams(location.search).get('size'))||.1,.1,maxLength);
player.length=startLength;player.mesh.scale.setScalar(player.scale);
const metres=(length:number)=>length<1?Math.round(length*100)+' cm':length.toFixed(1)+' m';
const atmosphere=createAtmosphere(scene,renderer,assets);
const effects=new Effects(scene,ocean.surfaceHeight,groundHeight);
const weapons=new Weapons(scene,effects,sound,ocean.surfaceHeight);
const news=new News($('news'));
const prey:Human[]=[];
// Animals reappear around the predator, so the sea near it is never empty however big the map.
Human.focus=player.mesh.position;
function shelve(p:Human){p.dormant=true;p.alive=false;p.mesh.visible=false;}
function spawn(kind:PreyKind){
 const p=Human.create(kind,assets);prey.push(p);scene.add(p.mesh);
 // Kinds meant for another size of predator wait out of sight until it grows into their range.
 const window=p.spec.window;if(window&&(startLength<window[0]||startLength>window[1]))shelve(p);
 return p;
}
const population:[PreyKind,number][]=[['krill',36],['shrimp',22],['crab',12],['squid',10],['barracuda',7],['jellyfish',10],['diver',12],['shark',8],['turtle',6],['dolphin',6],['swimmer',14],['tourist',22],['surfer',8],['seal',4],['sealion',5],['ray',6],['tuna',6],['orca',3],['whale',3],['megalodon',2],['giantsquid',2],['boat',7],['jetski',5],['kayak',5],['sailboat',5],['buoy',8],['ferry',2]];
for(const [kind,count] of population)for(let i=0;i<count;i++)spawn(kind);
// Schools: each fish keeps a slot beside the first of its group.
for(const kind of ['minnow','sardine','fish'] as const)for(let school=0;school<4;school++){
 const leader=spawn(kind),spacing=leader.length*1.3;
 for(let i=0;i<6;i++){const fish=spawn(kind);fish.leader=leader;fish.slot.set(((i%3-1)+Math.random()*.4)*spacing,((i%2)*.8-.4)*spacing*.8,(1+Math.floor(i/3)*1.1+Math.random()*.4)*spacing);if(!fish.dormant)fish.reset();}
}
// The armed response waits in reserve and is sent out as the predator grows.
const reserve:Human[]=[];
for(const [kind,count] of [['patrol',4],['helicopter',3],['submarine',2],['battleship',2]] as [PreyKind,number][])for(let i=0;i<count;i++){const p=spawn(kind);shelve(p);reserve.push(p);}
function deploy(kind:PreyKind,count:number){
 let sent=0;
 for(const p of reserve){
  if(p.kind!==kind||!p.dormant||sent>=count)continue;
  p.dormant=false;p.reset();sent++;
  const x=THREE.MathUtils.clamp(player.mesh.position.x+(Math.random()-.5)*160,-playBounds.halfWidth+30,playBounds.halfWidth-30),z=Math.min(playBounds.maxZ-30,Math.max(player.mesh.position.z,40)+90+Math.random()*60);
  p.mesh.position.set(x,kind==='helicopter'?17:kind==='submarine'?Math.max(-14,groundHeight(x,z)+6):0,z);
 }
 return sent>0;
}
const gulls=Array.from({length:12},()=>{const gull=new Gull(assets.instantiate('gull'));scene.add(gull.mesh);return gull;});
// A first meal right under the nose makes the controls easy to learn.
// (The opening view looks very slightly downwards, so they sit along that line.)
[.4,.8,1.3,1.9,2.6].forEach((ahead,i)=>prey[i].station((i%3-1)*.015,-2-ahead*.08,16-ahead,0));
const keys=new Set<string>();let running=false,paused=false,bio=0,panic=0,eaten=0,cooldown=0,rippleTimer=0,toastTimer=0,shake=0,time=0,flash=0,wasAbove=false;
// grown = the length earned so far; the body eases towards it. grace = seconds during which nothing can target it.
const stages:[number,string][]=[[.3,'孵化したばかり'],[1,'稚体'],[3,'幼体'],[8,'若い個体'],[14,'成体'],[25,'巨大個体'],[40,'怪獣'],[maxLength,'海の神']];
let grown=startLength,stage=stages.findIndex(([limit])=>startLength<=limit),grace=25,sinceHurt=99,dustTimer=0,hurtSound=0,tooBig=0,victims=0,smallFry=0,fishEaten=0;
// A body carried in the jaws: shaken, bled, then torn apart and swallowed.
let held:{prey:Human,timer:number,next:number,size:number}|undefined;
function toast(message:string){$('toast').textContent=message;toastTimer=2.5;}
let biteHit=false;
// What the jaws were opened for. A fast swimmer can overshoot small prey before they close,
// so the bite still lands on it if it is close by.
let quarry:Human|undefined;
function eat(){
 if(!running||paused||cooldown>0)return;
 cooldown=player.snap+.1;player.bite=player.snap;player.lunge=1;biteHit=false;sound.snap();
}
function waterline(position:THREE.Vector3){return new THREE.Vector3(position.x,ocean.surfaceHeight(position.x,position.z,time),position.z);}
// What each kill does to the headlines.
function headline(p:Human){
 const kind=p.kind;
 if(p.spec.person||kind==='jetski'||kind==='kayak'){
  victims++;
  if(kind==='tourist')news.report('landing','怪物が砂浜に上陸。目撃者「海から這い上がってきた」');
  if(victims===1)news.report('victim1','コーラルコーストで遊泳客1名が行方不明。当局が捜索を開始');
  else if(victims===3)news.report('victim3','行方不明者が3名に。目撃者「水中に巨大な影を見た」');
  else if(victims===6)news.report('victim6','海水浴場に遊泳禁止令。犠牲者は6名に');
  else if(victims===12)news.report('victim12','犠牲者12名。宿泊予約のキャンセルが相次ぎ、観光株が急落');
  else if(victims%10===0)news.report('victim'+victims,'犠牲者は'+victims+'名に。政府が非常事態を宣言');
  return;
 }
 if(kind==='krill'||kind==='shrimp'||kind==='minnow'||kind==='sardine'||kind==='crab'||kind==='squid'){if(++smallFry===15)news.report('smallfry','沿岸でエビや小魚が急減。漁協「原因がわからない」');return;}
 if(kind==='fish'||kind==='tuna'||kind==='barracuda'){if(++fishEaten===6)news.report('fish','定置網が空っぽ。漁師「何かが魚を食い荒らしている」');return;}
 const stories:Partial<Record<PreyKind,string>>={
  shark:'サメの死骸が漂着。胴体に巨大な歯形',dolphin:'イルカの群れが姿を消す。保護団体が調査へ',turtle:'ウミガメの甲羅だけが浜に打ち上げられる',
  seal:'アザラシの繁殖地が壊滅状態。「一晩でいなくなった」',sealion:'アシカの群れが岩場から消える',ray:'海底でエイの食べ残しが多数見つかる',
  orca:'海の王者シャチが捕食される。専門家「あり得ない」',whale:'クジラの死骸、体の半分が食いちぎられた状態で発見',
  megalodon:'絶滅したはずの巨大ザメの死骸を発見。それを殺した「何か」がいる',giantsquid:'ダイオウイカの残骸が大量に漂着',
  boat:'小型船が沈没。乗員「下から突き上げられた」',sailboat:'ヨットが真っ二つに。船体に噛み跡',ferry:'定期フェリーが沈没。乗客多数が行方不明',
  patrol:'迎撃艇が消息を絶つ。最後の通信は「でかすぎる」',helicopter:'攻撃ヘリが撃墜される。怪物は海面から跳躍',
  submarine:'潜水艦との通信が途絶。海底で残骸を確認',battleship:'戦艦が大破、沈没。防衛当局「想定外の事態」',
 };
 const story=stories[kind];if(story)news.report(kind,story);
}
// Something has hurt the predator: a bite, a burst of gunfire, a shell or a torpedo.
function hurt(amount:number,weapon=false){
 if(grace>0||amount<=0)return;
 player.health-=amount;sinceHurt=0;flash=Math.max(flash,Math.min(1,.3+amount*.03));shake=Math.max(shake,Math.min(.4,.1+amount*.012));
 if(hurtSound<=0){hurtSound=.25;sound.hurt();effects.blood(player.mesh.position,THREE.MathUtils.clamp(player.length/9,.01,1.4));}
 if(weapon)news.report('hit','当局「攻撃は命中。効果を確認中」');
 if(player.health>0)return;
 // Beaten: it survives, but smaller, and is left alone for a few seconds to get away.
 grown=Math.max(.1,grown*.7);player.length=Math.min(player.length,grown);player.health=100;grace=7;
 for(let i=0;i<stages.length;i++)if(grown<=stages[i][0]){stage=i;break;}
 effects.gibs(player.mesh.position,THREE.MathUtils.clamp(player.length/6,.01,2));
 toast('深手を負った… 体長 '+metres(grown)+' に縮んだ');sound.crunch(1);
 news.report('wounded','怪物に深手か。当局「弱っている今が好機」',true);
}
function damage(p:Human,amount:number,impact:THREE.Vector3){
 const ratio=p.length/player.length;
 // Anything small beside the predator dies at the first bite.
 if(ratio<.3)p.health=Math.min(p.health,amount);
 p.health-=amount;shake=Math.max(shake,Math.min(.25,.06+ratio*.4));
 const length=p.length,size=THREE.MathUtils.clamp(length/2.6,.008,6);
 if(p.health>0){
  if(p.creature){
   // A wounded animal bleeds and bolts.
   effects.blood(impact,size*.5);effects.gibs(impact,size*.4);sound.crunch(Math.min(2,size*.6));sound.cry(p.kind);flash=.5;player.gore=1;
   toast('深手を負わせた — あと'+p.health+'回');return;
  }
  // A wounded hull sheds a few pieces where it was struck.
  effects.shatter(p.mesh,impact,5);if(!p.spec.flies)effects.splash(waterline(impact),.6);sound.thud();sound.splash(.6);
  toast('命中 — あと'+p.health+'回');return;
 }
 p.alive=false;p.respawn=p.spec.weapon?45:18;bio+=p.points;eaten++;panic=Math.min(100,panic+p.spec.panic);
 toast(p.label+' +'+p.points+' BP');headline(p);
 // Food becomes body: bigger meals add more, and nothing adds more than 30% at once.
 const food=length*(p.creature?1:.55);
 grown=Math.min(maxLength,Math.sqrt(grown*grown+1.5*food*food),grown*1.3);
 player.health=Math.min(100,player.health+6+Math.min(1,ratio)*24);
 if(p.creature){
  sound.crunch(Math.min(2,size));if(p.spec.person)sound.deathScream();else sound.cry(p.kind);
  const ashore=impact.y>.4;
  effects.blood(impact,size*.7,ashore);flash=THREE.MathUtils.clamp(ratio*2.5,.15,1);player.gore=1;
  if(!ashore&&p.mesh.position.y>-1.6*Math.max(size,.2)){effects.splash(waterline(p.mesh.position),Math.min(.6,size*.6),0xc64a4a);ocean.ripple(p.mesh.position.x,p.mesh.position.z,Math.min(.8,size));}
  if(ratio>.75){
   // Far too big to lift: it comes apart where it floats.
   p.mesh.visible=false;effects.shatter(p.mesh,impact,28,true,Math.min(1,size));effects.gibs(impact,size);effects.blood(p.mesh.position,size);effects.slick(p.mesh.position,size);effects.slick(impact,size*.6);
   ocean.ripple(p.mesh.position.x,p.mesh.position.z,Math.min(2,size));player.chew=1;sound.gulp();shake=Math.max(shake,.6*Math.min(1,size));
  }else if(ratio<.14){
   // Small prey goes down whole in a puff of blood.
   p.mesh.visible=false;effects.gibs(impact,size*.5);effects.slick(impact,size*.6,ashore?groundHeight(impact.x,impact.z)+.06:undefined);player.chew=.5;sound.gulp();
  }else{
   const span=.55+Math.min(.65,ratio*1.1);
   held={prey:p,timer:span,next:0,size};player.feeding=span;cooldown=span+.3;
  }
 }else{
  p.mesh.visible=false;
  const spot=p.mesh.position,airborne=!!p.spec.flies,sunk=spot.y<-3,blast=THREE.MathUtils.clamp(length/9,.5,4);
  effects.shatter(p.mesh,impact,Infinity,false,THREE.MathUtils.clamp(.6+length/25,.6,2.2));
  if(!airborne){effects.splash(waterline(spot),THREE.MathUtils.clamp(length/5,.7,4));ocean.ripple(spot.x,spot.z,Math.min(3,1+length/20));}
  if(p.spec.weapon||p.kind==='ferry'){effects.explosion(sunk?spot:spot.clone().setY(spot.y+2),blast,sunk);sound.boom(Math.min(1.3,.5+length/40));}
  else if(p.kind!=='buoy'&&p.kind!=='sailboat'&&p.kind!=='kayak')effects.smoke(waterline(spot).add(new THREE.Vector3(0,.8,0)),THREE.MathUtils.clamp(length/7,.5,1.3));
  sound.smash(Math.min(2.5,size),p.kind!=='sailboat'&&p.kind!=='kayak'&&p.kind!=='jetski');sound.splash(1.2);
  // Whoever was aboard does not get away either.
  if(p.kind==='jetski'||p.kind==='kayak'||p.kind==='ferry'){effects.blood(spot,.9);effects.gibs(spot,.8);effects.slick(spot,p.kind==='ferry'?3:.8);sound.deathScream();flash=.8;}
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
  held.next=.13;shake=Math.max(shake,.3*Math.min(1,held.size*3));flash=Math.max(flash,.45*Math.min(1,held.size*3));
  effects.spurt(mouth,side.multiplyScalar(Math.sin(time*31)>0?1:-1),held.size);sound.tear();
 }
 if(held.timer<=0){
  const ashore=mouth.y>.4;
  effects.shatter(held.prey.mesh,mouth,16,true,Math.min(1,held.size));effects.gibs(mouth,held.size);effects.blood(mouth,held.size,ashore);effects.slick(mouth,held.size,ashore?groundHeight(mouth.x,mouth.z)+.06:undefined);
  held.prey.mesh.visible=false;sound.gulp();player.chew=.8;held=undefined;
 }
}
// The nearest thing in the jaws. Normally only what is small enough to bite through counts;
// oversized asks instead for what is in reach but still too big.
function biteTarget(oversized=false){
 const mouth=player.mouth(),box=player.biteBox(),limit=player.length*1.3;
 // A small predator covers many body lengths a second, so anything passing close to its
 // snout counts as within reach. At full size this margin is zero.
 const margin=Math.max(0,player.speed*.08-player.length*.07);
 return prey.filter(p=>{
  if(!p.alive||(p.length<=limit)===oversized)return false;
  const gap=p.mesh.position.distanceTo(mouth);
  if(gap>p.length*.8+3*player.scale+margin)return false;
  return (gap<p.length*.5+margin||box.intersectsOBB(p.collider())&&p.colliders().some(part=>box.intersectsOBB(part)))&&!ocean.collisions.blocked(mouth,p.mesh.position);
 })
  .sort((a,b)=>a.mesh.position.distanceToSquared(mouth)-b.mesh.position.distanceToSquared(mouth))[0];
}
function placePrey(p:Human){
 // Animals that reappear around the predator pick their own clear water.
 if(p.spec.near||p.spec.flies||p.length<.6)return;
 const spheres=[new THREE.Sphere(new THREE.Vector3(),p.ship?2:1)];
 for(let attempt=0;attempt<40;attempt++){
  if(!ocean.collisions.resolve(p.mesh,spheres))return;
  p.reset();
 }
 p.mesh.position.set(0,p.ship?0:-8,65);
}
for(const p of prey)if(p.alive)placePrey(p);
const marineLight=new MarineLight();marineLight.apply(scene);
// Sound, picture and gore options live in the pause menu and persist between visits.
function applySettings(){
 sound.setVolume(settings.volume);sound.setEnabled(settings.sound);
 $('sound').textContent=settings.sound?'SOUND ON':'SOUND OFF';
 ($('volume') as HTMLInputElement).value=String(Math.round(settings.volume*100));$('volumeValue').textContent=Math.round(settings.volume*100)+'%';
 ($('quality') as HTMLSelectElement).value=settings.quality;($('shadows') as HTMLSelectElement).value=settings.shadows?'on':'off';($('gore') as HTMLSelectElement).value=settings.gore;
 renderer.setPixelRatio(settings.quality==='high'?Math.min(devicePixelRatio,1.75):settings.quality==='medium'?Math.min(devicePixelRatio,1):Math.min(devicePixelRatio,1)*.7);
 renderer.setSize(innerWidth,innerHeight);
 ocean.setMirror(settings.quality==='high'?'full':settings.quality==='medium'?'half':'off');
 const shadowSize=settings.quality==='high'?2048:1024;
 if(sun.shadow.mapSize.x!==shadowSize){sun.shadow.mapSize.set(shadowSize,shadowSize);sun.shadow.map?.dispose();sun.shadow.map=null;}
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
// The body starts out already pointing along the opening view.
player.pitch=view.pitch;
const skyColor=new THREE.Color(0x9dc8d1),underwaterColor=new THREE.Color(0x115061);
function lockMouse(){const request=renderer.domElement.requestPointerLock();if(request)void request.catch(()=>toast('海の画面をクリックしてマウス操作を開始'));}
function setPaused(value:boolean){paused=value;keys.clear();$('paused').hidden=!paused;sound.suspend(paused);}
function togglePause(){if(!running)return;setPaused(!paused);if(paused)document.exitPointerLock();else lockMouse();}
function begin(){if(running||loading.open||($('start') as HTMLButtonElement).disabled)return;running=true;$('overlay').style.display='none';sound.start();lockMouse();toast('まずは目の前のオキアミから。食べるほど大きくなる。');}
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
function hud(){
 const length=player.length;
 $('bio').textContent=String(bio);$('length').textContent=length<1?String(Math.round(length*100)):length.toFixed(1);$('lengthUnit').textContent=length<1?'体長 / cm':'体長 / m';
 $('boostValue').textContent=Math.round(player.energy)+'%';$('boostBar').style.width=player.energy+'%';$('panicValue').textContent=Math.round(panic)+'%';$('panicBar').style.width=panic+'%';
 $('healthValue').textContent=Math.max(0,Math.round(player.health))+'%';$('healthBar').style.width=Math.max(0,player.health)+'%';
 // Growth is shown stage by stage; each stage is a multiple of the last, so the bar is logarithmic.
 const from=stage?stages[stage-1][0]:startLength,to=stages[stage][0];
 $('growthValue').textContent=stages[stage][1];$('growthBar').style.width=(grown>=maxLength?100:THREE.MathUtils.clamp(Math.log(grown/from)/Math.log(to/from),0,1)*100)+'%';
 $('growthText').textContent=grown>=maxLength?'最大の体格に到達した。':'次の段階は '+metres(to)+'。今は '+metres(grown*1.3)+' までの獲物を噛み砕ける。';
 // Past the first goal the line turns into a running total. Only the label's own text is
 // replaced: rewriting the whole line would delete the counter inside it.
 $('count').textContent=eaten<10?eaten+' / 10':String(eaten);$('missionBar').style.width=Math.min(eaten*10,100)+'%';
 $('missionText').firstChild!.textContent=eaten<10?'獲物を捕食する ':'海岸の覇者。捕食数 ';
 const armed=prey.some(p=>p.alive&&p.spec.weapon&&grown>=p.spec.weapon.minLength);
 $('status').textContent=armed?'軍が攻撃してくる。深く潜れば弾は届かない。':grown<1?'まだ小さい。大きな魚に気をつけろ。':panic>20?'人間が逃げ惑っている。浜まで追い詰めろ。':'食べて大きくなれ。海はお前のものだ。';
 $('depth').textContent='DEPTH '+Math.max(0,-player.mesh.position.y).toFixed(0)+'m';
}
let previous=performance.now(),hudTimer=0,frame=0,screamWait=0,warned=0;
const target:Target={position:player.mesh.position,length:startLength,hidden:true};
function loop(now:number){
 requestAnimationFrame(loop);const dt=Math.min((now-previous)/1000,.05);previous=now;
 // Water grows murkier with nothing in it to scale by, so a giant sees proportionally further.
 const haze=.019*Math.min(1,Math.pow(12/player.length,.6));
 if(!paused){
 time+=dt;marineLight.update(time);
 for(const gull of gulls)gull.update(dt,time);
 if(running){
  let boost=false;
  frame++;screamWait-=dt;grace-=dt;warned-=dt;sinceHurt+=dt;hurtSound-=dt;tooBig-=dt;
  target.length=player.length;target.hidden=grace>0;
  const seeFar=camera.position.y>ocean.surfaceHeight(camera.position.x,camera.position.z,time)?Infinity:2.4/haze;
  prey.forEach((p,index)=>{
   const wasAlive=p.alive;
   p.update(dt,time,target,panic);
   if(!p.alive)return;
   if(!wasAlive)placePrey(p);
   // Anything lost in the haze, or too small to make out at that range, is not drawn at all.
   const sight=Math.min(seeFar,Math.max(8,p.length*260));
   p.mesh.visible=p.mesh.position.distanceToSquared(camera.position)<sight*sight;
   // Terrain pushes the body clear; it then steers back to open water instead of bouncing.
   // Terrain checks alternate between two halves of the population each frame.
   if((index+frame)%2===0&&p.length>=.6&&!p.spec.flies&&!p.spec.crawls&&p.kind!=='buoy'&&p.kind!=='tourist'&&ocean.collisions.resolve(p.mesh,[new THREE.Sphere(new THREE.Vector3(),p.ship?1.6:.55)]))p.avoid();
   if(p.struck){hurt(p.struck);p.struck=0;}
   if(p.stalking){p.stalking=false;if(warned<=0){warned=6;toast(p.name+'に狙われている — SHIFTで振り切れ');}}
   if(p.fired){
    p.fired=false;
    const muzzle=p.mesh.position.clone();muzzle.y+=p.kind==='battleship'?6:p.kind==='helicopter'?-1.3:p.kind==='submarine'?0:1.3;
    weapons.fire(p.spec.weapon!.kind,muzzle,target);
   }
   if(p.alarmed){
    p.alarmed=false;
    const near=1-p.mesh.position.distanceTo(player.mesh.position)/70;
    if(near>0&&screamWait<=0){screamWait=.3;sound.scream(.35+near*.65);}
   }
   if(p.splashed){p.splashed=false;const blow=p.kind==='whale'?1.7:.7;effects.splash(waterline(p.mesh.position),blow);ocean.ripple(p.mesh.position.x,p.mesh.position.z,blow);if(p.mesh.position.distanceTo(player.mesh.position)<45)sound.splash(.5);}
  });
  hurt(weapons.update(dt,time,target),true);

 // Small simulation steps keep fast boosts and turning from crossing thin obstacles.
 const steps=Math.ceil(dt/(1/120)),stepDt=dt/steps,before=new THREE.Vector3();
 for(let step=0;step<steps;step++){
  const stepTime=time-dt+(step+1)*stepDt;
  boost=player.update(stepDt,stepTime,keys,followCamera.view);
  // Report the push-out direction so the body glides along sand and rock instead of sticking.
  before.copy(player.mesh.position);dustTimer-=stepDt;
  if(ocean.collisions.resolve(player.mesh,player.bodySpheres)){
   const push=player.mesh.position.clone().sub(before);
   if(push.lengthSq()>1e-12){
    player.touch(push.normalize());
    // Scraping the bottom throws up sand, under water or on the beach.
    const spot=player.mesh.position,floor=groundHeight(spot.x,spot.z);
    if(dustTimer<=0&&push.y>.3&&player.speed>1.2*player.pace&&spot.y-floor<2.4*player.scale){
     dustTimer=.09;
     const back=new THREE.Vector3(0,0,random(-3,4)*player.scale).applyQuaternion(player.mesh.quaternion);
     effects.dust(new THREE.Vector3(spot.x+back.x,floor+.15*player.scale,spot.z+back.z),THREE.MathUtils.clamp(player.scale*1.4,.02,4)*THREE.MathUtils.clamp(player.speed/(10*player.pace),.6,1.4),floor>-.2);
    }
   }
  }
  cooldown=Math.max(0,cooldown-stepDt);
  if(cooldown<=0&&player.bite<=0&&!held){quarry=biteTarget();if(quarry)eat();}
  if(player.biteActive&&!biteHit){
   const caught=quarry?.alive&&quarry.mesh.position.distanceTo(player.mouth())<quarry.length+player.length*.15+player.speed*.4?quarry:undefined;
   const victim=biteTarget()??caught;
   if(victim){biteHit=true;damage(victim,1,player.mouth());}
   else if(tooBig<=0&&biteTarget(true)){tooBig=2.5;toast('まだ大きすぎて噛み砕けない');}
  }
  for(const p of prey){
   if(!p.alive||!p.ship)continue;
   if(p.mesh.position.distanceToSquared(player.mesh.position)>Math.pow(p.length*.6+3+6*player.scale,2))continue;
   const hulls=p.colliders();
   player.mesh.updateMatrixWorld(true);
   const touching=player.bodySpheres.some(local=>hulls.some(hull=>hull.intersectsSphere(local.clone().applyMatrix4(player.mesh.matrixWorld))));
   if(!touching)continue;
   const toward=p.mesh.position.clone().sub(player.mesh.position).normalize();
   const forward=new THREE.Vector3(0,0,-1).transformDirection(player.mesh.matrixWorld);
   if(boost&&player.speed>15*player.pace&&forward.dot(toward)>.35&&p.ramCooldown<=0&&p.length<=player.length*1.3){
    p.ramCooldown=.9;damage(p,2,player.mouth());
   }
   if(p.alive){let contact=false;for(const hull of hulls)contact=resolveBox(player.mesh,player.bodySpheres,hull)||contact;if(contact)player.speed*=Math.exp(-stepDt*2);}
  }
 }
 carry(dt);
 // Breaking the surface throws spray, going up and coming down.
 const spot=player.mesh.position,scale=player.scale,above=spot.y>-.25*Math.min(1,scale);
 if(above!==wasAbove&&!player.grounded){
  // A breach and the crash back in both throw spray and send rings across the water.
  if(player.speed>6*player.pace){effects.splash(waterline(spot),Math.min(5,1.4*scale));sound.splash(Math.min(1.6,.3+scale));}
  ocean.ripple(spot.x,spot.z,Math.min(3,Math.min(2,.6+player.speed*.08)*scale));
 }
 wasAbove=above;
 // Cruising with the back awash keeps the surface stirring.
 rippleTimer-=dt;
 if(rippleTimer<=0&&spot.y>-1.6*scale&&!player.grounded&&groundHeight(spot.x,spot.z)<-.5*scale){rippleTimer=.7;ocean.ripple(spot.x,spot.z,(.35+Math.min(.6,player.speed*.04))*Math.min(2,scale));}
 // Grow smoothly toward the size earned so far, and heal when left alone.
 player.length=THREE.MathUtils.damp(player.length,grown,1.4,dt);
 if(sinceHurt>4)player.health=Math.min(100,player.health+dt*6);
 while(stage<stages.length-1&&grown>stages[stage][0]){
  stage++;toast('成長：'+stages[stage][1]+'（体長 '+metres(grown)+'）');shake=.35;
  if(grown>=3)sound.roar();else sound.gulp();
  const stories=['','岸辺の子どもが「変な魚がいた」と話す','釣り人が見慣れない魚影を撮影。「トカゲのような頭だった」','「巨大なトカゲのような生物」の目撃情報が相次ぐ','専門家「絶滅したはずのモササウルスに酷似している」','体長14メートル超。政府が巨大生物対策本部を設置','「もはや災害だ」沿岸全域に避難指示','体長40メートル超。各国が共同作戦を協議'];
  if(stories[stage])news.report('stage'+stage,stories[stage]);
 }
 // The response escalates with the size of the threat.
 if((grown>=4||panic>=50)&&deploy('patrol',4)){toast('警戒レベル上昇 — 迎撃艇出動');sound.alarm();news.report('patrol','海上保安当局が迎撃艇を出動。「発見次第、発砲を許可」');}
 if(grown>=9&&deploy('helicopter',2)){toast('攻撃ヘリが接近中');sound.alarm();news.report('helicopter','軍が攻撃ヘリを投入。上空から怪物を追う');}
 if(grown>=16&&deploy('submarine',2)){toast('潜水艦が出撃した');sound.alarm();news.report('submarine','海軍が潜水艦2隻を派遣。「深海でも逃がさない」');}
 if(grown>=26&&deploy('battleship',1)){toast('戦艦が出撃した');sound.alarm();news.report('battleship','戦艦が出撃。主砲による砲撃を開始');}
 if(grown>=30)deploy('helicopter',1);
 if(grown>=42&&deploy('battleship',1))news.report('battleship2','2隻目の戦艦が到着。首相「あらゆる手段を講じる」');
 camera.fov=THREE.MathUtils.damp(camera.fov,boost?72:62,3,dt);camera.updateProjectionMatrix();
 $('crosshair').style.color=biteTarget()?'#c3f865':'#d1f8cb66';
 panic=Math.max(0,panic-dt*.45);toastTimer-=dt;if(toastTimer<=0)$('toast').textContent='';
 }
 else{player.tail.rotation.y=0;}
 // Shadows move with the player in 8 m steps. High quality redraws them every frame.
 sun.target.position.set(Math.round(player.mesh.position.x/8)*8,0,Math.round(player.mesh.position.z/8)*8);sun.position.copy(sun.target.position).add(sunOffset);sun.target.updateMatrixWorld();
 if(settings.quality==='high'||frame%2===0)renderer.shadowMap.needsUpdate=true;
 // Follow after everything has moved, so the camera never trails by a frame.
 followCamera.update(camera,dt,running?view:{yaw:-.5,pitch:0},player.mesh.position,player.scale,shake,groundHeight);
 shake=Math.max(0,shake-dt);flash=Math.max(0,flash-dt*1.1);$('bloodFlash').style.opacity=String(Math.min(1,flash)*(settings.gore==='mild'?.3:.75));
 effects.update(dt,time);
 const cameraWaterline=ocean.surfaceHeight(camera.position.x,camera.position.z,time);
 const submerged=THREE.MathUtils.smoothstep(cameraWaterline-camera.position.y,-.5,.5);
 scene.fog!.color.copy(skyColor).lerp(underwaterColor,submerged);
 (scene.fog as THREE.FogExp2).density=THREE.MathUtils.lerp(.0022,haze,submerged);
 (scene.background as THREE.Color).copy(skyColor).lerp(underwaterColor,submerged);
 atmosphere.update(camera,submerged);
 ocean.update(time,camera,player,prey,haze);
 sound.update(submerged,running?player.speed/player.pace:0,panic);
 hudTimer+=dt;if(hudTimer>=.08){hud();hudTimer=0;}
 }
 renderer.render(scene,camera);
}
camera.position.set(.4,-1.8,16.6);camera.lookAt(player.mesh.position);requestAnimationFrame(loop);
}
void initialize().catch(()=>{});
