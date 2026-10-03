#ifdef SURFACE_SAND
 float grain=surfaceNoise(vMarineWorld.xz*55.0);
 float patches=surfaceNoise(vMarineWorld.xz*.7);
 float wet=1.0-smoothstep(.1,1.5,vMarineWorld.y);
 float grainFade=1.0-smoothstep(.3,1.0,max(fwidth(vMarineWorld.x),fwidth(vMarineWorld.z))*55.0);
 diffuseColor.rgb*=mix(.92,1.04,patches)*mix(1.0,mix(.96,1.04,grain),grainFade)*mix(1.0,.76,wet);
#elif defined(SURFACE_SKIN)
 float mottle=surfaceNoise(vSurfaceLocal.xz*3.5+vSurfaceLocal.y);
 float spots=smoothstep(.54,.8,surfaceNoise(vSurfaceLocal.xz*8.0+vSurfaceLocal.y*3.0));
 diffuseColor.rgb*=mix(.78,1.13,mottle)*(1.0-spots*.18);
#elif defined(SURFACE_HIDE)
 // Smooth shark skin: soft blotches only, no visible scales.
 diffuseColor.rgb*=mix(.9,1.07,surfaceNoise(vSurfaceLocal.xz*2.6+vSurfaceLocal.y*1.7));
#elif defined(SURFACE_ROCK)
 float weathering=surfaceNoise(vSurfaceLocal.xz*6.0+vSurfaceLocal.y);
 diffuseColor.rgb*=mix(.65,1.18,weathering);
#elif defined(SURFACE_WOOD)
 float woodGrain=sin(vSurfaceLocal.z*86.0+surfaceNoise(vSurfaceLocal.xz*2.0)*8.0)*.5+.5;
 diffuseColor.rgb*=mix(.72,1.12,woodGrain);
#elif defined(SURFACE_FABRIC)
 diffuseColor.rgb*=.96+.04*sin(vSurfaceLocal.x*145.0)*sin(vSurfaceLocal.z*145.0);
#endif
