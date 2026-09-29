'use strict';
// Regressão de preservação: dados criados pela versão ANTERIOR precisam continuar íntegros e utilizáveis na nova.
// Uso: node tests/regression.js <pasta-da-versao-anterior>
const assert=require('assert'),{spawn}=require('child_process'),fs=require('fs'),os=require('os'),path=require('path');
const OLD=path.resolve(process.argv[2]||''),NEW=path.resolve(__dirname,'..'),DATA=fs.mkdtempSync(path.join(os.tmpdir(),'smcreg-')),PORT=3393,BASE=`http://127.0.0.1:${PORT}`;
let cookie='';
async function api(url,opt={}){const h={'X-SMC':'1',...(opt.headers||{})};if(cookie)h.Cookie=cookie;if(opt.body&&typeof opt.body!=='string'){h['Content-Type']='application/json';opt.body=JSON.stringify(opt.body)}const r=await fetch(BASE+url,{...opt,headers:h,redirect:'manual'});const sc=r.headers.get('set-cookie');if(sc)cookie=sc.split(';')[0];let d={};try{d=await r.json()}catch{}return{status:r.status,d}}
async function start(dir){const s=spawn(process.execPath,['server.js'],{cwd:dir,env:{...process.env,PORT:String(PORT),SMC_DATA_DIR:DATA,SMC_FAKE_OPENROUTER:'1',BASE_URL:BASE},stdio:'ignore'});for(let i=0;i<60;i++){try{if((await fetch(BASE+'/api/me')).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}return s}
const stop=s=>new Promise(r=>{s.on('exit',r);s.kill();setTimeout(r,2000)});
(async()=>{
 let srv=await start(OLD);let snap;
 try{
  let r=await api('/api/setup',{method:'POST',body:{password:'senha-teste-123'}});r=await api('/api/login',{method:'POST',body:{password:'senha-teste-123'}});assert.ok(r.status<300);
  r=await api('/api/clients',{method:'POST',body:{name:'Empresa Antiga',plan:'equilibrado'}});const cid=r.d.id;
  r=await api('/api/ai/generate',{method:'POST',body:{clientId:cid,kind:'post',prompt:'post simples sobre liderança para o antigo fluxo'}});assert.equal(r.status,200,JSON.stringify(r.d));const oldContent=r.d;
  r=await api('/api/leads',{method:'POST',body:{clientId:cid,name:'Lead Antigo',phone:'51999990001',status:'Proposta'}});assert.equal(r.status,200);const lead=r.d;
  r=await api('/api/links',{method:'POST',body:{clientId:cid,name:'Link antigo',action:'redirect',target:'https://example.com'}});assert.equal(r.status,200);const link=r.d;
  await fetch(BASE+'/link/'+link.token,{redirect:'manual'});
  r=await api('/api/state?clientId='+cid);snap={contents:r.d.contents.length,leads:r.d.leads.length,links:r.d.links.length,clients:r.d.clients.length,hits:r.d.links.find(x=>x.id===link.id).hits};
  await stop(srv);
  // sobe a versão NOVA sobre os mesmos dados
  srv=await start(NEW);cookie='';
  r=await api('/api/login',{method:'POST',body:{password:'senha-teste-123'}});assert.ok(r.status<300,'login com senha antiga continua valendo');
  r=await api('/api/state?clientId='+cid);
  assert.equal(r.d.contents.length,snap.contents,'conteúdos preservados');assert.equal(r.d.leads.length,snap.leads,'leads preservados');assert.equal(r.d.links.length,snap.links,'links preservados');assert.equal(r.d.clients.length,snap.clients,'empresas preservadas');
  assert.equal(r.d.links.find(x=>x.id===link.id).hits,snap.hits,'contador de acessos preservado');
  assert.equal(r.d.leads.find(x=>x.id===lead.id).status,'Proposta','estágio do lead preservado');
  const c0=r.d.contents.find(x=>x.id===oldContent.id);assert.ok(c0&&c0.text===oldContent.text,'texto antigo intacto');
  assert.ok(Array.isArray(r.d.dashboard.funnel),'painel novo funciona com dados antigos');
  // funções antigas continuam
  r=await api('/api/contents/'+oldContent.id,{method:'PUT',body:{text:'Texto antigo revisado após a atualização, ainda funcionando.'}});assert.equal(r.status,200);
  r=await api('/api/contents/'+oldContent.id,{method:'PUT',body:{status:'Aprovado'}});assert.equal(r.status,200);
  r=await api('/api/ai/generate',{method:'POST',body:{clientId:cid,kind:'post',prompt:'novo post pelo fluxo avançado antigo'}});assert.equal(r.status,200,'geração avançada antiga continua');
  r=await api('/api/leads/'+lead.id,{method:'PUT',body:{status:'Cliente'}});assert.equal(r.status,200);
  r=await api('/api/backup',{method:'GET'});assert.ok(r.status<400,'backup continua funcionando: '+r.status);
  console.log('REGRESSÃO OK',JSON.stringify(snap));
 }catch(e){console.error('FALHOU:',e.message);process.exitCode=1}finally{await stop(srv)}
})();
