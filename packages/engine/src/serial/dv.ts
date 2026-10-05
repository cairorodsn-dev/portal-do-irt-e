/**
 * Dígito verificador módulo 11 (gramática v1, seção 3):
 * cada caractere vira número na base 36 (0-9 → 0-9, A-Z → 10-35), as
 * representações decimais são concatenadas e recebem pesos 2..7 cíclicos
 * da direita para a esquerda. dv = 11 − (soma mod 11); 11 → '0', 10 → 'X'.
 */
export function calcularDigitoVerificador(corpoSemSeparadores: string): string {
  const digitos = [...corpoSemSeparadores.toUpperCase()]
    .map((ch) => Number.parseInt(ch, 36).toString(10))
    .join('');
  let soma = 0;
  for (let i = 0; i < digitos.length; i += 1) {
    const peso = 2 + ((digitos.length - 1 - i) % 6);
    soma += Number(digitos[i]) * peso;
  }
  const dv = 11 - (soma % 11);
  if (dv === 11) return '0';
  if (dv === 10) return 'X';
  return String(dv);
}

/** Remove pontos e hífen do corpo do código (sem o prefixo "IRT-E"), para cálculo do dv. */
export function corpoParaDV(corpo: string): string {
  return corpo.replace(/[.-]/g, '');
}
