varying vec3 vSkyDirection;
void main(){
 vSkyDirection=position;
 vec4 clip=projectionMatrix*modelViewMatrix*vec4(position,1.0);
 gl_Position=clip.xyww;
}
