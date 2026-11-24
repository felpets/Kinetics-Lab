# Kinetics Lab — Laboratório Virtual de Análise Cinética Experimental

> *Projeto Acadêmico para minha Noiva*

🌐 **Versão Online Publicada:** [https://kinetics-lab-nine.vercel.app](https://kinetics-lab-nine.vercel.app)

**Subtítulo:** *Determinação da velocidade de reações químicas por métodos numéricos aplicados à concentração de produtos.*

---

## 🎯 Objetivo do Programa

O **Kinetics Lab** é uma ferramenta computacional e científica voltada à determinação da velocidade de reações químicas a partir de dados experimentais da evolução da concentração de produtos ao longo do tempo.

Diferente de simuladores convencionais que deduzem concentrações a partir de constantes cinéticas teóricas pré-definidas, o programa trata a **concentração de produtos como a variável experimental primária de entrada**, aplicando diferenciação numérica e cálculo diferencial para determinar:

* **Velocidade média da reação** (global e em cada intervalo temporal).
* **Velocidade instantânea aproximada** $v(t)$ por métodos numéricos de diferenças finitas.
* **Velocidade inicial estimada** $v_0$.
* **Velocidades máxima e mínima** observadas no ensaio.
* **Interpretação geométrica da derivada** através da reta tangente interativa.
* **Quantidade total de produto formado** por unidade de volume.
* **Concentração dos reagentes restantes**, via balanço estequiométrico quando $[A]_0$ for informado.
* **Ordem cinética estimada e constante de velocidade experimental**, via modelos integrados de velocidade (ordem zero, primeira e segunda ordem).
* **Comparação multi-experimental** de ensaios sob diferentes condições sem uso de equações de dependência térmica teóricas.

> [!IMPORTANT]
> **Diretriz Científica:** O projeto **não utiliza a equação de Arrhenius**, energia de ativação ou fatores pré-exponenciais em nenhuma parte de seus cálculos. Todas as grandezas e taxas são estimadas diretamente dos dados experimentais através de métodos numéricos e cálculo diferencial.

---

## 💻 Linguagens e Tecnologias

* **HTML5**: Estruturação semântica da aplicação, tabelas de dados dinâmicas e elementos de desenho para Canvas.
* **CSS3**: Design responsivo moderno com tema dark mode científico, visualização em alta densidade (DPI) e formatação específica para impressão de relatórios em PDF (`@media print`).
* **JavaScript (ES6+)**: Motor numérico modular (`kinetics-engine.js`), motor gráfico vetorial (`charts.js`) e gerenciador de estado reativo (`app.js`).
* **Node.js**: Automação de testes científicos automatizados (`test_suite.js`).

---

## 🔬 Fundamentação Matemática e Métodos Numéricos

Considere a reação química genérica:

$$aA + bB \longrightarrow cC + dD$$

Ao monitorar experimentalmente a formação de um produto $P$ com coeficiente estequiométrico $\nu$:

### 1. Velocidade Média
No intervalo de tempo entre $t_i$ e $t_{i+1}$:

$$v_{\text{méd}} = \frac{1}{\nu} \cdot \frac{\Delta [P]}{\Delta t} = \frac{1}{\nu} \cdot \frac{[P]_{i+1} - [P]_i}{t_{i+1} - t_i}$$

* Taxa de formação do produto: $v_P = \frac{\Delta [P]}{\Delta t}$
* Velocidade da reação: $v = \frac{1}{\nu} v_P$

### 2. Velocidade Instantânea e Métodos de Diferenciação Numérica
A velocidade instantânea corresponde ao limite e à derivada temporal:

$$v(t) = \frac{1}{\nu} \cdot \frac{d[P]}{dt}$$

Para aproximar numericamente essa derivada a partir de dados discretos:

#### A. Intervalos Uniformes ($\Delta t = \text{constante}$)
* **Pontos Internos ($0 < i < N$):** Fórmula de Diferença Finita Central de 3 pontos (erro $O(\Delta t^2)$):
  $$v_i \approx \frac{1}{\nu} \cdot \frac{[P]_{i+1} - [P]_{i-1}}{2\,\Delta t}$$
* **Extremidade Inicial ($t = t_0$):** Diferença Finita Progressiva de 3 pontos:
  $$v_0 \approx \frac{1}{\nu} \cdot \frac{-3[P]_0 + 4[P]_1 - [P]_2}{2\,\Delta t}$$
* **Extremidade Final ($t = t_N$):** Diferença Finita Regressiva de 3 pontos:
  $$v_N \approx \frac{1}{\nu} \cdot \frac{[P]_{N-2} - 4[P]_{N-1} + 3[P]_N}{2\,\Delta t}$$

#### B. Intervalos Não-Uniformes ($h_1 = t_i - t_{i-1}$, $h_2 = t_{i+1} - t_i$)
O programa implementa a diferenciação de polinômios interpoladores de Lagrange de 3 pontos:

$$\frac{d[P]}{dt}\Big|_{t_i} \approx \frac{-h_2^2 [P]_{i-1} + (h_2^2 - h_1^2)[P]_i + h_1^2 [P]_{i+1}}{h_1 h_2 (h_1 + h_2)}$$

### 3. Interpretação Geométrica da Reta Tangente
Graficamente, a taxa de formação $\frac{d[P]}{dt}$ no instante selecionado $t^*$ corresponde exatamente ao **coeficiente angular (inclinação) da reta tangente** à curva de concentração:

$$[P]_{\text{tangente}}(t) = [P](t^*) + \left(\frac{d[P]}{dt}\Big|_{t^*}\right) \cdot (t - t^*)$$

### 4. Relação Estequiométrica com o Reagente
Para uma reação $aA \rightarrow cP$, em volume constante:

$$[A](t) = [A]_0 - \frac{a}{c} \cdot ([P](t) - [P]_0)$$

### 5. Modelagem Cinética por Leis Integradas
Quando $[A]_0$ é fornecido, o simulador testa as leis integradas clássicas:
* **Ordem Zero:** $[A] = [A]_0 - kt$
* **Primeira Ordem:** $\ln[A] = \ln[A]_0 - kt$
* **Segunda Ordem:** $\frac{1}{[A]} = \frac{1}{[A]_0} + kt$

A seleção do modelo baseia-se na conjugação entre o $R^2$ da linearização e o Erro Quadrático Médio (RMSE) avaliado na escala original das concentrações.

---

## 🏛️ Estrutura da Aplicação (7 Seções)

1. **01 — Visão geral:** Dashboard com 8 indicadores principais e widget interativo da reta tangente com slider temporal.
2. **02 — Análise experimental:** Configuração estequiométrica, tabela editável, colar dados de planilha, importar CSV e tabelas de velocidades calculadas.
3. **03 — Modelagem cinética:** Avaliação comparativa das ordens 0, 1 e 2, com gráficos de linearização $[A]$, $\ln[A]$ e $1/[A]$.
4. **04 — Comparação de experimentos:** Cadastro e sobreposição visual de múltiplos ensaios experimentais sob diferentes condições.
5. **05 — Fundamentação teórica:** Artigo científico e pedagógico integrando química geral, cálculo diferencial e incertezas experimentais.
6. **06 — Validação e memória de cálculo:** Auditoria passo a passo com fórmulas, substituições numéricas de cada intervalo e resultados com unidades.
7. **07 — Relatórios:** Visualização e geração de relatórios acadêmicos prontos para impressão em PDF e download de dados/velocidades em CSV.

---

## 📊 Gráficos Interativos Implementados

* **Gráfico 1:** Concentração do Produto $[P] \times t$ (pontos experimentais e spline ajustada).
* **Gráfico 2:** Velocidade Média $v_{\text{méd}} \times t$ (plotada nos instantes médios dos intervalos).
* **Gráfico 3:** Velocidade Instantânea $v(t) \times t$ (aproximação por derivadas de diferenças finitas).
* **Gráfico 4:** Velocidade $v \times [P]$ (evolução da rapidez em função da formação do produto).
* **Gráfico 5:** Concentração de Reagentes $[A]$ e Produtos $[P] \times t$ (balanço estequiométrico).
* **Gráfico 6:** Tangente Interativa à Curva de Concentração (demonstração visual da derivada geométrica).
* **Gráfico de Linearização:** Análise dos modelos cinéticos integrados.
* **Gráfico Comparativo:** Sobreposição multi-experimental com curvas coloridas na mesma escala.

---

## ✅ Critérios de Aceitação Validados

Testados rigorosamente através da suíte automatizada `test_suite.js` utilizando o conjunto padrão com $\nu = 1$:

| Tempo (s) | Concentração (mol/L) |
|---|---|
| 0 | 0,000 |
| 10 | 0,120 |
| 20 | 0,210 |
| 30 | 0,290 |
| 40 | 0,350 |
| 50 | 0,400 |

### Resultados Esperados e Aprovados:
* $v_{\text{méd}}(0 \rightarrow 10\text{ s}) = 0{,}012\text{ mol/(L}\cdot\text{s)}$
* $v_{\text{méd}}(10 \rightarrow 20\text{ s}) = 0{,}009\text{ mol/(L}\cdot\text{s)}$
* $v_{\text{méd}}(20 \rightarrow 30\text{ s}) = 0{,}008\text{ mol/(L}\cdot\text{s)}$
* $v_{\text{méd}}(30 \rightarrow 40\text{ s}) = 0{,}006\text{ mol/(L}\cdot\text{s)}$
* $v_{\text{méd}}(40 \rightarrow 50\text{ s}) = 0{,}005\text{ mol/(L}\cdot\text{s)}$
* $v_{\text{méd, global}} = 0{,}008\text{ mol/(L}\cdot\text{s)}$
* $v_{\text{inst}}(t = 10\text{ s}) = 0{,}0105\text{ mol/(L}\cdot\text{s)}$

---

## 🚀 Como Executar Localmente

### 1. Inicialização Rápida no Windows (1 Clique)
Dê um duplo-clique no arquivo:
```bat
dev.bat
```
*(O script abrirá automaticamente o navegador em `http://localhost:5173`).*

### 2. Execução dos Testes Unitários
Para rodar a bateria de testes de validação matemática:
```bat
test.bat
# ou no terminal:
node test_suite.js
```

### 3. Modo Direto (Sem Instalações)
Abra a pasta `public/` e dê um duplo-clique em `index.html` para abrir diretamente no navegador padrão.

---

## ☁️ Acesso Online

O projeto está publicado em:
👉 **[https://kinetics-lab-nine.vercel.app](https://kinetics-lab-nine.vercel.app)**
