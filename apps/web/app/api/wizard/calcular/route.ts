import { NextRequest, NextResponse } from 'next/server';
import {
  AVISO_ESTIMATIVA,
  DISCLAIMER,
  PARAMS_V2026_10,
  consultarSerie,
  formatSerial,
  respostasParaSerial,
} from '@portal-irt-e/engine';
import type { RespostasWizard } from '@portal-irt-e/engine';

/**
 * POST /api/wizard/calcular — body: { itens: RespostasWizard[], anoBase?: number }.
 *
 * Compila as respostas do wizard em códigos seriais e calcula F/IRT-E por período
 * (round-trip pelo mesmo pipeline da consulta pública: format → parse + DV → cálculo).
 *
 * NOTA DE MONETIZAÇÃO (fase "paywall simulado"): esta rota é pública de propósito.
 * A consulta pública já calcula F/IRT-E de qualquer serial válido — o valor pago do
 * wizard é a conveniência de montar o código, não o segredo do resultado. Quando o
 * Mercado Pago chegar, a cobrança será por sessão/ordem persistida no servidor
 * (criação de pedido antes do wizard + liberação via webhook), e esta rota passará a
 * exigir o token da ordem paga.
 */
export async function POST(req: NextRequest) {
  let body: { itens?: unknown; anoBase?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false as const, erros: ['Corpo da requisição inválido: JSON esperado.'] },
      { status: 400 },
    );
  }

  const itens = body.itens;
  if (!Array.isArray(itens) || itens.length === 0) {
    return NextResponse.json(
      { ok: false as const, erros: ['Informe ao menos um item para calcular.'] },
      { status: 400 },
    );
  }
  const anoBase = typeof body.anoBase === 'number' ? body.anoBase : 2026;

  const resultados = [];
  const erros: Array<{ item: number; erros: string[] }> = [];
  for (const [i, raw] of itens.entries()) {
    try {
      const serial = respostasParaSerial(raw as RespostasWizard, PARAMS_V2026_10.simplesFaixas);
      const codigo = formatSerial(serial);
      const consulta = consultarSerie(codigo, PARAMS_V2026_10, anoBase);
      if (!consulta.ok) {
        erros.push({ item: i + 1, erros: consulta.erros });
        continue;
      }
      resultados.push({
        item: i + 1,
        codigo: consulta.codigo,
        serial: consulta.serial,
        periodos: consulta.periodos,
        parametros: consulta.parametros,
      });
    } catch (e) {
      erros.push({ item: i + 1, erros: [e instanceof Error ? e.message : String(e)] });
    }
  }

  if (erros.length > 0) {
    return NextResponse.json(
      {
        ok: false as const,
        erros,
        disclaimer: DISCLAIMER,
        avisoEstimativa: PARAMS_V2026_10.estimativa ? AVISO_ESTIMATIVA : null,
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      ok: true as const,
      resultados,
      anoBase,
      versaoParametros: PARAMS_V2026_10.versao,
      parametrosEstimados: PARAMS_V2026_10.estimativa,
      disclaimer: DISCLAIMER,
      avisoEstimativa: PARAMS_V2026_10.estimativa ? AVISO_ESTIMATIVA : null,
    },
    { status: 200 },
  );
}
