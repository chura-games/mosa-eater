const {chromium}=require('@playwright/test');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/visual-review',route=>route.fulfill({contentType:'text/html',body:'<html><body style="margin:0"></body></html>'}));
  await page.goto('http://127.0.0.1:5173/visual-review');
  await page.evaluate(async()=>{
   const source=await (await fetch('/src/system/ModelAssets.ts')).text();
   const THREE=await import(source.match(/from "([^"]*three[^"]*)"/)[1]);
   const {ModelAssets}=await import('/src/system/ModelAssets.ts'),{createOcean}=await import('/src/system/Ocean.ts');
   const {createAtmosphere}=await import('/src/system/Atmosphere.ts'),{MarineLight}=await import('/src/system/MarineLight.ts');
   const assets=await ModelAssets.load(),scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x9dc8d1,.0022);
   const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1600,1000);
   renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
   document.body.appendChild(renderer.domElement);
   const camera=new THREE.PerspectiveCamera(48,1.6,.1,2000);
   scene.add(new THREE.HemisphereLight(0xd0edff,0x5b6651,.65));
   const sun=new THREE.DirectionalLight(0xffefce,3.3);sun.position.set(-70,105,-49);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
   Object.assign(sun.shadow.camera,{left:-105,right:105,top:105,bottom:-105,near:1,far:280});sun.shadow.normalBias=.08;sun.shadow.bias=-.00015;scene.add(sun);
   const ocean=createOcean(scene,assets),atmosphere=createAtmosphere(scene,renderer,assets);
   const predator=assets.instantiate('mosasaurus');predator.position.set(3,-1.3,1);predator.rotation.y=-.9;scene.add(predator);
   const boat=assets.instantiate('boat');boat.position.set(-24,0,-10);boat.rotation.y=.5;scene.add(boat);
   const shark=assets.instantiate('shark');shark.position.set(14,-3,-3);scene.add(shark);
   const light=new MarineLight();light.apply(scene);light.update(7);
   renderer.info.autoReset=false;
   window.review=async(name)=>{
    if(name==='beach'){camera.position.set(44,20,44);camera.lookAt(-3,0,-27);}
    else if(name==='shore'){camera.position.set(-23,5,-16);camera.lookAt(12,2,-42);}
    else if(name==='predator'){camera.position.set(-8,-2,-12);camera.lookAt(3,-1.3,1);}
    const submerged=name==='predator'?1:0;
    scene.fog.color.set(submerged?0x115061:0x9dc8d1);scene.fog.density=submerged?.019:.0022;
    atmosphere.update(camera,submerged);ocean.update(7,camera,{mesh:predator,heading:-.9,speed:2},[{mesh:boat,heading:.5,alive:true,ship:true}]);
    renderer.info.reset();const start=performance.now();renderer.render(scene,camera);
    // Wait for GPU completion before measuring the static review frame.
    renderer.getContext().finish();
    return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,frameMs:Math.round(performance.now()-start)};
   };
  });
  for(const name of ['beach','shore','predator']){
   await page.evaluate(name=>window.review(name),name);
   const stats=await page.evaluate(name=>window.review(name),name);
   await page.screenshot({path:'preview-'+name+'.png'});console.log(name+': '+JSON.stringify(stats));
  }
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
