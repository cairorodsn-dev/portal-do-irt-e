import { calcularIndice } from './engine/compute';
import type { ParamSet } from './params/types';
import { parseSerial } from './serial/parser';
import type { SerialIRTE } from './serial/types';

export interface PeriodoConsulta {
  t0: number;
  t1: number;
  F: number;
  irte: number;
}

export interface ParametrosNacionaisUsados {
  cbs: number;
  teto: number;
  ibsEstadual?: number;
  ibsMunicipal?: number;
  ufEstimativa?: boolean;
}

export type ResultadoConsulta =
  | {
      ok: true;
      codigo: string;
      serial: SerialIRTE;
      anoBase: number;
      periodos: PeriodoConsulta[];
      parametros: ParametrosNacionaisUsados;
      versaoParametros: string;
      parametrosEstimados: boolean;
    }
  | { ok: false; erros: string[] };

/**
 * Consulta pública de uma série: valida o código serial (inclusive o dígito
 * verificador) e calcula F e IRT-E para todos os períodos disponíveis
 * (ano-base → 2027 … 2033). Código inválido: retorna erros, sem cálculo.
 */
export function consultarSerie(
  codigo: string,
  params: ParamSet,
  anoBase = 2026,
): ResultadoConsulta {
  if (!Number.isInteger(anoBase) || anoBase >= 2033) {
    throw new Error('O ano-base deve ser um inteiro anterior a 2033.');
  }
  const parse = parseSerial(codigo);
  if (!parse.ok) return { ok: false, erros: parse.erros };

  const periodos: PeriodoConsulta[] = [];
  for (let t1 = anoBase + 1; t1 <= 2033; t1 += 1) {
    const r = calcularIndice(parse.serial, anoBase, t1, params);
    periodos.push({ t0: anoBase, t1, F: r.F, irte: r.irte });
  }

  const parametros: ParametrosNacionaisUsados = { cbs: params.cbsBruta, teto: params.teto };
  if (parse.serial.uf != null && parse.serial.uf !== 'EX') {
    const linha = params.ufs.find((u) => u.uf === parse.serial.uf);
    parametros.ibsEstadual = linha?.ibsEstadual;
    parametros.ufEstimativa = linha?.estimativa;
    parametros.ibsMunicipal = parse.serial.ibsMunicipal;
  }

  return {
    ok: true,
    codigo: parse.canonico,
    serial: parse.serial,
    anoBase,
    periodos,
    parametros,
    versaoParametros: params.versao,
    parametrosEstimados: params.estimativa,
  };
}
