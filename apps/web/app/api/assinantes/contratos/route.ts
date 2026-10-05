import { NextRequest, NextResponse } from 'next/server';
import type { Contrato, ItemContrato } from '../../../../lib/assinantes';
import { getSql } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_CONTRATOS = 50;
const MAX_ITENS = 100;

// PONTO DE INTEGRAÇÃO (auth real): a identidade hoje é o e-mail informado pelo
// cliente, sem verificação. Com auth real, o e-mail vem da sessão/token e o
// UPDATE passa a valer só para a conta autenticada.
function sanitizarItens(lista: unknown[]): ItemContrato[] | null {
  if (lista.length > MAX_ITENS) return null;
  const limpos: ItemContrato[] = [];
  for (const bruto of lista) {
    if (typeof bruto !== 'object' || bruto == null) return null;
    const { nome, codigo, precoBase, anoBase } = bruto as Record<string, unknown>;
    if (typeof nome !== 'string' || !nome.trim()) return null;
    if (typeof codigo !== 'string' || !codigo.trim()) return null;
    if (typeof precoBase !== 'number' || !Number.isFinite(precoBase) || precoBase < 0) return null;
    if (typeof anoBase !== 'number' || !Number.isInteger(anoBase) || anoBase < 2026 || anoBase > 2032) {
      return null;
    }
    limpos.push({
      nome: nome.trim().slice(0, 60),
      codigo: codigo.trim().slice(0, 120),
      precoBase,
      anoBase,
    });
  }
  return limpos;
}

function sanitizarContratos(lista: unknown[]): Contrato[] | null {
  if (lista.length > MAX_CONTRATOS) return null;
  const limpos: Contrato[] = [];
  for (const bruto of lista) {
    if (typeof bruto !== 'object' || bruto == null) return null;
    const { id, nome, itens } = bruto as Record<string, unknown>;
    if (typeof id !== 'string' || !id.trim()) return null;
    if (typeof nome !== 'string' || !nome.trim()) return null;
    if (!Array.isArray(itens)) return null;
    const itensLimpos = sanitizarItens(itens);
    if (!itensLimpos) return null;
    limpos.push({ id: id.trim().slice(0, 64), nome: nome.trim().slice(0, 80), itens: itensLimpos });
  }
  return limpos;
}

export async function PUT(req: NextRequest) {
  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ ok: false, erro: 'db_nao_configurado' }, { status: 501 });
  }

  const body: unknown = await req.json().catch(() => null);
  const email =
    typeof (body as { email?: unknown })?.email === 'string'
      ? (body as { email: string }).email.trim().toLowerCase()
      : '';
  const contratosBrutos = (body as { contratos?: unknown })?.contratos;
  if (!EMAIL_RE.test(email) || !Array.isArray(contratosBrutos)) {
    return NextResponse.json({ ok: false, erro: 'dados_invalidos' }, { status: 400 });
  }
  const contratos = sanitizarContratos(contratosBrutos);
  if (!contratos) {
    return NextResponse.json({ ok: false, erro: 'dados_invalidos' }, { status: 400 });
  }

  await sql`CREATE TABLE IF NOT EXISTS contas (
    email text PRIMARY KEY,
    nome text NOT NULL,
    contratos jsonb NOT NULL DEFAULT '[]'::jsonb,
    criado_em timestamptz NOT NULL DEFAULT now()
  )`;
  const atualizado = (await sql`
    UPDATE contas SET contratos = ${JSON.stringify(contratos)}::jsonb
    WHERE email = ${email} RETURNING email`) as unknown[];
  if (atualizado.length === 0) {
    return NextResponse.json({ ok: false, erro: 'conta_nao_encontrada' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
