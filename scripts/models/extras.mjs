import * as THREE from 'three';
import {group,block,rod,oval,mesh,tube,foil,latheBody,fin,hull} from './details.mjs';

// All models face -Z with +Y up. Groups named Tail, TailV, WingL/R, ArmL/R and LegL/R are
// pivots the game animates; keep the names and pivot positions when editing.

export function fish(){
 const model=group('Fish');
 model.add(latheBody([[-.5,.012,.02],[-.39,.065,.12],[-.12,.1,.2],[.2,.07,.14],[.42,.025,.05]],0x5f8496,'FishBody'));
 const tail=group('Tail');tail.position.z=.4;model.add(tail);
 tail.add(fin('FishFinTailUpper',0x7d979f,{span:.24,chord:.14,sweep:.17,thickness:.02}),fin('FishFinTailLower',0x7d979f,{span:.24,chord:.14,sweep:.17,thickness:.02,down:true}));
 const dorsal=fin('FishFinDorsal',0x4f6f7d,{span:.12,chord:.26,sweep:.15,thickness:.02});dorsal.position.set(0,.17,-.16);model.add(dorsal);
 const anal=fin('FishFinAnal',0x7d979f,{span:.08,chord:.14,sweep:.09,thickness:.016,down:true});anal.position.set(0,-.12,.12);model.add(anal);
 for(const side of [-1,1]){
  const pectoral=fin('FishFinPectoral',0x7d979f,{span:.13,chord:.08,sweep:.09,thickness:.012});pectoral.rotation.z=-side*(Math.PI/2+.5);pectoral.position.set(side*.085,-.03,-.24);model.add(pectoral);
  model.add(oval([.012,.022,.022],0x0a0f10,'FishEye',[side*.058,.035,-.37]));
 }
 return model;
}

export function dolphin(){
 const model=group('Dolphin');
 model.add(latheBody([[-1.32,.025,.03],[-1.14,.065,.06],[-.98,.085,.09],[-.86,.2,.2],[-.4,.29,.31],[.1,.27,.3],[.6,.17,.2],[1,.07,.1],[1.2,.04,.05]],0x596c78,'DolphinBody'));
 const dorsal=fin('DolphinFinDorsal',0x4d5f6a,{span:.34,chord:.42,sweep:.38,thickness:.05});dorsal.position.set(0,.27,-.12);model.add(dorsal);
 // Horizontal flukes beat up and down.
 const tail=group('TailV');tail.position.z=1.12;model.add(tail);
 for(const side of [-1,1]){
  const fluke=fin('DolphinFinFluke',0x4d5f6a,{span:.4,chord:.3,sweep:.26,thickness:.04});fluke.rotation.z=-side*Math.PI/2;tail.add(fluke);
  const pectoral=fin('DolphinFinPectoral',0x4d5f6a,{span:.4,chord:.2,sweep:.26,thickness:.04});pectoral.rotation.z=-side*(Math.PI/2+.55);pectoral.position.set(side*.2,-.15,-.52);model.add(pectoral);
  model.add(oval([.014,.022,.024],0x06090b,'DolphinEye',[side*.172,.04,-.86]));
 }
 return model;
}

export function turtle(){
 const model=group('Turtle'),skin=0x76865a;
 model.add(oval([.42,.17,.55],0x566238,'Shell',[0,.05,0]),oval([.38,.1,.5],0xc9bf8f,'Plastron',[0,-.03,0]));
 for(let i=0;i<5;i++)model.add(oval([.13,.03,.1],0x6d7a45,'Scute',[0,.19-Math.abs(i-2)*.025,-.36+i*.18]));
 model.add(oval([.09,.08,.13],skin,'Neck',[0,.01,-.52]),oval([.11,.1,.16],skin,'Head',[0,.03,-.67]));
 for(const side of [-1,1]){
  // Long front flippers stroke like wings.
  const wing=group(side<0?'WingL':'WingR');wing.position.set(side*.33,0,-.3);model.add(wing);
  const flipper=oval([.36,.028,.13],skin,'FrontFlipper',[side*.33,0,.1]);flipper.rotation.y=-side*.4;wing.add(flipper);
  model.add(oval([.16,.025,.1],skin,'RearFlipper',[side*.3,-.01,.5]),oval([.014,.02,.02],0x0b0e0c,'TurtleEye',[side*.085,.06,-.73]));
 }
 return model;
}

