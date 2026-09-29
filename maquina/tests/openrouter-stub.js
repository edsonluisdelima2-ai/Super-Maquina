'use strict';
// Caminho de IA "real" do servidor (sem SMC_FAKE_OPENROUTER) contra uma OpenRouter simulada em http local.
// Prova: resposta vazia -> nova tentativa com raciocínio desligado; resposta travada -> limite de tempo, sem bloquear a empresa.
const assert=require('assert'),http=require('http'),{spawn}=require('child_process'),fs=require('fs'),os=require('os'),path=require('path');
const STUB=3401,PORT=3402,BASE=`http://127.0.0.1:${PORT}`,DATA=fs.mkdtempSync(path.join(os.tmpdir(),'smcstub-'));
let mode='ok',emptyFirst=false,chatCalls=[],cookie='';
const stub=http.createServer((req,res)=>{let b='';req.on('data',x=>b+=x);req.on('end',()=>{
 if(mode==='hang')return; // nunca responde
 const send=(o)=>{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(o))};
 if(req.url==='/api/alpha/decisions')return send({model:'stub-jev',id:'d1',usage:{cost:0.0001},answers:{complexity:{type:'choice',choice:'economico',confidence:.95},requires_external_facts:{type:'noul',noul:.05},briefing_respected:{type:'noul',noul:.95},unsupported_specific_claims:{type:'noul',noul:.02},format_matches:{type:'noul',noul:.95},style_ok:{type:'noul',noul:.95}}});
 if(req.url==='/api/v1/credits')return send({data:{total_credits:10,total_usage:1}});
 if(req.url==='/api/v1/chat/completions'){const j=JSON.parse(b),prompt=String(j.messages.at(-1).content);chatCalls.push({reasoning:j.reasoning,max:j.max_tokens,model:j.model});
  if(emptyFirst&&!j.reasoning)return send({choices:[{message:{content:'',reasoning:'pensando muito...'},finish_reason:'length'}],usage:{cost:0.0004,completion_tokens:j.max_tokens}});
  const ls=[...prompt.matchAll(/\[\[VARIANTE([A-C])\]\]/g)].map(x=>x[1]);
  const content=ls.length?ls.map(l=>`[[VARIANTE${l}]]\nTexto da versão ${l} sobre o pedido, escrito em português natural para o teste do caminho real.`).join('\n\n'):'Texto simples do teste com conteúdo suficiente para passar.';
  return send({choices:[{message:{content},finish_reason:'stop'}],usage:{cost:0.0009,completion_tokens:80}});}
 res.writeHead(404);res.end('{}');});});
async function api(url,opt={}){const h={'X-SMC':'1'};if(cookie)h.Cookie=cookie;if(opt.body&&typeof opt.body!=='string'){h['Content-Type']='application/json';opt.body=JSON.stringify(opt.body)}const r=await fetch(BASE+url,{...opt,headers:h});const sc=r.headers.get('set-cookie');if(sc)cookie=sc.split(';')[0];let d={};try{d=await r.json()}catch{}return{status:r.status,d}}
(async()=>{
 await new Promise(r=>stub.listen(STUB,'127.0.0.1',r));
 const env={...process.env,PORT:String(PORT),SMC_DATA_DIR:DATA,BASE_URL:BASE,SMC_OPENROUTER_BASE:`http://127.0.0.1:${STUB}/api`,OPENROUTER_API_KEY:'chave-de-teste',SMC_AI_TIMEOUT_MS:'700'};delete env.SMC_FAKE_OPENROUTER;
 const srv=spawn(process.execPath,['server.js'],{env,stdio:['ignore','pipe','pipe']});let log='';srv.stdout.on('data',x=>log+=x);srv.stderr.on('data',x=>log+=x);
 try{
  for(let i=0;i<50;i++){try{if((await fetch(BASE+'/api/me')).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
  await api('/api/setup',{method:'POST',body:{password:'senha-teste-123'}});
  let r=await api('/api/clients',{method:'POST',body:{name:'Empresa Teste',plan:'equilibrado'}});const cid=r.d.id;
  const create=(extra={})=>api('/api/machine/create',{method:'POST',body:{clientId:cid,kind:'linkedin',tema:'delegar sem perder o controle da empresa',factual:false,...extra}});

  // 1. caminho real completo (Jev + geração + validação) contra a OpenRouter simulada
  r=await create();assert.equal(r.status,200,JSON.stringify(r.d));assert.match(r.d.items[0].text,/versão A/);assert.equal(r.d.items[0].quality.status,'aprovado');
  assert.ok(chatCalls.length>=1);assert.equal(chatCalls[0].reasoning,undefined,'primeira tentativa sem parâmetro de raciocínio');

  // 2. resposta vazia: tenta de novo com raciocínio desligado e 50% mais tokens
  chatCalls=[];emptyFirst=true;r=await create({variantes:2});assert.equal(r.status,200,JSON.stringify(r.d));assert.equal(r.d.items.length,2);
  emptyFirst=false;assert.equal(chatCalls.length,2,'duas chamadas: vazia e nova tentativa');
  assert.equal(chatCalls[0].reasoning,undefined);assert.deepEqual(chatCalls[1].reasoning,{enabled:false});assert.equal(chatCalls[1].max,Math.round(chatCalls[0].max*1.5),'50% mais tokens');
  r=await api('/api/costs?clientId='+cid);assert.ok(r.d.byKind.unknown>0,'tentativa vazia registrada como custo de falha');

  // 3. IA travada: o servidor desiste no limite de tempo, avisa e NÃO trava a empresa
  mode='hang';let t0=Date.now();r=await create();const dt=Date.now()-t0;
  assert.equal(r.status,502,JSON.stringify(r.d));assert.match(r.d.error,/demorou mais de/,'mensagem clara de tempo esgotado');assert.equal(r.d.chargedInternal,false);assert.ok(dt<8000,'não ficou pendurado: '+dt+' ms');
  t0=Date.now();r=await create();assert.equal(r.status,502,'a segunda tentativa também responde, sem "já existe criação em andamento": '+JSON.stringify(r.d));assert.ok(!/em andamento/.test(r.d.error));

  // 4. IA volta: a empresa continua utilizável
  mode='ok';r=await create();assert.equal(r.status,200,JSON.stringify(r.d));
  r=await api('/api/state?clientId='+cid);assert.equal(r.d.usage.filter(u=>u.clientId===cid).length,3,'só as 3 criações que entregaram texto foram cobradas; as que travaram não');
  console.log('STUB OK');
 }catch(e){console.error('FALHOU:',e.message);console.error(log.slice(-1200));process.exitCode=1}finally{srv.kill();stub.close()}
})();
