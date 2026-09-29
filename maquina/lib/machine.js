'use strict';
/* Estúdio de conteúdo (fase 1): formatos estruturados, 1 a 3 variantes por pedido e revisão factual.
   Módulo aditivo: usa o motor, o Jev, os créditos e o armazenamento que já existem em server.js.
   Nada aqui publica conteúdo. Os textos entram como "Rascunho" e seguem o fluxo de aprovação atual. */

const fs = require('fs'), path = require('path');

const OBJETIVOS = {
  autoridade: 'Construir autoridade sobre o tema',
  conversa: 'Gerar conversa com quem já tem o problema',
  diagnostico: 'Convidar para um diagnóstico',
  educar: 'Educar de forma simples e prática',
  alcance: 'Alcance máximo, com gancho forte'
};

const VARIANT_HINTS = {
  A: 'Abordagem direta: abra com a afirmação central, sem rodeios.',
  B: 'Abordagem por cena ou analogia: abra com uma situação reconhecível do dia a dia do público.',
  C: 'Abordagem por pergunta ou contraste: abra questionando uma crença comum e mostre o outro lado.'
};

const NO_MARKDOWN = 'Não use Markdown, asteriscos nem títulos com #.';

const KINDS = {
  video_curto: {
    label: 'Vídeo curto', desc: 'Reels, TikTok e Shorts', contentKind: 'script', network: 'video', tokens: 3500, max: 2600, guide: true,
    rules: 'Roteiro de vídeo vertical de 30 a 45 segundos, em fala natural. Estrutura obrigatória, cada parte em uma linha começando por: "Gancho (0 a 3 s):", "Cena 1:", "Cena 2:", "Cena 3:" (até 5 cenas) e "Fechamento:". Em cada cena escreva a fala e, entre parênteses, uma sugestão visual simples. No fechamento, uma chamada para ação. Depois escreva uma linha "Legenda:" com a legenda pronta de até 300 caracteres.'
  },
  carrossel: {
    label: 'Carrossel', desc: 'Instagram e LinkedIn, por telas', contentKind: 'carousel', network: 'instagram', tokens: 4500, max: 3500,
    rules: 'Escreva de 6 a 8 slides, cada um iniciado por "Slide 1:", "Slide 2:" e assim por diante, com no máximo duas frases curtas por slide. O primeiro slide é a capa com promessa clara e o último traz a chamada para ação. Depois dos slides, escreva uma linha "Legenda:" seguida da legenda pronta.'
  },
  linkedin: {
    label: 'LinkedIn', desc: 'Texto com gancho', contentKind: 'post', network: 'linkedin', tokens: 3000, max: 1300,
    rules: 'Primeira linha forte que gere curiosidade, pois o LinkedIn corta o texto após cerca de três linhas. Parágrafos curtos de uma a duas frases, com linha em branco entre eles. Tom profissional e direto. Entre 700 e 1300 caracteres. Termine com uma pergunta ou um convite claro para conversar. De 3 a 5 hashtags na última linha.'
  },
  instagram: {
    label: 'Instagram', desc: 'Legenda com chamada', contentKind: 'post', network: 'instagram', tokens: 3000, max: 2000,
    rules: 'Legenda com gancho nos primeiros 120 caracteres. Linguagem próxima e leve, frases curtas. Entre 400 e 1000 caracteres. Chamada para ação simples, como enviar mensagem ou usar o link da bio. De 5 a 8 hashtags na última linha.'
  },
  x: {
    label: 'X / Twitter', desc: '5 subformatos', contentKind: 'x', network: 'x', tokens: 2500, max: 1500,
    subformats: {
      thread: 'Thread de 5 posts numerados "1/5" a "5/5", cada um com no máximo 270 caracteres. O primeiro é o gancho e o último traz a chamada para ação.',
      provocacao: 'Um único post provocativo de até 270 caracteres, que questione uma crença comum do público.',
      pergunta: 'Um post em forma de pergunta ou enquete, com a pergunta e de 2 a 4 opções curtas, até 270 caracteres no total.',
      opiniao: 'Um post de opinião firme, em duas ou três frases, de até 270 caracteres, terminando em uma frase que convide à resposta.',
      minicaso: 'Um mini caso em até 3 posts curtos (1/3 a 3/3), usando apenas a situação descrita no material fornecido, sem inventar dados, nomes ou resultados.'
    },
    rules: 'Escreva no subformato pedido. No máximo uma hashtag em todo o conteúdo.'
  },
  newsletter: {
    label: 'Newsletter', desc: 'E-mail, grupos e WhatsApp', contentKind: 'newsletter', network: 'email', tokens: 3500, max: 3500,
    rules: 'Comece com uma linha "Assunto:" de até 60 caracteres e uma linha "Pré-header:" de até 90 caracteres. Depois o corpo, com 250 a 400 palavras, parágrafos curtos e uma única chamada para ação no final.'
  },
  blog: {
    label: 'Blog', desc: 'Artigo com subtítulos e HTML', contentKind: 'blog', network: 'blog', tokens: 6000, max: 9000, html: true,
    rules: 'Comece com uma linha "Título:" de até 60 caracteres e uma linha "Descrição:" de até 155 caracteres para o Google. Depois o artigo, com 700 a 1000 palavras, dividido por 4 a 6 linhas iniciadas por "Subtítulo:". Parágrafos curtos, linguagem simples, e uma conclusão com chamada para ação.'
  },
  podcast: {
    label: 'Podcast', desc: 'Roteiro narrado de 3 a 7 minutos', contentKind: 'podcast', network: 'podcast', tokens: 5000, max: 8000,
    rules: 'Roteiro para ser lido em voz alta, de 450 a 1050 palavras (3 a 7 minutos). Estrutura em linhas iniciadas por "Abertura:", "Bloco 1:", "Bloco 2:", "Bloco 3:" e "Encerramento:". Frases curtas, primeira pessoa, linguagem falada, sem termos que só funcionam na escrita.'
  },
  youtube: {
    label: 'YouTube', desc: 'Vídeo longo de 10 a 15 minutos', contentKind: 'youtube', network: 'youtube', tokens: 7000, max: 14000, guide: true,
    rules: 'Comece com 3 opções de título, cada uma em uma linha "Título 1:", "Título 2:", "Título 3:". Depois "Gancho (0 a 30 s):" e de 4 a 6 capítulos em linhas "Capítulo 1 (tempo aproximado):" com a fala de cada um. Termine com "Fechamento:" e uma chamada para ação, e uma linha "Descrição:" com a descrição pronta do vídeo.'
  },
  comunidade: {
    label: 'Comunidade', desc: 'Analisa conversas e gera nutrição', contentKind: 'community', network: 'comunidade', tokens: 3500, max: 3500,
    rules: 'Se o material trouxer mensagens de uma conversa, comece com "O que aparece na conversa:" e liste até 3 dúvidas, dores ou objeções recorrentes, usando apenas o que está nas mensagens. Depois escreva "Mensagem de nutrição:" (até 600 caracteres, tom de grupo, sem soar como propaganda) e "Enquete:" com uma pergunta e 3 a 4 opções curtas. Sem material de conversa, gere só a mensagem de nutrição e a enquete a partir do tema.'
  }
};