export function swimmer(){
 const model=group('Swimmer'),skin=0xd2a07c;
 model.add(oval([.2,.13,.33],skin,'Torso',[0,0,-.1]),oval([.19,.13,.2],0xc4453a,'Trunks',[0,0,.28]));
 model.add(oval([.12,.13,.14],skin,'Head',[0,.06,-.58]),oval([.126,.1,.13],0x3a2c22,'Hair',[0,.11,-.56]),oval([.1,.03,.03],0x1b2a33,'Goggles',[0,.05,-.7]));
 for(const side of [-1,1]){
  // Arms windmill about the shoulder; legs flutter about the hip.
  const arm=group(side<0?'ArmL':'ArmR');arm.position.set(side*.24,.02,-.32);model.add(arm);
  arm.add(rod([0,0,0],[0,0,-.34],.05,skin,'UpperArm'),rod([0,0,-.34],[0,0,-.62],.042,skin,'Forearm'),oval([.045,.02,.07],skin,'Hand',[0,0,-.67]));
  const leg=group(side<0?'LegL':'LegR');leg.position.set(side*.1,0,.42);model.add(leg);
  leg.add(rod([0,0,0],[0,0,.45],.07,skin,'Thigh'),rod([0,0,.45],[0,0,.85],.05,skin,'Shin'),oval([.045,.025,.1],skin,'Foot',[0,0,.93]));
 }
 return model;
}

export function gull(){
 const model=group('Gull');
 model.add(oval([.09,.08,.24],0xf1f1ec,'GullBody'),oval([.055,.055,.07],0xf4f4f0,'GullHead',[0,.05,-.25]));
 const beak=mesh(new THREE.ConeGeometry(.018,.08,6),0xe0a53a,'Beak',[0,.04,-.34]);beak.rotation.x=-Math.PI/2;model.add(beak);
 const tail=foil([[-.05,0],[.05,0],[.09,.17],[-.09,.17]],.01,0xdedfd8,'TailFeathers');tail.rotation.x=Math.PI/2;tail.position.set(0,.01,.19);model.add(tail);
 for(const side of [-1,1]){
  const wing=group(side<0?'WingL':'WingR');wing.position.set(side*.07,.04,-.02);model.add(wing);
  const feathers=foil([[0,-.09],[side*.34,-.08],[side*.66,-.02],[side*.64,.03],[side*.3,.08],[0,.1]],.012,0xcfd4d6,'Wing');feathers.rotation.x=Math.PI/2;wing.add(feathers);
  const tip=foil([[side*.48,-.05],[side*.66,-.02],[side*.64,.03],[side*.5,.055]],.014,0x2f3437,'WingTip');tip.rotation.x=Math.PI/2;wing.add(tip);
  model.add(oval([.008,.01,.01],0x101010,'GullEye',[side*.045,.065,-.28]));
 }
 return model;
}

export function jetski(){
 const model=group('Jetski');
 const body=latheBody([[-1.5,.03,.05],[-1.2,.3,.22],[-.4,.5,.3],[.6,.52,.3],[1.3,.45,.26],[1.45,.3,.2]],0x2c7fa6,'JetHull');body.position.y=.12;model.add(body);
 model.add(block([.36,.2,1.05],0x1c2328,'JetSeat',[0,.5,.45]),block([.5,.25,.5],0x2c7fa6,'Cowl',[0,.5,-.45]));
 const shield=block([.42,.22,.03],0x7fb5c4,'Windshield',[0,.72,-.62]);shield.rotation.x=-.5;model.add(shield);
 model.add(rod([0,.5,-.4],[0,.86,-.24],.035,0x30383c,'SteeringColumn'),rod([-.33,.86,-.24],[.33,.86,-.24],.025,0x30383c,'Handlebar'));
 // Rider leaning into the bars.
 model.add(oval([.19,.27,.15],0xe07b2f,'RiderVest',[0,1.03,.32]),oval([.17,.14,.16],0x25303a,'RiderHips',[0,.72,.42]));
 model.add(oval([.11,.125,.115],0xd2a07c,'RiderHead',[0,1.4,.24]),oval([.118,.09,.12],0x2b2320,'RiderHair',[0,1.45,.26]));
 for(const side of [-1,1]){
  model.add(rod([side*.2,1.16,.26],[side*.3,.98,-.02],.045,0xd2a07c,'RiderUpperArm'),rod([side*.3,.98,-.02],[side*.3,.87,-.23],.04,0xd2a07c,'RiderForearm'));
  model.add(rod([side*.12,.7,.4],[side*.3,.5,.05],.07,0x25303a,'RiderThigh'),rod([side*.3,.5,.05],[side*.34,.2,.2],.055,0xd2a07c,'RiderShin'));
  model.add(block([.05,.1,1.7],0xe6e9ea,'JetStripe',[side*.49,.16,.2]));
 }
 return model;
}

