"""Réplica-oráculo da planilha v7 (Matriz_Produtos + Matriz_Serviços + Stress_Test + Timing + Dashboard).

Fase 1 (modo 'efetivo'): reproduz a planilha com DAS efetiva (parcela a deduzir / RBT12=450000)
e valida contra os valores cacheados extraídos da v7 (tolerância: diferença absoluta == 0 ou <= 1e-9).
Fase 2 (modo 'nominal'): convenção do portal — DAS pela alíquota nominal da faixa (sem RBT12);
regime U com d=0 (semântica do motor: F=1 por construção). Gera tests/fixtures/oracle_nominal.json.

Mudança metodológica (04/10/2026): o fator c ampliou-se de "crédito de PIS/Cofins do lucro real"
para "crédito de todos os tributos não cumulativos" — ICMS (R e P), PIS/Cofins (só R) e IBS/CBS
(destino). A Fase 1 só compara bit a bit com a v7 os caminhos de c efetivo = 0; os caminhos com
c ≠ 0 divergem da v7 por design e são reportados, não falham.
"""
import csv
import json
import sys

# --- Parâmetros v7 (aba Parâmetros) ---
L6 = L7 = 0.0935          # IBS estadual (MG) e municipal (BH) brutos
L8 = 0.0921               # CBS bruta
TETO = 0.265
FATOR_TETO = min(1, TETO / (L6 + L7 + L8))
D6 = L6 * FATOR_TETO
D7 = L7 * FATOR_TETO
D8 = L8 * FATOR_TETO

FIBS = {2026: 0.001 / (D6 + D7), 2027: 0.0053, 2028: 0.0053, 2029: 0.1,
        2030: 0.2, 2031: 0.3, 2032: 0.4, 2033: 1}
FCBS = {2026: 0.009 / D8, 2027: (D8 - 0.001) / D8, 2028: (D8 - 0.001) / D8,
        2029: 1, 2030: 1, 2031: 1, 2032: 1, 2033: 1}
FLEG = {2026: 1, 2027: 1, 2028: 1, 2029: 0.9, 2030: 0.8, 2031: 0.7, 2032: 0.6, 2033: 0}
FPIS = {2026: 1, 2027: 0, 2028: 0, 2029: 0, 2030: 0, 2031: 0, 2032: 0, 2033: 0}
FIPI = {2026: 1, 2027: 0, 2028: 0, 2029: 0, 2030: 0, 2031: 0, 2032: 0, 2033: 0}

PIS = {'R': 0.0925, 'P': 0.0365}

# --- Tabela do Simples (CSV extraído da aba Simples_Tabelas) ---
ANEXOS = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5}
SIMPLES = {}
with open('_exploracao/simples_tabelas.csv', encoding='utf-8-sig') as f:
    for r in csv.DictReader(f, delimiter=';'):
        if r['Anexo'].strip() not in ANEXOS:
            continue
        try:
            ano = int(r['Ano']); faixa = int(r['Faixa'])
        except ValueError:
            continue
        def num(c):
            v = (r[c] or '').strip()
            return float(v) if v else None
        SIMPLES[(ANEXOS[r['Anexo'].strip()], ano, faixa)] = {
            'nom': num('AliqNom_pct'), 'parc': num('ParcelaDeduzir_R$'),
            'irpj': num('IRPJ_pct'), 'csll': num('CSLL_pct'), 'cpp': num('CPP_pct'),
            'cbs': num('CBS_pct'), 'icms_iss': num('ICMS_ISS_pct'),
            'ipi': num('IPI_pct'), 'ibs': num('IBS_pct'),
        }

# Inputs do fornecedor Simples na v7: Anexo III, RBT12 = 450000 -> faixa 3
ANEXO_FORN, FAIXA_FORN, RBT12 = 3, 3, 450000

def ano_tab(ano):
    return min(max(ano, 2026), 2033)

