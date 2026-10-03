import * as THREE from 'three';
import {group,block,rod,oval,mesh,tube,foil} from './details.mjs';

// Large vessels, aircraft and the smallest sea life. All models face -Z with +Y up and are
// built in metres; the small animals are one unit long and scaled by the game.
// Groups named Rotor (spins about Y), TailRotor (about X) and Screw (about Z) are animated.

// A hull lofted through frames of [z, half beam, deck height, keel depth]. Red below the waterline.
function shipHull(frames,color,name,bottom=0x7a2d26){
 const vertices=[],colors=[],indices=[],count=7,top=new THREE.Color(color),under=new THREE.Color(bottom);
 for(const [z,w,deck,keel] of frames)for(const [x,y] of [[-w,deck],[-w*.98,.25],[-w*.84,keel*.6],[0,keel],[w*.84,keel*.6],[w*.98,.25],[w,deck]]){
  vertices.push(x,y,z);const c=y<.3?under:top;colors.push(c.r,c.g,c.b);
 }
 for(let i=0;i<frames.length-1;i++)for(let j=0;j<count-1;j++){const a=i*count+j,b=a+count;indices.push(a,a+1,b,b,a+1,b+1);}
 // Close the transom.
 const end=(frames.length-1)*count;for(let j=1;j<count-1;j++)indices.push(end,end+j,end+j+1);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);
 const flat=geometry.toNonIndexed();flat.computeVertexNormals();
 const result=new THREE.Mesh(flat,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.6,metalness:.25,side:THREE.DoubleSide}));result.name=name;return result;
}
function deckOf(frames,color,name,inset=.15){
 const outline=[...frames.map(([z,w])=>[w-inset,z]),...frames.slice().reverse().map(([z,w])=>[-(w-inset),z])];
 const deck=foil(outline,.12,color,name);deck.rotation.x=Math.PI/2;return deck;
}
function cylinder(radius,height,color,name,position,top=radius){return mesh(new THREE.CylinderGeometry(top,radius,height,20),color,name,position);}
// A body of revolution along Z from [z, radius] pairs.
function spindle(profile,color,name,segments=28){
 const curve=new THREE.SplineCurve(profile.map(([z,r])=>new THREE.Vector2(r,z))),geometry=new THREE.LatheGeometry(curve.getPoints(48),segments);
 geometry.rotateX(Math.PI/2);geometry.computeVertexNormals();return mesh(geometry,color,name);
}