export function sailboat(){
 const model=group('Sailboat');model.add(hull(false));
 const deck=foil([[-.05,-3.72],[.74,-3.2],[1.40,-2],[1.58,0],[1.4,3.12],[-1.4,3.12],[-1.58,0],[-1.40,-2],[-.74,-3.2]],.12,0xb9966a,'TimberDeck');deck.rotation.x=Math.PI/2;deck.position.y=.4;model.add(deck);
 model.add(block([1.5,.48,2.3],0xeeeade,'Coachroof',[0,.7,.2]),block([1.15,.3,.9],0xe5dfcf,'Cockpit',[0,.6,2.2]));
 for(const side of [-1,1]){
  for(let i=0;i<3;i++)model.add(block([.03,.2,.42],0x2f5f70,'Porthole',[side*.76,.74,-.5+i*.7]));
  model.add(block([.06,.14,5.4],0x1f4f73,'HullStripe',[side*1.5,.12,-.2]));
  model.add(rod([side*.5,.5,-.6],[0,7.2,-.6],.012,0x9aa5a6,'Shroud'));
 }
 model.add(rod([0,.4,-.6],[0,9.6,-.6],.07,0xd9d6cc,'Mast',10),rod([0,1.7,-.6],[0,1.7,2.9],.05,0xd9d6cc,'Boom'));
 model.add(rod([0,9.5,-.6],[0,.6,-3.5],.012,0x9aa5a6,'Forestay'),rod([0,9.5,-.6],[0,.6,3.1],.012,0x9aa5a6,'Backstay'));
 const main=foil([[0,0],[3.3,0],[0,7.5]],.03,0xf4f1e8,'MainSailFabric');main.rotation.y=-Math.PI/2;main.position.set(0,1.85,-.5);model.add(main);
 const jib=foil([[0,0],[-2.6,0],[0,6.4]],.03,0xf1ede2,'JibSailFabric');jib.rotation.y=-Math.PI/2;jib.position.set(0,.9,-.75);model.add(jib);
 model.add(block([.14,1.5,1.3],0x2c3e4a,'Keel',[0,-1.3,.2]),block([.07,.9,.4],0x2c3e4a,'Rudder',[0,-.8,3.0]),rod([0,.6,3.0],[0,.95,2.4],.025,0x8a6a45,'Tiller'));
 return model;
}

export function buoy(){
 const model=group('Buoy');
 model.add(mesh(new THREE.CylinderGeometry(.75,.85,.7,20),0xc9402f,'BuoyFloat',[0,.1,0]),mesh(new THREE.CylinderGeometry(.82,.82,.12,20),0x2b2f31,'BuoyFender',[0,.1,0]));
 for(let i=0;i<3;i++){
  const a=i*Math.PI*2/3;
  model.add(rod([Math.cos(a)*.55,.45,Math.sin(a)*.55],[Math.cos(a)*.12,2.3,Math.sin(a)*.12],.035,0xc9402f,'BuoyFrame'));
 }
 model.add(mesh(new THREE.CylinderGeometry(.2,.2,.08,12),0xc9402f,'BuoyTop',[0,2.3,0]),oval([.1,.13,.1],0xf2d25a,'BuoyLamp',[0,2.45,0]));
 model.add(mesh(new THREE.TorusGeometry(.3,.025,6,18),0xdedede,'BuoyRing',[0,1.4,0]),rod([0,-.2,0],[0,-2.2,0],.06,0x3c4447,'BuoyStem'),oval([.22,.3,.22],0x3c4447,'BuoyWeight',[0,-2.3,0]));
 return model;
}

export function kelp(){
 const root=group('Kelp');
 for(let i=0;i<7;i++){
  const a=i*2.3999,r=.15+.5*Math.sqrt(i/7),x=Math.cos(a)*r,z=Math.sin(a)*r,h=3+(i*1.37%2.6),points=[];
  for(let k=0;k<=6;k++){const t=k/6;points.push([x+Math.sin(t*4+i)*.22*t,t*h,z+Math.cos(t*3.3+i*2)*.22*t]);}
  const strand=tube(points,.045,i%2?0x55662b:0x6b7632,'KelpStrand');strand.scale.set(2.4,1,1);strand.position.x=-x*1.4;root.add(strand);
 }
 return root;
}

export function ray(){
 const model=group('Ray'),hide=0x4a5560;
 model.add(oval([.34,.1,.62],hide,'RayBody',[0,0,0]),oval([.3,.05,.55],0xd9dcd2,'RayBelly',[0,-.06,0]));
 for(const side of [-1,1]){
  // Broad triangular wings beat slowly, like a bird in slow motion.
  const wing=group(side<0?'WingL':'WingR');wing.position.set(side*.22,0,-.05);model.add(wing);
  const web=foil([[0,-.55],[side*1.25,.05],[side*1.1,.22],[0,.5]],.06,hide,'RayWing');web.rotation.x=Math.PI/2;wing.add(web);
  const horn=oval([.05,.04,.16],hide,'RayHorn',[side*.16,0,-.68]);horn.rotation.y=side*.25;model.add(horn);
  model.add(oval([.02,.025,.03],0x07090a,'RayEye',[side*.27,.05,-.42]));
 }
 model.add(tube([[0,0,.55],[0,.02,1.2],[0,0,1.9]],.022,0x39424b,'RayTail'));
 return model;
}

