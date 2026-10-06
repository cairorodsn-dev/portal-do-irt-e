'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Conta, Contrato } from '../../lib/assinantes';
import { carregarConta, sessaoAtiva } from '../../lib/assinantes';
import { carregarContratos, persistirContratos } from '../../lib/assinantes-api';

// Guard de sessão + hidratação: monta com a cópia local (`pronto`) e reidrata do
// servidor quando disponível (`hidratado` marca o fim da tentativa, mesmo sem banco).
export function useContaAssinante() {
  const router = useRouter();
  const [conta, setConta] = useState<Conta | null>(null);
  const [pronto, setPronto] = useState(false);
  const [hidratado, setHidratado] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!sessaoAtiva()) {
      router.replace('/assinantes/entrar');
      return;
    }
    const local = carregarConta();
    setConta(local);
    setPronto(true);
    if (!local) {
      setHidratado(true);
      return;
    }
    void carregarContratos(local.email)
      .then((remotos) => {
        if (remotos) {
          setConta((atual) => (atual ? { ...atual, contratos: remotos } : atual));
        }
      })
      .finally(() => setHidratado(true));
  }, [router]);

  function persistir(contratos: Contrato[]) {
    setConta((atual) => (atual ? { ...atual, contratos } : atual));
    if (!conta) return;
    setSalvando(true);
    void persistirContratos(conta.email, contratos).finally(() => setSalvando(false));
  }

  return { conta, pronto, hidratado, salvando, persistir };
}
