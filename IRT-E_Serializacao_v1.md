# IRT-E — Especificação do Código Serial (gramática v1)

**Status:** v1 — proposta consolidada em 04/10/2026
**Escopo:** contratos privados (reajuste/recomposição entre empresas). A versão setor público (redutor de compras governamentais, arts. 472/473 da LC 214/2025) fica para gramática futura.

## 1. Propósito

O código serial é a identidade autodescritiva de uma parametrização do Índice de Reequilíbrio Tributário Expurgado. Ele permite citar a parametrização em cláusulas contratuais, memórias de cálculo e publicações do índice, de forma verificável por ambas as partes e por terceiros.

O código **não** carrega o par de anos (t0 → t1). Assim como o IGP-M, o código identifica a série; o período de aplicação é contextual à cláusula ou à publicação (ex.: "IRT-E BR100.000.1800.00.DMG0935-3, de 2026 para 2027").

## 2. Gramática

```
IRT-E <tipo><regime><ε>.<ρ>.<ℓ>.<c>.D<UF><i_M>{.<sufixos>}-<dv>
```

Bloco central (sempre presente), bloco de destino (obrigatório, exceto no regime U), sufixos opcionais composáveis, e dígito verificador final.

### 2.1 Bloco central

| Posição | Campo | Domínio | Codificação |
|---|---|---|---|
| 1 | Tipo do objeto | `B` = bem/produto · `S` = serviço | 1 letra |
| 2 | Regime tributário | `R` = lucro real · `P` = lucro presumido · `H` = Simples híbrido · `U` = Simples puro (unificado no DAS) | 1 letra |
| 3 | ε — elasticidade-preço da demanda | 0,00 a 9,99 | \|ε\| × 100, 3 dígitos (`100` = 1,00; `050` = 0,50) |
| 4 | ρ — redução setorial IBS/CBS | 0 a 100% | ρ × 100, 3 dígitos (`060` = 60%; `100` = isento/alíquota zero) |
| 5 | ℓ — carga legada por dentro | 0 a 99,99% | alíquota efetiva × 100, 4 dígitos (`1800` = 18,00%). **Já com a redução de base de cálculo apurada.** Bens: ICMS efetivo. Serviços: ISS efetivo. |
| 6 | c — creditamento do ano-base dos tributos não cumulativos | 0 a 99% | c × 100, 2 dígitos. Relevante em `R` (ICMS e PIS/Cofins), em `P` (só ICMS — o PIS/Cofins de 3,65% é cumulativo e não é depurado) e em `H` (o IBS/CBS apurado fora do DAS pelo regime regular é não cumulativo). Depura também o IBS/CBS de destino. Em `U`: sempre `00`. |
| 7 | Destino — IBS estadual e municipal | UF + alíquota | `D` + sigla da UF + i_M × 100 em 4 dígitos (`DMG0935` = Minas Gerais, IBS municipal 9,35%). **Obrigatório para R/P/H; omitido no regime U.** `DEX0000` = exterior (imunidade de exportação). |

**Como o destino é resolvido:** o IBS é devido no destino — as alíquotas pertencem ao ente do tomador/comprador. O componente **estadual** (i_E) é resolvido pela sigla da UF na tabela curada do portal (27 UFs — base pequena, mantida com fonte legal e vigência). O componente **municipal** (i_M) é **declarado pelo usuário** e gravado no próprio código: com mais de 5.570 municípios, a curadoria integral é inviável, e a alíquota declarada funciona como *premissa auditável* — aparece no serial e na memória de cálculo, e a contraparte pode conferi-la contra a lei municipal. O wizard pré-preenche i_M com a estimativa de referência (rotulada como estimativa) quando o município ainda não legislou; o usuário ajusta se houver lei municipal com número próprio. Para serviços, o destino é o município do tomador (regra geral da LC 214/2025).

Notas:
- A alíquota de PIS/Cofins do ano-base é implícita no regime: 9,25% (R) ou 3,65% (P). Em H e U, PIS/Cofins está dentro do DAS (carga preservada). No regime `P`, o campo c mede o crédito de ICMS (o PIS/Cofins cumulativo não é depurado por ele).
- `U` (Simples puro / recolhimento unificado): IBS/CBS permanecem dentro do DAS, logo F = 1 e IRT-E = 1,0000 para qualquer período. Por convenção, todos os campos numéricos são zero: `IRT-E BU000.000.0000.00-<dv>`. O código existe para que a cláusula possa citá-lo mesmo quando o índice é trivialmente constante.
- A letra `U` (unificado) foi escolhida em vez de `S` para não colidir com `S` = serviço no campo tipo.

### 2.2 Sufixos opcionais (composáveis, nesta ordem)

