# Desenvolvimento de um Simulador Computacional para Determinação da Lei de Velocidade e da Constante Cinética pelo Método das Velocidades Iniciais

> *Projeto Acadêmico para minha Noiva*

🌐 **Versão Online Publicada:** [https://kinetics-lab-nine.vercel.app](https://kinetics-lab-nine.vercel.app)

---

## 🎯 Objetivo

Desenvolver uma ferramenta computacional capaz de determinar experimentalmente a lei de velocidade e a constante cinética de uma reação química a partir das concentrações iniciais dos reagentes e das respectivas velocidades iniciais.

---

## 💻 Linguagens e Tecnologias Utilizadas

* **HTML5**: Estruturação semântica da aplicação web, tabelas de dados experimentais interativas e elementos de Canvas para os gráficos.
* **CSS3**: Estilização visual responsiva e moderna com tema dark mode científico, hierarquia visual e compatibilidade multiplataforma (desktop, tablet e mobile).
* **JavaScript (ES6+)**: Implementação dos algoritmos de tratamento numérico, regressão linear múltipla (solução matricial de Gauss-Jordan), análise estatística de resíduos, motor gráfico vetorial em Canvas e modelos cinéticos em tempo real.

---

## 🔬 Metodologia Computacional

O programa fundamenta-se na **lei diferencial de velocidade** para uma reação química genérica com múltiplos reagentes:

$$v_0 = k \cdot [A]_0^\alpha \cdot [B]_0^\beta \cdot [C]_0^\gamma$$

Para determinar experimentalmente a constante cinética $k$ e as ordens parciais de reação ($\alpha, \beta, \gamma$), o simulador aplica a **transformação logarítmica neperiana**:

$$\ln(v_0) = \ln(k) + \alpha \cdot \ln([A]_0) + \beta \cdot \ln([B]_0) + \gamma \cdot \ln([C]_0)$$

Essa transformação lineariza o modelo não-linear, reduzindo-o a uma formulação de **Regressão Linear Múltipla**:

$$y = \beta_0 + \beta_1 x_1 + \beta_2 x_2 + \beta_3 x_3 + \varepsilon$$

Onde:
* $y = \ln(v_0)$
* $\beta_0 = \ln(k) \implies k = \exp(\beta_0)$
* $\beta_1 = \alpha$ (ordem parcial em relação ao reagente A)
* $\beta_2 = \beta$ (ordem parcial em relação ao reagente B)
* $\beta_3 = \gamma$ (ordem parcial em relação ao reagente C)
* $x_j = \ln([R_j]_0)$

### Resolução Matricial por Mínimos Quadrados Ordinários (MQO)

Em notação matricial:

$$\mathbf{y} = \mathbf{X} \boldsymbol{\beta} + \boldsymbol{\varepsilon}$$

$$\hat{\boldsymbol{\beta}} = (\mathbf{X}^T \mathbf{X})^{-1} \mathbf{X}^T \mathbf{y}$$

O simulador resolve analiticamente o sistema de equações normais via eliminação de Gauss-Jordan com pivoteamento parcial, obtendo:
1. **Ordens parciais exatas e aproximadas** ($\alpha, \beta, \dots$) e a **ordem global da reação** ($n = \sum \alpha_j$).
2. **Constante cinética $k$** e determinação dimensional automática de sua unidade: $(\text{mol}\cdot\text{L}^{-1})^{1-n} \cdot \text{s}^{-1}$.
3. **Velocidades previstas pelo modelo:**
   $$\hat{v}_{0,i} = k \cdot [A]_{0,i}^\alpha \cdot [B]_{0,i}^\beta \dots$$
4. **Análise de Resíduos:**
   $$e_i = v_{0,i} - \hat{v}_{0,i}, \quad \text{Erro Relativo (\%)} = \frac{|v_{0,i} - \hat{v}_{0,i}|}{v_{0,i}} \times 100$$
5. **Métricas Estatísticas de Qualidade de Ajuste:** Coeficiente de Determinação ($R^2$), $R^2$ ajustado e Erro Quadrático Médio (RMSE).

---

## 📈 Representações Gráficas Integradas

O software renderiza quatro gráficos interativos em Canvas nativo (sem bibliotecas externas pesadas):

1. **Gráfico de Paridade / Ajuste ($v_{\text{observada}}$ vs. $v_{\text{prevista}}$):** Avalia a aderência do modelo frente à bissetriz ideal $1:1$ ($y = x$).
2. **Gráfico de Resíduos por Experimento:** Diagnóstico da dispersão e homocedasticidade dos erros para cada ponto experimental.
3. **Curvas de Sensibilidade Concentração-Velocidade:** Visualização do impacto individual de cada reagente na taxa reacional em função de sua ordem parcial.
4. **Linearização de Arrhenius ($\ln(k)$ vs $1000/T$):** Determinação da Energia de Ativação ($E_a$) e do Fator Pré-Exponencial ($A_0$) a partir de conjuntos a diferentes temperaturas:
   $$\ln(k) = \ln(A_0) - \frac{E_a}{R} \cdot \frac{1}{T}$$

---

## 🧪 Aplicação

A ferramenta permite:
* Estudar a influência das concentrações iniciais sobre a velocidade de reação.
* Comparar diferentes experimentos e prever velocidades para novas concentrações.
* Analisar a influência da temperatura por meio de conjuntos de dados experimentais independentes.
* Carregar instantaneamente casos clássicos da literatura química:
  * $2\,\text{NO} + \text{O}_2 \rightarrow 2\,\text{NO}_2$ (Ordem 2 em NO, 1 em $\text{O}_2$, global 3)
  * $\text{S}_2\text{O}_8^{2-} + 3\,\text{I}^- \rightarrow 2\,\text{SO}_4^{2-} + \text{I}_3^-$ (Ordem 1 em $\text{S}_2\text{O}_8^{2-}$, 1 em $\text{I}^-$, global 2)
  * Hidrólise de $(CH_3)_3CCl$ (Ordem 1 em $RCl$, 0 em $OH^-$, pseudo-1ª ordem)
  * Decomposição de $N_2O_5$ (1 reagente, 1ª ordem)
  * Reação $BrO_3^- + 5\,Br^- + 6\,H^+$ (3 reagentes, ordens 1, 1 e 2)

---

## 🎓 Finalidade

Proporcionar uma aplicação interativa dos conceitos de cinética química, integrando fundamentação teórica, tratamento matemático de dados e programação computacional.

---

## 🚀 Como Executar Localmente

### Opção 1: Execução em 1 clique no Windows (Recomendado)

Basta dar um duplo-clique no arquivo:
```bat
dev.bat
```
*O script verificará o ambiente, iniciará o servidor local e abrirá o navegador automaticamente em `http://localhost:5173`.*

### Opção 2: Pelo Terminal (Linux / macOS / Windows)

```bash
# Instalação das dependências do empacotador
npm install

# Inicialização do servidor de desenvolvimento
npm run dev
```

### Opção 3: Modo Direto (Sem instalação alguma)

Como a aplicação é construída em **HTML, CSS e JavaScript puros**, você pode simplesmente:
1. Abrir a pasta `public/`.
2. Dar duplo-clique no arquivo `index.html`.
3. O simulador funcionará completamente offline no seu navegador padrão.

---

## ☁️ Acesso Online

O projeto está configurado para deploy contínuo na Vercel e pode ser acessado publicamente em:
👉 **[https://kinetics-lab-nine.vercel.app](https://kinetics-lab-nine.vercel.app)**
