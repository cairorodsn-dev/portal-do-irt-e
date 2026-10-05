import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// PONTO DE INTEGRAÇÃO (auth real): a identidade hoje é o e-mail informado pelo
// cliente, sem verificação. Com auth real, o e-mail vem da sessão/token — nunca
// do body ou da query string.
async function garantirSchema(sql: NonNullable<ReturnType<typeof getSql>>) {
  await sql`CREATE TABLE IF NOT EXISTS contas (
    email text PRIMARY KEY,
    nome text NOT NULL,
    contratos jsonb NOT NULL DEFAULT '[]'::jsonb,
    criado_em timestamptz NOT NULL DEFAULT now()
  )`;
}

export async function POST(req: NextRequest) {
  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ ok: false, erro: 'db_nao_configurado' }, { status: 501 });
  }

  const body: unknown = await req.json().catch(() => null);
  const nome =
    typeof (body as { nome?: unknown })?.nome === 'string'
      ? (body as { nome: string }).nome.trim()
      : '';
  const email =
    typeof (body as { email?: unknown })?.email === 'string'
      ? (body as { email: string }).email.trim().toLowerCase()
      : '';
  if (!nome || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, erro: 'dados_invalidos' }, { status: 400 });
  }

  await garantirSchema(sql);
  const existente = (await sql`SELECT email FROM contas WHERE email = ${email}`) as unknown[];
  if (existente.length > 0) {
    return NextResponse.json({ ok: false, erro: 'conta_existente' }, { status: 409 });
  }
  await sql`INSERT INTO contas (email, nome) VALUES (${email}, ${nome})`;
  return NextResponse.json(
    { ok: true, conta: { nome, email, contratos: [] } },
    { status: 201 },
  );
}

export async function GET(req: NextRequest) {
  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ ok: false, erro: 'db_nao_configurado' }, { status: 501 });
  }

  const email = (req.nextUrl.searchParams.get('email') ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, erro: 'dados_invalidos' }, { status: 400 });
  }

  await garantirSchema(sql);
  const linhas = (await sql`
    SELECT nome, email, contratos FROM contas WHERE email = ${email}`) as {
    nome: string;
    email: string;
    contratos: unknown;
  }[];
  if (linhas.length === 0) {
    return NextResponse.json({ ok: false, erro: 'conta_nao_encontrada' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, conta: linhas[0] });
}
