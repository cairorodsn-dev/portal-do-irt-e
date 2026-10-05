# Prompt para iniciar a construção em novo contexto

> Copie o bloco abaixo para a nova sessão. Anexe a planilha `Reequilibrio_Tributario_v7_IRT-E_Setor_Publico.xlsx` na nova conversa — ela é o oráculo dos testes e não fica salva entre sessões.

---

Estamos construindo o **Portal do IRT-E**, um SaaS que operacionaliza a metodologia IRT-E (Índice de Reequilíbrio Tributário Expurgado) para reajuste de contratos privados na transição para o IVA dual brasileiro (IBS/CBS, EC 132/2023, LC 214/2025 e LC 227/2026).

**Antes de qualquer código, leia estes dois arquivos na pasta do projeto — eles são a fonte da verdade das decisões já tomadas:**

1. `Escopo_MVP_Portal_do_IRT-E.md` — escopo do MVP: modelo de negócio, funil, funcionalidades, critérios de aceite, cronograma.
2. `IRT-E_Serializacao_v1.md` — gramática v1 do código serial IRT-E (formato `IRT-E <tipo><regime><ε>.<ρ>.<ℓ>.<c>.D<UF><i_M>{.<sufixos>}-<dv>`, com dígito verificador módulo 11).

Também estou anexando a planilha `Reequilibrio_Tributario_v7_IRT-E_Setor_Publico.xlsx`, que é o **oráculo de cálculo**: a implementação deve reproduzir seus resultados exatamente.

**Resumo das decisões (detalhes nos documentos):**

- Modelo: consulta pública gratuita do valor do índice por código de série; wizard guiado avulso pago (valor simbólico) que monta a série a partir de perguntas; relatório PDF com memória de cálculo como upsell ao final do wizard; assinatura em tiers para carteira de contratos, contratos multi-item, análise de timing e relatório whitelabel editável. Público-alvo principal: contadores.
- Stack: Next.js + motor de cálculo em TypeScript puro isolado (sem dependência de framework) + Postgres/Supabase com parâmetros legais versionados por vigência e fonte + Mercado Pago (PIX/cartão) + Vercel. Visual institucional sóbrio (linha FGV/IPEA).
- Arquitetura de dados: as tabelas da planilha (cronograma de transição, reduções setoriais, Anexos XVIII–XXII do Simples, alíquotas de referência) são importadas para o banco; o backend calcula qualquer série × período deterministicamente; a planilha nunca é chamada em produção.
- Fórmulas: F = [(1+g₁+h₁)(1−b₀−d₀)] ÷ [(1+g₀+h₀)(1−b₁−d₁)]; IRT-E = 1 + κ·(F−1), κ = |ε|/(1+|ε|); crédito c só no ano-base; t0 < 2026 ⇒ fatores de transição = 1; Simples puro ⇒ F = 1; IS com k = 1.

**Ordem de construção (siga esta sequência):**

1. **Motor de cálculo TypeScript puro** implementando as fórmulas e a gramática v1 (parser/validador do serial com dígito verificador), com a estrutura de parâmetros versionados.
2. **Importação das tabelas da planilha** anexa para o formato de dados do motor.
3. **Golden tests:** bateria de cenários comparando o motor com os resultados da planilha (incluindo os vértices do stress test: c = 0/máximo, ρ = 0/100%, dentro/fora do Simples). Tolerância zero. Nada de UI antes disso passar.
4. Consulta pública de série (valida dv → exibe F/IRT-E por período).
5. Landing institucional + página do método.
6. Wizard avulso + pagamento PIX.
7. Relatório PDF com memória de cálculo e link de verificação pública.
8. Área do assinante: carteira, contratos multi-item com índice ponderado, timing, whitelabel.

**Regras permanentes:** nunca alterar a metodologia de cálculo sem registrar a mudança nos documentos; todo resultado carrega versão de parâmetros, versão do motor e timestamp; disclaimer "ferramenta de cálculo, não parecer jurídico/tributário" em todas as saídas; alíquotas atuais são ESTIMATIVAS até a resolução do Senado (prevista até 15/12/2026) e devem ser rotuladas como tal.

Comece lendo os dois documentos e a planilha, e me apresente o plano da etapa 1 antes de escrever código.