def das_cheia(ano, modo):
    row = SIMPLES[(ANEXO_FORN, ano_tab(ano), FAIXA_FORN)]
    if modo == 'efetivo':
        return max(row['nom'] - row['parc'] / RBT12 * 100, 0) / 100
    return row['nom'] / 100

def d_simples(ano, hibrido, modo):
    """DAS por dentro. U: DAS cheio. H: cheio até 2026; depois DAS x (restante + ICMS/ISS)/100."""
    cheia = das_cheia(ano, modo)
    if not hibrido or ano <= 2026:
        return cheia
    row = SIMPLES[(ANEXO_FORN, ano_tab(ano), FAIXA_FORN)]
    restante = row['irpj'] + row['csll'] + row['cpp'] + row['ipi']
    return cheia * (restante + row['icms_iss']) / 100

# --- Itens (linhas das matrizes) ---
def item(id, tipo, regime, eps, rho, ell, c, ipi=0.0, is_=0.0):
    return dict(id=id, tipo=tipo, regime=regime, eps=eps, rho=rho, ell=ell, c=c, ipi=ipi, is_=is_)

ITENS = [
    item('papel-higienico', 'B', 'R', 2, 0.6, 0.18, 0.6),
    item('papel-a4', 'B', 'R', 2, 0.0, 0.18, 0.55),
    item('alcool-70', 'B', 'U', 2, 0.0, 0.0, 0.0),
    item('caneta', 'B', 'P', 2, 0.0, 0.18, 0.0, ipi=0.1),
    item('cartucho-toner', 'B', 'R', 2, 0.0, 0.18, 0.5),
    item('sabao-liquido', 'B', 'H', 2, 0.6, 0.0, 0.0),
    item('cafe', 'B', 'R', 2, 1.0, 0.07, 0.5),
    item('copo-descartavel', 'B', 'P', 2, 0.0, 0.18, 0.0, ipi=0.065),
    item('vigilancia', 'S', 'R', 0.5, 0.0, 0.05, 0.2),
    item('limpeza', 'S', 'R', 0.5, 0.0, 0.05, 0.25),
    item('manutencao-predial', 'S', 'P', 0.5, 0.0, 0.05, 0.0),
    item('suporte-ti', 'S', 'U', 0.5, 0.0, 0.0, 0.0),
    item('assessoria-contabil', 'S', 'P', 0.5, 0.3, 0.05, 0.0),
    item('portaria-recepcao', 'S', 'H', 0.5, 0.0, 0.0, 0.0),
]
PRODUTOS = ITENS[:8]
SERVICOS = ITENS[8:]

