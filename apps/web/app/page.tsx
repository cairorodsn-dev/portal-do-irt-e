import Link from 'next/link';

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>Reajuste de contratos na reforma tributária, com lastro técnico.</h1>
        <p className="lead">
          O IRT-E (Índice de Reequilíbrio Tributário Expurgado) operacionaliza a recomposição de
          contratos privados na transição para o IVA dual brasileiro (IBS/CBS), expurgando do
          reajuste o que não é efeito tributário — elasticidade, margem, escolha gerencial e
          inflação.
        </p>
        <div className="cta-row">
          <Link href="/consulta" className="btn">
            Consultar o valor de uma série
          </Link>
          <Link href="/metodo" className="btn secundario">
            Conhecer o método
          </Link>
        </div>
        <p className="chamativa">
          <Link href="/wizard">Descubra uma série →</Link>
        </p>
      </section>

      <section>
        <div className="pilares">
          <div className="pilar">
            <h3>O índice é público</h3>
            <p>
              Qualquer pessoa consulta gratuitamente o valor do fator de uma série IRT-E — como se
              consulta o IGP-M. É isso que torna o índice citável em cláusulas contratuais,
              verificável por ambas as partes.
            </p>
          </div>
          <div className="pilar">
            <h3>A conveniência é paga</h3>
            <p>
              Descobrir qual série corresponde ao seu item, obter a memória de cálculo e gerir
              carteiras de contratos multi-item são serviços pagos — sobre um índice que permanece
              público e gratuito. <Link href="/assinantes">Conheça a área de assinantes</Link>.
            </p>
          </div>
          <div className="pilar">
            <h3>A autoridade é o método</h3>
            <p>
              O método é documentado: identidade de formação de preços, expurgo da elasticidade
              pelo fator κ e gramática aberta do código serial, com dígito verificador.
            </p>
          </div>
        </div>
      </section>

      <section className="bases-legais">
        <p>
          <strong>Como funciona.</strong> A parametrização de um item (tipo, regime tributário,
          elasticidade, redução setorial, carga legada, créditos e destino) é codificada em um
          serial verificável, ex.: <code>IRT-E BR100.000.1800.00.DMG0935-3</code>. O código
          identifica a série; o período de aplicação é contextual à cláusula — ex.: “IRT-E
          BR100.000.1800.00.DMG0935-3, de 2026 para 2027”.
        </p>
        <p>
          <strong>Bases legais.</strong> Emenda Constitucional nº 132/2023; Lei Complementar nº
          214/2025 (institui IBS, CBS e IS; arts. 373–377 tratam do reequilíbrio de contratos);
          Lei Complementar nº 227/2026; cronograma de transição do ADCT (2026–2033).
        </p>
        <p>
          <strong>Escopo.</strong> Contratos privados (reajuste entre empresas). A versão setor
          público (redutor de compras governamentais, arts. 472/473 da LC 214/2025) é instrumento
          desta mesma metodologia e está em desenvolvimento.
        </p>
        <p className="chamativa">
          <Link href="/metodo#clausula">
            Método aberto com riscos transparentes, conheça a cláusula contratual!
          </Link>
        </p>
      </section>
    </>
  );
}
