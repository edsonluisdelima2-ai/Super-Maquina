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

## Rodada de segurança e teste real (29/09/2026)

### Bloqueio de tentativas de senha (entregue e testado)
- Novo `lib/login-guard.js`, ligado à rota de login. 5 senhas erradas em 15 minutos bloqueiam o login por 15 minutos; cada novo bloqueio dura o dobro (teto de 24 horas). Durante o bloqueio, nem a senha correta entra.
- A tela mostra "Restam N tentativas" e, no bloqueio, "Tente de novo em N minuto(s)". O servidor responde 429 com `Retry-After`.
- Ajustável por variáveis: `SMC_LOGIN_MAX`, `SMC_LOGIN_WINDOW_MS`, `SMC_LOGIN_LOCK_MS`.
- Limite conhecido: o contador fica em memória. Reiniciar o programa o zera. Quem tem acesso ao computador já poderia redefinir a senha pelo `REDEFINIR_SENHA_ADMIN.bat`, então isso não abre uma porta nova. Se a Máquina for exposta na internet, o contador precisa ser persistido e o endereço de origem precisa vir de um proxy confiável.
- O teste unitário pegou um defeito meu (o bloqueio progressivo perdia o histórico cedo demais). Foi corrigido antes da entrega.
- Testes: `node tests/security.js` (unidade + servidor) e `node tests/security-ui.js` (tela de login).
- Não coberto: a senha mínima continua 6 caracteres na criação; recomenda-se subir para 10 em outra rodada.

### Teste com IA real (NÃO executado por mim)
Este ambiente não tem chave e a rede da sessão bloqueia OpenRouter e Gemini (erro 403). O teste real precisa rodar no seu computador:
1. Na pasta da Máquina, defina `OPENROUTER_API_KEY` (obrigatória: o Jev roda na OpenRouter) e, se quiser, `GEMINI_API_KEY`.
2. Rode `node tests\real-ai.js`. Teto padrão de gasto: US$ 0,10 (`REAL_AI_MAX_USD` altera). `REAL_AI_FULL=1` inclui blog, podcast, YouTube, newsletter e comunidade.
3. Ele cria uma empresa de teste com o contexto do Núcleo de Líderes, roda 4 etapas, para se passar do teto, e grava o relatório com todos os textos em `tests\out\`.
4. Etapas: (1) LinkedIn em 2 versões com revisão factual, (2) se a revisão factual pega um número inventado plantado, (3) thread do X com 5 posts, (4) vídeo curto com anti-slop sem copiar a referência.
5. Checagens automáticas: sem Markdown cru, sem palavras vetadas, sem dica vazada, tamanhos, versões diferentes, formato da revisão. **Elas não julgam qualidade, tom nem voz da marca: leia os textos do relatório.**
- `REAL_AI_DRY=1 node tests\real-ai.js` ensaia o próprio script com a IA simulada, sem gasto (as checagens de conteúdo reprovam de propósito, porque o texto simulado é genérico).
- A chave só é lida do ambiente. Não é impressa nem gravada no relatório.
- Achado de arquitetura: mesmo com chave Gemini, a criação de conteúdo precisa da OpenRouter, porque o Jev (roteamento e validação) roda nela. Sem OpenRouter, a criação cai em "chave não configurada". Isso é comportamento da r3, não desta fase.
