uniform float uTime;
uniform mat4 textureMatrix;
varying vec4 vMirror;
varying vec3 vWorld;
varying vec3 vWaveNormal;
varying float vHeight;
void main(){
 vec3 p=(modelMatrix*vec4(position,1.0)).xyz;
 vec2 xz=p.xz;
 float a=dot(xz,vec2(.072,.038))+uTime*.8;
 float b=dot(xz,vec2(-.11,.085))+uTime*1.15;
 float c=dot(xz,vec2(.19,-.14))+uTime*1.7;
 float h=.52*sin(a)+.25*sin(b)+.12*sin(c);
 vec2 slope=.52*cos(a)*vec2(.072,.038)+.25*cos(b)*vec2(-.11,.085)+.12*cos(c)*vec2(.19,-.14);
 p.y+=h;
 vHeight=h;
 vWaveNormal=normalize(vec3(-slope.x,1.0,-slope.y));
 vWorld=p;
 vMirror=textureMatrix*vec4(p,1.0);
 gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.0);
}
