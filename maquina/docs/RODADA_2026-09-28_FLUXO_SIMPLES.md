# Rodada 28/09/2026 — Fluxo simples de criação (sobre a v0.5.0 Lite)

Não é uma nova versão nem um release: são alterações localizadas sobre a v0.5.0 Lite. Nenhum dado, banco ou original foi tocado.

## O que entrou
1. **Entrada única.** Em “Criar” (e na caixa da Home) o cliente escreve o que quer, por exemplo “post para vender mentoria de liderança para empresas”. A plataforma usa o DNA/contexto aprovado da empresa e gera uma versão por rede (LinkedIn, Instagram, Facebook), cada uma com as regras da rede e a legenda pronta. Carrossel é detectado pelo pedido ou pela caixa “Carrossel”.
2. **Editável até a fila.** O texto pode ser editado livremente. Editar um conteúdo já aprovado o devolve para “Em revisão”. Depois de enviado para a fila, o texto fica travado até o cliente retirá-lo da fila.
3. **Imagem opcional.** Só texto, imagem do próprio cliente (Biblioteca de materiais ou envio do computador) e, no futuro, arte gerada pela plataforma (não implementada, exige autorização de custo).
4. **Pacote para publicar à mão.** “Baixar pacote” entrega legenda.txt, a imagem anexada e um LEIA-ME, para publicar em qualquer lugar enquanto a publicação automática não estiver validada.
5. **Fila com aprovação.** Só conteúdo aprovado entra na fila. A publicação automática continua NÃO implementada: a fila apenas registra.
6. **Link rastreável por post.** Um link (redirecionamento com utm ou formulário) por post. Cliques contam no próprio link e leads que entram pelo formulário nascem atribuídos ao post. Leads cadastrados à mão podem escolher o “Post de origem”.
7. **Funil por conteúdo** em Resultados: cliques, leads, propostas e clientes por post.
8. **Max como assessor em todas as telas** (menos Home e Editor de Vídeo, que já têm o Max grande): painel lateral fixo, recolhível, que explica a tela, indica o próximo passo conforme o estado real e orienta campo a campo ao focar cada campo.

## Correções feitas no caminho
- Hashtags no início de uma linha eram apagadas pelo limpador de Markdown (`#lideranca` virava `lideranca`). Agora só cabeçalhos Markdown reais (`# Título`) são limpos.
- Um `onclick` inline do painel “Escolher ferramenta” era bloqueado pela política de segurança do navegador (erro de console). Substituído por tratador em JavaScript.

## Arquivos alterados
`server.js`, `public/app.js` (1 linha), `public/index.html`, novos `public/quick.js`, `public/quick.css`, testes `tests/quick.js`, `tests/ui.js`, `tests/regression.js`.

## Testes executados (todos em modo de teste, custo zero)
- `node tests/smoke.js` (existente) OK.
- `node tests/quick.js`: pedido → uma versão por rede → edição → imagem → aprovação → pacote ZIP válido → fila → trava → retirar → link → clique → lead atribuído → nada publicado.
- `node tests/ui.js` (Chromium): login com Enter, pedido com Enter, edição, imagem, aprovação, fila, download do pacote, link, Max visível/grande/sem cobrir campos em 1440, 1100, 900 e 700 px, orientação diferente por campo, sem erros de JavaScript.
- `node tests/regression.js <versão anterior>`: dados criados pela versão anterior permanecem intactos e utilizáveis na nova.

## O que NÃO foi validado
- **Qualidade real dos textos por rede.** Os testes usam a IA simulada da própria aplicação. Falta um teste com Gemini/OpenRouter real (custo de centavos, precisa de autorização).
- **Publicação automática** nas redes (Metricool escreve? API oficial?). Continua pendente de verificação na documentação oficial.
- **Domínio público.** O link rastreável só funciona nas redes se BASE_URL apontar para um endereço público; em localhost a tela avisa.
- **Custo por criação.** O fluxo usa o tipo “multinetwork” já existente: conta 1 no limite de posts e 4 créditos por criação, independentemente do número de redes. Política comercial a confirmar.
- **Pendências da matriz de auditoria** (transcrição, última palavra cortada, revisão salva da transcrição, importação, saldo com seis casas, Enter em todos os formulários administrativos) não foram tocadas nesta rodada.

## Acréscimo: Engenheiro de Prompt (28/09/2026)