def calc(it, t1, modo, ov=None):
    """Cadeia completa da v7 para t0=2026. ov: overrides de cenário (stress)."""
    ov = ov or {}
    t0 = 2026
    regime = ov.get('regime', it['regime'])
    rho = ov.get('rho', it['rho'])
    c = ov.get('c', it['c'])
    simples = regime in ('H', 'U')
    ell = it['ell'] if ov.get('ell_keep') else (0 if simples else it['ell'])
    if 'ell' in ov:
        ell = ov['ell']
    pis = 0.0 if ov.get('pis_zero') else PIS.get(regime, 0.0)
    c_pis = c if regime == 'R' else 0.0  # PIS/Cofins só admite crédito no lucro real

    # g
    if regime == 'U' or ov.get('g_zero'):
        g0 = g1 = 0.0
    else:
        g0 = 0.0  # t0 = 2026 (ensaio compensável)
        g1 = ((D6 + D7) * (1 - rho) * FIBS[ano_tab(t1)] + D8 * (1 - rho) * FCBS[ano_tab(t1)]) * (1 - 0) * (1 - c)

    # h (IPI t1 = 0 em todos os itens; IS = 0)
    h0 = it['ipi'] * FIPI[ano_tab(t0)] + it['is_'] * 1
    h1 = 0.0 * FIPI[ano_tab(t1)] + it['is_'] * 1

    # b
    b0 = ell * (1 - c) * FLEG[ano_tab(t0)] + pis * (1 - c_pis) * FPIS[ano_tab(t0)]
    b1 = ell * (1 - c) * FLEG[ano_tab(t1)] + pis * (1 - c_pis) * FPIS[ano_tab(t1)]

    # d
    if regime in ('R', 'P') or ov.get('d_zero'):
        d0 = d1 = 0.0
    elif regime == 'U' and modo == 'nominal':
        d0 = d1 = 0.0  # semântica do motor: F = 1 por construção (sem Anexo/Faixa no serial U)
    else:
        d0 = d_simples(t0, regime == 'H', modo)
        d1 = d_simples(t1, regime == 'H', modo)
    if ov.get('d1_fixo') is not None:
        d1 = ov['d1_fixo']  # aba Timing da v7 reutiliza o DAS de t1=2033 em todas as colunas

    R = 100 / (1 + g0 + h0) * (1 - ell * (1 - c) - pis * (1 - c_pis) - d0)
    V = R * (1 + g0 + h0) / (1 - b0 - d0)
    Z = R * (1 + g1 + h1) / (1 - b1 - d1)
    F = Z / V
    kappa = it['eps'] / (1 + it['eps'])
    irte = 1 + kappa * (F - 1)
    return dict(g0=g0, h0=h0, b0=b0, d0=d0, g1=g1, h1=h1, b1=b1, d1=d1,
                R=R, V=V, Z=Z, F=F, kappa=kappa, irte=irte, precoReaj=V * irte)

# --- Cenários do Stress_Test (mapeamento decodificado das fórmulas inline da v7) ---
def cenario(it, s):
    r = it['regime']
    if s == 'S1':
        return {'c': 0.0}
    if s == 'S2':
        return {'c': 1.0}
    if s == 'S3':
        return {'rho': 0.0}
    if s == 'S4':
        return {'rho': 1.0}
    if s == 'S5':  # fora do Simples: PIS 9,25% (inclusive para P), sem DAS; Simples perde ℓ
        if r == 'R':
            return {}
        if r == 'P':
            return {'regime': 'R'}
        return {'regime': 'R', 'ell': 0.0}
    if s == 'S6':  # Simples puro: g=0; R/P mantêm ℓ e h; H mantém d do híbrido
        if r == 'U':
            return {}
        if r == 'H':
            return {'g_zero': True}
        return {'g_zero': True, 'pis_zero': True, 'd_zero': True, 'ell_keep': True}
    raise ValueError(s)

