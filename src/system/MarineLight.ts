import * as THREE from 'three';
import marineLight from '../assets/shaders/marine-light.frag?raw';
import surfaceDetail from '../assets/shaders/surface-detail.glsl?raw';
import surfaceColor from '../assets/shaders/surface-color.glsl?raw';
import sway from '../assets/shaders/sway.glsl?raw';

export class MarineLight{
 private time={value:0};
 private materials=new Set<THREE.Material>();
 apply(root:THREE.Object3D){
  root.traverse(node=>{
   if(!(node instanceof THREE.Mesh))return;
   if(node.name!=='Water'&&node.name!=='Sky'){node.castShadow=true;node.receiveShadow=true;}
   const materials=Array.isArray(node.material)?node.material:[node.material];
   for(const material of materials){
    if(!(material instanceof THREE.MeshStandardMaterial)||this.materials.has(material))continue;
    this.materials.add(material);
    const surface=String(material.userData.surface??'plain').toUpperCase();
    material.envMapIntensity=surface==='SKIN'||surface==='HIDE'?.65:.4;
    material.onBeforeCompile=shader=>{
     shader.uniforms.uMarineTime=this.time;
     shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n#define SURFACE_'+surface+'\nuniform float uMarineTime;\nvarying vec3 vMarineWorld;\nvarying float vMarineUp;\nvarying vec3 vSurfaceLocal;');
     shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+sway);
     shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
vSurfaceLocal=position;
mat4 marineModel=modelMatrix;
#ifdef USE_INSTANCING
marineModel=modelMatrix*instanceMatrix;
#endif
vMarineWorld=(marineModel*vec4(transformed,1.0)).xyz;
vMarineUp=normalize(mat3(marineModel)*objectNormal).y;`);
     shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n#define SURFACE_'+surface+'\nuniform float uMarineTime;\nvarying vec3 vMarineWorld;\nvarying float vMarineUp;\n'+surfaceDetail);
     shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+surfaceColor);
     shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=surfaceBump(-vViewPosition,normal,surfaceHeightDetail(vSurfaceLocal));');
     shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n#ifdef SURFACE_SAND\nroughnessFactor=mix(.65,.94,smoothstep(.1,1.5,vMarineWorld.y));\n#endif');
     shader.fragmentShader=shader.fragmentShader.replace('#include <tonemapping_fragment>',marineLight+'\n#include <tonemapping_fragment>');
    };
    material.customProgramCacheKey=()=> 'marine-surface-v4-'+surface;material.needsUpdate=true;
   }
  });
 }
 update(time:number){this.time.value=time;}
}
