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
import type { Contrato, ItemContrato } from '../../../../../lib/assinantes';
import { PRECO_MEMORIA_CALCULO } from '../../../../../lib/assinantes';
import PagamentoDummy from '../../../PagamentoDummy';
import TopoConta from '../../../TopoConta';
import { useContaAssinante } from '../../../useContaAssinante';

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

export default function ContratoClient({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { conta, pronto, hidratado, salvando, persistir } = useContaAssinante();
  // Código vindo do wizard (?codigo=...): pré-preenche o formulário de item e sai da URL.
  const [codigoInicial, setCodigoInicial] = useState(() => searchParams.get('codigo') ?? '');

  const [renomeando, setRenomeando] = useState(false);
  const [nomeEdicao, setNomeEdicao] = useState('');
  const [errosItem, setErrosItem] = useState<string[]>([]);
  const [memoriaItem, setMemoriaItem] = useState<ItemContrato | null>(null);
  const [memoriaPaga, setMemoriaPaga] = useState(false);

  const contrato = conta?.contratos.find((c) => c.id === id) ?? null;

  useEffect(() => {
    if (codigoInicial) router.replace(`/assinantes/dashboard/contrato/${id}`);
  }, [codigoInicial, id, router]);

  useEffect(() => {
    if (pronto && hidratado && !contrato) router.replace('/assinantes/dashboard');
  }, [pronto, hidratado, contrato, router]);

  useEffect(() => {
    if (contrato) document.title = `${contrato.nome} — Meus Contratos — Portal do IRT-E`;
  }, [contrato]);

  if (!pronto || (conta && !contrato && !hidratado)) {
    return (
      <section className="card">
        <p className="hint">Carregando contrato…</p>
      </section>
    );
  }
  if (!conta || !contrato) return null;

  function atualizarContrato(atualizado: Contrato) {
    if (!conta) return;
    persistir(conta.contratos.map((c) => (c.id === atualizado.id ? atualizado : c)));
  }

  function iniciarRenomeacao() {
    if (!contrato) return;
    setNomeEdicao(contrato.nome);
    setRenomeando(true);
  }

  function confirmarRenomeacao() {
    if (!contrato) return;
    const nome = nomeEdicao.trim();
    if (nome) atualizarContrato({ ...contrato, nome });
    setRenomeando(false);
  }

  function excluirContrato() {
    if (!conta || !contrato) return;
    if (!window.confirm(`Excluir o contrato "${contrato.nome}" e todos os seus itens?`)) return;
    persistir(conta.contratos.filter((c) => c.id !== contrato.id));
    router.push('/assinantes/dashboard');
  }

  function adicionarItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!contrato) return;
    const dados = new FormData(e.currentTarget);
    const nome = String(dados.get('nome') ?? '').trim();
    const codigo = String(dados.get('codigo') ?? '').trim();
    const precoBase = parsePreco(String(dados.get('preco') ?? ''));

    const erros: string[] = [];
    const parse = parseSerial(codigo);
    if (!parse.ok) erros.push(...parse.erros);
    if (precoBase == null) erros.push('Informe um preço-base válido (maior que zero).');
    if (!nome) erros.push('Informe o nome do item.');
    if (erros.length > 0) {
      setErrosItem(erros);
      return;
    }

    const item: ItemContrato = {
      nome,
      codigo: parse.ok ? parse.canonico : codigo,
      precoBase: precoBase!,
    };
    atualizarContrato({ ...contrato, itens: [...contrato.itens, item] });
    setErrosItem([]);
    setCodigoInicial('');
    e.currentTarget.reset();
  }

  function excluirItem(index: number) {
    if (!contrato) return;
    atualizarContrato({ ...contrato, itens: contrato.itens.filter((_, i) => i !== index) });
  }

  function abrirMemoriaCalculo(item: ItemContrato) {
    setMemoriaPaga(false);
    setMemoriaItem(item);
  }

  return (
    <>
      <TopoConta salvando={salvando} onVoltar={() => router.push('/assinantes/dashboard')}>
        <button className="btn secundario" onClick={() => window.print()}>
          Imprimir contrato
        </button>
      </TopoConta>

      <section className="card">
        <div className="contrato-cabecalho">
          {renomeando ? (
            <form
              className="form-consulta"
              onSubmit={(e) => {
                e.preventDefault();
                confirmarRenomeacao();
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
              <button className="btn secundario" type="button" onClick={() => setRenomeando(false)}>
                Cancelar
              </button>
            </form>
          ) : (
            <>
              <div>
                <h2>{contrato.nome}</h2>
                <p className="meta">Ano-base {contrato.anoBase}</p>
              </div>
              <div className="resumo-acoes">
                <button className="btn secundario" onClick={iniciarRenomeacao}>
                  Renomear
                </button>
                <button className="btn secundario" onClick={excluirContrato}>
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
              <p className="meta">Preço-base {brl(item.precoBase)}</p>
            </div>
            <div className="resumo-acoes">
              <button className="btn secundario" onClick={() => abrirMemoriaCalculo(item)}>
                Memória de Cálculo
              </button>
              <button className="btn secundario" onClick={() => excluirItem(index)}>
                Excluir
              </button>
            </div>
          </div>
        ))}

        <form className="form-item" onSubmit={adicionarItem}>
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
            className="btn secundario btn-wizard"
            onClick={() => router.push(`/wizard?origem=assinante&contrato=${contrato.id}`)}
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
          <button className="btn" type="submit">
            Adicionar item
          </button>
        </form>
        {errosItem.length > 0 && (
          <div className="erros" role="alert">
            <strong>Item não adicionado.</strong>
            <ul>
              {errosItem.map((erro) => (
                <li key={erro}>{erro}</li>
              ))}
            </ul>
          </div>
        )}

        <SimulacaoContrato contrato={contrato} />
      </section>

      {memoriaItem && (
        <PagamentoDummy
          titulo="Memória de Cálculo"
          descricao={`${memoriaItem.nome} — ${memoriaItem.codigo}`}
          valor={brl(PRECO_MEMORIA_CALCULO)}
          confirmado={memoriaPaga}
          mensagemSucesso="Pagamento confirmado (demonstração) — nada foi cobrado. A Memória de Cálculo completa do item entra em versão futura."
          onVoltar={() => setMemoriaItem(null)}
          onConfirmar={() => setMemoriaPaga(true)}
        />
      )}
    </>
  );
}

function SimulacaoContrato({ contrato }: { contrato: Contrato }) {
  if (contrato.itens.length === 0) return null;

  const simulacoes: SimulacaoItem[] = contrato.itens.map((item) => ({
    item,
    resultado: consultarSerie(item.codigo, PARAMS_V2026_10, contrato.anoBase),
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

  const linhas = Array.from({ length: 2033 - contrato.anoBase }, (_, i) => contrato.anoBase + 1 + i);

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
                <th key={`${s.item.codigo}-${i}`}>{s.item.nome}</th>
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
                  <td>
                    {contrato.anoBase} → {t1}
                  </td>
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
