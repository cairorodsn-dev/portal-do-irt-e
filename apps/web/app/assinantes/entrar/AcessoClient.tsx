'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PRECO_ASSINATURA, abrirSessao } from '../../../lib/assinantes';
import { criarContaRemota, entrarRemoto } from '../../../lib/assinantes-api';
import PagamentoDummy from '../PagamentoDummy';

type Aba = 'entrar' | 'criar';

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

export default function AcessoClient() {
  const router = useRouter();
  const [aba, setAba] = useState<Aba>('entrar');

  const [emailEntrar, setEmailEntrar] = useState('');
  const [senhaEntrar, setSenhaEntrar] = useState('');
  const [erroEntrar, setErroEntrar] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  const [nome, setNome] = useState('');
  const [emailCriar, setEmailCriar] = useState('');
  const [senhaCriar, setSenhaCriar] = useState('');
  const [erroCriar, setErroCriar] = useState<string | null>(null);
  const [pagamentoAberto, setPagamentoAberto] = useState(false);
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('aba') === 'criar') setAba('criar');
  }, []);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErroEntrar(null);
    setEntrando(true);
    const resultado = await entrarRemoto(emailEntrar.trim().toLowerCase());
    setEntrando(false);
    if (!resultado.ok) {
      setErroEntrar('Conta não encontrada — crie uma.');
      return;
    }
    // Senha dummy nesta fase: qualquer senha entra se a conta existe.
    abrirSessao(resultado.conta.email);
    router.push('/assinantes/dashboard');
  }

  function iniciarCriacao(e: React.FormEvent) {
    e.preventDefault();
    setErroCriar(null);
    setPagamentoAberto(true);
  }

  async function confirmarPagamento() {
    setCriando(true);
    const email = emailCriar.trim().toLowerCase();
    const resultado = await criarContaRemota(nome.trim(), email);
    setCriando(false);
    if (!resultado.ok) {
      setPagamentoAberto(false);
      setErroCriar(
        resultado.erro === 'conta_existente'
          ? 'Já existe conta com este e-mail — entre na aba Entrar.'
          : 'Não foi possível criar a conta. Confira os dados e tente de novo.',
      );
      return;
    }
    abrirSessao(email);
    router.push('/assinantes/dashboard');
  }

  return (
    <>
      <div className="abas" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={aba === 'entrar'}
          className={aba === 'entrar' ? 'aba ativa' : 'aba'}
          onClick={() => setAba('entrar')}
        >
          Entrar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={aba === 'criar'}
          className={aba === 'criar' ? 'aba ativa' : 'aba'}
          onClick={() => setAba('criar')}
        >
          Criar conta
        </button>
      </div>

      {aba === 'entrar' && (
        <section className="card">
          <form onSubmit={entrar}>
            <div className="campo">
              <label htmlFor="email-entrar">E-mail</label>
              <input
                id="email-entrar"
                type="email"
                value={emailEntrar}
                onChange={(e) => setEmailEntrar(e.target.value)}
                required
              />
            </div>
            <div className="campo">
              <label htmlFor="senha-entrar">Senha</label>
              <input
                id="senha-entrar"
                type="password"
                value={senhaEntrar}
                onChange={(e) => setSenhaEntrar(e.target.value)}
                required
              />
              <p className="hint">Demonstração: qualquer senha entra, desde que a conta exista.</p>
            </div>
            {erroEntrar && (
              <div className="erros" role="alert">
                {erroEntrar}
              </div>
            )}
            <button className="btn" type="submit" disabled={entrando}>
              {entrando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </section>
      )}

      {aba === 'criar' && (
        <section className="card">
          <form onSubmit={iniciarCriacao}>
            <div className="campo">
              <label htmlFor="nome-criar">Nome</label>
              <input
                id="nome-criar"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                maxLength={80}
              />
            </div>
            <div className="campo">
              <label htmlFor="email-criar">E-mail</label>
              <input
                id="email-criar"
                type="email"
                value={emailCriar}
                onChange={(e) => setEmailCriar(e.target.value)}
                required
              />
            </div>
            <div className="campo">
              <label htmlFor="senha-criar">Senha</label>
              <input
                id="senha-criar"
                type="password"
                value={senhaCriar}
                onChange={(e) => setSenhaCriar(e.target.value)}
                required
              />
            </div>
            <p className="hint">
              Assinatura de {brl(PRECO_ASSINATURA)}/mês. A conta e os contratos ficam salvos
              apenas neste navegador; criar uma conta substitui a conta existente neste
              navegador.
            </p>
            {erroCriar && (
              <div className="erros" role="alert">
                {erroCriar}
              </div>
            )}
            <button className="btn" type="submit">
              Assinar e criar conta — {brl(PRECO_ASSINATURA)}/mês
            </button>
          </form>
        </section>
      )}

      {pagamentoAberto && (
        <PagamentoDummy
          titulo="Assinatura do Portal do IRT-E"
          descricao={`${nome.trim()} · ${emailCriar.trim()} · ${brl(PRECO_ASSINATURA)}/mês`}
          confirmando={criando}
          onVoltar={() => setPagamentoAberto(false)}
          onConfirmar={() => void confirmarPagamento()}
        />
      )}
    </>
  );
}
