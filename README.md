# Kinetics Lab

> *Projeto Acadêmico para minha Noiva*

O **Kinetics Lab** é um laboratório virtual e simulador científico interativo de cinética química para reações elementares irreversíveis de primeira ordem ($A \rightarrow B$). 

Permite visualizar em tempo real curvas de consumo do reagente, formação do produto, decaimento da velocidade instantânea e o impacto da variação de temperatura com base na equação de Arrhenius, renderizando gráficos vetoriais diretamente via HTML5 Canvas (sem bibliotecas externas).

---

## 📋 Pré-requisitos

Oque é preciso para iniciar o projeto em LocalHost, dependendo do que já tem instalado:

| Modo de Execução | O que precisa instalado? | Vantagens |
| :--- | :--- | :--- |
| **Modo Web (Node.js)** ⭐ *Recomendado* | [Node.js](https://nodejs.org/) (v18+) | Inicia com 1 clique (`dev.bat`) e abre direto no navegador |

---

### Como instalar os pré-requisitos (se necessário):

#### 1. Node.js (para o Modo Web)
* **Pelo instalador:** Baixe a versão LTS no site oficial [nodejs.org](https://nodejs.org/).
* **Ou pelo terminal Windows:**
  ```powershell
  winget install OpenJS.NodeJS.LTS
  ```
---

## 🚀 Como Executar o Projeto


🌐 **Versão Online:** [https://kinetics-lab-nine.vercel.app](https://kinetics-lab-nine.vercel.app)

### LocalHost: 
### Opção 1: Modo Web com Vite (Mais fácil no Windows)

Esta opção não requer Java. Toda a computação da cinética química é realizada diretamente pelo motor JavaScript do navegador.

1. Dê um **duplo-clique no arquivo `dev.bat`** na raiz da pasta.  
   *(O script instalará dependências se necessário e abrirá o navegador automaticamente).*
2. Ou rode pelo terminal:
   ```bash
   # Windows
   dev.bat

   # Linux / macOS
   chmod +x dev.sh
   ./dev.sh
   ```
3. O sistema abrirá em: **`http://localhost:5173`**
   

## 🧪 Fundamentação Teórica

O modelo calcula o comportamento da reação $A \rightarrow B$ sob as seguintes formulações:

* **Constante de Velocidade (Arrhenius):**
  $$k = A_0 \cdot \exp\left(-\frac{E_a}{R \cdot T}\right)$$
  *(sendo $R = 8{,}314462618\ \text{J/(mol}\cdot\text{K)}$ e $T$ em Kelvin).*
* **Concentração do Reagente:**
  $$[A](t) = [A]_0 \cdot \exp(-k \cdot t)$$
* **Concentração do Produto (Conservação de Massa):**
  $$[B](t) = [B]_0 + [A]_0 - [A](t)$$
* **Velocidade Instantânea da Reação:**
  $$v(t) = k \cdot [A](t)$$
* **Tempo de Meia-Vida:**
  $$t_{1/2} = \frac{\ln(2)}{k}$$

*Premissas do modelo:* mistura ideal, volume e temperatura constantes, reação elementar irreversível e estequiometria 1:1.

---

## 📂 Estrutura do Projeto

```text
├── public/                # Interface web, estilos e renderização em Canvas
│   ├── css/styles.css     # Estilos visuais (dark mode científico)
│   ├── js/app.js          # Lógica do formulário, métricas e fallback local
│   ├── js/charts.js       # Motor gráfico vetorial nativo em Canvas
│   └── index.html         # Página da aplicação
├── src/                   # Backend em Java puro (sem frameworks pesados)
│   ├── Main.java          # Servidor HTTP nativo e roteador de endpoints
│   ├── ReactionModel.java # Fórmulas e cálculos físico-químicos
│   ├── SimulationService  # Amostragem das curvas e cenários térmicos
│   ├── Json.java          # Parser e formatador JSON próprio
│   └── ValidationTests    # Suíte de testes automatizados do modelo
├── dev.bat / dev.sh       # Inicializadores do ambiente Web (Node/Vite)
├── run.bat / run.sh       # Compiladores e inicializadores do servidor Java
└── test.bat / test.sh     # Executores dos testes matemáticos em Java
```

