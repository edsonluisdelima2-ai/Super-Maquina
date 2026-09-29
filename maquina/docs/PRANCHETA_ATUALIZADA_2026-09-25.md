# Prancheta atualizada - Super Máquina de Conteúdo

## Incorporado na v0.1.3

- Login persistente e reinício corrigido.
- Compatibilidade com senha/hash da v0.1.2.
- INICIAR_MAQUINA.bat sem solicitação de senha no terminal.
- Redefinição de senha sem apagar demais dados.
- Biblioteca persistente de Conteúdos Produzidos.
- Rascunho automático na criação de conteúdo.
- Resultado textual validado antes da contabilização de crédito interno.
- Conteúdo vazio não consome franquia/crédito interno.
- DOCX e PDF reais para conteúdo textual concluído.
- Ações: copiar texto, baixar DOCX, baixar PDF, editar, aprovar, agendar e salvar para depois.
- Botão Publicar agora presente, sem fingir publicação enquanto as redes não estiverem conectadas.
- Saída limpa de Markdown cru e asteriscos.
- Instruções obrigatórias de modo humano, revisão ortográfica, congruência e respeito a CTA.
- Controle de Qualidade visível.
- Imagem precisa ser salva como arquivo final antes da contabilização interna.
- Vídeo/avatar em fila sem cobrança antes de entrega final.
- Saldo OpenRouter na Visão Geral quando disponível.
- Botão Copiar link.
- Ações dos links em português amigável.
- URLs públicas usam /link/TOKEN, evitando confusão entre letra l e número 1.
- Links públicos isolados do painel administrativo.
- Erro explícito para rota /1/TOKEN digitada incorretamente.

## Já validado antes da v0.1.3

- Link dinâmico Redirecionar cria corretamente.
- Redirecionamento chegou ao destino correto.
- Contador registrou 2 acessos.
- Persistência do link após navegação funcionou.

## Requer novo teste na v0.1.3

- Reiniciar a Máquina e entrar com a mesma senha.
- Link de Upload público e armazenamento na Biblioteca de Materiais.
- Formulário público.
- Aprovação pública.
- Download público.
- Geração textual com OpenRouter e criação de DOCX/PDF.
- Geração de imagem com arquivo real e persistência.
- Limites de planos.
- Comunidades e leads.
- Consulta do saldo OpenRouter.

## Pendente / futuro

- Publicação real via OAuth nas redes sociais.
- Agendamento real integrado às redes.
- Carrossel com páginas finais em imagem e pacote de exportação completo.
- Worker final de vídeo MP4.
- Avatar e clone de voz homologados.
- Integração automática com Detetive WA.

## Correção v0.1.4
- Corrigida inicialização no Windows quando a pasta `data` não existia no diretório escolhido.
- `INICIAR_MAQUINA.bat` agora cria e valida `data`, `media`, `exports` e `produced` antes de iniciar o servidor.
- Node é iniciado com caminho absoluto e logs separados de saída e erro.
- Atualizador guiado preserva integralmente a pasta `data` e cria backup do código anterior antes de substituir arquivos.
- Atualizador bloqueia instalação em pasta sem `data\state.json`, evitando atualizar por engano uma cópia vazia e perder a continuidade dos testes.


## Correção v0.1.5
- Atualizador simplificado e verificável.
- Confirma a versão instalada antes de abrir a Máquina.
- Evita executar acidentalmente a v0.1.3 antiga após a correção.

## Editor de vídeo — manutenção local em 27/09/2026 (sem nova versão)

### Decisões do usuário para evolução futura
- Renomear "Reaproveitar vídeo" para incluir explicitamente "Editor de vídeo". Registrado; rótulo não alterado nesta manutenção.
- Garantir suporte a caminhos Windows com espaços e acentos.

### Diagnóstico e correção realizada
- A raiz real contém duas pastas chamadas Super_Maquina_Conteudo_v0_4_0_Nucleo. Não foi encontrada concatenação duplicada no código: server.js usa __dirname e content-engine.js usa path.join(root, 'workers', 'transcribe.py').
- A instalação estava incompleta: workers/transcribe.py estava ausente e o Python portátil não conseguia importar string e sqlite3.
- Restaurados 978 arquivos ausentes dos workers e do Python portátil a partir do pacote local Super_Maquina_Conteudo_v0_4_0_Nucleo.zip. Arquivos existentes não foram sobrescritos. Código do motor, mídia original e configurações foram preservados.
- Backup anterior: data/backups/editor-repair-20260927-193233 (banco SQLite consistente, motor, Prancheta anterior e relação dos arquivos restaurados).

