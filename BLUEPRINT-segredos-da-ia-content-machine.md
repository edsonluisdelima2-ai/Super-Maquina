# Blueprint — SEGREDOS DA IA · CONTENT MACHINE

Fonte: https://claude.ai/public/artifacts/08786f10-cc4f-4bfa-b4fa-df8a4efc68d5
Base: prints das abas HOME, CRIAR e COACH (enviados pelo Edson) + captura da página pública.

Legenda: **[V]** visto nos prints · **[I]** inferido (confirmar com código/prints) · **[?]** desconhecido.

## 0. Cobertura
| Aba | Status |
|---|---|
| HOME | [V] completa |
| CRIAR | [V] completa |
| COACH | [V] aba "Analisar"; aba "Histórico" [?] |
| GUIAS | [V] sub-aba "Capa" completa; sub-aba "Criar Ebook" [?] |
| EDIÇÃO | [V] estado vazio; tela com guia gerado [?] |
| HISTÓRICO | [V] estado vazio (layout completo); card de conteúdo [?] |
| CALENDÁRIO | [V] grade mensal vazia + legenda; card de item [?] |
| BACKUP | [V] completa |
| APIS | [V] parcial: seções Vídeo·Voz, Publicação, Infra·Dados; seções acima e "Capacidades" cortadas [?] |
| DASHBOARD | [I] só pelo nome. Falta print |

Pista técnica [V]: o título da aba do navegador é **`maquina-virais-ib.jsx`** → o artefato é **um único arquivo React (JSX)**. O código-fonte (prompts, chamadas de IA) não é acessível pela página pública; lógica interna é [I].

## 1. Identidade [V]
- Nome: **SEGREDOS DA IA · CONTENT MACHINE**.
- Tema escuro: fundo preto com grade sutil, destaque verde-limão `#b8ff1a`. Títulos em fonte condensada caixa alta (estilo Bebas), corpo/rótulos em monoespaçada.
- Padrão de título: palavra branca + palavra verde ("CENTRO DE **COMANDO**", "CRIAR **CONTEÚDO**", "COACH **CONTENT**").
- Cabeçalho: logo (ícone lupa) + nome, **sino de notificações** à direita (badge com contagem, ex.: "1"), menu de 10 abas com ícone; aba ativa = botão verde preenchido.
- Idioma: PT-BR. Público: uso pessoal do criador (single-user).

## 2. Navegação [V]
HOME · CRIAR · COACH · GUIAS · EDIÇÃO · HISTÓRICO · CALENDÁRIO · DASHBOARD · BACKUP · APIS
Fluxo lógico: **Criar/Coach → Edição → Calendário → Histórico/Dashboard**, com Backup e APIs como infraestrutura.

## 3. HOME — "Centro de Comando" [V]
- Resumo: `N conteúdos ativos · N agendados · N publicados`.
- **Próximas publicações**: lista de agendados; vazio = "Nada agendado. Agendar no calendário"; link "ver calendário completo →".
- **Precisa de ação**: pendências; vazio = "Tudo em ordem por aqui." (ícone de check).
- **Criação rápida**: atalhos Vídeo Curto, Carrossel, Podcast, News, Comunidade + botão destacado "+ VER TODOS" (leva à aba CRIAR).

## 4. CRIAR — "Criar Conteúdo" [V]
Subtítulo: "Sistema gera 3 variantes anti-padrão e salva tudo automaticamente."
> Observação: o seletor VARIANTES abre em "1 variante (recomendado)" — o texto fala em 3. Decidir o padrão real.

### 4.1 Formato principal (11 cards, seleção única; padrão = Vídeo Curto)
| Formato | Descrição no card |
|---|---|
| Vídeo Curto | Reels / TikTok / Shorts |
| Vídeo Repost | Capa overlay sem roteiro |
| News Diário | Carrossel de notícias RSS |
| YouTube | Vídeo longo 10–15 min |
| Carrossel | IG / LinkedIn slides |
| LinkedIn | Texto + imagem |
| X / Twitter | "Phoenix 2026" · 5 sub-formatos |
| Blog | Artigo SEO + HTML |
| Podcast | Script narrado 3–7 min · novidades IA |
| Comunidade | Analisa chats + enquetes · gera nutrição |
| Guias | Ebooks / PDFs · módulo dedicado |