| Sufixo | Quando | Formato | Exemplo |
|---|---|---|---|
| Anexo/Faixa do Simples | **Obrigatório** se regime = `H` | `A` + anexo (1–5) + `F` + faixa (1–6), conforme Anexos XVIII–XXII da LC 214/2025 | `.A3F2` |
| Imposto Seletivo | Produto sujeito ao IS | `IS` + alíquota × 100, 4 dígitos | `.IS1800` (= 18%) |
| IPI no ano-base | Produto industrializado com IPI em t0 | `PI` + alíquota × 100, 4 dígitos | `.PI1000` (= 10%) |
| Zona Franca de Manaus | Produto ZFM com IPI remanescente em t1 | `ZF` + IPI t1 × 100, 4 dígitos | `.ZF0500` (= 5%) |

Os sufixos substituem as antigas "Série Seletivo" e "Série Manaus": como são composáveis, um produto ZFM sujeito ao IS não exige série própria — basta acumular `.IS….PI….ZF…`.

**Convenção v1 — Imposto Seletivo:** o fator de repasse do IS (k) é fixado em 1 por convenção nesta gramática. Se uma versão futura o parametrizar, entra como sufixo novo, sem quebrar os códigos v1.

## 3. Dígito verificador

Módulo 11 (mesma família do CNPJ), calculado sobre o código completo **sem** o prefixo `IRT-E`, sem pontos e sem o hífen:

1. Converta cada caractere alfanumérico em número na base 36: `0–9` → 0–9; `A–Z` → 10–35. Concatene as representações decimais na ordem do código.
2. Atribua pesos 2, 3, 4, 5, 6, 7, 2, 3, … da **direita para a esquerda**, reiniciando em 2 após o 7.
3. dv = 11 − (soma ponderada mod 11). Se o resultado for 11 → `0`; se for 10 → `X`.

## 4. Exemplos resolvidos

| Código | Leitura |
|---|---|
| `IRT-E BR100.000.1800.00.DMG0935-3` | Bem, lucro real, ε = 1,00, sem redução setorial, ICMS 18%, sem crédito, destino MG com IBS municipal 9,35% |
| `IRT-E SP100.000.0500.00.DMG0935-4` | Serviço, lucro presumido, ε = 1,00, ISS 5%, tomador em MG com IBS municipal 9,35% |
| `IRT-E BH075.060.1800.00.DMG0935.A1F4-1` | Bem, Simples híbrido, ε = 0,75, redução de 60%, ICMS 18%, destino MG (i_M 9,35%), Anexo I Faixa 4 |
| `IRT-E BR200.000.1800.00.DMG0935.IS1800-0` | Bem, lucro real, ε = 2,00, ICMS 18%, destino MG (i_M 9,35%), Imposto Seletivo 18% |
| `IRT-E BR100.000.1800.00.DMG0935.PI1000.ZF0500-3` | Bem ZFM, lucro real, ε = 1,00, ICMS 18%, destino MG (i_M 9,35%), IPI 10% no ano-base, IPI 5% remanescente |
| `IRT-E BU000.000.0000.00-4` | Bem, Simples puro — índice constante 1,0000 (sem bloco de destino) |

## 5. Do código ao índice

O código determina univocamente os parâmetros da fórmula:

- **A** (por fora) = g + h, com g = (1−c)(1−ρ)[(i_E + i_M)·φ_IBS(t) + c_CBS·φ_CBS(t)] e h = π·φ_IPI(t) + s — i_E resolvido pela UF na tabela curada do portal; i_M declarado no próprio bloco `D` do código;
- **B** (por dentro) = b + d, com b = ℓ·(1−c)·φ_legado(t) + p·(1−c)·φ_PC(t) e d = DAS(t) (H/U, via Anexo/Faixa). Em `P`, p (PIS/Cofins cumulativo) entra integral, sem depuração;
- **F** = [(1+g₁+h₁)(1−b₀−d₀)] ÷ [(1+g₀+h₀)(1−b₁−d₁)];
- **IRT-E** = 1 + κ·(F−1), κ = |ε| ÷ (1+|ε|).

Os parâmetros externos ao código — alíquota da CBS (nacional), cronograma φ(t), tabelas do Simples por ano e a tabela curada de alíquotas estaduais de IBS (27 UFs) — são versionados pela publicação do portal, com fonte legal registrada. Enquanto uma UF não publicar alíquota própria, sua linha da tabela carrega a estimativa de referência, rotulada como tal. Para t0 anterior a 2026 (contratos privados mais antigos), todos os fatores de transição valem 1 no ano-base (regime legado pleno).

## 6. Validação de um código recebido

