import { Suspense } from 'react';
import WizardClient from '../../../components/WizardClient';
import { opcoesWizard } from '../../../lib/wizard-opcoes';

export const metadata = {
  title: 'Descobrir código do item — Área de assinantes — Portal do IRT-E',
};

export default function WizardAssinantePage() {
  return (
    <>
      <section className="hero">
        <h1>Descobrir o código IRT-E do item</h1>
        <p className="lead">
          Responda às perguntas sobre o item — o regime do fornecedor já vem do contrato. Ao
          final, o código IRT-E sai com o índice período a período e volta direto para a página
          do contrato.
        </p>
      </section>
      <Suspense fallback={null}>
        <WizardClient opcoes={opcoesWizard()} modoAssinante />
      </Suspense>
    </>
  );
}
