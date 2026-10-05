import type { SerialIRTE } from '../serial/types';
import { UFS_VALIDAS } from '../serial/parser';
import { faixaPorRbt12 } from './faixa';
import type { RespostasWizard } from './types';

/** ℓ efetiva apurada: alíquota informada × (1 − redução de base de cálculo). */
export function apurarLegadaEfetiva(r: RespostasWizard): number {
  return r.aliquotaLegada * (1 - r.reducaoBase);
}

function validarFaixa(v: number, min: number, max: number, nome: string): void {
  if (!Number.isFinite(v) || v < min || v > max) {
    throw new Error(`${nome} inválido: deve estar entre ${min} e ${max}.`);
  }
}

/**
 * Compila as respostas do wizard na parametrização do motor (gramática v1).
 * Levanta Error com mensagem clara em resposta inválida — nenhum cálculo deve seguir.
 * As convenções da gramática são impostas aqui: U ⇒ c = 00 (tudo dentro do DAS);
 * R, P e H admite c (no H, o IBS/CBS sai do DAS pelo regime regular, não cumulativo);
 * H exige Anexo/Faixa (faixa derivada do RBT12); sufixos IS/PI/ZF só para tipo B;
 * EX ⇒ i_M = 0000; U não admite bloco de destino.
 */
export function respostasParaSerial(
  r: RespostasWizard,
  limitesRbt12: readonly number[],
): SerialIRTE {
  if (r.tipo !== 'B' && r.tipo !== 'S') throw new Error('Tipo do objeto inválido: B (bem) ou S (serviço).');
  if (r.regime !== 'R' && r.regime !== 'P' && r.regime !== 'H' && r.regime !== 'U') {
    throw new Error('Regime tributário inválido: R, P, H ou U.');
  }
  validarFaixa(r.epsilon, 0, 9.99, 'ε (elasticidade)');
  validarFaixa(r.rho, 0, 1, 'ρ (redução setorial)');
  validarFaixa(r.aliquotaLegada, 0, 0.9999, 'Alíquota legada');
  validarFaixa(r.reducaoBase, 0, 1, 'Redução de base de cálculo');

  for (const [nome, v] of [['Imposto Seletivo', r.is], ['IPI no ano-base', r.ipiBase], ['IPI ZFM', r.zfm]] as const) {
    if (v != null) {
      if (r.tipo !== 'B') throw new Error(`${nome} só se aplica a bens/produtos.`);
      validarFaixa(v, 0, 0.9999, nome);
    }
  }

  let faixa: SerialIRTE['faixa'];
  if (r.regime === 'H') {
    if (r.anexo == null || r.anexo < 1 || r.anexo > 5) {
      throw new Error('Simples híbrido exige o Anexo (I–V) do Simples Nacional.');
    }
    if (r.rbt12 == null) throw new Error('Simples híbrido exige o RBT12 para determinar a faixa.');
    faixa = faixaPorRbt12(r.rbt12, limitesRbt12);
  }

  const creditamento = r.regime === 'U' ? 0 : (r.creditamento ?? 0);
  validarFaixa(creditamento, 0, 0.99, 'Creditamento');

  const serial: SerialIRTE = {
    tipo: r.tipo,
    regime: r.regime,
    epsilon: r.epsilon,
    rho: r.rho,
    ell: apurarLegadaEfetiva(r),
    c: creditamento,
  };

  if (r.regime !== 'U') {
    if (r.uf == null) throw new Error('Informe a UF de destino do IBS (ou EX para exportação).');
    if (r.uf !== 'EX' && !UFS_VALIDAS.includes(r.uf)) {
      throw new Error(`UF de destino inválida: ${r.uf}.`);
    }
    if (r.uf === 'EX') {
      serial.uf = 'EX';
      serial.ibsMunicipal = 0;
    } else {
      const iM = r.ibsMunicipal ?? NaN;
      validarFaixa(iM, 0, 0.9999, 'IBS municipal');
      serial.uf = r.uf;
      serial.ibsMunicipal = iM;
    }
  }

  if (r.regime === 'H') {
    serial.anexo = r.anexo;
    serial.faixa = faixa!;
  }

  if (r.is != null) serial.is = r.is;
  if (r.ipiBase != null) serial.ipiBase = r.ipiBase;
  if (r.zfm != null) serial.zfm = r.zfm;

  return serial;
}
