import { PARAMS_V2026_10 } from '@portal-irt-e/engine';
import type {
  CargaLegadaUF,
  FaixaElasticidade,
  PacoteWizard,
  ReducaoSetorial,
} from '@portal-irt-e/engine';

export interface OpcoesWizard {
  pacotes: PacoteWizard[];
  ufs: { uf: string; ibsEstadual: number; estimativa: boolean; fonte: string | null }[];
  reducoes: ReducaoSetorial[];
  faixasEpsilon: FaixaElasticidade[];
  cargaLegada: CargaLegadaUF[];
  simplesFaixas: number[];
  simplesNominal2027: { anexo: number; faixa: number; aliquotaNominal: number }[];
  ibsMunicipalPadrao: number;
}

// Opções do wizard montadas a partir dos parâmetros versionados — compartilhado entre
// /wizard (avulso, público) e /assinantes/wizard (logado).
export function opcoesWizard(): OpcoesWizard {
  const p = PARAMS_V2026_10;
  return {
    pacotes: p.wizard.pacotes,
    ufs: p.ufs.map((u) => ({
      uf: u.uf,
      ibsEstadual: u.ibsEstadual,
      estimativa: u.estimativa,
      fonte: u.fonte ?? null,
    })),
    reducoes: p.reducoesSetoriais,
    faixasEpsilon: p.faixasElasticidade,
    cargaLegada: p.cargaLegada,
    simplesFaixas: p.simplesFaixas,
    simplesNominal2027: p.simples
      .filter((s) => s.ano === 2027)
      .map((s) => ({ anexo: s.anexo, faixa: s.faixa, aliquotaNominal: s.aliquotaNominal })),
    // Estimativa de referência do IBS municipal (Res. CGIBS 14/2026, convenção 50/50) —
    // rotulada como estimativa editável no campo.
    ibsMunicipalPadrao: 0.0935,
  };
}
