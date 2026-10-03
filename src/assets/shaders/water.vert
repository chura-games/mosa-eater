uniform float uTime;
uniform mat4 textureMatrix;
varying vec4 vMirror;
varying vec3 vWorld;
varying float vHeight;
// Six swells running in towards the shore. Each has a sharp crest and a long flat trough.
// Keep the table in sync with water.frag and surfaceHeight() in system/Water.ts:
// xy = direction * wavenumber, z = amplitude, w = angular speed.
const vec4 swell[6]=vec4[6](
 vec4(.0304,-.0963,.42,.996),vec4(-.0743,-.147,.24,1.27),vec4(.191,-.194,.13,1.64),
 vec4(-.0898,-.44,.075,2.1),vec4(.68,-.288,.04,2.69),vec4(-.966,-.725,.022,3.44));
void main(){
 vec3 p=(modelMatrix*vec4(position,1.0)).xyz;
 float away=length(p.xz-cameraPosition.xz),h=0.0;
 for(int i=0;i<6;i++){
  // Short waves fade out where the sheet is too coarse to carry them.
  float fade=1.0-smoothstep(40.0,90.0,away*length(swell[i].xy));
  float u=.5+.5*sin(dot(p.xz,swell[i].xy)-uTime*swell[i].w);
  h+=swell[i].z*fade*(2.0*u*sqrt(u)-.849);
 }
 p.y+=h;
 vHeight=h;
 vWorld=p;
 vMirror=textureMatrix*vec4(p,1.0);
 gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.0);
}
