'use client';

import { useRouter } from 'next/navigation';
import type { Conta } from '../../lib/assinantes';
import { encerrarSessao } from '../../lib/assinantes';

export default function TopoConta({ conta, salvando }: { conta: Conta; salvando: boolean }) {
  const router = useRouter();

  function sair() {
    encerrarSessao();
    router.push('/assinantes');
    router.refresh();
  }

  return (
    <div className="dashboard-topo">
      <p className="meta">
        Conta: <strong>{conta.nome}</strong> ({conta.email})
        {salvando && ' · Salvando…'}
      </p>
      <button className="btn secundario" onClick={sair}>
        Sair
      </button>
    </div>
  );
}
