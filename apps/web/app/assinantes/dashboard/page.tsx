import { Suspense } from 'react';
import DashboardClient from './DashboardClient';

export const metadata = {
  title: 'Dashboard — Área de assinantes — Portal do IRT-E',
};

export default function DashboardPage() {
  return (
    <>
      <section className="hero">
        <h1>Dashboard de contratos</h1>
        <p className="lead">
          Gerencie a sua carteira de contratos multi-item e simule o reajuste de cada item —
          e o total de cada contrato — período a período, até 2033.
        </p>
      </section>
      <Suspense fallback={null}>
        <DashboardClient />
      </Suspense>
    </>
  );
}
