import { consultarSerie, PARAMS_V2026_10 } from '../packages/engine/src/index.ts';

const itens = [
  { nome: 'Item A', codigo: 'IRT-E BR100.000.1800.00.DMG0935-3', preco: 100 },
  { nome: 'Item B', codigo: 'IRT-E BP100.000.1800.00.DMG0935-4', preco: 900 },
];
for (const anoAlvo of [2027, 2030]) {
  let somaPreco = 0, somaRepasse = 0, somaValor = 0;
  console.log(`--- ano-alvo ${anoAlvo} ---`);
  for (const it of itens) {
    const r = consultarSerie(it.codigo, PARAMS_V2026_10, 2026);
    if (!r.ok) throw new Error('invalido');
    const p = r.periodos.find((x) => x.t1 === anoAlvo)!;
    const repasse = it.preco * p.F, valor = it.preco * p.irte;
    somaPreco += it.preco; somaRepasse += repasse; somaValor += valor;
    console.log(`${it.nome}: F=${p.F.toFixed(4)} repasse=${repasse.toFixed(2)} irte=${p.irte.toFixed(4)} valor=${valor.toFixed(2)}`);
  }
  console.log(`Contrato: preco=${somaPreco.toFixed(2)} Fpond=${(somaRepasse/somaPreco).toFixed(4)} repasse=${somaRepasse.toFixed(2)} irtePond=${(somaValor/somaPreco).toFixed(4)} valor=${somaValor.toFixed(2)}`);
}
