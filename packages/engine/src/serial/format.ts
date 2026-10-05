import { calcularDigitoVerificador, corpoParaDV } from './dv';
import type { SerialIRTE } from './types';

const p2 = (v: number) => String(Math.round(v * 100)).padStart(2, '0');
const p3 = (v: number) => String(Math.round(v * 100)).padStart(3, '0');
const p4 = (v: number) => String(Math.round(v * 10000)).padStart(4, '0');

/** Serializa uma parametrização para o código canônico, com dígito verificador calculado. */
export function formatSerial(s: SerialIRTE): string {
  let corpo = `${s.tipo}${s.regime}${p3(s.epsilon)}.${p3(s.rho)}.${p4(s.ell)}.${p2(s.c)}`;
  if (s.uf != null) corpo += `.D${s.uf}${p4(s.ibsMunicipal ?? 0)}`;
  if (s.anexo != null && s.faixa != null) corpo += `.A${s.anexo}F${s.faixa}`;
  if (s.is != null) corpo += `.IS${p4(s.is)}`;
  if (s.ipiBase != null) corpo += `.PI${p4(s.ipiBase)}`;
  if (s.zfm != null) corpo += `.ZF${p4(s.zfm)}`;
  return `IRT-E ${corpo}-${calcularDigitoVerificador(corpoParaDV(corpo))}`;
}
