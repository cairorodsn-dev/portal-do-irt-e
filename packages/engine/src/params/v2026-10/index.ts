import type { CronogramaAno, EntradaUF, ParamSet } from '../types';
import { CARGA_LEGADA } from './carga-legada';
import { SIMPLES_TABELAS } from './simples';

const UFS: EntradaUF[] = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
].map((uf) => ({
  uf,
  ibsEstadual: 0.0935,
  estimativa: true,
  fonte: 'Estimativa de referência da v7 (MG). Demais UFs aguardam curadoria com fonte legal própria.',
}));

const CRONOGRAMA: CronogramaAno[] = [
  { ano: 2026, fIBS: null, fCBS: null, fLegado: 1, fPIS: 1, fIPI: 1, redutorGov: 0 },
  { ano: 2027, fIBS: 0.0053, fCBS: null, fLegado: 1, fPIS: 0, fIPI: 0, redutorGov: 0 },
  { ano: 2028, fIBS: 0.0053, fCBS: null, fLegado: 1, fPIS: 0, fIPI: 0, redutorGov: 0 },
  { ano: 2029, fIBS: 0.1, fCBS: 1, fLegado: 0.9, fPIS: 0, fIPI: 0, redutorGov: 0 },
  { ano: 2030, fIBS: 0.2, fCBS: 1, fLegado: 0.8, fPIS: 0, fIPI: 0, redutorGov: 0 },
  { ano: 2031, fIBS: 0.3, fCBS: 1, fLegado: 0.7, fPIS: 0, fIPI: 0, redutorGov: 0 },
  { ano: 2032, fIBS: 0.4, fCBS: 1, fLegado: 0.6, fPIS: 0, fIPI: 0, redutorGov: 0 },
  { ano: 2033, fIBS: 1, fCBS: 1, fLegado: 0, fPIS: 0, fIPI: 0, redutorGov: 0 },
];

export const PARAMS_V2026_10: ParamSet = {
  versao: 'v2026-10-estimativa',
  estimativa: true,
  cbsBruta: 0.0921,
  teto: 0.265,
  aplicaTeto: true,
  ufs: UFS,
  cronograma: CRONOGRAMA,
  transicao2026: { ibs: 0.001, cbs: 0.009 },
  cbs2027reducao: 0.001,
  pisCofins: { lucroReal: 0.0925, lucroPresumido: 0.0365 },
  reducoesSetoriais: [
    { rho: 0, descricao: 'Regra geral (sem redução)', fundamento: 'LC 214/2025 — alíquota cheia', aplicavelA: 'ambos' },
    { rho: 0.6, descricao: 'Alimentos destinados ao consumo humano', fundamento: 'art. 135, Anexo VII', aplicavelA: 'B' },
    { rho: 0.6, descricao: 'Higiene pessoal e limpeza — baixa renda', fundamento: 'art. 136, Anexo VIII', aplicavelA: 'B' },
    { rho: 0.6, descricao: 'Medicamentos', fundamento: 'art. 133', aplicavelA: 'B' },
    { rho: 0.6, descricao: 'Dispositivos médicos', fundamento: 'art. 131, Anexo IV', aplicavelA: 'B' },
    { rho: 0.6, descricao: 'Dispositivos de acessibilidade — PcD', fundamento: 'art. 132, Anexo V', aplicavelA: 'B' },
    { rho: 0.6, descricao: 'Agro in natura e insumos agropecuários', fundamento: 'arts. 137–138, Anexo IX', aplicavelA: 'B' },
    { rho: 0.6, descricao: 'Soberania e segurança nacional/cibernética', fundamento: 'art. 142, Anexo XI', aplicavelA: 'ambos' },
    { rho: 0.6, descricao: 'Serviços de educação', fundamento: 'art. 129, Anexo II', aplicavelA: 'S' },
    { rho: 0.6, descricao: 'Serviços de saúde', fundamento: 'art. 130, Anexo III', aplicavelA: 'S' },
    { rho: 0.6, descricao: 'Produções artísticas, culturais e desportivas', fundamento: 'arts. 139–141', aplicavelA: 'S' },
    { rho: 0.3, descricao: 'Profissões regulamentadas', fundamento: 'art. 127', aplicavelA: 'S' },
    { rho: 0.4, descricao: 'Transporte coletivo intermunicipal/interestadual e aéreo regional', fundamento: 'arts. 286–287', aplicavelA: 'S' },
    { rho: 1, descricao: 'Alíquota zero — cesta básica nacional', fundamento: 'art. 125, Anexo I', aplicavelA: 'B' },
    { rho: 1, descricao: 'Alíquota zero — medicamentos essenciais', fundamento: 'art. 146 (red. LC 227/2026)', aplicavelA: 'B' },
    { rho: 1, descricao: 'Alíquota zero — medicamentos/dispositivos adquiridos por órgão público', fundamento: 'art. 144, II', aplicavelA: 'B' },
    { rho: 1, descricao: 'Alíquota zero — transporte coletivo de passageiros', fundamento: 'arts. 157 e 285', aplicavelA: 'S' },
  ],
  simples: SIMPLES_TABELAS,
  faixasElasticidade: [
    { descricao: 'Serviços contínuos', epsilonMin: 0.3, epsilonMax: 0.8 },
    { descricao: 'Produtos padronizados', epsilonMin: 1, epsilonMax: 3 },
    { descricao: 'Poucos substitutos', epsilonMin: 0.1, epsilonMax: 0.3 },
  ],
  fontesLegais: [
    { id: 'EC132-2023', descricao: 'Emenda Constitucional nº 132, de 20 de dezembro de 2023' },
    { id: 'LC214-2025', descricao: 'Lei Complementar nº 214, de 16 de janeiro de 2025' },
    { id: 'LC227-2026', descricao: 'Lei Complementar nº 227, de 15 de janeiro de 2026' },
    { id: 'DECRETO12955-2026', descricao: 'Decreto nº 12.955, de 2026' },
    { id: 'PLANILHA-V7', descricao: 'Planilha Reequilibrio_Tributario_v7_IRT-E_Setor_Publico.xlsx (oráculo de cálculo)' },
  ],
  cargaLegada: CARGA_LEGADA,
  /** Limites clássicos das faixas do Simples (LC 123/2006, preservados nos Anexos XVIII–XXII da LC 214/2025). */
  simplesFaixas: [180000, 360000, 720000, 1800000, 3600000, 4800000],
  wizard: {
    pacotes: [
      { id: 'ate-3', nome: 'Até 3 itens', itens: 3, preco: 25 },
      { id: 'ate-10', nome: 'Até 10 itens', itens: 10, preco: 60 },
      { id: 'ate-30', nome: 'Até 30 itens', itens: 30, preco: 100 },
    ],
  },
};