1. Prefixo `IRT-E` presente; separadores `.` e `-` nas posições corretas.
2. Tipo ∈ {B, S}; regime ∈ {R, P, H, U}.
3. Se regime ∈ {R, P, H}, bloco `D` obrigatório no formato `D` + UF válida (sigla das 27 UFs, ou `EX` com `0000` para exterior) + 4 dígitos de i_M; se regime = `U`, bloco `D` proibido.
4. Se regime = `H`, sufixo `A#F#` obrigatório; se regime ≠ `H`, sufixo `A#F#` proibido.
5. Se regime = `U`, campo c = `00` (tudo dentro do DAS, sem crédito). Em `H`, c ≠ `00` é admitido (o IBS/CBS sai do DAS pelo regime regular, não cumulativo).
6. Sufixos `IS`/`PI`/`ZF` só com tipo = `B`.
7. Dígito verificador confere pelo algoritmo da seção 3.
8. Fora dessas regras: código inválido — não calcular.

## 7. Versionamento

Códigos sem marcador de versão pertencem à gramática v1. Uma gramática futura incompatível será identificada explicitamente (ex.: `IRT-E2 …`). Parâmetros novos da regulamentação (2027–2032) entram preferencialmente como **sufixos novos**, preservando a leitura dos códigos v1.

## 8. Registro de decisões (04/10/2026)

- Par de anos fora do código (precedente: IGP-M também não carrega data).
- c com 2 dígitos (00–99); recomendação metodológica de c < 100% fica na documentação, não na gramática.
- Marcador B/S incluído: embora ℓ seja computacionalmente simétrico, o tipo é necessário à documentação e condiciona os sufixos de produto.
- Fator de repasse do IS (k) excluído do cálculo nesta gramática (k = 1 por convenção).
- IPI do ano-base coberto pelo sufixo `PI`; ZFM vira sufixo `ZF` composável, não série separada.
- Simples híbrido exige Anexo/Faixa (DAS depende deles); Simples puro recebe código próprio (`U`) com índice constante.
- Dígito verificador módulo 11 incluído para proteger transcrição em cláusulas.
- **IBS estadual/municipal:** o IBS é devido no destino. O componente **estadual** (i_E) é resolvido pela sigla da UF na tabela curada do portal (27 linhas — curadoria viável, com fonte legal e vigência). O componente **municipal** (i_M) é **declarado pelo usuário** no bloco `D` do código: com 5.570+ municípios, a curadoria integral é inviável, e a alíquota declarada é uma premissa auditável — consta no serial e na memória de cálculo, conferível pela contraparte contra a lei municipal. O wizard pré-preenche com a estimativa de referência (rotulada) quando o município não legislou. (Revê o desenho anterior, que previa código IBGE + base curada por município.)
- **DAS do Simples pela alíquota nominal da faixa** (sem a parcela a deduzir): o serial não carrega RBT12; a DAS efetiva dependeria dele. O wizard usa o RBT12 apenas para determinar a faixa. Diverge da v7 (que usa DAS efetiva) apenas para itens H — valores recalculados e congelados nos golden tests do motor.
- **Regime U:** IBS/CBS dentro do DAS (g = 0, d = 0) e carga legada ℓ preservada no preço até a extinção (b = ℓ·φ_legado). O índice constante 1,0000 vale para o código convencional todo-zero (`BU000.000.0000.00`); um código U com ℓ > 0 reflete a extinção gradual do legado. Semântica idêntica ao cenário S6 do stress test da v7.
- **Sufixo ZF** é o IPI do ano-alvo (coluna IPI t1 da v7), multiplicado por φ_IPI(t1) — com o cronograma atual (φ_IPI = 0 a partir de 2027), seu efeito prático aguarda a regulamentação do IPI remanescente na ZFM.
- **Timing do híbrido:** a aba Timing da v7 reutiliza o DAS de t1 = 2033 em todas as colunas de ano (atalho de planilha). O motor calcula com a repartição do próprio ano-alvo (correto metodologicamente); os golden tests de timing dos itens H usam os valores do motor.
- **c ampliado a todos os não cumulativos (rev. de 04/10/2026):** o campo c deixou de ser o crédito exclusivo do PIS/Cofins do lucro real. Pela regra geral τ_ef = τ_nom·(1−c) (metodologia, seção 3), c depura o ICMS (regimes R e P), o PIS/Cofins (apenas R — em P é cumulativo) e o IBS/CBS de destino. `P` passa a admitir c ≠ `00` (mede o crédito de ICMS); `H` e `U` permanecem com c = `00`. Substitui a regra original "c = `00` em P" e reprova o fixture de ouro nos caminhos com c ≠ 0 (regenerado).
- **c no Simples híbrido (rev. de 05/10/2026):** `H` passa a admitir c ≠ `00` — no híbrido o IBS/CBS é apurado fora do DAS pelo regime regular (não cumulativo), logo admite creditamento; o fator depura g (IBS/CBS de destino) como nos demais regimes não cumulativos. Apenas `U` permanece com c = `00`.
