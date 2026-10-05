import { describe, expect, it } from 'vitest';
import { consultarSerie } from '../src/consulta';
import { calcularIndice } from '../src/engine/compute';
import { PARAMS_V2026_10 } from '../src/params/v2026-10';
import { formatSerial } from '../src/serial/format';
import type { SerialIRTE } from '../src/serial/types';

const DESTINO_MG = { uf: 'MG', ibsMunicipal: 0.0935 };

describe('consultarSerie', () => {
  it('resolve a série BR ε=1 ρ=0 ℓ=18% c=0 para todos os períodos 2026→2027…2033', () => {
    const serial: SerialIRTE = {
      tipo: 'B', regime: 'R', epsilon: 1, rho: 0, ell: 0.18, c: 0, ...DESTINO_MG,
    };
    const r = consultarSerie(formatSerial(serial), PARAMS_V2026_10);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.periodos.map((p) => p.t1)).toEqual([2027, 2028, 2029, 2030, 2031, 2032, 2033]);
    for (const p of r.periodos) {
      const direto = calcularIndice(serial, 2026, p.t1, PARAMS_V2026_10);
      expect(p.F).toBe(direto.F);
      expect(p.irte).toBe(direto.irte);
    }
    expect(r.parametros).toMatchObject({ cbs: 0.0921, teto: 0.265, ibsEstadual: 0.0935, ibsMunicipal: 0.0935 });
    expect(r.parametros.ufEstimativa).toBe(true);
    expect(r.versaoParametros).toBe(PARAMS_V2026_10.versao);
    expect(r.parametrosEstimados).toBe(true);
  });

  it('série BU (Simples puro): IRT-E constante 1 em todos os períodos', () => {
    const r = consultarSerie('IRT-E BU000.000.0000.00-4', PARAMS_V2026_10);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.periodos).toHaveLength(7);
    for (const p of r.periodos) {
      expect(p.F).toBe(1);
      expect(p.irte).toBe(1);
    }
  });

  it('vértice ρ=100%: F reflete só a extinção da carga legada', () => {
    const serial: SerialIRTE = {
      tipo: 'B', regime: 'R', epsilon: 1, rho: 1, ell: 0.18, c: 0, ...DESTINO_MG,
    };
    const r = consultarSerie(formatSerial(serial), PARAMS_V2026_10);
    if (!r.ok) throw new Error('série inválida');
    const ultimo = r.periodos.at(-1)!;
    expect(ultimo.F).toBeCloseTo(1 - 0.18 - 0.0925, 12);
    expect(ultimo.irte).toBeGreaterThan(ultimo.F); // κ < 1 ⇒ IRT-E entre 1 e F
  });

  it('rejeita dv incorreto sem calcular nada', () => {
    const r = consultarSerie('IRT-E BR100.000.1800.00.DMG0935-4', PARAMS_V2026_10);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.join()).toMatch(/Dígito verificador/);
  });

  it('aceita ano-base anterior a 2026 (regime legado pleno)', () => {
    const serial: SerialIRTE = {
      tipo: 'S', regime: 'P', epsilon: 1, rho: 0, ell: 0.05, c: 0, ...DESTINO_MG,
    };
    const r = consultarSerie(formatSerial(serial), PARAMS_V2026_10, 2024);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.periodos[0]).toMatchObject({ t0: 2024, t1: 2025 });
    expect(r.periodos.at(-1)!.t1).toBe(2033);
  });

  it('rejeita ano-base inválido', () => {
    expect(() => consultarSerie('IRT-E BU000.000.0000.00-4', PARAMS_V2026_10, 2033)).toThrow();
  });
});
