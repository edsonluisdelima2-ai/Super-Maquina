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
| GUIAS, EDIÇÃO, HISTÓRICO, CALENDÁRIO, DASHBOARD, BACKUP, APIS | [I] só pelo nome. Faltam prints |

O código-fonte (JS, prompts, chamadas de IA) não é acessível pela página pública; tudo abaixo sobre lógica interna é [I].

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

## 6. Abas ainda não vistas [I]
- **GUIAS**: módulo dedicado a Ebooks/PDFs (o card "Guias" em CRIAR diz "módulo dedicado") + provável biblioteca de playbooks.
- **EDIÇÃO**: exibe o Guia de Edição gerado (cortes, sons, legendas, biblioteca Final Cut casada com as falas) e os assets/links salvos para baixar e cortar.
- **HISTÓRICO**: todos os conteúdos gerados (variantes), busca/filtro por formato/status, reabrir, duplicar, agendar.
- **CALENDÁRIO**: agendamento; alimenta "Próximas publicações" e o contador de agendados.
- **DASHBOARD**: produção por formato, publicados vs agendados, cadência.
- **BACKUP**: exportar/importar JSON (estado local).
- **APIS**: chaves de provedores de IA/busca/transcrição e integrações (RSS, Whisper etc.).

## 7. Modelo de dados [I]
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

## 8. Arquitetura provável [I]
- Artefato do Claude (SPA, uma página), roteamento por abas em estado.
- Persistência local (localStorage/IndexedDB) → por isso existe BACKUP.
- Geração por LLM (chamada do artefato ao Claude ou chaves em APIS); busca online e leitura de links exigem ferramenta de web/RSS.
- Publicação provavelmente só registra/agenda; não posta nas redes.

## 9. Riscos e melhorias
1. Inconsistência "3 variantes" (subtítulo) × "1 variante" (padrão).
2. Dados só no navegador → lembrete automático de backup em "Precisa de ação".
3. Chaves de API no cliente: não compartilhar o artefato com chaves salvas.
4. Revisão factual desligada por padrão, mas recomendada para notícias → considerar ligar automaticamente para formatos factuais (News, LinkedIn, X, Blog, YouTube).
5. Pacote Full sem card próprio nos prints → conferir onde é acionado.

## 10. Para fechar 100%
Faltam prints (ou o código) de: **Guias, Edição, Histórico, Calendário, Dashboard, Backup, APIs**, do sub-menu **Histórico do Coach**, das opções dos selects **Objetivo/Variantes**, e do resultado de uma geração e de uma análise do Coach. Com isso removo todos os [I]/[?].
