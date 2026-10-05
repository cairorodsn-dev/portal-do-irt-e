import type { CronogramaAno, ParamSet } from '../params/types';
import type { SerialIRTE } from '../serial/types';

/** Fatores de um ano: g (IBS/CBS por fora), h (IPI/IS por fora), b (legado por dentro), d (DAS). */
export interface FatoresAno {
  g: number;
  h: number;
  b: number;
  d: number;
}

/** Alíquotas efetivas do código após o teto de 26,5% aplicado proporcionalmente. */
export interface AliquotasEfetivas {
  iE: number;
  iM: number;
  cbs: number;
}

/** Frações do cronograma já resolvidas para um ano (sem nulls). */
export interface FatoresTransicaoAno {
  fIBS: number;
  fCBS: number;
  fLegado: number;
  fPIS: number;
  fIPI: number;
  redutorGov: number;
}

export function ehSimples(regime: SerialIRTE['regime']): boolean {
  return regime === 'H' || regime === 'U';
}

/**
 * Alíquotas efetivas do código: i_E da tabela curada por UF, i_M declarado no bloco D,
 * CBS nacional; teto aplicado proporcionalmente (mesma fórmula da aba Parâmetros da v7).
 * Destino EX (exterior): imunidade de exportação — alíquotas zero.
 */
export function aliquotasEfetivas(entrada: SerialIRTE, params: ParamSet): AliquotasEfetivas {
  if (entrada.uf === 'EX') return { iE: 0, iM: 0, cbs: 0 };
  if (entrada.uf == null) {
    if (entrada.regime !== 'U') throw new Error('Bloco de destino ausente fora do regime U.');
    return { iE: 0, iM: 0, cbs: 0 };
  }
  const linhaUF = params.ufs.find((u) => u.uf === entrada.uf);
  if (!linhaUF) throw new Error(`UF sem linha na tabela curada de IBS estadual: ${entrada.uf}.`);
  const iM = entrada.ibsMunicipal ?? 0;
  const fatorTeto = params.aplicaTeto
    ? Math.min(1, params.teto / (linhaUF.ibsEstadual + iM + params.cbsBruta))
    : 1;
  return {
    iE: linhaUF.ibsEstadual * fatorTeto,
    iM: iM * fatorTeto,
    cbs: params.cbsBruta * fatorTeto,
  };
}

/** Fração do cronograma φ(t); t0 < 2026 = regime legado pleno; anos após 2033 usam a linha de 2033. */
export function fatoresTransicao(
  ano: number,
  ef: AliquotasEfetivas,
  params: ParamSet,
): FatoresTransicaoAno {
  if (ano < 2026) {
    return { fIBS: 0, fCBS: 0, fLegado: 1, fPIS: 1, fIPI: 1, redutorGov: 0 };
  }
  const alvo = Math.min(ano, 2033);
  const linha = params.cronograma.find((l) => l.ano === alvo);
  if (!linha) throw new Error(`Cronograma sem linha para o ano ${alvo}.`);
  const fIBS =
    linha.fIBS ??
    (ef.iE + ef.iM === 0 ? 0 : params.transicao2026.ibs / (ef.iE + ef.iM));
  const fCBS =
    linha.fCBS ??
    (ef.cbs === 0
      ? 0
      : linha.ano === 2026
        ? params.transicao2026.cbs / ef.cbs
        : (ef.cbs - params.cbs2027reducao) / ef.cbs);
  return {
    fIBS,
    fCBS,
    fLegado: linha.fLegado,
    fPIS: linha.fPIS,
    fIPI: linha.fIPI,
    redutorGov: linha.redutorGov,
  };
}

/** Alíquota nominal de PIS/Cofins implícita no regime (9,25% em R; 3,65% em P; dentro do DAS em H/U). */
export function aliquotaPis(entrada: SerialIRTE, params: ParamSet): number {
  if (entrada.regime === 'R') return params.pisCofins.lucroReal;
  if (entrada.regime === 'P') return params.pisCofins.lucroPresumido;
  return 0;
}

/**
 * g — IBS/CBS por fora. Convenções da v7: regime U ⇒ 0 (IBS/CBS dentro do DAS);
 * ano 2026 ⇒ 0 (alíquotas simbólicas compensáveis); híbrido pelo regime regular sem redutor gov.
 * O IBS/CBS é não cumulativo: a carga efetiva entra depurada por (1−c), como todo tributo
 * que admite creditamento (metodologia, seção 3).
 */
