uniform float uSubmerged;
varying vec3 vSkyDirection;
float hashSky(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noiseSky(vec2 p){
 vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
 return mix(mix(hashSky(i),hashSky(i+vec2(1,0)),f.x),mix(hashSky(i+vec2(0,1)),hashSky(i+vec2(1,1)),f.x),f.y);
}
void main(){
 vec3 d=normalize(vSkyDirection);
 float h=max(d.y,0.0);
 vec3 color=mix(vec3(.63,.78,.81),vec3(.08,.32,.59),pow(h,.38));
 vec3 sun=normalize(vec3(-.5,.75,-.35));
 float glow=max(0.0,dot(d,sun));
 color+=vec3(1.0,.77,.46)*pow(glow,32.0)*.18;
 color+=vec3(6.0,4.6,3.0)*smoothstep(.9992,.9998,glow);
 vec2 uv=d.xz/(max(d.y,.05)+.18)*1.8;
 float cloud=noiseSky(uv)*.54+noiseSky(uv*2.04)*.27+noiseSky(uv*4.03)*.13+noiseSky(uv*8.01)*.06;
 float coverage=smoothstep(.55,.72,cloud)*smoothstep(.015,.14,h);
 color=mix(color,mix(vec3(.57,.66,.70),vec3(1.3,1.25,1.10),smoothstep(.53,.73,cloud)),coverage*.92);
 gl_FragColor=vec4(color,1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 // Scene fog is not tone mapped, so match its underwater color after output conversion.
 gl_FragColor.rgb=mix(gl_FragColor.rgb,linearToOutputTexel(vec4(.006,.08,.12,1.0)).rgb,uSubmerged);
}
