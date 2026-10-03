uniform float uTime;
uniform float uUnderwater;
uniform vec4 uPredator;
uniform vec2 uForward;
uniform vec4 uBoats[10];
uniform vec4 uCoast;
uniform vec2 uBeach;
uniform vec4 uRipples[8];
uniform float uMirror;
uniform sampler2D mirrorSampler;
varying vec4 vMirror;
varying vec3 vWorld;
varying vec3 vWaveNormal;
varying float vHeight;
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
 float ground=land<0.0?-uBeach.y*tanh(-land*uCoast.w/uBeach.y)+.6*sin(p.x*.083+1.0)*sin(p.y*.071)*smoothstep(4.0,24.0,-land):land*uBeach.x+smoothstep(12.0,50.0,land)*(1.0+.65*sin(p.x*.02))*(.6+.4*sin(land*.035));
 float depth=max(0.0,vWorld.y-ground);
 if(ground>vWorld.y+.05)discard;
 vec2 flow=p*.46+vec2(uTime*.24,uTime*.13);
 float ripple=noise(flow);
 vec2 turbulence=vec2(noise(flow+vec2(.12,0.0))-ripple,noise(flow+vec2(0.0,.12))-ripple);
 vec2 ripples=turbulence*.75+vec2(cos(p.x*.87+p.y*.63+uTime*2.0),cos(p.y*1.23-p.x*.4-uTime*1.6))*.022;
 // Rings from anything that broke the surface, and the water heaving over a body just beneath it.
 float ringFoam=0.0;
 for(int i=0;i<8;i++){
  vec2 away=p-uRipples[i].xy;
  float age=uTime-uRipples[i].z,reach=length(away),front=age*5.5;
  float envelope=uRipples[i].w*exp(-age*.55)*exp(-abs(reach-front*.6)*.22)*step(reach,front+1.0)*step(age,9.0);
  float wave=sin((reach-front)*2.1)*envelope;
  ripples+=away/max(reach,.2)*wave*.34;
  ringFoam+=max(0.0,wave-.55)*envelope;
 }
 vec2 fromBody=p-uPredator.xz;
 float nearSurface=1.0-smoothstep(.6,3.2,abs(uPredator.y));
 float bodyReach=length(fromBody);
 ripples+=fromBody/max(bodyReach,.2)*sin(bodyReach*2.6-uTime*5.0)*exp(-bodyReach*.16)*nearSurface*(.1+min(uPredator.w,12.0)*.012);
 vec3 normal=normalize(vWaveNormal+vec3(ripples.x,0.0,ripples.y));
 if(!gl_FrontFacing)normal=-normal;
 vec3 viewDir=normalize(cameraPosition-vWorld);
 float fresnel=.04+.96*pow(1.0-abs(dot(normal,viewDir)),5.0);
 vec3 shallow=vec3(.018,.38,.32),deep=vec3(.007,.068,.13);
 vec3 water=mix(shallow,deep,smoothstep(.0,28.0,depth));
 vec3 reflectedSky=mix(vec3(.20,.47,.57),vec3(.72,.86,.90),clamp(reflect(-viewDir,normal).y,0.0,1.0));
 vec2 mirrorUV=vMirror.xy/max(vMirror.w,.001)+normal.xz*.023;
 vec3 reflection=texture2D(mirrorSampler,clamp(mirrorUV,.001,.999)).rgb;
 reflectedSky=mix(reflection,reflectedSky,max(uUnderwater,1.0-uMirror));
 vec3 color=mix(water,reflectedSky,fresnel*.92);
 vec3 sun=normalize(vec3(-.5,.75,-.35));
 float highlight=max(0.0,dot(reflect(-sun,normal),viewDir));
 color+=vec3(1.0,.88,.65)*(pow(highlight,140.0)*1.2+pow(highlight,22.0)*.08);
 float shoreDistance=abs(land+vHeight/max(uCoast.w,.01));
 float swash=sin(shoreDistance*2.4-uTime*1.8+noise(p*.7)*2.0)*.5+.5;
 float shore=(1.0-smoothstep(.15,1.8,depth))*smoothstep(.35,.8,swash)*smoothstep(.3,.6,foamPattern(p*1.7));
 float crest=smoothstep(.62,.86,vHeight)*smoothstep(.52,.72,foamPattern(p));
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
 float foam=clamp(shore+crest*.25+wake*.7+ringFoam*.8,0.0,.92);
 color=mix(color,vec3(.83,.95,.92),foam);
 float alpha=mix(.24,.86,smoothstep(.0,18.0,depth));
 alpha=mix(alpha,.96,fresnel);alpha=max(alpha,foam*.9);
 color=mix(color,vec3(.06,.30,.36),uUnderwater*.48);
 alpha=mix(alpha,.42,uUnderwater);
 float fog=1.0-exp(-pow(length(cameraPosition-vWorld)*mix(.0022,.018,uUnderwater),2.0));
 gl_FragColor=vec4(color,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 // Scene fog is not tone mapped, so blend toward the same fog colors after output conversion.
 gl_FragColor.rgb=mix(gl_FragColor.rgb,linearToOutputTexel(vec4(mix(vec3(.337,.578,.638),vec3(.006,.08,.12),uUnderwater),1.0)).rgb,fog);
}