Nota na tela: **YouTube e Blog são gerados separadamente do "Pacote Full"** (mais densos, exigem atenção dedicada) → existe um modo Pacote Full que gera vários formatos de uma vez.

### 4.2 Formulário
| Campo | Tipo | Regra |
|---|---|---|
| TEMA * | texto | obrigatório. Ex.: "Anthropic lançou Claude Managed Agents" |
| CONTEXTO | textarea | notícia/paper/release colado; **se vazio, o sistema busca online** |
| ASSETS / LINKS DE VÍDEO | textarea (opcional) | um link por linha (YouTube, entrevistas, clips); ficam salvos para baixar e cortar na edição |
| ÂNGULO | texto (opcional) | ex.: "Visão de quem vende B2B" |
| OBJETIVO | select | padrão "Viralização máxima" (demais opções [?]) |
| VARIANTES | select | padrão "1 variante (recomendado)" (outras [?], provavelmente 2–3) |
| TOM EXTRA | texto | ex.: "Mais provocador" |
| REMODELAGEM ANTI-SLOP | textarea + botão **ABRIR WHISPER** | cola transcrição de vídeo viral; "sistema estuda estrutura sem copiar". Whisper = atalho/ferramenta externa de transcrição |
| ☐ GERAR GUIA DE EDIÇÃO | checkbox | cortes, sons, legendas e biblioteca de Final Cut amarrados às falas. Desligado = só roteiro, mais rápido. O guia aparece na aba EDIÇÃO |
| ☐ REVISÃO FACTUAL | checkbox | 2ª passada que confere fatos. Com material colado → compara contra ele; sem material → detecta nomes/números possivelmente inventados e generaliza. Recomendado sempre que o tema for factual (empresas, produtos, notícias) |
| **GERAR E SALVAR** | botão primário | dispara geração e grava no Histórico |

### 4.3 Pipeline de geração [I]
1. Validar TEMA. 2. Se CONTEXTO vazio → pesquisa web/RSS. 3. Se houver ANTI-SLOP → extrair estrutura (ritmo, gancho, arco) sem copiar texto. 4. Gerar N variantes anti-padrão conforme formato + objetivo + ângulo + tom. 5. Se REVISÃO FACTUAL → 2º prompt de checagem. 6. Se GUIA DE EDIÇÃO → 3º prompt (marcações de corte/som/legenda, biblioteca Final Cut). 7. Salvar tudo (auto), atualizar contadores da Home, notificar (sino).

## 5. COACH — "Coach Content" [V]
Descrição: cola conteúdo bruto (ideia, rascunho, transcrição, print) + links das fontes; "o estrategista sênior acessa as fontes, confirma os dados e devolve direção tática pronta pra executar."
- Sub-abas: **ANALISAR** | **HISTÓRICO** (das análises).
- Campo CONTEÚDO BRUTO (textarea, contador de palavras, placeholder com exemplo de vídeo sobre agente de IA no WhatsApp), botão **ANALISAR CONTEÚDO**.
- Saída [I]: diagnóstico + direção tática (ajustes de gancho, ângulo, dados verificados a partir dos links, próximos passos), salva no Histórico do Coach. Possivelmente com botão "enviar para CRIAR".

## 6. GUIAS [V]
Barra secundária própria: marcador verde "SEGREDOS DA IA" + sub-abas **CAPA** | **CRIAR EBOOK** (esta última [?]).
Fluxo: gerar capa (aqui) → gerar a arte fora, no **ChatGPT Image 2.0**, com o JSON → anexar a capa pronta em Criar Ebook.

### 6.1 Sub-aba CAPA — "Capa de Ebook. 3 variações."
Descrição: o usuário descreve o tema; a IA define eyebrow, título, palavra destaque, selo de ferramenta e modo visual (capa retrato, neon lime); o usuário ajusta, copia o JSON da variação escolhida e gera a arte no ChatGPT com a foto. Formato **1080x1440 (3:4)**.
- **Briefing da capa** (textarea: tema, mensagem-chave, quem/o que aparece na foto) + botão **"Definir capa com IA"** (preenche os campos abaixo).
- **Definições da capa (editáveis):**
  | Campo | Exemplo |
  |---|---|
  | Eyebrow (lime, acima do título) | GUIA PRÁTICO |
  | Título principal (caixa alta) | GUIA SCRAPING AI DESIGN |
  | Palavra destaque (neon lime no título) | AI |
  | Selo de ferramenta (pill com engrenagem) | USANDO CHATGPT IMAGE 2.0 |
  | Destaque/linha do selo (1ª ferramenta) | CHATGPT IMAGE 2.0 |
  | **Modo visual do retrato** (4 botões) | CUTOUT · CENA · MOCKUP · RENDER |
