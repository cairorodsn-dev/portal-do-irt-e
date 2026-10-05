import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Portal do IRT-E',
  description:
    'Índice de Reequilíbrio Tributário Expurgado (IRT-E) — reajuste de contratos privados na transição para o IVA dual brasileiro (IBS/CBS).',
};

const AVISO_ESTIMATIVA =
  'Alíquotas de referência IBS/CBS em vigor são estimativas — aguardando resolução do Senado (prevista até 15/12/2026).';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="aviso-estimativa" role="note">
          {AVISO_ESTIMATIVA}
        </div>
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="brand">
              Portal do <strong>IRT-E</strong>
            </Link>
            <nav className="nav">
              <Link href="/wizard">Descoberta de série</Link>
              <Link href="/consulta">Consulta pública</Link>
              <Link href="/metodo">Método</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <div className="container">
            <p>
              O Portal do IRT-E é uma ferramenta de cálculo auditável; não constitui parecer
              jurídico ou tributário. Base normativa: EC 132/2023, LC 214/2025 e LC 227/2026.
            </p>
            <p className="muted">
              Parâmetros de cálculo versionados (versão atual: v2026-10-estimativa).
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