# --- Valores cacheados da v7 (extraídos por repr dos floats) ---
ESP_F = {
    'papel-higienico': 0.865998, 'papel-a4': 0.984644375, 'alcool-70': 1,
    'caneta': 0.901025, 'cartucho-toner': 0.97879375, 'sabao-liquido': 1.05130935713446,
    'cafe': 0.88375, 'copo-descartavel': 0.930636150234742,
    'vigilancia': 1.10814, 'limpeza': 1.113990625, 'manutencao-predial': 1.1555775,
    'suporte-ti': 1, 'assessoria-contabil': 1.08295425, 'portaria-recepcao': 1.20244695910949,
}
ESP_IRTE = {
    'papel-higienico': 0.910665333333333, 'papel-a4': 0.989762916666667, 'alcool-70': 1,
    'caneta': 0.934016666666667, 'cartucho-toner': 0.9858625, 'sabao-liquido': 1.03420623808964,
    'cafe': 0.9225, 'copo-descartavel': 0.953757433489828,
    'vigilancia': 1.03604666666667, 'limpeza': 1.037996875, 'manutencao-predial': 1.05185916666667,
    'suporte-ti': 1, 'assessoria-contabil': 1.02765141666667, 'portaria-recepcao': 1.06748231970316,
}
ESP_RZ = {
    'papel-higienico': (78.3, 86.5998), 'papel-a4': (77.8375, 98.4644375),
    'alcool-70': (90.42, 100), 'caneta': (71.2272727272727, 90.1025),
    'cartucho-toner': (77.375, 97.879375), 'sabao-liquido': (90.42, 105.130935713446),
    'cafe': (88.375, 88.375), 'copo-descartavel': (73.5680751173709, 93.0636150234742),
    'vigilancia': (87.6, 110.814), 'limpeza': (88.0625, 111.3990625),
    'manutencao-predial': (91.35, 115.55775), 'suporte-ti': (90.42, 100),
    'assessoria-contabil': (91.35, 108.295425), 'portaria-recepcao': (90.42, 120.244695910949),
}
ESP_STRESS = {
    'papel-higienico': [0.804615, 0.90692, 0.990495, 0.783, 0.865998, 0.82],
    'papel-a4': [0.9202875, 1.0373, 0.984644375, 0.778375, 0.984644375, 0.82],
    'alcool-70': [1, 1, 1, 1, 1.1479875, 1],
    'caneta': [0.901025, 0.943, 0.901025, 0.712272727272727, 0.836625, 0.745454545454546],
    'cartucho-toner': [0.9202875, 1.0373, 0.97879375, 0.77375, 0.97879375, 0.82],
    'sabao-liquido': [1.05130935713446, 1.05130935713446, 1.20244695910949, 0.950550955817778, 1.003695, 0.950550955817778],
    'cafe': [0.8375, 0.93, 1.11794375, 0.88375, 0.88375, 0.93],
    'copo-descartavel': [0.930636150234742, 0.973990610328639, 0.930636150234742, 0.735680751173709, 0.864119718309859, 0.769953051643193],
    'vigilancia': [1.0847375, 1.20175, 1.10814, 0.876, 1.10814, 0.95],
    'limpeza': [1.0847375, 1.20175, 1.113990625, 0.880625, 1.113990625, 0.95],
    'manutencao-predial': [1.1555775, 1.20175, 1.1555775, 0.9135, 1.0847375, 0.95],
    'suporte-ti': [1, 1, 1, 1, 1.1479875, 1],
    'assessoria-contabil': [1.08295425, 1.126225, 1.1555775, 0.9135, 1.01656625, 0.95],
    'portaria-recepcao': [1.20244695910949, 1.20244695910949, 1.20244695910949, 0.950550955817778, 1.1479875, 0.950550955817778],
}
ESP_TIMING = {  # F por ano-alvo 2027..2033 (2028 = 2027 na v7)
    'papel-higienico': [0.988256071334691, 0.988256071334691, 0.973686638521877, 0.959708362493596, 0.946305850695313, 0.933444247444942, 0.865998],
    'papel-a4': [1.03218997060483, 1.03218997060483, 1.02656556853815, 1.02112408443403, 1.0159067346866, 1.01089995062404, 0.984644375],
    'alcool-70': [1, 1, 1, 1, 1, 1, 1],
    'caneta': [0.944532860672886, 0.944532860672886, 0.939386102106242, 0.934406727481859, 0.929632452956422, 0.925050862156226, 0.901025],
    'cartucho-toner': [1.02605683604366, 1.02605683604366, 1.02046585342077, 1.0150567018864, 1.0098703529324, 1.00489331851017, 0.97879375],
    'sabao-liquido': [0.983777723657635, 0.983777723657635, 0.990551066408565, 0.997301987600331, 1.0040529087921, 1.01080382998386, 1.05130935713446],
    'cafe': [0.950268817204301, 0.950268817204301, 0.943169690501601, 0.936175847457627, 0.929284963196635, 0.92249478079332, 0.88375],
    'copo-descartavel': [0.97557384670439, 0.97557384670439, 0.970257945837433, 0.96511492979347, 0.96018375422729, 0.955451594715351, 0.930636150234742],
    'vigilancia': [1.00268636540006, 1.00268636540006, 1.0137773133914, 1.02469892063776, 1.03550735060697, 1.04620435346308, 1.10814],
    'limpeza': [1.00798022891602, 1.00798022891602, 1.01912973356769, 1.0301090034094, 1.04097449843409, 1.05172797804615, 1.113990625],
    'manutencao-predial': [1.04560958309698, 1.04560958309698, 1.05717531482082, 1.06856445662397, 1.07983557623226, 1.09099049873119, 1.1555775],
    'suporte-ti': [1, 1, 1, 1, 1, 1, 1],
    'assessoria-contabil': [1.02040039237842, 1.02040039237842, 1.02698607115992, 1.03346386963678, 1.03987454066828, 1.04621912230771, 1.08295425],
    'portaria-recepcao': [1.03361787541742, 1.03361787541742, 1.05055123229475, 1.06742853527416, 1.08430583825358, 1.10118314123299, 1.20244695910949],
}
ESP_DASH = dict(FMedioProdutos=0.949519579046151, FMedioServicos=1.11051822235158,
                somaPrecosT0=1400, somaPrecosT1=1425.92659664787, FPonderado=1.01851899760562,
                somaPrecosReajustados=1395.18075329493, IRTEPonderado=0.99655768092495)

