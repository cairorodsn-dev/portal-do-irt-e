export const PRECO_ASSINATURA = 199;

export interface ItemContrato {
  nome: string;
  codigo: string;
  precoBase: number;
  anoBase: number;
}

export interface Contrato {
  id: string;
  nome: string;
  itens: ItemContrato[];
}

export interface Conta {
  nome: string;
  email: string;
  contratos: Contrato[];
}

interface Armazenamento {
  conta: Conta | null;
  sessao: string | null;
}

const CHAVE = 'irt-e:assinantes';

function ler(): Armazenamento {
  if (typeof window === 'undefined') return { conta: null, sessao: null };
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return { conta: null, sessao: null };
    const dados = JSON.parse(bruto) as Partial<Armazenamento>;
    return { conta: dados.conta ?? null, sessao: dados.sessao ?? null };
  } catch {
    return { conta: null, sessao: null };
  }
}

function gravar(dados: Armazenamento): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch {
    // localStorage indisponível (cheio ou bloqueado): a sessão simplesmente não persiste.
  }
}

export function carregarConta(): Conta | null {
  return ler().conta;
}

export function salvarConta(conta: Conta): void {
  gravar({ ...ler(), conta });
}

export function sessaoAtiva(): boolean {
  const { conta, sessao } = ler();
  return conta != null && sessao === conta.email;
}

export function abrirSessao(email: string): void {
  gravar({ ...ler(), sessao: email });
}

export function encerrarSessao(): void {
  gravar({ ...ler(), sessao: null });
}

export function salvarContratos(contratos: Contrato[]): void {
  const { conta, sessao } = ler();
  if (!conta) return;
  gravar({ conta: { ...conta, contratos }, sessao });
}
