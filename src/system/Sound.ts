// All sound is synthesised with Web Audio: no audio files.
// Layout: sources -> sfx bus -> underwater low-pass -> master -> speakers.
export class Sound{
 private context?:AudioContext;
 private master!:GainNode;private muffle!:BiquadFilterNode;private bus!:GainNode;
 private noise!:AudioBuffer;
 private sea!:GainNode;private deep!:GainNode;private rush!:GainNode;private rushTone!:BiquadFilterNode;private dread!:GainNode;
 private level=.7;private muted=false;private nextGull=0;
 get enabled(){return !this.muted;}
 get volume(){return this.level;}
 // Browsers only allow audio after a key press or click, so this is called from one.
 start(){
  if(this.context){void this.context.resume();return;}
  const context=this.context=new AudioContext();
  this.master=context.createGain();this.master.gain.value=this.muted?0:this.level;this.master.connect(context.destination);
  this.muffle=context.createBiquadFilter();this.muffle.type='lowpass';this.muffle.frequency.value=18000;this.muffle.connect(this.master);
  this.bus=context.createGain();this.bus.connect(this.muffle);
  // Two seconds of brown-ish noise: the raw material for water, crunches and tearing.
  this.noise=context.createBuffer(1,context.sampleRate*2,context.sampleRate);
  const samples=this.noise.getChannelData(0);let last=0;
  for(let i=0;i<samples.length;i++){const white=Math.random()*2-1;last=(last+.045*white)/1.045;samples[i]=last*2.6+white*.25;}
  const loop=(type:BiquadFilterType,frequency:number,q:number)=>{
   const source=context.createBufferSource();source.buffer=this.noise;source.loop=true;
   const filter=context.createBiquadFilter();filter.type=type;filter.frequency.value=frequency;filter.Q.value=q;
   const gain=context.createGain();gain.gain.value=0;source.connect(filter).connect(gain).connect(this.bus);source.start();
   return {filter,gain};
  };
  // Surf above the water, a low rumble below it, and water rushing past the body.
  const sea=loop('bandpass',650,.6);this.sea=sea.gain;
  const swell=context.createOscillator(),depth=context.createGain();swell.frequency.value=.13;depth.gain.value=260;swell.connect(depth).connect(sea.filter.frequency);swell.start();
  this.deep=loop('lowpass',170,.8).gain;
  const rush=loop('bandpass',420,.9);this.rush=rush.gain;this.rushTone=rush.filter;
  // A low two-note drone that swells as the coast panics.
  this.dread=context.createGain();this.dread.gain.value=0;
  const cut=context.createBiquadFilter();cut.type='lowpass';cut.frequency.value=210;cut.connect(this.dread).connect(this.master);
  for(const frequency of [55,58.3,82.4]){const voice=context.createOscillator();voice.type='sawtooth';voice.frequency.value=frequency;voice.connect(cut);voice.start();}
 }
 setVolume(volume:number){this.level=volume;this.apply();}
 setEnabled(enabled:boolean){this.muted=!enabled;this.apply();}
 private apply(){if(this.context)this.master.gain.setTargetAtTime(this.muted?0:this.level,this.context.currentTime,.05);}
 suspend(paused:boolean){if(this.context)void(paused?this.context.suspend():this.context.resume());}
 // Called every frame: submerged 0..1, speed in m/s, panic 0..100.
 update(submerged:number,speed:number,panic:number){
  const context=this.context;if(!context)return;
  const now=context.currentTime;
  this.muffle.frequency.setTargetAtTime(18000-submerged*17150,now,.08);
  this.sea.gain.setTargetAtTime((1-submerged)*.16,now,.2);
  this.deep.gain.setTargetAtTime(submerged*.5,now,.2);
  this.rush.gain.setTargetAtTime(Math.min(.34,speed*.014),now,.12);this.rushTone.frequency.setTargetAtTime(300+speed*38,now,.12);
  this.dread.gain.setTargetAtTime(Math.min(.2,panic*.0024),now,.8);
  if(submerged<.5&&now>this.nextGull){this.nextGull=now+4+Math.random()*9;this.gull();}
 }
 private burst(duration:number,type:BiquadFilterType,from:number,to:number,q:number,volume:number,delay=0,attack=.004){
  const context=this.context!,start=context.currentTime+delay;
  const source=context.createBufferSource();source.buffer=this.noise;source.playbackRate.value=.7+Math.random()*.6;
  const filter=context.createBiquadFilter();filter.type=type;filter.Q.value=q;
  filter.frequency.setValueAtTime(from,start);filter.frequency.exponentialRampToValueAtTime(Math.max(30,to),start+duration);
  const gain=context.createGain();gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(volume,start+attack);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  source.connect(filter).connect(gain).connect(this.bus);source.start(start,Math.random()*1.2,duration+.05);
 }
 private tone(type:OscillatorType,from:number,to:number,duration:number,volume:number,delay=0,attack=.005){
  const context=this.context!,start=context.currentTime+delay,voice=context.createOscillator(),gain=context.createGain();
  voice.type=type;voice.frequency.setValueAtTime(from,start);voice.frequency.exponentialRampToValueAtTime(Math.max(20,to),start+duration);
  gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(volume,start+attack);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  voice.connect(gain).connect(this.bus);voice.start(start);voice.stop(start+duration+.05);
 }
 // Jaws snapping shut: a hard clack over a rush of displaced water.
 snap(){if(!this.context)return;this.burst(.07,'highpass',2400,900,.7,.5);this.tone('square',170,60,.09,.22);this.burst(.3,'bandpass',700,180,.8,.3,.02);}
 // Teeth through a body: bone cracks, then wet tearing. size ~0.5 (fish) to 2 (orca).
 crunch(size=1){
  if(!this.context)return;
  this.tone('sine',95,34,.35,.75);
  for(let i=0;i<Math.round(2+size*2);i++)this.burst(.05,'bandpass',900+Math.random()*1700,400,6,.5,i*.045+Math.random()*.02);
  this.burst(.5+size*.2,'bandpass',1300,240,2.2,.5,.06,.03);this.burst(.4,'lowpass',500,90,1,.6,.05);
 }
 // One wet rip, for each shake of a body in the jaws.
 tear(){if(!this.context)return;this.burst(.24,'bandpass',1500+Math.random()*500,300,2.6,.42,0,.02);this.burst(.06,'bandpass',1400+Math.random()*900,500,7,.34,.05);this.tone('sine',70,40,.16,.3);}
 gulp(){if(!this.context)return;this.tone('sine',210,70,.2,.4);this.burst(.2,'lowpass',420,110,3,.45,.04);this.tone('sine',120,52,.18,.3,.17);}
 // A short cry, cut off. Underwater it comes through as a muffled burble.
 scream(){
  if(!this.context)return;
  const context=this.context,start=context.currentTime,voice=context.createOscillator(),formant=context.createBiquadFilter(),gain=context.createGain();
  voice.type='sawtooth';voice.frequency.setValueAtTime(420+Math.random()*120,start);voice.frequency.linearRampToValueAtTime(820+Math.random()*200,start+.12);voice.frequency.linearRampToValueAtTime(520,start+.34);
  formant.type='bandpass';formant.frequency.value=1250;formant.Q.value=2.2;
  gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(.2,start+.03);gain.gain.setValueAtTime(.2,start+.26);gain.gain.linearRampToValueAtTime(.0001,start+.36);
  voice.connect(formant).connect(gain).connect(this.bus);voice.start(start);voice.stop(start+.4);
  this.burst(.45,'bandpass',900,2200,1.5,.14,.05,.05);
 }
 // A hull giving way: a deep impact, splintering, and ringing metal for steel boats.
 smash(size=1,metal=false){
  if(!this.context)return;
  this.tone('sine',80,28,.6,.9);this.burst(.7,'lowpass',900,80,.8,.75);
  for(let i=0;i<Math.round(5+size*4);i++)this.burst(.06+Math.random()*.08,'bandpass',500+Math.random()*2600,300,5,.4,Math.random()*.4);
  if(metal)for(const frequency of [310,467,733])this.tone('triangle',frequency*(.95+Math.random()*.1),frequency*.9,.9,.1,Math.random()*.08);
 }
 thud(){if(!this.context)return;this.tone('sine',110,40,.25,.6);this.burst(.2,'bandpass',800,250,3,.4);}
 splash(size=1){if(!this.context)return;this.burst(.5+size*.3,'bandpass',1600,500,.7,.3*Math.min(1.4,size),0,.02);this.burst(.3,'highpass',3000,1800,.5,.14,.03);}
 sonar(){if(!this.context)return;for(let echo=0;echo<4;echo++)this.tone('sine',1180,1150,.7,.3*Math.pow(.42,echo),echo*.38,.004);}
 // Growing: a rising, vibrating roar from deep in the chest.
 roar(){
  if(!this.context)return;
  const context=this.context,start=context.currentTime,filter=context.createBiquadFilter(),gain=context.createGain(),wobble=context.createOscillator(),depth=context.createGain();
  filter.type='lowpass';filter.frequency.setValueAtTime(240,start);filter.frequency.linearRampToValueAtTime(900,start+.5);filter.frequency.linearRampToValueAtTime(260,start+1.5);
  gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(.5,start+.25);gain.gain.exponentialRampToValueAtTime(.0001,start+1.6);
  wobble.frequency.value=27;depth.gain.value=9;wobble.connect(depth);wobble.start(start);wobble.stop(start+1.7);
  for(const base of [52,78.5]){const voice=context.createOscillator();voice.type='sawtooth';voice.frequency.setValueAtTime(base,start);voice.frequency.linearRampToValueAtTime(base*1.6,start+.5);voice.frequency.linearRampToValueAtTime(base*.8,start+1.6);depth.connect(voice.frequency);voice.connect(filter);voice.start(start);voice.stop(start+1.7);}
  filter.connect(gain).connect(this.bus);this.burst(1.3,'bandpass',300,160,1.2,.3,0,.2);
 }
 alarm(){if(!this.context)return;for(let i=0;i<3;i++){this.tone('square',660,660,.16,.1,i*.36);this.tone('square',880,880,.16,.1,i*.36+.18);}}
 click(){if(!this.context)return;this.tone('sine',520,420,.06,.2);}
 private gull(){for(let i=0;i<2+Math.floor(Math.random()*3);i++){const pitch=1500+Math.random()*500;this.tone('sawtooth',pitch,pitch*.62,.2,.02,i*.26,.03);}}
}