ANOS_TIMING = [2027, 2028, 2029, 2030, 2031, 2032, 2033]

def soma_ingenua(valores):
    """Soma esquerda-a-direita sem compensação (equivale ao reduce do JS; o sum() do
    Python 3.12+ usa Neumaier e divergiria em ulps)."""
    s = 0.0
    for v in valores:
        s += v
    return s

def agregados(resultados):
    Fs = {r[0]['id']: r[1] for r in resultados}
    somaT0 = soma_ingenua(r[1]['V'] for r in resultados)
    somaT1 = soma_ingenua(r[1]['Z'] for r in resultados)
    somaReaj = soma_ingenua(r[1]['precoReaj'] for r in resultados)
    return dict(
        FMedioProdutos=soma_ingenua(Fs[i['id']]['F'] for i in PRODUTOS) / len(PRODUTOS),
        FMedioServicos=soma_ingenua(Fs[i['id']]['F'] for i in SERVICOS) / len(SERVICOS),
        somaPrecosT0=somaT0, somaPrecosT1=somaT1, FPonderado=somaT1 / somaT0,
        somaPrecosReajustados=somaReaj, IRTEPonderado=somaReaj / somaT0,
    )

def maxdif(pares):
    return max((abs(a - b) for a, b in pares), default=0.0)

# ================= FASE 1 — validação contra a v7 (modo efetivo) =================
# Com a revisão do fator c, a réplica só fecha bit a bit com a v7 nos caminhos de c efetivo = 0;
# caminhos com c ≠ 0 (itens com crédito e cenário S2) divergem por design e são reportados.
diffs = {'itens': [], 'stress': [], 'timing': []}
pulados = []
res_ef = {}
for it in ITENS:
    r = calc(it, 2033, 'efetivo')
    res_ef[it['id']] = r
    if it['c'] == 0.0:
        diffs['itens'] += [(r['F'], ESP_F[it['id']]), (r['irte'], ESP_IRTE[it['id']]),
                           (r['R'], ESP_RZ[it['id']][0]), (r['Z'], ESP_RZ[it['id']][1])]
    else:
        pulados.append(f"itens/{it['id']} (c={it['c']})")
    for i, s in enumerate(['S1', 'S2', 'S3', 'S4', 'S5', 'S6']):
        ov = cenario(it, s)
        if ov.get('c', it['c']) != 0.0:
            pulados.append(f"stress/{it['id']} {s} (c={ov.get('c', it['c'])})")
            continue
        diffs['stress'].append((calc(it, 2033, 'efetivo', ov)['F'], ESP_STRESS[it['id']][i]))
    for i, ano in enumerate(ANOS_TIMING):
        if it['c'] != 0.0:
            pulados.append(f"timing/{it['id']} {ano}")
            continue
        ov = {}
        if it['regime'] == 'H':
            ov = {'d1_fixo': d_simples(2033, True, 'efetivo')}  # Timing da v7 usa o DAS de t1=2033 fixo
        diffs['timing'].append((calc(it, ano, 'efetivo', ov)['F'], ESP_TIMING[it['id']][i]))