const PUBLIC_KINDS = () => Object.entries(KINDS).map(([id, k]) => ({
  id, label: k.label, desc: k.desc, guide: !!k.guide,
  subformats: k.subformats ? Object.keys(k.subformats) : []
}));

const SUBFORMAT_LABELS = { thread: 'Thread de 5 posts', provocacao: 'Provocação', pergunta: 'Pergunta ou enquete', opiniao: 'Opinião firme', minicaso: 'Mini caso' };

const LETTERS = ['A', 'B', 'C'];
const marker = l => `[[VARIANTE${l}]]`;
const reviewMarker = l => `[[REVISAO${l}]]`;
const variantOf = it => (it.machine && it.machine.variant) || 'A';

/* Palavras vetadas: vêm das restrições da empresa (texto livre) e do campo do pedido.
   O modelo pequeno ignora "não use", então a Máquina confere no código e reescreve só o que for preciso. */
function parseVetadas(txt) {
  const out = new Set(), t = String(txt || '');
  const res = [
    /(?:n[aã]o|nunca)\s+us\w+\s+(?:as\s+|os\s+)?(?:palavras?|termos?|express\w+)\s*:?\s*([^.\n]+)/gi,
    /(?:palavras?|termos?|express\w+)\s+(?:vetad\w+|proibid\w+)\s*:?\s*([^.\n]+)/gi,
    /nunca\s+usar\s*:\s*([^.\n]+)/gi
  ];
  for (const re of res) {
    let m;
    while ((m = re.exec(t))) {
      for (let w of m[1].split(/[,;]|\s+e\s+|\s+ou\s+/)) {
        w = w.replace(/["“”'‘’()]/g, '').trim().toLowerCase();
        if (w.length >= 3 && w.length <= 30 && w.split(/\s+/).length <= 3) out.add(w);
      }
    }
  }
  return [...out];
}
const escRe = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const vetRegex = w => new RegExp(`(?<![\\p{L}\\p{N}])${escRe(w)}(?:s|es|mente)?(?![\\p{L}\\p{N}])`, 'iu');
const findVetadas = (text, words) => words.filter(w => vetRegex(w).test(text));

function buildPrompt(def, f) {
  const n = f.variantes;
  const sub = def.subformats ? (def.subformats[f.subformato] || def.subformats.thread) : '';
  const lines = [
    `ESTÚDIO DE CONTEÚDO — formato: ${f.kind}`,
    `PEDIDO DO CLIENTE (é o foco exato do conteúdo): ${f.tema}`,
    f.contexto
      ? `MATERIAL DE APOIO FORNECIDO PELO CLIENTE (use como fonte; não acrescente fatos que não estejam aqui ou nas informações aprovadas da empresa):\n${f.contexto}`
      : 'Não há material de apoio. Use apenas as informações aprovadas da empresa e conhecimento geral seguro. Não cite datas, números, estatísticas, nomes próprios ou fatos recentes dos quais você não tenha certeza; prefira falar em termos gerais.',
    f.angulo ? `ÂNGULO: ${f.angulo}` : '',
    `OBJETIVO: ${OBJETIVOS[f.objetivo]}`,
    f.tomExtra ? `TOM EXTRA: ${f.tomExtra}` : '',
    f.estrutura ? `ESTRUTURA DE REFERÊNCIA (estude o ritmo e o arco, sem copiar frases nem ideias específicas do original):\n${f.estrutura}` : '',
    `FORMATO (${def.label}): ${def.rules}${sub ? ' Subformato: ' + sub : ''}`,
    f.vetadas && f.vetadas.length ? `PALAVRAS QUE NÃO PODEM APARECER EM NENHUM TRECHO (nem no plural): ${f.vetadas.join(', ')}. Use outras palavras.` : '',
    `Crie ${n} ${n === 1 ? 'versão' : 'versões'} ${n === 1 ? '' : 'claramente diferentes na abordagem, e não apenas reescritas. '}${NO_MARKDOWN} Não invente números, resultados, casos nem depoimentos. Não cite preços, prazos ou garantias que não estejam nas informações aprovadas.`
  ].filter(Boolean);
  const blocks = LETTERS.slice(0, n).map(l => `${marker(l)}\n(Versão ${l}${n > 1 ? '. ' + VARIANT_HINTS[l] : ''})`).join('\n\n');
  lines.push(`FORMATO DE SAÍDA OBRIGATÓRIO: escreva o marcador exato de cada versão em uma linha sozinha e, logo abaixo, o texto pronto. Não escreva nada fora dos blocos e não repita a instrução entre parênteses.\n\n${blocks}`);
  return lines.join('\n\n');
}

/* O que o validador (Jev) enxerga: o pedido em linguagem limpa e as versões sem marcadores técnicos. */
function judgePrompt(def, f) {
  const sub = def.subformats ? (def.subformats[f.subformato] || def.subformats.thread) : '';
  return [
    `Pedido: ${f.tema}`,
    `Formato: ${def.label}. ${def.rules}${sub ? ' Subformato: ' + sub : ''}`,
    `Objetivo: ${OBJETIVOS[f.objetivo]}`,
    f.contexto ? `Material de apoio fornecido pelo cliente (fonte permitida para fatos):\n${f.contexto}` : 'Não há material de apoio: fatos específicos, números e nomes não sustentados pelas informações aprovadas da empresa não são permitidos.',
    f.angulo ? `Ângulo: ${f.angulo}` : '',
    f.tomExtra ? `Tom extra: ${f.tomExtra}` : '',
    'Os rótulos de estrutura pedidos no formato (por exemplo "Gancho (0 a 3 s):", "Cena 1:", "Slide 2:", "Legenda:", "Assunto:", "Subtítulo:") e as sugestões visuais entre parênteses fazem parte do formato pedido. Não são marcação técnica nem linguagem de chatbot.',
    'Regras: português do Brasil, linguagem natural, sem Markdown, sem inventar números, casos ou depoimentos, sem preços.',
    f.variantes > 1 ? `O rascunho traz ${f.variantes} versões alternativas separadas por "---". Cada uma deve cumprir o pedido.` : ''
  ].filter(Boolean).join('\n');
}
function judgeText(text, n) {
  const blocks = parseBlocks(text);
  const parts = LETTERS.slice(0, n).map(l => stripHint(blocks[`VARIANTE${l}`] || '')).filter(Boolean);
  if (!parts.length) return String(text || '').replace(/\[\[[A-Z]+\]\]/g, '').trim();
  return parts.length > 1 ? parts.map((p, i) => `VERSÃO ${i + 1}\n${p}`).join('\n\n---\n\n') : parts[0];
}

function parseBlocks(text) {
  const out = {}, re = /\[\[([A-Z]+)\]\]/g, idx = [];
  let m;
  while ((m = re.exec(String(text || '')))) idx.push({ k: m[1], s: m.index, e: re.lastIndex });
  idx.forEach((x, i) => { out[x.k] = String(text).slice(x.e, i + 1 < idx.length ? idx[i + 1].s : undefined).trim(); });
  return out;
}

const stripHint = t => String(t || '').replace(/^\(Versão [A-C][^\n]*\)\s*\n?/, '').trim();

function reviewPrompt(items, contexto) {
  const parts = items.map(it => `${reviewMarker(variantOf(it))}\nTEXTO A CONFERIR:\n${it.text}`).join('\n\n');
  const base = contexto
    ? `Compare cada texto com o MATERIAL abaixo. Aponte cada afirmação, número, data ou nome que não esteja no material ou que o contradiga.\n\nMATERIAL:\n${contexto}`
    : 'Não há material de referência. Aponte nomes próprios, números, datas, estatísticas, resultados e afirmações verificáveis que possam ter sido inventados, e sugira generalizar ou remover.';
  return `REVISÃO FACTUAL — ${base}\n\nPara cada texto, responda dentro do marcador dele. Primeira linha: "STATUS: CONFERE" (nada a apontar) ou "STATUS: ATENCAO". Depois, uma linha por problema no formato: "ALERTA: trecho exato | motivo | sugestão de correção". Não reescreva o texto inteiro, não use Markdown e não escreva nada fora dos marcadores.\n\n${parts}`;
}

function parseReview(block) {
  const raw = String(block || '').trim();
  const status = /STATUS:\s*ATENCAO/i.test(raw) ? 'atencao' : /STATUS:\s*CONFERE/i.test(raw) ? 'confere' : 'indeterminado';
  const alerts = [...raw.matchAll(/^ALERTA:\s*(.+)$/gim)].map(m => {
    const [trecho, motivo, sugestao] = m[1].split('|').map(s => s.trim());
    return { trecho: (trecho || '').slice(0, 300), motivo: (motivo || '').slice(0, 300), sugestao: (sugestao || '').slice(0, 300) };
  }).filter(a => a.trecho);
  return { status: status === 'confere' && alerts.length ? 'atencao' : status, alerts: alerts.slice(0, 12) };
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function blogHtml(text, fallbackTitle) {
  const lines = String(text || '').split('\n').map(l => l.trim());
  let title = fallbackTitle || 'Artigo', desc = '';
  const body = [];
  for (const l of lines) {
    let m;
    if ((m = l.match(/^T[ií]tulo:\s*(.+)$/i))) { title = m[1]; continue; }
    if ((m = l.match(/^Descri[cç][aã]o:\s*(.+)$/i))) { desc = m[1]; continue; }
    if ((m = l.match(/^Subt[ií]tulo:\s*(.+)$/i))) { body.push(`<h2>${esc(m[1])}</h2>`); continue; }
    if (l) body.push(`<p>${esc(l)}</p>`);
  }
  return `<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>${esc(title)}</title>\n<meta name="description" content="${esc(desc)}">\n</head>\n<body>\n<article>\n<h1>${esc(title)}</h1>\n${body.join('\n')}\n</article>\n</body>\n</html>\n`;
}

function createMachine(d) {
  const { getState, save, id, clientById, canUse, recordUse, recordProviderCost, generateVerified, promptEngine,
    workSession, createTextFiles, repairText, normalizedCredits, geminiKeyFor, audit, json, body, produced, safeName } = d;
  const state = () => getState();

  const busy = c => state().reservations.includes(c.id + ':machine');
  const lock = c => { state().reservations.push(c.id + ':machine'); save(); };
  const unlock = c => { state().reservations = state().reservations.filter(x => x !== c.id + ':machine'); save(); };

  async function noBalance(c) {
    const credits = await normalizedCredits(c).catch(() => null);
    return !!(credits && credits.available != null && credits.available <= 0 && !geminiKeyFor(c));
  }

  async function runReview(c, items, contexto) {
    const prompt = reviewPrompt(items, contexto);
    const out = await promptEngine(c, 'review',
      'Você é um revisor factual rigoroso. Responda em português do Brasil, exatamente no formato pedido, sem inventar informações.', prompt, 2500);
    const blocks = parseBlocks(out.text);
    const at = new Date().toISOString();
    for (const it of items) {
      const r = parseReview(blocks[`REVISAO${variantOf(it)}`]);
      it.factCheck = { ...r, basedOn: contexto ? 'material' : 'sem_material', at };
      it.updatedAt = at;
    }
    recordUse(c, 'review', out.cost, { machine: true, provider: out.provider || 'openrouter' });
    save();
    return out;
  }

  /* Confere as palavras vetadas no código. Se aparecerem, pede uma reescrita mínima e confere de novo. */
  async function enforceVetadas(c, def, items, words, warnings) {
    const bad = items.filter(it => findVetadas(it.text, words).length);
    if (!bad.length) return;
    const parts = bad.map(it => `[[VARIANTE${variantOf(it)}]]\n${it.text}`).join('\n\n');
    const prompt = `ESTÚDIO DE CONTEÚDO — reescrita — formato: ${Object.keys(KINDS).find(k => KINDS[k] === def)}\nReescreva cada versão abaixo trocando apenas o necessário para eliminar estas palavras, inclusive no plural: ${words.join(', ')}. Mantenha o sentido, o tamanho, a estrutura, os rótulos e o tom. Não acrescente informações. ${NO_MARKDOWN}\nFORMATO DE SAÍDA OBRIGATÓRIO: o marcador exato de cada versão em uma linha sozinha e, logo abaixo, o texto reescrito.\n\n${parts}`;
    let blocks = {};
    try {
      const out = await promptEngine(c, 'review', 'Você reescreve textos em português do Brasil com mudanças mínimas, sem inventar informações.', prompt, def.tokens);
      blocks = parseBlocks(out.text);
    } catch (e) {
      if (e.providerCost) recordProviderCost(c, 'review', e.providerCost, e.model, 'failed', { reason: e.message });
      audit('machine_vetadas_error', e.message);
    }
    for (const it of bad) {
      const before = findVetadas(it.text, words);
      const rewritten = repairText(stripHint(blocks[`VARIANTE${variantOf(it)}`] || ''), '');
      if (rewritten.length >= it.text.length * 0.6 && !findVetadas(rewritten, words).length) {
        it.text = rewritten; it.updatedAt = new Date().toISOString();
        it.files = createTextFiles(it);
        if (def.html) {
          const dir = path.join(produced, it.id), fn = safeName(it.title) + '.html';
          fs.writeFileSync(path.join(dir, fn), blogHtml(it.text, it.goal)); it.files.html = `/files/${it.id}/${fn}`;
        }
        it.machine.reescritaVetadas = before;
      } else {
        warnings.push(`Versão ${variantOf(it)}: ainda contém ${before.map(w => '“' + w + '”').join(', ')}. Troque à mão antes de aprovar.`);
        it.machine.vetadasRestantes = before;
      }
    }
    save();
  }

  async function create(req, res) {
    const b = await body(req), c = clientById(b.clientId);
    if (!c) return json(req, res, 404, { error: 'Empresa não encontrada' });
    const def = KINDS[b.kind];
    if (!def) return json(req, res, 400, { error: 'Escolha um formato válido.' });
    const tema = String(b.tema || '').trim();
    if (tema.length < 6) return json(req, res, 400, { error: 'Diga o tema em uma frase. Exemplo: por que o dono da empresa não consegue tirar férias.' });
    if (tema.length > 600) return json(req, res, 400, { error: 'O tema está muito longo. Resuma em até 600 caracteres e coloque o resto em “Material de apoio”.' });
    const contexto = String(b.contexto || '').trim();
    if (contexto.length > 12000) return json(req, res, 400, { error: 'O material de apoio está muito longo. Envie até 12000 caracteres.' });
    const estrutura = String(b.estrutura || '').trim();
    if (estrutura.length > 12000) return json(req, res, 400, { error: 'A estrutura de referência está muito longa. Envie até 12000 caracteres.' });
    const f = {
      kind: b.kind, tema, contexto, estrutura,
      angulo: String(b.angulo || '').trim().slice(0, 200),
      tomExtra: String(b.tomExtra || '').trim().slice(0, 200),
      objetivo: OBJETIVOS[b.objetivo] ? b.objetivo : 'autoridade',
      variantes: Math.min(3, Math.max(1, parseInt(b.variantes, 10) || 1)),
      subformato: def.subformats && def.subformats[b.subformato] ? b.subformato : 'thread'
    };
    f.vetadas = [...new Set([
      ...parseVetadas(c.context && c.context.restricoes),
      ...parseVetadas(c.companyDna && c.companyDna.status === 'Aprovado' && c.companyDna.data && c.companyDna.data.restricoes),
      ...String(b.vetadas || '').split(/[,;\n]/).map(w => w.trim().toLowerCase()).filter(w => w.length >= 3 && w.length <= 30)
    ])].slice(0, 30);
    const factual = b.factual !== false;
    const cap = canUse(c, def.contentKind);
    if (!cap.ok) return json(req, res, 409, { error: cap.error });
    if (busy(c)) return json(req, res, 409, { error: 'Já existe uma criação em andamento para esta empresa.' });
    try {
      if (await noBalance(c)) return json(req, res, 402, { error: 'Saldo de IA esgotado. Reabasteça sua OpenRouter para continuar usando os recursos com IA.', aiNoBalance: true });
      lock(c);
      const st = state();
      const prompt = buildPrompt(def, f);
      let out, flag = null;
      try {
        out = await generateVerified(c, {
          kind: def.contentKind, goal: tema, prompt,
          judge: { prompt: judgePrompt(def, f), text: t => judgeText(t, f.variantes) },
          models: (st.modelMatrix[c.plan] || st.modelMatrix.economico).text,
          maxTokens: def.tokens * (f.variantes > 1 ? 1 + 0.6 * (f.variantes - 1) : 1) | 0
        });
      } catch (e) {
        /* O validador reprovou e a escalada paga não está autorizada. Em vez de perder o texto que já foi
           pago, entrega como rascunho sinalizado. Nada é publicado sem a sua aprovação. */
        if (e.code === 'PAID_ESCALATION_APPROVAL' && e.debug && e.debug.draft) {
          flag = { issues: e.debug.issues || [], checks: e.debug.checks || {} };
          out = { text: e.debug.draft, model: e.debug.model || '', provider: e.debug.provider || 'openrouter', usage: e.debug.usage || {},
            totalCost: Number(e.debug.cost || 0), route: { engine: 'jev', class: e.debug.route || '', confidence: 0 }, validation: { approved: false, checks: flag.checks }, escalated: false };
          audit('machine_flagged_draft', flag.issues.join(', '));
        } else throw e;
      }
      const blocks = parseBlocks(out.text), groupId = id('grp'), items = [], warnings = [];
      const perCost = Number(out.totalCost || 0) / f.variantes;
      for (const l of LETTERS.slice(0, f.variantes)) {
        let raw = blocks[`VARIANTE${l}`];
        if (!raw && f.variantes === 1 && !Object.keys(blocks).length) raw = out.text;
        const text = repairText(stripHint(raw || ''), prompt);
        if (!text || text.length < 20) { warnings.push(`A IA não devolveu a versão ${l}. Peça novamente.`); continue; }
        if (text.length > def.max * 1.15) warnings.push(`Versão ${l}: o texto tem ${text.length} caracteres, acima do recomendado para ${def.label}.`);
        const ct = {
          id: id('cnt'), clientId: c.id, kind: def.contentKind, network: def.network, groupId,
          title: `${def.label}${f.variantes > 1 ? ' ' + l : ''}: ${tema.slice(0, 60)}`, goal: tema, prompt: tema, text, status: 'Rascunho',
          quality: flag ? { status: 'atencao', issues: flag.issues, jev: { checks: flag.checks } } : { status: 'aprovado', issues: [], jev: out.validation },
          routing: { engine: out.route.engine, class: out.route.class, confidence: out.route.confidence, requiresExternalFacts: out.route.requiresExternalFacts, escalated: out.escalated },
          model: 'motor interno', providerModel: out.model, provider: out.provider || 'openrouter', costUsd: perCost, usage: out.usage || {},
          image: null, trackLinkId: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), files: {},
          machine: { format: b.kind, formatLabel: def.label, variant: l, objetivo: f.objetivo, angulo: f.angulo, tomExtra: f.tomExtra, subformato: def.subformats ? f.subformato : '', comMaterial: !!contexto, antiSlop: !!estrutura, guide: !!def.guide }
        };
        ct.files = createTextFiles(ct);
        if (def.html) {
          const dir = path.join(produced, ct.id), fn = safeName(ct.title) + '.html';
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, fn), blogHtml(ct.text, tema));
          ct.files.html = `/files/${ct.id}/${fn}`;
        }
        st.contents.push(ct);
        items.push(ct);
      }
      if (flag) warnings.push(`O validador automático apontou: ${flag.issues.join(', ')}. Os textos foram salvos como rascunho. Leia com atenção e edite antes de aprovar.`);
      if (f.vetadas.length) await enforceVetadas(c, def, items, f.vetadas, warnings);
      if (!items.length) throw new Error('A IA não devolveu as versões. Reformule o pedido e tente de novo. Nenhum crédito interno foi consumido.');
      workSession(c, { title: `${def.label}: ${tema}`.slice(0, 80), type: 'studio', relatedType: 'content', relatedId: items[0].id, status: 'Concluído', summary: tema.slice(0, 180) });
      recordUse(c, def.contentKind, out.totalCost, { groupId, machine: true, format: b.kind, variants: items.length, jev: true, route: out.route.class, provider: out.provider || 'openrouter', escalated: out.escalated });
      let reviewCost = 0;
      if (factual) {
        const rc = canUse(c, 'review');
        if (!rc.ok) warnings.push('A revisão factual não foi feita: ' + rc.error);
        else {
          try { const ro = await runReview(c, items, contexto); reviewCost = Number(ro.cost || 0); }
          catch (e) {
            if (e.providerCost) recordProviderCost(c, 'review', e.providerCost, e.model, 'failed', { reason: e.message });
            audit('machine_review_error', e.message);
            warnings.push('A revisão factual falhou (' + e.message + '). Os textos foram salvos sem revisão; você pode pedi-la depois.');
          }
        }
      }
      save();
      return json(req, res, 200, { groupId, items, warnings, costUsd: Number(out.totalCost || 0) + reviewCost });
    } catch (e) {
      if (e.providerCost) recordProviderCost(c, def.contentKind, e.providerCost, e.model, 'failed', { reason: e.message });
      audit('machine_error', e.message);
      const payload = { error: e.message, chargedInternal: false };
      if (process.env.SMC_DEBUG === '1' && e.debug) payload.debug = e.debug;
      return json(req, res, e.code === 'NO_KEY' ? 400 : 502, payload);
    } finally { unlock(c); }
  }

  async function review(req, res) {
    const b = await body(req), st = state();
    const ct = st.contents.find(x => x.id === b.contentId);
    if (!ct) return json(req, res, 404, { error: 'Conteúdo não encontrado' });
    const c = clientById(ct.clientId);
    if (!c) return json(req, res, 404, { error: 'Empresa não encontrada' });
    if (!String(ct.text || '').trim()) return json(req, res, 409, { error: 'Este conteúdo está sem texto.' });
    const contexto = String(b.contexto || '').trim().slice(0, 12000);
    const cap = canUse(c, 'review');
    if (!cap.ok) return json(req, res, 409, { error: cap.error });
    if (busy(c)) return json(req, res, 409, { error: 'Já existe uma criação em andamento para esta empresa.' });
    try {
      if (await noBalance(c)) return json(req, res, 402, { error: 'Saldo de IA esgotado. Reabasteça sua OpenRouter para continuar usando os recursos com IA.', aiNoBalance: true });
      lock(c);
      await runReview(c, [ct], contexto);
      save();
      return json(req, res, 200, ct);
    } catch (e) {
      if (e.providerCost) recordProviderCost(c, 'review', e.providerCost, e.model, 'failed', { reason: e.message });
      audit('machine_review_error', e.message);
      return json(req, res, e.code === 'NO_KEY' ? 400 : 502, { error: e.message, chargedInternal: false });
    } finally { unlock(c); }
  }

  async function route(req, res, u) {
    const p = u.pathname, m = req.method;
    if (p === '/api/machine/formats' && m === 'GET') return json(req, res, 200, { formats: PUBLIC_KINDS(), objetivos: OBJETIVOS, subformatos: SUBFORMAT_LABELS }), true;
    if (p === '/api/machine/create' && m === 'POST') return await create(req, res), true;
    if (p === '/api/machine/review' && m === 'POST') return await review(req, res), true;
    return false;
  }

  /* Respostas simuladas para o modo de teste (SMC_FAKE_OPENROUTER=1). Nenhuma chamada paga. */
  function fake(prompt) {
    const s = String(prompt || '');
    const rev = [...s.matchAll(/\[\[REVISAO([A-C])\]\]/g)].map(x => x[1]);
    if (rev.length && /REVISÃO FACTUAL/.test(s)) {
      return rev.map(l => `[[REVISAO${l}]]\n${l === 'B' ? 'STATUS: CONFERE' : 'STATUS: ATENCAO\nALERTA: 30% dos empresários | número sem fonte no material | remover o número ou citar a fonte'}`).join('\n\n');
    }
    if (!/ESTÚDIO DE CONTEÚDO/.test(s)) return null;
    if (/— reescrita —/.test(s)) {
      const ls2 = [...s.matchAll(/\[\[VARIANTE([A-C])\]\]\n/g)].map(x => x[1]);
      return ls2.map(l => `[[VARIANTE${l}]]\nTexto reescrito da versão ${l} sem as palavras vetadas, mantendo o sentido e o tom originais.`).join('\n\n');
    }
    const fmt = (s.match(/formato:\s*([a-z_]+)/) || [])[1] || 'x';
    const ls = [...s.matchAll(/\[\[VARIANTE([A-C])\]\]/g)].map(x => x[1]);
    const sample = l => {
      if (fmt === 'blog') return `Título: Delegar sem perder o controle (${l})\nDescrição: Um caminho simples para delegar e recuperar o seu tempo.\nSubtítulo: O problema de fazer tudo\nO dono que faz tudo cria uma empresa que depende dele.\nSubtítulo: Por onde começar\nComece por uma tarefa pequena e acompanhe o resultado.\nConclusão: escolha uma tarefa hoje e delegue.`;
      if (fmt === 'newsletter') return `Assunto: Uma tarefa para delegar hoje (${l})\nPré-header: Pequeno passo, grande diferença.\nO corpo da newsletter de teste traz um ponto claro e útil para o leitor. Escolha uma tarefa e delegue ainda hoje.`;
      return `Texto de teste da versão ${l} para o formato ${fmt}, com foco no pedido do cliente e linguagem natural. Converse comigo para dar o próximo passo.`;
    };
    return ls.map(l => `[[VARIANTE${l}]]\n${sample(l)}`).join('\n\n');
  }

  return { route, fake, kinds: KINDS };
}

module.exports = { createMachine, parseVetadas, findVetadas, judgePrompt, judgeText, buildPrompt, parseBlocks, parseReview, blogHtml, KINDS, OBJETIVOS };
