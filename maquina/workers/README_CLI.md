# Workers CLI

A aplicação registra jobs de vídeo/avatar na fila em `data/state.json`. Em produção, um worker separado deve buscar jobs `queued`, executar o motor local/CLI e gravar o resultado.

Motores previstos:
- FFmpeg: montagem, cortes, legendas, trilha, resize, exportação 9:16.
- Qwen / ComfyUI local: imagem e edição quando desejado.
- Motor open source homologado para vídeo.
- Motor de TTS/voz com licença comercial adequada e autorização da pessoa.
- WeasyPrint: PDF/e-book.

A decisão arquitetural é manter esses motores substituíveis. O frontend nunca recebe os comandos internos nem credenciais.
