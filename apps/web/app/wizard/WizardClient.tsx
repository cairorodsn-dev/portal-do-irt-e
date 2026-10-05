'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  apurarLegadaEfetiva,
  faixaPorRbt12,
} from '@portal-irt-e/engine';
import type {
  CargaLegadaUF,
  FaixaElasticidade,
  PacoteWizard,
  ReducaoSetorial,
  RegimeTributario,
  RespostasWizard,
  SerialIRTE,
  TipoObjeto,
} from '@portal-irt-e/engine';
import { descreverSerial } from '../../lib/decode';

export interface OpcoesWizard {
  pacotes: PacoteWizard[];
  ufs: { uf: string; ibsEstadual: number; estimativa: boolean; fonte: string | null }[];
  reducoes: ReducaoSetorial[];
  faixasEpsilon: FaixaElasticidade[];
  cargaLegada: CargaLegadaUF[];
  simplesFaixas: number[];
  simplesNominal2027: { anexo: number; faixa: number; aliquotaNominal: number }[];
  ibsMunicipalPadrao: number;
}

interface ResultadoItem {
  item: number;
  codigo: string;
  serial: SerialIRTE;
  periodos: { t0: number; t1: number; F: number; irte: number }[];
  parametros: {
    cbs: number;
    teto: number;
    ibsEstadual?: number;
    ibsMunicipal?: number;
    ufEstimativa?: boolean;
  };
}

type RespostaCalculo =
  | {
      ok: true;
      resultados: ResultadoItem[];
      versaoParametros: string;
      parametrosEstimados: boolean;
      disclaimer: string;
      avisoEstimativa: string | null;
    }
  | { ok: false; erros: { item: number; erros: string[] }[]; disclaimer: string };

/** Estado do pedido avulso. Fase "paywall simulado": mockado no cliente. Quando o
 * Mercado Pago chegar, este tipo vira a ordem persistida no servidor, criada antes do
 * wizard e liberada pelo webhook de pagamento. */
interface PedidoMock {
  id: string;
  pacoteId: string;
  quantidadeItens: number;
  valor: number;
  status: 'pendente' | 'pago';
  criadoEm: string;
}

type Etapa = 'pacote' | 'item' | 'resumo' | 'pedido' | 'resultado';
type PassoId =
  | 'tipo'
  | 'destino'
  | 'regime'
  | 'simples'
  | 'legada'
  | 'rho'
  | 'epsilon'
  | 'credito'
  | 'sufixos';

const TIPOS: { valor: TipoObjeto; titulo: string; detalhe: string }[] = [
  { valor: 'B', titulo: 'Bem ou produto', detalhe: 'Material, equipamento, mercadoria — coisa que se entrega.' },
  { valor: 'S', titulo: 'Serviço', detalhe: 'Prestação de serviço, locação, manutenção.' },
];

const REGIMES: { valor: RegimeTributario; titulo: string; detalhe: string }[] = [
  { valor: 'R', titulo: 'Lucro real', detalhe: 'Não cumulativo: tem crédito no ano-base (alíquota de referência 9,25%).' },
  { valor: 'P', titulo: 'Lucro presumido', detalhe: 'PIS/Cofins cumulativo: 3,65%, sem crédito. O ICMS segue não cumulativo — tem crédito.' },
  { valor: 'H', titulo: 'Simples híbrido', detalhe: 'IBS/CBS apurados fora do DAS — opção semestral a partir de 2027 (confira o PGDAS-D do fornecedor).' },
];

const ANEXOS: { valor: 1 | 2 | 3 | 4 | 5; label: string }[] = [
  { valor: 1, label: 'Anexo I — Comércio (a partir de 2027: Anexo XVIII da LC 214/2025)' },
  { valor: 2, label: 'Anexo II — Indústria (a partir de 2027: Anexo XIX da LC 214/2025)' },
  { valor: 3, label: 'Anexo III — Serviços: locação, hospedagem, transporte (a partir de 2027: Anexo XX da LC 214/2025)' },
  { valor: 4, label: 'Anexo IV — Serviços profissionais (a partir de 2027: Anexo XXI da LC 214/2025)' },
  { valor: 5, label: 'Anexo V — Serviços diversos (a partir de 2027: Anexo XXII da LC 214/2025)' },
];

const num4 = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });

const pct = (v: number, casas = 2) => `${(v * 100).toFixed(casas).replace('.', ',')}%`;

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

// Régua de elasticidade: 0,05–9,99 em escala partida, com ε = 1 exatamente no centro
// (metade esquerda cobre 0,05–1; metade direita, 1–9,99).
const EPS_MIN = 0.05;
const EPS_MAX = 9.99;
const REGUA_MAX = 1000;

