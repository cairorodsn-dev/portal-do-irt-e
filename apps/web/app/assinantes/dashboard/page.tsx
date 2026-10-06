import { Suspense } from 'react';
import DashboardClient from './DashboardClient';

export const metadata = {
  title: 'Meus Contratos — Área de assinantes — Portal do IRT-E',
};

export default function DashboardPage() {
  return (
    <>
      <section className="hero">
        <h1>Meus Contratos</h1>
        <p className="lead">
          A sua carteira de contratos multi-item. Abra um contrato para gerir os itens e simular
          o reajuste de cada um — e o total do contrato — período a período, até 2033.
        </p>
      </section>
      <Suspense fallback={null}>
        <DashboardClient />
      </Suspense>
    </>
  );
}
