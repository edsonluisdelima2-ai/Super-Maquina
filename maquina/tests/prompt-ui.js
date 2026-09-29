'use strict';
// Teste de tela do Engenheiro de Prompt (Chromium).
const {chromium}=require('playwright'),{spawn}=require('child_process'),assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const PORT=3394,BASE=`http://127.0.0.1:${PORT}`,DATA=fs.mkdtempSync(path.join(os.tmpdir(),'smcui-')),SHOTS=process.env.SHOTS||os.tmpdir();
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
(async()=>{
 const srv=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(PORT),SMC_DATA_DIR:DATA,SMC_FAKE_OPENROUTER:'1',BASE_URL:BASE},stdio:['ignore','pipe','pipe']});let log='';srv.stdout.on('data',x=>log+=x);srv.stderr.on('data',x=>log+=x);
 const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'.replace(/.*/,x=>fs.existsSync(x)?x:undefined)}).catch(()=>chromium.launch());
 const errors=[];
 try{
  for(let i=0;i<50;i++){try{if((await fetch(BASE+'/api/me')).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
  const ctx=await browser.newContext({viewport:{width:1440,height:900}}),page=await ctx.newPage();
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
  page.on('dialog',d=>d.dismiss());
  await page.goto(BASE);
  // primeiro acesso: criar senha, depois login com Enter
  await page.fill('#p1','senha-teste-123');await page.fill('#p2','senha-teste-123');await page.click('#go');
  await page.waitForSelector('#p,.sidebar');if(await page.locator('#p').count()){await page.fill('#p','senha-teste-123');await page.press('#p','Enter')}
  await page.waitForSelector('.sidebar');
  // Enter no login (sessão nova)
  await page.evaluate(()=>fetch('/api/logout',{method:'POST',headers:{'X-SMC':'1'}}));await page.reload();await page.waitForSelector('#p');await page.fill('#p','senha-teste-123');await page.press('#p','Enter');await page.waitForSelector('.sidebar');
  // empresa via API autenticada do navegador
  const cid=await page.evaluate(async()=>{const r=await fetch('/api/clients',{method:'POST',headers:{'Content-Type':'application/json','X-SMC':'1'},body:JSON.stringify({name:'Empresa Teste',plan:'equilibrado'})});return (await r.json()).id});
  await page.reload();await page.waitForSelector('.sidebar');
  const results={};
  // menu e gaveta de ferramentas
  assert.ok(await page.locator('[data-v=prompt]').count(),'item Prompt no menu');
  await page.click('#openTools');await page.click('[data-tool=prompt]');await page.waitForSelector('#promptRequest');results.drawer=true;
  await page.click('[data-v=create]');await page.click('[data-v=prompt]');await page.waitForSelector('#promptRequest');
  assert.ok(await page.locator('#maxDock').isVisible(),'Max visível em Prompt');
  assert.match(await page.locator('#maxDockReply').innerText(),/prompt/i,'Max explica a tela');
  await page.focus('#promptType');assert.match(await page.locator('#maxDockReply').innerText(),/imagem|planilha/i,'Max explica o campo');
  // pedido curto
  await page.fill('#promptRequest','oi');await page.click('#promptGo');await page.waitForSelector('.q-error');
  // logomarca: Enter cria, sem "Criar aqui"
  await page.fill('#promptRequest','quero criar uma logomarca para minha empresa');await page.press('#promptRequest','Enter');
  await page.waitForSelector('[data-p-text]');assert.ok((await page.inputValue('[data-p-text]')).length>40,'prompt preenchido');
  assert.equal(await page.locator('[data-p-run]').count(),0,'logomarca não tem Criar aqui');assert.ok(await page.locator('.q-note',{hasText:'IA de imagem'}).count(),'orientação para IA de imagem');
  assert.ok(await page.locator('[data-p-copy]').count());
  await page.screenshot({path:path.join(SHOTS,'prompt-logo.png')});
  // planilha: criar aqui gera CSV
  await page.fill('#promptRequest','quero uma planilha de controle de contas a pagar');await page.selectOption('#promptTarget','chatgpt');await page.click('#promptGo');
  await page.waitForSelector('[data-p-run]');let asked=false;page.removeAllListeners('dialog');page.on('dialog',d=>{asked=/colchetes/.test(d.message());d.accept()});await page.click('[data-p-run]');await page.waitForSelector('a[href*=".csv"]');
  assert.ok(asked,'avisou sobre campos entre colchetes');assert.ok(await page.locator('[data-p-copyres]').count());results.csv=true;
  await page.screenshot({path:path.join(SHOTS,'prompt-planilha.png')});
  // histórico
  assert.ok(await page.locator('.q-older').count(),'prompts anteriores');await page.click('.q-older summary');await page.click('[data-p-open]');await page.waitForSelector('[data-p-text]');
  // outras telas seguem funcionando
  await page.click('[data-v=create]');await page.waitForSelector('#quickRequest');
  // responsivo
  for(const w of [900,700]){await page.setViewportSize({width:w,height:800});await page.click('[data-v=prompt]');await page.waitForSelector('#promptRequest');const b=await page.locator('#promptRequest').boundingBox();assert.ok(b.x>=0&&b.x+b.width<=w+1,'campo dentro da tela em '+w)}
  await page.screenshot({path:path.join(SHOTS,'prompt-700.png')});
  assert.deepEqual(errors,[],'sem erros de JS: '+errors.join(' | '));
  console.log('PROMPT UI OK',JSON.stringify(results));
 }catch(e){console.error('FALHOU:',e.message);console.error(errors.join('\n'));console.error(log.slice(-800));process.exitCode=1}finally{await browser.close();srv.kill()}
})();