const epsilonParaRegua = (e: number) => {
  const t = e <= 1 ? ((e - EPS_MIN) / (1 - EPS_MIN)) * 0.5 : 0.5 + ((e - 1) / (EPS_MAX - 1)) * 0.5;
  return Math.round(t * REGUA_MAX);
};

const reguaParaEpsilon = (s: number) => {
  const t = s / REGUA_MAX;
  const v = t <= 0.5 ? EPS_MIN + (t / 0.5) * (1 - EPS_MIN) : 1 + ((t - 0.5) / 0.5) * (EPS_MAX - 1);
  return Math.round(v * 100) / 100;
};

export default function WizardClient({ opcoes }: { opcoes: OpcoesWizard }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Modo assinante (?origem=assinante): item único, sem pacote e sem pagamento — o
  // resultado volta para o dashboard de assinantes com o código descoberto.
  const modoAssinante = searchParams.get('origem') === 'assinante';
  const [etapa, setEtapa] = useState<Etapa>(modoAssinante ? 'item' : 'pacote');
  const [pacote, setPacote] = useState<PacoteWizard | null>(null);
  const [itens, setItens] = useState<RespostasWizard[]>([]);
  const [rascunho, setRascunho] = useState<RespostasWizard>(() => novoRascunho());
  const [passoAtual, setPassoAtual] = useState(0);
  const [calculo, setCalculo] = useState<RespostaCalculo | null>(null);
  const [carregandoCalculo, setCarregandoCalculo] = useState(false);
  const [pedido, setPedido] = useState<PedidoMock | null>(null);
  const [editandoIndex, setEditandoIndex] = useState<number | null>(null);
  // Nomes de exibição dos itens (só cliente — não entram no cálculo nem no serial).
  const [nomes, setNomes] = useState<string[]>([]);
  const legadaEditada = useRef(false);
  const chaveCalculoRef = useRef<string | null>(null);
  // Várias hipóteses da LC 214 dividem o mesmo ρ — o select marca por índice na lista
  // filtrada, não pelo valor, senão a escolha "pula" para a primeira opção com o mesmo ρ.
  const [rhoSel, setRhoSel] = useState<number | null>(null);

  function novoRascunho(): RespostasWizard {
    return {
      tipo: 'B',
      ibsMunicipal: opcoes.ibsMunicipalPadrao,
      regime: 'R',
      aliquotaLegada: 0.18,
      reducaoBase: 0,
      rho: 0,
      epsilon: 1,
      creditamento: 0,
    };
  }

  // Sugestão de carga legada segue UF/tipo enquanto o usuário não editar o campo.
  useEffect(() => {
    if (legadaEditada.current) return;
    const linha = opcoes.cargaLegada.find((c) => c.uf === rascunho.uf);
    if (!linha) return;
    const sugerida = rascunho.tipo === 'B' ? linha.icmsInterno : linha.issReferencia;
    setRascunho((r) => (r.aliquotaLegada === sugerida ? r : { ...r, aliquotaLegada: sugerida }));
  }, [rascunho.tipo, rascunho.uf, opcoes.cargaLegada]);

  // Se os search params só ficarem disponíveis após a montagem, entra no modo assinante.
  useEffect(() => {
    if (modoAssinante && etapa === 'pacote') setEtapa('item');
  }, [modoAssinante, etapa]);

  // Ao entrar no resumo (ou direto no resultado, no modo assinante), calcula os índices
  // dos itens (uma única vez por composição).
  // Timeout de 20 s: se a camada de rede travar (ex.: service worker obsoleto), cai no
  // estado de erro em vez de ficar "Calculando…" para sempre.
  // A chave por composição (e não `carregandoCalculo` nas dependências) evita que o
  // próprio setCarregandoCalculo(true) reexecute o efeito e aborte o fetch em andamento.
  useEffect(() => {
    const calculavel = etapa === 'resumo' || (modoAssinante && etapa === 'resultado');
    if (!calculavel || itens.length === 0) return;
    const chave = JSON.stringify(itens);
    if (chaveCalculoRef.current === chave && calculo) return;
    chaveCalculoRef.current = chave;
    let cancelado = false;
    const controleAborto = new AbortController();
    const timeout = setTimeout(() => controleAborto.abort(), 20000);
    setCarregandoCalculo(true);
    fetch('/api/wizard/calcular', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itens }),
      signal: controleAborto.signal,
    })
      .then(async (res) => (await res.json()) as RespostaCalculo)
      .then((json) => {
        if (!cancelado) setCalculo(json);
      })
      .catch(() => {
        if (!cancelado) {
          setCalculo({ ok: false, erros: [{ item: 0, erros: ['Falha de comunicação com o servidor.'] }], disclaimer: '' });
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (!cancelado) setCarregandoCalculo(false);
      });
    return () => {
      cancelado = true;
      controleAborto.abort();
    };
  }, [etapa, calculo, itens, modoAssinante]);

  const passos: { id: PassoId; titulo: string }[] = [
    { id: 'tipo', titulo: 'O que o fornecedor entrega?' },
    ...(rascunho.regime === 'U' ? [] : [{ id: 'destino' as const, titulo: 'Pra onde o item vai?' }]),
    { id: 'regime', titulo: 'Qual o regime do fornecedor?' },
    ...(rascunho.regime === 'H' ? [{ id: 'simples' as const, titulo: 'Simples do fornecedor' }] : []),
    { id: 'legada', titulo: 'Carga legada (ICMS/ISS)' },
    { id: 'rho', titulo: 'O item tem redução setorial?' },
    ...(rascunho.regime === 'R' || rascunho.regime === 'P' || rascunho.regime === 'H'
      ? [{ id: 'credito' as const, titulo: 'Creditamento no ano-base' }]
      : []),
    ...(rascunho.tipo === 'B' ? [{ id: 'sufixos' as const, titulo: 'Impostos extras do produto' }] : []),
    { id: 'epsilon', titulo: 'Qual a elasticidade do preço?' },
  ];
  const passo = passos[passoAtual]!;
  const ultimoPasso = passoAtual === passos.length - 1;

  function atualizar(patch: Partial<RespostasWizard>) {
    setRascunho((r) => ({ ...r, ...patch }));
  }

  function definirSufixo(chave: 'is' | 'ipiBase' | 'zfm', valor: number | undefined) {
    const patch: Partial<RespostasWizard> = {};
    if (chave === 'is') patch.is = valor;
    else if (chave === 'ipiBase') patch.ipiBase = valor;
    else patch.zfm = valor;
    atualizar(patch);
  }

  function passoValido(): boolean {
    switch (passo.id) {
      case 'destino':
        return rascunho.uf != null && (rascunho.uf === 'EX' || rascunho.ibsMunicipal != null);
      case 'simples':
        return rascunho.anexo != null && rascunho.rbt12 != null && rascunho.rbt12 >= 0;
      default:
        return true;
    }
  }

  function avancar() {
    if (!passoValido()) return;
    if (!ultimoPasso) {
      setPassoAtual(passoAtual + 1);
      return;
    }
    const novosItens =
      editandoIndex != null
        ? itens.map((it, i) => (i === editandoIndex ? rascunho : it))
        : [...itens, rascunho];
    setItens(novosItens);
    setEditandoIndex(null);
    setRascunho(novoRascunho());
    legadaEditada.current = false;
    setPassoAtual(0);
    setCalculo(null);
    setEtapa(modoAssinante ? 'resultado' : 'resumo');
  }

  function voltar() {
    if (passoAtual > 0) {
      setPassoAtual(passoAtual - 1);
    } else if (modoAssinante) {
      router.push('/assinantes/dashboard');
    } else if (itens.length > 0) {
      setEditandoIndex(null);
      setEtapa('resumo');
    } else {
      setEtapa('pacote');
    }
  }

  function adicionarItem() {
    setRascunho(novoRascunho());
    legadaEditada.current = false;
    setEditandoIndex(null);
    setPassoAtual(0);
    setCalculo(null);
    setEtapa('item');
  }

  function editarItem(index: number) {
    const alvo = itens[index];
    if (!alvo) return;
    setRascunho({ ...alvo });
    legadaEditada.current = true; // preserva o valor cadastrado; não sobrescreve com a sugestão automática
    setEditandoIndex(index);
    setPassoAtual(0);
    setEtapa('item');
  }

  function excluirItem(index: number) {
    setItens((lista) => lista.filter((_, i) => i !== index));
    setNomes((lista) => lista.filter((_, i) => i !== index));
    setEditandoIndex(null);
    setCalculo(null); // o resumo recalcula sozinho ao notar a mudança em `itens`
  }

  function renomearItem(index: number, nome: string) {
    setNomes((lista) => {
      const copia = [...lista];
      copia[index] = nome;
      return copia;
    });
  }

  const nomeDoItem = (index: number) => nomes[index]?.trim() || `Item ${index + 1}`;

  function abandonarItem() {
    setRascunho(novoRascunho());
    legadaEditada.current = false;
    setEditandoIndex(null);
    setPassoAtual(0);
    setEtapa('resumo');
  }

  function resumoItem(item: RespostasWizard): string {
    const tipo = item.tipo === 'B' ? 'Bem/produto' : 'Serviço';
    const regime = REGIMES.find((r) => r.valor === item.regime)?.titulo ?? item.regime;
    const partes = [tipo, regime];
    if (item.uf === 'EX') partes.push('exterior');
    else if (item.uf) partes.push(`destino ${item.uf}`);
    partes.push(`ε = ${item.epsilon.toString().replace('.', ',')}`);
    if (item.regime === 'H' && item.anexo != null) {
      partes.push(`Anexo ${item.anexo}, faixa ${faixaPorRbt12(item.rbt12 ?? 0, opcoes.simplesFaixas)}`);
    }
    return partes.join(' · ');
  }

  // PONTO DE INTEGRAÇÃO (pagamento real): o modal dummy abaixo ("Pague o aluguel") será
  // substituído pelo checkout do Mercado Pago (link/QR Code). O botão "Não quero pagar"
  // — a "confirmação de pagamento" — dá lugar à liberação real via webhook.
  function gerarPedido() {
    if (!pacote || !calculo?.ok) return;
    setPedido({
      id: crypto.randomUUID(),
      pacoteId: pacote.id,
      quantidadeItens: itens.length,
      valor: pacote.preco,
      status: 'pendente',
      criadoEm: new Date().toISOString(),
    });
    setEtapa('pedido');
  }

  const MACRO = modoAssinante
    ? ['Perguntas', 'Resultado']
    : ['Começo', 'Perguntas', 'Resumo', 'Pagamento', 'Resultado'];
  const macroAtual = modoAssinante
    ? etapa === 'resultado'
      ? 1
      : 0
    : etapa === 'pacote'
      ? 0
      : etapa === 'item'
        ? 1
        : etapa === 'resumo'
          ? 2
          : etapa === 'pedido'
            ? 3
            : 4;

  return (
    <div className="wizard">
      <ol className="passos">
        {MACRO.map((nome, i) => (
          <li key={nome} className={i < macroAtual ? 'feito' : i === macroAtual ? 'atual' : ''}>
            {nome === 'Resumo' && etapa === 'item' && itens.length > 0 ? (
              <button
                type="button"
                className="passo-link"
                onClick={abandonarItem}
                title="Descartar este item e voltar ao resumo"
              >
                {nome}
              </button>
            ) : (
              nome
            )}
          </li>
        ))}
      </ol>

      {etapa === 'pacote' && (
        <section className="card">
          <h2>Por onde começamos?</h2>
          <p className="hint">
            A gente descobre o código IRT-E de cada item do seu contrato fazendo algumas perguntas
            sobre o fornecedor. Você paga uma vez por sessão, sem assinatura. Querendo, o
            Certificado de Série e a Memória de Cálculo saem no final, como compra à parte.
          </p>
          <div className="pacotes">
            {opcoes.pacotes.map((p) => (
              <button key={p.id} className="pacote" onClick={() => { setPacote(p); setEtapa('item'); }}>
                <span className="pacote-preco">{brl(p.preco)}</span>
                <span className="pacote-nome">{p.nome}</span>
                <span className="pacote-detalhe">
                  {p.itens === 3 ? 'Contratos menores, com poucos itens' : p.itens === 10 ? 'Contratos com vários itens' : 'Contratos grandes, cheios de itens'}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {etapa === 'item' && (pacote || modoAssinante) && (
        <section className="card">
          <p className="meta">
            {modoAssinante ? (
              <>
                Descoberta para item de contrato · pergunta {passoAtual + 1} de {passos.length}:{' '}
                <strong>{passo.titulo}</strong>
              </>
            ) : (
              <>
                {editandoIndex != null ? `Editando item ${editandoIndex + 1}` : `Item ${itens.length + 1}`}{' '}
                (pacote {pacote?.nome.toLowerCase()}) · pergunta {passoAtual + 1} de{' '}
                {passos.length}: <strong>{passo.titulo}</strong>
              </>
            )}
          </p>
          <div className="progresso">
            <div style={{ width: `${((passoAtual + 1) / passos.length) * 100}%` }} />
          </div>

          {passo.id === 'tipo' && (
            <OpcoesCards
              nome="tipo"
              valor={rascunho.tipo}
              onChange={(tipo) =>
                atualizar(
                  tipo === 'S'
                    ? { tipo, rho: 0, is: undefined, ipiBase: undefined, zfm: undefined }
                    : { tipo, rho: 0 },
                )
              }
              opcoes={TIPOS}
            />
          )}

          {passo.id === 'destino' && (
            <>
              <div className="campo">
                <label htmlFor="uf">Pra qual UF vai o item? (onde fica quem compra)</label>
                <select
                  id="uf"
                  value={rascunho.uf ?? ''}
                  onChange={(e) => atualizar({ uf: e.target.value || undefined })}
                >
                  <option value="">Escolha a UF…</option>
                  {opcoes.ufs.map((u) => (
                    <option key={u.uf} value={u.uf}>
                      {u.uf}
                    </option>
                  ))}
                  <option value="EX">EX — exterior (exportação)</option>
                </select>
              </div>
              {rascunho.uf && rascunho.uf !== 'EX' && (
                <>
                  <p className="hint">
                    IBS estadual, resolvido por aqui:{' '}
                    <strong>{pct(opcoes.ufs.find((u) => u.uf === rascunho.uf)?.ibsEstadual ?? 0)}</strong>
                    {opcoes.ufs.find((u) => u.uf === rascunho.uf)?.estimativa ? ' (estimativa)' : ''}.{' '}
                    {opcoes.ufs.find((u) => u.uf === rascunho.uf)?.fonte ?? ''}
                  </p>
                  <CampoPercentual
                    id="ibsMunicipal"
                    rotulo="E o IBS municipal?"
                    valor={rascunho.ibsMunicipal ?? opcoes.ibsMunicipalPadrao}
                    onChange={(ibsMunicipal) => atualizar({ ibsMunicipal })}
                    hint="Já preenchemos com a estimativa de referência. Se o município já publicou alíquota própria, é só ajustar — o valor vai parar no código como premissa auditável."
                  />
                </>
              )}
              {rascunho.uf === 'EX' && (
                <p className="hint">
                  Exportação: imunidade de exportação — IBS estadual e municipal zerados no cálculo.
                </p>
              )}
            </>
          )}

          {passo.id === 'regime' && (
            <>
              <OpcoesCards
                nome="regime"
                valor={rascunho.regime}
                onChange={(regime) => atualizar({ regime })}
                opcoes={REGIMES}
              />
              <p className="hint">
                Fornecedor no Simples puro? O índice é sempre 1,0000 — não tem reajuste pra
                calcular. Não existe valor nesse cálculo.
              </p>
            </>
          )}

          {passo.id === 'simples' && rascunho.regime === 'H' && (
            <>
              <div className="campo">
                <label htmlFor="anexo">Em qual anexo do Simples o fornecedor se encaixava na data da proposta?</label>
                <select
                  id="anexo"
                  value={rascunho.anexo ?? ''}
                  onChange={(e) => atualizar({ anexo: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
                >
                  <option value="">Escolha o anexo…</option>
                  {ANEXOS.map((a) => (
                    <option key={a.valor} value={a.valor}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="rbt12">Quanto o fornecedor faturou nos 12 meses antes da proposta? (RBT12 do ano-base, em R$)</label>
                <input
                  id="rbt12"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1000}
                  value={rascunho.rbt12 ?? ''}
                  onChange={(e) => atualizar({ rbt12: e.target.value === '' ? undefined : Number(e.target.value) })}
                />
              </div>
              {rascunho.rbt12 != null && rascunho.rbt12 >= 0 && (
                <p className="hint">
                  Faixa calculada:{' '}
                  <strong>
                    {faixaPorRbt12(rascunho.rbt12, opcoes.simplesFaixas)}
                    {rascunho.anexo != null &&
                      (() => {
                        const linha = opcoes.simplesNominal2027.find(
                          (s) => s.anexo === rascunho.anexo && s.faixa === faixaPorRbt12(rascunho.rbt12!, opcoes.simplesFaixas),
                        );
                        return linha ? ` — alíquota nominal ${linha.aliquotaNominal.toString().replace('.', ',')}% (2027)` : '';
                      })()}
                  </strong>
                  . O RBT12 não vai no código: só a faixa.
                </p>
              )}
            </>
          )}

          {passo.id === 'legada' && (
            <>
              <CampoPercentual
                id="aliquotaLegada"
                rotulo={rascunho.tipo === 'B' ? 'ICMS que já está no preço' : 'ISS que já está no preço'}
                valor={rascunho.aliquotaLegada}
                onChange={(aliquotaLegada) => {
                  legadaEditada.current = true;
                  atualizar({ aliquotaLegada });
                }}
                hint={(() => {
                  const linha = opcoes.cargaLegada.find((c) => c.uf === rascunho.uf);
                  if (!linha) return 'Informe a alíquota efetiva do produto/serviço.';
                  return rascunho.tipo === 'B'
                    ? `Sugestão para ${rascunho.uf}: ICMS interno ${pct(linha.icmsInterno)} (estimativa${linha.fonte ? ` — ${linha.fonte}` : ''}). Confirme na legislação estadual.`
                    : `Sugestão: ISS de referência ${pct(linha.issReferencia)} (estimativa). Confirme na lei municipal do município do tomador.`;
                })()}
              />
              <CampoPercentual
                id="reducaoBase"
                rotulo="O estado ou município reduz a base?"
                valor={rascunho.reducaoBase}
                onChange={(reducaoBase) => {
                  legadaEditada.current = true;
                  atualizar({ reducaoBase });
                }}
                hint="Se houver redução de base, informe aqui — a gente apura o efetivo."
              />
              <p className="hint">
                No fim das contas, entra no código: <strong>{pct(apurarLegadaEfetiva(rascunho))}</strong>
              </p>
            </>
          )}

          {passo.id === 'rho' && (() => {
            const lista = opcoes.reducoes.filter((r) => r.aplicavelA === 'ambos' || r.aplicavelA === rascunho.tipo);
            const indiceAtual =
              rhoSel != null && lista[rhoSel] && lista[rhoSel].rho === rascunho.rho
                ? rhoSel
                : Math.max(0, lista.findIndex((r) => r.rho === rascunho.rho));
            return (
              <div className="campo">
                <label htmlFor="rho">Como o item se classifica na LC 214/2025?</label>
                <select
                  id="rho"
                  value={String(indiceAtual)}
                  onChange={(e) => {
                    const i = Number(e.target.value);
                    setRhoSel(i);
                    atualizar({ rho: lista[i].rho });
                  }}
                >
                  {lista.map((r, i) => (
                    <option key={r.descricao} value={String(i)}>
                      {pct(r.rho, 0)} — {r.descricao} ({r.fundamento})
                    </option>
                  ))}
                </select>
              </div>
            );
          })()}

          {passo.id === 'epsilon' && (
            <>
              <div className="campo">
                <label htmlFor="epsilonRegua">
                  Quanto a procura reage ao preço?{' '}
                  <span className="info-icone" tabIndex={0} aria-label="O que puxa a elasticidade">
                    ⓘ
                    <span className="info-balao" role="tooltip">
                      <strong>Puxam pra baixo</strong> (ε menor que 1 — a procura quase não muda):
                      item essencial (comida básica, remédio, energia), sem substituto fácil, prazo
                      curto, hábito ou vício (cigarro, álcool), ou peso pequeno no bolso.
                      <br />
                      <strong>1 = metade/metade:</strong> o repasse é dividido igualmente entre
                      fornecedor e comprador.
                      <br />
                      <strong>Puxam pra cima</strong> (ε maior que 1 — a procura reage forte):
                      substitutos fáceis (etanol × gasolina, marcas concorrentes), item supérfluo
                      ou de luxo, prazo longo (dá pra trocar de carro ou mudar hábitos), peso
                      grande no bolso ou compra que dá pra adiar (veículos, eletrodomésticos).
                    </span>
                  </span>
                </label>
                <input
                  id="epsilonRegua"
                  className="regua"
                  type="range"
                  min={0}
                  max={REGUA_MAX}
                  step={1}
                  value={epsilonParaRegua(rascunho.epsilon)}
                  onChange={(e) => atualizar({ epsilon: reguaParaEpsilon(Number(e.target.value)) })}
                />
                <div className="regua-marcas" aria-hidden="true">
                  <span>0,05</span>
                  <span className="centro">1 = metade/metade</span>
                  <span>9,99</span>
                </div>
                <div className="regua-zonas" aria-hidden="true">
                  <span>← Não repassa (inelástica)</span>
                  <span>Repassa (elástica) →</span>
                </div>
              </div>
              <p className="hint">
                Com ε = {rascunho.epsilon.toFixed(2).replace('.', ',')}, o índice reconhece κ ={' '}
                {pct(rascunho.epsilon / (1 + rascunho.epsilon), 4)} do repasse — quanto maior a
                elasticidade, mais repasse vai para o comprador.
              </p>
            </>
          )}

          {passo.id === 'credito' && (rascunho.regime === 'R' || rascunho.regime === 'P' || rascunho.regime === 'H') && (
            <CampoPercentual
              id="credito"
              rotulo="Percentual de creditamento estimado no ano-base"
              valor={rascunho.creditamento ?? 0}
              max={99}
              onChange={(creditamento) => atualizar({ creditamento })}
              hint={
                rascunho.regime === 'H'
                  ? 'No Simples híbrido, o IBS/CBS é apurado fora do DAS pelo regime regular, não cumulativo — aqui o percentual mede o crédito de IBS/CBS. Se o creditamento não foi considerado na negociação do preço, use 0%.'
                  : 'Vale para todo tributo não cumulativo: ICMS e IBS/CBS, mais o PIS/Cofins no lucro real. No presumido, o PIS/Cofins é cumulativo e fica de fora — aqui o percentual mede o crédito de ICMS. Se o creditamento não foi considerado na negociação do preço, use 0%.'
              }
            />
          )}

          {passo.id === 'sufixos' && rascunho.tipo === 'B' && (
            <>
              {(
                [
                  { chave: 'is', rotulo: 'Tem Imposto Seletivo?' },
                  { chave: 'ipiBase', rotulo: 'Teve IPI no ano-base?' },
                  { chave: 'zfm', rotulo: 'IPI remanescente na Zona Franca de Manaus?' },
                ] as const
              ).map(({ chave, rotulo }) => {
                const ativo = rascunho[chave] != null;
                return (
                  <div key={chave} className="campo-sufixo">
                    <label className="sufixo-check">
                      <input
                        type="checkbox"
                        checked={ativo}
                        onChange={(e) => definirSufixo(chave, e.target.checked ? 0 : undefined)}
                      />
                      {rotulo}
                    </label>
                    {ativo && (
                      <CampoPercentual
                        id={`sufixo-${chave}`}
                        rotulo="Alíquota"
                        valor={rascunho[chave] ?? 0}
                        onChange={(v) => definirSufixo(chave, v)}
                      />
                    )}
                  </div>
                );
              })}
              <p className="hint">Vários marcados? A gente compõe na ordem certa do código: IS, PI, ZF.</p>
            </>
          )}

          <div className="passo-rodape">
            <button className="btn secundario" onClick={voltar}>
              Voltar
            </button>
            <button className="btn" onClick={avancar} disabled={!passoValido()}>
              {ultimoPasso ? 'Concluir item' : 'Avançar'}
            </button>
          </div>
        </section>
      )}

      {(etapa === 'resumo' || etapa === 'pedido') && pacote && (
        <section className="card">
          <h2>Resumo — {itens.length} {itens.length === 1 ? 'item' : 'itens'} (pacote {pacote.nome.toLowerCase()})</h2>
          {carregandoCalculo && <p className="hint">Calculando os índices…</p>}

          {calculo && !calculo.ok && (
            <div className="erros" role="alert">
              <strong>Ops — não consegui calcular.</strong>
              <ul>
                {calculo.erros.flatMap((e) =>
                  e.erros.map((msg) => <li key={`${e.item}-${msg}`}>{e.item > 0 ? `Item ${e.item}: ${msg}` : msg}</li>),
                )}
              </ul>
            </div>
          )}

          {itens.map((item, i) => (
            <div key={i} className="resumo-item">
              <div>
                <h3 className="resumo-item-titulo">
                  <input
                    className="nome-item"
                    value={nomes[i] ?? `Item ${i + 1}`}
                    onChange={(e) => renomearItem(i, e.target.value)}
                    aria-label={`Nome do item ${i + 1}`}
                    maxLength={60}
                  />
                  {calculo?.ok && calculo.resultados[i] && (
                    <strong className="selo-localizado">IRT-E localizado</strong>
                  )}
                </h3>
                <p className="meta">{resumoItem(item)}</p>
              </div>
              <div className="resumo-acoes">
                <button className="btn secundario" onClick={() => editarItem(i)}>Editar</button>
                <button className="btn secundario" onClick={() => excluirItem(i)}>Excluir</button>
              </div>
            </div>
          ))}

          <div className="passo-rodape">
            <button className="btn secundario" onClick={adicionarItem} disabled={itens.length >= pacote.itens}>
              {itens.length >= pacote.itens ? `Limite do pacote (${pacote.itens} itens)` : 'Adicionar outro item'}
            </button>
            <button
              className="btn"
              onClick={gerarPedido}
              disabled={!calculo?.ok || itens.length === 0}
            >
              Fechar pedido — {brl(pacote.preco)}
            </button>
          </div>
        </section>
      )}

      {etapa === 'pedido' && pedido && pacote && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="titulo-pagamento">
          <div className="modal">
            <h2 id="titulo-pagamento">Pague o aluguel</h2>
            <p className="meta">
              Pedido {pedido.id.slice(0, 8)}… · {pedido.quantidadeItens}{' '}
              {pedido.quantidadeItens === 1 ? 'item' : 'itens'} · <strong>{brl(pedido.valor)}</strong>
            </p>
            <p className="hint">Demonstração: no lugar desta tela entra o link do Mercado Pago.</p>
            <div className="passo-rodape">
              <button className="btn secundario" onClick={() => setEtapa('resumo')}>
                Voltar
              </button>
              <button
                className="btn"
                onClick={() => {
                  setPedido({ ...pedido, status: 'pago' });
                  setEtapa('resultado');
                }}
              >
                Não quero pagar
              </button>
            </div>
          </div>
        </div>
      )}

      {etapa === 'resultado' && modoAssinante && (
        <>
          {carregandoCalculo && (
            <section className="card">
              <p className="hint">Calculando os índices…</p>
            </section>
          )}

          {calculo && !calculo.ok && (
            <section className="card">
              <div className="erros" role="alert">
                <strong>Ops — não consegui calcular.</strong>
                <ul>
                  {calculo.erros.flatMap((e) =>
                    e.erros.map((msg) => <li key={`${e.item}-${msg}`}>{msg}</li>),
                  )}
                </ul>
              </div>
              <div className="passo-rodape">
                <button
                  className="btn secundario"
                  onClick={() => {
                    setItens([]);
                    setRascunho(novoRascunho());
                    legadaEditada.current = false;
                    setPassoAtual(0);
                    setCalculo(null);
                    setEtapa('item');
                  }}
                >
                  Refazer as perguntas
                </button>
                <button className="btn secundario" onClick={() => router.push('/assinantes/dashboard')}>
                  Voltar ao dashboard
                </button>
              </div>
            </section>
          )}

          {calculo?.ok && calculo.resultados[0] && (
            <section className="card">
              <h2>Código descoberto</h2>
              <h3>
                <code>{calculo.resultados[0].codigo}</code>
              </h3>
              <p className="meta">{descreverSerial(calculo.resultados[0].serial).join(' · ')}</p>
              <table className="tabela-periodos">
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>F (repasse integral)</th>
                    <th>IRT-E</th>
                  </tr>
                </thead>
                <tbody>
                  {calculo.resultados[0].periodos.map((p) => (
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
              {calculo.avisoEstimativa && (
                <p className="meta">
                  <strong>{calculo.avisoEstimativa}</strong>
                </p>
              )}
              <p className="meta">{calculo.disclaimer}</p>
              <div className="passo-rodape">
                <button className="btn secundario" onClick={() => router.push('/assinantes/dashboard')}>
                  Voltar ao dashboard
                </button>
                <button
                  className="btn"
                  onClick={() =>
                    router.push(
                      `/assinantes/dashboard?codigo=${encodeURIComponent(calculo.resultados[0]!.codigo)}`,
                    )
                  }
                >
                  Usar este código no item
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {etapa === 'resultado' && calculo?.ok && pacote && (
        <>
          <section className="card">
            <h2>Obrigado, aqui estão seus códigos</h2>
            <p className="hint">
              Nada foi cobrado de verdade. Os códigos já podem entrar em cláusulas — e qualquer um
              confere de graça na consulta pública.
            </p>
          </section>
          {calculo.resultados.map((r) => (
            <div key={r.item} className="card">
              <h3>
                {nomeDoItem(r.item - 1)} — <code>{r.codigo}</code>
              </h3>
              <p className="meta">{descreverSerial(r.serial).join(' · ')}</p>
              <table className="tabela-periodos">
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>F (repasse integral)</th>
                    <th>IRT-E</th>
                  </tr>
                </thead>
                <tbody>
                  {r.periodos.map((p) => (
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
              <p className="meta">
                <a href={`/consulta?codigo=${encodeURIComponent(r.codigo)}`}>
                  Confira na consulta pública
                </a>{' '}
                — o mesmo código, calculado de novo, de forma independente.
              </p>
              {calculo.avisoEstimativa && <p className="meta"><strong>{calculo.avisoEstimativa}</strong></p>}
            </div>
          ))}
          <section className="card">
            <h3>Documentos do item</h3>
            <div className="pacotes">
              <div className="pacote doc">
                <span className="pacote-nome">Certificado de Série</span>
                <span className="pacote-preco">+ {brl(75)} / item</span>
                <span className="pacote-detalhe">
                  PDF com os dados que você forneceu, data e link de verificação, para anexar no contrato. Válido até 2033.
                </span>
                <button className="btn" disabled>Em breve</button>
              </div>
              <div className="pacote doc">
                <span className="pacote-nome">Memória de Cálculo Avulsa</span>
                <span className="pacote-preco">{brl(500)}</span>
                <span className="pacote-detalhe">
                  A técnica completa aplicada item por item: fórmula expandida, parâmetros e fontes legais.
                </span>
                <button className="btn" disabled>Em breve</button>
              </div>
            </div>
            <p className="meta">{calculo.disclaimer}</p>
          </section>
        </>
      )}
    </div>
  );
}

function OpcoesCards<T extends string | number>({
  nome,
  valor,
  onChange,
  opcoes,
}: {
  nome: string;
  valor: T | undefined;
  onChange: (v: T) => void;
  opcoes: { valor: T; titulo: string; detalhe?: string }[];
}) {
  return (
    <div className="opcoes">
      {opcoes.map((o) => (
        <label key={String(o.valor)} className={`opcao ${valor === o.valor ? 'selecionada' : ''}`}>
          <input
            type="radio"
            name={nome}
            checked={valor === o.valor}
            onChange={() => onChange(o.valor)}
          />
          <span className="opcao-titulo">{o.titulo}</span>
          {o.detalhe && <span className="opcao-detalhe">{o.detalhe}</span>}
        </label>
      ))}
    </div>
  );
}

function CampoPercentual({
  id,
  rotulo,
  valor,
  onChange,
  min = 0,
  max = 100,
  passo = 0.01,
  hint,
}: {
  id: string;
  rotulo: string;
  valor: number;
  onChange: (fracao: number) => void;
  min?: number;
  max?: number;
  passo?: number;
  hint?: string;
}) {
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <div className="campo-input">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={passo}
          value={Math.round(valor * 10000) / 100}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) onChange(v / 100);
          }}
        />
        <span className="unidade">%</span>
      </div>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
