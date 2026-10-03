import * as THREE from 'three';
import {ModelAssets} from './ModelAssets';
import vertexShader from '../assets/shaders/sky.vert?raw';
import fragmentShader from '../assets/shaders/sky.frag?raw';

export function createAtmosphere(scene:THREE.Scene,renderer:THREE.WebGLRenderer,assets:ModelAssets){
 const sky=assets.instantiate('sky').getObjectByName('Sky') as THREE.Mesh;
 if(!sky)throw new Error('Missing sky asset');
 const submerged={value:0};
 sky.material=new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms:{uSubmerged:submerged},side:THREE.BackSide,depthWrite:false});
 sky.frustumCulled=false;sky.renderOrder=-1000;
 const environmentScene=new THREE.Scene();environmentScene.add(sky);
 const generator=new THREE.PMREMGenerator(renderer);
 const environment=generator.fromScene(environmentScene,.04,.1,2000);
 generator.dispose();scene.environment=environment.texture;scene.environmentIntensity=.6;
 scene.add(sky);
 return {update(camera:THREE.Camera,amount:number){sky.position.copy(camera.position);submerged.value=amount;}};
}
