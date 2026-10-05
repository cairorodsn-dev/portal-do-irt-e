import { NextRequest, NextResponse } from 'next/server';
import {
  AVISO_ESTIMATIVA,
  consultarSerie,
  DISCLAIMER,
  PARAMS_V2026_10,
} from '@portal-irt-e/engine';

/**
 * Consulta pública de série: GET /api/consulta?codigo=IRT-E+...&anoBase=2026
 * Cacheável por série × ano-base × versão de parâmetros (a versão está no corpo da resposta).
 */
export async function GET(req: NextRequest) {
  const codigo = req.nextUrl.searchParams.get('codigo') ?? '';
  const anoBaseParam = req.nextUrl.searchParams.get('anoBase');

  let anoBase = 2026;
  if (anoBaseParam != null && anoBaseParam !== '') {
    anoBase = Number(anoBaseParam);
    if (!Number.isInteger(anoBase) || anoBase < 2026 || anoBase > 2032) {
      const res = NextResponse.json(
        { ok: false, erros: ['Ano-base inválido. Use um ano inteiro entre 2026 e 2032.'] },
        { status: 400 },
      );
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }
  }

  const r = consultarSerie(codigo, PARAMS_V2026_10, anoBase);

  const body = r.ok
    ? { ...r, disclaimer: DISCLAIMER, avisoEstimativa: r.parametrosEstimados ? AVISO_ESTIMATIVA : null }
    : r;

  const res = NextResponse.json(body, { status: r.ok ? 200 : 400 });
  res.headers.set('Cache-Control', r.ok ? 'public, max-age=3600' : 'no-store');
  return res;
}
