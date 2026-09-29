# Super Máquina de Conteúdo v0.4.0 COMPLETA

## Instalação
1. Preserve a versão anterior e faça backup.
2. Extraia esta pasta em um local definitivo.
3. Execute `INICIAR_MAQUINA.bat`.
4. É necessário Node.js 22 ou superior.
5. Abra `http://localhost:3080`.
6. No primeiro acesso, crie a senha da instalação.

Este ZIP é uma versão completa, não um atualizador parcial.

Para atualizar uma instalação existente sem perder dados, extraia a nova versão em outra pasta e execute `ATUALIZAR_INSTALACAO_EXISTENTE.bat`. O atualizador cria um ZIP de segurança, mantém a pasta `data` e guarda a instalação anterior ao lado dela.

## Vídeo real como prioridade

Abra **Reaproveitar vídeo**. Para vídeos grandes, escolha o arquivo pelo caminho no PC ou numa pasta do Drive sincronizada. O original fica no lugar e nunca é alterado. A Máquina gera áudio temporário, transcrição reutilizável, sugestões de trechos e derivados na Biblioteca.

O pacote completo já contém FFmpeg, Faster-Whisper e o modelo local em português. `PREPARAR_VIDEO.bat` serve apenas para reparar ou reinstalar essas dependências se necessário.

## Publicação e integrações

Metricool usa MCP/OAuth, inclusive no plano gratuito. A primeira conexão precisa ser autorizada pelo titular. A fila local informa “Aguardando conexão” até existir confirmação do serviço; ela não apresenta uma solicitação como publicação concluída.

Canva é complementar para capas e identidade, sem ser requisito para cortar e legendar vídeos.

## Pacote da empresa

Em Configurações, **Exportar empresa** cria um pacote com dados e derivados daquela empresa. Credenciais de serviços externos não são exportadas. Vídeos grandes referenciados no PC ou Drive continuam como referências para evitar cópias desnecessárias.

## Central do Dia
A Home foi simplificada. O foco é:
- comando principal;
- Max contextual;
- notícias de fontes aprovadas;
- agenda e avisos;
- custos e limites essenciais.

Funções adicionais ficam no seletor `Escolher ferramenta`.

## Max
O Max mantém o robozinho aprovado e usa três imagens fixas do mesmo personagem:
- Neutro: estado padrão e usuário digitando;
- Pensando: sistema processando;
- Falando: Max respondendo ou conduzindo.

Os arquivos ficam em `public/assets/max/`.

## Histórico persistente
Trabalhos podem ser retomados, fixados, renomeados, arquivados ou apagados. Apagar conteúdo vinculado exige confirmação específica.

## Notícias e fontes
O cliente controla as fontes aprovadas. O Max pode sugerir, mas sugestão não vira fonte aprovada automaticamente.
A v0.4.0 consegue ler feeds RSS/Atom informados nas fontes aprovadas, sem scraping de fontes arbitrárias.
Ao abrir uma notícia, é possível criar newsletter, post ou conteúdo para todas as redes.

## Jev + Gemini + OpenRouter
Jev permanece na OpenRouter como camada de classificação/validação (`~typesafe/jev-latest`).
O Gemini pode ser conectado como camada econômica. O padrão novo é `gemini-3.5-flash-lite`.
A chave Gemini fica criptografada no backend local.

Fluxo principal:
`pedido -> Jev -> camada econômica quando adequada -> validação Jev -> escalada somente quando autorizada -> Biblioteca`.

## Controle de custo
- Gemini Free pode mostrar R$ 0,00;
- para aviso percentual antecipado, informe o limite diário exibido no AI Studio;
- alertas em 70%, 90% e 95%;
- Modo Custo Zero bloqueia OpenRouter paga quando a tarefa não puder continuar gratuitamente;
- fallback pago pode ser autorizado/desautorizado.

## Conector Local Windows
A v0.4.0 inclui ações locais autorizadas, sem expor CMD/PowerShell irrestrito:
- criar backup;
- abrir pasta de conteúdos;
- verificar FFmpeg;
- verificar Node.js.

## Dados locais
- Base: `data/state.sqlite`
- Materiais: `data/media`
- Produções: `data/produced`
- Exportações: `data/exports`
- Backups: `data/backups`

## Segurança
Chaves permanecem no backend e são criptografadas. Ações destrutivas ou financeiras exigem controle explícito.

