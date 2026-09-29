'use strict';
// Fase 1 do Estúdio: formatos estruturados, variantes, revisão factual e integração com o fluxo de aprovação.
// Usa o modo de teste da aplicação (SMC_FAKE_OPENROUTER=1): nenhuma chamada paga é feita.
const assert = require('assert'), { spawn } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const PORT = 3393, BASE = `http://127.0.0.1:${PORT}`, DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'smc-m-'));
let cookie = '';
async function api(url, opt = {}) {
  const h = { 'X-SMC': '1', ...(opt.headers || {}) };
  if (cookie) h.Cookie = cookie;
  if (opt.body && typeof opt.body !== 'string') { h['Content-Type'] = 'application/json'; opt.body = JSON.stringify(opt.body); }
  const r = await fetch(BASE + url, { ...opt, headers: h, redirect: 'manual' });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  let d = {}; try { d = await r.json(); } catch {}
  return { status: r.status, d };
}
// ---- unidade: palavras vetadas
(function vetUnit() {
  const { parseVetadas, findVetadas } = require('../lib/machine');
  assert.deepEqual(parseVetadas('Nunca prometer resultado financeiro. Não usar as palavras gargalo, brutal, condutor e arquiteto. Sem preço.'), ['gargalo', 'brutal', 'condutor', 'arquiteto']);
  assert.deepEqual(parseVetadas('Nunca usar: funil, ticket, bússola'), ['funil', 'ticket', 'bússola']);
  assert.deepEqual(parseVetadas('Não usar Markdown. Nunca inventar números.'), [], 'não confunde instruções comuns com palavras vetadas');
  assert.deepEqual(parseVetadas('Palavras vetadas: jornada; mapa'), ['jornada', 'mapa']);
  assert.deepEqual(findVetadas('O gargalo e os Gargalos, mas arquitetura não.', ['gargalo', 'arquiteto']), ['gargalo']);
  assert.deepEqual(findVetadas('Uma solução brutalmente simples', ['brutal']), ['brutal'], 'aceita derivação com -mente');
  assert.deepEqual(findVetadas('gargalos', ['gargalo']), ['gargalo'], 'plural');
  assert.deepEqual(findVetadas('sem problema algum', ['gargalo']), []);
})();

