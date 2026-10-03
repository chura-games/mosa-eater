import * as THREE from 'three';
import {OBB} from 'three/addons/math/OBB.js';

export function modelBounds(model:THREE.Object3D){
 model.updateMatrixWorld(true);
 return new THREE.Box3().setFromObject(model);
}
export function orientedBounds(local:THREE.Box3,object:THREE.Object3D){
 object.updateWorldMatrix(true,false);
 return transformedBounds(local,object.matrixWorld);
}
export function transformedBounds(local:THREE.Box3,matrix:THREE.Matrix4){
 const box=new OBB().fromBox3(local),center=box.center.clone().applyMatrix4(matrix);
 box.applyMatrix4(matrix);box.center.copy(center);return box;
}
export class CollisionWorld{
 private solids:{box:THREE.Box3,triangles:THREE.Triangle[]}[]=[];
 private cells=new Map<string,{box:THREE.Box3,triangle:THREE.Triangle}[]>();
 // Given the terrain's height formula, the sand and seabed tiles are not stored as triangles:
 // the formula is exact, costs no memory, and works for a map of any size.
 constructor(private ground?:(x:number,z:number)=>number){}
 add(root:THREE.Object3D){
  root.updateMatrixWorld(true);
  root.traverse(node=>{
   if(!(node instanceof THREE.Mesh)||node.name==='Water'||node.userData.noCollision)return;
   if(this.ground&&/Tile\d+$/.test(node.name))return;
   const position=node.geometry.attributes.position,index=node.geometry.index;
   const triangles:THREE.Triangle[]=[];
   for(let i=0;i<(index?.count??position.count);i+=3){
    const vertices=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(position,index?index.getX(i+j):i+j).applyMatrix4(node.matrixWorld));
    const triangle=new THREE.Triangle(vertices[0],vertices[1],vertices[2]);triangles.push(triangle);
    const box=new THREE.Box3().setFromPoints(vertices),entry={box,triangle};
    for(let x=Math.floor(box.min.x/16);x<=Math.floor(box.max.x/16);x++)for(let z=Math.floor(box.min.z/16);z<=Math.floor(box.max.z/16);z++){
     const key=x+':'+z;if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key)!.push(entry);
    }
   }
   this.solids.push({box:new THREE.Box3().setFromObject(node),triangles});
  });
 }
 // A ray to the target prevents bites through rocks, sand and platform supports.
 blocked(from:THREE.Vector3,to:THREE.Vector3){
  const delta=to.clone().sub(from),distance=delta.length();
  if(distance<.001)return false;
  if(this.ground){
   const steps=Math.ceil(distance/1.5);
   for(let i=1;i<steps;i++){const t=i/steps,x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t;if(from.y+(to.y-from.y)*t<this.ground(x,z))return true;}
  }
  const ray=new THREE.Ray(from,delta.normalize()),hit=new THREE.Vector3();
  return this.solids.some(solid=>ray.intersectsBox(solid.box)&&solid.triangles.some(triangle=>{
   return ray.intersectTriangle(triangle.a,triangle.b,triangle.c,false,hit)!==null&&hit.distanceTo(from)<distance-.05;
  }));
 }
 resolve(object:THREE.Object3D,localSpheres:THREE.Sphere[]){
  let collided=false;
  // Multiple passes settle contacts around corners without snapping to old positions.
  const delta=new THREE.Vector3(),closest=new THREE.Vector3();
  for(let pass=0;pass<3;pass++){
   let passContact=false;
   for(const local of localSpheres){
   object.updateMatrixWorld(true);
   const sphere=local.clone().applyMatrix4(object.matrixWorld);
   const candidates=new Set<{box:THREE.Box3,triangle:THREE.Triangle}>();
   for(let x=Math.floor((sphere.center.x-sphere.radius)/16);x<=Math.floor((sphere.center.x+sphere.radius)/16);x++)for(let z=Math.floor((sphere.center.z-sphere.radius)/16);z<=Math.floor((sphere.center.z+sphere.radius)/16);z++){
    for(const entry of this.cells.get(x+':'+z)??[])candidates.add(entry);
   }
   for(const {box,triangle} of candidates){
    if(box.distanceToPoint(sphere.center)>sphere.radius)continue;
     triangle.closestPointToPoint(sphere.center,closest);
     delta.copy(sphere.center).sub(closest);const distance=delta.length();
     if(distance>=sphere.radius)continue;
     const normal=distance>.00001?delta.divideScalar(distance):triangle.getNormal(new THREE.Vector3());
     const correction=normal.multiplyScalar(sphere.radius-distance+.002);
     object.position.add(correction);sphere.center.add(correction);collided=true;passContact=true;
   }
   }
   if(!passContact)break;
  }
  if(this.ground){
   const ground=this.ground,normal=new THREE.Vector3();
   for(const local of localSpheres){
    object.updateMatrixWorld(true);
    const sphere=local.clone().applyMatrix4(object.matrixWorld),{x,z}=sphere.center,height=ground(x,z);
    if(sphere.center.y-sphere.radius>height+sphere.radius*.5)continue;
    // Distance to the slope, measured along its normal.
    const step=Math.max(.25,sphere.radius*.5);
    normal.set(ground(x-step,z)-ground(x+step,z),2*step,ground(x,z-step)-ground(x,z+step)).normalize();
    const gap=(sphere.center.y-height)*normal.y;
    if(gap>=sphere.radius)continue;
    object.position.addScaledVector(normal,sphere.radius-gap+.002);collided=true;
   }
  }
  return collided;
 }
}

export function resolveBox(object:THREE.Object3D,spheres:THREE.Sphere[],box:OBB){
 let collided=false;
 for(const local of spheres){
  object.updateMatrixWorld(true);
  const sphere=local.clone().applyMatrix4(object.matrixWorld);
  if(!box.intersectsSphere(sphere))continue;
  const closest=box.clampPoint(sphere.center,new THREE.Vector3());
  const delta=sphere.center.clone().sub(closest),distance=delta.length();
  if(distance<.00001){
   // Pick the nearest box face for a sphere whose center entered the hull.
   const inverse=box.rotation.clone().transpose();
   const point=sphere.center.clone().sub(box.center).applyMatrix3(inverse);
   const distances=[0,1,2].map(axis=>box.halfSize.getComponent(axis)-Math.abs(point.getComponent(axis)));
   const axis=distances.indexOf(Math.min(...distances));
   delta.set(0,0,0).setComponent(axis,Math.sign(point.getComponent(axis))||1).applyMatrix3(box.rotation);
   object.position.addScaledVector(delta,sphere.radius+distances[axis]+.002);
  }else object.position.addScaledVector(delta.normalize(),sphere.radius-distance+.002);
  collided=true;
 }
 return collided;
}