print('FASE 1 — divergência máxima vs v7 (modo efetivo, caminhos com c = 0):')
ok = True
for k, pares in diffs.items():
    m = maxdif(pares)
    print(f'  {k}: {m:.3e}')
    if m > 1e-9:
        ok = False
print(f'  comparações puladas (c != 0, divergência metodológica assumida): {len(pulados)}')
if not ok:
    print('FALHA: réplica não fecha com a planilha nos caminhos c = 0.')
    sys.exit(1)

# ================= FASE 2 — modo nominal (convenção do portal) =================
res_nom = {it['id']: calc(it, 2033, 'nominal') for it in ITENS}

print('\nFASE 2 — sanity checks (modo nominal):')
assert res_nom['alcool-70']['F'] == 1 and res_nom['suporte-ti']['F'] == 1, 'U deve dar F=1'
nao_simples = [it for it in ITENS if it['regime'] in ('R', 'P')]
identicos = all(res_nom[it['id']]['F'] == res_ef[it['id']]['F'] for it in nao_simples)
print(f'  12 itens R/P idênticos ao modo efetivo: {identicos}')
for id_ in ('sabao-liquido', 'portaria-recepcao'):
    print(f"  {id_}: F {res_ef[id_]['F']} -> {res_nom[id_]['F']} | IRT-E {res_ef[id_]['irte']} -> {res_nom[id_]['irte']}")

def entrada_motor(it):
    e = {'tipo': it['tipo'], 'regime': it['regime'], 'epsilon': it['eps'],
         'rho': it['rho'], 'ell': it['ell'], 'c': it['c']}
    if it['regime'] != 'U':
        e['uf'] = 'MG'; e['ibsMunicipal'] = 0.0935
    if it['regime'] == 'H':
        e['anexo'] = ANEXO_FORN; e['faixa'] = FAIXA_FORN
    if it['ipi']:
        e['ipiBase'] = it['ipi']
    if it['is_']:
        e['is'] = it['is_']
    return e

fixture = {'convencao': 'das-nominal + c-todos-nao-cumulativos', 't0': 2026, 't1': 2033, 'itens': [], 'timing': [], 'stress': [],
           'dashboard': agregados([(it, res_nom[it['id']]) for it in ITENS])}
for it in ITENS:
    r = res_nom[it['id']]
    fixture['itens'].append({
        'id': it['id'], 'input': entrada_motor(it),
        'memoria': {k: r[k] for k in ('g0', 'h0', 'b0', 'd0', 'g1', 'h1', 'b1', 'd1')},
        'receitaLiquida': r['R'], 'precoBaseSanidade': r['V'], 'precoTeto': r['Z'],
        'F': r['F'], 'kappa': r['kappa'], 'irte': r['irte'], 'precoReajustado': r['precoReaj'],
    })
    fixture['timing'].append({'id': it['id'],
                              'F': {str(a): calc(it, a, 'nominal')['F'] for a in ANOS_TIMING}})
    fixture['stress'].append({'id': it['id'], **{
        s: calc(it, 2033, 'nominal', cenario(it, s))['F'] for s in ('S1', 'S2', 'S3', 'S4', 'S5', 'S6')}})

with open('packages/engine/tests/fixtures/oracle_nominal.json', 'w', encoding='utf-8', newline='\n') as f:
    json.dump(fixture, f, ensure_ascii=False, indent=1)

print('\nDashboard (nominal):')
for k, v in fixture['dashboard'].items():
    print(f'  {k}: {v} (efetivo: {ESP_DASH[k]})')
print('\nS6 (nominal):', {s['id']: s['S6'] for s in fixture['stress'] if s['S6'] != ESP_STRESS[s['id']][5]})
print('\nFixture gravado em packages/engine/tests/fixtures/oracle_nominal.json')
