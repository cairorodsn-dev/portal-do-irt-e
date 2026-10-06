'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Contrato } from '../../../lib/assinantes';
import TopoConta from '../TopoConta';
import { useContaAssinante } from '../useContaAssinante';

const ANOS_BASE = [2026, 2027, 2028, 2029, 2030, 2031, 2032];

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

export default function DashboardClient() {
  const { conta, pronto, salvando, persistir } = useContaAssinante();
  const [novoContrato, setNovoContrato] = useState('');
  const [novoAnoBase, setNovoAnoBase] = useState(2026);

  if (!pronto || !conta) return null;

  function criarContrato(e: React.FormEvent) {
    e.preventDefault();
    const nome = novoContrato.trim();
    if (!nome || !conta) return;
    persistir([...conta.contratos, { id: crypto.randomUUID(), nome, anoBase: novoAnoBase, itens: [] }]);
    setNovoContrato('');
    setNovoAnoBase(2026);
  }

  function excluirContrato(contrato: Contrato) {
    if (!conta) return;
    if (!window.confirm(`Excluir o contrato "${contrato.nome}" e todos os seus itens?`)) return;
    persistir(conta.contratos.filter((c) => c.id !== contrato.id));
  }

  return (
    <>
      <TopoConta salvando={salvando} />

      <section className="card">
        <form className="form-consulta" onSubmit={criarContrato}>
          <input
            type="text"
            className="form-texto"
            value={novoContrato}
            onChange={(e) => setNovoContrato(e.target.value)}
            placeholder="Nome do novo contrato (ex.: Fornecimento 2026 — Fornecedor X)"
            aria-label="Nome do novo contrato"
            maxLength={80}
            required
          />
          <select
            value={novoAnoBase}
            onChange={(e) => setNovoAnoBase(Number(e.target.value))}
            aria-label="Ano-base do novo contrato"
          >
            {ANOS_BASE.map((ano) => (
              <option key={ano} value={ano}>
                Ano-base {ano}
              </option>
            ))}
          </select>
          <button className="btn" type="submit">
            Criar contrato
          </button>
        </form>
      </section>

      <section className="card">
        {conta.contratos.length === 0 ? (
          <p className="hint">Nenhum contrato ainda — crie o primeiro acima.</p>
        ) : (
          conta.contratos.map((contrato) => {
            const soma = contrato.itens.reduce((total, item) => total + item.precoBase, 0);
            return (
              <div key={contrato.id} className="contrato-linha">
                <Link href={`/assinantes/dashboard/contrato/${contrato.id}`}>
                  <h3>{contrato.nome}</h3>
                  <p className="meta">
                    {contrato.itens.length === 0
                      ? `Nenhum item · ano-base ${contrato.anoBase}`
                      : `${contrato.itens.length} ${contrato.itens.length === 1 ? 'item' : 'itens'} · ano-base ${contrato.anoBase} · ${brl(soma)} em preços-base`}
                  </p>
                </Link>
                <button className="btn secundario" onClick={() => excluirContrato(contrato)}>
                  Excluir
                </button>
              </div>
            );
          })
        )}
      </section>
    </>
  );
}
