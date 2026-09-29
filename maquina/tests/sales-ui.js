'use strict';
// Teste de tela da Página de venda (Chromium).
const {chromium}=require('playwright'),{spawn}=require('child_process'),assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const PORT=3396,BASE=`http://127.0.0.1:${PORT}`,DATA=fs.mkdtempSync(path.join(os.tmpdir(),'smcui-')),SHOTS=process.env.SHOTS||os.tmpdir();
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
  assert.ok(await page.locator('[data-v=sales]').count(),'item no menu');
  await page.click('#openTools');assert.ok(await page.locator('[data-tool=sales]').count(),'tile na gaveta');await page.click('[data-tool=sales]');await page.waitForSelector('#salesRequest');
  assert.ok(await page.locator('#maxDock').isVisible());
  await page.fill('#salesRequest','oi');await page.click('#salesGo');await page.waitForSelector('.q-error');
  await page.fill('#salesRequest','página para vender a minha mentoria de liderança para empresas');await page.press('#salesRequest','Enter');
  await page.waitForSelector('#salesFrame');await page.waitForSelector('[data-s=headline]');
  const fr=page.frameLocator('#salesFrame');await fr.locator('h1').waitFor();
  const h1=await fr.locator('h1').innerText();assert.ok(h1.length>10,'prévia mostra o título');
  // editar título e criar promoção ativa
  await page.fill('[data-s=headline]','Nova promessa da página de vendas');
  await page.click('#sAddPromo');await page.waitForSelector('[data-sp]');
  await page.fill('[data-sp="0|label"]','Lançamento');await page.fill('[data-sp="0|title"]','Condição especial da primeira turma');await page.fill('[data-sp="0|price"]','Condição informada por mim');
  const fut=new Date(Date.now()+15*864e5).toISOString().slice(0,10);await page.fill('[data-sp="0|validUntil"]',fut);await page.check('[data-s-active]:not([data-s-active=""])');
  assert.ok(await page.locator('text=alterações não salvas').count(),'avisa alterações não salvas');
  await page.click('#sSave');await page.waitForSelector('.q-note:has-text("Salvo")');
  await page.frameLocator('#salesFrame').locator('h1:has-text("Nova promessa")').waitFor();
  await page.frameLocator('#salesFrame').locator('.promo:has-text("Condição especial da primeira turma")').waitFor();results.preview=true;
  // botão para link e destino
  await page.check('[data-s-mode=redirect]');await page.fill('[data-s=ctaUrl]','https://wa.me/5551999990000');await page.click('#sSave');await page.waitForSelector('.q-note:has-text("Salvo")');
  // link dinâmico + QR + trocar página
  await page.click('#sMakeLink');await page.waitForSelector('[data-s-qr]');
  const url=await page.locator('.q-linkline code').first().innerText();assert.match(url,/\/link\//);const tok=url.split('/link/')[1];
  const dl=page.waitForEvent('download');await page.click('[data-s-qr]');const d1=await dl;assert.match(d1.suggestedFilename(),/\.png$/);results.qr=true;
  const pubHtml=await page.evaluate(async t=>(await fetch('/link/'+t)).text(),tok);assert.ok(pubHtml.includes('Nova promessa da página de vendas'),'link público mostra a versão salva');assert.ok(pubHtml.includes('/link/'+tok+'/go'));
  // segunda página e troca no mesmo link
  await page.fill('#salesRequest','página para vender a sessão de clareza avulsa');await page.press('#salesRequest','Enter');await page.waitForSelector('[data-s-open]:nth-of-type(2)');
  await page.fill('[data-s=headline]','Segunda página, mesma URL');await page.click('#sSave');await page.waitForSelector('.q-note:has-text("Salvo")');
  await page.click('[data-s-open]:has-text("mentoria")').catch(async()=>{await page.locator('[data-s-open]').last().click()});await page.waitForSelector('[data-s-swap]');
  const opts=await page.locator('[data-s-swap] option').count();assert.equal(opts,2,'lista as duas páginas');
  const second=await page.evaluate(()=>[...document.querySelectorAll('[data-s-swap] option')].map(o=>({v:o.value,t:o.textContent})));
  const target=second.find(o=>/clareza/i.test(o.t));await page.selectOption('[data-s-swap]',target.v);await page.waitForSelector('.q-note:has-text("mesmo link")');
  const swapped=await page.evaluate(async t=>(await fetch('/link/'+t)).text(),tok);assert.ok(swapped.includes('Segunda página, mesma URL'),'mesmo link mostra a outra página');results.swap=true;
  // publicar em hospedagem gratuita: endereço publicado + QR
  await page.locator('[data-s-open]').last().click().catch(()=>{});
  await page.click('[data-s-open]:has-text("mentoria")');await page.waitForSelector('#sExport',{state:'attached'});await page.click('summary:has-text("Publicar grátis")');
  assert.ok(await page.locator('#sQrPub[disabled]').count(),'QR publicado começa desabilitado');
  await page.fill('[data-s=publishedUrl]','https://minha-pagina.pages.dev');await page.click('#sSave');await page.waitForSelector('.q-note:has-text("Salvo")');
  const dq=page.waitForEvent('download');await page.click('#sQrPub');assert.match((await dq).suggestedFilename(),/\.png$/);
  const dz=page.waitForEvent('download');await page.click('#sExport');assert.match((await dz).suggestedFilename(),/\.zip$/);results.publish=true;
  // Max explica campos
  await page.focus('[data-s=publishedUrl]');assert.match(await page.locator('#maxDockReply').innerText(),/endereço/i);
  await page.screenshot({path:path.join(SHOTS,'pagina-venda.png'),fullPage:false});
  // responsivo sem rolagem lateral
  for(const w of [900,420]){await page.setViewportSize({width:w,height:800});await page.click('[data-v=sales]');await page.waitForSelector('#salesRequest');const sw=await page.evaluate(()=>document.documentElement.scrollWidth);assert.ok(sw<=w+2,`sem rolagem lateral em ${w}px (${sw})`)}
  await page.screenshot({path:path.join(SHOTS,'pagina-venda-420.png')});
  // outras telas continuam
  await page.setViewportSize({width:1440,height:900});await page.click('[data-v=create]');await page.waitForSelector('#quickRequest');await page.click('[data-v=prompt]');await page.waitForSelector('#promptRequest');
  // caixa de Início encaminha às telas novas
  await page.click('[data-v=home]');await page.waitForSelector('#commandBox');await page.fill('#commandBox','quero uma página de vendas para o meu curso de oratória');await page.press('#commandBox','Enter');
  await page.waitForSelector('#salesFrame',{timeout:15000});results.routeSales=true;
  await page.click('[data-v=home]');await page.waitForSelector('#commandBox');await page.fill('#commandBox','quero criar uma logomarca para minha empresa');await page.press('#commandBox','Enter');
  await page.waitForSelector('#promptRequest');await page.waitForSelector('[data-p-text]',{timeout:15000});results.routePrompt=true;
  await page.setViewportSize({width:420,height:800});await page.click('[data-v=sales]');await page.waitForSelector('#salesRequest');await page.screenshot({path:path.join(SHOTS,'pagina-venda-420b.png')});
  assert.deepEqual(errors,[],'sem erros de JS: '+errors.join(' | '));
  console.log('SALES UI OK',JSON.stringify(results));
 }catch(e){console.error('FALHOU:',e.message);console.error(errors.join('\n'));console.error(log.slice(-800));process.exitCode=1}finally{await browser.close();srv.kill()}
})();
