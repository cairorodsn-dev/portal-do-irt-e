import { describe, expect, it } from 'vitest';
import { formatSerial } from '../src/serial/format';
import { parseSerial } from '../src/serial/parser';
import { PARAMS_V2026_10 } from '../src/params/v2026-10';
import type { RespostasWizard } from '../src/wizard/types';
import { faixaPorRbt12 } from '../src/wizard/faixa';
import { apurarLegadaEfetiva, respostasParaSerial } from '../src/wizard/montarSerial';
import { pacoteParaQuantidade, precoPedido } from '../src/wizard/pacotes';

const LIMITES = PARAMS_V2026_10.simplesFaixas;
const PACOTES = PARAMS_V2026_10.wizard.pacotes;

const BASE: RespostasWizard = {
  tipo: 'B',
  uf: 'MG',
  ibsMunicipal: 0.0935,
  regime: 'R',
  aliquotaLegada: 0.18,
  reducaoBase: 0,
  rho: 0,
  epsilon: 1,
  creditamento: 0,
};

describe('faixaPorRbt12', () => {
  it('resolve as faixas nos limites exatos', () => {
    expect(faixaPorRbt12(0, LIMITES)).toBe(1);
    expect(faixaPorRbt12(180000, LIMITES)).toBe(1);
    expect(faixaPorRbt12(180000.01, LIMITES)).toBe(2);
    expect(faixaPorRbt12(450000, LIMITES)).toBe(3);
    expect(faixaPorRbt12(720000, LIMITES)).toBe(3);
    expect(faixaPorRbt12(720000.01, LIMITES)).toBe(4);
    expect(faixaPorRbt12(1800000, LIMITES)).toBe(4);
    expect(faixaPorRbt12(3600000, LIMITES)).toBe(5);
    expect(faixaPorRbt12(4800000, LIMITES)).toBe(6);
    expect(faixaPorRbt12(99999999, LIMITES)).toBe(6);
  });

  it('rejeita RBT12 inválido', () => {
    expect(() => faixaPorRbt12(-1, LIMITES)).toThrow();
    expect(() => faixaPorRbt12(Number.NaN, LIMITES)).toThrow();
  });
});

describe('apurarLegadaEfetiva', () => {
  it('aplica a redução de base de cálculo', () => {
    expect(apurarLegadaEfetiva({ ...BASE, aliquotaLegada: 0.2, reducaoBase: 0.5 })).toBeCloseTo(0.1);
    expect(apurarLegadaEfetiva({ ...BASE, aliquotaLegada: 0.18, reducaoBase: 0 })).toBe(0.18);
  });
});

