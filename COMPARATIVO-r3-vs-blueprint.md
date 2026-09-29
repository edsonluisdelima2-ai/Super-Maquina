# Comparativo: Super Máquina r3 × Blueprint (Segredos da IA · Content Machine)

Base: `maquina/` (Super Máquina v0.5.0 Lite r3, código lido em 29/09/2026, sem o runtime do Python).
Referência: `BLUEPRINT-segredos-da-ia-content-machine.md`.
Legenda: **TEM** (já faz) · **PARCIAL** · **FALTA**.

## 1. O que a r3 tem e o blueprint não (manter, é o diferencial)
| Área | Detalhe |
|---|---|
| Arquitetura | Servidor Node 22 com SQLite local, login com senha, backend guarda segredos, sem chave no navegador |
| IA | Jev (roteamento e validação), Gemini (modo Custo Zero), OpenRouter, controle de custo e créditos por plano |
| Marca | DNA/Contexto Estratégico por empresa, multiempresa, white label |
| Vídeo | Editor de Vídeo real: FFmpeg, Faster-Whisper local, transcrição com timestamps, sugestão de cortes, corte vertical, legenda SRT, capa |
| Vendas | Links dinâmicos com QR, leads/CSV, funil por conteúdo, Página de venda, Engenheiro de Prompt |
| Publicação | Metricool (MCP/OAuth) preparado, fila com aprovação, pacote para publicar à mão |
| Max | Nos 3 estados, guia contextual por tela e por campo |
| Segurança | Testes automáticos (`tests/*`), backup/restauração completo, migração aditiva |

## 2. Funcionalidade por funcionalidade do blueprint
| # | Blueprint | r3 | Situação | O que fazer |
|---|---|---|---|---|
| 1 | Home: Centro de Comando (contadores, próximas publicações, precisa de ação, criação rápida) | Central do Dia com comando, Max, notícias, agenda e avisos, faixa de custos | **TEM** | Só religar os atalhos aos novos formatos |
| 2 | Criar: 11 formatos | Post por rede (LinkedIn, Instagram, Facebook), carrossel, newsletter, ebook, slides, roteiro de vídeo, pesquisa, multi-rede | **PARCIAL** | Faltam **X/Twitter (5 sub-formatos), Blog (SEO + HTML), Podcast, YouTube longo, Comunidade, Vídeo Repost (capa overlay)** |
| 3 | Criar: formulário (Tema, Contexto, Ângulo, Objetivo, Variantes 1–3, Tom extra) | Uma caixa de texto livre | **FALTA** | Formulário estruturado opcional sobre o motor atual |
| 4 | Se Contexto vazio, o sistema busca online | Radar RSS de fontes aprovadas, sem busca aberta | **PARCIAL** | Usar o Radar como origem de contexto; busca aberta depende de decisão de custo/fonte |
| 5 | Remodelagem anti-slop (transcrição de viral, estuda estrutura sem copiar) | Não existe. A transcrição local já existe no Editor de Vídeo | **FALTA** | Novo modo que extrai estrutura (gancho, ritmo, arco) e gera texto original; ligar à transcrição local no lugar do "Abrir Whisper" |
| 6 | Revisão factual (2ª passada) | Jev valida resultado; existe crédito "review" | **PARCIAL** | Passada factual explícita: compara com o material colado, marca nomes/números possivelmente inventados |
| 7 | 3 variantes por pedido | Uma versão por rede | **FALTA** | Opção de 1 a 3 variantes por formato |
| 8 | Guia de edição (cortes, sons, legendas, biblioteca Final Cut) | Editor de Vídeo faz cortes e legenda reais, mas não gera guia de Final Cut | **PARCIAL** | Guia de edição textual para Vídeo Curto e YouTube, integrado ao Editor de Vídeo |
| 9 | Coach Content (analisar conteúdo bruto e links, direção tática, histórico) | Não existe | **FALTA** | Nova tela Coach: análise + histórico. Links: só se o backend puder ler a página (a r3 tem backend, então é possível) |
| 10 | Guias: Capa de ebook, 3 variações, JSON para gerar arte | Engenheiro de Prompt genérico, sem capa A/B/C e sem preview | **PARCIAL** | Sub-tela Capa (A Limpa, B Interface, C HUD) com paleta e regras de marca do cliente; **Criar Ebook** já existe como formato, ligar à capa |
| 11 | Edição de Vídeo | Editor de Vídeo | **TEM** (melhor que o blueprint) | Manter |
| 12 | Histórico com listas por formato, status Ativos/Rascunhos/Postados/Arquivados, nova lista | Histórico de trabalhos (fixar, renomear, arquivar, apagar) | **PARCIAL** | Barra lateral de listas com contadores, filtro de status e listas personalizadas |
| 13 | Calendário editorial mensal (filtros rede/status, hoje, barra = publicado) | "Programar" e agenda na Home, sem grade mensal | **PARCIAL** | Grade mensal sobre os conteúdos agendados e a fila |
| 14 | Dashboard (produção por formato, cadência, correlação com vendas) | Resultados: funil por conteúdo, consumo de IA | **PARCIAL** | Acrescentar produção por formato e cadência semanal |
| 15 | Backup e recuperação | Backup ZIP completo e restauração | **TEM** | Só o aviso "nunca exportou backup" em "Precisa de ação" |
| 16 | APIs (Runway, Kling, Luma, HeyGen, ElevenLabs, Meta, LinkedIn, X, TikTok, YouTube, Telegram, WordPress, Supabase, Qdrant, Apify, Make, N8N, Hotmart) | OpenRouter, Gemini, Metricool, Canva opcional | **PARCIAL** | Ver seção 4: só o que traz valor e cabe na política da r3 |
| 17 | Notificações (sino) | Avisos na Home | **PARCIAL** | Sino com contagem reaproveitando os avisos |
| 18 | Max explica cada tela | Max contextual em todas as telas | **TEM** | Acrescentar textos das telas novas |