export function seal(){
 const model=group('Seal'),fur=0x6b6258;
 model.add(latheBody([[-.95,.04,.05],[-.8,.13,.13],[-.62,.16,.17],[-.45,.2,.2],[0,.3,.29],[.45,.22,.2],[.8,.1,.09],[.95,.04,.04]],fur,'SealBody'));
 model.add(oval([.035,.03,.04],0x1a1512,'SealNose',[0,.01,-.95]));
 const tail=group('TailV');tail.position.z=.9;model.add(tail);
 for(const side of [-1,1]){
  const hind=oval([.09,.02,.2],0x554d45,'HindFlipper',[side*.08,0,.16]);hind.rotation.y=-side*.3;tail.add(hind);
  const fore=oval([.22,.025,.09],0x554d45,'ForeFlipper',[side*.3,-.12,-.25]);fore.rotation.set(0,side*.5,-side*.5);model.add(fore);
  model.add(oval([.018,.024,.024],0x050505,'SealEye',[side*.1,.07,-.8]));
 }
 return model;
}

export function jellyfish(){
 const model=group('Jellyfish');
 const bell=mesh(new THREE.SphereGeometry(.38,20,10,0,Math.PI*2,0,Math.PI*.55),0xd8b8e0,'JellyBell',[0,0,0],.25);bell.material=bell.material.clone();bell.material.transparent=true;bell.material.opacity=.72;bell.material.side=THREE.DoubleSide;model.add(bell);
 model.add(oval([.2,.12,.2],0xe9d3ee,'JellyCore',[0,.05,0]));
 for(let i=0;i<9;i++){
  const a=i*Math.PI*2/9,r=.26,length=.9+(i%3)*.35;
  model.add(tube([[Math.cos(a)*r,-.03,Math.sin(a)*r],[Math.cos(a+.4)*r*.8,-length*.5,Math.sin(a+.4)*r*.8],[Math.cos(a-.3)*r*.6,-length,Math.sin(a-.3)*r*.6]],.014,0xc79fd2,'JellyTentacle'));
 }
 return model;
}

export function kayak(){
 const model=group('Kayak');
 const shell=latheBody([[-2.1,.02,.04],[-1.6,.2,.13],[-.5,.33,.17],[.6,.33,.17],[1.6,.2,.13],[2.1,.02,.04]],0xe2a52b,'KayakHull');shell.position.y=.08;model.add(shell);
 model.add(mesh(new THREE.TorusGeometry(.27,.035,6,18),0x23282b,'Cockpit',[0,.25,.1]).rotateX(Math.PI/2));
 model.add(oval([.19,.27,.15],0x3f7f52,'PaddlerVest',[0,.6,.12]),oval([.11,.125,.115],0xd2a07c,'PaddlerHead',[0,.98,.1]),oval([.13,.06,.13],0xd9d2bf,'PaddlerHat',[0,1.08,.1]));
 // Both arms carry the paddle; the game swings the pair as one.
 const arms=group('ArmL');arms.position.set(0,.72,.05);model.add(arms);
 arms.add(rod([-.2,0,0],[-.34,-.08,-.34],.045,0xd2a07c,'PaddlerArm'),rod([.2,0,0],[.34,-.08,-.34],.045,0xd2a07c,'PaddlerArm'));
 arms.add(rod([-1.05,-.08,-.36],[1.05,-.08,-.36],.02,0x30383c,'PaddleShaft'),oval([.17,.02,.09],0xd8412f,'PaddleBlade',[-1.15,-.08,-.36]),oval([.17,.02,.09],0xd8412f,'PaddleBlade',[1.15,-.08,-.36]));
 return model;
}

export function surfer(){
 // A swimmer lying on a board, paddling out with both arms.
 const model=swimmer();model.name='Surfer';
 const board=latheBody([[-1.25,.02,.01],[-1,.19,.03],[0,.27,.035],[.9,.23,.03],[1.15,.1,.02]],0xf3eee0,'Surfboard');board.position.set(0,-.17,.1);model.add(board);
 model.add(block([.05,.012,2],0xd8412f,'BoardStripe',[0,-.133,.1]));
 const skeg=fin('BoardFin',0x2c3e4a,{span:.16,chord:.14,sweep:.12,thickness:.02,down:true});skeg.position.set(0,-.2,1);model.add(skeg);
 return model;
}