describe('respostasParaSerial', () => {
  it('reproduz o exemplo resolvido da gramática (bem, real, MG)', () => {
    const serial = respostasParaSerial(BASE, LIMITES);
    expect(formatSerial(serial)).toBe('IRT-E BR100.000.1800.00.DMG0935-3');
  });

  it('apura ℓ com redução de base de cálculo', () => {
    const serial = respostasParaSerial({ ...BASE, aliquotaLegada: 0.2, reducaoBase: 0.5 }, LIMITES);
    expect(serial.ell).toBeCloseTo(0.1);
  });

  it('mantém o creditamento em P e H e força c = 0 só no Simples puro (U)', () => {
    const p = respostasParaSerial({ ...BASE, regime: 'P', creditamento: 0.5 }, LIMITES);
    expect(p.c).toBe(0.5);
    expect(p.regime).toBe('P');
    const volta = parseSerial(formatSerial(p));
    expect(volta.ok).toBe(true);
    if (volta.ok) expect(volta.serial.c).toBeCloseTo(0.5);
    const h = respostasParaSerial(
      { ...BASE, regime: 'H', anexo: 3, rbt12: 450000, creditamento: 0.9 },
      LIMITES,
    );
    expect(h.c).toBe(0.9);
    expect(h.anexo).toBe(3);
    expect(h.faixa).toBe(3);
    const voltaH = parseSerial(formatSerial(h));
    expect(voltaH.ok).toBe(true);
    if (voltaH.ok) expect(voltaH.serial.c).toBeCloseTo(0.9);
    const u = respostasParaSerial({ ...BASE, regime: 'U' }, LIMITES);
    expect(u.c).toBe(0);
  });

  it('deriva a faixa do RBT12 no híbrido', () => {
    const serial = respostasParaSerial({ ...BASE, regime: 'H', anexo: 1, rbt12: 450000 }, LIMITES);
    expect(serial.faixa).toBe(3);
    expect(formatSerial(serial)).toContain('.A1F3');
  });

  it('Simples puro: sem bloco de destino mesmo se UF informada', () => {
    const serial = respostasParaSerial({ ...BASE, regime: 'U', uf: 'SP' }, LIMITES);
    expect(serial.uf).toBeUndefined();
    expect(serial.ibsMunicipal).toBeUndefined();
    expect(serial.c).toBe(0);
  });

  it('EX: i_M zerado (imunidade de exportação)', () => {
    const serial = respostasParaSerial({ ...BASE, uf: 'EX', ibsMunicipal: 0.0935 }, LIMITES);
    expect(serial.uf).toBe('EX');
    expect(serial.ibsMunicipal).toBe(0);
  });

  it('acumula sufixos IS/PI/ZF em bens', () => {
    const serial = respostasParaSerial({ ...BASE, is: 0.18, ipiBase: 0.1, zfm: 0.05 }, LIMITES);
    const codigo = formatSerial(serial);
    expect(codigo).toContain('.IS1800.PI1000.ZF0500-');
    const deVolta = parseSerial(codigo);
    expect(deVolta.ok).toBe(true);
    if (deVolta.ok) {
      expect(deVolta.serial.is).toBeCloseTo(0.18);
      expect(deVolta.serial.ipiBase).toBeCloseTo(0.1);
      expect(deVolta.serial.zfm).toBeCloseTo(0.05);
    }
  });

  it('rejeita respostas inválidas', () => {
    expect(() => respostasParaSerial({ ...BASE, tipo: 'S', is: 0.1 }, LIMITES)).toThrow(/bens/);
    expect(() => respostasParaSerial({ ...BASE, regime: 'H' }, LIMITES)).toThrow(/Anexo/);
    expect(() => respostasParaSerial({ ...BASE, regime: 'H', anexo: 2 }, LIMITES)).toThrow(/RBT12/);
    expect(() => respostasParaSerial({ ...BASE, epsilon: 10 }, LIMITES)).toThrow(/ε/);
    expect(() => respostasParaSerial({ ...BASE, rho: 1.2 }, LIMITES)).toThrow(/ρ/);
    expect(() => respostasParaSerial({ ...BASE, ibsMunicipal: undefined }, LIMITES)).toThrow(/IBS municipal/);
    expect(() => respostasParaSerial({ ...BASE, creditamento: 1.5 }, LIMITES)).toThrow(/Creditamento/);
    expect(() => respostasParaSerial({ ...BASE, uf: 'XX' }, LIMITES)).toThrow(/UF/);
  });
});

describe('pacotes do wizard', () => {
  it('retorna o menor pacote que comporta a quantidade', () => {
    expect(pacoteParaQuantidade(1, PACOTES)?.id).toBe('ate-3');
    expect(pacoteParaQuantidade(3, PACOTES)?.id).toBe('ate-3');
    expect(pacoteParaQuantidade(4, PACOTES)?.id).toBe('ate-10');
    expect(pacoteParaQuantidade(10, PACOTES)?.id).toBe('ate-10');
    expect(pacoteParaQuantidade(11, PACOTES)?.id).toBe('ate-30');
    expect(pacoteParaQuantidade(30, PACOTES)?.id).toBe('ate-30');
    expect(pacoteParaQuantidade(31, PACOTES)).toBeNull();
    expect(pacoteParaQuantidade(0, PACOTES)).toBeNull();
  });

  it('precoPedido é o preço do pacote', () => {
    expect(precoPedido(PACOTES[0]!)).toBe(25);
  });
});
