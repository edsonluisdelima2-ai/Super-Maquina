'use strict';
// Teste da Página de venda: criação, edição, promoções, link dinâmico, captura, clique e exportação.
// Usa o modo de teste da aplicação (SMC_FAKE_OPENROUTER=1): nenhuma chamada paga é feita.
const assert=require('assert'),{spawn}=require('child_process'),fs=require('fs'),os=require('os'),path=require('path');
const PORT=3395,BASE=`http://127.0.0.1:${PORT}`,DATA=fs.mkdtempSync(path.join(os.tmpdir(),'smc-'));
let cookie='';
async function api(url,opt={}){const h={'X-SMC':'1',...(opt.headers||{})};if(cookie)h.Cookie=cookie;if(opt.body&&typeof opt.body!=='string'){h['Content-Type']='application/json';opt.body=JSON.stringify(opt.body)}const r=await fetch(BASE+url,{...opt,headers:h,redirect:'manual'});const sc=r.headers.get('set-cookie');if(sc)cookie=sc.split(';')[0];let d={};try{d=await r.json()}catch{}return{status:r.status,d,r}}
(async()=>{
 const srv=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(PORT),SMC_DATA_DIR:DATA,SMC_FAKE_OPENROUTER:'1',BASE_URL:BASE},stdio:['ignore','pipe','pipe']});let log='';srv.stdout.on('data',x=>log+=x);srv.stderr.on('data',x=>log+=x);
 try{
  for(let i=0;i<50;i++){try{const r=await fetch(BASE+'/api/me');if(r.ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
  let r=await api('/api/setup',{method:'POST',body:{password:'senha-teste-123'}});assert.ok(r.status<300,'setup '+r.status+JSON.stringify(r.d));
  r=await api('/api/login',{method:'POST',body:{password:'senha-teste-123'}});assert.ok(r.status<300,'login '+r.status);
  r=await api('/api/clients',{method:'POST',body:{name:'Empresa Teste',plan:'equilibrado'}});assert.equal(r.status,200);const cid=r.d.id;
  const pub=async(u,o={})=>fetch(BASE+u,{redirect:'manual',...o});
  // 1. criação a partir de um pedido simples
  r=await api('/api/pages/create',{method:'POST',body:{clientId:cid,request:'página para vender a minha mentoria de liderança para empresas'}});assert.equal(r.status,200,JSON.stringify(r.d));const pg=r.d;
  assert.ok(pg.headline&&pg.sub&&pg.beneficios&&pg.como&&pg.paraQuem&&pg.fechamento,'todas as partes');assert.equal(pg.ctaMode,'form');assert.ok(/^#[0-9a-f]{6}$/i.test(pg.theme.primary));
  r=await api('/api/pages/create',{method:'POST',body:{clientId:cid,request:'oi'}});assert.equal(r.status,400);
  r=await api('/api/pages/create',{method:'POST',body:{clientId:'x',request:'página para vender um produto'}});assert.equal(r.status,404);
  // 2. edição e validações
  r=await api('/api/pages/'+pg.id,{method:'PUT',body:{headline:'Título <script>alert(1)</script> da página'}});assert.equal(r.status,200);
  r=await api('/api/pages/'+pg.id,{method:'PUT',body:{headline:''}});assert.equal(r.status,400);
  r=await api('/api/pages/'+pg.id,{method:'PUT',body:{ctaMode:'redirect',ctaUrl:''}});assert.equal(r.status,400,'redirecionar exige destino');
  r=await api('/api/pages/'+pg.id,{method:'PUT',body:{ctaUrl:'javascript:alert(1)'}});assert.equal(r.status,400);
  r=await api('/api/pages/'+pg.id,{method:'PUT',body:{theme:{primary:'vermelho'}}});assert.equal(r.status,400);
  const fut=new Date(Date.now()+10*864e5).toISOString().slice(0,10),past=new Date(Date.now()-3*864e5).toISOString().slice(0,10);
  r=await api('/api/pages/'+pg.id,{method:'PUT',body:{promos:[{label:'Lançamento',title:'Condição especial de lançamento',text:'Vagas limitadas para a primeira turma.',price:'Condição informada pelo cliente',validUntil:fut},{label:'Antiga',title:'Promoção velha',validUntil:past}]}});assert.equal(r.status,200);assert.equal(r.d.promos.length,2);const [p1,p2]=r.d.promos;
  r=await api('/api/pages/'+pg.id,{method:'PUT',body:{activePromoId:p1.id}});assert.equal(r.d.activePromoId,p1.id);
  r=await api('/api/pages/'+pg.id,{method:'PUT',body:{activePromoId:'inexistente'}});assert.equal(r.d.activePromoId,'','promoção inexistente é ignorada');
  await api('/api/pages/'+pg.id,{method:'PUT',body:{activePromoId:p1.id}});
  // 3. link dinâmico público
  r=await api('/api/pages/'+pg.id+'/link',{method:'POST',body:{}});assert.equal(r.status,200);const lk=r.d;assert.equal(lk.action,'page');
  let h=await pub('/link/'+lk.token);assert.equal(h.status,200);let html=await h.text();
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'),'título escapado');assert.ok(!html.includes('<script>alert'),'sem XSS');
  const scripts=[...html.matchAll(/<script[^>]*>/g)].map(x=>x[0]);assert.deepEqual(scripts,['<script src="/link.js">'],'sem script inline');
  assert.ok(html.includes('Condição especial de lançamento'),'promoção ativa aparece');assert.ok(html.includes('id=pubname'),'formulário de contato');assert.ok(/max-width:640px/.test(html),'responsivo');
  assert.match(h.headers.get('content-security-policy')||'',/script-src 'self'/);
  // 4. promoção vencida some sozinha; futura aparece com data
  assert.match(html,/Válida até \d\d\/\d\d\/\d{4}/);
  await api('/api/pages/'+pg.id,{method:'PUT',body:{activePromoId:p2.id}});html=await (await pub('/link/'+lk.token)).text();assert.ok(!html.includes('Promoção velha'),'promoção vencida não aparece');
  await api('/api/pages/'+pg.id,{method:'PUT',body:{activePromoId:p1.id}});
  // 5. trocar a página sem trocar o link
  r=await api('/api/pages/create',{method:'POST',body:{clientId:cid,request:'página para vender a sessão de clareza avulsa'}});const pg2=r.d;await api('/api/pages/'+pg2.id,{method:'PUT',body:{headline:'Segunda página de vendas'}});
  r=await api('/api/links/'+lk.id+'/page',{method:'POST',body:{pageId:pg2.id}});assert.equal(r.status,200);
  html=await (await pub('/link/'+lk.token)).text();assert.ok(html.includes('Segunda página de vendas'),'mesmo link mostra outra página');
  r=await api('/api/clients',{method:'POST',body:{name:'Outra Empresa',plan:'equilibrado'}});const other=r.d.id;r=await api('/api/pages/create',{method:'POST',body:{clientId:other,request:'página para vender outro produto'}});const foreign=r.d;
  r=await api('/api/links/'+lk.id+'/page',{method:'POST',body:{pageId:foreign.id}});assert.equal(r.status,404,'não troca para página de outra empresa');
  await api('/api/links/'+lk.id+'/page',{method:'POST',body:{pageId:pg.id}});
  // 6. captura de contato vira lead com página e promoção
  let s=await pub('/public/link/'+lk.token+'/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Maria Souza',phone:'51 99999-0000',notes:'Quero saber valores'})});assert.equal(s.status,200);
  s=await pub('/public/link/'+lk.token+'/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Sem contato'})});assert.equal(s.status,400);
  r=await api('/api/state?clientId='+cid);const lead=r.d.leads.find(x=>x.name==='Maria Souza');assert.ok(lead,'lead criado');assert.equal(lead.source,'link:'+lk.token);assert.match(lead.notes,/Página:/);assert.match(lead.notes,/Promoção: Lançamento/);assert.match(lead.notes,/Quero saber valores/);
  r=await api('/api/pages?clientId='+cid);const info=r.d.links.find(x=>x.id===lk.id);assert.equal(info.leads,1);assert.ok(info.hits>=3);assert.equal(r.d.pages.length,2);
  // 7. botão que leva a um link: clique contado, com utm
  r=await api('/api/pages/'+pg.id,{method:'PUT',body:{ctaMode:'redirect',ctaUrl:'https://wa.me/5551999990000'}});assert.equal(r.status,200);
  html=await (await pub('/link/'+lk.token)).text();assert.ok(html.includes('/link/'+lk.token+'/go'));assert.ok(!html.includes('id=pubname'),'sem formulário no modo link');
  let go=await pub('/link/'+lk.token+'/go');assert.equal(go.status,302);const loc=go.headers.get('location');assert.match(loc,/^https:\/\/wa\.me\/5551999990000/);assert.match(loc,/utm_source=pagina/);assert.ok(loc.includes('utm_campaign='+pg.id));assert.ok(loc.includes('utm_content='+p1.id));
  r=await api('/api/pages?clientId='+cid);assert.equal(r.d.links.find(x=>x.id===lk.id).clicks,1);
  // 8. exportação: só com destino; sai sem o script da plataforma
  r=await api('/api/pages/'+pg.id+'/export',{method:'POST'});assert.equal(r.status,200,JSON.stringify(r.d));const z=await fetch(BASE+r.d.url,{headers:{Cookie:cookie}});const zb=Buffer.from(await z.arrayBuffer());assert.equal(zb.readUInt32LE(0),0x04034b50);assert.ok(zb.includes(Buffer.from('index.html')));assert.ok(zb.includes(Buffer.from('wa.me')));assert.ok(!zb.includes(Buffer.from('link.js')));
  r=await api('/api/pages/'+pg2.id+'/export',{method:'POST'});assert.equal(r.status,409,'modo formulário não exporta');
  // 8b. publicação em endereço gratuito: endereço publicado, QR e link dinâmico que leva até lá
  r=await api('/api/pages/'+pg.id+'/qr',{method:'POST',body:{}});assert.equal(r.status,409,'QR exige o endereço publicado');
  r=await api('/api/pages/'+pg.id,{method:'PUT',body:{publishedUrl:'http://inseguro.exemplo'}});assert.equal(r.status,400,'só https');
  r=await api('/api/pages/'+pg.id,{method:'PUT',body:{linkTarget:'published'}});assert.equal(r.status,400,'destino publicado exige endereço');
  r=await api('/api/pages/'+pg.id,{method:'PUT',body:{publishedUrl:'https://minha-pagina.pages.dev'}});assert.equal(r.status,200);assert.equal(r.d.publishedUrl,'https://minha-pagina.pages.dev');
  r=await api('/api/pages/'+pg.id+'/qr',{method:'POST',body:{}});assert.equal(r.status,200);assert.equal(r.d.target,'https://minha-pagina.pages.dev');const qrb=Buffer.from(await (await fetch(BASE+r.d.url,{headers:{Cookie:cookie}})).arrayBuffer());assert.equal(qrb.slice(1,4).toString(),'PNG');
  r=await api('/api/pages/'+pg.id+'/qr',{method:'POST',body:{format:'svg'}});assert.equal(r.status,200);assert.ok((await (await fetch(BASE+r.d.url,{headers:{Cookie:cookie}})).text()).includes('<svg'));
  r=await api('/api/links/'+lk.id+'/qr');assert.equal(r.status,200,'QR do link dinâmico');
  r=await api('/api/pages/'+pg.id,{method:'PUT',body:{linkTarget:'published'}});assert.equal(r.status,200);
  go=await pub('/link/'+lk.token);assert.equal(go.status,302);assert.equal(go.headers.get('location'),'https://minha-pagina.pages.dev','o mesmo link/QR leva à página publicada');
  r=await api('/api/pages/'+pg.id,{method:'PUT',body:{linkTarget:'platform'}});go=await pub('/link/'+lk.token);assert.equal(go.status,200,'volta a servir a página da plataforma');
  r=await api('/api/pages/'+pg.id+'/export',{method:'POST'});const zz=Buffer.from(await (await fetch(BASE+r.d.url,{headers:{Cookie:cookie}})).arrayBuffer());assert.ok(zz.includes(Buffer.from('Netlify Drop')));assert.ok(zz.includes(Buffer.from('Endereço que o site gratuito mostrou')));
  // 9. prévia protegida e embutível só na própria plataforma
  let pv=await pub('/api/pages/'+pg.id+'/preview');assert.equal(pv.status,401);
  pv=await fetch(BASE+'/api/pages/'+pg.id+'/preview',{headers:{Cookie:cookie}});assert.equal(pv.status,200);assert.equal(pv.headers.get('x-frame-options'),'SAMEORIGIN');const pvh=await pv.text();assert.ok(!pvh.includes('<script'),'prévia sem script');
  // 10. editar exige sessão e CSRF
  const nc=await fetch(BASE+'/api/pages/'+pg.id,{method:'PUT',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({headline:'x'})});assert.equal(nc.status,403);
  // 11. apagar a página: o link avisa em vez de quebrar
  r=await api('/api/pages/'+pg.id,{method:'DELETE'});assert.equal(r.status,200);assert.equal(r.d.orphanLinks,1);
  h=await pub('/link/'+lk.token);assert.equal(h.status,404);assert.match(await h.text(),/não está mais disponível/);
  console.log('SALES OK');
 }catch(e){console.error('FALHOU:',e.message);console.error(log.slice(-1500));process.exitCode=1}finally{srv.kill()}
})();
