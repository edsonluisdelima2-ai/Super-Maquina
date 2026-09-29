# Matriz de auditoria — Super Máquina Lite

**Fonte do contrato:** handoff/prancheta consolidada entregue em 28/09/2026.  
**Objeto auditado:** `Super_Maquina_Conteudo_v0_5_0_Lite` (rascunho de trabalho).  
**Regra:** esta matriz não autoriza ZIP nem substituição de instalação. A versão existente e os seus dados permanecem fora desta rodada.

## Evidências observadas

| Área | Estado | Evidência no código | Próxima correção ou teste obrigatório |
|---|---|---|---|
| Instalação Lite | **PARCIAL / DEFEITO** | `install-transcription.py` só aceita `small`; a rota inicia o processo em segundo plano e ignora erro; não há status, log, integridade ou retomada. | Criar instalador local monitorado, com estado persistente, mensagem de erro precisa e checagem de todos os componentes antes de analisar um vídeo. |
| Integridade na abertura | **NÃO IMPLEMENTADO** | `capabilities` apenas tenta FFmpeg e import do Whisper quando a tela abre. Não confere worker, Python, modelo, diretórios ou manifesto. | Executar diagnóstico inicial e impedir início de análise quando faltar componente, explicando qual falta e como resolver pela própria aplicação. |
| Caminhos Windows com espaços/acentos | **PARCIAL / NÃO TESTADO** | O motor usa `spawn(exe,args)`, o que tende a preservar argumentos; há seletor local. Não existe teste automatizado nem teste com arquivo real. | Testar instalação e vídeo real em caminho com espaços e acentos. |
| Editor de Vídeo — nome | **PARCIAL / DEFEITO** | O corpo substitui parte do título por “Editor de Vídeo”, mas a navegação ainda usa “Reaproveitar vídeo” em `public/app.js`. | Padronizar o nome decidido em menu, cabeçalho, textos e documentação. Há conflito entre “Editar Vídeo” e “Editor de Vídeo” nas decisões anteriores; a denominação final precisa ser confirmada antes do acabamento. |
| Escolha de arquivo e upload | **PARCIAL** | Há seletor Windows, caminho local e envio base64 com limite de 20 MB. | Reproduzir o erro do arquivo de aproximadamente 11 MB, trocar para envio que não infle o arquivo em memória e mostrar progresso/falha compreensível. |
| Google Drive | **PARCIAL** | Link é apenas salvo; `source()` bloqueia processamento e pede pasta sincronizada. | Declarar claramente o suporte como referência/pasta sincronizada até haver integração homologada; testar relocalização. |
| Original imutável | **IMPLEMENTADO / NÃO TESTADO** | A fonte é lida; renderização grava em `data/produced`; exclusão remove apenas referência. | Testar hash do original antes/depois de transcrever e gerar corte. |
| Transcrição local | **PARCIAL / DEFEITO** | Faster-Whisper local com modelo `small`, português, timestamps e VAD. Evidência visual anterior mostra erros graves de grafia. | Definir motor/modelo por teste comparativo com vídeo real; não declarar qualidade corrigida sem comparação humana documentada. |
| Transcrição bruta e revisada | **NÃO IMPLEMENTADO** | O sistema só exporta MD/TXT/JSON. Não há campo de edição, versão revisada ou persistência da revisão. | Implementar edição salva da transcrição revisada, preservando o bruto e usando a revisão para cortes/legendas quando aprovada. |
| Sugestão de cortes | **PARCIAL** | A curadoria local gera até oito cortes por sinais simples do texto. | Exibir e permitir editar tema, início, fim, texto, objetivo, produto e CTA; permitir criar, excluir, regenerar e aprovar antes de renderizar. |
| Última palavra cortada | **NÃO VALIDADO** | Há acréscimo fixo de 0,35 s em `renderCut`, mas sem teste de vídeo real. | Medir dois cortes, ouvir final, comparar com o original e só então fixar margem/regra adequada. |
| Legendas e cortes | **PARCIAL / NÃO TESTADO** | Gera SRT a partir de timestamps e renderiza MP4 vertical. | Testar dois cortes reais, playback, sincronismo, último segundo e download. |
| Progresso e erros | **PARCIAL** | O estado da tarefa é salvo, porém sem progresso de download/transcrição e com falha genérica do processo. | Expor etapas, último erro, tentativa de novo e diagnóstico copiável. |
| Max em telas operacionais | **PARCIAL / DEFEITO** | Max aparece no editor e há estado global, mas não há guia contextual por campo em todas as telas. | Criar painel compacto persistente com orientação por tela/campo, sem prometer ações que não existem. |
| Enter / click por formulário | **PARCIAL** | Há Enter no login e criação; formulários administrativos não têm regra uniforme. | Auditar todos os formulários operacionais, impedir envio acidental em textarea e testar click/Enter. |
| Produtos após importação | **PARCIAL / NÃO TESTADO** | Exportação inclui `client`; importação adiciona o cliente e coleções; tela depende de `c.products`. | Criar pacote de regressão com produtos, importar em instalação limpa e conferir UI/DNA. |
| Saldo e custos | **PARCIAL / DEFEITO** | O backend lê créditos; a interface usa duas casas no saldo e há usos com 3–5 casas. | Exibir saldo, consumo e custo com seis casas, origem/data da consulta e mensagem explícita quando não houver saldo fornecido pelo provedor. |
| Gêmeo — base persistente | **PARCIAL** | `twin-save` persiste objetivo, voz, visual, desempenho, restrições e fontes selecionadas. | Preservar essa base e transformá-la em perfil consultável pelos fluxos aprovados. |
| Gêmeo — fluxo funcional | **NÃO IMPLEMENTADO** | A tela declara que nenhum conteúdo é gerado; não há roteirista, diretor de performance, presets compartilhados, revisão ou memória aplicada. | Implementar o fluxo aprovado: acervo/DNA/fontes/presets → roteiro editável → avaliação baseada em evidências → revisão humana → aprovação. Sem publicação e sem chamada paga automática. |
| Segurança da auditoria automática | **REVISAR** | Auditor Sênior gerou muitos alertas em bibliotecas empacotadas que parecem padrões de código de terceiros. A inspeção de `server.js:335` confirmou falso positivo: trata-se da função `costEvents`, sem credencial. | Fazer adjudicação manual antes de remover dependências ou rotacionar qualquer chave; não tratar alertas de texto em biblioteca como segredo confirmado. |

## Portas para gerar uma Lite instalável

1. Integridade inicial e instalação local do motor concluídas e testadas.
2. Qualidade da transcrição e dois cortes reais aprovados, inclusive a última palavra.
3. Edição persistente da transcrição e revisão dos cortes funcionando.
4. Nome final do editor, Max, formulários e custos conferidos.
5. Importação de produtos e saldo/custos com seis casas testados.
6. Gêmeo implementado no fluxo acordado, sem conteúdo fictício ou integração paga não autorizada.
7. Regressão: instalação limpa, atualização preservando dados e caminhos Windows com espaços/acentos.

Somente depois dessas portas a redução do pacote e a criação do ZIP Lite podem ser avaliadas.