- **Fixos da marca:** "© 2026" e "@igorbrasil" no topo; linha "COMUNIDADE SEGREDOS DA IA" no rodapé; a capa **sempre usa imagem — ABSTRATO não é permitido**.
- **Seletor de variação** com preview ao vivo: **A · Limpa** (leve) · **B · Interface** (médio) · **C · HUD Técnico** (denso). O preview mostra título, selo, rodapé; "preview aproximado — o JSON é a referência final para o gerador de imagem".
- **Prompts JSON prontos:** 3 caixas (A/B/C) cada uma com botão **copiar**. Estrutura do JSON [V]:
  `formato: "capa_ebook_editorial"`, `dimensao: "1080x1440"`, `proporcao: "3:4"`, `USAR_IMAGEM_ANEXADA: true`, `tratamento_imagem` (retrato protagonista full bleed, cores naturais 100% preservadas, brilho neon lime sutil em UM detalhe focal, fundo preto com vinheta, sem duotone/filtro/overlay na pele), `paleta {bg #000000, destaque #b8ff1a, texto #FFFFFF, apoio #9a9a9a}`, `tipografia {titulo Bebas Neue, corpo Inter Tight, rotulo JetBrains Mono}`, `estilo_referencia`, `modo_visual`, `densidade_visual (LEVE/MEDIO/DENSO)`, `overlay_interface (true na B)`, `textos {copyright, handle, eyebrow, titulo_principal, palavra_destaque, selo_ferramenta, selo_destaque, comunidade, comunidade_destaque}`, `instrucao_final` (texto em inglês: usar imagem anexada como retrato, full bleed, mockup translúcido de chat à esquerda na B, cantos/rodapé etc.).
  Observação: quando os campos ainda não foram definidos, `titulo_principal` e `palavra_destaque` saem vazios ("") no JSON e o preview mostra "SEU TITULO AQUI".
- Botão final **"JSON pronto. Ir para Criar Ebook"** + dica "Gere a arte no ChatGPT com o JSON, depois anexe a capa na aba Criar Ebook".
- Sub-aba **CRIAR EBOOK** [I]: recebe tema + capa anexada, gera o ebook/PDF (estrutura, capítulos, diagramação).

## 7. EDIÇÃO — "Edição de Vídeo" [V]
Descrição: "O guia de edição dos seus vídeos, focado pra você usar no Final Cut. N vídeos com guia."
- Estado vazio: ícone de câmera, "Nenhum vídeo com guia de edição ainda. Pra gerar o guia, vá em CRIAR, escolha vídeo curto ou youtube, e ligue a opção GERAR GUIA DE EDIÇÃO antes de gerar." + botão **CRIAR VÍDEO** (leva a CRIAR).
- Regra: guia só existe para **Vídeo Curto** e **YouTube**.
- Com dados [I]: lista de vídeos com guia; cada um abre cortes, sons, legendas, biblioteca Final Cut amarrada às falas, assets/links salvos.

## 8. HISTÓRICO [V]
Layout de duas colunas.
- **Barra lateral "listas"** (com contador por item): TODOS · VÍDEOS CURTOS · YOUTUBE · CARROSSÉIS · LINKEDIN · X / TWITTER · BLOG · PODCAST · COMUNIDADE + **"+ NOVA LISTA"** (listas personalizadas).
- **Status** (filtro): **ATIVOS** (padrão) · RASCUNHOS · POSTADOS · ARQUIVADOS.
- Área principal: título da lista, "N resultados · status: ativos", botão **+ NOVO CONTEÚDO**; vazio = "Nenhum conteúdo aqui ainda." + **CRIAR PRIMEIRO**.
- Observações: não há lista para Vídeo Repost, News Diário nem Guias (podem cair em outra lista); o status "ativos/postados/arquivados" reforça o ciclo de vida do conteúdo. Card de item, ações (abrir, duplicar, agendar, arquivar, marcar postado) [I].

