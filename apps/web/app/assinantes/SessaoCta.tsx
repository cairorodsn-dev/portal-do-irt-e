'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { sessaoAtiva } from '../../lib/assinantes';

export default function SessaoCta() {
  const [logado, setLogado] = useState(false);

  useEffect(() => {
    setLogado(sessaoAtiva());
  }, []);

  if (logado) {
    return (
      <Link href="/assinantes/dashboard" className="btn">
        Ir para o dashboard
      </Link>
    );
  }

  return (
    <>
      <Link href="/assinantes/entrar?aba=criar" className="btn">
        Criar conta
      </Link>
      <Link href="/assinantes/entrar" className="btn secundario">
        Entrar
      </Link>
    </>
  );
}
