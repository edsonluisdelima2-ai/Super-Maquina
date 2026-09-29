'use strict';
// Teste do Engenheiro de Prompt (antes: fluxo "pedido -> posts por rede -> edição -> imagem -> pacote -> fila -> link -> lead".
// Usa o modo de teste da aplicação (SMC_FAKE_OPENROUTER=1): nenhuma chamada paga é feita.
const assert=require('assert'),{spawn}=require('child_process'),fs=require('fs'),os=require('os'),path=require('path');
const PORT=3393,BASE=`http://127.0.0.1:${PORT}`,DATA=fs.mkdtempSync(path.join(os.tmpdir(),'smc-'));
let cookie='';
async function api(url,opt={}){const h={'X-SMC':'1',...(opt.headers||{})};if(cookie)h.Cookie=cookie;if(opt.body&&typeof opt.body!=='string'){h['Content-Type']='application/json';opt.body=JSON.stringify(opt.body)}const r=await fetch(BASE+url,{...opt,headers:h,redirect:'manual'});const sc=r.headers.get('set-cookie');if(sc)cookie=sc.split(';')[0];let d={};try{d=await r.json()}catch{}return{status:r.status,d,r}}
(async()=>{
 const srv=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(PORT),SMC_DATA_DIR:DATA,SMC_FAKE_OPENROUTER:'1',BASE_URL:BASE},stdio:['ignore','pipe','pipe']});let log='';srv.stdout.on('data',x=>log+=x);srv.stderr.on('data',x=>log+=x);
 try{
  for(let i=0;i<50;i++){try{const r=await fetch(BASE+'/api/me');if(r.ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
  let r=await api('/api/setup',{method:'POST',body:{password:'senha-teste-123'}});assert.ok(r.status<300,'setup '+r.status+JSON.stringify(r.d));
  r=await api('/api/login',{method:'POST',body:{password:'senha-teste-123'}});assert.ok(r.status<300,'login '+r.status);
  r=await api('/api/clients',{method:'POST',body:{name:'Empresa Teste',plan:'equilibrado'}});assert.equal(r.status,200);const cid=r.d.id;
  // 1. logomarca: tipo detectado, prompt para o Gemini, sem "criar aqui"
  r=await api('/api/prompt/create',{method:'POST',body:{clientId:cid,request:'quero criar uma logomarca para minha empresa',target:'gemini'}});
  assert.equal(r.status,200,JSON.stringify(r.d));const logo=r.d;assert.equal(logo.type,'imagem');assert.equal(logo.canRunHere,false);assert.equal(logo.targetLabel,'Gemini');assert.match(logo.prompt,/logomarca/);assert.ok(logo.prompt.length>40);assert.ok(!/[*#`]/.test(logo.prompt),'sem marcação técnica');
  r=await api('/api/prompts/'+logo.id+'/run',{method:'POST',body:{}});assert.equal(r.status,409,'imagem não é criada aqui');
  // 2. pedido curto e alvo inválido
  r=await api('/api/prompt/create',{method:'POST',body:{clientId:cid,request:'oi'}});assert.equal(r.status,400);
  r=await api('/api/prompt/create',{method:'POST',body:{clientId:'x',request:'quero uma planilha de controle'}});assert.equal(r.status,404);
  r=await api('/api/prompt/create',{method:'POST',body:{clientId:cid,request:'quero uma planilha de controle de contas a pagar',target:'inexistente'}});assert.equal(r.status,200);assert.equal(r.d.type,'planilha');assert.equal(r.d.target,'gemini');assert.equal(r.d.canRunHere,true);const sheet=r.d;
  // 3. tipo escolhido pelo cliente vence a detecção
  r=await api('/api/prompt/create',{method:'POST',body:{clientId:cid,request:'preciso de algo para a minha empresa vender mais',target:'chatgpt',type:'documento'}});assert.equal(r.status,200);assert.equal(r.d.type,'documento');assert.equal(r.d.targetLabel,'ChatGPT');const doc=r.d;
  // 4. criar aqui: planilha vira CSV que abre no Excel (BOM, ponto e vírgula)
  r=await api('/api/prompts/'+sheet.id+'/run',{method:'POST',body:{prompt:sheet.prompt+'\nInclua a coluna Vencimento.'}});assert.equal(r.status,200,JSON.stringify(r.d));assert.ok(r.d.resultFiles.csv);assert.ok(r.d.prompt.includes('Vencimento'),'prompt editado foi usado');
  let f=await fetch(BASE+r.d.resultFiles.csv,{headers:{Cookie:cookie}});const csv=Buffer.from(await f.arrayBuffer());assert.equal(f.status,200);assert.equal(csv[0],0xEF);assert.ok(csv.toString('utf8').includes(';'));
  // 5. criar aqui: documento vira Word e PDF
  r=await api('/api/prompts/'+doc.id+'/run',{method:'POST',body:{}});assert.equal(r.status,200,JSON.stringify(r.d));assert.ok(r.d.result.length>20);
  f=await fetch(BASE+r.d.resultFiles.docx,{headers:{Cookie:cookie}});assert.equal(Buffer.from(await f.arrayBuffer()).readUInt32LE(0),0x04034b50,'docx é um zip');
  f=await fetch(BASE+r.d.resultFiles.pdf,{headers:{Cookie:cookie}});assert.equal(Buffer.from(await f.arrayBuffer()).slice(0,4).toString(),'%PDF');
  // 6. lista, uso e custo
  r=await api('/api/prompts?clientId='+cid);assert.equal(r.status,200);assert.equal(r.d.length,3);
  r=await api('/api/state?clientId='+cid);assert.ok(r.d.contents.length===0,'prompts não entram na lista de conteúdos publicáveis');
  // 7. login obrigatório e CSRF
  const raw=await fetch(BASE+'/api/prompts?clientId='+cid);assert.equal(raw.status,401);
  const nocsrf=await fetch(BASE+'/api/prompt/create',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({clientId:cid,request:'quero uma logomarca'})});assert.equal(nocsrf.status,403);
  console.log('PROMPT OK');
 }catch(e){console.error('FALHOU:',e.message);console.error(log.slice(-1500));process.exitCode=1}finally{srv.kill()}
})();
