# Changelog v0.2.2

## Novo
- DNA da Empresa integrado à base local SQLite.
- Montagem inicial do DNA sem custo de IA, usando dados já existentes.
- Campos: identidade, entrega, clientes, problema, proposta de valor, produtos, diferenciais, valores, forma de trabalhar, tom de voz, direção comercial, provas, identidade visual, liderança, restrições e objetivos.
- Aprovação do DNA.
- Histórico de versões.
- Criação de nova versão sem apagar a anterior.
- Gerações com IA usam o DNA quando ele estiver aprovado.
- Se o DNA ainda estiver em rascunho, a Máquina continua usando o Contexto Estratégico.

## Pacote
- Transformado em ZIP completo de instalação local.
- Removido o atualizador da distribuição.
- Versão: 0.2.2.

## Correção crítica de inicialização v0.2.2
- Corrigido o MIME dos arquivos da interface local.
- `index.html` agora é servido como `text/html`, em vez de `application/octet-stream`.
- `app.js` e `link.js` agora são servidos como JavaScript.
- `styles.css` agora é servido como CSS.
- Isso elimina o comportamento em que o navegador baixava um arquivo chamado `download` em vez de abrir a Super Máquina.
