uniform float uTime;
uniform float uUnderwater;
uniform float uHaze;
uniform vec4 uPredator;
uniform vec2 uForward;
uniform vec4 uBoats[10];
uniform vec4 uCoast;
uniform vec2 uBeach;
uniform vec3 uDeep;
uniform vec4 uRipples[8];
uniform float uMirror;
uniform sampler2D mirrorSampler;
varying vec4 vMirror;
varying vec3 vWorld;
varying float vHeight;
// Same table as water.vert and surfaceHeight() in system/Water.ts.
const vec4 swell[6]=vec4[6](
 vec4(.0304,-.0963,.42,.996),vec4(-.0743,-.147,.24,1.27),vec4(.191,-.194,.13,1.64),
 vec4(-.0898,-.44,.075,2.1),vec4(.68,-.288,.04,2.69),vec4(-.966,-.725,.022,3.44));
// Wind chop too small for the mesh: it only tilts the surface. xy = direction * wavenumber,
// z = slope, w = angular speed.
const vec4 chop[6]=vec4[6](
 vec4(1.62,-.71,.11,4.2),vec4(-1.1,-2.3,.1,5.0),vec4(3.4,1.2,.085,6.0),
 vec4(-4.1,-3.3,.07,7.2),vec4(2.2,-7.4,.055,8.7),vec4(-9.6,4.2,.04,10.3));