### Validação real
- Python portátil 3.14.6, Faster-Whisper 1.2.1, modelo small local em CPU/int8 e FFmpeg 6.1.1 funcionando.
- Testado o fluxo analyze do motor instalado com Nathalie2.mp4, sem troca de senha ou alteração da autenticação.
- Tarefa job_4aaecfe5ce10acfe: status review, "Trechos prontos para revisão"; duração 53,781 segundos, 7 segmentos, 2 sugestões de cortes.
- Transcrição JSON, TXT e Markdown salva em data/produced/job_4aaecfe5ce10acfe.
- Clientes (1), conteúdos (9) e itens de biblioteca (23) mantiveram suas contagens. Tentativas anteriores foram preservadas.
- Teste adicional de aproximadamente 12 segundos com nomes de arquivo e pasta contendo espaços e acentos passou pela extração FFmpeg e transcrição real; 2 segmentos reconhecidos.
- Aplicação reiniciada e respondendo em http://localhost:3080, versão 0.4.0.
- Escopo concluído: transcrição e sugestão de cortes. Renderização/publicação de cortes não foi executada.

## Decisões de interface registradas em 28/09/2026

- Trocar todo rótulo remanescente de **"Reaproveitar vídeo"** por **"Editar Vídeo"**. O nome deve ser consistente no menu lateral, no título da tela, nos atalhos e nas mensagens do Max.
- Manter o **Max visível e em destaque em todas as telas**, não apenas no cabeçalho. Em cada contexto, ele deve orientar os campos, explicar o que é esperado no preenchimento, indicar o próximo passo e traduzir erros em linguagem simples.
- A presença do Max deve adaptar a orientação à tarefa atual, sem cobrir os campos nem criar uma segunda navegação paralela.

## Editor de Vídeo — revisão de transcrição

- Permitir corrigir erros de grafia, nomes, termos e pontuação diretamente na transcrição antes de gerar um corte.
- A edição textual deve preservar os timestamps e o vídeo original. Ao gerar legenda e vídeo vertical, o sistema deve usar a versão revisada pelo usuário.
- A transcrição automática original permanece disponível como referência; a revisão humana deve ficar identificada como uma versão posterior.

## Editor de Vídeo — qualidade da transcrição

- O motor atual Faster-Whisper com modelo `small`, executado localmente em CPU, foi considerado insuficiente para uso editorial: a tela mostrou erros recorrentes de grafia e reconhecimento de termos.
- A próxima implementação deve substituir o `small` como padrão de qualidade por um modelo de maior precisão, homologado em português, mantendo opção de modo rápido somente quando o usuário aceitar menor precisão.
- Antes de adotar um novo modelo, comparar no mesmo vídeo: erros de nomes e termos, integridade de frases, timestamps, tempo de processamento, espaço em disco e custo. O resultado só será aceito se reduzir materialmente a necessidade de correção manual.
- A tela deve informar de modo claro a qualidade escolhida e oferecer revisão textual antes de qualquer corte, legenda ou publicação.

## Importação e contexto da empresa

- Falha observada após importação: o campo **Produtos e serviços** chegou vazio, apesar de ser parte do contexto da empresa de origem.
- Corrigir a importação para preservar produtos e serviços, incluindo nome, descrição e demais dados disponíveis, sem substituir dados já existentes na empresa de destino.
- Ao fim da importação, validar e informar claramente quais blocos foram trazidos: contexto, produtos e serviços, DNA, Biblioteca, conteúdos e materiais. Campos ausentes devem ser exibidos como pendência real, nunca silenciosamente apagados.
- Falha observada: o saldo atual não foi trazido. A importação deve preservar o saldo interno, franquias e histórico de consumo aplicáveis à empresa, ou informar de modo inequívoco quando um saldo pertence à instalação e não pode ser transferido.
- O resultado da importação deve comparar saldo de origem e destino antes de concluir, sem inventar crédito nem zerar saldo silenciosamente.
- Evidência visual: a tela de Custos mostra gasto histórico, mas não apresenta o saldo disponível. Separar visualmente **saldo atual**, **consumo do período** e **limite/franquia do plano**.
- Substituir a categoria técnica `unknown` por um nome compreensível ou classificá-la corretamente antes de exibir. Nenhum termo interno deve aparecer na interface do cliente.
- Requisito já aprovado: exibir **saldo atual, consumo e custo por operação com seis casas decimais** (por exemplo, `US$ 0,028300`) para tornar microconsumos auditáveis. Quatro casas não atendem ao requisito.
- Evidência visual: o saldo existe em **Configurações** (créditos adquiridos, consumo e saldo disponível), porém aparece com duas casas e não é refletido em Custos. Usar uma única fonte de dados e a mesma precisão de seis casas nas duas telas.

