import Link from 'next/link';
import { PRECO_ASSINATURA } from '../../lib/assinantes';
import SessaoCta from './SessaoCta';

export const metadata = {
  title: 'Área de assinantes — Portal do IRT-E',
};

export default function AssinantesPage() {
  return (
    <>
      <section className="hero">
        <h1>Área de assinantes — a sua carteira de contratos, reajuste a reajuste.</h1>
        <p className="lead">
          O índice IRT-E é público e gratuito. A assinatura paga a conveniência: cadastre os itens
          dos seus contratos uma única vez e acompanhe, período a período, o valor reajustado de
          cada um — sem refazer consultas item a item.
        </p>
        <div className="cta-row">
          <SessaoCta />
        </div>
        <p className="chamativa">
          R$ {PRECO_ASSINATURA}/mês, cancele quando quiser.{' '}
          <Link href="/consulta">A consulta do índice continua gratuita →</Link>
        </p>
      </section>

      <section>
        <div className="pilares">
          <div className="pilar">
            <h3>Carteira multi-item</h3>
            <p>
              Organize contratos com quantos itens precisar, cada um com seu código serial IRT-E,
              preço-base e ano-base. Crie, renomeie e exclua contratos e itens a qualquer momento.
            </p>
          </div>
          <div className="pilar">
            <h3>Simulação 2026–2033</h3>
            <p>
              Para cada contrato, uma tabela com o valor reajustado de cada item em todos os
              períodos da transição — e o total do contrato, pronto para a negociação do reajuste
              anual.
            </p>
          </div>
          <div className="pilar">
            <h3>Memória sobre índice público</h3>
            <p>
              Toda simulação usa os mesmos parâmetros versionados da consulta pública: qualquer
              parte pode conferir o fator de cada série, de graça, sem cadastro.
            </p>
          </div>
        </div>
      </section>

      <section className="bases-legais">
        <p>
          <strong>Demonstração.</strong> Nesta fase, contas e contratos ficam salvos apenas neste
          navegador (localStorage) e nenhum pagamento é cobrado de verdade. A cobrança real e a
          sincronização entre dispositivos entram na fase seguinte.
        </p>
      </section>
    </>
  );
}
