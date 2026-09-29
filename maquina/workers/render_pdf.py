#!/usr/bin/env python3
import sys, pathlib
from weasyprint import HTML
if len(sys.argv)<3:
 print('uso: render_pdf.py entrada.html saida.pdf'); raise SystemExit(2)
HTML(filename=sys.argv[1]).write_pdf(sys.argv[2])
print(sys.argv[2])
