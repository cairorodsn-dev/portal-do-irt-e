import type { ParamSet } from '../params/types';
import type { SerialIRTE } from '../serial/types';
import { aliquotaPis, fatoresAno } from './factors';

export const VERSAO_MOTOR = '0.1.0';

export const DISCLAIMER =
  'Ferramenta de cálculo auditável; não constitui parecer jurídico ou tributário.';

export const AVISO_ESTIMATIVA =
  'Alíquotas estimadas — aguardando resolução do Senado (prevista até 15/12/2026).';

export interface MemoriaCalculo {
  t0: number;
  t1: number;
  g0: number;
  h0: number;
  b0: number;
  d0: number;
  g1: number;
  h1: number;
  b1: number;
  d1: number;
  /** R — receita líquida preservada (para preço-base normalizado 100). */
  receitaLiquida: number;
  /** V — preço-base reconstruído (sanity check da v7: deve ser 100). */
  precoBaseSanidade: number;
  /** Z — preço-alvo com repasse integral (teto F). */
  precoTeto: number;
}

export interface ResultadoCalculo {
  /** F — fator de repasse integral (teto técnico). */
  F: number;
  /** κ = |ε| / (1 + |ε|). */
  kappa: number;
  /** IRT-E = 1 + κ·(F − 1). */
  irte: number;
  /** Preço-base 100 reajustado pelo IRT-E. */
  precoReajustado: number;
  memoria: MemoriaCalculo;
  versaoParametros: string;
  versaoMotor: string;
  /** true enquanto as alíquotas de referência forem estimativas. */
  parametrosEstimados: boolean;
}

/**
 * Núcleo determinístico do motor: F e IRT-E para uma série × período.
 * Sem arredondamento interno (float64 pleno), reproduzindo a ordem de operações da v7.
 * Função pura: versão, timestamp e disclaimer são anexados pela camada de apresentação.
 */
export function calcularIndice(
  entrada: SerialIRTE,
  t0: number,
  t1: number,
  params: ParamSet,
): ResultadoCalculo {
  if (!Number.isInteger(t0) || !Number.isInteger(t1)) {
    throw new Error('t0 e t1 devem ser anos inteiros.');
  }
  if (t1 <= t0) {
    throw new Error('O ano-alvo (t1) deve ser posterior ao ano-base (t0).');
  }
  if (entrada.regime === 'H' && (entrada.anexo == null || entrada.faixa == null)) {
    throw new Error('Regime H (Simples híbrido) exige anexo e faixa.');
  }

  const f0 = fatoresAno(entrada, t0, 'base', params);
  const f1 = fatoresAno(entrada, t1, 'alvo', params);

  const ellBase = entrada.regime === 'H' ? 0 : entrada.ell;
  const pis = aliquotaPis(entrada, params);
  const cPis = entrada.regime === 'R' ? entrada.c : 0;

  const R = (100 / (1 + f0.g + f0.h)) * (1 - ellBase * (1 - entrada.c) - pis * (1 - cPis) - f0.d);
  const V = (R * (1 + f0.g + f0.h)) / (1 - f0.b - f0.d);
  const Z = (R * (1 + f1.g + f1.h)) / (1 - f1.b - f1.d);
  const F = Z / V;
  const kappa = entrada.epsilon / (1 + entrada.epsilon);
  const irte = 1 + kappa * (F - 1);

  return {
    F,
    kappa,
    irte,
    precoReajustado: V * irte,
    memoria: {
      t0,
      t1,
      g0: f0.g,
      h0: f0.h,
      b0: f0.b,
      d0: f0.d,
      g1: f1.g,
      h1: f1.h,
      b1: f1.b,
      d1: f1.d,
      receitaLiquida: R,
      precoBaseSanidade: V,
      precoTeto: Z,
    },
    versaoParametros: params.versao,
    versaoMotor: VERSAO_MOTOR,
    parametrosEstimados: params.estimativa,
  };
}
