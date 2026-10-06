import { Suspense } from 'react';
import ContratoClient from './ContratoClient';

export const metadata = {
  title: 'Contrato — Meus Contratos — Portal do IRT-E',
};

export default async function ContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <section className="card">
          <p className="hint">Carregando contrato…</p>
        </section>
      }
    >
      <ContratoClient id={id} />
    </Suspense>
  );
}
