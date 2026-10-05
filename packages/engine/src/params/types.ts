import type { SimplesRow } from './v2026-10/simples';

/** Frações do cronograma de transição φ(t) para um ano. */
export interface CronogramaAno {
  ano: number;
  /** null = derivado das alíquotas efetivas do código (2026: 0,1% simbólico). */
  fIBS: number | null;
  /** null = derivado das alíquotas efetivas do código (2026: 0,9% simbólico; 2027/2028: CBS plena − 0,1 p.p.). */
  fCBS: number | null;
  fLegado: number;
  fPIS: number;
  fIPI: number;
  /** Redutor de compras governamentais (arts. 472/473 LC 214/2025) — 0 enquanto não publicado. */
  redutorGov: number;
}

/** Linha da tabela curada de IBS estadual por UF de destino. */
export interface EntradaUF {
  uf: string;
  ibsEstadual: number;
  /** true enquanto a UF não publicou alíquota própria (estimativa de referência). */
  estimativa: boolean;
  fonte?: string;
}

export interface ReducaoSetorial {
  rho: number;
  descricao: string;
  fundamento: string;
  /** Tipo de objeto ao qual a hipótese se aplica: bem/produto, serviço ou ambos. */
  aplicavelA: 'B' | 'S' | 'ambos';
}

export interface FaixaElasticidade {
  descricao: string;
  /** |ε| mínimo e máximo sugeridos (valores absolutos). */
  epsilonMin: number;
  epsilonMax: number;
}

export interface FonteLegal {
  id: string;
  descricao: string;
  url?: string;
}

/** Linha da tabela de sugestão de carga legada (ℓ) por UF — usada pelo wizard. */
export interface CargaLegadaUF {
  uf: string;
  /** ICMS interno geral sugerido para bens (fração). */
  icmsInterno: number;
  /** ISS de referência sugerido para serviços (fração). */
  issReferencia: number;
  /** true enquanto a sugestão não for validada para o produto/serviço específico. */
  estimativa: boolean;
  fonte?: string;
}

/** Pacote de itens do wizard avulso (preço único por sessão, sem assinatura). */
export interface PacoteWizard {
  id: string;
  nome: string;
  /** Quantidade máxima de itens que o pacote comporta. */
  itens: number;
  /** Preço em R$. */
  preco: number;
}

export interface WizardConfig {
  pacotes: PacoteWizard[];
}

/**
 * Conjunto versionado de parâmetros nacionais do motor.
 * Toda saída do motor carrega `versao` e o flag `estimativa`.
 */
export interface ParamSet {
  versao: string;
  /** true enquanto as alíquotas de referência forem estimativas (resolução do Senado prevista até 15/12/2026). */
  estimativa: boolean;
  /** Alíquota de referência bruta da CBS (nacional). */
  cbsBruta: number;
  /** Teto da carga IBS+CBS (26,5%). Aplicado proporcionalmente sobre i_E + i_M + c_CBS de cada código. */
  teto: number;
  aplicaTeto: boolean;
  /** Tabela curada de IBS estadual por UF (27 linhas). */
  ufs: EntradaUF[];
  cronograma: CronogramaAno[];
  /** Frações simbólicas do ano de "ensaio" (2026): IBS 0,1% e CBS 0,9% (compensáveis — g(2026) = 0 por convenção). */
  transicao2026: { ibs: number; cbs: number };
  /** Redução de 0,1 p.p. da CBS em 2027/2028 (fCBS derivado: (c_CBS − 0,001) / c_CBS). */
  cbs2027reducao: number;
  pisCofins: { lucroReal: number; lucroPresumido: number };
  reducoesSetoriais: ReducaoSetorial[];
  /** Tabelas dos Anexos I–V (XVIII–XXII da LC 214/2025) × 2026–2033 × 6 faixas. */
  simples: SimplesRow[];
  faixasElasticidade: FaixaElasticidade[];
  fontesLegais: FonteLegal[];
  /** Sugestões de carga legada por UF (wizard avulso). */
  cargaLegada: CargaLegadaUF[];
  /** Limites de RBT12 das 6 faixas do Simples (Anexos XVIII–XXII da LC 214/2025). */
  simplesFaixas: number[];
  wizard: WizardConfig;
}