float hash(vec2 p){
 vec3 q=fract(vec3(p.xyx)*.1031);
 q+=dot(q,q.yzx+33.33);
 return fract((q.x+q.y)*q.z);
}
float noise(vec2 p){
 vec2 cell=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
 return mix(mix(hash(cell),hash(cell+vec2(1,0)),f.x),mix(hash(cell+vec2(0,1)),hash(cell+vec2(1,1)),f.x),f.y);
}
float foamPattern(vec2 p){
 // Layered drifting noise breaks foam into irregular streaks instead of a lattice of dots.
 vec2 q=p+vec2(uTime*.11,-uTime*.07);
 return noise(q*.9)*.5+noise(q*2.3+7.1)*.3+noise(q*5.7-3.3)*.2;
}
void main(){
 vec2 p=vWorld.xz;
 float shoreZ=uCoast.x+uCoast.y*sin(p.x*uCoast.z)+2.0*sin(p.x*.041);
 float land=shoreZ-p.y;
 float ground=land<0.0?-uBeach.y*tanh(-land*uCoast.w/uBeach.y)-uDeep.x*smoothstep(uDeep.y,uDeep.z,-land)+.6*sin(p.x*.083+1.0)*sin(p.y*.071)*smoothstep(4.0,24.0,-land):land*uBeach.x+smoothstep(12.0,50.0,land)*(1.0+.65*sin(p.x*.02))*(.6+.4*sin(land*.035));
 float depth=max(0.0,vWorld.y-ground);
 if(ground>vWorld.y+.05)discard;
 float range=length(cameraPosition-vWorld);
 // The slope of the swell is worked out per pixel, so crests stay crisp between vertices.
 vec2 slope=vec2(0.0);
 for(int i=0;i<6;i++){
  float phase=dot(p,swell[i].xy)-uTime*swell[i].w,u=.5+.5*sin(phase);
  slope+=swell[i].xy*swell[i].z*1.5*sqrt(u)*cos(phase);
 }
 // Wind chop rides on the swell, bunching up on the crests and fading with distance.
 float detail=(.25+.75*exp(-range*.007))*(.7+.6*smoothstep(-.3,.6,vHeight));
 vec2 gust=vec2(noise(p*.07+uTime*.03),noise(p*.07-uTime*.025+9.0))-.5;
 for(int i=0;i<6;i++){
  float phase=dot(p+gust*3.0,chop[i].xy)-uTime*chop[i].w;
  slope+=normalize(chop[i].xy)*chop[i].z*cos(phase)*detail;
 }
 vec2 flow=p*.9+vec2(uTime*.31,uTime*.17);
 float grain=noise(flow);
 slope+=(vec2(noise(flow+vec2(.1,0.0)),noise(flow+vec2(0.0,.1)))-grain)*1.5*exp(-range*.02);
 // Rings from anything that broke the surface, and the water heaving over a body just beneath it.
 float ringFoam=0.0;
 for(int i=0;i<8;i++){
  vec2 away=p-uRipples[i].xy;
  float age=uTime-uRipples[i].z,reach=length(away),front=age*5.5;
  float envelope=uRipples[i].w*exp(-age*.55)*exp(-abs(reach-front*.6)*.22)*step(reach,front+1.0)*step(age,9.0);
  float wave=sin((reach-front)*2.1)*envelope;
  slope-=away/max(reach,.2)*wave*.34;
  ringFoam+=max(0.0,wave-.55)*envelope;
 }
 vec2 fromBody=p-uPredator.xz;
 float nearSurface=1.0-smoothstep(.6,3.2,abs(uPredator.y));
 float bodyReach=length(fromBody);
 slope-=fromBody/max(bodyReach,.2)*sin(bodyReach*2.6-uTime*5.0)*exp(-bodyReach*.16)*nearSurface*(.1+min(uPredator.w,12.0)*.012);
 vec3 normal=normalize(vec3(-slope.x,1.0,-slope.y));
 float steep=length(slope);
 vec3 viewDir=normalize(cameraPosition-vWorld);
 vec3 sun=normalize(vec3(-.517,.775,-.362));
 float shoreDistance=abs(land+vHeight/max(uCoast.w,.01));
 float swash=sin(shoreDistance*2.4-uTime*1.8+noise(p*.7)*2.0)*.5+.5;
 float shore=(1.0-smoothstep(.15,1.8,depth))*smoothstep(.35,.8,swash)*smoothstep(.3,.6,foamPattern(p*1.7));
 // Whitecaps form where a crest is both high and steep, and trail behind it in streaks.
 float streaks=foamPattern(p*vec2(.55,1.3));
 float crest=smoothstep(.28,.7,vHeight)*smoothstep(.12,.3,steep)*smoothstep(.4,.66,streaks)+smoothstep(.2,.7,vHeight)*smoothstep(.6,.78,streaks)*.3;
 vec2 relative=p-uPredator.xz;
 float behind=dot(relative,-uForward),side=abs(relative.x*uForward.y-relative.y*uForward.x);
 float wake=exp(-pow((side-behind*.22)*1.6,2.0))*exp(-behind*.15)*step(0.0,behind)*step(behind,16.0);
 wake*=smoothstep(.3,12.0,uPredator.w)*(1.0-smoothstep(1.2,3.2,abs(uPredator.y)));
 for(int i=0;i<10;i++){
  vec2 delta=p-uBoats[i].xy;
  vec2 forward=vec2(sin(uBoats[i].z),cos(uBoats[i].z));
  float trail=dot(delta,-forward),width=abs(delta.x*forward.y-delta.y*forward.x);
  wake+=exp(-pow((width-trail*.2)*1.7,2.0))*exp(-trail*.24)*step(.5,trail)*step(trail,12.0)*uBoats[i].w;
 }
 float foam=clamp(shore+crest*.7+wake*.7+ringFoam*.8,0.0,.92);
 vec3 color;float alpha;
 if(gl_FrontFacing){
  float facing=max(dot(normal,viewDir),0.0);
  float fresnel=.02+.98*pow(1.0-facing,5.0);
  // Clear turquoise over sand, darkening to navy as the light is absorbed with depth.
  vec3 absorbed=exp(-depth*vec3(.42,.085,.055));
  vec3 water=mix(vec3(.004,.05,.11),vec3(.03,.42,.36),absorbed.g);
  // Sunlight passing through the back of a crest glows green towards the viewer.
  float through=pow(max(0.0,dot(viewDir,-sun)*.5+.5),3.0)*smoothstep(-.1,.9,vHeight);
  water+=vec3(.01,.16,.11)*through+vec3(.0,.035,.03)*smoothstep(.0,.8,vHeight);
  vec3 bounce=reflect(-viewDir,normal);bounce.y=abs(bounce.y);
  vec3 reflectedSky=mix(vec3(.50,.70,.80),vec3(.16,.40,.66),pow(clamp(bounce.y,0.0,1.0),.55));
  vec2 mirrorUV=vMirror.xy/max(vMirror.w,.001)+normal.xz*.07;
  vec3 reflection=texture2D(mirrorSampler,clamp(mirrorUV,.001,.999)).rgb;
  reflectedSky=mix(reflectedSky,reflection,uMirror*(1.0-uUnderwater));
  color=mix(water,reflectedSky,fresnel);
  // A tight glint plus the wide sparkling path the sun lays across broken water.
  float glint=max(0.0,dot(bounce,sun));
  color+=vec3(1.0,.9,.7)*(pow(glint,420.0)*2.6+pow(glint,60.0)*.22+pow(glint,9.0)*.035);
  // Foam is lit by the sun and sky rather than being a flat white.
  vec3 foamColor=vec3(.72,.82,.84)+vec3(.24,.19,.12)*max(0.0,dot(normal,sun));
  color=mix(color,foamColor,foam);
  alpha=mix(.2,.9,1.0-absorbed.g);
  alpha=mix(alpha,.97,fresnel);alpha=max(alpha,foam*.92);
 }else{
  // Seen from below, the sky fills a bright window overhead; outside it the surface
  // mirrors the deep.
  float upward=abs(dot(normal,viewDir));
  float window=smoothstep(.6,.74,upward);
  float glint=pow(max(0.0,dot(refract(-viewDir,-normal,.75),sun)),40.0);
  vec3 sky=vec3(.42,.78,.86)+vec3(1.0,.92,.7)*glint*1.5;
  color=mix(vec3(.012,.13,.18),sky,window);
  color=mix(color,vec3(.75,.9,.9),foam*.5);
  alpha=mix(.88,.5,window);
 }
 gl_FragColor=vec4(color,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 // Scene fog is not tone mapped, so blend toward the same fog colors after output conversion.
 float fog=1.0-exp(-pow(range*mix(.0022,uHaze,uUnderwater),2.0));
 gl_FragColor.rgb=mix(gl_FragColor.rgb,linearToOutputTexel(vec4(mix(vec3(.337,.578,.638),vec3(.006,.08,.12),uUnderwater),1.0)).rgb,fog);
}
