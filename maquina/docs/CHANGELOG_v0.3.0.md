# Super Máquina de Conteúdo v0.3.0

## Interface
- Home reconstruída como Central do Dia, com menos elementos simultâneos.
- Barra superior fixa.
- Max visível no topo e ao lado do comando.
- Estados aprovados: Neutro, Pensando e Falando.
- Enter envia; Shift+Enter cria nova linha.
- Ferramentas abertas sob demanda em drawer lateral.

## Execução
- Comando central interpretado pelo Jev quando disponível.
- Ação limitada ao escopo explícito.
- Criação direta de Post, Newsletter, Ebook, Slides, Pesquisa e Todas as Redes.
- Slides geram PPTX local após a estrutura com IA.

## Histórico
- `workSessions` persistente.
- Fixar, renomear, arquivar e apagar.
- Conteúdo vinculado só é excluído mediante confirmação específica.

## Notícias
- Lista de fontes aprovada pelo cliente.
- Sugestões separadas e nunca autoaprovadas.
- Atualização por RSS/Atom de fonte aprovada.
- Título + microexplicação na Home.
- Transformação da notícia em Newsletter/Post/Multicanal.

## IA e custos
- Jev v0.2.3 preservado.
- Gemini configurável no backend, padrão `gemini-3.5-flash-lite`.
- Free/Paid declarados pelo usuário.
- Alertas locais de uso por limite diário informado.
- Modo Custo Zero.
- Fallback pago controlável.
- OpenRouter continua como fallback/modelos fortes.

## Windows
- Conector Local com whitelist de ações.
- Sem terminal livre para o assistente.

## Compatibilidade
- Banco SQLite e backup/restauração preservados.
- Migração cria histórico inicial a partir dos conteúdos existentes quando necessário.
