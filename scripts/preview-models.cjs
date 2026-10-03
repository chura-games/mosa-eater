const {chromium}=require('@playwright/test');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
 try {
 const page=await browser.newPage({viewport:{width:1600,height:1200}});
 await page.goto('http://127.0.0.1:5173');
 await page.waitForFunction(()=>!document.querySelector('#start').disabled);
 await page.evaluate(async()=>{
  const source=await (await fetch('/src/system/ModelAssets.ts')).text();
  const path=source.match(/from "([^"]*three[^"]*)"/)[1];
  const THREE=await import(path),{ModelAssets}=await import('/src/system/ModelAssets.ts');
  const assets=await ModelAssets.load();
  // Stop the game rendering; this page is only a visual review canvas.
  window.dispatchEvent(new Event('blur'));
  document.body.innerHTML='';
  const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
  renderer.setSize(1600,1200);renderer.setPixelRatio(1);renderer.setScissorTest(true);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  document.body.appendChild(renderer.domElement);
  const names=['diver','shark','boat','patrol','palm','umbrella','rock','lounger','platform'];
  for(let i=0;i<names.length;i++){
   const x=i%3*533,y=800-Math.floor(i/3)*400;
   renderer.setViewport(x,y,533,400);renderer.setScissor(x,y,533,400);
   const scene=new THREE.Scene();scene.background=new THREE.Color(0x263e49);
   scene.add(new THREE.HemisphereLight(0xeafaff,0x4e615c,2));
   const sun=new THREE.DirectionalLight(0xffeccd,3);sun.position.set(8,15,-10);scene.add(sun);
   const model=assets.instantiate(names[i]);scene.add(model);
   const bounds=new THREE.Box3().setFromObject(model);
   if(names[i]==='platform')bounds.min.y=0;
   const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),radius=size.length()*.5;
   const camera=new THREE.PerspectiveCamera(34,533/400,.01,500);
   camera.position.copy(center).add(new THREE.Vector3(1,.48,-1.35).normalize().multiplyScalar(radius*3.3));camera.lookAt(center);
   renderer.render(scene,camera);
   const label=document.createElement('div');label.textContent=names[i].toUpperCase();
   label.style.cssText='position:absolute;color:#dbecde;font:13px Arial;letter-spacing:3px;left:'+(x+22)+'px;top:'+(1200-y-400+18)+'px';
   document.body.appendChild(label);
  }
 });
 await page.screenshot({path:'preview-models.png'});
 console.log('Created model review image');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