// ---- unidade: o que o validador enxerga não pode ter marcadores técnicos
(function judgeUnit() {
  const { judgePrompt, judgeText, KINDS } = require('../lib/machine');
  const f = { tema: 'delegar sem perder o controle', contexto: '', angulo: '', tomExtra: '', objetivo: 'autoridade', variantes: 3, subformato: 'thread' };
  const jp = judgePrompt(KINDS.linkedin, f);
  assert.ok(!/\[\[|ESTÚDIO|FORMATO DE SAÍDA/.test(jp), 'pedido do validador sem instruções internas');
  assert.match(jp, /3 versões alternativas/);
  const raw = '[[VARIANTEA]]\n(Versão A. Abordagem direta)\nTexto A completo aqui.\n\n[[VARIANTEB]]\nTexto B completo aqui.\n\n[[VARIANTEC]]\nTexto C completo aqui.';
  const jt = judgeText(raw, 3);
  assert.ok(!/\[\[|\(Versão/.test(jt), 'rascunho do validador sem marcadores'); assert.match(jt, /VERSÃO 1\nTexto A[\s\S]*---[\s\S]*VERSÃO 3\nTexto C/);
  assert.equal(judgeText('[[VARIANTEA]]\nSó uma versão.', 1), 'Só uma versão.');
  assert.equal(judgeText('Texto sem marcador [[X]]', 1), 'Texto sem marcador');
})();

(async () => {
  const srv = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(PORT), SMC_DATA_DIR: DATA, SMC_FAKE_OPENROUTER: '1', BASE_URL: BASE }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', x => log += x); srv.stderr.on('data', x => log += x);
  try {
    for (let i = 0; i < 50; i++) { try { const r = await fetch(BASE + '/api/me'); if (r.ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
    let r = await api('/api/setup', { method: 'POST', body: { password: 'senha-teste-123' } }); assert.ok(r.status < 300, 'setup');
    r = await api('/api/login', { method: 'POST', body: { password: 'senha-teste-123' } }); assert.ok(r.status < 300, 'login');
    r = await api('/api/clients', { method: 'POST', body: { name: 'Empresa Teste', plan: 'equilibrado' } }); assert.equal(r.status, 200); const cid = r.d.id;

    // 1. lista de formatos
    r = await api('/api/machine/formats'); assert.equal(r.status, 200);
    const ids = r.d.formats.map(x => x.id);
    for (const k of ['video_curto', 'carrossel', 'linkedin', 'instagram', 'x', 'newsletter', 'blog', 'podcast', 'youtube', 'comunidade']) assert.ok(ids.includes(k), 'formato ' + k);
    assert.equal(r.d.formats.find(x => x.id === 'x').subformats.length, 5, 'X tem 5 subformatos');
    assert.ok(r.d.formats.find(x => x.id === 'video_curto').guide && r.d.formats.find(x => x.id === 'youtube').guide);
    assert.ok(!r.d.formats.find(x => x.id === 'blog').guide);

    // 2. validações
    r = await api('/api/machine/create', { method: 'POST', body: { clientId: cid, kind: 'inexistente', tema: 'liderança sem centralização' } }); assert.equal(r.status, 400);
    r = await api('/api/machine/create', { method: 'POST', body: { clientId: cid, kind: 'x', tema: 'oi' } }); assert.equal(r.status, 400);
    r = await api('/api/machine/create', { method: 'POST', body: { clientId: 'nao', kind: 'x', tema: 'liderança sem centralização' } }); assert.equal(r.status, 404);

    // 2b. resposta vazia do modelo: a Máquina tenta de novo sem o raciocínio interno e entrega o texto
    r = await api('/api/machine/create', { method: 'POST', body: { clientId: cid, kind: 'linkedin', tema: 'assunto FORCAR_VAZIO da empresa hoje', factual: false } });
    assert.equal(r.status, 200, 'retry após resposta vazia: ' + JSON.stringify(r.d)); assert.ok(r.d.items[0].text.length > 20);
    r = await api('/api/costs?clientId=' + cid); assert.equal(r.status, 200); assert.ok(r.d.byKind.unknown > 0, 'a tentativa vazia foi registrada como custo de falha');
    r = await api('/api/state?clientId=' + cid); assert.equal(r.d.audit.filter(a => a.type === 'chat_empty').length, 1, 'resposta vazia registrada na auditoria');

    // 2c. validador reprova e a escalada paga não está autorizada: entrega rascunho sinalizado, não perde o texto
    r = await api('/api/machine/create', { method: 'POST', body: { clientId: cid, kind: 'linkedin', tema: 'assunto FORCAR_REPROVA da empresa hoje', factual: false } });
    assert.equal(r.status, 200, 'rascunho sinalizado: ' + JSON.stringify(r.d)); assert.equal(r.d.items[0].quality.status, 'atencao');
    assert.ok(r.d.items[0].quality.issues.includes('aderência ao briefing')); assert.ok(r.d.warnings.some(w => /validador automático apontou/.test(w)));
    assert.equal(r.d.items[0].status, 'Rascunho');

    // 2d. palavras vetadas: conferidas no código e reescritas só onde aparecem
    r = await api('/api/machine/create', { method: 'POST', body: { clientId: cid, kind: 'linkedin', tema: 'delegar sem perder o controle da empresa', vetadas: 'converse, Nada Existe', variantes: 2, factual: false } });
    assert.equal(r.status, 200, JSON.stringify(r.d));
    for (const it of r.d.items) { assert.ok(!/converse/i.test(it.text), 'palavra vetada removida: ' + it.text); assert.match(it.text, /reescrito/); assert.deepEqual(it.machine.reescritaVetadas, ['converse']); }
    assert.ok(!r.d.warnings.some(w => /ainda contém/.test(w)));
    // restrição cadastrada na empresa também vale
    await api('/api/clients/' + cid, { method: 'PUT', body: { context: { restricoes: 'Nunca prometer resultado. Não usar as palavras converse, comigo.' } } });
    r = await api('/api/machine/create', { method: 'POST', body: { clientId: cid, kind: 'x', tema: 'delegar sem perder o controle da empresa', factual: false } });
    assert.equal(r.status, 200); assert.ok(!/converse|comigo/i.test(r.d.items[0].text), 'restrição da empresa aplicada'); assert.match(r.d.items[0].text, /reescrito/);
    await api('/api/clients/' + cid, { method: 'PUT', body: { context: { restricoes: '' } } });

    // 3. todos os formatos geram e salvam
    for (const k of ids) {
      r = await api('/api/machine/create', { method: 'POST', body: { clientId: cid, kind: k, tema: 'por que o dono da empresa não consegue tirar férias', factual: false } });
      assert.equal(r.status, 200, k + ' ' + JSON.stringify(r.d)); assert.equal(r.d.items.length, 1, k); assert.equal(r.d.items[0].status, 'Rascunho');
      assert.equal(r.d.items[0].machine.format, k); assert.ok(r.d.items[0].files.docx && r.d.items[0].files.pdf, k + ' docx/pdf');
    }

    // 4. três variantes diferentes, com revisão factual
    r = await api('/api/machine/create', { method: 'POST', body: { clientId: cid, kind: 'linkedin', tema: 'delegar sem perder o controle da empresa', variantes: 3, objetivo: 'diagnostico', angulo: 'visão de quem vende B2B', tomExtra: 'mais provocador', factual: true } });
    assert.equal(r.status, 200, JSON.stringify(r.d)); assert.equal(r.d.items.length, 3);
    const [a, b, c3] = r.d.items;
    assert.deepEqual(r.d.items.map(x => x.machine.variant), ['A', 'B', 'C']);
    assert.equal(new Set(r.d.items.map(x => x.text)).size, 3, 'variantes diferentes');
    assert.equal(a.groupId, b.groupId); assert.equal(b.groupId, c3.groupId);
    assert.ok(!/\(Versão/.test(a.text), 'dica de abordagem não vaza para o texto');
    r = await api('/api/state?clientId=' + cid);
    const saved = r.d.contents.filter(x => x.groupId === a.groupId);
    assert.equal(saved.length, 3, 'salvo no estado');
    const fa = saved.find(x => x.id === a.id).factCheck, fb = saved.find(x => x.id === b.id).factCheck;
    assert.equal(fa.status, 'atencao'); assert.equal(fa.alerts.length, 1); assert.match(fa.alerts[0].motivo, /sem fonte/); assert.equal(fa.basedOn, 'sem_material');
    assert.equal(fb.status, 'confere'); assert.equal(fb.alerts.length, 0);

    // 5. subformato do X e material de apoio
    r = await api('/api/machine/create', { method: 'POST', body: { clientId: cid, kind: 'x', subformato: 'pergunta', tema: 'quando delegar vira abandono', contexto: 'Material: delegar exige critério de entrega combinado antes.', factual: true } });
    assert.equal(r.status, 200); assert.equal(r.d.items[0].machine.subformato, 'pergunta'); assert.equal(r.d.items[0].machine.comMaterial, true);
    assert.equal(r.d.items[0].factCheck.basedOn, 'material');

    // 6. blog gera HTML com subtítulos
    r = await api('/api/machine/create', { method: 'POST', body: { clientId: cid, kind: 'blog', tema: 'como delegar sem perder o controle', factual: false } });
    assert.equal(r.status, 200); const blog = r.d.items[0]; assert.ok(blog.files.html);
    const hz = await fetch(BASE + blog.files.html, { headers: { Cookie: cookie } }); const html = await hz.text();
    assert.match(html, /<h2>O problema de fazer tudo<\/h2>/); assert.match(html, /<title>Delegar sem perder o controle/); assert.match(html, /name="description"/);

    // 7. revisão factual sob demanda e material de apoio
    r = await api('/api/machine/review', { method: 'POST', body: { contentId: blog.id, contexto: 'Material de referência.' } });
    assert.equal(r.status, 200); assert.ok(r.d.factCheck && r.d.factCheck.basedOn === 'material');
    r = await api('/api/machine/review', { method: 'POST', body: { contentId: 'nao_existe' } }); assert.equal(r.status, 404);

    // 8. integra com o fluxo de aprovação, pacote e link da r3
    r = await api('/api/contents/' + a.id, { method: 'PUT', body: { text: 'Texto editado pelo cliente, ainda em rascunho, pronto para revisão.' } }); assert.equal(r.status, 200);
    r = await api('/api/contents/' + a.id, { method: 'PUT', body: { status: 'Aprovado' } }); assert.equal(r.d.status, 'Aprovado');
    r = await api('/api/contents/' + a.id + '/package', { method: 'POST' }); assert.equal(r.status, 200);
    r = await api('/api/contents/' + b.id + '/track', { method: 'POST', body: { action: 'redirect', target: 'https://example.com/mentoria' } }); assert.equal(r.status, 200);

    // 9. créditos: blog pesa 3, x pesa 2, revisão pesa 1
    r = await api('/api/state?clientId=' + cid);
    const use = r.d.usage.filter(u => u.clientId === cid);
    assert.equal(use.find(u => u.kind === 'blog').credits, 3, 'peso do blog'); assert.equal(use.find(u => u.kind === 'youtube').credits, 5, 'peso do YouTube');
    assert.equal(use.find(u => u.kind === 'x').credits, 2, 'peso do X'); assert.ok(use.some(u => u.kind === 'review' && u.credits === 1), 'revisão cobrada');

    // 10. nada foi publicado
    assert.ok(!r.d.contents.some(x => ['Agendado', 'Publicado'].includes(x.status)), 'nenhum conteúdo publicado');
    console.log('MACHINE OK');
  } catch (e) { console.error('FALHOU:', e.message); console.error(log.slice(-1800)); process.exitCode = 1; } finally { srv.kill(); }
})();
