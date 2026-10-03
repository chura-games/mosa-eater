const {chromium}=require('@playwright/test');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173');await page.waitForSelector('#world canvas');await page.screenshot({path:'preview-title.png'});
 await page.click('#start');await page.keyboard.down('KeyW');await page.waitForTimeout(1100);await page.keyboard.up('KeyW');await page.keyboard.press('Space');await page.waitForTimeout(150);
 const bio=await page.locator('#bio').textContent();if(Number(bio)<25)throw Error('First bite did not capture nearby prey: '+bio);
 await page.keyboard.press('KeyF');await page.keyboard.press('Escape');if(!await page.locator('#paused').isVisible())throw Error('Pause failed');
 await page.click('#resume');await page.keyboard.down('KeyQ');await page.waitForTimeout(600);await page.keyboard.up('KeyQ');
 await page.screenshot({path:'preview-game.png'});
 if(errors.length)throw Error(errors.join('\n'));
 console.log(JSON.stringify({webgl:true,firstCaptureBP:bio,pauseResume:true,sonar:true,depth:await page.locator('#depth').textContent(),runtimeErrors:errors}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
