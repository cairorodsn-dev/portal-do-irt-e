import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import WizardClient from '../../components/WizardClient';
import { opcoesWizard } from '../../lib/wizard-opcoes';

export const metadata = {
  title: 'Descoberta de série — Portal do IRT-E',
};

export default async function WizardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Endereço antigo do wizard do assinante (?origem=assinante&contrato=...) — o fluxo
  // logado mudou para /assinantes/wizard.
  const sp = await searchParams;
  if (sp.origem === 'assinante') {
    const contrato =
      typeof sp.contrato === 'string' ? `?contrato=${encodeURIComponent(sp.contrato)}` : '';
    redirect(`/assinantes/wizard${contrato}`);
  }

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
      <Suspense fallback={null}>
        <WizardClient opcoes={opcoesWizard()} />
      </Suspense>
    </>
  );
}
