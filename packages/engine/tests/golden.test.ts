import { describe, expect, it } from 'vitest';
import { calcularIndice } from '../src/engine/compute';
import { PARAMS_V2026_10 } from '../src/params/v2026-10';
import type { SerialIRTE } from '../src/serial/types';
import fixtureJson from './fixtures/oracle_nominal.json';

/**
 * Golden tests contra a planilha v7. O fixture oracle_nominal.json é gerado por
 * _exploracao/replica.py, que foi validado bit a bit contra os valores cacheados da v7
 * (modo efetivo) antes de aplicar a convenção do portal (DAS pela alíquota nominal da
 * faixa, sem RBT12 — o serial não carrega RBT12). Tolerância zero: igualdade exata de
 * float64 (mesma ordem de operações da v7).
 *
 * Divergências assumidas e documentadas em relação à v7:
 * - sabao-liquido e portaria-recepcao (híbridos): DAS nominal em vez de efetiva;
 * - coluna S6 e timing dos híbridos: idem; a aba Timing da v7 reutiliza o DAS de 2033
 *   em todas as colunas (atalho), enquanto o motor usa a repartição do próprio ano-alvo;
 * - c ampliado a todos os não cumulativos (ICMS e IBS/CBS também depurados por (1−c); em P,
 *   c depura só o ICMS): diverge da v7 em todo caminho com c ≠ 0. O fixture foi regenerado
 *   (replica.py) sob a metodologia revista; os caminhos com c = 0 seguem bit a bit com a v7
 *   (Fase 1 do replica.py só compara esses caminhos).
 */
const fixture = fixtureJson as unknown as {
  t0: number;
  t1: number;
  itens: Array<{
    id: string;
    input: SerialIRTE;
    memoria: Record<string, number>;
    receitaLiquida: number;
    precoBaseSanidade: number;
    precoTeto: number;
    F: number;
    kappa: number;
    irte: number;
    precoReajustado: number;
  }>;
  timing: Array<{ id: string; F: Record<string, number> }>;
  stress: Array<{ id: string; S1: number; S2: number; S3: number; S4: number; S5: number; S6: number }>;
  dashboard: Record<string, number>;
};

const DESTINO_MG = { uf: 'MG', ibsMunicipal: 0.0935 };

/** Traduz um cenário do Stress_Test da v7 para uma entrada do motor. */
function cenario(input: SerialIRTE, s: string): SerialIRTE {
  switch (s) {
    case 'S1':
      return { ...input, c: 0 };
    case 'S2':
      return { ...input, c: 1 };
    case 'S3':
      return { ...input, rho: 0 };
    case 'S4':
      return { ...input, rho: 1 };
    case 'S5': // fora do Simples: PIS 9,25%, sem DAS
      if (input.regime === 'R') return input;
      if (input.regime === 'P') return { ...input, regime: 'R' };
      return { ...input, regime: 'R', ell: 0, c: 0, ...DESTINO_MG, anexo: undefined, faixa: undefined };
    case 'S6': // Simples puro: g = 0
      if (input.regime === 'U') return input;
      if (input.regime === 'H') return { ...input, rho: 1 };
      return { ...input, regime: 'U', uf: undefined, ibsMunicipal: undefined };
    default:
      throw new Error(s);
  }
}

describe('golden tests — 14 itens das matrizes (t0=2026, t1=2033)', () => {
  it.each(fixture.itens.map((i) => [i.id, i] as const))('%s', (_id, item) => {
    const r = calcularIndice(item.input, fixture.t0, fixture.t1, PARAMS_V2026_10);
    expect(r.F).toBe(item.F);
    expect(r.irte).toBe(item.irte);
    expect(r.kappa).toBe(item.kappa);
    expect(r.precoReajustado).toBe(item.precoReajustado);
    for (const [k, v] of Object.entries(item.memoria)) {
      expect(r.memoria[k as keyof typeof r.memoria], `memória ${k}`).toBe(v);
    }
    expect(r.memoria.receitaLiquida).toBe(item.receitaLiquida);
    expect(r.memoria.precoBaseSanidade).toBe(item.precoBaseSanidade);
    expect(r.memoria.precoTeto).toBe(item.precoTeto);
  });
});

