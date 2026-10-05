"""Gera packages/engine/src/params/v2026-10/simples.ts a partir de simples_tabelas.csv."""
import csv
import io
import sys

ANEXOS = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5}
COLS_REPART = ['IRPJ_pct', 'CSLL_pct', 'CPP_pct', 'CBS_pct', 'ICMS_ISS_pct', 'IPI_pct', 'IBS_pct']

def num(s):
    s = (s or '').strip()
    return float(s) if s else None

def fmt(v):
    if v == int(v):
        return str(int(v))
    return repr(v)

rows = []
with open('_exploracao/simples_tabelas.csv', encoding='utf-8-sig') as f:
    for r in csv.DictReader(f, delimiter=';'):
        anexo = ANEXOS.get((r['Anexo'] or '').strip())
        try:
            ano = int(r['Ano']); faixa = int(r['Faixa'])
        except (TypeError, ValueError):
            continue
        if anexo is None:
            continue
        aliq = num(r['AliqNom_pct']); parcela = num(r['ParcelaDeduzir_R$'])
        repart = {c: num(r[c]) for c in COLS_REPART}
        tem_repart = any(v is not None for v in repart.values())
        rows.append((anexo, ano, faixa, aliq, parcela, repart if tem_repart else None))

erros = []
if len(rows) != 240:
    erros.append(f'esperadas 240 linhas, lidas {len(rows)}')
vistos = set()
nulos = 0
for anexo, ano, faixa, aliq, parcela, repart in rows:
    chave = (anexo, ano, faixa)
    if chave in vistos:
        erros.append(f'duplicada: {chave}')
    vistos.add(chave)
    if aliq is None or parcela is None:
        erros.append(f'aliquota/parcela ausente em {chave}')
    if repart is None:
        nulos += 1
    else:
        soma = sum(v for v in repart.values() if v is not None)
        if abs(soma - 100) > 0.01:
            erros.append(f'reparticao soma {soma} em {chave}')

linhas_ts = []
for anexo, ano, faixa, aliq, parcela, repart in rows:
    if repart is None:
        rep = 'null'
    else:
        rep = ('{ irpj: %s, csll: %s, cpp: %s, cbs: %s, icmsIss: %s, ipi: %s, ibs: %s }'
               % tuple(fmt(repart[c]) for c in COLS_REPART))
    linhas_ts.append(
        f'  {{ anexo: {anexo}, ano: {ano}, faixa: {faixa}, '
        f'aliquotaNominal: {fmt(aliq)}, parcelaDeduzir: {fmt(parcela)}, reparticao: {rep} }},')

saida = '''/** Tabela do Simples Nacional — Anexos I–V (XVIII–XXII da LC 214/2025) x 2026–2033 x 6 faixas.
 * Gerado de _exploracao/simples_tabelas.csv (aba Simples_Tabelas da planilha v7) por
 * _exploracao/gera_simples_ts.py. Valores em PONTOS PERCENTUAIS (escala da planilha);
 * reparticao null no bloco 2026 (Simples ainda unificado).
 */
export interface SimplesRow {
  anexo: 1 | 2 | 3 | 4 | 5;
  ano: number;
  faixa: 1 | 2 | 3 | 4 | 5 | 6;
  aliquotaNominal: number;
  parcelaDeduzir: number;
  reparticao: {
    irpj: number;
    csll: number;
    cpp: number;
    cbs: number;
    icmsIss: number;
    ipi: number;
    ibs: number;
  } | null;
}

export const SIMPLES_TABELAS: SimplesRow[] = [
''' + '\n'.join(linhas_ts) + '\n];\n'

with open('packages/engine/src/params/v2026-10/simples.ts', 'w', encoding='utf-8', newline='\n') as f:
    f.write(saida)

print(f'linhas: {len(rows)}; reparticao null: {nulos}')
if erros:
    print('ERROS:')
    for e in erros:
        print(' -', e)
    sys.exit(1)
print('OK')
