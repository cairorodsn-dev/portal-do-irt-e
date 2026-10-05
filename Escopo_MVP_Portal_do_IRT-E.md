# Portal do IRT-E — Documento de Escopo do MVP

**Versão:** 1.1 · 04/10/2026 (1.1: precificação definida — seção 3)
**Meta de lançamento:** início de 2027 (beta fechado em janeiro, lançamento público no primeiro trimestre)
**Documentos relacionados:** `IRT-E_Serializacao_v1.md` (gramática do código serial) · planilha `Reequilibrio_Tributario_v7_IRT-E_Setor_Publico.xlsx` (oráculo de cálculo) · pré-projeto de pesquisa IRT-E (fundamentação)

---

## 1. Visão geral

O Portal do IRT-E é o canal de adoção da metodologia IRT-E (Índice de Reequilíbrio Tributário Expurgado) para correção de **contratos privados** na transição para o IVA dual (IBS/CBS). O objetivo estratégico é estabelecer o IRT-E como padrão-ouro de reajuste contratual na reforma tributária.

A estratégia de adoção se apoia em três pilares:

1. **O índice é público.** Qualquer pessoa consulta gratuitamente o valor do fator de uma série IRT-E — como se consulta o IGP-M. É isso que torna o índice citável em cláusulas.
2. **A conveniência é paga.** Descobrir *qual* série corresponde ao seu item (wizard guiado), obter a memória de cálculo e gerir contratos multi-item são serviços pagos.
3. **A autoridade é o método.** O whitepaper público, a gramática do código serial e a dissertação dão lastro; o portal é a operacionalização.

## 2. Público-alvo

| Perfil | Dor | O que compra |
|---|---|---|
| **Contador** (canal principal) | Dezenas de clientes com contratos a corrigir; precisa de peça defensável | Assinatura (carteira multi-cliente, memórias de cálculo em volume) |
| **Empresário** | Um contrato de fornecimento/locação/serviço para reajustar | Wizard avulso + relatório |
| **Advogado** | Lastro técnico para cláusula ou negociação | Wizard avulso + relatório; assinatura se recorrente |

## 3. Modelo de negócio e funil

```
CONSULTA PÚBLICA (gratuita, sem cadastro)
  usuário informa o código da série → recebe o valor do fator por período
        │
        ▼  "não sei qual é a minha série"
WIZARD AVULSO (pago por pacote de itens, sem assinatura)
  perguntas guiadas → sistema monta o código serial → exibe o resultado
        │
        ▼  upsell ao final do wizard
CERTIFICADO DE SÉRIE (+ por item) / MEMÓRIA DE CÁLCULO AVULSA (item isolado)
        │
        ▼  carteira / monitoramento / uso recorrente
ASSINATURA CONTADOR (mensal)
  carteira de contratos, monitoramento anual, análise de timing,
  relatório whitelabel em formato editável
```

**Preços (definidos em 04/10/2026):**

| Produto | Preço | Detalhe |
|---|---|---|
| Consulta pública | Gratuita | Fator por período; verificação de certificados/relatórios recebidos |
| Wizard | R$ 25 / R$ 60 / R$ 100 | Pacotes de até 3 / até 10 / até 30 itens — descobre o código serial de cada item |
| Certificado de Série | +R$ 75 por item | PDF com código, dados informados, valor, data e link de verificação; válido até 2033, sem custo de atualização |
| Memória de Cálculo Avulsa | R$ 500 | Item isolado, técnica completa |
| Assinatura Contador | R$ 1.000/mês | Inclui 5 contratos (até 20 itens cada); contrato adicional R$ 200; item extra no contrato R$ 10 |

Regras:

- **Consulta de série é sempre gratuita** e sem login — inclusive para a contraparte verificar um certificado/relatório recebido.
- **Wizard avulso:** pago por pacote de itens (até 3 / até 10 / até 30); o Certificado de Série e a Memória de Cálculo Avulsa são oferecidos apenas ao final do wizard (venda separada).
- **Assinatura:** obrigatória para carteira/múltiplos contratos, monitoramento anual, análise de timing e relatório editável/whitelabel.
- Pagamento: PIX e cartão via gateway (Mercado Pago ou equivalente), tanto para o avulso quanto para a assinatura recorrente.

