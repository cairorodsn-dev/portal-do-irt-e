import { parseSerial } from '../packages/engine/src/index.ts';
import { calcularDigitoVerificador, corpoParaDV } from '../packages/engine/src/serial/dv.ts';

const codigos = [
  'IRT-E BR100.000.1800.00.DMG0935-3',
  'IRT-E BR100.000.1800.00.DPB0935-7',
];
for (const c of codigos) {
  const r = parseSerial(c);
  const corpo = c.slice('IRT-E '.length, c.lastIndexOf('-'));
  const dv = calcularDigitoVerificador(corpoParaDV(corpo));
  console.log(c, '->', r.ok ? 'VALIDO' : 'INVALIDO', '| DV correto:', dv);
}
