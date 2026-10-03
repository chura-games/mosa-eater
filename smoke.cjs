const {chromium}=require('@playwright/test');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const names=['mosasaurus','diver','shark','boat','patrol','environment','bite-particle','sonar-ring'];
 const modelResponses=names.map(name=>page.waitForResponse(response=>response.url().includes('/'+name)&&response.url().includes('.glb')));
 await page.goto('http://127.0.0.1:5173');await page.waitForSelector('#world canvas');await page.screenshot({path:'preview-title.png'});
 const models=await Promise.all(modelResponses);let modelBytes=0;
 for(let i=0;i<models.length;i++){
  const model=models[i];if(!model.ok())throw Error('GLB model request failed: '+names[i]);
  const bytes=await model.body();if(bytes.toString('ascii',0,4)!=='glTF')throw Error('Invalid GLB model: '+names[i]);
  const json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)).trim());
  if(names[i]==='environment')for(const nodeName of ['Water','Seabed','Beach','Platform','Bubbles']){
   if(!json.nodes.some(node=>node.name===nodeName))throw Error('Missing environment node: '+nodeName);
  }
  modelBytes+=bytes.length;
 }
 await page.click('#start');await page.keyboard.down('KeyW');await page.waitForTimeout(1100);await page.keyboard.up('KeyW');await page.keyboard.press('Space');await page.waitForTimeout(150);
 const bio=await page.locator('#bio').textContent();if(Number(bio)<25)throw Error('First bite did not capture nearby prey: '+bio);
 await page.keyboard.press('KeyF');await page.keyboard.press('Escape');if(!await page.locator('#paused').isVisible())throw Error('Pause failed');
 await page.click('#resume');await page.keyboard.down('KeyQ');await page.waitForTimeout(600);await page.keyboard.up('KeyQ');
 await page.screenshot({path:'preview-game.png'});
 if(errors.length)throw Error(errors.join('\n'));
 console.log(JSON.stringify({webgl:true,loadedModels:names.length,modelBytes,firstCaptureBP:bio,pauseResume:true,sonar:true,depth:await page.locator('#depth').textContent(),runtimeErrors:errors}));
 const failedPage=await browser.newPage();
 await failedPage.route('**/environment*.glb',route=>route.abort());
 await failedPage.goto('http://127.0.0.1:5173');
 await failedPage.waitForFunction(()=>document.querySelector('#start').textContent.includes('モデル読み込み失敗'));
 if(await failedPage.locator('#start').isEnabled())throw Error('Start allowed after model load failure');
 console.log('Model load failure keeps the start button disabled');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
