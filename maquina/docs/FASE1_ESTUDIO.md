# Fase 1: Estúdio de conteúdo (sobre a v0.5.0 Lite r3)

Alteração aditiva. Nenhum arquivo existente foi reescrito; o banco e os dados continuam compatíveis.

## O que entrou
- Nova tela **Estúdio** (menu e gaveta de ferramentas) com 10 formatos: Vídeo curto, Carrossel, LinkedIn, Instagram, X/Twitter (5 subformatos), Newsletter, Blog (com HTML do artigo), Podcast, YouTube e Comunidade.
- Formulário estruturado: Tema, Material de apoio, Ângulo, Objetivo, Versões (1 a 3), Tom extra e Revisão factual.
- **1 a 3 versões** por pedido, com abordagens diferentes (direta, cena/analogia, pergunta/contraste), salvas como Rascunho.
- **Revisão factual**: segunda leitura que compara o texto com o material colado ou, sem material, aponta números, nomes e datas que podem ter sido inventados. Botão "Conferir fatos" em cada versão.
- **Remodelagem anti-slop** (campo opcional): recebe a transcrição de um vídeo de referência e usa só ritmo e arco. A ligação automática com a transcrição local do Editor de Vídeo fica para a fase 3.
- Integração com o que já existe: edição, aprovação, pacote para publicar à mão, Word/PDF, fila de publicação (LinkedIn e Instagram), Histórico e Biblioteca.
- Max com orientação por tela e por campo no Estúdio.

## Créditos (adicionados à tabela padrão)
X 2, Blog 3, Podcast 2, YouTube 5, Comunidade 2 (Coach 4 e Capa 1 já reservados para as próximas fases). Vídeo curto, Carrossel, LinkedIn/Instagram e Newsletter usam os pesos que já existiam. A revisão factual consome 1 crédito de revisão. O pedido consome o peso do formato uma vez, seja 1, 2 ou 3 versões.

## Arquivos
Novos: `lib/machine.js`, `public/machine.js`, `public/machine.css`, `tests/machine.js`, `tests/machine-ui.js`.
Alterados (poucas linhas): `server.js` (pesos de crédito, criação do módulo, rota, gancho do modo de teste), `public/index.html` (2 tags).

## Testes (modo de teste, custo zero)
`node tests/machine.js` e `node tests/machine-ui.js` (Chromium, 1440 a 400 px, Enter, Max por campo, sem erros de JavaScript).
Regressão: `smoke`, `quick`, `prompt`, `sales`, `ui`, `prompt-ui` e `sales-ui` continuam passando.

## O que NÃO foi validado
- **Qualidade real dos textos e da revisão factual.** Os testes usam a IA simulada da própria aplicação. Falta um teste com Gemini ou OpenRouter reais (custa centavos e precisa da sua autorização).
- Que a revisão factual encontre de fato erros: só foi provado que o formato de resposta é lido e exibido corretamente.
- Publicação: nada publica. A fila continua apenas registrando.
- Formatos X, Blog, Podcast, YouTube, Vídeo curto, Newsletter e Comunidade não entram na fila (só LinkedIn e Instagram, como na r3); use "Baixar pacote".
- `tests/regression.js` (compatibilidade com dados de versão anterior) não foi executado por falta de uma instalação anterior com dados.
- O nome final "Estúdio" e o custo em créditos dos formatos novos são propostas aguardando confirmação.
