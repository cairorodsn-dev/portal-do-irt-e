import { describe, expect, it } from 'vitest';
import { formatSerial } from '../src/serial/format';
import { parseSerial } from '../src/serial/parser';
import type { SerialIRTE } from '../src/serial/types';

// Exemplos resolvidos da gramática v1 (IRT-E_Serializacao_v1.md, seção 4)
const EXEMPLOS = [
  'IRT-E BR100.000.1800.00.DMG0935-3',
  'IRT-E SP100.000.0500.00.DMG0935-4',
  'IRT-E BH075.060.1800.00.DMG0935.A1F4-1',
  'IRT-E BR200.000.1800.00.DMG0935.IS1800-0',
  'IRT-E BR100.000.1800.00.DMG0935.PI1000.ZF0500-3',
  'IRT-E BU000.000.0000.00-4',
];

describe('parseSerial — exemplos da gramática v1', () => {
  it.each(EXEMPLOS)('aceita e valida o dv: %s', (codigo) => {
    const r = parseSerial(codigo);
    expect(r.ok, r.ok ? '' : r.erros.join('; ')).toBe(true);
  });

  it('decodifica os campos do exemplo híbrido', () => {
    const r = parseSerial('IRT-E BH075.060.1800.00.DMG0935.A1F4-1');
    if (!r.ok) throw new Error(r.erros.join('; '));
    expect(r.serial).toMatchObject({
      tipo: 'B',
      regime: 'H',
      epsilon: 0.75,
      rho: 0.6,
      ell: 0.18,
      c: 0,
      uf: 'MG',
      ibsMunicipal: 0.0935,
      anexo: 1,
      faixa: 4,
    });
  });

  it('decodifica sufixos IS/PI/ZF', () => {
    const r = parseSerial('IRT-E BR100.000.1800.00.DMG0935.PI1000.ZF0500-3');
    if (!r.ok) throw new Error(r.erros.join('; '));
    expect(r.serial.ipiBase).toBe(0.1);
    expect(r.serial.zfm).toBe(0.05);
  });

  it.each(EXEMPLOS)('round-trip format(parse(x)) === x: %s', (codigo) => {
    const r = parseSerial(codigo);
    if (!r.ok) throw new Error(r.erros.join('; '));
    expect(formatSerial(r.serial)).toBe(codigo);
  });
});

describe('parseSerial — rejeições (seção 6 da gramática)', () => {
  it('rejeita dv incorreto', () => {
    const r = parseSerial('IRT-E BR100.000.1800.00.DMG0935-4');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.join()).toMatch(/Dígito verificador/);
  });

  it('rejeita formato quebrado', () => {
    for (const codigo of [
      'BR100.000.1800.00.DMG0935-3',
      'IRT-E BR100.000.1800.00.DMG0935',
      'IRT-E BR100,000,1800,00,DMG0935-3',
      'IRT-E br100.000.1800.00.DMG0935-3',
      'IRT-E XR100.000.1800.00.DMG0935-3',
      'IRT-E BX100.000.1800.00.DMG0935-3',
    ]) {
      expect(parseSerial(codigo).ok, codigo).toBe(false);
    }
  });

  it('H sem Anexo/Faixa é inválido', () => {
    const r = parseSerial('IRT-E BH075.060.1800.00.DMG0935-3');
    expect(r.ok).toBe(false);
  });

  it('R com Anexo/Faixa é inválido', () => {
    const r = parseSerial('IRT-E BR100.000.1800.00.DMG0935.A1F4-7');
    expect(r.ok).toBe(false);
  });

  it('P com c ≠ 00 é válido (crédito de ICMS)', () => {
    const serial: SerialIRTE = {
      tipo: 'S', regime: 'P', epsilon: 1, rho: 0, ell: 0.05, c: 0.25, uf: 'MG', ibsMunicipal: 0.0935,
    };
    const r = parseSerial(formatSerial(serial));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.serial.c).toBeCloseTo(0.25);
  });

  it('H admite c ≠ 00; só U exige c = 00', () => {
    const h: SerialIRTE = {
      tipo: 'B', regime: 'H', epsilon: 0.75, rho: 0.6, ell: 0.18, c: 0.25,
      uf: 'MG', ibsMunicipal: 0.0935, anexo: 1, faixa: 4,
    };
    const rh = parseSerial(formatSerial(h));
    expect(rh.ok).toBe(true);
    if (rh.ok) expect(rh.serial.c).toBeCloseTo(0.25);
    const u: SerialIRTE = { tipo: 'B', regime: 'U', epsilon: 1, rho: 0, ell: 0, c: 0.25 };
    const ru = parseSerial(formatSerial(u));
    expect(ru.ok).toBe(false);
    if (!ru.ok) expect(ru.erros.join()).toMatch(/c = 00/);
  });

  it('IS em serviço é inválido', () => {
    const r = parseSerial('IRT-E SR100.000.0500.00.DMG0935.IS1800-5');
    expect(r.ok).toBe(false);
  });

  it('U com bloco de destino é inválido', () => {
    const r = parseSerial('IRT-E BU000.000.0000.00.DMG0935-6');
    expect(r.ok).toBe(false);
  });

  it('R sem bloco de destino é inválido', () => {
    const r = parseSerial('IRT-E BR100.000.1800.00-8');
    expect(r.ok).toBe(false);
  });

  it('UF inexistente é inválida', () => {
    const r = parseSerial('IRT-E BR100.000.1800.00.DXX0935-7');
    expect(r.ok).toBe(false);
  });

  it('EX exige i_M = 0000', () => {
    const r = parseSerial('IRT-E BR100.000.1800.00.DEX0935-1');
    expect(r.ok).toBe(false);
  });
});
