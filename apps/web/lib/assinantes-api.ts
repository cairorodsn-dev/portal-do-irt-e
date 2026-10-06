import type { Conta, Contrato } from './assinantes';
import { carregarConta, normalizarContratos, salvarConta, salvarContratos } from './assinantes';

export type ResultadoCriarConta =
  | { ok: true; origem: 'servidor' | 'local' }
  | { ok: false; erro: 'conta_existente' | 'dados_invalidos' };

export type ResultadoEntrar =
  | { ok: true; conta: Conta }
  | { ok: false; erro: 'conta_nao_encontrada' };

function criarLocal(nome: string, email: string): ResultadoCriarConta {
  salvarConta({ nome, email, contratos: [] });
  return { ok: true, origem: 'local' };
}

function entrarLocal(email: string): ResultadoEntrar {
  const conta = carregarConta();
  if (!conta || conta.email !== email) return { ok: false, erro: 'conta_nao_encontrada' };
  return { ok: true, conta };
}

export async function criarContaRemota(nome: string, email: string): Promise<ResultadoCriarConta> {
  try {
    const res = await fetch('/api/assinantes/conta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email }),
    });
    if (res.status === 501) return criarLocal(nome, email);
    const json = (await res.json()) as { ok?: boolean; erro?: string };
    if (res.status === 409) return { ok: false, erro: 'conta_existente' };
    if (!res.ok || !json.ok) return { ok: false, erro: 'dados_invalidos' };
    salvarConta({ nome, email, contratos: [] });
    return { ok: true, origem: 'servidor' };
  } catch {
    return criarLocal(nome, email);
  }
}

export async function entrarRemoto(email: string): Promise<ResultadoEntrar> {
  try {
    const res = await fetch(`/api/assinantes/conta?email=${encodeURIComponent(email)}`);
    if (res.status === 501) return entrarLocal(email);
    const json = (await res.json()) as { ok?: boolean; conta?: Conta };
    if (!res.ok || !json.ok || !json.conta) return { ok: false, erro: 'conta_nao_encontrada' };
    const conta = { ...json.conta, contratos: normalizarContratos(json.conta.contratos ?? []) };
    salvarConta(conta);
    return { ok: true, conta };
  } catch {
    return entrarLocal(email);
  }
}

// Contratos do servidor para hidratar o dashboard. null = servidor indisponível
// (501, rede ou conta ausente) — o chamador fica com a cópia local.
export async function carregarContratos(email: string): Promise<Contrato[] | null> {
  try {
    const res = await fetch(`/api/assinantes/conta?email=${encodeURIComponent(email)}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; conta?: Conta };
    if (!json.ok || !json.conta || !Array.isArray(json.conta.contratos)) return null;
    const contratos = normalizarContratos(json.conta.contratos);
    salvarContratos(contratos);
    return contratos;
  } catch {
    return null;
  }
}

// Servidor primeiro; o localStorage é gravado sempre, para nunca perder o dado.
export async function persistirContratos(
  email: string,
  contratos: Contrato[],
): Promise<'servidor' | 'local'> {
  let origem: 'servidor' | 'local' = 'local';
  try {
    const res = await fetch('/api/assinantes/contratos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, contratos }),
    });
    if (res.ok) origem = 'servidor';
  } catch {
    // sem banco ou sem rede: segue só no localStorage
  }
  salvarContratos(contratos);
  return origem;
}
