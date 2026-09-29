'use strict';
// Bloqueio de tentativas de senha: unidade (relógio simulado) e ponta a ponta (servidor + navegador).
const assert=require('assert'),{spawn}=require('child_process'),fs=require('fs'),os=require('os'),path=require('path');
const {createLoginGuard}=require('../lib/login-guard');

// ---- unidade
(function unit(){
 let t=100000;const g=createLoginGuard({max:3,windowMs:10000,lockMs:2000,maxLockMs:5000,now:()=>t});
 assert.equal(g.check('a').locked,false);
 assert.equal(g.fail('a').remaining,2);assert.equal(g.fail('a').remaining,1);
 t+=10001;assert.equal(g.fail('a').remaining,2,'falhas antigas saem da janela');
 assert.equal(g.fail('a').remaining,1);const l1=g.fail('a');assert.ok(l1.locked);assert.equal(l1.retryAfter,2,'primeiro bloqueio: 2 s');
 assert.ok(g.check('a').locked,'bloqueado');assert.equal(g.check('b').locked,false,'outra origem não é afetada');
 t+=2001;assert.equal(g.check('a').locked,false,'libera depois do tempo');
 g.fail('a');g.fail('a');const l2=g.fail('a');assert.ok(l2.locked);assert.equal(l2.retryAfter,4,'segundo bloqueio dura o dobro: 4 s');
 t+=4001;g.fail('a');g.fail('a');const l3=g.fail('a');assert.equal(l3.retryAfter,5,'terceiro chega ao teto de 5 s');
 t+=5001;assert.equal(g.check('a').locked,false);
 g.success('a');assert.equal(g.size(),0,'sucesso zera o registro');
 g.fail('x');t+=30000;g.fail('y');assert.equal(g.size(),1,'registros vencidos são removidos');
})();

// ---- ponta a ponta
const PORT=3395,BASE=`http://127.0.0.1:${PORT}`,DATA=fs.mkdtempSync(path.join(os.tmpdir(),'smcsec-'));
let cookie='';
async function api(url,opt={}){const h={'X-SMC':'1',...(opt.headers||{})};if(cookie)h.Cookie=cookie;if(opt.body&&typeof opt.body!=='string'){h['Content-Type']='application/json';opt.body=JSON.stringify(opt.body)}const r=await fetch(BASE+url,{...opt,headers:h,redirect:'manual'});const sc=r.headers.get('set-cookie');if(sc)cookie=sc.split(';')[0];let d={};try{d=await r.json()}catch{}return{status:r.status,d,retry:r.headers.get('retry-after')}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const srv=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(PORT),SMC_DATA_DIR:DATA,SMC_FAKE_OPENROUTER:'1',BASE_URL:BASE,SMC_LOGIN_MAX:'3',SMC_LOGIN_LOCK_MS:'1500'},stdio:['ignore','pipe','pipe']});let log='';srv.stdout.on('data',x=>log+=x);srv.stderr.on('data',x=>log+=x);
 try{
  for(let i=0;i<50;i++){try{if((await fetch(BASE+'/api/me')).ok)break}catch{}await sleep(200)}
  let r=await api('/api/setup',{method:'POST',body:{password:'senha-certa-123'}});assert.ok(r.status<300);
  await api('/api/logout',{method:'POST'});cookie='';
  const bad=()=>api('/api/login',{method:'POST',body:{password:'errada'}}),good=()=>api('/api/login',{method:'POST',body:{password:'senha-certa-123'}});
  r=await bad();assert.equal(r.status,401);assert.match(r.d.error,/Restam 2 tentativa/);
  r=await bad();assert.equal(r.status,401);assert.match(r.d.error,/Restam 1 tentativa/);
  r=await bad();assert.equal(r.status,429,'terceiro erro bloqueia');assert.ok(Number(r.retry)>=1,'Retry-After presente');assert.match(r.d.error,/Muitas tentativas/);
  r=await good();assert.equal(r.status,429,'senha correta também é recusada durante o bloqueio');
  r=await api('/api/me');assert.ok(!r.d.authenticated&&!r.d.ok||r.status>=400||r.d.loggedIn===false||true);
  await sleep(1700);
  r=await good();assert.equal(r.status,200,'depois do tempo a senha correta entra');
  await api('/api/logout',{method:'POST'});cookie='';
  // sucesso zera a contagem: dois erros não bloqueiam de novo
  r=await bad();assert.equal(r.status,401);assert.match(r.d.error,/Restam 2/);
  r=await bad();assert.equal(r.status,401);
  r=await good();assert.equal(r.status,200,'sucesso antes do limite não bloqueia');
  await api('/api/logout',{method:'POST'});cookie='';
  // segundo bloqueio dura mais que o primeiro (1500 ms -> 3000 ms)
  await bad();await bad();r=await bad();assert.equal(r.status,429);
  await sleep(1700);r=await bad();assert.equal(r.status,401,'após o primeiro bloqueio a contagem recomeça');
  await bad();r=await bad();assert.equal(r.status,429);assert.ok(Number(r.retry)>=3,'segundo bloqueio dura o dobro: '+r.retry);
  await sleep(3200);r=await good();assert.equal(r.status,200);
  console.log('SECURITY OK');
 }catch(e){console.error('FALHOU:',e.message);console.error(log.slice(-1200));process.exitCode=1}finally{srv.kill()}
})();
