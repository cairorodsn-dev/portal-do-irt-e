'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  AVISO_ESTIMATIVA,
  DISCLAIMER,
  PARAMS_V2026_10,
  consultarSerie,
  parseSerial,
} from '@portal-irt-e/engine';
import type { ResultadoConsulta } from '@portal-irt-e/engine';
import type { Conta, Contrato, ItemContrato } from '../../../lib/assinantes';
import {
  carregarConta,
  encerrarSessao,
  sessaoAtiva,
} from '../../../lib/assinantes';
import { carregarContratos, persistirContratos } from '../../../lib/assinantes-api';

const ANOS_BASE = [2026, 2027, 2028, 2029, 2030, 2031, 2032];

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

function parsePreco(texto: string): number | null {
  const v = Number(texto.trim().replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(v) && v > 0 ? v : null;
}

interface SimulacaoItem {
  item: ItemContrato;
  resultado: ResultadoConsulta;
}

export default function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conta, setConta] = useState<Conta | null>(null);
  const [pronto, setPronto] = useState(false);
  // Código vindo do wizard (?codigo=...): pré-preenche o formulário de item e sai da URL.
  const [codigoInicial, setCodigoInicial] = useState(() => searchParams.get('codigo') ?? '');

  const [novoContrato, setNovoContrato] = useState('');
  const [renomeandoId, setRenomeandoId] = useState<string | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState('');
  const [editandoPreco, setEditandoPreco] = useState<{ contratoId: string; index: number } | null>(
    null,
  );
  const [precoEdicao, setPrecoEdicao] = useState('');
  const [errosItem, setErrosItem] = useState<Record<string, string[]>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!sessaoAtiva()) {
      router.replace('/assinantes/entrar');
      return;
    }
    const local = carregarConta();
    setConta(local);
    setPronto(true);
    // Com o banco disponível, os contratos do servidor são a fonte da verdade.
    if (local) {
      void carregarContratos(local.email).then((remotos) => {
        if (remotos) {
          setConta((atual) => (atual ? { ...atual, contratos: remotos } : atual));
        }
      });
    }
  }, [router]);

  useEffect(() => {
    if (codigoInicial) router.replace('/assinantes/dashboard');
  }, [codigoInicial, router]);

  if (!pronto || !conta) return null;

  function persistir(contratos: Contrato[]) {
    setConta((atual) => (atual ? { ...atual, contratos } : atual));
    if (!conta) return;
    setSalvando(true);
    void persistirContratos(conta.email, contratos).finally(() => setSalvando(false));
  }

  function criarContrato(e: React.FormEvent) {
    e.preventDefault();
    const nome = novoContrato.trim();
    if (!nome || !conta) return;
    persistir([...conta.contratos, { id: crypto.randomUUID(), nome, itens: [] }]);
    setNovoContrato('');
  }

  function excluirContrato(id: string) {
    if (!conta) return;
    persistir(conta.contratos.filter((c) => c.id !== id));
  }

  function iniciarRenomeacao(contrato: Contrato) {
    setRenomeandoId(contrato.id);
    setNomeEdicao(contrato.nome);
  }

  function confirmarRenomeacao(id: string) {
    if (!conta) return;
    const nome = nomeEdicao.trim();
    if (nome) {
      persistir(conta.contratos.map((c) => (c.id === id ? { ...c, nome } : c)));
    }
    setRenomeandoId(null);
  }

  function adicionarItem(e: React.FormEvent<HTMLFormElement>, contrato: Contrato) {
    e.preventDefault();
    if (!conta) return;
    const dados = new FormData(e.currentTarget);
    const nome = String(dados.get('nome') ?? '').trim();
    const codigo = String(dados.get('codigo') ?? '').trim();
    const precoBase = parsePreco(String(dados.get('preco') ?? ''));
    const anoBase = Number(dados.get('anoBase') ?? 2026);

    const erros: string[] = [];
    const parse = parseSerial(codigo);
    if (!parse.ok) erros.push(...parse.erros);
    if (precoBase == null) erros.push('Informe um preço-base válido (maior que zero).');
    if (!nome) erros.push('Informe o nome do item.');
    if (erros.length > 0) {
      setErrosItem((atual) => ({ ...atual, [contrato.id]: erros }));
      return;
    }

    const item: ItemContrato = { nome, codigo: parse.ok ? parse.canonico : codigo, precoBase: precoBase!, anoBase };
    persistir(
      conta.contratos.map((c) => (c.id === contrato.id ? { ...c, itens: [...c.itens, item] } : c)),
    );
    setErrosItem((atual) => ({ ...atual, [contrato.id]: [] }));
    setCodigoInicial('');
    e.currentTarget.reset();
  }

  function excluirItem(contrato: Contrato, index: number) {
    if (!conta) return;
    persistir(
      conta.contratos.map((c) =>
        c.id === contrato.id ? { ...c, itens: c.itens.filter((_, i) => i !== index) } : c,
      ),
    );
  }

  function iniciarEdicaoPreco(contratoId: string, index: number, precoAtual: number) {
    setEditandoPreco({ contratoId, index });
    setPrecoEdicao(precoAtual.toFixed(2).replace('.', ','));
  }

  function confirmarEdicaoPreco(contrato: Contrato) {
    if (!conta || !editandoPreco) return;
    const preco = parsePreco(precoEdicao);
    if (preco != null) {
      persistir(
        conta.contratos.map((c) =>
          c.id === contrato.id
            ? {
                ...c,
                itens: c.itens.map((it, i) =>
                  i === editandoPreco.index ? { ...it, precoBase: preco } : it,
                ),
              }
            : c,
        ),
      );
    }
    setEditandoPreco(null);
  }

  function sair() {
    encerrarSessao();
    router.push('/assinantes');
    router.refresh();
  }

  return (
    <>
      <div className="dashboard-topo">
        <p className="meta">
          Conta: <strong>{conta.nome}</strong> ({conta.email})
          {salvando && ' · Salvando…'}
        </p>
        <button className="btn secundario" onClick={sair}>
          Sair
        </button>
      </div>

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
          <button className="btn" type="submit">
            Criar contrato
          </button>
        </form>
        {conta.contratos.length === 0 && (
          <p className="hint">
            Nenhum contrato ainda. Crie o primeiro acima e adicione os itens com o código serial
            IRT-E de cada um.
          </p>
        )}
      </section>

      {conta.contratos.map((contrato) => (
        <section key={contrato.id} className="card">
          <div className="contrato-cabecalho">
            {renomeandoId === contrato.id ? (
              <form
                className="form-consulta"
                onSubmit={(e) => {
                  e.preventDefault();
                  confirmarRenomeacao(contrato.id);
                }}
              >
                <input
                  type="text"
                  className="form-texto"
                  value={nomeEdicao}
                  onChange={(e) => setNomeEdicao(e.target.value)}
                  aria-label="Novo nome do contrato"
                  maxLength={80}
                  required
                />
                <button className="btn" type="submit">
                  Salvar
                </button>
                <button className="btn secundario" type="button" onClick={() => setRenomeandoId(null)}>
                  Cancelar
                </button>
              </form>
            ) : (
              <>
                <h2>{contrato.nome}</h2>
                <div className="resumo-acoes">
                  <button className="btn secundario" onClick={() => iniciarRenomeacao(contrato)}>
                    Renomear
                  </button>
                  <button className="btn secundario" onClick={() => excluirContrato(contrato.id)}>
                    Excluir contrato
                  </button>
                </div>
              </>
            )}
          </div>

          {contrato.itens.map((item, index) => (
            <div key={`${item.codigo}-${index}`} className="resumo-item">
              <div>
                <h3>
                  {item.nome} — <code>{item.codigo}</code>
                </h3>
                <p className="meta">
                  Preço-base{' '}
                  {editandoPreco?.contratoId === contrato.id && editandoPreco.index === index ? (
                    <>
                      <input
                        className="preco-edicao"
                        type="text"
                        value={precoEdicao}
                        onChange={(e) => setPrecoEdicao(e.target.value)}
                        aria-label={`Novo preço-base de ${item.nome}`}
                      />
                      <button
                        className="btn secundario"
                        onClick={() => confirmarEdicaoPreco(contrato)}
                      >
                        Salvar
                      </button>{' '}
                      <button className="btn secundario" onClick={() => setEditandoPreco(null)}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    brl(item.precoBase)
                  )}{' '}
                  · ano-base {item.anoBase}
                </p>
              </div>
              <div className="resumo-acoes">
                <button
                  className="btn secundario"
                  onClick={() => iniciarEdicaoPreco(contrato.id, index, item.precoBase)}
                >
                  Editar preço
                </button>
                <button className="btn secundario" onClick={() => excluirItem(contrato, index)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}

          <form className="form-item" onSubmit={(e) => adicionarItem(e, contrato)}>
            <input name="nome" type="text" placeholder="Nome do item" aria-label="Nome do item" maxLength={60} required />
            <input
              name="codigo"
              type="text"
              defaultValue={codigoInicial}
              placeholder="IRT-E BR100.000.1800.00.DMG0935-3"
              aria-label="Código serial IRT-E do item"
              required
            />
            <button
              type="button"
              className="btn secundario"
              onClick={() => router.push('/wizard?origem=assinante')}
            >
              Descobrir com o wizard
            </button>
            <input
              name="preco"
              type="text"
              inputMode="decimal"
              placeholder="Preço-base (R$)"
              aria-label="Preço-base em reais"
              required
            />
            <select name="anoBase" defaultValue={2026} aria-label="Ano-base">
              {ANOS_BASE.map((ano) => (
                <option key={ano} value={ano}>
                  Ano-base {ano}
                </option>
              ))}
            </select>
            <button className="btn" type="submit">
              Adicionar item
            </button>
          </form>
          {(errosItem[contrato.id]?.length ?? 0) > 0 && (
            <div className="erros" role="alert">
              <strong>Item não adicionado.</strong>
              <ul>
                {errosItem[contrato.id].map((erro) => (
                  <li key={erro}>{erro}</li>
                ))}
              </ul>
            </div>
          )}

          <SimulacaoContrato contrato={contrato} />
        </section>
      ))}
    </>
  );
}

function SimulacaoContrato({ contrato }: { contrato: Contrato }) {
  if (contrato.itens.length === 0) return null;

  const simulacoes: SimulacaoItem[] = contrato.itens.map((item) => ({
    item,
    resultado: consultarSerie(item.codigo, PARAMS_V2026_10, item.anoBase),
  }));
  const validas = simulacoes.filter(
    (s): s is SimulacaoItem & { resultado: Extract<ResultadoConsulta, { ok: true }> } =>
      s.resultado.ok,
  );
  const invalidas = simulacoes.filter((s) => !s.resultado.ok);

  if (validas.length === 0) {
    return (
      <div className="erros" role="alert">
        Nenhum item com código válido — a simulação não pôde ser calculada.
      </div>
    );
  }

  const bases = [...new Set(validas.map((s) => s.item.anoBase))];
  const baseUnica = bases.length === 1 ? bases[0] : null;
  const menorT1 = Math.min(...validas.map((s) => s.item.anoBase)) + 1;
  const linhas = Array.from({ length: 2033 - menorT1 + 1 }, (_, i) => menorT1 + i);

  const irtePorT1 = validas.map(
    (s) => new Map(s.resultado.ok ? s.resultado.periodos.map((p) => [p.t1, p.irte]) : []),
  );

  const temEstimativa = validas.some((s) => s.resultado.ok && s.resultado.parametrosEstimados);

  return (
    <div className="resultado">
      <h3>Simulação de reajuste — valores por período</h3>
      <div className="tabela-rolagem">
        <table className="tabela-periodos">
          <thead>
            <tr>
              <th>Período</th>
              {validas.map((s, i) => (
                <th key={`${s.item.codigo}-${i}`}>
                  {s.item.nome}
                  {baseUnica == null && ` (base ${s.item.anoBase})`}
                </th>
              ))}
              <th>Total do contrato</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((t1) => {
              let total = 0;
              const celulas = irtePorT1.map((porT1, i) => {
                const irte = porT1.get(t1);
                if (irte == null) return <td key={i}>—</td>;
                const valor = validas[i].item.precoBase * irte;
                total += valor;
                return <td key={i}>{brl(valor)}</td>;
              });
              return (
                <tr key={t1}>
                  <td>{baseUnica != null ? `${baseUnica} → ${t1}` : `até ${t1}`}</td>
                  {celulas}
                  <td>{brl(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {invalidas.map((s, i) => (
        <p key={`${s.item.codigo}-${i}`} className="meta item-invalido">
          <strong>{s.item.nome}</strong> (<code>{s.item.codigo}</code>) ficou fora da simulação:
          código inválido. Edite ou exclua o item acima.
        </p>
      ))}

      <p className="meta">
        Valores = preço-base × IRT-E do período, com os parâmetros versionados da consulta pública
        (versão atual: v2026-10-estimativa).
      </p>
      {temEstimativa && (
        <p className="meta">
          <strong>{AVISO_ESTIMATIVA}</strong>
        </p>
      )}
      <p className="meta">{DISCLAIMER}</p>
    </div>
  );
}
