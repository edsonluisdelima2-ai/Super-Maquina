'use strict';
// Tela de login: mostra as tentativas restantes e a mensagem de bloqueio (Chromium).
const {chromium}=require('playwright'),{spawn}=require('child_process'),assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const PORT=3396,BASE=`http://127.0.0.1:${PORT}`,DATA=fs.mkdtempSync(path.join(os.tmpdir(),'smcsecui-')),SHOTS=process.env.SHOTS||os.tmpdir();
(async()=>{
 const srv=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(PORT),SMC_DATA_DIR:DATA,SMC_FAKE_OPENROUTER:'1',BASE_URL:BASE,SMC_LOGIN_MAX:'3',SMC_LOGIN_LOCK_MS:'60000'},stdio:['ignore','pipe','pipe']});let log='';srv.stdout.on('data',x=>log+=x);srv.stderr.on('data',x=>log+=x);
 const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'.replace(/.*/,x=>fs.existsSync(x)?x:undefined)}).catch(()=>chromium.launch());
 const errors=[];
 try{
  for(let i=0;i<50;i++){try{if((await fetch(BASE+'/api/me')).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
  const page=await (await browser.newContext({viewport:{width:1200,height:800}})).newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE);
  await page.fill('#p1','senha-certa-123');await page.fill('#p2','senha-certa-123');await page.click('#go');
  await page.waitForSelector('.sidebar');
  await page.evaluate(()=>fetch('/api/logout',{method:'POST',headers:{'X-SMC':'1'}}));await page.reload();await page.waitForSelector('#p');
  await page.fill('#p','errada');await page.press('#p','Enter');
  await page.waitForFunction(()=>/Restam 2 tentativa/.test(document.body.innerText));
  await page.fill('#p','errada');await page.press('#p','Enter');
  await page.waitForFunction(()=>/Restam 1 tentativa/.test(document.body.innerText));
  await page.fill('#p','errada');await page.press('#p','Enter');
  await page.waitForFunction(()=>/Muitas tentativas de senha/.test(document.body.innerText)&&/minuto/.test(document.body.innerText));
  await page.fill('#p','senha-certa-123');await page.press('#p','Enter');await page.waitForTimeout(500);
  assert.equal(await page.locator('.sidebar').count(),0,'senha correta não entra durante o bloqueio');
  await page.screenshot({path:path.join(SHOTS,'login-bloqueado.png')});
  assert.deepEqual(errors,[],'sem erros de JavaScript');
  console.log('SECURITY UI OK');
 }catch(e){console.error('FALHOU:',e.message);console.error(log.slice(-1200));process.exitCode=1}finally{await browser.close();srv.kill()}
})();
