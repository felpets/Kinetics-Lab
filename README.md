# Kinetics Lab

> *Projeto Acadêmico para minha Noiva*

O **Kinetics Lab** é um laboratório virtual e simulador científico interativo de cinética química para reações elementares irreversíveis de primeira ordem ($A \rightarrow B$). 

Permite visualizar em tempo real curvas de consumo do reagente, formação do produto, decaimento da velocidade instantânea e o impacto da variação de temperatura com base na equação de Arrhenius, renderizando gráficos vetoriais diretamente via HTML5 Canvas (sem bibliotecas externas).

---

## 📋 Pré-requisitos

Você pode executar o projeto de duas formas diferentes, dependendo do que já tem instalado:

| Modo de Execução | O que precisa instalado? | Vantagens |
| :--- | :--- | :--- |
| **Modo Web (Node.js)** ⭐ *Recomendado* | [Node.js](https://nodejs.org/) (v18+) | Inicia com 1 clique (`dev.bat`) e abre direto no navegador |
| **Modo Completo (Java Backend)** | [JDK 17+](https://adoptium.net/temurin/releases/?version=17) | Executa o backend Java com servidor HTTP embutido e testes |
| **Modo Direto (Navegador)** | Apenas um navegador moderno | Não requer nenhuma instalação |

---

### Como instalar os pré-requisitos (se necessário):

#### 1. Node.js (para o Modo Web)
* **Pelo instalador:** Baixe a versão LTS no site oficial [nodejs.org](https://nodejs.org/).
* **Ou pelo terminal Windows:**
  ```powershell
  winget install OpenJS.NodeJS.LTS
  ```

#### 2. Java JDK 17 (para o Modo Java)
* **Pelo instalador:** Baixe o JDK 17 no [Adoptium Temurin](https://adoptium.net/temurin/releases/?version=17) (marque as opções *Add to PATH* e *Set JAVA_HOME*).
* **Ou pelo terminal Windows:**
  ```powershell
  winget install EclipseAdoptium.Temurin.17.JDK
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

---

### Opção 2: Modo Servidor Java Local

Utiliza o servidor HTTP nativo do Java (`jdk.httpserver`) e o motor de simulação em Java.

#### Windows:
1. Para rodar a bateria de testes matemáticos:
   ```bat
   test.bat
   ```
2. Para compilar e iniciar o servidor:
   ```bat
   run.bat
   ```
3. Acesse no navegador: **`http://127.0.0.1:8080`**

#### Linux e macOS:
```bash
chmod +x test.sh run.sh
./test.sh
./run.sh
```

> [!TIP]
> Para usar outra porta no servidor Java, defina a variável `PORT` antes de executar (ex: `set PORT=3000 && run.bat`).

---

### Opção 3: Modo Direto (Sem servidor)

Se você não tiver Node nem Java instalados no momento:
* Vá até a pasta `public/` e dê **duplo-clique no arquivo `index.html`**.
* O laboratório funcionará normalmente no navegador.

---

## ☁️ Publicação / Deploy na Vercel

O projeto já está configurado com tags Open Graph, metadados e scripts compatíveis com a Vercel:

1. Faça login na sua conta em [vercel.com](https://vercel.com/).
2. Clique em **Add New...** → **Project**.
3. Selecione o repositório **`Kinetics-Lab`** do seu GitHub.
4. O framework **Vite** será detectado automaticamente.
5. Clique em **Deploy**.

---

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

