'use strict';
/* Super Máquina — entrada simples ("diga o que quer"), posts por rede, imagem própria,
   fila com aprovação, link rastreável por post e Max como guia em todas as telas.
   Carregado depois de app.js e content.js: estende as funções existentes sem apagá-las. */

const QNETS=[['linkedin','LinkedIn'],['instagram','Instagram'],['facebook','Facebook']];
let quickGroupId='',quickText='',quickNets=null,quickCarousel=false,quickBusy=false,quickError='',quickWarn=[],quickNotice={},quickTrack={},quickTrackOpen={},maxDockMin=false,maxContextLine='',maxHold=0;

const qLabel=n=>(QNETS.find(x=>x[0]===n)||[n,n])[1];
const qQueue=id=>((typeof CE!=='undefined'&&CE.publications)||[]).find(x=>x.contentId===id&&x.status!=='Removida');
function qSelectedNets(){if(quickNets)return quickNets;const own=(cur()?.networks||[]).map(x=>String(typeof x==='string'?x:(x.name||x.network||'')).toLowerCase());const sel=QNETS.map(x=>x[0]).filter(k=>own.some(o=>o.includes(k)));return sel.length?sel:['linkedin','instagram']}
function qGroups(){const list=(S.contents||[]).filter(x=>x.clientId===clientId&&x.groupId),map=new Map();for(const ct of list){if(!map.has(ct.groupId))map.set(ct.groupId,[]);map.get(ct.groupId).push(ct)}return[...map.entries()].map(([id,items])=>({id,items:items.sort((a,b)=>QNETS.findIndex(x=>x[0]===a.network)-QNETS.findIndex(x=>x[0]===b.network)),at:items[0].createdAt,goal:items[0].goal})).sort((a,b)=>a.at<b.at?1:-1)}
function qCurrentGroup(){const g=qGroups();return g.find(x=>x.id===quickGroupId)||g[0]||null}
const qStatusClass=s=>({'Aprovado':'ok','Em revisão':'warn','Rascunho':'draft'}[s]||'draft');

