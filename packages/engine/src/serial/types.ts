export type TipoObjeto = 'B' | 'S';
export type RegimeTributario = 'R' | 'P' | 'H' | 'U';

/**
 * Parametrização decodificada de um código serial IRT-E (gramática v1).
 * Todos os campos numéricos são frações (ex.: 0,18 para 18%).
 */
export interface SerialIRTE {
  /** Tipo do objeto: B = bem/produto, S = serviço. */
  tipo: TipoObjeto;
  /** Regime tributário do fornecedor: R = lucro real, P = presumido, H = Simples híbrido, U = Simples puro. */
  regime: RegimeTributario;
  /** |ε| — elasticidade-preço da demanda em valor absoluto (0 a 9,99). */
  epsilon: number;
  /** ρ — redução setorial IBS/CBS (0 a 1; 1 = isento/alíquota zero). */
  rho: number;
  /** ℓ — carga legada por dentro, alíquota efetiva já com redução de base apurada (0 a 0,9999). */
  ell: number;
  /** c — creditamento do ano-base dos tributos não cumulativos (0 a 0,99): ICMS em R e P,
   * PIS/Cofins apenas em R (em P é cumulativo) e depuração do IBS/CBS de destino.
   * Em H e U (tributos no DAS): sempre 0. */
  c: number;
  /** UF de destino (sigla das 27 UFs) ou 'EX' = exterior (imunidade de exportação). Ausente no regime U. */
  uf?: string;
  /** i_M — alíquota de referência do IBS municipal declarada (fração). Ausente no regime U; '0000' em EX. */
  ibsMunicipal?: number;
  /** Anexo I–V do Simples (LC 214/2025, Anexos XVIII–XXII) — obrigatório para regime H. */
  anexo?: 1 | 2 | 3 | 4 | 5;
  /** Faixa 1–6 do Anexo — obrigatória para regime H. */
  faixa?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Alíquota do Imposto Seletivo (fração). Só para tipo B. Repasse k = 1 (convenção v1). */
  is?: number;
  /** Alíquota de IPI no ano-base (fração). Só para tipo B. */
  ipiBase?: number;
  /** Alíquota de IPI remanescente em t1 — Zona Franca de Manaus (fração). Só para tipo B. */
  zfm?: number;
}
