import { calcularDigitoVerificador, corpoParaDV } from './dv';
import type { RegimeTributario, SerialIRTE, TipoObjeto } from './types';

export type ResultadoParse =
  | { ok: true; serial: SerialIRTE; canonico: string }
  | { ok: false; erros: string[] };

export const UFS_VALIDAS: readonly string[] = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

const RE_SERIAL =
  /^IRT-E ([BS])([RPHU])(\d{3})\.(\d{3})\.(\d{4})\.(\d{2})(?:\.D([A-Z]{2})(\d{4}))?((?:\.(?:A[1-5]F[1-6]|IS\d{4}|PI\d{4}|ZF\d{4}))*)-([0-9X])$/;

const RE_SUFIXO = /\.(A[1-5]F[1-6]|IS\d{4}|PI\d{4}|ZF\d{4})/g;

/** Ordem obrigatória dos sufixos (gramática v1, seção 2.2). */
const ORDEM_SUFIXO: Record<string, number> = { A: 0, IS: 1, PI: 2, ZF: 3 };

/**
 * Faz o parse e a validação completa de um código serial IRT-E (gramática v1, seção 6).
 * Código inválido: retorna erros e nenhum cálculo deve ser feito.
 */
export function parseSerial(codigo: string): ResultadoParse {
  const texto = codigo.trim();
  const m = RE_SERIAL.exec(texto);
  if (!m) {
    return {
      ok: false,
      erros: [
        'Formato inválido. Esperado: IRT-E <tipo><regime><ε>.<ρ>.<ℓ>.<c>[.D<UF><i_M>]{.<sufixos>}-<dv> ' +
          '(ex.: IRT-E BR100.000.1800.00.DMG0935-3).',
      ],
    };
  }

  const tipoRaw = m[1]!;
  const regimeRaw = m[2]!;
  const epsRaw = m[3]!;
  const rhoRaw = m[4]!;
  const ellRaw = m[5]!;
  const cRaw = m[6]!;
  const ufRaw = m[7];
  const iMRaw = m[8];
  const grupoSufixos = m[9]!;
  const dvInformado = m[10]!;
  const tipo = tipoRaw as TipoObjeto;
  const regime = regimeRaw as RegimeTributario;

  const sufixos = [...grupoSufixos.matchAll(RE_SUFIXO)].map((s) => s[1]!);
  const erros: string[] = [];

  let anexo: SerialIRTE['anexo'];
  let faixa: SerialIRTE['faixa'];
  let is: number | undefined;
  let ipiBase: number | undefined;
  let zfm: number | undefined;

  let ordemAnterior = -1;
  const vistos = new Set<string>();
  for (const suf of sufixos) {
    const chave = suf.startsWith('A') ? 'A' : suf.slice(0, 2);
    const ordem = ORDEM_SUFIXO[chave]!;
    if (vistos.has(chave)) erros.push(`Sufixo ${chave} repetido.`);
    if (ordem < ordemAnterior) erros.push(`Sufixos fora da ordem obrigatória (A#F#, IS, PI, ZF): ${suf}.`);
    vistos.add(chave);
    ordemAnterior = ordem;
    if (chave === 'A') {
      anexo = Number(suf[1]) as SerialIRTE['anexo'];
      faixa = Number(suf[3]) as SerialIRTE['faixa'];
    } else if (chave === 'IS') is = Number(suf.slice(2)) / 10000;
    else if (chave === 'PI') ipiBase = Number(suf.slice(2)) / 10000;
    else if (chave === 'ZF') zfm = Number(suf.slice(2)) / 10000;
  }

  if (regime === 'H' && anexo == null) {
    erros.push('Regime H (Simples híbrido) exige o sufixo de Anexo/Faixa (ex.: .A3F2).');
  }
  if (regime !== 'H' && anexo != null) {
    erros.push('Sufixo de Anexo/Faixa só é permitido no regime H (Simples híbrido).');
  }
  if (regime === 'U' && cRaw !== '00') {
    erros.push('Regime U exige campo c = 00 (tudo dentro do DAS, sem crédito).');
  }
  if ((is != null || ipiBase != null || zfm != null) && tipo !== 'B') {
    erros.push('Sufixos IS/PI/ZF só são permitidos para tipo B (bem/produto).');
  }
  if (regime === 'U' && ufRaw != null) {
    erros.push('Regime U (Simples puro) não admite bloco de destino D<UF><i_M>.');
  }
  if (regime !== 'U' && ufRaw == null) {
    erros.push('Bloco de destino D<UF><i_M> é obrigatório para os regimes R, P e H.');
  }
  if (ufRaw != null && ufRaw !== 'EX' && !UFS_VALIDAS.includes(ufRaw)) {
    erros.push(`UF inválida no bloco de destino: ${ufRaw}. Use a sigla de uma das 27 UFs ou EX (exterior).`);
  }
  if (ufRaw === 'EX' && iMRaw !== '0000') {
    erros.push('Destino EX (exterior) exige i_M = 0000 (imunidade de exportação).');
  }

  const corpo = texto.slice('IRT-E '.length, texto.length - 2);
  const dvCalculado = calcularDigitoVerificador(corpoParaDV(corpo));
  if (dvCalculado !== dvInformado) {
    erros.push(
      'Dígito verificador incorreto. Esta consulta não informa o dígito correto; ' +
        'para descobrir o código da série, use a Descoberta de série.',
    );
  }

  if (erros.length > 0) return { ok: false, erros };

  const serial: SerialIRTE = {
    tipo,
    regime,
    epsilon: Number(epsRaw) / 100,
    rho: Number(rhoRaw) / 100,
    ell: Number(ellRaw) / 10000,
    c: Number(cRaw) / 100,
  };
  if (ufRaw != null) serial.uf = ufRaw;
  if (iMRaw != null) serial.ibsMunicipal = Number(iMRaw) / 10000;
  if (anexo != null) serial.anexo = anexo;
  if (faixa != null) serial.faixa = faixa;
  if (is != null) serial.is = is;
  if (ipiBase != null) serial.ipiBase = ipiBase;
  if (zfm != null) serial.zfm = zfm;

  return { ok: true, serial, canonico: texto };
}