function calcularG(
  entrada: SerialIRTE,
  phi: FatoresTransicaoAno,
  ano: number,
  ef: AliquotasEfetivas,
): number {
  if (entrada.regime === 'U') return 0;
  if (entrada.uf === 'EX') return 0;
  if (ano === 2026) return 0;
  const redutor = ehSimples(entrada.regime) ? 0 : phi.redutorGov;
  return (
    ((ef.iE + ef.iM) * (1 - entrada.rho) * phi.fIBS + ef.cbs * (1 - entrada.rho) * phi.fCBS) *
    (1 - redutor) *
    (1 - entrada.c)
  );
}

/** h — IPI (sufixo PI no ano-base, ZF no ano-alvo) × φ_IPI(t) + IS com repasse k = 1 (convenção v1). */
function calcularH(
  entrada: SerialIRTE,
  phi: FatoresTransicaoAno,
  papel: 'base' | 'alvo',
): number {
  const ipi = papel === 'base' ? entrada.ipiBase ?? 0 : entrada.zfm ?? 0;
  const is = entrada.is ?? 0;
  return ipi * phi.fIPI + is * 1;
}

/**
 * b — carga legada por dentro: ℓ·(1−c)·φ_legado(t) + p·(1−c)·φ_PC(t).
 * No regime H a carga de ICMS/ISS está dentro do DAS (ℓ não entra); no U ela permanece no preço.
 * O fator c depura todo tributo não cumulativo (metodologia, seção 3): o ICMS, em R e P, e
 * o PIS/Cofins, apenas em R — em P ele é cumulativo e entra integral. O crédito de PIS/Cofins
 * só existe no ano-base (tributo extinto em 2027 — φ_PC(t1) = 0).
 */
function calcularB(
  entrada: SerialIRTE,
  phi: FatoresTransicaoAno,
  params: ParamSet,
): number {
  const ell = entrada.regime === 'H' ? 0 : entrada.ell;
  const pis = aliquotaPis(entrada, params);
  const cPis = entrada.regime === 'R' ? entrada.c : 0;
  return ell * (1 - entrada.c) * phi.fLegado + pis * (1 - cPis) * phi.fPIS;
}

/**
 * d — DAS do Simples pela ALIQUOTA NOMINAL da faixa (convenção do portal: o serial não
 * carrega RBT12, portanto a parcela a deduzir não entra). Ano-base ≤ 2026: DAS cheio
 * (Simples unificado). Híbrido a partir de 2027: DAS × parcela não-IBS/CBS do ano
 * (restante = IRPJ+CSLL+CPP+IPI, mais ICMS/ISS residual da repartição). Consultas à
 * tabela usam MIN(ano, 2033).
 */
function calcularD(entrada: SerialIRTE, ano: number, params: ParamSet): number {
  if (!ehSimples(entrada.regime)) return 0;
  if (entrada.regime === 'U') return 0;
  if (entrada.anexo == null || entrada.faixa == null) {
    throw new Error('Regime H (Simples híbrido) exige anexo e faixa.');
  }
  const anoTab = Math.min(Math.max(ano, 2026), 2033);
  const linha = params.simples.find(
    (l) => l.anexo === entrada.anexo && l.ano === anoTab && l.faixa === entrada.faixa,
  );
  if (!linha) {
    throw new Error(
      `Tabela do Simples sem linha para Anexo ${entrada.anexo}, ano ${anoTab}, faixa ${entrada.faixa}.`,
    );
  }
  const das = linha.aliquotaNominal / 100;
  if (ano <= 2026 || linha.reparticao == null) return das;
  const r = linha.reparticao;
  const restante = r.irpj + r.csll + r.cpp + r.ipi;
  return (das * (restante + r.icmsIss)) / 100;
}

/** Fatores g/h/b/d de um ano para uma parametrização. */
export function fatoresAno(
  entrada: SerialIRTE,
  ano: number,
  papel: 'base' | 'alvo',
  params: ParamSet,
): FatoresAno {
  const ef = aliquotasEfetivas(entrada, params);
  const phi = fatoresTransicao(ano, ef, params);
  return {
    g: calcularG(entrada, phi, ano, ef),
    h: calcularH(entrada, phi, papel),
    b: calcularB(entrada, phi, params),
    d: calcularD(entrada, ano, params),
  };
}
