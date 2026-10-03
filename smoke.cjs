const {chromium}=require('@playwright/test');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error'&&/shader|VALIDATE_STATUS|GL_INVALID/i.test(message.text()))errors.push(message.text());});
 const names=['mosasaurus','diver','shark','boat','patrol','coast','rock','palm','umbrella','umbrella-orange','platform','lounger','pier','beach-bar','grass','coral','kelp','fish','dolphin','turtle','swimmer','jetski','sailboat','buoy','gull','ray','seal','jellyfish','kayak','surfer','sky','bubbles','bite-particle','sonar-ring'];
 const modelResponses=names.map(name=>page.waitForResponse(response=>new URL(response.url()).pathname.endsWith('/'+name+'.glb')));
 await page.goto('http://127.0.0.1:5173');await page.waitForSelector('#world canvas');await page.screenshot({path:'preview-title.png'});
 const models=await Promise.all(modelResponses);let modelBytes=0;
 for(let i=0;i<models.length;i++){
  const model=models[i];if(!model.ok())throw Error('GLB model request failed: '+names[i]);
  const bytes=await model.body();if(bytes.toString('ascii',0,4)!=='glTF')throw Error('Invalid GLB model: '+names[i]);
  const json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)).trim());
  if(names[i]==='coast'){
   for(const nodeName of ['Water','Seabed','Beach','SandDune']){
    if(!json.nodes.some(node=>node.name===nodeName))throw Error('Missing map node: '+nodeName);
   }
   if(json.nodes.some(node=>/Platform|Palm|Rock|Umbrella|Bubbles|Kelp/.test(node.name??'')))throw Error('Map contains prop models');
  }
  modelBytes+=bytes.length;
 }
 const collisionTests=await page.evaluate(async()=>{
  const tests=await import('/src/system/Collision.test.ts');return tests.runCollisionTests();
 });
 console.log('Collision tests: '+JSON.stringify(collisionTests));
 console.log('Coast tests: '+JSON.stringify(await page.evaluate(async()=>{
  const tests=await import('/src/system/Coast.test.ts');return tests.runCoastTests();
 })));
 await page.waitForFunction(()=>!document.querySelector('#start').disabled);
 await page.waitForSelector('#loading',{state:'hidden',timeout:30000});
 await page.keyboard.down('KeyW');
 await page.waitForFunction(()=>Number(document.querySelector('#bio').textContent)>=25,{},{timeout:20000});
 await page.keyboard.up('KeyW');
 if(!await page.evaluate(()=>document.pointerLockElement===document.querySelector('#world canvas')))throw Error('Mouse look was not captured');
 const bio=await page.locator('#bio').textContent();if(Number(bio)<25)throw Error('First bite did not capture nearby prey: '+bio);
 await page.keyboard.press('Escape');if(!await page.locator('#paused').isVisible())throw Error('Pause failed');
 await page.click('#resume');
 const depthBefore=Number((await page.locator('#depth').textContent()).match(/\d+/)[0]);
 await page.evaluate(()=>document.dispatchEvent(new MouseEvent('mousemove',{movementY:200})));
 // Headless rendering runs slower than real time, so wait for the dive rather than a fixed delay.
 await page.keyboard.down('KeyW');
 await page.waitForFunction(before=>Number(document.querySelector('#depth').textContent.match(/\d+/)[0])>before,depthBefore,{timeout:6000}).catch(()=>{throw Error('Mouse look + W did not dive');});
 await page.keyboard.up('KeyW');
 await page.screenshot({path:'preview-game.png'});
 await page.keyboard.down('KeyR');await page.waitForTimeout(1300);await page.keyboard.up('KeyR');
 await page.screenshot({path:'preview-surface.png'});
 if(errors.length)throw Error(errors.join('\n'));
 console.log(JSON.stringify({webgl:true,loadedModels:names.length,modelBytes,automaticCapture:true,firstCaptureBP:bio,pauseResume:true,depth:await page.locator('#depth').textContent(),runtimeErrors:errors}));
 const failedPage=await browser.newPage();
 await failedPage.route('**/maps/coast*.glb',route=>route.abort());
 await failedPage.goto('http://127.0.0.1:5173');
 await failedPage.waitForFunction(()=>document.querySelector('#start').textContent.includes('モデル読み込み失敗'));
 if(await failedPage.locator('#start').isEnabled())throw Error('Start allowed after model load failure');
 console.log('Model load failure keeps the start button disabled');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
