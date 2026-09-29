'use strict';
/* Teste com IA REAL do Estúdio (fase 1). Faz poucas chamadas pagas e gera um relatório para você ler.
   Uso (Windows, dentro da pasta da Máquina):
     set OPENROUTER_API_KEY=sua_chave
     set GEMINI_API_KEY=sua_chave_gemini      (opcional; se existir, o Gemini é usado quando o Jev indica pedido simples)
     node tests\real-ai.js
   Teto de gasto: REAL_AI_MAX_USD (padrão 0.10). O teste para antes de passar do teto.
   REAL_AI_FULL=1 inclui blog, podcast, YouTube, newsletter e comunidade (custa mais).
   A chave só é lida do ambiente do seu computador. Ela nunca é impressa nem gravada no relatório. */
const assert = require('assert'), { spawn } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const DRY = process.env.REAL_AI_DRY === '1'; // ensaio do próprio script com a IA simulada (nenhuma chamada paga)
if (DRY) { process.env.SMC_FAKE_OPENROUTER = '1'; process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'ensaio'; }
if (process.env.SMC_FAKE_OPENROUTER && !DRY) { console.error('Desligue SMC_FAKE_OPENROUTER: este teste usa a IA real.'); process.exit(2); }
if (!process.env.OPENROUTER_API_KEY) { console.error('Defina OPENROUTER_API_KEY. A criação de conteúdo da Máquina usa o Jev, que roda na OpenRouter.'); process.exit(2); }
const PORT = 3397, BASE = `http://127.0.0.1:${PORT}`, DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'smc-real-'));
const MAX = Number(process.env.REAL_AI_MAX_USD || 0.10), FULL = process.env.REAL_AI_FULL === '1';
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const REPORT = path.join(OUT, 'real-ai-' + new Date().toISOString().replace(/[:.]/g, '-') + '.md');
const FORBIDDEN = ['gargalo', 'brutal', 'condutor', 'arquiteto', 'bússola', 'bussola', 'funil', 'ticket', 'jornada'];
let cookie = '', spent = 0; const report = [], results = [];
async function api(url, opt = {}) {
  const h = { 'X-SMC': '1', ...(opt.headers || {}) }; if (cookie) h.Cookie = cookie;
  if (opt.body && typeof opt.body !== 'string') { h['Content-Type'] = 'application/json'; opt.body = JSON.stringify(opt.body); }
  const r = await fetch(BASE + url, { ...opt, headers: h, redirect: 'manual' }); const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  let d = {}; try { d = await r.json(); } catch {} return { status: r.status, d };
}
const words = t => t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
function overlap(a, b, n = 6) { const A = words(a), B = words(b), S = new Set(); for (let i = 0; i + n <= B.length; i++) S.add(B.slice(i, i + n).join(' ')); for (let i = 0; i + n <= A.length; i++) if (S.has(A.slice(i, i + n).join(' '))) return true; return false; }
const meta = it => `Validador: ${it.quality && it.quality.status === 'atencao' ? 'PEDIU ATENÇÃO (' + (it.quality.issues || []).join(', ') + ' · notas ' + JSON.stringify((it.quality.jev || {}).checks || {}) + ')' : 'aprovado'}. Palavras vetadas reescritas: ${(it.machine.reescritaVetadas || []).join(', ') || 'nenhuma'}. Ainda vetadas: ${(it.machine.vetadasRestantes || []).join(', ') || 'nenhuma'}.`;
function textChecks(t) {
  const c = [];
  // hashtag no início da linha (#lideranca) é legítima; só cabeçalho Markdown real (# Título), negrito e crase contam
  c.push(['sem Markdown cru', !/\*\*|`|^\s{0,3}#{1,6}\s/m.test(t)]);
  c.push(['sem palavras vetadas da marca', !FORBIDDEN.some(w => t.toLowerCase().includes(w))]);
  c.push(['sem dica de abordagem vazada', !/\(Versão [A-C]/.test(t)]);
  c.push(['sem "como IA"', !/como (uma )?ia\b|modelo de linguagem/i.test(t)]);
  return c;
}
const T0 = Date.now(), STEP_MS = Number(process.env.REAL_AI_STEP_TIMEOUT_MS || 360000);
const say = m => console.log(`[${Math.round((Date.now() - T0) / 1000)}s] ${m}`);
async function step(name, fn) {
  say('Iniciando: ' + name + ' (pode levar 1 a 3 minutos; se aparecer "ainda aguardando", está funcionando)');
  const beat = setInterval(() => say('  ainda aguardando a IA…'), 20000);
  try { return await stepInner(name, () => Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error(`tempo esgotado: a etapa passou de ${Math.round(STEP_MS / 1000)} segundos`)), STEP_MS))])); }
  finally { clearInterval(beat); say('Fim: ' + name + ' → ' + (results.at(-1) || [])[1]); }
}
async function stepInner(name, fn) {
  if (spent >= MAX) { results.push([name, 'PULADO', `teto de US$ ${MAX} atingido (gasto US$ ${spent.toFixed(4)})`]); report.push(`## ${name}\nPulado: teto de gasto atingido.\n`); return; }
  try { const notes = await fn(); results.push([name, 'OK', notes || '']); }
  catch (e) { results.push([name, 'FALHOU', e.message]); report.push(`## ${name}\n**Falhou:** ${e.message}\n`); }
}
function record(name, r, extra = '') {
  spent += Number(r.d.costUsd || 0);
  report.push(`## ${name}\nCusto desta etapa: US$ ${Number(r.d.costUsd || 0).toFixed(5)} · acumulado: US$ ${spent.toFixed(5)}\n${extra}`);
}
(async () => {
  const srv = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(PORT), SMC_DATA_DIR: DATA, BASE_URL: BASE, SMC_DEBUG: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', x => log += x); srv.stderr.on('data', x => log += x);
  try {
    for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/api/me')).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
    let r = await api('/api/setup', { method: 'POST', body: { password: 'senha-teste-123' } }); assert.ok(r.status < 300, 'setup');
    r = await api('/api/login', { method: 'POST', body: { password: 'senha-teste-123' } }); assert.ok(r.status < 300, 'login');
    r = await api('/api/clients', { method: 'POST', body: { name: 'Núcleo de Líderes (teste)', plan: 'equilibrado' } }); const cid = r.d.id;
    await api('/api/clients/' + cid, { method: 'PUT', body: { context: {
      publicoAtual: 'Empresários excessivamente envolvidos na operação e nas decisões do dia a dia; líderes recém-promovidos sem repertório de liderança.',
      oferta: 'Mentoria de liderança para empresários e líderes, conduzida por Edson Lima, com diagnóstico, alinhamento e expansão.',
      problema: 'Tudo depende do dono. Se ele para, a empresa para.',
      posicionamento: 'Sua empresa nunca será maior do que a capacidade de quem a lidera. Diagnóstico antes da solução.',
      tom: 'Direto, humano e conversacional. Firme sem humilhar. Português do Brasil, tratando o leitor por você.',
      diferenciais: 'Começa pela pessoa e pela realidade; método próprio; sem promessa de resultado.',
      restricoes: 'Nunca prometer resultado financeiro. Nunca inventar números, casos ou depoimentos. Nunca citar preço. Não usar as palavras gargalo, brutal, condutor, arquiteto, bússola, funil, ticket, jornada.',
      cta: 'Convidar para uma conversa de diagnóstico.'
    } } });
    const baseCreate = { clientId: cid, tema: 'por que o dono da empresa não consegue tirar férias' };

    let linkedin = null;
    await step('1. LinkedIn, 2 versões, com revisão factual', async () => {
      r = await api('/api/machine/create', { method: 'POST', body: { ...baseCreate, kind: 'linkedin', variantes: 2, objetivo: 'diagnostico', factual: true } });
      assert.equal(r.status, 200, JSON.stringify(r.d)); const its = r.d.items; assert.equal(its.length, 2, 'esperava 2 versões');
      linkedin = its[0];
      const checks = its.flatMap((it, i) => textChecks(it.text).map(([n, ok]) => [`versão ${it.machine.variant}: ${n}`, ok]));
      checks.push(['versões diferentes entre si', !overlap(its[0].text, its[1].text, 8)]);
      checks.push(['tamanho do LinkedIn entre 300 e 1500 caracteres', its.every(x => x.text.length >= 300 && x.text.length <= 1500)]);
      checks.push(['revisão factual devolvida no formato esperado', its.every(x => x.factCheck && x.factCheck.status !== 'indeterminado')]);
      record('1. LinkedIn, 2 versões, com revisão factual', r, its.map(it => `### Versão ${it.machine.variant} (${it.text.length} caracteres)\n\n${it.text}\n\n${meta(it)}\nRevisão factual: ${it.factCheck ? it.factCheck.status + ' ' + JSON.stringify(it.factCheck.alerts) : 'não feita'}\n`).join('\n') + '\nChecagens:\n' + checks.map(([n, ok]) => `- ${ok ? 'OK' : 'FALHOU'}: ${n}`).join('\n') + '\n' + (r.d.warnings || []).map(w => `Aviso: ${w}`).join('\n') + '\n');
      const bad = checks.filter(([, ok]) => !ok).map(([n]) => n); if (bad.length) throw new Error('checagens que falharam: ' + bad.join('; '));
      return `${its.length} versões, ${its.map(x => x.text.length).join('/')} caracteres`;
    });

    await step('2. A revisão factual pega um número inventado?', async () => {
      assert.ok(linkedin, 'depende da etapa 1');
      const planted = linkedin.text + '\n\nSegundo uma pesquisa da Universidade de Harvard de 2024, 73% dos empresários brasileiros não tiram férias há mais de dois anos.';
      let u = await api('/api/contents/' + linkedin.id, { method: 'PUT', body: { text: planted } }); assert.equal(u.status, 200);
      r = await api('/api/machine/review', { method: 'POST', body: { contentId: linkedin.id } }); assert.equal(r.status, 200, JSON.stringify(r.d));
      const f = r.d.factCheck, hit = f.alerts.some(a => /73|harvard|pesquisa/i.test(a.trecho + ' ' + a.motivo));
      report.push(`## 2. A revisão factual pega um número inventado?\nNúmero plantado: "73%" e "Harvard 2024". Resultado: status ${f.status}, ${f.alerts.length} alerta(s).\n${f.alerts.map(a => `- "${a.trecho}" | ${a.motivo} | ${a.sugestao}`).join('\n')}\n`);
      assert.equal(f.status, 'atencao', 'deveria marcar atenção'); assert.ok(hit, 'nenhum alerta citou o número inventado');
      return 'apontou o número inventado';
    });

    await step('3. X, thread de 5 posts', async () => {
      r = await api('/api/machine/create', { method: 'POST', body: { ...baseCreate, kind: 'x', subformato: 'thread', factual: false } });
      assert.equal(r.status, 200, JSON.stringify(r.d)); const t = r.d.items[0].text;
      const posts = t.split(/\n(?=\s*\d\/5)/).filter(x => /^\s*\d\/5/.test(x));
      const checks = [...textChecks(t), ['5 posts numerados', posts.length === 5], ['cada post com até 280 caracteres', posts.every(p => p.length <= 280)]];
      record('3. X, thread de 5 posts', r, `${t}\n\n${meta(r.d.items[0])}\nChecagens:\n` + checks.map(([n, ok]) => `- ${ok ? 'OK' : 'FALHOU'}: ${n}`).join('\n') + '\n');
      const bad = checks.filter(([, ok]) => !ok).map(([n]) => n); if (bad.length) throw new Error('checagens que falharam: ' + bad.join('; '));
      return `${posts.length} posts`;
    });

    await step('4. Vídeo curto com anti-slop (não copia a referência)', async () => {
      const ref = 'Você sabe por que a sua empresa trava toda vez que você viaja? Porque tudo passa pela sua cabeça. Primeiro, anote tudo que só você sabe fazer. Depois, escolha uma tarefa e ensine alguém. No fim da semana, veja o que mudou.';
      r = await api('/api/machine/create', { method: 'POST', body: { ...baseCreate, kind: 'video_curto', estrutura: ref, factual: false } });
      assert.equal(r.status, 200, JSON.stringify(r.d)); const t = r.d.items[0].text;
      const checks = [...textChecks(t), ['tem Gancho', /gancho/i.test(t)], ['tem Legenda', /legenda:/i.test(t)], ['não copia 6 palavras seguidas da referência', !overlap(t, ref, 6)]];
      record('4. Vídeo curto com anti-slop', r, `${t}\n\n${meta(r.d.items[0])}\nChecagens:\n` + checks.map(([n, ok]) => `- ${ok ? 'OK' : 'FALHOU'}: ${n}`).join('\n') + '\n');
      const bad = checks.filter(([, ok]) => !ok).map(([n]) => n); if (bad.length) throw new Error('checagens que falharam: ' + bad.join('; '));
      return 'estrutura aproveitada sem cópia';
    });

    if (FULL) for (const [k, label, extra] of [['newsletter', 'Newsletter', {}], ['blog', 'Blog', {}], ['podcast', 'Podcast', {}], ['comunidade', 'Comunidade', { contexto: 'Ana: nunca consigo delegar, ninguém entrega do meu jeito.\nRui: minha equipe pergunta tudo pra mim.\nLia: tenho medo de largar e dar errado.' }], ['youtube', 'YouTube', {}]]) {
      await step('5. ' + label, async () => {
        r = await api('/api/machine/create', { method: 'POST', body: { ...baseCreate, kind: k, factual: false, ...extra } });
        assert.equal(r.status, 200, JSON.stringify(r.d)); const t = r.d.items[0].text; const checks = textChecks(t);
        record('5. ' + label, r, `${t}\n\nChecagens:\n` + checks.map(([n, ok]) => `- ${ok ? 'OK' : 'FALHOU'}: ${n}`).join('\n') + '\n');
        const bad = checks.filter(([, ok]) => !ok).map(([n]) => n); if (bad.length) throw new Error('checagens que falharam: ' + bad.join('; '));
        return `${t.length} caracteres`;
      });
    }
  } catch (e) { results.push(['preparação', 'FALHOU', e.message]); console.error(log.slice(-800).replace(/(sk-[A-Za-z0-9_-]{6})[A-Za-z0-9_-]+/g, '$1…')); }
  finally { srv.kill(); }
  const head = `# Relatório do teste com IA real${DRY ? ' (ENSAIO SIMULADO: falhas de checagem são esperadas, o texto é de teste)' : ''}\n\nData: ${new Date().toLocaleString('pt-BR')}\nGasto total medido: **US$ ${spent.toFixed(5)}** (teto US$ ${MAX})\n\n| Etapa | Resultado | Notas |\n|---|---|---|\n${results.map(x => `| ${x[0]} | ${x[1]} | ${String(x[2]).replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 200)} |`).join('\n')}\n\nLeia os textos abaixo com os seus olhos: as checagens automáticas não julgam qualidade, tom nem voz da marca.\n\n`;
  fs.writeFileSync(REPORT, head + report.join('\n'));
  console.log(head.replace(/^# .*\n\n/, ''));
  console.log('Relatório completo com os textos:', REPORT);
  process.exitCode = results.some(x => x[1] === 'FALHOU') ? 1 : 0;
})();
