'use client';

import { useEffect, useState } from 'react';
import type { ResultadoConsulta } from '@portal-irt-e/engine';
import { descreverSerial } from '../../lib/decode';

type Resposta = (ResultadoConsulta & { disclaimer?: string; avisoEstimativa?: string | null }) | null;

const num4 = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });

const num2 = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Anos-base oferecidos na consulta: 2026 (padrão) até 2032, último com período aberto. */
const ANOS_BASE = ['2026', '2027', '2028', '2029', '2030', '2031', '2032'];

export default function ConsultaForm() {
  const [codigo, setCodigo] = useState('');
  const [anoBase, setAnoBase] = useState('2026');
  const [resposta, setResposta] = useState<Resposta>(null);
  const [carregando, setCarregando] = useState(false);

  // Permite links diretos (ex.: /consulta?codigo=IRT-E+...&anoBase=2028) vindos da Descoberta de série e de relatórios.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codigoParam = params.get('codigo');
    if (codigoParam) setCodigo(codigoParam);
    const anoParam = params.get('anoBase');
    if (anoParam && ANOS_BASE.includes(anoParam)) setAnoBase(anoParam);
  }, []);

  async function consultar(base: string) {
    if (!codigo.trim()) return;
    setCarregando(true);
    setResposta(null);
    try {
      const res = await fetch(
        `/api/consulta?codigo=${encodeURIComponent(codigo)}&anoBase=${base}`,
      );
      setResposta(await res.json());
    } finally {
      setCarregando(false);
    }
  }

  function aoMudarAnoBase(e: React.ChangeEvent<HTMLSelectElement>) {
    const base = e.target.value;
    setAnoBase(base);
    // Já consultado: recarrega a tabela para o novo ano-base (linhas até 2033).
    if (resposta) void consultar(base);
  }

  return (
    <>
      <form
        className="form-consulta"
        onSubmit={(e) => {
          e.preventDefault();
          void consultar(anoBase);
        }}
      >
        <input
          type="text"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="IRT-E BR100.000.1800.00.DMG0935-3"
          aria-label="Código da série IRT-E"
          required
        />
        <select value={anoBase} onChange={aoMudarAnoBase} aria-label="Ano-base">
          {ANOS_BASE.map((ano) => (
            <option key={ano} value={ano}>
              Ano-base {ano}
            </option>
          ))}
        </select>
        <button className="btn" type="submit" disabled={carregando}>
          {carregando ? 'Consultando…' : 'Consultar'}
        </button>
      </form>
      <p className="hint">
        O dígito verificador é validado antes do cálculo — como em um CNPJ. Exemplo válido:{' '}
        <code>IRT-E BR100.000.1800.00.DMG0935-3</code>
      </p>

      {resposta && !resposta.ok && (
        <div className="erros" role="alert">
          <strong>Código inválido — nenhum cálculo foi realizado.</strong>
          <ul>
            {resposta.erros.map((erro) => (
              <li key={erro}>{erro}</li>
            ))}
          </ul>
        </div>
      )}

      {resposta && resposta.ok && (
        <div className="resultado">
          <div className="card">
            <h2>{resposta.codigo}</h2>
            <dl className="dados-serie">
              <dt>Série</dt>
              <dd>{descreverSerial(resposta.serial).join(' · ')}</dd>
            </dl>
          </div>

          <div className="card">
            <h3>
              Fator F (teto) e IRT-E por período — ano-base {resposta.anoBase}
            </h3>
            <table className="tabela-periodos">
              <thead>
                <tr>
                  <th>Período</th>
                  <th>F (repasse integral)</th>
                  <th>IRT-E</th>
                </tr>
              </thead>
              <tbody>
                {resposta.periodos.map((p) => (
                  <tr key={p.t1}>
                    <td>
                      {p.t0} → {p.t1}
                    </td>
                    <td>{num4(p.F)}</td>
                    <td>{num4(p.irte)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>Parâmetros nacionais usados</h3>
            <p className="meta">
              CBS de referência {num2(resposta.parametros.cbs * 100)}% · teto IBS+CBS{' '}
              {num2(resposta.parametros.teto * 100)}%
              {resposta.parametros.ibsEstadual != null && (
                <>
                  {' '}· IBS estadual ({resposta.serial.uf}) {num2(resposta.parametros.ibsEstadual * 100)}%
                  {resposta.parametros.ufEstimativa ? ' (estimativa)' : ''} · IBS municipal{' '}
                  {num2((resposta.parametros.ibsMunicipal ?? 0) * 100)}%
                </>
              )}
            </p>
            <p className="meta">
              Versão dos parâmetros: <strong>{resposta.versaoParametros}</strong>. O código
              identifica a série; o período de aplicação é contextual à cláusula ou à publicação.
            </p>
            {resposta.avisoEstimativa && (
              <p className="meta">
                <strong>{resposta.avisoEstimativa}</strong>
              </p>
            )}
            <p className="meta">{resposta.disclaimer}</p>
          </div>
        </div>
      )}
    </>
  );
}