## 9. CALENDÁRIO — "Calendário Editorial" [V]
- Navegação de mês (‹ SETEMBRO 2026 ›), grade Dom–Sáb, dia atual destacado (verde, selo "HOJE").
- Filtros: **REDE** (Todas…) e **STATUS** (Todos…). Contador: "N publicação(ões) · N agendadas · N publicadas".
- Legenda: **barra neon à esquerda = publicado · sem barra = agendado · clique no item para ver detalhes e métricas**.
- Itens (chips por dia, com rede/formato) [I]; painel de detalhes com métricas [I]; agendar arrastando ou por botão [?].

## 10. BACKUP — "Backup e Recuperação" [V]
"Garantia de que seu conteúdo nunca se perde. Exporte regularmente."
- **Banner de alerta "STORAGE EM MODO FALLBACK"**: o storage principal do sandbox falhou, o app usa **localStorage** como fallback automático; mostra o último erro (ex.: `get:user:podcast_sources: Storage get failed: Key not found`). Ou seja: persistência primária = `window.storage` do artefato (chaves tipo `user:...`), secundária = localStorage.
- **3 cartões:** EM MEMÓRIA (conteúdos · publicações), LOCAL STORAGE (conteúdos · pubs · tamanho KB), AUTO-BACKUP (nº + data/hora do último snapshot).
- **Exportar backup:** baixa `.json` com TODOS conteúdos, publicações e listas; aviso "Você nunca exportou um backup manualmente. Recomendado fazer agora."; botão **EXPORTAR AGORA**.
- **Importar backup:** botão **ESCOLHER ARQUIVO .JSON**; itens com o mesmo ID são sobrescritos.
- **Auto-backup (local):** snapshot completo a cada **5 min** no localStorage; mostra último snapshot; botão **RESTAURAR AUTO-BACKUP**.
- **Gestão de storage:** limite do storage do artefato não documentado; barra "USO TOTAL: X KB (Y MB)"; botões **VER N CONTEÚDOS** (maiores) e **EXCLUIR TODOS POSTADOS**; alerta de que carrosséis/blogs com imagens pesam e podem travar o carregamento.
- **"Por que fazer backup regular":** (1) storage principal pode falhar (rate limit, erro, quota); (2) trocar navegador/máquina perde tudo; (3) dados vivem em dois lugares mas ambos no SEU navegador; (4) o .json é a única cópia fora do navegador. Recomendado: exportar 1x/semana e guardar no Drive.

## 11. APIS [V parcial]
Catálogo de integrações em cards (nome, descrição, provavelmente campo de chave/toggle [?]), agrupadas por categoria com contador. Vistas:
**VÍDEO · VOZ (5)**
- Runway Gen-4 — image-to-video 9:16 para reposts/B-rolls.
- Kling AI — text-to-video com física realista, bom custo.
- Luma Dream Machine — Ray-2, movimentos de câmera cinematográficos.
- HeyGen Avatar — avatar falando o roteiro do teleprompter (personas).
- ElevenLabs TTS — voz PT-BR natural para vídeos sem aparecer (narração do roteiro).

**PUBLICAÇÃO (7)**
- Meta Graph · IG Carrossel — fluxo atual de carrossel (App PUBLISHER), token de página permanente em `{API_KEY}`.
- LinkedIn Post — publica o texto direto pelo RenderLinkedIn (já existe fluxo no Make).
- X · Tweet — OAuth 2.0 user context; threads via reply chain no N8N.
- TikTok Content API — upload de vídeo via URL; exige app aprovado.
- YouTube Metadata — atualiza título/descrição gerados; o upload em si vai pelo N8N (resumable).
- Telegram Bot sendMessage — canais premium (GateKeeper); token no path.
- WordPress REST Post — o formato BLOG gera `html_completo`; Application Password em base64 `user:pass`.

**INFRA · DADOS (6)**
- Supabase Insert — espelha conteúdos num Postgres real; caminho da migração futura.
- Qdrant Upsert Vetor — memória vetorial dos conteúdos (busca semântica de hooks antigos).
- Apify Run Actor — scraping de redes (Social Stories); token na URL.
- Make.com Webhook — dispara cenários Make (fluxo LinkedIn existente).
- N8N Webhook Genérico — **ponte mestra com o N8N na Hetzner; o N8N executa o que o sandbox bloqueia**.
- Hotmart Vendas — puxa vendas da Segredos da IA para o Dashboard (correlação conteúdo × venda).

