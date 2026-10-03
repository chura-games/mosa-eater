// Refracted sunlight: a drifting network of bright lines rather than a regular lattice.
vec2 marineUV=vMarineWorld.xz*.11+vMarineWorld.y*.03;
vec2 causticP=mod(marineUV*6.2831853,6.2831853)-250.0,causticI=causticP;
float causticSum=1.0;
for(int n=0;n<4;n++){
 float t=uMarineTime*.45*(1.0-3.5/float(n+1));
 causticI=causticP+vec2(cos(t-causticI.x)+sin(t+causticI.y),sin(t-causticI.y)+cos(t+causticI.x));
 causticSum+=1.0/length(vec2(causticP.x/(sin(causticI.x+t)*200.0),causticP.y/(cos(causticI.y+t)*200.0)));
}
float caustic=pow(abs(1.17-pow(causticSum*.25,1.4)),8.0);
// Fine lines dissolve into an even glow in the distance instead of shimmering.
caustic=mix(caustic,.16,smoothstep(.12,.6,max(fwidth(marineUV.x),fwidth(marineUV.y))*6.0));
float submerged=1.0-smoothstep(-.7,.3,vMarineWorld.y);
float facing=clamp(vMarineUp*.8+.2,0.0,1.0);
float lightFade=exp(min(vMarineWorld.y,0.0)*.035);
gl_FragColor.rgb+=vec3(.20,.30,.24)*caustic*submerged*facing*lightFade;
