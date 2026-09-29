'use strict';
// Teste de ponta a ponta do fluxo "pedido -> posts por rede -> edição -> imagem -> pacote -> fila -> link -> lead".
// Usa o modo de teste da aplicação (SMC_FAKE_OPENROUTER=1): nenhuma chamada paga é feita.
const assert=require('assert'),{spawn}=require('child_process'),fs=require('fs'),os=require('os'),path=require('path');
const PORT=3391,BASE=`http://127.0.0.1:${PORT}`,DATA=fs.mkdtempSync(path.join(os.tmpdir(),'smc-'));
let cookie='';
async function api(url,opt={}){const h={'X-SMC':'1',...(opt.headers||{})};if(cookie)h.Cookie=cookie;if(opt.body&&typeof opt.body!=='string'){h['Content-Type']='application/json';opt.body=JSON.stringify(opt.body)}const r=await fetch(BASE+url,{...opt,headers:h,redirect:'manual'});const sc=r.headers.get('set-cookie');if(sc)cookie=sc.split(';')[0];let d={};try{d=await r.json()}catch{}return{status:r.status,d,r}}
(async()=>{
 const srv=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(PORT),SMC_DATA_DIR:DATA,SMC_FAKE_OPENROUTER:'1',BASE_URL:BASE},stdio:['ignore','pipe','pipe']});let log='';srv.stdout.on('data',x=>log+=x);srv.stderr.on('data',x=>log+=x);
 try{
  for(let i=0;i<50;i++){try{const r=await fetch(BASE+'/api/me');if(r.ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
  let r=await api('/api/setup',{method:'POST',body:{password:'senha-teste-123'}});assert.ok(r.status<300,'setup '+r.status+JSON.stringify(r.d));
  r=await api('/api/login',{method:'POST',body:{password:'senha-teste-123'}});assert.ok(r.status<300,'login '+r.status);
  r=await api('/api/clients',{method:'POST',body:{name:'Empresa Teste',plan:'equilibrado'}});assert.equal(r.status,200);const cid=r.d.id;
  // 1. pedido simples -> uma versão por rede
  r=await api('/api/quick/create',{method:'POST',body:{clientId:cid,request:'post para vender mentoria de liderança para empresas',networks:['linkedin','instagram']}});
  assert.equal(r.status,200,JSON.stringify(r.d));assert.equal(r.d.items.length,2);
  const [li,ig]=r.d.items;assert.equal(li.network,'linkedin');assert.equal(ig.network,'instagram');assert.notEqual(li.text,ig.text);
  assert.match(li.text,/#lideranca/,'hashtag preservada no início de linha');assert.equal(li.status,'Rascunho');assert.equal(li.groupId,ig.groupId);
  // pedido curto demais
  r=await api('/api/quick/create',{method:'POST',body:{clientId:cid,request:'oi'}});assert.equal(r.status,400);
  // 2. edição livre em rascunho
  r=await api('/api/contents/'+li.id,{method:'PUT',body:{text:'Texto editado pelo cliente, ainda em rascunho, pronto para revisão.'}});assert.equal(r.status,200);assert.match(r.d.text,/editado/);
  // 3. imagem própria: upload em materiais e anexo
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  r=await api('/api/media',{method:'POST',body:{clientId:cid,name:'minha arte.png',type:'image/png',data:png}});assert.equal(r.status,200);const asset=r.d;
  r=await api('/api/contents/'+li.id,{method:'PUT',body:{imageAssetId:asset.id}});assert.equal(r.status,200);assert.equal(r.d.image.assetId,asset.id);
  r=await api('/api/contents/'+li.id,{method:'PUT',body:{imageAssetId:'inexistente'}});assert.equal(r.status,400);
  // 4. aprovar; editar depois de aprovado volta para revisão
  r=await api('/api/contents/'+li.id,{method:'PUT',body:{status:'Aprovado'}});assert.equal(r.status,200);assert.equal(r.d.status,'Aprovado');
  r=await api('/api/contents/'+li.id,{method:'PUT',body:{text:'Novo texto depois da aprovação, precisa de nova revisão.'}});assert.equal(r.d.status,'Em revisão');
  r=await api('/api/contents/'+li.id,{method:'PUT',body:{status:'Aprovado'}});assert.equal(r.d.status,'Aprovado');
  // 5. pacote pronto para publicar manualmente (texto + imagem)
  r=await api('/api/contents/'+li.id+'/package',{method:'POST'});assert.equal(r.status,200);assert.ok(r.d.hasImage);
  const z=await fetch(BASE+r.d.url,{headers:{Cookie:cookie}});const zb=Buffer.from(await z.arrayBuffer());assert.equal(zb.readUInt32LE(0),0x04034b50);assert.ok(zb.includes(Buffer.from('legenda.txt')));assert.ok(zb.includes(Buffer.from('imagem.png')));
  // 6. fila de publicação: só aprovado entra; depois de na fila, texto fica travado
  r=await api('/api/content-engine/publication',{method:'POST',body:{clientId:cid,contentId:ig.id,network:'instagram'}});assert.ok(r.status>=400,'rascunho não pode ir para a fila');
  r=await api('/api/content-engine/publication',{method:'POST',body:{clientId:cid,contentId:li.id,network:'linkedin'}});assert.ok(r.status<300,'fila '+r.status+JSON.stringify(r.d));
  r=await api('/api/contents/'+li.id,{method:'PUT',body:{text:'Tentativa de edição com o conteúdo já na fila.'}});assert.equal(r.status,409);
  r=await api('/api/contents/'+li.id+'/queue-remove',{method:'POST'});assert.equal(r.d.removed,1);
  r=await api('/api/contents/'+li.id,{method:'PUT',body:{text:'Agora pode editar de novo depois de retirar da fila.'}});assert.equal(r.status,200);assert.equal(r.d.status,'Em revisão');
  // 7. link rastreável por post + lead atribuído ao post
  r=await api('/api/contents/'+li.id+'/track',{method:'POST',body:{action:'redirect',target:'meusite'}});assert.equal(r.status,400);
  r=await api('/api/contents/'+li.id+'/track',{method:'POST',body:{action:'redirect',target:'https://example.com/mentoria'}});assert.equal(r.status,200);assert.match(r.d.target,/utm_campaign=/);const tk=r.d;
  const again=await api('/api/contents/'+li.id+'/track',{method:'POST',body:{action:'redirect',target:'https://example.com/mentoria'}});assert.equal(again.d.id,tk.id,'idempotente');
  const hit=await fetch(BASE+'/link/'+tk.token,{redirect:'manual'});assert.equal(hit.status,302);
  r=await api('/api/contents/'+ig.id+'/track',{method:'POST',body:{action:'form'}});assert.equal(r.status,200);const fl=r.d;
  const sub=await fetch(BASE+'/public/link/'+fl.token+'/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Maria',phone:'51999990000',email:'m@ex.com'})});assert.equal(sub.status,200);
  r=await api('/api/state?clientId='+cid);const f=r.d.dashboard.funnel;const fi=f.find(x=>x.contentId===ig.id),fl2=f.find(x=>x.contentId===li.id);
  assert.equal(fi.leads,1,'lead atribuído ao post do Instagram');assert.equal(fl2.hits,1,'clique contado no post do LinkedIn');
  const lead=r.d.leads.find(x=>x.name==='Maria');assert.equal(lead.contentId,ig.id);
  // 8. carrossel detectado pelo pedido
  r=await api('/api/quick/create',{method:'POST',body:{clientId:cid,request:'carrossel sobre erros de liderança',networks:['instagram']}});assert.equal(r.status,200);assert.equal(r.d.items[0].kind,'carousel');
  // 9. nada foi publicado
  r=await api('/api/state?clientId='+cid);assert.ok(!r.d.contents.some(x=>['Agendado','Publicado'].includes(x.status)),'nenhum conteúdo publicado');
  console.log('QUICK OK');
 }catch(e){console.error('FALHOU:',e.message);console.error(log.slice(-1500));process.exitCode=1}finally{srv.kill()}
})();
