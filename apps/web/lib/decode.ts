import type { SerialIRTE } from '@portal-irt-e/engine';

const TIPOS: Record<string, string> = { B: 'Bem/produto', S: 'Serviço' };
const REGIMES: Record<string, string> = {
  R: 'Lucro real',
  P: 'Lucro presumido',
  H: 'Simples híbrido',
  U: 'Simples puro',
};

const pct = (v: number, casas = 2) => `${(v * 100).toFixed(casas).replace('.', ',')}%`;

/** Descrição legível da série decodificada, para exibição na consulta pública. */
export function descreverSerial(s: SerialIRTE): string[] {
  const partes: string[] = [
    `${TIPOS[s.tipo] ?? s.tipo}, ${REGIMES[s.regime] ?? s.regime}`,
    `ε = ${s.epsilon.toFixed(2).replace('.', ',')} (κ = ${(s.epsilon / (1 + s.epsilon)).toFixed(4).replace('.', ',')})`,
    `redução setorial ρ = ${pct(s.rho, 0)}`,
    `carga legada ℓ = ${pct(s.ell)}`,
  ];
  if (s.regime === 'R' || s.regime === 'P' || s.regime === 'H') {
    partes.push(`crédito do ano-base c = ${pct(s.c, 0)}`);
  }
  if (s.uf === 'EX') {
    partes.push('destino: exterior (imunidade de exportação)');
  } else if (s.uf != null) {
    partes.push(
      `destino: ${s.uf}, IBS municipal ${pct(s.ibsMunicipal ?? 0)}`,
    );
  }
  if (s.anexo != null && s.faixa != null) {
    partes.push(`Simples: Anexo ${s.anexo}, Faixa ${s.faixa}`);
  }
  if (s.is != null) partes.push(`Imposto Seletivo ${pct(s.is)}`);
  if (s.ipiBase != null) partes.push(`IPI no ano-base ${pct(s.ipiBase)}`);
  if (s.zfm != null) partes.push(`IPI remanescente ZFM ${pct(s.zfm)}`);
  return partes;
}