Não vistos [?]: categorias acima de "Vídeo · Voz" (provavelmente LLM/texto/imagem/pesquisa) e a seção final **"CAPACIDADES (?)"**.

## 12. DASHBOARD [I]
Produção por formato, publicados × agendados, cadência semanal, e (via Hotmart) correlação conteúdo × venda; métricas vêm das publicações registradas/integrações.

## 13. Modelo de dados [I]
```
Conteudo   { id, formato, tema, contexto, assets[], angulo, objetivo, tomExtra,
             antiSlopRef, flags{guiaEdicao, revisaoFactual},
             variantes[{texto, roteiro, legenda...}], guiaEdicao?, revisao?,
             status(rascunho|ativo|agendado|publicado), dataAgendada, dataPublicada,
             criadoEm, pacoteFullId? }
AnaliseCoach { id, conteudoBruto, links[], resultado, criadoEm }
Notificacao  { id, texto, lida, criadoEm }
Config       { apiKeys{}, biblioteca FinalCut, preferencias }
```
Derivados: ativos, agendados, publicados (Home); "precisa de ação" = regras (agendamento vencido, rascunho parado, API sem chave, backup antigo).

## 14. Arquitetura provável
- Artefato do Claude **[V] em um único arquivo `maquina-virais-ib.jsx` (React)**, SPA com roteamento por abas em estado; sub-abas em Guias e listas/status em Histórico.
- A arte da capa/ebook **não é gerada no app**: o app monta o JSON e o usuário gera a imagem no ChatGPT Image 2.0 [V].
- Persistência **[V]**: `window.storage` do artefato (chaves `user:*`) + localStorage como fallback; auto-backup a cada 5 min; export/import `.json`. Tudo fica no navegador do usuário.
- Geração por LLM (chamada do artefato ao Claude ou chaves em APIS); busca online e leitura de links exigem ferramenta de web/RSS.
- **[V] O sandbox do artefato bloqueia chamadas externas**; por isso o app foi desenhado para falar com um **N8N próprio (Hetzner)** via webhook, que executa publicação (Meta, LinkedIn, X, TikTok, YouTube, Telegram, WordPress), vídeo/voz, Supabase, Qdrant, Apify, Make e Hotmart. Sem N8N configurado, o app só cria, agenda e registra.
- Ecossistema pré-existente do autor: Make (LinkedIn), N8N, Hetzner, Hotmart, GateKeeper (Telegram premium), RenderLinkedIn.

## 15. Riscos e melhorias
1. Inconsistência "3 variantes" (subtítulo) × "1 variante" (padrão).
2. Dados só no navegador (nunca exportou = alerta já existe no Backup) → levar esse alerta para "Precisa de ação" na Home. O banner de fallback aparece mesmo com app vazio (erro `podcast_sources` "Key not found" é leitura de chave inexistente tratada como falha → falso alarme a corrigir: tratar "not found" como vazio).
3. Tokens (Meta, X, Telegram, Apify, WordPress, N8N) ficam no navegador do cliente; segredos em URL/path (Telegram, Apify) vazam em logs. Preferir guardar tokens só no N8N e o app chamar apenas o webhook. Não compartilhar o artefato com chaves salvas.
4. Revisão factual desligada por padrão, mas recomendada para notícias → considerar ligar automaticamente para formatos factuais (News, LinkedIn, X, Blog, YouTube).
5. Pacote Full sem card próprio nos prints → conferir onde é acionado.
6. Handle `@igorbrasil` fixo na capa e nome do arquivo "ib" sugerem marca pessoal de outro criador/versão; no Núcleo de Líderes trocar por handle próprio (deixar configurável em APIS/Config).
7. Geração de imagem manual (copiar JSON → ChatGPT → anexar) é o maior atrito; automatizar via API de imagem em APIS.
8. Histórico não tem lista para Vídeo Repost, News Diário e Guias.

## 16. Para fechar 100%
Ainda faltam prints (ou o código) de: **Dashboard**, **APIs** (topo da página, cards abertos com campos de chave e a seção "Capacidades"), sub-aba **Criar Ebook**, **Histórico do Coach**, opções dos selects **Objetivo/Variantes**, um **resultado de geração** (card de conteúdo com variantes), um **resultado do Coach**, um **guia de edição gerado**, o **sino de notificações** aberto e o **Calendário com itens**. Com isso removo todos os [I]/[?].
