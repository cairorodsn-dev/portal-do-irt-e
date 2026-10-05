/**
 * Faixa do Simples (1–6) para um RBT12, pelos limites do conjunto de parâmetros
 * (Anexos XVIII–XXII da LC 214/2025). Acima do último limite, permanece na faixa 6.
 */
export function faixaPorRbt12(
  rbt12: number,
  limites: readonly number[],
): 1 | 2 | 3 | 4 | 5 | 6 {
  if (!Number.isFinite(rbt12) || rbt12 < 0) {
    throw new Error('RBT12 inválido: informe o faturamento bruto dos últimos 12 meses em R$.');
  }
  for (let i = 0; i < limites.length; i += 1) {
    if (rbt12 <= limites[i]!) return (i + 1) as 1 | 2 | 3 | 4 | 5 | 6;
  }
  return 6;
}
