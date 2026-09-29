'use strict';
/* Super Máquina — Estúdio de conteúdo (fase 1).
   Formatos estruturados, de 1 a 3 versões por pedido, revisão factual e salvamento automático.
   Carregado depois de quick.js. Estende as funções existentes sem apagá-las. */

let mFormats = null, mKind = 'video_curto', mBusy = false, mErr = '', mWarn = [], mGroup = '', mNotice = {}, mLoading = false;
let mForm = { tema: '', contexto: '', angulo: '', objetivo: 'autoridade', variantes: 1, tomExtra: '', estrutura: '', subformato: 'thread', factual: true, vetadas: '' };

if (!navGuided.some(x => x[0] === 'studio')) navGuided.splice(Math.max(1, navGuided.findIndex(x => x[0] === 'create') + 1), 0, ['studio', 'Estúdio']);
MAX_VIEWS.studio = {
  t: 'Escolha o formato, diga o tema e eu escrevo de uma a três versões diferentes. Tudo fica salvo como rascunho até você aprovar.',
  n: 'Escolha o formato, escreva o tema e clique em “Gerar e salvar”.'
};
Object.assign(FIELD_GUIDES, {
  mTema: ['É o assunto do conteúdo, dito em uma frase. Quanto mais claro, melhor o texto.', 'Por que o dono da empresa não consegue tirar férias', 'Confira as opções abaixo e clique em “Gerar e salvar”.'],
  mContexto: ['Cole aqui uma notícia, um trecho de estudo, uma conversa ou suas anotações. Eu uso só o que estiver aqui, sem acrescentar fatos.', 'Um trecho do seu material ou da conversa do grupo', 'Marque a revisão factual para eu conferir o texto contra este material.'],
  mAngulo: ['É o ponto de vista do texto. É opcional.', 'Visão de quem vende para empresas', 'Escolha o objetivo.'],
  mObjetivo: ['Diz o que o texto precisa conseguir. Muda o gancho e o fechamento.', 'Convidar para um diagnóstico', 'Escolha quantas versões quer.'],
  mVariantes: ['Cada versão abre de um jeito diferente. Duas ou três dão escolha, mas custam o mesmo processamento a mais.', '1 versão é o suficiente na maioria dos casos', 'Marque a revisão factual se o tema tiver fatos.'],
  mTom: ['Um ajuste no jeito de falar, além do tom da empresa. É opcional.', 'Mais direto e com um toque de humor', 'Clique em “Gerar e salvar”.'],
  mSub: ['O X tem cinco jeitos de escrever. Escolha o que combina com o tema.', 'Thread de 5 posts', 'Escreva o tema.'],
  mEstrutura: ['Cole a transcrição de um vídeo que deu certo. Eu estudo o ritmo e o arco, sem copiar as frases nem as ideias.', 'A transcrição de um vídeo viral do seu nicho', 'Escreva o seu tema, que é o assunto do texto novo.'],
  mVetadas: ['Palavras que não podem aparecer no texto, separadas por vírgula. Eu confiro no final e reescrevo só o que for preciso. As regras já cadastradas na empresa também valem.', 'gargalo, funil, ticket', 'Clique em “Gerar e salvar”.'],
  mFactual: ['Depois de escrever, faço uma segunda leitura para apontar nomes, números e datas que possam estar errados. Recomendo sempre que o tema for de empresas, produtos ou notícias.', 'Marcada é o mais seguro', 'Clique em “Gerar e salvar”.'],
  mtext: ['Este é o texto da versão. Pode mudar o que quiser enquanto não estiver na fila.', 'Ajuste a primeira linha', 'Clique em “Salvar edição” e depois em “Aprovar”.']
});

const mDef = k => (mFormats?.formats || []).find(x => x.id === k) || { id: k, label: k, desc: '', subformats: [] };
const mObjs = () => Object.entries(mFormats?.objetivos || {});
const mGroups = () => {
  const list = (S.contents || []).filter(x => x.clientId === clientId && x.machine), map = new Map();
  for (const ct of list) { if (!map.has(ct.groupId)) map.set(ct.groupId, []); map.get(ct.groupId).push(ct); }
  return [...map.entries()].map(([id, items]) => ({ id, items: items.sort((a, b) => a.machine.variant < b.machine.variant ? -1 : 1), at: items[0].createdAt, goal: items[0].goal, label: items[0].machine.formatLabel })).sort((a, b) => a.at < b.at ? 1 : -1);
};
const mCurGroup = () => { const g = mGroups(); return g.find(x => x.id === mGroup) || g[0] || null; };
const mStatusClass = s => ({ 'Aprovado': 'ok', 'Em revisão': 'warn', 'Rascunho': 'draft' }[s] || 'draft');