Nova tela "Prompt para IA" (menu e gaveta de ferramentas). O cliente escreve o que quer ("quero criar uma logomarca para minha empresa"), escolhe a IA de destino (Gemini, ChatGPT, Claude ou outra) e o tipo (ou deixa automático). A plataforma escreve o prompt usando os dados da empresa e deixa campos [ENTRE COLCHETES] para o que só o cliente sabe.
- Copiar prompt: sempre disponível.
- Criar aqui: para texto, documento, apresentação, roteiro e planilha. Planilha sai em CSV (abre no Excel e no Google Planilhas); texto e documento saem em Word e PDF.
- Imagem/logomarca e site: só o prompt. A plataforma não gera imagem nem código; a orientação aparece na tela.
- Custo: criar o prompt = 1 crédito; criar aqui = 2 créditos. Não consome o limite de posts (chave de limite "prompts", sem teto de quantidade). Usa Gemini quando há chave, senão OpenRouter, com as mesmas travas de Custo Zero e fallback pago.
- Rotas: POST /api/prompt/create, GET /api/prompts, POST /api/prompts/:id/run.
- Testes: tests/prompt.js (PROMPT OK) e tests/prompt-ui.js (PROMPT UI OK). Modo de teste sem custo.
- NÃO COMPROVADO: qualidade do prompt gerado por IA real (os testes usam resposta simulada).

## Acréscimo: Página de venda (28/09/2026)

Site de uma página, usado como página de vendas. Tela "Página de venda" (menu e gaveta de ferramentas).
- Criação: o cliente diz o que quer vender; a IA escreve título, apoio, "você se reconhece", benefícios, como funciona, para quem é, convite final e texto do botão, com o DNA da empresa. Não inventa preço, prazo, garantia nem prova. Custo: 3 créditos; sem limite de quantidade de páginas.
- Edição pelo cliente: todos os textos, cores, nome exibido, botão e promoções, com prévia ao lado e aviso de alterações não salvas.
- Botão: formulário de contato (cada contato vira lead em Relacionamento, com página e promoção de origem) ou levar a um link (por exemplo, WhatsApp), com clique contado e utm.
- Promoções: várias por página, uma ativa; a promoção vencida some sozinha (fuso de São Paulo).
- Link dinâmico (/link/TOKEN): mostra a página escolhida e pode ser trocado para outra página sem mudar o endereço nem o QR Code (que já existia para links). Contadores de visitas, cliques e contatos.
- Publicação em endereço gratuito: baixa a página pronta (ZIP com index.html e LEIA-ME), o cliente envia a uma hospedagem gratuita de sites (Netlify Drop ou Cloudflare Pages, conforme a documentação oficial consultada em 28/09/2026: arrastar pasta ou ZIP; novas versões mantêm o endereço), cola o "Endereço publicado" e a plataforma gera o QR Code dele. O link dinâmico pode servir a página da plataforma ou levar à página publicada.
- Limites conhecidos: o link dinâmico só é público se a instalação tiver domínio público (BASE_URL); na hospedagem gratuita a página é estática (botão precisa levar a um link, sem formulário); os limites do plano gratuito de cada hospedagem devem ser conferidos pelo cliente. Não há limite de tentativas no formulário público (não testado contra spam).
- Rotas: POST /api/pages/create, GET /api/pages, PUT/DELETE /api/pages/:id, GET preview, POST link/export/qr, POST /api/links/:id/page, GET /link/TOKEN/go.
- Testes: tests/sales.js (SALES OK) e tests/sales-ui.js (SALES UI OK). NÃO COMPROVADO: qualidade do texto com IA real.

## Auditoria de simplicidade (Página de venda, Prompt e caixa de Início)
Critério: um cliente sem treino conclui sozinho. Correções mínimas:
- Editor da Página de venda: à vista só título, texto de apoio, texto do botão, o que o botão faz e a promoção. Nomes, listas de seções e cores ficam em "Mais opções" (fechado). "Divulgar" virou um passo: "Criar link e QR Code". A publicação em site gratuito ficou opcional e recolhida ("Publicar grátis em um site").
- Linguagem: saíram "hospedagem", ".zip", "BASE_URL" e "domínio público" das telas e das mensagens de erro.
- Caixa de Início: pedidos com "página de vendas/landing page" abrem a Página de venda e criam; pedidos com "logomarca/logo/prompt/planilha/identidade visual" abrem o Prompt para IA e criam. Pedidos que citam post/redes/newsletter etc. seguem o fluxo antigo.
- Celular (≤780px): menu vira faixa rolável, Max fica compacto, prévia vem antes do formulário.
Limite conhecido: a heurística de roteamento é por palavras; frases ambíguas caem no fluxo antigo. Teste com pessoa real ainda pendente.
