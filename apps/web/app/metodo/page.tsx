export default function Metodo() {
  return (
    <>
      <section className="hero">
        <h1>O método IRT-E</h1>
        <p className="lead">
          O IRT-E parte de uma identidade de formação de preços e decompõe o efeito tributário
          puro da transição, expurgando o repasse que decorre de elasticidade, margem e escolha
          gerencial.
        </p>
      </section>

      <section>
        <h2>1. Identidade de formação de preços</h2>
        <p>
          Para um item <em>i</em>, o preço com tributos “por fora” (<em>A</em>) e “por dentro”
          (<em>B</em>) preserva a receita líquida <em>R</em> entre o ano-base (t0) e o ano-alvo
          (t1):
        </p>
        <div className="formula">P<sub>i,t</sub> · (1 − B<sub>i,t</sub>) = R<sub>i</sub> · (1 + A<sub>i,t</sub>)</div>
        <p>Da preservação de R decorre o fator bruto de repasse:</p>
        <div className="formula">
          F<sub>i</sub> = [(1 + A<sub>i,1</sub>)(1 − B<sub>i,0</sub>)] ÷ [(1 + A<sub>i,0</sub>)(1 − B<sub>i,1</sub>)]
        </div>

        <h2>2. Decomposição por vetores tributários</h2>
        <div className="formula">
          A = g + h, com g = (1−c)(1−ρ)[(i_E + i_M)·φ_IBS(t) + c_CBS·φ_CBS(t)] e h = π·φ_IPI(t) + s
        </div>
        <div className="formula">
          B = b + d, com b = ℓ·(1−c)·φ_legado(t) + p·(1−c)·φ_PC(t) e d = DAS(t) (Simples)
        </div>
        <ul>
          <li>
            <strong>g</strong> — IBS/CBS por fora: alíquotas de referência do destino (i_E
            estadual, i_M municipal declarado no serial), redução setorial ρ e cronograma φ(t);
            como IBS e CBS são não cumulativos, a carga entra depurada por (1−c);
          </li>
          <li>
            <strong>h</strong> — IPI remanescente (ZFM) e Imposto Seletivo, com repasse k = 1
            (convenção v1);
          </li>
          <li>
            <strong>b</strong> — carga legada por dentro (ICMS/ISS efetivo e PIS/Cofins
            depurados por (1−c); no lucro presumido o PIS/Cofins é cumulativo e entra integral;
            o crédito de PIS/Cofins só existe no ano-base, pois o tributo se extingue em 2027
            — LC 214/2025, art. 378);
          </li>
          <li>
            <strong>d</strong> — DAS do Simples (híbrido: alíquota nominal da faixa × parcela
            não-IBS/CBS do ano-alvo; puro: carga preservada, F = 1).
          </li>
        </ul>

        <h2>3. Alíquota efetiva e creditamento do ano-base</h2>
        <p>
          Vale uma regra geral para os tributos que admitem creditamento — o ICMS e o PIS/Cofins
          no regime de origem e o IBS e a CBS no regime de destino: a carga efetiva é a alíquota
          nominal multiplicada pelo complemento do crédito estimado, isto é, a parcela que não
          retorna por creditamento:
        </p>
        <div className="formula">τ_ef = τ_nom · (1 − c_i)</div>
        <p>
          Na fórmula, τ_nom é a alíquota nominal do tributo e c_i é o percentual de creditamento
          estimado, apurado a partir do perfil de aquisições da contratada registrado na
          planilha de formação de preços. É assim que as alíquotas com creditamento entram
          depuradas na decomposição por vetores (seção 2), em atendimento à não cumulatividade
          prevista no art. 374, § 1º, I, da LC 214/2025. Há uma exceção de regime: no lucro
          presumido, o PIS/Cofins é cumulativo e não admite crédito — o fator c depura, então,
          apenas o ICMS (e o IBS/CBS de destino).
        </p>
        <p>
          As alíquotas de referência do destino — IBS estadual da tabela curada, IBS municipal
          informado e CBS nacional — respeitam o teto de 26,5% (IBS + CBS) de forma proporcional:
          a soma nunca o ultrapassa e a proporção entre as três se preserva:
        </p>
        <div className="formula">
          i_efetiva = i_referência × min[1; 26,5% ÷ (i_E + i_M + c_CBS)]
        </div>
        <p>
          Enquanto a resolução do Senado não fixar as alíquotas oficiais, trabalha-se com
          estimativas de referência — sempre rotuladas como estimativa e versionadas: a consulta
          pública informa a versão dos parâmetros usada em cada cálculo.
        </p>
        <p>
          Fixar o creditamento como premissa auditável tem uma consequência: o crédito efetivo
          do fornecedor oscila com a sua cadeia de insumos, e a estimativa fixa transfere essa
          oscilação ordinária ao risco do fornecedor, em vez de transformá-la em gatilho de
          reequilíbrio — é o preço da estabilidade do índice ao longo do contrato.
        </p>

        <h2>4. Expurgo da elasticidade</h2>
        <p>
          F é o teto técnico de repasse integral. O índice contratual aplica apenas a parcela
          atribuível à tributação, ponderada pela capacidade de repasse do mercado:
        </p>
        <div className="formula">
          IRT-E = 1 + κ·(F − 1), com κ = |ε| ÷ (1 + |ε|)
        </div>
        <p>
          ε é a elasticidade-preço da demanda do objeto contratado. Faixas de referência:
          serviços contínuos |ε| ∈ [0,3; 0,8]; produtos padronizados |ε| ∈ [1; 3]; poucos
          substitutos |ε| ∈ [0,1; 0,3] — editáveis caso a caso.
        </p>

        <h2>5. Propriedades</h2>
        <ul>
          <li>
            <strong>Homogeneidade de grau zero no preço</strong> — F independe do nível absoluto
            do preço; candidato natural a índice contratual;
          </li>
          <li>
            <strong>Monotonicidade nos parâmetros legais</strong> — testada nos vértices do
            espaço legal (crédito 0/máximo, ρ 0/100%, dentro/fora do Simples) em bateria
            automatizada contra o oráculo de cálculo;
          </li>
          <li>
            <strong>Singularidade</strong> — F diverge quando a carga retida se aproxima de 100%;
            a margem de segurança até a singularidade é métrica de risco do contrato.
          </li>
        </ul>

        <h2>6. Alíquotas informadas e riscos assumidos</h2>
        <p>
          Nem toda alíquota é resolvida pelo portal: algumas são premissas informadas no próprio
          cálculo — o IBS municipal (i_M, declarado no bloco de destino do serial) é o exemplo
          principal; IPI e Imposto Seletivo entram como sufixos do código. A razão está na
          pulverização: com alíquota municipal própria na competência de milhares de municípios, a
          curadoria nacional não escala. Por convenção, essas alíquotas permanecem estáveis ao
          longo do contrato e as partes assumem o risco da variação.
        </p>
        <p>
          É um risco conhecido do direito tributário: IPI e Imposto Seletivo podem ser alterados
          por decreto do Poder Executivo, sem anterioridade — sempre foram riscos de ato
          administrativo suportados pelo contrato, não objeto do reequilíbrio, e não entram no
          cálculo. Já o ICMS e o ISS informados (carga legada ℓ) são apurados como alíquota
          efetiva no ano-base: não observam alterações legislativas futuras do regulamento
          estadual ou municipal, mas as regras de transição — o cronograma φ_legado(t) — são
          observadas integralmente.
        </p>

        <h2>7. O código serial</h2>
        <p>
          A gramática v1 codifica a parametrização em um serial verificável com dígito
          verificador módulo 11:
        </p>
        <div className="formula">
          IRT-E &lt;tipo&gt;&lt;regime&gt;&lt;ε&gt;.&lt;ρ&gt;.&lt;ℓ&gt;.&lt;c&gt;.D&lt;UF&gt;&lt;i_M&gt;
          {'{.'}sufixos{'}'}-&lt;dv&gt;
        </div>
        <p>
          Ex.: <code>IRT-E BR100.000.1800.00.DMG0935-3</code> — bem, lucro real, ε = 1,00, sem
          redução setorial, ICMS efetivo 18%, sem crédito, destino MG com IBS municipal 9,35%.
          O código identifica a série; o período é contextual (“de 2026 para 2027”).
        </p>

        <h2 id="clausula">8. Cláusula contratual padrão</h2>
        <p>
          Texto de referência para inserção nos contratos de continuidade. As partes podem
          ajustar prazos e periodicidade; a parametrização do índice é a do serial registrado
          no contrato, que identifica a série e torna o cálculo verificável por qualquer das
          partes.
        </p>
        <div className="clausula">
          <p>
            <strong>Cláusula ___ — Reequilíbrio por variação tributária (IRT-E).</strong> Os
            preços deste contrato serão reajustados, a partir de 1º de janeiro de cada ano do
            período de transição (2026–2033), pelo Índice de Reequilíbrio Tributário Expurgado
            (IRT-E), parametrizado pelo serial <code>IRT-E …-&lt;dv&gt;</code> anexo a este
            contrato e apurado conforme metodologia pública versionada, com a versão dos
            parâmetros informada em cada cálculo.
          </p>
          <p>
            <strong>§ 1º</strong> O reajuste incide sobre o preço vigente e corresponde ao
            fator IRT-E do período, limitado à variação tributária líquida já expurgada da
            elasticidade, não se confundindo com o reajuste por inflação, que observa cláusula
            própria.
          </p>
          <p>
            <strong>§ 2º</strong> As alíquotas informadas no serial — IBS municipal, carga
            legada de ICMS/ISS, IPI e Imposto Seletivo — são premissas fixas do ano-base; sua
            variação superveniente é risco assumido pelas partes e não enseja revisão do
            índice, observado integralmente o cronograma legal de transição previsto nos
            arts. 125 a 129 do ADCT.
          </p>
          <p>
            <strong>§ 3º</strong> O serial é público, auditável e reproduzível: qualquer das
            partes pode refazer o cálculo, e o resultado divergente comprovado prevalece, com
            compensação das diferenças no faturamento seguinte.
          </p>
        </div>

        <h2>9. Referências</h2>
        <ul className="referencias">
          <li>Emenda Constitucional nº 132, de 20/12/2023 (novo modelo de tributação do consumo).</li>
          <li>
            Lei Complementar nº 214, de 16/01/2025 — IBS, CBS e IS; arts. 373–377 (microssistema
            de reequilíbrio); art. 378 (extinção de PIS/Cofins em 2027).
          </li>
          <li>Lei Complementar nº 227, de 15/01/2026 (locações/arrendamentos como bens; plataformas).</li>
          <li>ADCT, arts. 125–129 (cronograma de transição 2026–2033).</li>
        </ul>
      </section>
    </>
  );
}