async function mLoadFormats() {
  if (mFormats || mLoading) return;
  mLoading = true;
  try { mFormats = await api('/api/machine/formats'); } catch (e) { mErr = e.message; }
  mLoading = false;
  if (view === 'studio') render();
}

function mFactHtml(ct) {
  const f = ct.factCheck;
  if (!f) return `<div class=m-fact><button class=btn data-m-review="${ct.id}">Conferir fatos</button><small>Segunda leitura para apontar números, nomes e datas duvidosos.</small></div>`;
  const base = f.basedOn === 'material' ? 'conferido contra o seu material' : 'sem material de apoio, só aponto o que pode ter sido inventado';
  if (f.status === 'confere') return `<div class="m-fact ok"><b>Fatos conferidos</b><small>${esc(base)}. Nada a apontar.</small><button class=btn data-m-review="${ct.id}">Conferir de novo</button></div>`;
  if (f.status === 'atencao') return `<div class="m-fact warn"><b>Atenção: ${f.alerts.length} ponto(s) para revisar</b><small>${esc(base)}.</small><ul>${f.alerts.map(a => `<li><q>${esc(a.trecho)}</q><span>${esc(a.motivo)}</span>${a.sugestao ? `<em>Sugestão: ${esc(a.sugestao)}</em>` : ''}</li>`).join('')}</ul><button class=btn data-m-review="${ct.id}">Conferir de novo</button></div>`;
  return `<div class="m-fact"><b>Revisão sem resultado claro</b><small>A IA não seguiu o formato esperado. Tente conferir de novo.</small><button class=btn data-m-review="${ct.id}">Conferir de novo</button></div>`;
}

function mCard(ct) {
  const queued = typeof qQueue === 'function' ? qQueue(ct.id) : null, m = ct.machine, status = queued ? 'Na fila' : ct.status;
  const canQueue = ['linkedin', 'instagram', 'facebook'].includes(ct.network);
  const files = ct.files || {};
  return `<article class=q-card data-m-card="${ct.id}"><header><div><b>${esc(m.formatLabel)}${m.subformato ? ' · ' + esc((mFormats?.subformatos || {})[m.subformato] || m.subformato) : ''}</b> <span class=q-badge>Versão ${esc(m.variant)}</span> <span class="q-badge ${queued ? 'ok' : mStatusClass(ct.status)}">${esc(status)}</span></div><small data-m-count="${ct.id}">${(ct.text || '').length} caracteres</small></header>
  <textarea data-m-text="${ct.id}" rows=${['blog', 'youtube', 'podcast'].includes(ct.kind) ? 18 : 11} ${queued ? 'disabled' : ''} data-max="mtext">${esc(ct.text || '')}</textarea>
  ${queued ? `<div class=q-note>Este conteúdo está na fila de publicação e não pode ser editado. <button class=btn data-m-unqueue="${ct.id}">Retirar da fila para editar</button></div>` : ''}
  ${ct.quality && ct.quality.status === 'atencao' ? `<div class="m-fact warn"><b>O validador automático pediu atenção</b><small>Apontou: ${esc((ct.quality.issues || []).join(', ') || 'revisão geral')}. Leia com cuidado e edite antes de aprovar.</small></div>` : ''}
  ${(ct.machine.vetadasRestantes || []).length ? `<div class="m-fact warn"><b>Ainda contém palavra vetada</b><small>${esc(ct.machine.vetadasRestantes.join(', '))}. Troque à mão antes de aprovar.</small></div>` : ''}
  ${mFactHtml(ct)}
  <div class=actions>${queued ? '' : `<button class=btn data-m-save="${ct.id}">Salvar edição</button>`}<button class=btn data-m-copy="${ct.id}">Copiar texto</button>
  ${files.docx ? `<a class=btn href="${esc(files.docx)}?download=1">Word</a>` : ''}${files.pdf ? `<a class=btn href="${esc(files.pdf)}?download=1">PDF</a>` : ''}${files.html ? `<a class=btn href="${esc(files.html)}?download=1">HTML do artigo</a>` : ''}
  <button class=btn data-m-pack="${ct.id}">Baixar pacote</button>
  ${!queued && ct.status !== 'Aprovado' ? `<button class="btn primary" data-m-approve="${ct.id}">Aprovar</button>` : ''}${!queued && ct.status === 'Aprovado' && canQueue ? `<button class="btn primary" data-m-queue="${ct.id}">Enviar para a fila</button>` : ''}</div>
  ${mNotice[ct.id] ? `<div class=q-note>${esc(mNotice[ct.id])}</div>` : ''}</article>`;
}

