'use strict';
// Teste de tela (Chromium): entrada simples, edição, imagem própria, aprovação, Max em todas as telas e Enter.
const {chromium}=require('playwright'),{spawn}=require('child_process'),assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const PORT=3392,BASE=`http://127.0.0.1:${PORT}`,DATA=fs.mkdtempSync(path.join(os.tmpdir(),'smcui-')),SHOTS=process.env.SHOTS||os.tmpdir();
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
  // HOME: caixa única e Max
  assert.ok(await page.locator('#commandBox').isVisible(),'caixa do pedido na Home');
  // CRIAR
  await page.click('[data-v=create]');await page.waitForSelector('#quickRequest');
  assert.ok(await page.locator('#maxDock').isVisible(),'Max visível em Criar');
  const av=await page.locator('#maxDock img').boundingBox();assert.ok(av.height>=90&&av.width>=60,'Max com tamanho relevante: '+JSON.stringify(av));
  await page.focus('#quickRequest');
  let msg=await page.textContent('#maxDockReply');assert.match(msg,/pedido|publicações/i,'Max orienta o campo do pedido: '+msg);
  await page.fill('#quickRequest','post para vender mentoria de liderança para empresas');
  await page.press('#quickRequest','Enter');
  await page.waitForSelector('[data-q-card]');
  assert.equal(await page.locator('[data-q-card]').count(),2,'duas redes por padrão');
  await page.screenshot({path:path.join(SHOTS,'criar-resultado.png'),fullPage:false});
  // edição + salvar
  const ta=page.locator('[data-q-text]').first();await ta.fill('Texto ajustado pelo cliente para o LinkedIn, com foco na mentoria.');
  await page.locator('[data-q-save]').first().click();await page.waitForSelector('text=Edição salva.');
  // imagem própria
  const imgPath=path.join(os.tmpdir(),'arte.png');fs.writeFileSync(imgPath,PNG);
  await page.locator('[data-q-imgup]').first().setInputFiles(imgPath);await page.waitForSelector('.q-thumb img');
  // aprovar -> fila
  await page.locator('[data-q-approve]').first().click();await page.waitForSelector('[data-q-queue]');
  await page.locator('[data-q-queue]').first().click();await page.waitForSelector('text=Retirar da fila para editar');
  assert.ok(await page.locator('[data-q-text]').first().isDisabled(),'texto travado na fila');
  // pacote baixa
  const [dl]=await Promise.all([page.waitForEvent('download'),page.locator('[data-q-pack]').first().click()]);assert.match(dl.suggestedFilename(),/pacote_.*\.zip/);
  // retirar da fila destrava
  await page.locator('[data-q-unqueue]').first().click();await page.waitForSelector('[data-q-save]');
  // link rastreável
  await page.locator('[data-q-trackbtn]').first().click();await page.fill('[data-q-target]','https://example.com/mentoria');
  await page.locator('[data-q-trackgo]').first().click();await page.waitForSelector('.q-linkline code');
  await page.screenshot({path:path.join(SHOTS,'criar-cards.png'),fullPage:true});
  // MAX em todas as telas operacionais
  const results={};
  for(const v of ['create','relationship','results','library','history','settings']){
   await page.click(`[data-v=${v}]`);await page.waitForSelector('.content');
   const vis=await page.locator('#maxDock').isVisible(),box=vis?await page.locator('#maxDock img').boundingBox():null,txt=vis?await page.textContent('#maxDockReply'):'',next=vis?await page.textContent('#maxNextText'):'';
   assert.ok(vis&&box.height>=90,`Max visível e grande em ${v}`);assert.ok(txt.length>25&&next.length>10,`Max explica a tela ${v}`);results[v]=txt.slice(0,60);
   // não cobre botões: nenhum botão/campo interativo do conteúdo intersecta o dock
   const dock=await page.locator('#maxDock').boundingBox();
   const overlap=await page.evaluate(d=>[...document.querySelectorAll('.content button,.content input,.content select,.content textarea,.content a')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.right>d.x&&r.left<d.x+d.width&&r.bottom>d.y&&r.top<d.y+d.height}).length,dock);
   assert.equal(overlap,0,`Max não cobre campos/botões em ${v}`);
  }
  // Max por campo: leads
  await page.click('[data-v=relationship]');const btn=page.locator('text=Novo lead').first();if(await btn.count()){await btn.click();await page.waitForSelector('#leadname');await page.focus('#leadphone');const m1=await page.textContent('#maxDockReply');await page.focus('#leadsource');const m2=await page.textContent('#maxDockReply');assert.notEqual(m1,m2,'orientação diferente por campo');assert.match(m1,/WhatsApp/i);assert.match(m2,/origem/i);results.campo=[m1.slice(0,50),m2.slice(0,50)]}
  // Resultados: funil
  await page.click('[data-v=results]');assert.ok(await page.locator('text=Do post ao cliente').count(),'funil em Resultados');
  // Home: pedido em linguagem natural cai no mesmo fluxo, com Enter
  await page.click('[data-v=home]');await page.waitForSelector('#commandBox');await page.fill('#commandBox','post para vender minha mentoria de liderança no LinkedIn');await page.press('#commandBox','Enter');await page.waitForSelector('#quickRequest');await page.waitForSelector('#quickGo:not([disabled])');await page.waitForSelector('[data-q-card]');
  assert.ok((await page.locator('[data-q-group]').count())>=1,'criações anteriores listadas');
  // ferramentas antigas continuam abrindo (newsletter usa o formulário avançado)
  await page.click('#openTools');await page.click('[data-tool=newsletter]');await page.waitForSelector('#prompt');assert.ok(await page.locator('#gen').count(),'formulário avançado preservado');
  // responsivo: 900px
  await page.setViewportSize({width:900,height:800});await page.click('[data-v=create]');await page.waitForSelector('#maxDock');
  const d9=await page.locator('#maxDock').boundingBox();assert.ok(d9.width>300&&d9.height<260,'dock compacto em tela estreita');
  await page.screenshot({path:path.join(SHOTS,'criar-900.png')});
  for(const w of [1100,700]){await page.setViewportSize({width:w,height:800});await page.click('[data-v=create]');await page.waitForSelector('#maxDock');const b=await page.locator('#maxDock').boundingBox();assert.ok(b.x>=0&&b.x+b.width<=w+1,`dock dentro da tela em ${w}px: ${JSON.stringify(b)}`);const av=await page.locator('#maxDock img').isVisible();assert.ok(av,`avatar do Max visível em ${w}px`);const sc=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);assert.ok(!sc,`sem rolagem horizontal em ${w}px`)}
  await page.screenshot({path:path.join(SHOTS,'criar-700.png')});
  assert.deepEqual(errors,[],'sem erros de JS: '+errors.join(' | '));
  console.log('UI OK',JSON.stringify(results));
 }catch(e){console.error('FALHOU:',e.message);console.error(errors.join('\n'));console.error(log.slice(-800));process.exitCode=1}finally{await browser.close();srv.kill()}
})();