export function battleship(){
 const model=group('Battleship'),grey=0x7f8c92,dark=0x566268;
 const frames=[[-36,.12,4.6,-.4],[-31,2,4,-2.8],[-20,4.4,3.4,-3.6],[-4,5.2,3.2,-3.7],[18,5.1,3.2,-3.7],[31,4.2,3.2,-3.3],[36,3.3,3.3,-1.6]];
 model.add(shipHull(frames,grey,'WarHull'));
 const deck=deckOf(frames,0x8a7f6a,'WarDeck');deck.position.y=3.3;model.add(deck);
 model.add(block([7.2,2.2,24],grey,'Citadel',[0,4.4,3]),block([5.4,3,6.4],grey,'BridgeTower',[0,7,-6.5]),block([3.8,2,4.2],grey,'BridgeUpper',[0,9.5,-6.5]));
 model.add(block([5.5,.55,.2],0x1d3540,'BridgeWindow',[0,7.9,-9.75]),block([3.9,.5,.2],0x1d3540,'BridgeWindowUpper',[0,9.8,-8.65]));
 for(const z of [2.5,8.5]){const funnel=cylinder(1.5,4.4,dark,'Funnel',[0,7.6,z],1.2);funnel.rotation.x=.14;model.add(funnel,cylinder(1.26,.3,0x1c1f21,'FunnelCap',[0,9.85,z+.3]));}
 model.add(rod([0,10.4,-6.5],[0,17.5,-6.5],.18,dark,'WarMast'),rod([-2.6,14.6,-6.5],[2.6,14.6,-6.5],.09,dark,'Yardarm'),block([2.8,.5,.5],0xcfd5d2,'MastRadar',[0,16.2,-6.5]),block([.3,1.6,2.4],0xcfd5d2,'AftRadar',[0,7.4,14.5]));
 // Three triple turrets: two forward, the second raised to fire over the first, and one aft.
 for(const [z,y,aft] of [[-23,3.3,false],[-15.5,4.7,false],[24,3.3,true]]){
  const turn=aft?1:-1;
  model.add(cylinder(2.7,y-2.3,dark,'Barbette',[0,(y+3.3)/2-.5,z]),block([4.6,1.7,5.2],grey,'TurretHouse',[0,y+1.05,z+turn*.3]));
  for(const x of [-1.25,0,1.25])model.add(rod([x,y+1.15,z+turn*2.6],[x,y+1.7,z+turn*11.2],.3,dark,'GunBarrel',12));
 }
 for(const side of [-1,1])for(const z of [-2,5,12]){
  model.add(block([1.5,.9,1.7],grey,'SecondaryMount',[side*4,3.85,z]),rod([side*4.3,4.1,z],[side*6.6,4.6,z-1.2],.11,dark,'SecondaryBarrel'));
  model.add(oval([.6,.55,1.7],0xd9d6c8,'WarBoat',[side*3.2,5.95,z+2]));
 }
 for(const side of [-1,1]){
  const points=[[side*.6,4.75,-34.5],[side*2.9,4.3,-27],[side*4.6,4.05,-14],[side*5.05,4,6],[side*4.7,4,24],[side*3.5,4.05,35]];
  model.add(tube(points,.05,0xb8c3c3,'WarRail',40,5));
  for(let i=1;i<points.length;i++)model.add(rod([points[i][0],3.3,points[i][2]],points[i],.045,0xb8c3c3,'WarRailPost'));
  model.add(rod([side*1.2,4.5,-33],[side*1.3,2.2,-33.4],.16,0x2a2d2f,'AnchorChain'));
 }
 const screw=group('Screw');screw.position.set(0,-2.6,35.2);model.add(screw);
 for(let i=0;i<4;i++){const blade=block([.3,2.6,.5],0xa88b4a,'ScrewBlade',[0,0,0]);blade.rotation.z=i*Math.PI/4;screw.add(blade);}
 model.add(block([.3,3.2,2.6],dark,'Rudder',[0,-2,34]));
 return model;
}

export function ferry(){
 const model=group('Ferry'),white=0xeeeee6,blue=0x24507a;
 const frames=[[-24,.3,3.4,-.4],[-20,2.6,3,-2.2],[-12,4.4,2.7,-2.7],[0,4.7,2.6,-2.8],[16,4.7,2.6,-2.8],[23,4.3,2.6,-2.3],[24,4,2.7,-1.2]];
 model.add(shipHull(frames,white,'FerryHull',0x2c4a66));
 const deck=deckOf(frames,0x6f8a86,'FerryDeck');deck.position.y=2.7;model.add(deck);
 // Three passenger decks, each set back from the one below.
 for(const [width,height,length,y,z] of [[8.6,2.5,36,4,1],[7.8,2.3,31,6.4,2],[6.2,2.1,12,8.6,-7.5]]){
  model.add(block([width,height,length],white,'FerryCabin',[0,y,z]));
  for(const side of [-1,1])model.add(block([.08,height*.42,length-2],0x1f3d4d,'CabinWindow',[side*(width/2+.02),y+.2,z]));
  model.add(block([width-1.2,height*.42,.08],0x1f3d4d,'CabinWindowFront',[0,y+.2,z-length/2-.02]));
 }
 for(const side of [-1,1]){
  model.add(block([.1,.7,40],blue,'FerryStripe',[side*4.62,1.5,2]));
  for(const z of [-4,3,10])model.add(oval([.55,.5,1.6],0xe8762b,'Lifeboat',[side*4.25,7.9,z]),rod([side*3.9,7.4,z-.9],[side*4.3,8.8,z-.9],.05,0x9aa5a6,'Davit'));
  const points=[[side*1.2,4.5,-22.6],[side*3.5,3.95,-15],[side*4.55,3.75,-6]];
  model.add(tube(points,.045,0xc8d0d0,'FerryRail',20,5));
 }
 model.add(block([2.6,3.6,3.8],0xc8452f,'FerryFunnel',[0,9.4,10]),block([2.7,.5,3.9],0x1d2021,'FunnelBand',[0,11,10]));
 model.add(rod([0,9.6,-9],[0,13.2,-9],.09,0x9aa5a6,'FerryMast'),block([1.6,.2,.3],0xdfe4e1,'FerryRadar',[0,12.6,-9]));
 model.add(block([7,.25,3.4],0x55646a,'CarRamp',[0,2.9,23.6]));
 const screw=group('Screw');screw.position.set(0,-1.9,23.6);model.add(screw);
 for(let i=0;i<4;i++){const blade=block([.22,2,.4],0xa88b4a,'ScrewBlade');blade.rotation.z=i*Math.PI/4;screw.add(blade);}
 return model;
}

