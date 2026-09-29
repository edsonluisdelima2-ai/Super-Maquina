'use strict';
// Teste de tela (Chromium) do Estúdio: formatos, versões, revisão factual, edição, aprovação e Max.
// Modo de teste da aplicação (SMC_FAKE_OPENROUTER=1): nenhuma chamada paga.
const {chromium}=require('playwright'),{spawn}=require('child_process'),assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const PORT=3394,BASE=`http://127.0.0.1:${PORT}`,DATA=fs.mkdtempSync(path.join(os.tmpdir(),'smcmui-')),SHOTS=process.env.SHOTS||os.tmpdir();
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
  await page.fill('#p1','senha-teste-123');await page.fill('#p2','senha-teste-123');await page.click('#go');
  await page.waitForSelector('#p,.sidebar');if(await page.locator('#p').count()){await page.fill('#p','senha-teste-123');await page.press('#p','Enter')}
  await page.waitForSelector('.sidebar');
  await page.evaluate(async()=>{await fetch('/api/clients',{method:'POST',headers:{'Content-Type':'application/json','X-SMC':'1'},body:JSON.stringify({name:'Empresa Teste',plan:'equilibrado'})})});
  await page.reload();await page.waitForSelector('.sidebar');

  // menu e tela
  assert.ok(await page.locator('[data-v=studio]').count(),'item Estúdio no menu');
  await page.click('[data-v=studio]');await page.waitForSelector('#mTema');
  assert.equal(await page.locator('.m-format').count(),10,'10 formatos');
  assert.equal(await page.locator('.m-format.on').count(),1,'um formato selecionado');
  assert.ok(await page.locator('#maxDock').isVisible(),'Max visível no Estúdio');
  assert.ok(await page.locator('#mFactual').isChecked(),'revisão factual marcada por padrão');
  assert.equal(await page.locator('#mSub').count(),0,'subformato só aparece no X');

  // Max orienta campo a campo
  await page.focus('#mTema');await page.waitForTimeout(150);
  assert.match(await page.locator('#maxDockReply').innerText(),/assunto do conteúdo/i,'Max explica o campo Tema');
  await page.focus('#mFactual');await page.waitForTimeout(150);
  assert.match(await page.locator('#maxDockReply').innerText(),/segunda leitura/i,'Max explica a revisão factual');

  // X mostra subformato
  await page.click('[data-m-kind=x]');await page.waitForSelector('#mSub');
  assert.equal(await page.locator('#mSub option').count(),5,'5 subformatos');
  await page.click('[data-m-kind=linkedin]');await page.waitForSelector('#mTema');assert.equal(await page.locator('#mSub').count(),0);

  // criar com 3 versões; Enter no tema envia
  await page.selectOption('#mVariantes','3');await page.selectOption('#mObjetivo','diagnostico');
  await page.fill('#mAngulo','visão de quem vende para empresas');
  await page.fill('#mTema','delegar sem perder o controle da empresa');
  await page.press('#mTema','Enter');
  await page.waitForSelector('[data-m-card]',{timeout:20000});
  assert.equal(await page.locator('[data-m-card]').count(),3,'3 versões na tela');
  assert.equal(await page.locator('.m-fact').count(),3,'painel de fatos em cada versão');
  assert.equal(await page.locator('.m-fact.warn').count(),2,'2 versões com atenção');assert.equal(await page.locator('.m-fact.ok').count(),1,'1 versão conferida');
  assert.match(await page.locator('.m-fact.warn').first().innerText(),/sem fonte no material/,'alerta legível');
  assert.match(await page.locator('#maxDockReply').innerText(),/0 de 3 versões aprovadas/,'Max resume o estado');

  // editar, salvar, aprovar
  const first=page.locator('[data-m-card]').first();
  await first.locator('textarea').fill('Texto editado pelo cliente, pronto para revisão e aprovação.');
  await first.locator('[data-m-save]').click();await page.waitForSelector('text=Edição salva.');
  await page.locator('[data-m-card]').first().locator('[data-m-approve]').click();await page.waitForSelector('text=Aprovado. Baixe o pacote');
  assert.match(await page.locator('[data-m-card]').first().innerText(),/Aprovado/);
  assert.match(await page.locator('#maxDockReply').innerText(),/1 de 3 versões aprovadas/);
  assert.ok(await page.locator('[data-m-queue]').count()>=1,'aprovado no LinkedIn pode ir para a fila');

  // pacote baixa um ZIP
  const [dl]=await Promise.all([page.waitForEvent('download'),page.locator('[data-m-pack]').first().click()]);
  const zf=await dl.path();assert.equal(fs.readFileSync(zf).readUInt32LE(0),0x04034b50,'pacote é ZIP');

  // conferir de novo
  await page.locator('[data-m-review]').first().click();await page.waitForFunction(()=>!document.body.innerText.includes('Conferindo…'));

  // blog gera HTML
  await page.click('[data-m-kind=blog]');await page.uncheck('#mFactual');await page.fill('#mTema','como delegar sem perder o controle');
  await page.selectOption('#mVariantes','1');await page.click('#mGo');await page.waitForSelector('a:has-text("HTML do artigo")',{timeout:20000});

  // anti-slop: aceita transcrição de referência
  await page.click('[data-m-kind=video_curto]');await page.locator('.m-slop summary').click();await page.fill('#mEstrutura','Gancho forte. Três cenas. Fecho com convite.');
  await page.fill('#mTema','por que o dono da empresa não consegue tirar férias');await page.click('#mGo');await page.waitForFunction(()=>document.querySelector('.q-groupinfo p')?.innerText.includes('Vídeo curto'),null,{timeout:20000});

  // criações anteriores listadas
  assert.ok(await page.locator('[data-m-group]').count()>=2,'histórico de criações');

  // telas estreitas sem rolagem horizontal
  for(const w of [1100,900,700,400]){await page.setViewportSize({width:w,height:900});await page.waitForTimeout(150);
   const over=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.ok(over<=2,'sem rolagem horizontal em '+w+' (excesso '+over+')');}
  await page.setViewportSize({width:1440,height:900});await page.screenshot({path:path.join(SHOTS,'studio-1440.png'),fullPage:false});
  await page.setViewportSize({width:400,height:900});await page.screenshot({path:path.join(SHOTS,'studio-400.png')});

  assert.deepEqual(errors,[],'sem erros de JavaScript: '+errors.join(' | '));
  console.log('MACHINE UI OK');
 }catch(e){console.error('FALHOU:',e.message);console.error(log.slice(-1500));process.exitCode=1}finally{await browser.close();srv.kill()}
})();