describe('golden tests — timing (F por ano-alvo, t0=2026)', () => {
  const porId = new Map(fixture.itens.map((i) => [i.id, i.input]));
  for (const linha of fixture.timing) {
    it(`${linha.id} 2027→2033`, () => {
      const input = porId.get(linha.id)!;
      for (const [ano, esperado] of Object.entries(linha.F)) {
        const r = calcularIndice(input, fixture.t0, Number(ano), PARAMS_V2026_10);
        expect(r.F, `${linha.id} ${ano}`).toBe(esperado);
      }
    });
  }
});

describe('golden tests — vértices do stress test', () => {
  const porId = new Map(fixture.itens.map((i) => [i.id, i.input]));
  for (const linha of fixture.stress) {
    it(linha.id, () => {
      const input = porId.get(linha.id)!;
      for (const s of ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'] as const) {
        const r = calcularIndice(cenario(input, s), fixture.t0, fixture.t1, PARAMS_V2026_10);
        expect(r.F, `${linha.id} ${s}`).toBe(linha[s]);
      }
    });
  }
});

describe('golden tests — agregados do contrato (Dashboard)', () => {
  it('reproduz os totais ponderados', () => {
    const rs = fixture.itens.map((i) => calcularIndice(i.input, fixture.t0, fixture.t1, PARAMS_V2026_10));
    const somaT0 = rs.reduce((a, r) => a + r.memoria.precoBaseSanidade, 0);
    const somaT1 = rs.reduce((a, r) => a + r.memoria.precoTeto, 0);
    const somaReaj = rs.reduce((a, r) => a + r.precoReajustado, 0);
    const mediaF = (fatia: typeof rs) => fatia.reduce((a, r) => a + r.F, 0) / fatia.length;
    expect(mediaF(rs.slice(0, 8))).toBe(fixture.dashboard.FMedioProdutos);
    expect(mediaF(rs.slice(8))).toBe(fixture.dashboard.FMedioServicos);
    expect(somaT0).toBe(fixture.dashboard.somaPrecosT0);
    expect(somaT1).toBe(fixture.dashboard.somaPrecosT1);
    expect(somaT1 / somaT0).toBe(fixture.dashboard.FPonderado);
    expect(somaReaj).toBe(fixture.dashboard.somaPrecosReajustados);
    expect(somaReaj / somaT0).toBe(fixture.dashboard.IRTEPonderado);
  });
});

describe('motor — comportamentos de borda', () => {
  const base: SerialIRTE = {
    tipo: 'B', regime: 'R', epsilon: 1, rho: 0, ell: 0.18, c: 0, ...DESTINO_MG,
  };

  it('destino EX (imunidade de exportação): g = 0', () => {
    const r = calcularIndice({ ...base, uf: 'EX', ibsMunicipal: 0 }, 2026, 2033, PARAMS_V2026_10);
    expect(r.memoria.g0).toBe(0);
    expect(r.memoria.g1).toBe(0);
    expect(r.F).toBeCloseTo(1 - 0.18 - 0.0925, 12);
  });

  it('t0 < 2026: regime legado pleno no ano-base', () => {
    const r = calcularIndice(base, 2024, 2033, PARAMS_V2026_10);
    expect(r.memoria.g0).toBe(0);
    expect(r.memoria.b0).toBe(0.18 + 0.0925);
    const r2026 = calcularIndice(base, 2026, 2033, PARAMS_V2026_10);
    expect(r.F).toBe(r2026.F);
  });

  it('Simples puro: F = 1 para qualquer período', () => {
    const u: SerialIRTE = { tipo: 'S', regime: 'U', epsilon: 0.5, rho: 0, ell: 0, c: 0 };
    for (const t1 of [2027, 2029, 2033]) {
      expect(calcularIndice(u, 2026, t1, PARAMS_V2026_10).F).toBe(1);
    }
  });

  it('rejeita t1 <= t0 e regime H sem anexo/faixa', () => {
    expect(() => calcularIndice(base, 2033, 2033, PARAMS_V2026_10)).toThrow();
    expect(() =>
      calcularIndice({ ...base, regime: 'H', anexo: undefined }, 2026, 2033, PARAMS_V2026_10),
    ).toThrow();
  });

  it('toda saída carrega versão dos parâmetros, versão do motor e flag de estimativa', () => {
    const r = calcularIndice(base, 2026, 2033, PARAMS_V2026_10);
    expect(r.versaoParametros).toBe(PARAMS_V2026_10.versao);
    expect(r.versaoMotor).toBeTruthy();
    expect(r.parametrosEstimados).toBe(true);
  });
});