export function submarine(){
 const model=group('Submarine'),hide=0x2c353b,dark=0x1b2125;
 model.add(spindle([[-22,.02],[-21.6,.9],[-20,2],[-16,2.8],[-6,3.1],[9,3.1],[15,2.5],[19.5,1.2],[21.6,.35],[22,.05]],hide,'SubHull',36));
 // The sail, with its planes and masts.
 const sail=oval([1.05,2.3,3.7],hide,'SubSail',[0,3.9,-5.5]);model.add(sail,block([1.7,.5,5.4],hide,'SailTop',[0,5.75,-5.5]));
 model.add(block([6.4,.22,1.7],dark,'SailPlane',[0,4.7,-6.4]));
 model.add(rod([0,5.9,-6.6],[0,8.4,-6.6],.09,0x8a9597,'Periscope'),rod([0,5.9,-5],[0,7.6,-5],.13,0x8a9597,'Snorkel'),rod([.3,5.9,-4],[.3,8.9,-4],.05,0x8a9597,'Antenna'));
 model.add(block([1.4,.12,30],dark,'SubDeck',[0,3.02,2]));
 for(const side of [-1,1]){
  model.add(oval([.34,.34,.5],dark,'TorpedoDoor',[side*.95,.6,-20.6]),oval([.34,.34,.5],dark,'TorpedoDoor',[side*.95,-.5,-20.6]));
  model.add(block([.05,.5,26],0x394349,'FlankSeam',[side*3.05,.2,2]));
 }
 // Cruciform tail and a seven-bladed screw.
 model.add(block([8.4,.26,2.4],dark,'SternPlane',[0,0,18.6]),block([.26,8.4,2.4],dark,'SubRudder',[0,0,18.6]));
 const screw=group('Screw');screw.position.set(0,0,22.1);model.add(screw);
 screw.add(oval([.34,.34,.6],0x8f7a44,'ScrewHub'));
 for(let i=0;i<7;i++){const blade=block([.5,1.9,.08],0xa88b4a,'ScrewBlade',[0,0,0]);blade.geometry=blade.geometry.clone();blade.geometry.translate(0,1.1,0);blade.geometry.rotateY(.5);blade.rotation.z=i*Math.PI*2/7;screw.add(blade);}
 return model;
}