## 4. Arquitetura conceitual

### 4.1 Princípio central: o código serial é a chave de tudo

A gramática v1 (`IRT-E_Serializacao_v1.md`) transforma a parametrização de um item em um código curto e verificável. No portal:

- O **wizard** é um compilador de perguntas → código serial.
- O **banco de dados** resolve código serial + período (t0 → t1) → valor do índice.
- A **consulta pública**, o **relatório** e a **carteira** falam a mesma língua: a série.

### 4.2 Origem dos dados de cálculo

A planilha v7 é a **fonte das tabelas de parâmetros**, não uma dependência em tempo de execução:

- As tabelas (cronograma de transição φ(t), alíquotas de referência IBS/CBS, teto de 26,5%, reduções setoriais, Anexos XVIII–XXII do Simples por ano, faixas de ε sugeridas) são **importadas da v7 para o banco, versionadas por data de vigência e fonte legal**. A elas soma-se a **tabela curada de alíquotas estaduais de IBS** (apenas 27 UFs — curadoria viável), preenchida com a estimativa de referência até cada estado legislar. A alíquota **municipal** de IBS não é mantida pelo portal (5.570+ municípios): é premissa declarada pelo usuário e gravada no código serial.
- O backend calcula F e IRT-E para qualquer série × período **deterministicamente**, a partir dessas tabelas e da fórmula da seção 5 do documento de serialização. Não há chamada ao Excel em produção.
- **Golden tests:** bateria automatizada de cenários comparando o backend com os resultados da v7 (incluindo os vértices do stress test: c = 0/máximo, ρ = 0/100%, dentro/fora do Simples). Divergência = deploy bloqueado.
- Quando a resolução do Senado publicar as alíquotas oficiais (prevista até 15/12/2026), atualiza-se uma linha de parâmetro versionada — e o portal inteiro passa a exibir valores oficiais, mantendo o histórico das estimativas.

### 4.3 Stack

- **Frontend:** Next.js (React) — landing pública, consulta, wizard, área logada.
- **Backend:** API no mesmo projeto Next (route handlers) ou serviço separado; **motor de cálculo em TypeScript puro**, isolado e testável (sem dependência de framework).
- **Banco:** Postgres gerenciado (Supabase) — parâmetros versionados, usuários, carteiras, séries consultadas, transações.
- **PDF:** geração server-side do relatório (memória de cálculo).
- **Pagamentos:** Mercado Pago (PIX + cartão + recorrência).
- **Hospedagem:** Vercel + Supabase, tiers gratuitos no início; custo próximo de zero até tração.

### 4.4 Identidade visual

Institucional, sóbrio, na linha FGV/IPEA: paleta azul-escuro/cinza, tipografia serifada nos títulos, sem ilustrações lúdicas. O relatório PDF segue o mesmo padrão — deve parecer um documento técnico de instituto de pesquisa, não um material de marketing. Nome do produto: **Portal do IRT-E**. Registro de domínio a verificar (item aberto, seção 10).

## 5. Escopo funcional do MVP

### 5.1 Área pública (sem login)

- **Landing page institucional:** o que é o IRT-E, o problema da transição, o método (resumo do whitepaper, link para download), a gramática do código serial, bases legais (EC 132/2023, LC 214/2025 e LC 227/2026), CTA para wizard e assinatura.
- **Consulta de série:** campo para o código (ex.: `BR100.000.1800.00-8`) com **validação do dígito verificador**; exibe F e IRT-E para cada período disponível (2026→2027 … 2026→2033 e pares intermediários), os parâmetros nacionais usados, a versão dos parâmetros e aviso de "alíquotas estimadas — aguardando resolução do Senado" enquanto aplicável. Código inválido: mensagem clara de erro, sem cálculo.
- **Página do método:** fórmulas, propriedades (homogeneidade, monotonicidade, assíntota), gramática do serial, referências.

### 5.2 Wizard avulso (pago, sem assinatura)

Fluxo de perguntas guiadas com **preenchimento assistido**:

1. Tipo do objeto (bem/serviço).
2. **Destino do IBS:** UF do tomador/comprador (sigla) → o portal resolve a alíquota estadual na tabela curada das 27 UFs e informa a fonte (lei estadual ou estimativa de referência). Alíquota municipal de IBS **informada pelo usuário**, pré-preenchida com a estimativa de referência (rotulada como estimativa) quando o município não legislou — o valor declarado entra no código serial e na memória de cálculo como premissa auditável.
3. Regime tributário do fornecedor (real / presumido / Simples híbrido / Simples puro) — com textos de ajuda ("como descobrir no extrato PGDAS-D").
4. Se híbrido: Anexo (I–V) + RBT12 → sistema calcula faixa e DAS dos Anexos XVIII–XXII.
5. Carga legada ℓ: UF + alíquota efetiva de ICMS/ISS — **valor sugerido por UF editável** e campo para redução de base de cálculo (o sistema apura o efetivo).
6. Redução setorial ρ: dropdown das hipóteses da LC 214/2025 (60%, 30%, 40%, alíquota zero), com fundamento legal por opção.
7. Elasticidade ε: faixas sugeridas por tipo de objeto (tabela da aba Parâmetros da v7), editável.
8. Creditamento c: lucro real e lucro presumido, 0–99% (nos Simples, H/U, os tributos ficam dentro do DAS e c = 0). Depura todos os não cumulativos: ICMS e — no real — PIS/Cofins, além do IBS/CBS de destino; no presumido o PIS/Cofins é cumulativo e entra integral.
9. Sufixos: IS (alíquota), IPI ano-base (produto industrializado), ZFM (IPI remanescente) — exibidos condicionalmente (só para bens).

Saída do wizard: **o código serial montado e validado** + o valor do índice por período + oferta de compra do **Certificado de Série** (+R$ 75 por item; PDF com código, dados informados, valor, data e link/QR de verificação pública da série, válido até 2033 sem custo de atualização) e da **Memória de Cálculo Avulsa** (R$ 500, item isolado com técnica completa).

### 5.3 Área do assinante

- **Carteira de contratos** (multi-cliente para contadores): contrato → itens; cada item é uma série IRT-E (montada pelo mesmo wizard, sem custo avulso) + preço t0 e quantidade (ponderação pelo peso real no contrato).
- **Correção do contrato:** índice ponderado do contrato, valor corrigido, comparativo com o teto F (repasse integral), vedada dupla contagem com reajuste anual (nota TCU 1431/2017 nos relatórios).
- **Monitoramento e timing:** para cada contrato, a trajetória do índice ano a ano (2026→2033), destaque para o ano do maior salto e recomendação de janela de negociação (conteúdo da aba Timing da v7). Alertas quando parâmetros oficiais forem publicados/alterados.
- **Relatórios:** PDF sem marca d'água + **formato editável whitelabel** (o escritório aplica sua marca).
- Conta individual (multi-usuário fica para fase 2).

### 5.4 Admin (uso interno)

- Gestão de parâmetros versionados (publicação das alíquotas oficiais, novas reduções setoriais).
- Gestão de usuários/assinaturas; acompanhamento de transações avulsas.
- Painel de adoção: séries mais consultadas, conversão wizard → relatório → assinatura.

## 6. Fora de escopo do MVP (fase 2)

- Página pública curada de índices por série/período (adiada porque a alíquota oficial da CBS ainda não foi publicada — sem números oficiais, a vitrine prematura fragiliza a credibilidade).
- Multi-usuário por escritório e permissões.
- Greeks (sensibilidade) e stress test como telas do produto.
- API pública do índice.
- Versão setor público (redutor de compras governamentais, arts. 472/473 — a v7 atual permanece como instrumento dessa frente).
- Importação de planilha de formação de preços (CSV/XLSX).

## 7. Regras de cálculo (referência)

O motor implementa exatamente:

- Identidade de formação de preços P(1−B) = R(1+A), com A = g + h e B = b + d;
- F = [(1+g₁+h₁)(1−b₀−d₀)] ÷ [(1+g₀+h₀)(1−b₁−d₁)];
- IRT-E = 1 + κ·(F−1), κ = |ε| ÷ (1+|ε|);
- Carga efetiva com creditamento: τ_ef = τ_nom·(1−c) para todo tributo não cumulativo — ICMS e PIS/Cofins na origem (PIS/Cofins apenas no lucro real; extinto em 2027 — LC 214/2025, art. 378) e IBS e CBS no destino (art. 374, § 1º, I); o crédito de ICMS e de IBS/CBS acompanha a existência de cada tributo na transição;
- Cronograma φ(t) 2026–2033 conforme ADCT/LC 214 (tabela da v7); t0 < 2026 ⇒ todos os fatores = 1 no ano-base;
- DAS do Simples via Anexos XVIII–XXII da LC 214/2025 (puro: carga preservada ⇒ F = 1; híbrido: DAS × parcela não-IBS/CBS do ano-alvo);
- Imposto Seletivo com k = 1 (convenção v1); IPI ano-base e remanescente ZFM conforme sufixos;
- Ponderação do contrato pelo peso preço × quantidade de cada item.

A fonte normativa de cada parâmetro é registrada no banco (equivalente à aba Fontes_Legais da v7) e impressa na memória de cálculo.

## 8. Requisitos não-funcionais

- **Auditabilidade:** todo resultado exibe e armazena versão dos parâmetros, versão do motor e timestamp; o PDF carrega link de verificação pública.
- **Versionamento de parâmetros:** vigência por data; recálculo histórico fiel ("o valor publicado em jan/2027 continua acessível").
- **LGPD:** dados de contratos de clientes de contadores são dados empresariais sensíveis — criptografia em repouso, isolamento por conta, política de retenção e exclusão sob demanda.
- **Disclaimer jurídico:** "ferramenta de cálculo auditável; não constitui parecer jurídico ou tributário" em todas as saídas (texto a ser revisado por assessoria jurídica — item aberto).
- **Desempenho:** cálculo instantâneo (função pura); consulta pública cacheável por série × período × versão de parâmetros.
- **Confiabilidade do motor:** 100% dos golden tests contra a v7 passando em CI; deploy bloqueado em divergência.

## 9. Critérios de aceite do MVP

1. Consulta pública resolve qualquer série válida da gramática v1 e rejeita dv incorreto.
2. Wizard monta a série correta a partir das respostas (testado contra casos da v7, incluindo H com Anexo/Faixa e sufixos).
3. Golden tests: motor reproduz a v7 em todos os cenários da bateria (vértices do stress test + casos intermediários), com tolerância zero.
4. Fluxo de pagamento avulso (PIX) e assinatura recorrente funcionando em produção.
5. Relatório PDF completo: série, parâmetros, fórmula expandida com valores, fontes legais, disclaimer, link de verificação.
6. Assinante cadastra contrato multi-item, obtém índice ponderado, timing e exporta whitelabel editável.
7. Troca de parâmetro (simulação da publicação das alíquotas oficiais) propaga valores novos sem quebrar histórico.

## 10. Itens abertos

| Item | Responsável | Prazo-alvo |
|---|---|---|
| Registro de domínio e verificação da marca "Portal do IRT-E" | Cairo | out/2026 |
| Revisão jurídica do disclaimer e termos de uso | a contratar | dez/2026 |
| Alíquotas oficiais IBS/CBS (resolução do Senado, prevista até 15/12/2026) | externo — monitorar | dez/2026 |
| Whitepaper público do método (base da página institucional) | Cairo | dez/2026 |

## 11. Cronograma

| Período | Entrega |
|---|---|
| out–nov/2026 | Motor de cálculo + importação das tabelas da v7 + golden tests · banco versionado · consulta pública de série |
| nov–dez/2026 | Wizard avulso + pagamento PIX · relatório PDF com verificação · landing institucional |
| dez/2026 | Publicação das alíquotas oficiais (evento externo) → atualização de parâmetros · assinatura: carteira, multi-item, timing, whitelabel |
| jan/2027 | **Beta fechado** com 10–20 contadores · ajustes de UX e das faixas de ε com casos reais |
| 1º tri/2027 | **Lançamento público** no primeiro gatilho efetivo da transição (CBS plena) |
