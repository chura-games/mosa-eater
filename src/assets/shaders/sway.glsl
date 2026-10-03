// Wind in palm fronds and dune grass, current in kelp. Each placed copy moves out of step.
#if defined(SURFACE_FOLIAGE)||defined(SURFACE_BLADE)||defined(SURFACE_WEED)
vec3 swayOrigin=vec3(0.0);
#ifdef USE_INSTANCING
swayOrigin=instanceMatrix[3].xyz;
#endif
float swayPhase=swayOrigin.x*.37+swayOrigin.z*.23;
#ifdef SURFACE_FOLIAGE
// Distance from the crown of the palm: frond tips travel furthest.
float swayReach=length(position.xz-vec2(1.35,-.3));
transformed+=vec3(sin(uMarineTime*1.3+swayPhase+swayReach),.6*sin(uMarineTime*1.9+swayPhase+swayReach*1.7),cos(uMarineTime*1.1+swayPhase))*swayReach*.035;
#elif defined(SURFACE_BLADE)
transformed.xz+=vec2(sin(uMarineTime*2.1+swayPhase+position.x*3.0),cos(uMarineTime*1.7+swayPhase))*position.y*position.y*.16;
#else
transformed.xz+=vec2(sin(uMarineTime*.9+swayPhase+position.y*.8),cos(uMarineTime*.7+swayPhase+position.y*.6))*position.y*.09;
#endif
#endif
