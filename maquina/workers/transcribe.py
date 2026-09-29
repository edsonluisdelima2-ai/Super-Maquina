"""Local transcription worker: reads audio, writes new derived files only."""
import argparse
import json
import os
from pathlib import Path

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--audio', required=True)
    p.add_argument('--out', required=True)
    p.add_argument('--models', required=True)
    p.add_argument('--model', default='small')
    args = p.parse_args()
    from faster_whisper import WhisperModel
    local_model = Path(args.models) / args.model
    if not (local_model / 'model.bin').exists():
        raise SystemExit('MODELO_AUSENTE: instale a transcrição local no Editor de Vídeo antes de processar este arquivo.')
    model = WhisperModel(str(local_model), device='cpu', compute_type='int8')
    segments, info = model.transcribe(args.audio, language='pt', word_timestamps=True, vad_filter=True)
    result = {'engine': 'faster-whisper', 'model': args.model, 'language': 'pt', 'duration': info.duration, 'segments': []}
    for s in segments:
        result['segments'].append({'start': s.start, 'end': s.end, 'text': s.text.strip(), 'words': [
            {'start': w.start, 'end': w.end, 'word': w.word, 'probability': w.probability} for w in (s.words or [])]})
        print(json.dumps({'seconds': round(s.end, 1), 'duration': info.duration}), flush=True)
    target = Path(args.out)
    temp = target.with_suffix('.tmp')
    temp.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    os.replace(temp, target)

if __name__ == '__main__':
    main()