export function helicopter(){
 const model=group('Helicopter'),green=0x4d5a4f,dark=0x2a302c;
 const pod=spindle([[-3.4,.02],[-3.2,.5],[-2.4,1.05],[-1,1.35],[.6,1.35],[1.9,1],[2.8,.45],[3.1,.3]],green,'HeliBody');pod.scale.set(.86,1,1);model.add(pod);
 model.add(oval([.72,.62,1.05],0x1d3a44,'CockpitWindow',[0,.38,-2.25]));
 model.add(rod([0,.45,2.6],[0,.95,8],.3,green,'TailBoom',12),block([.14,2,1.1],green,'TailFin',[0,1.75,7.9]),block([2.2,.1,.7],green,'Stabiliser',[0,1,7.4]));
 const tailRotor=group('TailRotor');tailRotor.position.set(.24,1.9,8);model.add(tailRotor);
 tailRotor.add(block([.05,2.1,.18],dark,'TailBlade'),block([.05,.18,2.1],dark,'TailBlade'));
 model.add(block([1.5,.55,2.4],green,'EngineCowl',[0,1.5,.3]),rod([0,1.6,0],[0,2.25,0],.14,dark,'RotorMast'));
 const rotor=group('Rotor');rotor.position.set(0,2.3,0);model.add(rotor);
 rotor.add(oval([.3,.12,.3],dark,'RotorHub'));
 for(let i=0;i<4;i++){const blade=block([.36,.05,5.9],dark,'RotorBlade');blade.geometry=blade.geometry.clone();blade.geometry.translate(0,0,3.1);blade.rotation.y=i*Math.PI/2;rotor.add(blade);}
 for(const side of [-1,1]){
  model.add(rod([side*1.05,-1.75,-2],[side*1.05,-1.75,2],.07,dark,'Skid'),rod([side*.7,-1,-1.2],[side*1.05,-1.75,-1.2],.05,dark,'SkidStrut'),rod([side*.7,-1,1.2],[side*1.05,-1.75,1.2],.05,dark,'SkidStrut'));
  // Stub wings carry the rocket pods.
  model.add(block([1.5,.12,.9],green,'StubWing',[side*1.55,-.1,.2]),oval([.26,.26,.9],dark,'RocketPod',[side*2.1,-.35,.1]));
  model.add(block([.05,.6,1.1],0x1d3a44,'DoorWindow',[side*1.13,.4,-.5]));
 }
 model.add(rod([0,-1.05,-2.2],[0,-1.25,-3.5],.07,dark,'ChinGun'),oval([.3,.26,.4],dark,'GunTurret',[0,-1.1,-2.1]));
 return model;
}

export function shrimp(){
 const model=group('Shrimp'),shell=0xe58e6d,pale=0xf3c2a6;
 model.add(oval([.075,.085,.2],shell,'Carapace',[0,.02,-.2]));
 const rostrum=mesh(new THREE.ConeGeometry(.02,.16,6),shell,'Rostrum',[0,.06,-.45]);rostrum.rotation.x=-Math.PI/2;model.add(rostrum);
 // The abdomen curls down and back in overlapping plates.
 const curl=[[0,.01,-.02,.07],[0,-.005,.08,.064],[0,-.03,.17,.056],[0,-.065,.25,.047],[0,-.105,.31,.038]];
 curl.forEach(([x,y,z,r],i)=>{const plate=oval([r,r*1.05,.07],i%2?shell:pale,'AbdomenPlate',[x,y,z]);plate.rotation.x=.18+i*.16;model.add(plate);});
 const tail=group('TailV');tail.position.set(0,-.13,.35);model.add(tail);
 for(const angle of [-.7,-.25,.25,.7]){const blade=foil([[-.025,0],[.025,0],[.04,.13],[-.04,.13]],.008,pale,'TailFan');blade.rotation.set(Math.PI/2+.5,0,0);blade.rotation.y=angle;tail.add(blade);}
 for(const side of [-1,1]){
  model.add(oval([.016,.016,.016],0x0c0a0a,'ShrimpEye',[side*.05,.07,-.36]));
  model.add(tube([[side*.03,.05,-.38],[side*.1,.12,-.55],[side*.22,.16,-.3],[side*.3,.14,.1]],.004,pale,'Antenna',16,4));
  model.add(tube([[side*.02,.04,-.38],[side*.04,.03,-.5],[side*.07,0,-.58]],.004,pale,'Antennule',8,4));
  for(let i=0;i<5;i++)model.add(rod([side*.04,-.05,-.3+i*.05],[side*.09,-.17,-.33+i*.055],.006,pale,'WalkingLeg',5));
  for(let i=0;i<4;i++)model.add(oval([.012,.035,.014],pale,'Swimmeret',[side*.03,-.07-i*.022,.04+i*.07]));
 }
 return model;
}

