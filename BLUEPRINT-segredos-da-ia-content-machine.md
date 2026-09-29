# Blueprint — SEGREDOS DA IA · CONTENT MACHINE

Fonte: https://claude.ai/public/artifacts/08786f10-cc4f-4bfa-b4fa-df8a4efc68d5

## 0. Limite desta versão (leia primeiro)
A página pública só entrega a "moldura" do claude.ai e o **HTML renderizado da tela inicial** (sem login). O código do artefato (JS, estado, prompts, chamadas de API) roda em iframe protegido e **não foi acessível**. Portanto:
- **[OBSERVADO]** = está literalmente na tela capturada.
- **[INFERIDO]** = dedução pelos nomes das abas; precisa ser confirmada com o código-fonte.
Para um blueprint 100% fiel, é preciso o código (ver seção 9).

## 1. Identidade [OBSERVADO]
- Nome: **Segredos da IA — Content Machine**
- Visual: fundo quase preto `#0a0a0a`, destaque verde-limão `#b8ff1a`; ícone SVG de lupa (círculo + cabo), estética "painel de controle" com títulos em caixa alta.
- Idioma: português (BR). Tem contador (badge "1") ao lado do nome.
- Propósito [INFERIDO]: máquina de produção/gestão de conteúdo para o projeto "Segredos da IA" (vídeo curto, carrossel, podcast, news, comunidade).

## 2. Navegação [OBSERVADO]
Menu de 10 abas: **HOME · CRIAR · COACH · GUIAS · EDIÇÃO · HISTÓRICO · CALENDÁRIO · DASHBOARD · BACKUP · APIS**

## 3. Tela HOME — "CENTRO DE COMANDO" [OBSERVADO]
| Bloco | Conteúdo | Estado vazio |
|---|---|---|
| Resumo | "N conteúdos ativos · N agendados · N publicados" | 0 · 0 · 0 |
| PRÓXIMAS PUBLICAÇÕES | lista de itens agendados + link "ver calendário completo →" | "Nada agendado. Agendar no calendário" |
| PRECISA DE AÇÃO | alertas/pendências | "Tudo em ordem por aqui." |
| CRIAÇÃO RÁPIDA | atalhos por formato: VÍDEO CURTO, CARROSSEL, PODCAST, NEWS, COMUNIDADE, VER TODOS | — |

## 4. Modelo de dados [INFERIDO]
```
Conteudo { id, formato(video_curto|carrossel|podcast|news|comunidade),
           titulo, roteiro/copy, status(rascunho|ativo|agendado|publicado),
           canal, dataAgendada, dataPublicada, versoes[], metricas{}, criadoEm }
Config   { apis{chaves/provedores}, preferencias, marca }
Backup   { exportJSON, importJSON, dataUltimoBackup }
```
Derivados do resumo da Home: ativos = status≠publicado; agendados = tem dataAgendada futura; publicados = status publicado. "Precisa de ação" = regras (ex.: agendado vencido, rascunho parado, API sem chave).

## 5. Módulos por aba [INFERIDO]
1. **HOME** — painel acima.
2. **CRIAR** — gerador por formato (seletor de formato → briefing → geração via LLM → salvar como conteúdo). Espelha a "Criação rápida".
3. **COACH** — assistente/mentor de conteúdo (chat com LLM para ideias, feedback, estratégia).
4. **GUIAS** — biblioteca de guias/playbooks estáticos (tom de voz, estruturas de roteiro, boas práticas por formato).
5. **EDIÇÃO** — editor/refino de um conteúdo existente (reescrever, encurtar, adaptar de formato).
6. **HISTÓRICO** — lista de tudo que foi criado, com busca/filtro/reabrir/duplicar.
7. **CALENDÁRIO** — visão mensal/semanal de agendamentos; alimenta "Próximas publicações".
8. **DASHBOARD** — métricas: produção por formato, taxa de publicação, cadência.
9. **BACKUP** — exportar/importar dados (JSON), pois o estado é local.
10. **APIS** — cadastro de chaves/provedores de IA e integrações.

## 6. Arquitetura provável [INFERIDO]
- Artefato **single-file HTML/React** rodando no sandbox do Claude, SPA com roteamento por abas em estado local.
- Persistência: localStorage/IndexedDB (por isso existe a aba BACKUP) — sem servidor.
- IA: aba APIS sugere chaves do próprio usuário chamadas direto do navegador, ou a capacidade "perguntar ao Claude" do artefato.
- Publicação: provavelmente só **agenda/registra** (não posta) — a menos que APIS integre redes.

## 7. Fluxos principais [INFERIDO]
Criar (rápido ou aba CRIAR) → gerar → editar → salvar → agendar no calendário → aparece na Home → marcar publicado → alimenta Dashboard/Histórico → Backup periódico.

## 8. Riscos / pontos de atenção
- Dados só no navegador: perda ao limpar cache → backup obrigatório e lembrete em "Precisa de ação".
- Chaves de API no cliente ficam expostas ao próprio usuário/extensões; não compartilhar o artefato com chaves salvas.
- O artefato exige login no Claude para usar (confirmado na página).

## 9. Como completar até ficar 100% fiel
Qualquer uma destas opções:
1. Abrir o artefato logado → menu do artefato → copiar o código e colar aqui (ou salvar como arquivo no repositório).
2. Colar prints/descrição de cada aba (CRIAR, COACH, GUIAS, EDIÇÃO etc.).
Com isso eu refaço as seções 4–7 sem "[INFERIDO]" (campos reais, prompts, componentes, estados, integrações) e, se quiser, reconstruo o app como projeto.
