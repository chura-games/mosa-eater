import profile from '../assets/maps/coast.profile.json';
import {MathUtils} from 'three';
export const playBounds={halfWidth:profile.playHalfWidth,minZ:profile.playMinZ,maxZ:profile.playMaxZ};
export function shoreZ(x:number){return profile.shoreZ+profile.curveAmplitude*Math.sin(x*profile.curveFrequency)+2*Math.sin(x*.041);}
export function groundHeight(x:number,z:number){
 const d=shoreZ(x)-z;
 // Keep in sync with scripts/models/beach.mjs and the ground formula in shaders/water.frag.
 if(d<0)return -profile.floorDepth*Math.tanh(-d*profile.seaSlope/profile.floorDepth)+.6*Math.sin(x*.083+1)*Math.sin(z*.071)*MathUtils.smoothstep(-d,4,24);
 return d*profile.beachSlope+MathUtils.smoothstep(d,12,50)*(1+.65*Math.sin(x*.02))*(.6+.4*Math.sin(d*.035));
}
