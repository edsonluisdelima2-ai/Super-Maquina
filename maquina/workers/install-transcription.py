"""Instala explicitamente o modelo local de transcrição escolhido pelo usuário."""
import argparse
import json
from pathlib import Path
from faster_whisper.utils import download_model

p=argparse.ArgumentParser()
p.add_argument('--models',required=True)
p.add_argument('--model',default='small',choices=['small','medium'])
args=p.parse_args()
target=Path(args.models)/args.model
target.mkdir(parents=True,exist_ok=True)
print(json.dumps({'stage':'download_started','model':args.model}), flush=True)
download_model(args.model,output_dir=str(target))
model_file=target/'model.bin'
if not model_file.is_file() or model_file.stat().st_size < 1024 * 1024:
    raise SystemExit('MODELO_INCOMPLETO: o download terminou sem um model.bin válido.')
print(json.dumps({'stage':'ready','model':args.model,'bytes':model_file.stat().st_size}), flush=True)