function quickCard(ct){
 const c=cur(),queued=qQueue(ct.id),img=ct.image&&ct.image.url?ct.image:null,images=(c.media||[]).filter(m=>/^image\//i.test(m.type||'')),trk=(S.links||[]).find(l=>l.id===ct.trackLinkId),info=quickTrack[ct.id],fun=(S.dashboard?.funnel||[]).find(f=>f.contentId===ct.id);
 const status=queued?'Na fila':ct.status;
 return `<article class=q-card data-q-card="${ct.id}"><header><div><b>${esc(qLabel(ct.network))}</b><span class="q-badge ${queued?'ok':qStatusClass(ct.status)}">${esc(status)}</span></div><small data-q-count="${ct.id}">${(ct.text||'').length} caracteres</small></header>
 ${ct.kind==='carousel'?'<p class=q-hint>Carrossel: cada “Slide” vira uma imagem. A legenda vem no final.</p>':''}
 <textarea data-q-text="${ct.id}" rows=${ct.kind==='carousel'?14:10} ${queued?'disabled':''} data-max="qtext">${esc(ct.text||'')}</textarea>
 ${queued?`<div class=q-note>Este conteúdo está na fila de publicação e não pode ser editado. A publicação automática ainda não está ativa: use “Baixar pacote” para publicar agora. <button class=btn data-q-unqueue="${ct.id}">Retirar da fila para editar</button></div>`:''}
 <div class=q-image><div class=q-thumb>${img?`<img src="${esc(img.url)}" alt="Imagem do post">`:'<span>Sem imagem</span>'}</div><div class=q-imgtools><b>Imagem</b><p class=q-hint>${img?esc(img.name||'Imagem anexada'):'Publique só o texto, ou anexe uma imagem sua (por exemplo, uma arte feita na sua própria IA).'}</p>${queued?'':`<div class=q-imgrow><select data-q-imgsel="${ct.id}" data-max="qimgsel"><option value="">Escolher da Biblioteca…</option>${images.map(m=>`<option value="${m.id}" ${img&&img.assetId===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select><label class="btn q-upload">Enviar do computador<input type=file accept="image/png,image/jpeg,image/webp" hidden data-q-imgup="${ct.id}"></label>${img?`<button class=btn data-q-imgrm="${ct.id}">Remover imagem</button>`:''}</div>`}</div></div>
 <div class=actions>${queued?'':`<button class=btn data-q-save="${ct.id}">Salvar edição</button>`}<button class=btn data-q-copy="${ct.id}">Copiar texto</button><button class=btn data-q-pack="${ct.id}">Baixar pacote (texto${img?' + imagem':''})</button>${!queued&&ct.status!=='Aprovado'?`<button class="btn primary" data-q-approve="${ct.id}">Aprovar</button>`:''}${!queued&&ct.status==='Aprovado'?`<button class="btn primary" data-q-queue="${ct.id}">Enviar para a fila</button>`:''}<button class=btn data-q-trackbtn="${ct.id}">Link rastreável</button></div>
 ${quickNotice[ct.id]?`<div class=q-note>${esc(quickNotice[ct.id])}</div>`:''}
 ${quickTrackOpen[ct.id]&&!trk?`<div class=q-track><label>Para onde a pessoa vai ao clicar? <input data-q-target="${ct.id}" placeholder="https://seusite.com.br ou link do WhatsApp" data-max="qtarget"></label><div class=actions><button class="btn primary" data-q-trackgo="${ct.id}|redirect">Criar link de redirecionamento</button><button class=btn data-q-trackgo="${ct.id}|form">Ou receber contato por formulário</button></div></div>`:''}
 ${trk?`<div class=q-track><b>Link deste post</b><div class=q-linkline><code>${esc(info?.url||location.origin+'/link/'+trk.token)}</code><button class=btn data-copylink="${esc(info?.url||location.origin+'/link/'+trk.token)}">Copiar link</button></div><small>${trk.hits||0} clique(s) · ${fun?fun.leads:0} lead(s)</small>${info&&info.publicUrl===false?'<div class=q-note>Este link só abre neste computador. Para funcionar nas redes, peça ao suporte para ativar o endereço público da sua instalação.</div>':''}</div>`:''}
 </article>`;
}

function quickView(c){
 const nets=qSelectedNets(),g=qCurrentGroup(),groups=qGroups();
 return `<div class=q-hero><div class=eyebrow>Criar</div><h2>O que você quer publicar?</h2><p class=muted>Escreva em uma frase. Eu uso os dados da sua empresa e monto uma versão para cada rede, no formato de cada uma.</p>
 <textarea id=quickRequest rows=3 data-max="quickRequest" placeholder="Ex.: post para vender minha mentoria de liderança para empresas">${esc(quickText)}</textarea>
 <div class=q-nets>${QNETS.map(([k,l])=>`<label class=q-chip><input type=checkbox data-q-net="${k}" ${nets.includes(k)?'checked':''}> ${l}</label>`).join('')}<label class=q-chip><input type=checkbox id=quickCarousel ${quickCarousel?'checked':''}> Carrossel</label></div>
 <div class=actions><button class="btn primary" id=quickGo ${quickBusy?'disabled':''}>${quickBusy?'Criando…':'Criar publicações'}</button><button class=btn id=openTools>Outras ferramentas</button><span class=smallline>Enter cria · Shift + Enter quebra linha</span></div>
 ${quickError?`<div class=q-error>${esc(quickError)}</div>`:''}${quickWarn.length?`<div class=q-note>${quickWarn.map(esc).join('<br>')}</div>`:''}</div>
 ${g?`<div class=q-groupinfo><h3>Suas publicações</h3><p class=muted>Pedido: “${esc(g.goal)}”. Revise, edite o que quiser, anexe sua imagem e aprove. Só vai para a fila depois de aprovado.</p></div><div class=q-cards>${g.items.map(quickCard).join('')}</div>`:'<div class=empty>Suas publicações aparecem aqui, prontas para revisar e editar.</div>'}
 ${groups.length>1?`<details class=q-older><summary>Criações anteriores (${groups.length-1})</summary>${groups.filter(x=>!g||x.id!==g.id).slice(0,15).map(x=>`<button class=q-oldbtn data-q-group="${x.id}"><b>${esc((x.goal||'').slice(0,90))}</b><span>${x.items.map(i=>qLabel(i.network)).join(' · ')} · ${new Date(x.at).toLocaleDateString('pt-BR')}</span></button>`).join('')}</details>`:''}`;
}

const baseCreateQuick=create;
create=function(){const c=cur();if(!c)return empty();if(createKind&&!['post','carousel','multinetwork'].includes(createKind))return baseCreateQuick();return quickView(c)};

async function quickCreate(text,nets){
 const c=cur();if(!c||quickBusy)return;text=String(text||'').trim();if(text.length<8){quickError='Conte em uma frase o que você quer publicar.';setMaxState('speaking','Preciso de uma frase um pouco mais completa. Diga o que quer publicar e para quem.');view='create';createKind='post';return render()}
 quickBusy=true;quickError='';quickWarn=[];quickText=text;view='create';createKind='post';setMaxState('thinking','Lendo os dados da sua empresa e escrevendo uma versão para cada rede.');render();
 try{
  const d=await api('/api/quick/create',{method:'POST',body:{clientId,request:text,networks:nets||qSelectedNets(),format:quickCarousel?'carousel':undefined}});
  quickGroupId=d.groupId;quickWarn=d.warnings||[];quickText='';await refresh();quickBusy=false;setMaxState('speaking',`Pronto. Criei ${d.items.length} versão(ões). Revise, edite e aprove.`);render();
 }catch(e){
  quickBusy=false;
  if(/fallback pago|escalada paga|cota configurada/i.test(e.message)&&confirm(e.message+'\n\nDeseja autorizar o fallback pago da OpenRouter para esta e próximas operações?')){await api('/api/clients/'+clientId+'/ai',{method:'POST',body:{paidFallbackAuthorized:true}});await refresh();return quickCreate(text,nets)}
  quickError=e.message;setMaxState('speaking','Não consegui concluir. '+e.message);render();
 }
}

const baseExecuteKindQuick=executeKind;
executeKind=function(kind,prompt){if(['post','multinetwork','carousel'].includes(kind)){if(kind==='carousel')quickCarousel=true;return quickCreate(prompt,null)}return baseExecuteKindQuick(kind,prompt)};

async function qSaveText(id){const ta=$(`[data-q-text="${id}"]`);if(!ta)return true;const ct=contentById(id);if(ct&&ta.value===ct.text)return true;try{await api('/api/contents/'+id,{method:'PUT',body:{text:ta.value}});quickNotice[id]='';return true}catch(e){quickNotice[id]=e.message;setMaxState('speaking',e.message);return false}}
async function qReload(){await refresh();render()}

function wireQuick(){
 if(view!=='create'||!$('#quickRequest'))return wireFunnelAndDock();
 const req=$('#quickRequest');req.oninput=()=>{quickText=req.value};
 req.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#quickGo')?.click()}};
 $$('[data-q-net]').forEach(i=>i.onchange=()=>{const sel=$$('[data-q-net]').filter(x=>x.checked).map(x=>x.dataset.qNet);quickNets=sel});
 if($('#quickCarousel'))$('#quickCarousel').onchange=e=>{quickCarousel=e.target.checked};
 if($('#quickGo'))$('#quickGo').onclick=()=>{const sel=$$('[data-q-net]').filter(x=>x.checked).map(x=>x.dataset.qNet);if(!sel.length){quickError='Escolha pelo menos uma rede.';setMaxState('speaking','Marque pelo menos uma rede para eu criar as versões.');return render()}quickNets=sel;quickCreate(req.value,sel)};
 $$('[data-q-text]').forEach(t=>t.oninput=()=>{const n=$(`[data-q-count="${t.dataset.qText}"]`);if(n)n.textContent=t.value.length+' caracteres'});
 $$('[data-q-group]').forEach(b=>b.onclick=()=>{quickGroupId=b.dataset.qGroup;render()});
 $$('[data-q-save]').forEach(b=>b.onclick=async()=>{const id=b.dataset.qSave;if(await qSaveText(id)){quickNotice[id]='Edição salva.';await qReload()}else render()});
 $$('[data-q-copy]').forEach(b=>b.onclick=async()=>{const ta=$(`[data-q-text="${b.dataset.qCopy}"]`);try{await navigator.clipboard.writeText(ta.value);b.textContent='Copiado'}catch{ta.select();b.textContent='Selecione e copie (Ctrl+C)'}});
 $$('[data-q-approve]').forEach(b=>b.onclick=async()=>{const id=b.dataset.qApprove;if(!(await qSaveText(id)))return render();try{await api('/api/contents/'+id,{method:'PUT',body:{status:'Aprovado'}});quickNotice[id]='Aprovado. Agora você pode enviar para a fila ou baixar o pacote.';setMaxState('speaking','Aprovado. O próximo passo é enviar para a fila ou baixar o pacote e publicar.');await qReload()}catch(e){quickNotice[id]=e.message;render()}});
 $$('[data-q-queue]').forEach(b=>b.onclick=async()=>{const id=b.dataset.qQueue,ct=contentById(id);try{const r=await ce('publication',{contentId:id,network:ct.network});quickNotice[id]=r.message||'Na fila.';setMaxState('speaking','Está na fila. A publicação automática ainda não está ativa, então baixe o pacote para publicar agora.');await qReload()}catch(e){quickNotice[id]=e.message;setMaxState('speaking',e.message);render()}});
 $$('[data-q-unqueue]').forEach(b=>b.onclick=async()=>{const id=b.dataset.qUnqueue;try{await api(`/api/contents/${id}/queue-remove`,{method:'POST'});quickNotice[id]='Retirado da fila. O conteúdo voltou para revisão.';await qReload()}catch(e){quickNotice[id]=e.message;render()}});
 $$('[data-q-pack]').forEach(b=>b.onclick=async()=>{const id=b.dataset.qPack;if(!(await qSaveText(id)))return render();try{const r=await api(`/api/contents/${id}/package`,{method:'POST'});const a=document.createElement('a');a.href=r.url+'?download=1';a.download='';document.body.appendChild(a);a.click();a.remove();quickNotice[id]=r.hasImage?'Pacote baixado com texto e imagem.':'Pacote baixado com o texto. Sem imagem anexada.';setMaxState('speaking','Baixei o pacote. Abra a rede, envie a imagem e cole a legenda.');render()}catch(e){quickNotice[id]=e.message;render()}});
 $$('[data-q-imgsel]').forEach(s=>s.onchange=async()=>{if(!s.value)return;const id=s.dataset.qImgsel;try{await api('/api/contents/'+id,{method:'PUT',body:{imageAssetId:s.value}});await qReload()}catch(e){quickNotice[id]=e.message;render()}});
 $$('[data-q-imgrm]').forEach(b=>b.onclick=async()=>{const id=b.dataset.qImgrm;try{await api('/api/contents/'+id,{method:'PUT',body:{imageAssetId:''}});await qReload()}catch(e){quickNotice[id]=e.message;render()}});
 $$('[data-q-imgup]').forEach(i=>i.onchange=async()=>{const f=i.files[0],id=i.dataset.qImgup;if(!f)return;if(!/^image\/(png|jpe?g|webp)$/i.test(f.type)){quickNotice[id]='Use uma imagem PNG, JPG ou WEBP.';return render()}if(f.size>15*1024*1024){quickNotice[id]='A imagem tem mais de 15 MB. Reduza e tente de novo.';return render()}setMaxState('thinking','Guardando a sua imagem.');try{const data=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(new Error('Não consegui ler o arquivo.'));r.readAsDataURL(f)});const m=await api('/api/media',{method:'POST',body:{clientId,name:f.name,type:f.type,category:'imagem de post',data}});await api('/api/contents/'+id,{method:'PUT',body:{imageAssetId:m.id}});setMaxState('speaking','Imagem anexada. Ela também ficou na sua Biblioteca de materiais.');await qReload()}catch(e){quickNotice[id]=e.message;setMaxState('speaking',e.message);render()}});
 $$('[data-q-trackbtn]').forEach(b=>b.onclick=()=>{const id=b.dataset.qTrackbtn;quickTrackOpen[id]=!quickTrackOpen[id];render()});
 $$('[data-q-trackgo]').forEach(b=>b.onclick=async()=>{const [id,action]=b.dataset.qTrackgo.split('|'),t=$(`[data-q-target="${id}"]`);try{const r=await api(`/api/contents/${id}/track`,{method:'POST',body:{action,target:t?t.value:''}});quickTrack[id]={url:r.url,publicUrl:r.publicUrl};quickTrackOpen[id]=false;setMaxState('speaking','Link criado. Use este endereço no post e eu conto os cliques e os contatos.');await qReload()}catch(e){quickNotice[id]=e.message;setMaxState('speaking',e.message);render()}});
 wireFunnelAndDock();
}

const qPendingTrack=()=>(S.contents||[]).filter(x=>x.clientId===clientId&&x.trackLinkId&&!quickTrack[x.id]&&(S.links||[]).some(l=>l.id===x.trackLinkId&&l.active));
let qFilling=false;
async function qFillTrackInfo(){if(qFilling)return;qFilling=true;try{for(const ct of qPendingTrack()){try{const r=await api(`/api/contents/${ct.id}/track`,{method:'POST',body:{lookup:true}});quickTrack[ct.id]=r.none?{}:{url:r.url,publicUrl:r.publicUrl}}catch{quickTrack[ct.id]={}}}}finally{qFilling=false}if(view==='create')render()}
function wireFunnelAndDock(){if(view==='create'&&qPendingTrack().length)qFillTrackInfo()}
const baseWireQuick=wire;wire=function(){baseWireQuick();const dr=document.querySelector('.tool-drawer');if(dr)dr.onclick=e=>e.stopPropagation();wireQuick();maxContextRefresh()};

/* ---------- funil por conteúdo (Resultados) ---------- */
const baseResultsQuick=results;
results=function(){const f=(S.dashboard?.funnel||[]);const table=f.length?`<div class=panel><h3>Do post ao cliente</h3><p class=muted>Cada post com link rastreável mostra quanto trouxe de cliques, contatos e vendas.</p><div class=q-tablewrap><table class=q-table><thead><tr><th>Post</th><th>Rede</th><th>Cliques</th><th>Leads</th><th>Propostas</th><th>Clientes</th></tr></thead><tbody>${f.map(x=>`<tr><td>${esc(x.title)}${x.tracked?'':' <small>(sem link)</small>'}</td><td>${esc(qLabel(x.network))}</td><td>${x.hits}</td><td>${x.leads}</td><td>${x.proposals}</td><td>${x.clients}</td></tr>`).join('')}</tbody></table></div></div>`:`<div class=panel><h3>Do post ao cliente</h3><p class=muted>Crie um link rastreável em “Criar” e acompanhe aqui cliques, contatos e vendas de cada post.</p></div>`;return baseResultsQuick()+table};

/* ---------- lead: post de origem ---------- */
const baseLeadFormQuick=leadForm;
leadForm=function(l={}){const posts=(S.contents||[]).filter(x=>x.clientId===clientId&&(x.network||x.trackLinkId));return baseLeadFormQuick(l).replace('<textarea id=leadnotes',`<label class=q-lbl>Post de origem (opcional)<select id=leadcontent data-max="leadcontent"><option value="">Não veio de um post</option>${posts.map(x=>`<option value="${x.id}" ${l.contentId===x.id?'selected':''}>${esc(x.title)}</option>`).join('')}</select></label><textarea id=leadnotes`)};
const baseWireLeadFormQuick=wireLeadForm;
wireLeadForm=function(l={}){baseWireLeadFormQuick(l);const b=$('#savelead');if(b)b.onclick=async()=>{const body={clientId,name:$('#leadname').value,phone:$('#leadphone').value,email:$('#leademail').value,company:$('#leadcompany').value,source:$('#leadsource').value,status:$('#leadstatus').value,nextAction:$('#leadaction').value,nextFollowUp:$('#leadfollow').value,notes:$('#leadnotes').value,contentId:$('#leadcontent')?$('#leadcontent').value:''};if(l.id)await api('/api/leads/'+l.id,{method:'PUT',body});else await api('/api/leads',{method:'POST',body});await refresh();render()}};

/* ---------- Max: assessor permanente ---------- */
const MAX_VIEWS={
 home:{t:'Escreva no campo o que você quer publicar. Exemplo: “post para vender minha mentoria de liderança para empresas”. Eu cuido do resto.',n:'Digite o pedido e pressione Enter.'},
 create:{t:'Diga em uma frase o que quer publicar e para quem. Eu escrevo uma versão para cada rede.',n:'Escreva o pedido, marque as redes e clique em “Criar publicações”.'},
 relationship:{t:'Aqui ficam seus contatos e o andamento de cada conversa, do primeiro contato até virar cliente.',n:'Cadastre um lead ou atualize o estágio de quem já conversou com você.'},
 results:{t:'Aqui você vê o que está funcionando: quantos cliques e contatos cada post trouxe.',n:'Confira a tabela “Do post ao cliente” e veja qual conteúdo gera mais retorno.'},
 library:{t:'Tudo o que foi produzido fica guardado aqui. Você pode abrir, editar, copiar e baixar.',n:'Abra um item para revisar ou usar de novo.'},
 history:{t:'Este é o histórico do que você já pediu. Nada se perde ao trocar de tela.',n:'Abra um trabalho para continuar de onde parou.'},
 settings:{t:'Aqui ficam as conexões e as regras de custo. Eu explico cada campo quando você clicar nele.',n:'Confira as chaves de IA e o controle de custos.'},
 video:{t:'Escolha um vídeo seu e eu ajudo a transformar em cortes.',n:'Selecione o arquivo e revise os trechos sugeridos.'},
 clients:{t:'Aqui você cadastra e organiza as empresas atendidas pela plataforma.',n:'Crie a empresa e depois preencha o contexto dela.'},
 context:{t:'Estas informações ensinam a plataforma a falar como a sua empresa.',n:'Preencha o que a empresa faz, para quem e o que oferece.'},
 dna:{t:'O DNA é o retrato da empresa: quem é, o que entrega e como fala. Tudo que eu escrevo parte daqui.',n:'Revise cada bloco e aprove quando estiver correto.'},
 materials:{t:'Guarde aqui imagens e materiais. Depois você pode anexar uma imagem a qualquer post.',n:'Envie os arquivos e informe a categoria.'},
 links:{t:'Cada link ou QR conta acessos e recebe contatos. É assim que sabemos de onde vem o resultado.',n:'Escolha o tipo, dê um nome e crie o link.'},
 radar:{t:'O Radar lê apenas as fontes que você aprovou e traz notícias para virarem conteúdo.',n:'Cadastre uma fonte e clique em atualizar.'},
 campaigns:{t:'Uma campanha organiza vários conteúdos em torno de um único objetivo.',n:'Diga o objetivo, o público e o período.'},
 costs:{t:'Aqui você acompanha quanto cada operação de IA consumiu.',n:'Confira o consumo e os alertas.'}
};
const FIELD_GUIDES={
 quickRequest:['É o pedido que eu transformo em publicações.','Ex.: post para vender minha mentoria de liderança para empresas','Marque as redes e clique em “Criar publicações”.'],
 commandBox:['Diga o que você quer fazer agora, com suas palavras.','Ex.: crie um post para vender minha mentoria','Pressione Enter para enviar.'],
 qtext:['Este é o texto pronto para publicar. Pode mudar o que quiser enquanto não estiver na fila.','Ajuste o gancho da primeira linha.','Clique em “Salvar edição” e depois em “Aprovar”.'],
 qimgsel:['Escolha uma imagem que você já guardou na Biblioteca. É opcional.','Uma arte feita na sua própria IA.','Se não tiver imagem, publique só o texto.'],
 qtarget:['É o endereço para onde a pessoa vai quando clicar no seu post.','https://seusite.com.br ou o link do seu WhatsApp','Crie o link e use-o na publicação para eu contar os cliques.'],
 leadcontent:['Indica de qual post esse contato veio.','Escolha o post do LinkedIn sobre mentoria.','Salve o lead para ele entrar na conta desse post.'],
 leadname:['O nome de quem demonstrou interesse.','Maria Souza','Preencha o WhatsApp ou o e-mail.'],
 leadphone:['O WhatsApp permite abrir a conversa direto pela plataforma.','51 99999-0000','Defina a próxima ação e a data de retorno.'],
 leademail:['Um segundo canal de contato.','maria@empresa.com.br','Escolha o estágio do contato.'],
 leadcompany:['A empresa da pessoa ajuda a entender o porte do negócio.','Souza Construções','Informe de onde o contato veio.'],
 leadsource:['A origem mostra qual canal traz mais contatos.','Instagram, indicação ou evento','Escolha o estágio do contato.'],
 leadstatus:['O estágio mostra em que ponto a conversa está.','Novo, Conversando, Proposta ou Cliente','Defina a próxima ação.'],
 leadaction:['O que você vai fazer com esse contato.','Enviar proposta de mentoria','Escolha a data de retorno.'],
 leadfollow:['A data em que você quer voltar a falar com ele. Aparece nos avisos.','Próxima terça-feira','Salve o lead.'],
 leadnotes:['Registre o que foi conversado para não depender da memória.','Quer começar em janeiro','Salve o lead.'],
 lname:['O nome só serve para você reconhecer o link na lista.','Convite da live de outubro','Escolha o tipo de ação.'],
 laction:['Define o que acontece quando alguém abre o link: redirecionar, receber contato ou receber arquivo.','Redirecionar para o seu site','Preencha o destino, se o tipo pedir.'],
 ltarget:['O endereço de destino quando o link só redireciona.','https://seusite.com.br','Clique em “Criar link”.'],
 linstr:['Uma frase curta que aparece para quem abrir o link.','Deixe seus dados que entramos em contato','Clique em “Criar link”.'],
 rtopics:['Os assuntos que o Radar deve acompanhar nas suas fontes.','liderança, empreendedorismo, IA','Cadastre as fontes aprovadas.'],
 srcname:['O nome da fonte de notícias que você confia.','Sebrae','Cole o endereço do feed.'],
 srcurl:['O endereço do feed RSS ou da página oficial. Só leio fontes aprovadas.','https://www.sebrae.com.br/feed','Clique em adicionar e depois em atualizar notícias.'],
 gemk:['A chave do Gemini permite usar a cota gratuita para pedidos simples.','Cole a chave gerada no Google AI Studio','Escolha o plano e salve.'],
 ork:['A chave da OpenRouter dá acesso aos modelos pagos por uso. Fica guardada só no servidor.','Cole a chave que começa com sk-or','Salve e teste a conexão.'],
 zeromode:['No modo Custo Zero eu nunca faço uma chamada paga.','Marque se quiser garantir custo zero','Salve as configurações.'],
 fallbackpay:['Autoriza usar a OpenRouter quando a cota gratuita acabar.','Marque só se aceitar pequenos custos','Salve as configurações.'],
 oferta:['O que a empresa vende. Base de todo conteúdo.','Mentoria de liderança para empresários','Descreva o problema que ela resolve.'],
 problema:['A dor que o cliente sente antes de contratar.','O dono trabalha demais e a equipe não decide sozinha','Preencha os diferenciais.'],
 dif:['O que faz a sua empresa diferente das outras.','21 anos de experiência bancária','Defina o tom de voz.'],
 res:['O que a plataforma nunca deve prometer ou afirmar.','Não prometer resultado financeiro','Salve o contexto.'],
 cta:['A chamada padrão para o leitor agir.','Chame no WhatsApp','Salve o contexto.'],
 tom:['Como a empresa fala com o público.','Direto, respeitoso e sem exageros','Preencha o CTA.'],
 sourceLocation:['O caminho do vídeo no seu computador.','C:\\Vídeos\\Minha palestra.mp4','Clique em “Usar este vídeo”.'],
 sourceTheme:['O tema ajuda a escolher os melhores trechos.','Liderança','Clique em “Usar este vídeo”.'],
 resultValue:['O valor da venda que veio deste conteúdo.','1500','Informe a evidência.'],
 resultEvidence:['Onde você comprova que a venda veio daqui.','Conversa de WhatsApp em 12/10','Salve o resultado.'],
 librarySearch:['Busque por nome, tema, produto ou origem.','mentoria','Abra o item encontrado.']
};
function maxFieldName(el){const lab=el.closest('label');let t='';if(lab){const c=lab.cloneNode(true);c.querySelectorAll('input,select,textarea').forEach(x=>x.remove());t=c.textContent.trim()}if(!t&&el.id){const l=document.querySelector(`label[for="${el.id}"]`);if(l)t=l.textContent.trim()}if(!t){const p=el.previousElementSibling;if(p&&p.tagName==='LABEL')t=p.textContent.trim()}return t||el.getAttribute('placeholder')||''}
function maxFieldMessage(el){const key=el.dataset.max||el.id,g=FIELD_GUIDES[key];if(g)return `${g[0]} Exemplo: ${g[1]}. Depois: ${g[2]}`;const name=maxFieldName(el),ph=el.getAttribute('placeholder');const tag=el.tagName,type=(el.type||'').toLowerCase();let how=tag==='SELECT'?'Escolha uma das opções.':type==='checkbox'?'Marque para ativar ou desmarque para desligar.':type==='file'?'Escolha o arquivo no seu computador.':type==='password'?'Cole aqui. O valor fica guardado com segurança e não aparece na tela.':type==='date'?'Escolha a data.':type==='time'?'Escolha o horário.':'Preencha com suas palavras.';if(!name)return '';return `Campo “${name.slice(0,60)}”. ${how}${ph&&type!=='password'?' Exemplo: '+ph+'.':''}`}
function maxContext(){
 const base=MAX_VIEWS[view]||MAX_VIEWS.home;let t=base.t,n=base.n;
 if(view==='create'){
  if(quickBusy){t='Estou escrevendo as versões agora. Já já ficam prontas.';n='Aguarde alguns segundos.'}
  else{const g=qCurrentGroup();if(g){const ap=g.items.filter(x=>x.status==='Aprovado'||qQueue(x.id)).length,tot=g.items.length,first=g.items.find(x=>x.status!=='Aprovado'&&!qQueue(x.id));t=`${ap} de ${tot} versões aprovadas. Você pode editar o texto e anexar uma imagem sua antes de aprovar.`;n=first?`Revise e aprove a versão do ${qLabel(first.network)}.`:'Tudo aprovado. Baixe o pacote para publicar ou envie para a fila.'}}
 }
 if(view==='relationship'){const d=S.dashboard||{};if(d.followups)n=`Você tem ${d.followups} retorno(s) para hoje. Comece por eles.`;else if(d.newLeads)n=`Há ${d.newLeads} lead(s) novo(s). Faça o primeiro contato.`}
 return{t,n}
}
function maxDockHtml(){const m=maxContext();return `<aside class="max-dock ${maxDockMin?'min':''}" id=maxDock aria-label="Max, assessor"><button class=max-toggle id=maxToggle title="${maxDockMin?'Mostrar o Max':'Recolher o Max'}">${maxDockMin?'Max':'–'}</button><img data-max-avatar src="${maxAssets[maxState]}" alt="Max"><div class=max-body><div class=max-name><b>Max</b> <span data-max-label>${maxLabel()}</span></div><p data-max-reply id=maxDockReply>${esc(maxContextLine||m.t)}</p><p class=max-next data-max-next><b>Próximo passo:</b> <span id=maxNextText>${esc(m.n)}</span></p></div></aside>`}
function maxContextRefresh(){if(!$('#maxDock'))return;const m=maxContext();maxContextLine='';const r=$('#maxDockReply');if(r&&Date.now()>maxHold)r.textContent=m.t;const n=$('#maxNextText');if(n)n.textContent=m.n}
const baseShellQuick=shell;
shell=function(inner){baseShellQuick(inner);if(view==='home'||view==='video')return;const app=document.querySelector('.app');document.body.insertAdjacentHTML('beforeend',maxDockHtml());document.body.classList.add('has-dock');if($('#maxToggle'))$('#maxToggle').onclick=()=>{maxDockMin=!maxDockMin;$('#maxDock').classList.toggle('min',maxDockMin);$('#maxToggle').textContent=maxDockMin?'Max':'–'}};
const baseShellCleanup=render;
render=function(){document.body.classList.remove('has-dock');baseShellCleanup()};
const baseSetMaxQuick=setMaxState;
setMaxState=function(st,reply){baseSetMaxQuick(st,reply);const r=$('#maxDockReply');if(!r)return;if(reply!=null&&!(st==='neutral')){r.textContent=reply;maxHold=Date.now()+9000;setTimeout(()=>{if(Date.now()>=maxHold)maxContextRefresh()},9200)}else if(st==='neutral'){maxContextRefresh()}};
document.addEventListener('focusin',e=>{const el=e.target;if(!el||!/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)||!el.closest('.content'))return;const msg=maxFieldMessage(el);if(!msg)return;const r=$('#maxDockReply')||$('#maxReply');if(!r)return;baseSetMaxQuick('speaking',msg);r.textContent=msg;maxHold=Date.now()+60000});
document.addEventListener('focusout',e=>{const el=e.target;if(!el||!/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))return;maxHold=0;setTimeout(()=>{if(!document.activeElement||!/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)){baseSetMaxQuick('neutral',null);maxContextRefresh()}},150)});

/* ---------- Prompt para IA: o cliente diz o que quer, a plataforma escreve o prompt ---------- */
const PR_TARGETS=[['gemini','Gemini'],['chatgpt','ChatGPT'],['claude','Claude'],['outra','Outra IA']];
const PR_TYPES=[['','Deixe comigo (automático)'],['imagem','Imagem ou logomarca'],['planilha','Planilha'],['texto','Texto'],['documento','Documento'],['apresentacao','Apresentação'],['video','Vídeo ou roteiro'],['site','Site ou página'],['outro','Outro']];
let promptText='',promptTarget='gemini',promptType='',promptBusy=false,promptRunBusy=false,promptError='',promptNotice='',promptList=null,promptCurId='';
if(!navGuided.some(x=>x[0]==='prompt'))navGuided.splice(Math.max(1,navGuided.findIndex(x=>x[0]==='create')+1),0,['prompt','Prompt para IA']);
MAX_VIEWS.prompt={t:'Diga o que você quer criar em qualquer IA. Eu escrevo o prompt certo para você colar no Gemini, no ChatGPT ou no Claude, ou crio aqui mesmo.',n:'Escreva o pedido, escolha a IA e clique em “Criar prompt”.'};
Object.assign(FIELD_GUIDES,{
 promptRequest:['É a ideia do que você quer. Não precisa saber escrever prompt.','Quero criar uma logomarca para a minha empresa','Escolha a IA e clique em “Criar prompt”.'],
 promptTarget:['É a IA onde você vai colar o prompt. Eu adapto a linguagem para ela.','Gemini','Confira o tipo e clique em “Criar prompt”.'],
 promptType:['Diga se é imagem, planilha, texto e assim por diante. Se deixar em automático, eu descubro pelo pedido.','Planilha','Clique em “Criar prompt”.'],
 prompttext:['Este é o prompt pronto. Preencha o que estiver entre colchetes e ajuste o que quiser.','[NOME DA EMPRESA] vira o nome real','Clique em “Copiar prompt” e cole na IA, ou em “Criar aqui”.']
});
const prLabel=(list,k)=>(list.find(x=>x[0]===k)||[k,k])[1];
const prCur=()=>(promptList||[]).find(x=>x.id===promptCurId)||(promptList||[])[0]||null;

function promptItemHtml(it){
 const files=it.resultFiles||{};
 return `<article class=q-card data-p-card="${it.id}"><header><div><b>${esc(it.typeLabel||'Prompt')}</b><span class="q-badge draft">Para ${esc(it.targetLabel||'IA')}</span></div><small data-p-count>${(it.prompt||'').length} caracteres</small></header>
 <p class=q-hint>Pedido: “${esc(it.request)}”. Preencha o que estiver entre colchetes antes de usar.</p>
 <textarea data-p-text="${it.id}" rows=14 data-max="prompttext">${esc(it.prompt||'')}</textarea>
 <div class=actions><button class="btn primary" data-p-copy="${it.id}">Copiar prompt</button>${it.canRunHere?`<button class=btn data-p-run="${it.id}" ${promptRunBusy?'disabled':''}>${promptRunBusy?'Criando…':(it.result?'Criar de novo aqui':'Criar aqui')}</button>`:''}<button class=btn data-p-save="${it.id}">Salvar edição</button></div>
 ${it.canRunHere?'':`<div class=q-note>${it.type==='imagem'?'Imagens e logomarcas são feitas na IA de imagem. Cole este prompt no ':'Este tipo de pedido é feito na ferramenta específica. Cole este prompt no '}${esc(it.targetLabel||'IA')} (ou na que você preferir). Aqui eu escrevo o prompt, não gero a arte.</div>`}
 ${promptNotice&&promptCurId===it.id?`<div class=q-note>${esc(promptNotice)}</div>`:''}
 ${it.result?`<div class=q-track><b>${it.type==='planilha'?'Planilha criada':'Resultado'}</b><textarea readonly rows=10 data-max="prresult">${esc(it.result)}</textarea><div class=actions><button class=btn data-p-copyres="${it.id}">Copiar resultado</button>${files.csv?`<a class=btn href="${esc(files.csv)}?download=1" download>Baixar planilha (.csv)</a>`:''}${files.docx?`<a class=btn href="${esc(files.docx)}?download=1" download>Baixar Word</a>`:''}${files.pdf?`<a class=btn href="${esc(files.pdf)}?download=1" download>Baixar PDF</a>`:''}</div>${files.csv?'<small>O arquivo abre direto no Excel e no Google Planilhas.</small>':''}</div>`:''}
 </article>`;
}
function promptView(c){
 if(!c)return empty();
 const it=prCur(),list=(promptList||[]).filter(x=>!it||x.id!==it.id);
 return `<div class=q-hero><div class=eyebrow>Prompt para IA</div><h2>O que você quer criar em uma IA?</h2><p class=muted>Diga com suas palavras. Eu escrevo o prompt certo, usando os dados da sua empresa. Você cola na IA que quiser, ou eu crio aqui.</p>
 <textarea id=promptRequest rows=3 data-max="promptRequest" placeholder="Ex.: quero criar uma logomarca para a minha empresa">${esc(promptText)}</textarea>
 <div class=q-nets><label class=q-lbl>Onde você vai usar<select id=promptTarget data-max="promptTarget">${PR_TARGETS.map(([k,l])=>`<option value="${k}" ${promptTarget===k?'selected':''}>${l}</option>`).join('')}</select></label><label class=q-lbl>O que é<select id=promptType data-max="promptType">${PR_TYPES.map(([k,l])=>`<option value="${k}" ${promptType===k?'selected':''}>${l}</option>`).join('')}</select></label></div>
 <div class=actions><button class="btn primary" id=promptGo ${promptBusy?'disabled':''}>${promptBusy?'Criando o prompt…':'Criar prompt'}</button><span class=smallline>Enter cria · Shift + Enter quebra linha</span></div>
 ${promptError?`<div class=q-error>${esc(promptError)}</div>`:''}</div>
 ${it?`<div class=q-groupinfo><h3>Seu prompt</h3></div><div class=q-cards>${promptItemHtml(it)}</div>`:`<div class=empty>${promptList===null?'Carregando…':'O prompt aparece aqui, pronto para copiar.'}</div>`}
 ${list.length?`<details class=q-older><summary>Prompts anteriores (${list.length})</summary>${list.slice(0,15).map(x=>`<button class=q-oldbtn data-p-open="${x.id}"><b>${esc((x.request||'').slice(0,90))}</b><span>${esc(x.typeLabel||'')} · ${esc(x.targetLabel||'')} · ${new Date(x.createdAt).toLocaleDateString('pt-BR')}</span></button>`).join('')}</details>`:''}`;
}
async function promptLoad(){try{promptList=await api('/api/prompts?clientId='+encodeURIComponent(clientId))}catch{promptList=[]}if(view==='prompt')render()}
async function promptCreate(){
 const c=cur();if(!c||promptBusy)return;const text=String(promptText||'').trim();
 if(text.length<8){promptError='Conte em uma frase o que você quer criar. Exemplo: uma logomarca para a minha empresa.';setMaxState('speaking','Preciso de uma frase um pouco mais completa. Diga o que você quer criar.');return render()}
 promptBusy=true;promptError='';promptNotice='';setMaxState('thinking','Escrevendo o prompt com os dados da sua empresa.');render();
 try{const it=await api('/api/prompt/create',{method:'POST',body:{clientId,request:text,target:promptTarget,type:promptType||undefined}});promptList=[it,...(promptList||[])];promptCurId=it.id;promptText='';promptBusy=false;setMaxState('speaking',it.canRunHere?'Prompt pronto. Preencha o que estiver entre colchetes e copie, ou clique em “Criar aqui”.':'Prompt pronto. Preencha o que estiver entre colchetes, copie e cole na IA de imagem.');render()}
 catch(e){promptBusy=false;if(/fallback pago|escalada paga|cota configurada/i.test(e.message)&&confirm(e.message+'\n\nDeseja autorizar o fallback pago da OpenRouter para esta e próximas operações?')){await api('/api/clients/'+clientId+'/ai',{method:'POST',body:{paidFallbackAuthorized:true}});await refresh();return promptCreate()}promptError=e.message;setMaxState('speaking','Não consegui concluir. '+e.message);render()}
}
function wirePrompt(){
 if(view!=='prompt')return;if(promptList===null)promptLoad();
 const req=$('#promptRequest');if(!req)return;
 req.oninput=()=>{promptText=req.value};req.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#promptGo')?.click()}};
 if($('#promptTarget'))$('#promptTarget').onchange=e=>{promptTarget=e.target.value};
 if($('#promptType'))$('#promptType').onchange=e=>{promptType=e.target.value};
 if($('#promptGo'))$('#promptGo').onclick=()=>{promptText=req.value;promptCreate()};
 $$('[data-p-text]').forEach(t=>t.oninput=()=>{const n=$('[data-p-count]');if(n)n.textContent=t.value.length+' caracteres'});
 $$('[data-p-open]').forEach(b=>b.onclick=()=>{promptCurId=b.dataset.pOpen;promptNotice='';render()});
 $$('[data-p-copy]').forEach(b=>b.onclick=async()=>{const ta=$(`[data-p-text="${b.dataset.pCopy}"]`);try{await navigator.clipboard.writeText(ta.value);b.textContent='Copiado';setMaxState('speaking','Copiado. Agora abra a IA que você escolheu e cole com Ctrl+V.')}catch{ta.select();b.textContent='Selecione e copie (Ctrl+C)'}});
 $$('[data-p-copyres]').forEach(b=>b.onclick=async()=>{const it=(promptList||[]).find(x=>x.id===b.dataset.pCopyres);try{await navigator.clipboard.writeText(it.result);b.textContent='Copiado'}catch{b.textContent='Selecione o texto e copie (Ctrl+C)'}});
 $$('[data-p-save]').forEach(b=>b.onclick=()=>{const id=b.dataset.pSave,ta=$(`[data-p-text="${id}"]`),it=(promptList||[]).find(x=>x.id===id);if(it&&ta){it.prompt=ta.value;promptNotice='Edição mantida. O prompt editado será usado ao clicar em “Criar aqui”.';promptCurId=id;render()}});
 $$('[data-p-run]').forEach(b=>b.onclick=async()=>{const id=b.dataset.pRun,ta=$(`[data-p-text="${id}"]`);if(promptRunBusy)return;if(/\[[A-ZÀ-Ú0-9 _\-\/]{3,}\]/.test(ta.value)&&!confirm('Ainda há campos entre colchetes sem preencher. Deseja criar mesmo assim?'))return;promptRunBusy=true;promptNotice='';promptCurId=id;setMaxState('thinking','Criando o resultado a partir do seu prompt.');render();try{const it=await api(`/api/prompts/${id}/run`,{method:'POST',body:{prompt:ta.value}});promptList=(promptList||[]).map(x=>x.id===id?it:x);promptNotice='Pronto. Revise o resultado abaixo e baixe o arquivo.';setMaxState('speaking','Pronto. Confira o resultado e baixe o arquivo.')}catch(e){promptNotice=e.message;setMaxState('speaking',e.message)}promptRunBusy=false;render()});
}
const baseRenderPrompt=render;
render=function(){if(view==='prompt'){document.body.classList.remove('has-dock');shell(promptView(cur()));wire();return}baseRenderPrompt()};
const baseWirePrompt=wire;
wire=function(){baseWirePrompt();wirePrompt()};
const baseOpenToolPrompt=openTool;
openTool=function(t){if(t==='prompt'){toolsOpen=false;view='prompt';render();return}return baseOpenToolPrompt(t)};
const baseToolDrawerPrompt=toolDrawer;
toolDrawer=function(){const h=baseToolDrawerPrompt(),tile='<button class=tool-tile data-tool="prompt"><b>Prompt para IA</b><span>Escreve o prompt para você colar na IA que usa</span></button>',i=h.lastIndexOf('</div></aside></div>');return i<0?h:h.slice(0,i)+tile+h.slice(i)};

/* ---------- Página de venda: site de uma página, editável, com link dinâmico, QR e publicação gratuita ---------- */
let salesReq='',salesBusy=false,salesErr='',salesNotice='',salesData=null,salesCur='',sd=null,salesKey=0,salesDirty=false,salesSaving=false;
if(!navGuided.some(x=>x[0]==='sales'))navGuided.splice(Math.max(1,navGuided.findIndex(x=>x[0]==='prompt')+1),0,['sales','Página de venda']);
MAX_VIEWS.sales={t:'Diga o que você quer vender. Eu escrevo a página, você ajusta o que quiser e publica com um link ou QR Code.',n:'Escreva o pedido e clique em “Criar página”.'};
Object.assign(FIELD_GUIDES,{
 salesRequest:['É o produto ou a oferta que a página vai vender.','Página para vender a minha mentoria de liderança para empresas','Clique em “Criar página”.'],
 sName:['O nome só serve para você reconhecer a página na lista.','Mentoria de liderança','Ajuste os textos.'],
 sBrand:['O nome que aparece no topo e no rodapé da página.','Núcleo de Líderes','Ajuste o título principal.'],
 sHeadline:['É a frase principal, a primeira que a pessoa lê. Diga a promessa central, sem exagero.','Decida com mais clareza e sem carregar tudo sozinho','Confira o texto de apoio.'],
 sSub:['Uma frase que explica o título e convida a continuar.','Um caminho simples para o próximo passo','Revise as listas.'],
 sList:['Escreva uma ideia por linha. Cada linha vira um item na página.','Tudo depende de mim','Confira a prévia ao lado.'],
 sClose:['O último convite antes do botão. Curto e sem pressão.','Se faz sentido para você, deixe seu contato','Ajuste o texto do botão.'],
 sCtaLabel:['O texto que aparece no botão da página.','Quero conversar','Escolha o que acontece ao clicar.'],
 sCtaUrl:['Para onde a pessoa vai ao clicar. Pode ser seu site ou o link do WhatsApp.','https://wa.me/5551999990000','Salve para atualizar a prévia.'],
 sPromo:['Uma promoção aparece em destaque perto do botão. Escolha qual está ativa; a vencida some sozinha.','Lançamento, com validade até o fim do mês','Marque “Mostrar esta promoção”.'],
 sPromoPrice:['Escreva o valor ou a condição do jeito que quiser. Eu não invento preço.','Condição especial para a primeira turma','Defina até quando vale.'],
 sPublished:['É o endereço que o site gratuito mostrou depois que você enviou a página.','https://minha-pagina.pages.dev','Gere o QR Code desse endereço.'],
 sSwap:['Troque qual página este link mostra. O endereço e o QR Code continuam os mesmos.','Escolher a página do lançamento','Confira abrindo o link.']
});
const salesOpen={more:false,pub:false};
const salesPage=()=>((salesData&&salesData.pages)||[]).find(x=>x.id===salesCur)||null;
const salesLinks=()=>((salesData&&salesData.links)||[]);
function salesSetCur(id){salesCur=id;const pg=salesPage();sd=pg?JSON.parse(JSON.stringify(pg)):null;salesDirty=false;salesKey++;salesNotice=''}
async function salesLoad(keep){try{salesData=await api('/api/pages?clientId='+encodeURIComponent(clientId))}catch{salesData={pages:[],links:[]}}if(!salesPage())salesSetCur((salesData.pages[0]||{}).id||'');else if(!keep)salesSetCur(salesCur);if(view==='sales')render()}
const sIn=(field,label,val,max,rows,extra)=>rows?`<label class=q-lbl>${label}<textarea data-s="${field}" rows=${rows} maxlength=${max} data-max="${extra||'sList'}">${esc(val||'')}</textarea></label>`:`<label class=q-lbl>${label}<input data-s="${field}" maxlength=${max} value="${esc(val||'')}" data-max="${extra||''}"></label>`;
function salesPromoHtml(p,i){return `<div class=q-track><label class=q-chip><input type=radio name=sActive data-s-active="${esc(p.id)}" ${sd.activePromoId===p.id?'checked':''}> Mostrar esta promoção</label><label class=q-lbl>Etiqueta (ex.: Lançamento)<input data-sp="${i}|label" value="${esc(p.label||'')}" maxlength=60 data-max="sPromo"></label><label class=q-lbl>Título da promoção<input data-sp="${i}|title" value="${esc(p.title||'')}" maxlength=120 data-max="sPromo"></label><label class=q-lbl>Texto<textarea data-sp="${i}|text" rows=2 maxlength=500 data-max="sPromo">${esc(p.text||'')}</textarea></label><label class=q-lbl>Valor ou condição (você escreve)<input data-sp="${i}|price" value="${esc(p.price||'')}" maxlength=120 data-max="sPromoPrice"></label><label class=q-lbl>Vale até (opcional)<input type=date data-sp="${i}|validUntil" value="${esc(p.validUntil||'')}" data-max="sPromo"></label><div class=actions><button class=btn data-s-rmpromo="${i}">Remover promoção</button></div></div>`}
function salesLinkRow(l){const pages=salesData.pages;return `<div class=q-track><b>${esc(l.name)}</b><div class=q-linkline><code>${esc(l.url)}</code><button class=btn data-copylink="${esc(l.url)}">Copiar link</button><button class=btn data-s-qr="${l.id}">Baixar QR Code</button></div><label class=q-lbl>Este link mostra a página<select data-s-swap="${l.id}" data-max="sSwap">${pages.map(p=>`<option value="${p.id}" ${p.id===l.pageId?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label><small>${l.hits} visita(s) · ${l.clicks} clique(s) no botão · ${l.leads} contato(s)</small>${l.publicUrl?'':'<div class=q-note>Este link só abre neste computador. Para o público ver, use “Publicar grátis em um site” aqui embaixo e divulgue o QR Code dele.</div>'}</div>`}
function salesEditor(){
 const pg=salesPage();if(!pg||!sd)return '';const links=salesLinks().filter(l=>l.pageId===pg.id&&l.active),otherLinks=salesLinks().filter(l=>l.pageId!==pg.id&&l.active);
 return `<div class=q-groupinfo><h3>Sua página</h3><p class=muted>Mude o que quiser e veja a prévia. Nada muda no link até você salvar.</p></div>
 <div class=s-grid><div class=s-form>
 <div class=q-essential>
  ${sIn('headline','Título principal',sd.headline,140,0,'sHeadline')}${sIn('sub','Texto de apoio',sd.sub,320,2,'sSub')}${sIn('ctaLabel','Texto do botão',sd.ctaLabel,40,0,'sCtaLabel')}
  <b class=q-lbl>O que o botão faz?</b>
  <label class=q-chip><input type=radio name=sMode data-s-mode="form" ${sd.ctaMode!=='redirect'?'checked':''}> Pede nome e telefone da pessoa (o contato chega em Relacionamento)</label>
  <label class=q-chip><input type=radio name=sMode data-s-mode="redirect" ${sd.ctaMode==='redirect'?'checked':''}> Abre um link (por exemplo, o seu WhatsApp)</label>
  ${sd.ctaMode==='redirect'?sIn('ctaUrl','Endereço do link (comece com https://)',sd.ctaUrl,600,0,'sCtaUrl'):''}
 </div>
 <details open class=q-older><summary>Promoção (${(sd.promos||[]).length})</summary>
  <label class=q-chip><input type=radio name=sActive data-s-active="" ${!sd.activePromoId?'checked':''}> Sem promoção em destaque</label>
  ${(sd.promos||[]).map(salesPromoHtml).join('')}<div class=actions><button class=btn id=sAddPromo ${(sd.promos||[]).length>=10?'disabled':''}>Adicionar promoção</button></div></details>
 <details class=q-older data-keep=more ${salesOpen.more?"open":""}><summary>Mais opções (textos das seções, nomes e cores)</summary>
  ${sIn('name','Nome para você se achar (só você vê)',sd.name,80,0,'sName')}${sIn('brandName','Nome que aparece no topo da página',sd.brandName,80,0,'sBrand')}
  ${sIn('problema','Você se reconhece? (uma ideia por linha)',sd.problema,900,4)}${sIn('beneficios','O que você ganha (uma por linha)',sd.beneficios,1200,5)}${sIn('como','Como funciona (um passo por linha)',sd.como,900,4)}${sIn('paraQuem','Para quem é (uma por linha)',sd.paraQuem,700,3)}${sIn('fechamento','Convite final',sd.fechamento,500,3,'sClose')}
  <div class=q-nets><label class=q-lbl>Cor principal<input type=color data-s-color="primary" value="${esc((sd.theme||{}).primary||'#031B46')}"></label><label class=q-lbl>Cor de destaque<input type=color data-s-color="accent" value="${esc((sd.theme||{}).accent||'#C9A227')}"></label></div></details>
 <div class=actions><button class="btn primary" id=sSave ${salesSaving?'disabled':''}>${salesSaving?'Salvando…':'Salvar e atualizar prévia'}</button>${salesDirty?'<span class=smallline>Há alterações não salvas.</span>':''}<button class=btn id=sDelete>Apagar esta página</button></div>
 ${salesNotice?`<div class=q-note>${esc(salesNotice)}</div>`:''}</div>
 <div class=s-prev><iframe id=salesFrame title="Prévia da página" src="/api/pages/${esc(pg.id)}/preview?v=${salesKey}"></iframe></div></div>
 <div class=q-groupinfo><h3>Divulgar</h3><p class=muted>Crie o link uma vez. Depois você pode trocar a página ou a promoção e o link e o QR Code continuam os mesmos.</p></div>
 <div class=q-cards>
 <article class=q-card><header><div><b>Link e QR Code</b></div></header>${links.length?links.map(salesLinkRow).join(''):'<p class=q-hint>Clique no botão abaixo para gerar o link desta página.</p>'}${otherLinks.length?`<p class=q-hint>Outros links: ${otherLinks.map(l=>esc(l.name)).join(', ')}.</p>`:''}${links.length?'':'<div class=actions><button class="btn primary" id=sMakeLink>Criar link e QR Code</button></div>'}</article>
 <article class=q-card><details class=q-older data-keep=pub ${salesOpen.pub||sd.publishedUrl?"open":""}><summary>Publicar grátis em um site (opcional)</summary><p class=q-hint>Serve para quem quer um endereço na internet sem pagar. Você baixa a página, envia num site gratuito (Netlify Drop ou Cloudflare Pages: é só arrastar o arquivo) e cola aqui o endereço que ele mostrar. Para atualizar, envie de novo no mesmo projeto: o endereço não muda. O botão da página precisa estar em “Abre um link”.</p>
 <div class=actions><button class=btn id=sExport>Baixar página para publicar</button></div>
 ${sIn('publishedUrl','Endereço que o site gratuito mostrou',sd.publishedUrl,300,0,'sPublished')}
 <label class=q-chip><input type=radio name=sLT data-s-lt="platform" ${sd.linkTarget!=='published'?'checked':''}> Meu link mostra a página daqui</label>
 <label class=q-chip><input type=radio name=sLT data-s-lt="published" ${sd.linkTarget==='published'?'checked':''}> Meu link leva à página publicada no site gratuito</label>
 <div class=actions><button class=btn id=sQrPub ${pg.publishedUrl?'':'disabled'}>Baixar QR Code do endereço publicado</button></div>${pg.publishedUrl?'':'<small class=q-hint>Salve o endereço acima para liberar este QR Code.</small>'}</details></article></div>`}
function salesView(c){
 if(!c)return empty();const pages=(salesData&&salesData.pages)||[];
 return `<div class=q-hero><div class=eyebrow>Página de venda</div><h2>O que você quer vender?</h2><p class=muted>Escreva em uma frase. Eu monto uma página de vendas de uma tela só, com os dados da sua empresa. Você edita, publica com link ou QR Code e troca a página ou a promoção quando quiser.</p>
 <textarea id=salesRequest rows=3 data-max="salesRequest" placeholder="Ex.: página para vender a minha mentoria de liderança para empresas">${esc(salesReq)}</textarea>
 <div class=actions><button class="btn primary" id=salesGo ${salesBusy?'disabled':''}>${salesBusy?'Criando a página…':'Criar página'}</button><span class=smallline>Enter cria · Shift + Enter quebra linha</span></div>
 ${salesErr?`<div class=q-error>${esc(salesErr)}</div>`:''}</div>
 ${pages.length?`<div class=q-groupinfo><h3>Minhas páginas</h3></div><div class=q-nets>${pages.map(p=>`<button class="btn ${p.id===salesCur?'primary':''}" data-s-open="${p.id}">${esc(p.name)}</button>`).join('')}</div>`:(salesData===null?'<div class=empty>Carregando…</div>':'<div class=empty>Sua página aparece aqui, pronta para editar.</div>')}
 ${salesEditor()}`;
}
async function salesCreate(){
 const c=cur();if(!c||salesBusy)return;const text=String(salesReq||'').trim();
 if(text.length<8){salesErr='Conte o que você quer vender. Exemplo: página para vender a minha mentoria.';setMaxState('speaking','Preciso de uma frase um pouco mais completa. Diga o que você quer vender.');return render()}
 salesBusy=true;salesErr='';setMaxState('thinking','Escrevendo a página com os dados da sua empresa.');render();
 try{const pg=await api('/api/pages/create',{method:'POST',body:{clientId,request:text}});salesReq='';await salesLoad(true);salesSetCur(pg.id);salesBusy=false;salesNotice='Página criada. Ajuste o que quiser e clique em “Salvar e atualizar prévia”.';setMaxState('speaking','Página pronta. Revise os textos, crie o link e publique.');render()}
 catch(e){salesBusy=false;if(/fallback pago|escalada paga|cota configurada/i.test(e.message)&&confirm(e.message+'\n\nDeseja autorizar o fallback pago da OpenRouter para esta e próximas operações?')){await api('/api/clients/'+clientId+'/ai',{method:'POST',body:{paidFallbackAuthorized:true}});await refresh();return salesCreate()}salesErr=e.message;setMaxState('speaking','Não consegui concluir. '+e.message);render()}
}
function salesBody(){const b={};for(const k of ['name','brandName','headline','sub','problema','beneficios','como','paraQuem','fechamento','ctaLabel','ctaMode','ctaUrl','publishedUrl','linkTarget'])b[k]=sd[k]==null?'':sd[k];b.linkTarget=sd.linkTarget==='published'?'published':'platform';b.ctaMode=sd.ctaMode==='redirect'?'redirect':'form';b.theme=sd.theme;b.promos=sd.promos||[];b.activePromoId=sd.activePromoId||'';return b}
async function salesSave(){if(salesSaving||!sd)return true;salesSaving=true;salesNotice='';render();try{const r=await api('/api/pages/'+sd.id,{method:'PUT',body:salesBody()});salesSaving=false;await salesLoad(true);salesSetCur(r.id);salesNotice='Salvo. A prévia foi atualizada e o link público já mostra esta versão.';setMaxState('speaking','Salvo. A página pública já está atualizada.');render();return true}catch(e){salesSaving=false;salesNotice=e.message;setMaxState('speaking',e.message);render();return false}}
async function salesDownload(url){const a=document.createElement('a');a.href=url+'?download=1';a.download='';document.body.appendChild(a);a.click();a.remove()}
function wireSales(){
 if(view!=='sales')return;if(salesData===null)salesLoad();
 const req=$('#salesRequest');if(!req)return;
 req.oninput=()=>{salesReq=req.value};req.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#salesGo')?.click()}};
 if($('#salesGo'))$('#salesGo').onclick=()=>{salesReq=req.value;salesCreate()};
 $$('[data-s-open]').forEach(b=>b.onclick=()=>{if(salesDirty&&!confirm('Há alterações não salvas nesta página. Deseja trocar mesmo assim?'))return;salesSetCur(b.dataset.sOpen);render()});
 if(!sd)return;
 $$('details[data-keep]').forEach(d=>d.ontoggle=()=>{salesOpen[d.dataset.keep]=d.open});
 const mark=()=>{if(!salesDirty){salesDirty=true}};
 $$('[data-s]').forEach(i=>i.oninput=()=>{sd[i.dataset.s]=i.value;mark()});
 $$('[data-sp]').forEach(i=>i.oninput=()=>{const [n,f]=i.dataset.sp.split('|');sd.promos[Number(n)][f]=i.value;mark()});
 $$('[data-s-color]').forEach(i=>i.oninput=()=>{sd.theme={...(sd.theme||{}),[i.dataset.sColor]:i.value};mark()});
 $$('[data-s-active]').forEach(i=>i.onchange=()=>{sd.activePromoId=i.dataset.sActive;mark()});
 $$('[data-s-mode]').forEach(i=>i.onchange=()=>{sd.ctaMode=i.dataset.sMode;mark();render()});
 $$('[data-s-lt]').forEach(i=>i.onchange=()=>{sd.linkTarget=i.dataset.sLt;mark()});
 if($('#sAddPromo'))$('#sAddPromo').onclick=()=>{sd.promos=[...(sd.promos||[]),{id:'pro_'+Math.random().toString(36).slice(2,12),label:'Promoção',title:'',text:'',price:'',validUntil:''}];mark();render()};
 $$('[data-s-rmpromo]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.sRmpromo),p=sd.promos[i];sd.promos.splice(i,1);if(sd.activePromoId===p.id)sd.activePromoId='';mark();render()});
 if($('#sSave'))$('#sSave').onclick=()=>salesSave();
 if($('#sDelete'))$('#sDelete').onclick=async()=>{if(!confirm('Apagar esta página? Links que apontam para ela deixam de mostrá-la.'))return;try{await api('/api/pages/'+sd.id,{method:'DELETE'});sd=null;salesCur='';await salesLoad();salesNotice='';setMaxState('speaking','Página apagada.');render()}catch(e){salesNotice=e.message;render()}};
 if($('#sMakeLink'))$('#sMakeLink').onclick=async()=>{if(salesDirty&&!(await salesSave()))return;try{await api('/api/pages/'+sd.id+'/link',{method:'POST',body:{}});await salesLoad(true);salesNotice='Link criado. Copie o endereço ou baixe o QR Code.';setMaxState('speaking','Link criado. Use este endereço ou o QR Code para divulgar a página.');render()}catch(e){salesNotice=e.message;setMaxState('speaking',e.message);render()}};
 $$('[data-s-swap]').forEach(s=>s.onchange=async()=>{try{await api(`/api/links/${s.dataset.sSwap}/page`,{method:'POST',body:{pageId:s.value}});await salesLoad(true);salesNotice='Pronto. O mesmo link e o mesmo QR Code agora mostram a outra página.';setMaxState('speaking','Troquei a página deste link. O endereço não mudou.');render()}catch(e){salesNotice=e.message;render()}});
 $$('[data-s-qr]').forEach(b=>b.onclick=async()=>{try{const r=await api(`/api/links/${b.dataset.sQr}/qr?format=png`);await salesDownload(r.url);salesNotice='QR Code baixado.';render()}catch(e){salesNotice=e.message;render()}});
 if($('#sQrPub'))$('#sQrPub').onclick=async()=>{try{const r=await api(`/api/pages/${sd.id}/qr`,{method:'POST',body:{format:'png'}});await salesDownload(r.url);salesNotice='QR Code do endereço publicado baixado.';render()}catch(e){salesNotice=e.message;render()}};
 if($('#sExport'))$('#sExport').onclick=async()=>{if(salesDirty&&!(await salesSave()))return;try{const r=await api(`/api/pages/${sd.id}/export`,{method:'POST'});await salesDownload(r.url);salesNotice='Página baixada. Envie para o site gratuito e cole o endereço no campo indicado.';setMaxState('speaking','Baixei a página. Envie o arquivo para o site gratuito e cole o endereço que ele mostrar.');render()}catch(e){salesNotice=e.message;setMaxState('speaking',e.message);render()}};
}
const baseRenderSales=render;
render=function(){if(view==='sales'){document.body.classList.remove('has-dock');shell(salesView(cur()));wire();return}baseRenderSales()};
const baseWireSales=wire;
wire=function(){baseWireSales();wireSales()};
const baseOpenToolSales=openTool;
openTool=function(t){if(t==='sales'){toolsOpen=false;view='sales';render();return}return baseOpenToolSales(t)};
const baseToolDrawerSales=toolDrawer;
toolDrawer=function(){const h=baseToolDrawerSales(),tile='<button class=tool-tile data-tool="sales"><b>Página de venda</b><span>Site de uma página com link dinâmico e QR Code</span></button>',i=h.lastIndexOf('</div></aside></div>');return i<0?h:h.slice(0,i)+tile+h.slice(i)};
const baseMaxContextSales=maxContext;
maxContext=function(){if(view==='sales'){const pg=salesPage();if(salesBusy)return{t:'Estou escrevendo a sua página agora.',n:'Aguarde alguns segundos.'};if(pg){const lk=salesLinks().filter(l=>l.pageId===pg.id).length;return{t:salesDirty?'Você tem alterações que ainda não foram salvas.':'Edite os textos, as promoções e o botão. A prévia mostra como a página fica.',n:salesDirty?'Clique em “Salvar e atualizar prévia”.':(lk?'Divulgue o link ou baixe o QR Code.':'Crie o link da página para começar a divulgar.')}}}return baseMaxContextSales()};
// Caixa de Início: encaminha pedidos de página de venda e de prompt às telas próprias.
const baseRunCommand=runCommand;
runCommand=async function(){
 const box=$('#commandBox'),text=String(box?.value||'').trim();
 if(text&&cur()&&!commandBusy){
  const social=/\b(post|posts|linkedin|instagram|facebook|newsletter|carrossel|carrosel|stories|reels|tiktok|youtube|e-?mail|redes?)\b/i.test(text);
  if(!social&&/p[áa]gina\s+de\s+vendas?|landing\s*page|site\s+de\s+(uma\s+)?p[áa]gina/i.test(text)){box.value='';salesReq=text;view='sales';render();salesCreate();return}
  if(!social&&/logomarca|\blogo\b|prompt\b|planilha|identidade\s+visual/i.test(text)){box.value='';promptText=text;view='prompt';render();promptCreate();return}
 }
 return baseRunCommand();
};
