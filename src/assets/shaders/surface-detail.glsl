varying vec3 vSurfaceLocal;
float surfaceHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float surfaceNoise(vec2 p){
 vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
 return mix(mix(surfaceHash(i),surfaceHash(i+vec2(1,0)),f.x),mix(surfaceHash(i+vec2(0,1)),surfaceHash(i+vec2(1,1)),f.x),f.y);
}
float surfaceHeightDetail(vec3 p){
 #ifdef SURFACE_SAND
 float ripple=sin(p.x*3.8+sin(p.z*.85)*1.7+surfaceNoise(p.xz*.4)*2.0);
 float grainFade=1.0-smoothstep(.3,1.0,max(fwidth(p.x),fwidth(p.z))*48.0);
 return ripple*.008+surfaceNoise(p.xz*48.0)*.0005*grainFade;
 #elif defined(SURFACE_SKIN)
 vec2 uv=vec2(p.z*26.0,(p.y+p.x*.7)*32.0);
 float scaleFade=1.0-smoothstep(.3,.9,max(fwidth(uv.x),fwidth(uv.y)));
 uv.x+=mod(floor(uv.y),2.0)*.5;
 vec2 cell=fract(uv)-.5;
 return (1.0-smoothstep(.15,.48,length(cell*vec2(.8,1.0))))*.0014*scaleFade;
 #elif defined(SURFACE_ROCK)
 return surfaceNoise(p.xz*3.4+p.y)*.10+surfaceNoise(p.xy*21.0)*.013;
 #elif defined(SURFACE_WOOD)
 return sin(p.z*94.0+surfaceNoise(p.xz*5.0)*4.0)*.004;
 #elif defined(SURFACE_FABRIC)
 return (sin(p.x*145.0)*sin(p.z*145.0))*.0018;
 #else
 return 0.0;
 #endif
}
vec3 surfaceBump(vec3 eyePosition,vec3 n,float height){
 vec3 dx=dFdx(eyePosition),dy=dFdy(eyePosition);
 vec3 r1=cross(dy,n),r2=cross(n,dx);
 float determinant=dot(dx,r1);
 vec3 gradient=sign(determinant)*(dFdx(height)*r1+dFdy(height)*r2);
 return normalize(abs(determinant)*n-gradient);
}