function studioView(c) {
  if (!c) return empty();
  if (!mFormats) { mLoadFormats(); return `<div class=q-hero><div class=eyebrow>Estúdio</div><h2>Criar conteúdo</h2><p class=muted>${mErr ? esc(mErr) : 'Carregando os formatos…'}</p></div>`; }
  const def = mDef(mKind), g = mCurGroup(), groups = mGroups(), f = mForm;
  const subs = def.subformats || [];
  return `<div class=q-hero><div class=eyebrow>Estúdio</div><h2>Criar conteúdo</h2><p class=muted>Escolha o formato e diga o tema. Eu gero de uma a três versões diferentes e salvo tudo como rascunho.</p>
  <div class=m-formats role=radiogroup aria-label="Formato">${mFormats.formats.map(x => `<button type=button role=radio aria-checked="${x.id === mKind}" class="m-format ${x.id === mKind ? 'on' : ''}" data-m-kind="${x.id}"><b>${esc(x.label)}</b><span>${esc(x.desc)}</span></button>`).join('')}</div>
  <label class=q-lbl>Tema *<input id=mTema data-max="mTema" value="${esc(f.tema)}" placeholder="Ex.: por que o dono da empresa não consegue tirar férias" maxlength=600></label>
  ${subs.length ? `<label class=q-lbl>Subformato do X<select id=mSub data-max="mSub">${subs.map(s => `<option value="${s}" ${f.subformato === s ? 'selected' : ''}>${esc((mFormats.subformatos || {})[s] || s)}</option>`).join('')}</select></label>` : ''}
  <label class=q-lbl>Material de apoio <small>(cole notícia, estudo, conversa ou anotações; se ficar vazio, eu uso só o que a empresa aprovou)</small><textarea id=mContexto data-max="mContexto" rows=5 placeholder="Cole aqui o conteúdo da fonte original.">${esc(f.contexto)}</textarea></label>
  <div class=row><label class=q-lbl>Ângulo <small>(opcional)</small><input id=mAngulo data-max="mAngulo" value="${esc(f.angulo)}" placeholder="Ex.: visão de quem vende para empresas" maxlength=200></label>
  <label class=q-lbl>Objetivo<select id=mObjetivo data-max="mObjetivo">${mObjs().map(([k, l]) => `<option value="${k}" ${f.objetivo === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label></div>
  <div class=row><label class=q-lbl>Versões<select id=mVariantes data-max="mVariantes">${[1, 2, 3].map(n => `<option value=${n} ${Number(f.variantes) === n ? 'selected' : ''}>${n} ${n === 1 ? 'versão (recomendado)' : 'versões'}</option>`).join('')}</select></label>
  <label class=q-lbl>Tom extra <small>(opcional)</small><input id=mTom data-max="mTom" value="${esc(f.tomExtra)}" placeholder="Ex.: mais direto" maxlength=200></label></div>
  <details class=m-slop ${f.estrutura ? 'open' : ''}><summary>Remodelagem anti-slop: estudar a estrutura de um vídeo que deu certo</summary><label class=q-lbl>Transcrição de referência <small>(eu estudo o ritmo e o arco, sem copiar)</small><textarea id=mEstrutura data-max="mEstrutura" rows=5 placeholder="Cole a transcrição. O sistema estuda a estrutura sem copiar.">${esc(f.estrutura)}</textarea></label></details>
  <label class=q-lbl>Palavras a evitar <small>(opcional; as restrições da empresa já valem)</small><input id=mVetadas data-max="mVetadas" value="${esc(f.vetadas)}" placeholder="Ex.: gargalo, funil, ticket" maxlength=300></label>
  <label class=q-chip><input type=checkbox id=mFactual data-max="mFactual" ${f.factual ? 'checked' : ''}> Revisão factual (segunda leitura que confere números, nomes e datas)</label>
  <div class=actions><button class="btn primary" id=mGo ${mBusy ? 'disabled' : ''}>${mBusy ? 'Criando…' : 'Gerar e salvar'}</button><span class=smallline>Nada é publicado. Você revisa, edita e aprova.</span></div>
  ${mErr ? `<div class=q-error>${esc(mErr)}</div>` : ''}${mWarn.length ? `<div class=q-note>${mWarn.map(esc).join('<br>')}</div>` : ''}</div>
  ${g ? `<div class=q-groupinfo><h3>Suas versões</h3><p class=muted>${esc(g.label)}: “${esc(g.goal)}”. Revise, edite o que quiser e aprove.</p></div><div class=q-cards>${g.items.map(mCard).join('')}</div>` : '<div class=empty>Suas versões aparecem aqui, prontas para revisar e editar.</div>'}
  ${groups.length > 1 ? `<details class=q-older><summary>Criações anteriores (${groups.length - 1})</summary>${groups.filter(x => !g || x.id !== g.id).slice(0, 20).map(x => `<button class=q-oldbtn data-m-group="${x.id}"><b>${esc((x.goal || '').slice(0, 90))}</b><span>${esc(x.label)} · ${x.items.length} ${x.items.length === 1 ? 'versão' : 'versões'} · ${new Date(x.at).toLocaleDateString('pt-BR')}</span></button>`).join('')}</details>` : ''}`;
}

async function mSaveText(id) {
  const ta = $(`[data-m-text="${id}"]`); if (!ta) return true;
  const ct = contentById(id); if (!ct || ta.value === ct.text) return true;
  try { await api('/api/contents/' + id, { method: 'PUT', body: { text: ta.value } }); await refresh(); return true; }
  catch (e) { mNotice[id] = e.message; return false; }
}

async function mCreate() {
  const c = cur(); if (!c || mBusy) return;
  mErr = ''; mWarn = []; mBusy = true;
  setMaxState('thinking', 'Estou escrevendo as versões agora. Já já ficam prontas.'); render();
  try {
    const r = await api('/api/machine/create', { method: 'POST', body: { clientId: c.id, kind: mKind, ...mForm, variantes: Number(mForm.variantes) } });
    mGroup = r.groupId; mWarn = r.warnings || [];
    await refresh();
    setMaxState('speaking', `Pronto. ${r.items.length} ${r.items.length === 1 ? 'versão salva' : 'versões salvas'} como rascunho. Revise e aprove.`);
  } catch (e) { mErr = e.message; setMaxState('speaking', e.message); }
  mBusy = false; render();
}

function wireStudio() {
  if (view !== 'studio') return;
  const on = (id, key, fn) => { const el = $('#' + id); if (el) el[key] = fn; };
  const bind = (id, prop, cast) => { const el = $('#' + id); if (el) el.oninput = el.onchange = () => { mForm[prop] = cast ? cast(el) : el.value; }; };
  bind('mTema', 'tema'); bind('mContexto', 'contexto'); bind('mAngulo', 'angulo'); bind('mObjetivo', 'objetivo'); bind('mTom', 'tomExtra');
  bind('mEstrutura', 'estrutura'); bind('mVetadas', 'vetadas'); bind('mSub', 'subformato'); bind('mVariantes', 'variantes', el => Number(el.value)); bind('mFactual', 'factual', el => el.checked);
  on('mTema', 'onkeydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#mGo')?.click(); } });
  on('mGo', 'onclick', () => mCreate());
  $$('[data-m-kind]').forEach(b => b.onclick = () => { mKind = b.dataset.mKind; render(); });
  $$('[data-m-group]').forEach(b => b.onclick = () => { mGroup = b.dataset.mGroup; render(); });
  $$('[data-m-text]').forEach(t => t.oninput = () => { const n = $(`[data-m-count="${t.dataset.mText}"]`); if (n) n.textContent = t.value.length + ' caracteres'; });
  $$('[data-m-save]').forEach(b => b.onclick = async () => { const id = b.dataset.mSave; mNotice[id] = (await mSaveText(id)) ? 'Edição salva.' : mNotice[id]; render(); });
  $$('[data-m-copy]').forEach(b => b.onclick = async () => {
    const ta = $(`[data-m-text="${b.dataset.mCopy}"]`);
    try { await navigator.clipboard.writeText(ta.value); b.textContent = 'Copiado'; } catch { ta.select(); b.textContent = 'Selecione e copie (Ctrl+C)'; }
  });
  $$('[data-m-approve]').forEach(b => b.onclick = async () => {
    const id = b.dataset.mApprove; if (!(await mSaveText(id))) return render();
    try { await api('/api/contents/' + id, { method: 'PUT', body: { status: 'Aprovado' } }); mNotice[id] = 'Aprovado. Baixe o pacote para publicar ou envie para a fila.'; await refresh(); } catch (e) { mNotice[id] = e.message; }
    render();
  });
  $$('[data-m-pack]').forEach(b => b.onclick = async () => {
    const id = b.dataset.mPack; if (!(await mSaveText(id))) return render();
    try { const r = await api(`/api/contents/${id}/package`, { method: 'POST' }); const a = document.createElement('a'); a.href = r.url + '?download=1'; a.download = ''; document.body.appendChild(a); a.click(); a.remove(); mNotice[id] = 'Pacote baixado. Abra o arquivo legenda.txt e publique onde quiser.'; } catch (e) { mNotice[id] = e.message; }
    render();
  });
  $$('[data-m-queue]').forEach(b => b.onclick = async () => {
    const id = b.dataset.mQueue, ct = contentById(id);
    try { await api('/api/content-engine/publication', { method: 'POST', body: { clientId: clientId, contentId: id, network: ct.network } }); mNotice[id] = 'Na fila. A publicação automática ainda não está ativa: use “Baixar pacote” para publicar agora.'; await refresh(); } catch (e) { mNotice[id] = e.message; }
    render();
  });
  $$('[data-m-unqueue]').forEach(b => b.onclick = async () => { try { await api(`/api/contents/${b.dataset.mUnqueue}/queue-remove`, { method: 'POST' }); await refresh(); } catch (e) { mNotice[b.dataset.mUnqueue] = e.message; } render(); });
  $$('[data-m-review]').forEach(b => b.onclick = async () => {
    const id = b.dataset.mReview; if (b.disabled) return;
    if (!(await mSaveText(id))) return render();
    b.disabled = true; b.textContent = 'Conferindo…'; setMaxState('thinking', 'Estou conferindo os fatos do texto.');
    try { await api('/api/machine/review', { method: 'POST', body: { contentId: id, contexto: mForm.contexto } }); await refresh(); setMaxState('speaking', 'Conferi. Veja os pontos abaixo do texto.'); } catch (e) { mNotice[id] = e.message; setMaxState('speaking', e.message); }
    render();
  });
}

const baseRenderStudio = render;
render = function () { if (view === 'studio') { document.body.classList.remove('has-dock'); shell(studioView(cur())); wire(); return; } baseRenderStudio(); };
const baseWireStudio = wire;
wire = function () { baseWireStudio(); wireStudio(); };

const baseMaxContextStudio = maxContext;
maxContext = function () {
  if (view === 'studio') {
    if (mBusy) return { t: 'Estou escrevendo as versões agora. Já já ficam prontas.', n: 'Aguarde alguns segundos.' };
    const g = mCurGroup();
    if (g) {
      const ap = g.items.filter(x => x.status === 'Aprovado' || (typeof qQueue === 'function' && qQueue(x.id))).length, tot = g.items.length;
      const flagged = g.items.filter(x => x.factCheck && x.factCheck.status === 'atencao').length;
      return {
        t: `${ap} de ${tot} ${tot === 1 ? 'versão aprovada' : 'versões aprovadas'}.${flagged ? ` ${flagged} com pontos de fato para revisar.` : ''}`,
        n: flagged ? 'Leia os pontos de atenção e corrija o texto antes de aprovar.' : (ap === tot ? 'Tudo aprovado. Baixe o pacote para publicar.' : 'Escolha a melhor versão, edite e aprove.')
      };
    }
  }
  return baseMaxContextStudio();
};

const baseOpenToolStudio = openTool;
openTool = function (t) { if (t === 'studio') { toolsOpen = false; view = 'studio'; render(); return; } return baseOpenToolStudio(t); };
const baseToolDrawerStudio = toolDrawer;
toolDrawer = function () { const h = baseToolDrawerStudio(), tile = '<button class=tool-tile data-tool="studio"><b>Estúdio</b><span>Vídeo, X, blog, podcast, YouTube, comunidade e mais, com versões e revisão factual</span></button>', i = h.lastIndexOf('</div></aside></div>'); return i < 0 ? h : h.slice(0, i) + tile + h.slice(i); };
