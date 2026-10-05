import type { PacoteWizard } from '../params/types';

/** Menor pacote que comporta n itens; null se nenhum comporta. */
export function pacoteParaQuantidade(
  n: number,
  pacotes: readonly PacoteWizard[],
): PacoteWizard | null {
  if (!Number.isInteger(n) || n < 1) return null;
  const cabiveis = pacotes.filter((p) => p.itens >= n);
  cabiveis.sort((a, b) => a.itens - b.itens || a.preco - b.preco);
  return cabiveis[0] ?? null;
}

/** Preço de um pedido avulso: pacote único (sem cobrança por item adicional neste modelo). */
export function precoPedido(pacote: PacoteWizard): number {
  return pacote.preco;
}
