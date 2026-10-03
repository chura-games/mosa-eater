import * as THREE from 'three';
import './style.css';
import {Mosasaurus} from './entities/Mosasaurus';
import {Human} from './entities/Human';
import {createOcean} from './system/Ocean';
const $=(id:string)=>document.getElementById(id)!;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x83bac0);scene.fog=new THREE.FogExp2(0x75aeb5,.007);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,700);
let renderer:THREE.WebGLRenderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{$('start').textContent='WebGLを利用できません';throw new Error('WebGL unavailable');}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;$('world').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xd5f4ed,0x25465b,2));const sun=new THREE.DirectionalLight(0xffefcf,3);sun.position.set(-60,90,30);scene.add(sun);
const ocean=createOcean(scene);const player=new Mosasaurus();scene.add(player.mesh);
const prey:Human[]=[];for(let i=0;i<34;i++){const p=new Human(i<20?'diver':i<28?'shark':'boat');prey.push(p);scene.add(p.mesh);}
// A nearby first hunt makes the controls easy to learn.
prey[0].mesh.position.set(0,-4,4);prey[1].mesh.position.set(7,-4,-8);
const keys=new Set<string>();let running=false,paused=false,bio=0,panic=0,eaten=0,patrolSpawned=false,sonar=0,cooldown=0,toastTimer=0,shake=0,time=0,sound=false,audio:AudioContext|undefined;
function toast(message:string){$('toast').textContent=message;toastTimer=2.5;}
function tone(frequency:number,duration=.15){if(!sound)return;audio??=new AudioContext();void audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sawtooth';osc.frequency.setValueAtTime(frequency,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(35,audio.currentTime+duration);gain.gain.setValueAtTime(.07,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);osc.connect(gain).connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);}
function eat(){
 if(!running||paused||cooldown>0)return;cooldown=.55;player.bite=.45;tone(90);
 const mouth=player.mouth();let hit=false;
 for(const p of prey){if(!p.alive||p.mesh.position.distanceTo(mouth)>5.5*player.scale)continue;
 p.alive=false;p.mesh.visible=false;p.respawn=18;bio+=p.points;eaten++;panic=Math.min(100,panic+(p.kind==='diver'?9:15));hit=true;shake=.35;toast(p.label+' +'+p.points+' BP');tone(170,.25);
 for(let i=0;i<12;i++){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.2,0),new THREE.MeshBasicMaterial({color:0xd2f4cb,transparent:true,opacity:.9}));m.position.copy(p.mesh.position);scene.add(m);particles.push({mesh:m,velocity:new THREE.Vector3((Math.random()-.5)*12,Math.random()*8,(Math.random()-.5)*12),life:1});}
 }
 if(!hit)toast('獲物に接近して噛みつこう');
}
function evolve(){if(!running||paused)return;if(bio<100){toast('進化には100 BP必要');return;}if(player.level>=8){toast('最大進化に到達');return;}bio-=100;player.level++;toast('進化：体長 '+(12*player.scale).toFixed(1)+' m');tone(300,.5);}
function togglePause(){if(!running)return;paused=!paused;keys.clear();$('paused').hidden=!paused;}
$('start').onclick=()=>{running=true;$('overlay').style.display='none';toast('最初の獲物は正面。Wで接近、SPACEで捕食。');};
$('resume').onclick=togglePause;$('evolve').onclick=evolve;$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'SOUND ON':'SOUND OFF';tone(220);};
renderer.domElement.addEventListener('pointerdown',eat);
addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();if(e.code==='Escape'&&!e.repeat){togglePause();return;}if(!running||paused)return;keys.add(e.code);if(e.repeat)return;if(e.code==='Space')eat();if(e.code==='KeyE')evolve();if(e.code==='KeyF'){sonar=3;toast('ソナー：明るい点は近くの獲物');tone(500,.4);}});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();if(running&&!paused)togglePause();});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
const radar=($('radar') as HTMLCanvasElement).getContext('2d')!;
const particles:{mesh:THREE.Mesh,velocity:THREE.Vector3,life:number}[]=[];
const sonarRing=new THREE.Mesh(new THREE.RingGeometry(.98,1,80),new THREE.MeshBasicMaterial({color:0xc3f865,transparent:true,opacity:.7,side:THREE.DoubleSide}));sonarRing.rotation.x=-Math.PI/2;scene.add(sonarRing);
function hud(){
 $('bio').textContent=String(bio);$('length').textContent=(12*player.scale).toFixed(1);
 $('boostValue').textContent=Math.round(player.energy)+'%';$('boostBar').style.width=player.energy+'%';$('panicValue').textContent=Math.round(panic)+'%';$('panicBar').style.width=panic+'%';
 $('count').textContent=Math.min(eaten,10)+' / 10';$('missionBar').style.width=Math.min(eaten*10,100)+'%';
 if(eaten>=10)$('missionText').textContent='海岸の覇者になった。狩りは続く。';
 $('status').textContent=panic>=50?'迎撃艇が接近中。船ごと噛み砕け。':panic>20?'観光客が逃走中。ソナーで追跡しよう。':'海岸は穏やかだ。狩りを始めよう。';
 $('depth').textContent='DEPTH '+Math.max(0,-player.mesh.position.y).toFixed(0)+'m';
 radar.clearRect(0,0,180,180);radar.strokeStyle='#b9e5c533';for(const r of [30,60,86]){radar.beginPath();radar.arc(90,90,r,0,Math.PI*2);radar.stroke();}
 radar.beginPath();radar.moveTo(90,4);radar.lineTo(90,176);radar.moveTo(4,90);radar.lineTo(176,90);radar.stroke();
 for(const p of prey){if(!p.alive)continue;const d=p.mesh.position.clone().sub(player.mesh.position).applyAxisAngle(new THREE.Vector3(0,1,0),-player.heading);const x=d.x*.65,z=d.z*.65;if(Math.hypot(x,z)>84)continue;radar.fillStyle=p.kind==='patrol'?'#ff9a70':sonar>0?'#e3ffaf':'#98cbb0';radar.beginPath();radar.arc(90+x,90+z,sonar>0?4:2.3,0,Math.PI*2);radar.fill();}
 radar.fillStyle='#c3f865';radar.beginPath();radar.moveTo(90,83);radar.lineTo(85,96);radar.lineTo(95,96);radar.closePath();radar.fill();
}
let previous=performance.now();
function loop(now:number){
 requestAnimationFrame(loop);const dt=Math.min((now-previous)/1000,.05);previous=now;
 if(!paused){
 time+=dt;ocean(time);
 if(running){
 const boost=player.update(dt,time,keys);camera.fov=THREE.MathUtils.damp(camera.fov,boost?72:62,3,dt);camera.updateProjectionMatrix();
 cooldown=Math.max(0,cooldown-dt);sonar=Math.max(0,sonar-dt);panic=Math.max(0,panic-dt*.45);toastTimer-=dt;if(toastTimer<=0)$('toast').textContent='';
 for(const p of prey)p.update(dt,time,player.mesh.position,panic);
 if(panic>=50&&!patrolSpawned){patrolSpawned=true;for(let i=0;i<4;i++){const p=new Human('patrol');p.mesh.position.set(-40+i*22,0,-80);scene.add(p.mesh);prey.push(p);}toast('警戒レベル上昇 — 迎撃艇出動');}
 for(const p of prey){if(p.kind==='patrol'&&p.alive&&p.mesh.position.distanceTo(player.mesh.position)<8){player.energy=Math.max(0,player.energy-dt*12);}}
 }
 else{player.tail.rotation.y=Math.sin(time*3)*.22;player.mesh.rotation.y=-.5;}
 const heading=player.mesh.rotation.y;const offset=new THREE.Vector3(0,8,22+player.level*1.2).applyAxisAngle(new THREE.Vector3(0,1,0),heading);
 const desired=player.mesh.position.clone().add(offset);camera.position.lerp(desired,1-Math.exp(-dt*3));const look=player.mesh.position.clone().add(new THREE.Vector3(0,1,-6).applyAxisAngle(new THREE.Vector3(0,1,0),heading));
 shake=Math.max(0,shake-dt);if(shake>0)camera.position.add(new THREE.Vector3((Math.random()-.5)*shake,(Math.random()-.5)*shake,0));camera.lookAt(look);
 const underwater=camera.position.y<0;scene.fog!.color.set(underwater?0x17515e:0x75aeb5);(scene.fog as THREE.FogExp2).density=underwater?.023:.007;scene.background=new THREE.Color(underwater?0x17515e:0x83bac0);
 sonarRing.visible=sonar>0;sonarRing.position.copy(player.mesh.position);sonarRing.scale.setScalar((3-sonar)*35+1);(sonarRing.material as THREE.MeshBasicMaterial).opacity=sonar/4;
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.mesh.position.addScaledVector(p.velocity,dt);(p.mesh.material as THREE.MeshBasicMaterial).opacity=Math.max(0,p.life);if(p.life<=0){scene.remove(p.mesh);p.mesh.geometry.dispose();(p.mesh.material as THREE.Material).dispose();particles.splice(i,1);}}
 hud();
 }
 renderer.render(scene,camera);
}
camera.position.set(14,9,39);camera.lookAt(player.mesh.position);requestAnimationFrame(loop);
