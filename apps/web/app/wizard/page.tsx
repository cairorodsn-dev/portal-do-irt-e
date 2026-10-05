import { PARAMS_V2026_10 } from '@portal-irt-e/engine';
import WizardClient from './WizardClient';

export const metadata = {
  title: 'Descoberta de série — Portal do IRT-E',
};

export default function WizardPage() {
  const p = PARAMS_V2026_10;
  const opcoes = {
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

  return (
    <>
      <section className="hero">
        <h1>Descoberta de série — o código IRT-E de cada item do seu contrato</h1>
        <p className="lead">
          Informe os dados de cada item do contrato — o que é fornecido, o destino do item e o
          regime tributário. Todos os dados informados são relativos ao fornecedor e referentes
          à data de apresentação da proposta. Ao final, você recebe o código da série IRT-E de
          cada item, com o índice período a período, o Certificado de Série e a Memória de
          Cálculo completos.
        </p>
      </section>
      <WizardClient opcoes={opcoes} />
    </>
  );
}