export function crab(){
 const model=group('Crab'),shell=0xb5553a,pale=0xe2b58c;
 model.add(oval([.34,.11,.25],shell,'CrabShell',[0,.05,0]),oval([.3,.07,.22],pale,'CrabBelly',[0,-.02,0]));
 for(let i=0;i<5;i++)model.add(oval([.03,.02,.03],0x8f3f2a,'ShellSpine',[-.2+i*.1,.13,-.17+Math.abs(i-2)*.02]));
 for(const side of [-1,1]){
  model.add(rod([side*.07,.08,-.2],[side*.08,.17,-.24],.012,pale,'EyeStalk',5),oval([.02,.02,.02],0x0a0a0a,'CrabEye',[side*.08,.18,-.24]));
  // Heavy claws held out in front.
  model.add(rod([side*.26,.03,-.12],[side*.38,.06,-.3],.035,shell,'ClawArm',6),oval([.07,.05,.11],shell,'Claw',[side*.36,.07,-.4]),oval([.03,.02,.08],pale,'ClawTip',[side*.33,.035,-.46]));
  // Four walking legs on each side swing together about the shell's edge.
  const legs=group(side<0?'LegL':'LegR');legs.position.set(side*.28,.02,.02);model.add(legs);
  for(let i=0;i<4;i++){
   const z=-.1+i*.085,knee=[side*.2,.1,z*1.5],foot=[side*.33,-.16,z*2.1];
   legs.add(rod([0,0,z],knee,.02,shell,'LegUpper',5),rod(knee,foot,.013,pale,'LegLower',5));
  }
 }
 return model;
}

export function squid(){
 const model=group('Squid'),skin=0xc8695c,pale=0xe9c1b0;
 const mantle=spindle([[-.5,.004],[-.46,.035],[-.3,.085],[-.05,.105],[.12,.1],[.17,.08]],skin,'SquidMantle',20);model.add(mantle);
 for(const side of [-1,1]){
  // Triangular fins at the tip of the mantle.
  const flap=foil([[0,-.48],[side*.17,-.3],[0,-.2]],.012,skin,'SquidFin');flap.rotation.x=Math.PI/2;model.add(flap);
  model.add(oval([.022,.03,.03],0x0b0c10,'SquidEye',[side*.062,.005,.235]),oval([.028,.036,.034],0xe8e0c8,'SquidEyeRing',[side*.055,.005,.235]));
 }
 model.add(oval([.07,.065,.08],pale,'SquidHead',[0,0,.23]));
 // Arms trail behind the head and pulse with each stroke.
 const arms=group('TailV');arms.position.set(0,0,.28);model.add(arms);
 for(let i=0;i<8;i++){
  const angle=i/8*Math.PI*2,x=Math.cos(angle),y=Math.sin(angle);
  arms.add(tube([[x*.03,y*.03,0],[x*.055,y*.055,.12],[x*.06,y*.06,.22],[x*.04,y*.04,.3]],.012,pale,'SquidArm',10,5));
 }
 for(const side of [-1,1]){
  arms.add(tube([[side*.02,-.01,0],[side*.05,-.03,.2],[side*.04,-.02,.4],[side*.06,0,.5]],.008,skin,'Tentacle',14,5),oval([.02,.014,.05],skin,'TentacleClub',[side*.062,.002,.53]));
 }
 return model;
}
