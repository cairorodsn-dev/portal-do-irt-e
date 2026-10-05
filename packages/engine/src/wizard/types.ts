import type { RegimeTributario, TipoObjeto } from '../serial/types';

/**
 * Respostas brutas do wizard avulso — uma instância por item do contrato.
 * Percentuais em frações (0,18 = 18%); rbt12 em R$.
 */
export interface RespostasWizard {
  /** Tipo do objeto: B = bem/produto, S = serviço. */
  tipo: TipoObjeto;
  /** Sigla da UF de destino ou 'EX' (exterior). Ausente no regime U (Simples puro). */
  uf?: string;
  /** i_M — IBS municipal declarado (fração). Em EX deve ser 0. */
  ibsMunicipal?: number;
  /** Regime tributário do fornecedor: R, P, H ou U. */
  regime: RegimeTributario;
  /** Anexo I–V do Simples (só regime H). */
  anexo?: 1 | 2 | 3 | 4 | 5;
  /** RBT12 em R$ (só regime H) — usado apenas para derivar a faixa. */
  rbt12?: number;
  /** Alíquota legada sugerida/editada (fração), antes da redução de base de cálculo. */
  aliquotaLegada: number;
  /** Redução de base de cálculo (fração, 0–1). */
  reducaoBase: number;
  /** Redução setorial ρ (fração, 0–1). */
  rho: number;
  /** |ε| — elasticidade-preço da demanda (0 a 9,99). */
  epsilon: number;
  /** Crédito do ano-base dos tributos não cumulativos, 0–0,99: ICMS (R e P) e PIS/Cofins
   * (apenas R — em P é cumulativo); depura também o IBS/CBS de destino. Nos regimes H/U
   * é forçado a 0. */
  creditamento?: number;
  /** Imposto Seletivo (fração; só tipo B). */
  is?: number;
  /** IPI no ano-base (fração; só tipo B). */
  ipiBase?: number;
  /** IPI remanescente em t1 — Zona Franca de Manaus (fração; só tipo B). */
  zfm?: number;
}
