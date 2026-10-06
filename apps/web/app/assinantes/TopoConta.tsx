'use client';

import { useRouter } from 'next/navigation';
import { encerrarSessao } from '../../lib/assinantes';

export default function TopoConta({
  salvando,
  onVoltar,
  children,
}: {
  salvando: boolean;
  onVoltar?: () => void;
  children?: React.ReactNode;
}) {
  const router = useRouter();

  function sair() {
    encerrarSessao();
    router.push('/assinantes');
    router.refresh();
  }

  return (
    <div className="dashboard-topo">
      {onVoltar && (
        <button className="btn secundario" onClick={onVoltar}>
          Voltar
        </button>
      )}
      {salvando && <span className="meta">Salvando…</span>}
      {children}
      <button className="btn secundario" onClick={sair}>
        Sair
      </button>
    </div>
  );
}
