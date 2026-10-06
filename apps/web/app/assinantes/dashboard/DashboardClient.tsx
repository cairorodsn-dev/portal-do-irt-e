'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Contrato, RegimeContrato } from '../../../lib/assinantes';
import { ROTULOS_REGIME } from '../../../lib/assinantes';
import TopoConta from '../TopoConta';
import { useContaAssinante } from '../useContaAssinante';

const ANOS_BASE = [2026, 2027, 2028, 2029, 2030, 2031, 2032];
const REGIMES: RegimeContrato[] = ['R', 'P', 'H'];

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

export default function DashboardClient() {
  const { conta, pronto, salvando, persistir } = useContaAssinante();
  const [novoContrato, setNovoContrato] = useState('');
  const [novoAnoBase, setNovoAnoBase] = useState(2026);
  const [novoRegime, setNovoRegime] = useState<RegimeContrato>('R');

  if (!pronto || !conta) return null;

  function criarContrato(e: React.FormEvent) {
    e.preventDefault();
    const nome = novoContrato.trim();
    if (!nome || !conta) return;
    persistir([
      ...conta.contratos,
      { id: crypto.randomUUID(), nome, anoBase: novoAnoBase, regime: novoRegime, itens: [] },
    ]);
    setNovoContrato('');
    setNovoAnoBase(2026);
    setNovoRegime('R');
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
        <div className="regime-selecao" role="group" aria-label="Regime do fornecedor">
          {REGIMES.map((valor) => (
            <button
              key={valor}
              type="button"
              className={`btn secundario regime-opcao${novoRegime === valor ? ' selecionado' : ''}`}
              aria-pressed={novoRegime === valor}
              onClick={() => setNovoRegime(valor)}
            >
              {ROTULOS_REGIME[valor]}
            </button>
          ))}
        </div>
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
                      ? `Nenhum item · ano-base ${contrato.anoBase} · ${ROTULOS_REGIME[contrato.regime]}`
                      : `${contrato.itens.length} ${contrato.itens.length === 1 ? 'item' : 'itens'} · ano-base ${contrato.anoBase} · ${ROTULOS_REGIME[contrato.regime]} · ${brl(soma)} em preços-base`}
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