## 3. Resumo
- **Já cobre:** Home, Edição de Vídeo, Backup, Max, segurança e custos (5 de 18).
- **Cobre em parte:** 9 itens, quase todos precisam só de tela nova sobre motor existente.
- **Falta de fato:** formulário estruturado, anti-slop, variantes, Coach (4 itens).

## 4. Integrações do blueprint: o que faz sentido na r3
A r3 já resolve a limitação do artefato original (sandbox sem chamadas externas) porque tem backend. Por isso o N8N deixa de ser obrigatório.
| Integração | Recomendação |
|---|---|
| Publicação (Meta, LinkedIn, X, TikTok, YouTube) | Manter **Metricool** como caminho único para publicar; evita 5 OAuths próprios. Sem publicação até estar validado (regra da r3) |
| WordPress REST (Blog) | Útil para o formato Blog; opcional, credencial só no backend |
| Telegram (canais premium) | Opcional, baixo custo |
| Runway, Kling, Luma, HeyGen, ElevenLabs | Fora do escopo agora (Gêmeo digital está "estacionado" na r3, exige homologação e custo) |
| Supabase, Qdrant, Apify, Make, N8N | Fora do escopo: a r3 já tem SQLite local |
| Hotmart (vendas no Dashboard) | Depois; a r3 já mede oportunidade → venda por conteúdo com evidência informada |

## 5. Regras de marca a respeitar nos textos novos
Do Contexto Estratégico do Núcleo de Líderes: português do Brasil, "você", sem palavras vetadas (gargalo, brutal, condutor, arquiteto, bússola, funil, ticket etc.), sem prova, número ou depoimento inventado, sem promessa de resultado, sem citar preço sem confirmação, publicação só com aprovação.

## 6. Plano proposto (aditivo, no padrão da própria r3: novos arquivos, sem reescrever os existentes)
Cada fase termina com teste automático no estilo de `tests/quick.js` e uma nota de o que **não** foi validado (por exemplo, qualidade real de texto exige IA real).

| Fase | Entrega | Arquivos novos |
|---|---|---|
| 1 | Criar v2: formulário estruturado, 1–3 variantes, X, Blog, Podcast, YouTube, Comunidade, revisão factual | `lib/content-machine.js`, `public/machine.js`, `public/machine.css`, `tests/machine.js` |
| 2 | Coach Content (análise e histórico) | mesmos módulos |
| 3 | Anti-slop a partir da transcrição local + Guia de edição no Editor de Vídeo | idem |
| 4 | Guias/Capa de ebook A/B/C | idem |
| 5 | Histórico em listas, Calendário mensal, Dashboard de produção, sino | idem |
| 6 | Integração opcional: WordPress e Telegram (backend, sem publicar sem aprovação) | `lib/connectors.js` |

## 7. Decisões que dependem de você
1. Nome do editor de vídeo (a auditoria da r3 aponta conflito entre "Editar Vídeo" e "Editor de Vídeo"): manter "Editor de Vídeo"?
2. Custo em créditos dos novos formatos e do Coach (a r3 cobra por tipo). Proposta: Coach 4, Blog 3, Podcast 2, X 2, YouTube 5, Capa 1.
3. Ordem das fases: confirmar ou trocar.
4. Teste com IA real (Gemini/OpenRouter) custa centavos e precisa da sua autorização.
