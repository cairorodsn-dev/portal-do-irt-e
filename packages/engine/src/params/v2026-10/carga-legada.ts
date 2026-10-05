import type { CargaLegadaUF } from '../types';

/**
 * Sugestão de carga legada (ℓ) por UF para o wizard — alíquota interna geral de ICMS
 * (bens) e ISS de referência (serviços). TODAS as linhas são estimativas de partida:
 * o usuário confirma/edita o valor efetivo do seu produto/serviço (com redução de base
 * de cálculo, quando houver) antes de montar o código serial.
 *
 * Seeds das alíquotas internas gerais de referência — Cairo revisa antes do lançamento
 * (credibilidade do produto depende desses números).
 */
const FONTE_ICMS =
  'Alíquota interna geral de referência — confirmar na legislação estadual e no NCM do produto.';
const FONTE_ISS = 'ISS típico de 2% a 5% — depende do município; confirmar na lei municipal.';

export const CARGA_LEGADA: CargaLegadaUF[] = [
  { uf: 'AC', icmsInterno: 0.19, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'AL', icmsInterno: 0.2, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'AM', icmsInterno: 0.18, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'AP', icmsInterno: 0.18, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'BA', icmsInterno: 0.19, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'CE', icmsInterno: 0.2, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'DF', icmsInterno: 0.18, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'ES', icmsInterno: 0.17, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'GO', icmsInterno: 0.19, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'MA', icmsInterno: 0.18, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'MG', icmsInterno: 0.18, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'MS', icmsInterno: 0.17, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'MT', icmsInterno: 0.17, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'PA', icmsInterno: 0.18, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'PB', icmsInterno: 0.18, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'PE', icmsInterno: 0.205, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'PI', icmsInterno: 0.21, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'PR', icmsInterno: 0.195, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'RJ', icmsInterno: 0.22, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'RN', icmsInterno: 0.2, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'RO', icmsInterno: 0.195, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'RR', icmsInterno: 0.17, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'RS', icmsInterno: 0.17, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'SC', icmsInterno: 0.17, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'SE', icmsInterno: 0.2, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'SP', icmsInterno: 0.18, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
  { uf: 'TO', icmsInterno: 0.18, issReferencia: 0.05, estimativa: true, fonte: FONTE_ICMS },
];
