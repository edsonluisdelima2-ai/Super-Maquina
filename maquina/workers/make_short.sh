#!/usr/bin/env bash
# Exemplo simples. Em produção, o orquestrador monta os filtros conforme o efeito homologado.
set -e
IN="$1"; OUT="$2"
ffmpeg -y -loop 1 -i "$IN" -t 8 -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p" -r 30 "$OUT"
