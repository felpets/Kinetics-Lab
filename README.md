# Kinetics Lab

*Laboratório virtual de análise cinética experimental*

Veja como calcular a velocidade de uma reação a partir de medições de tempo e concentração do produto. Com vários ensaios, você também pode investigar como a concentração inicial dos reagentes afeta a velocidade.

**[Abrir o laboratório](https://kinetics-lab-nine.vercel.app/)** · [Rodar no computador](#rodar-no-computador) · 

## Seu primeiro ensaio

1. Clique em **Primeiro acesso** para ver o laboratório preencher uma tabela com dados simulados.
2. Use **Próximo** para ler as explicações sobre as tabelas, os gráficos e as fórmulas no seu ritmo. Nas trocas de tela, clique na aba destacada no menu.
3. Quando quiser usar suas medições, vá em **Determinação experimental** e clique em **Novo ensaio**.

Os dados do tour são temporários. Seus ensaios cadastrados ficam salvos no navegador.

| Tela | O que você pode fazer |
| --- | --- |
| **Determinação experimental** | Registre as medições, consulte as velocidades média e instantânea e explore a reta tangente e a memória de cálculo. Use **PNG** nos gráficos que oferecem essa opção. |
| **Lei de velocidade** | Compare ensaios para estimar as ordens da reação e a constante cinética k. |
| **Fundamentação teórica** | Consulte as fórmulas e entenda como o laboratório calcula os resultados. |
| **Relatórios** | Baixe as medições e as velocidades em CSV ou salve em PDF o relatório do ensaio e do ajuste ativo. |

### Como inserir seus dados

Dê um nome ao ensaio, identifique o produto e informe seu coeficiente na equação balanceada (ν). Escolha a unidade de tempo (s, min ou h) e de concentração do produto (mol/L, mmol/L ou mol/m³).

Insira pelo menos dois pares de tempo e concentração, com tempos distintos. Você pode digitar na tabela, colar duas colunas de uma planilha ou importar um CSV. A primeira coluna é o tempo e a segunda é a concentração. O cabeçalho é opcional.

```csv
tempo;concentracao
0;0,000
10;0,120
20;0,210
```

Com vírgula decimal, separe as colunas por ponto e vírgula ou tabulação. Com ponto decimal, você também pode usar vírgula para separar as colunas.

### Como ajustar a lei de velocidade

1. Cadastre os reagentes na aba **Lei de velocidade**.
2. Para cada ensaio da mesma reação, preencha as concentrações iniciais dos reagentes em mol/L e informe a série do produto. A série deve começar em t = 0. As concentrações iniciais e a velocidade inicial estimada precisam ser positivas.
3. Para p reagentes, reúna pelo menos p + 1 ensaios válidos e varie suas concentrações iniciais de forma independente. Ensaios adicionais permitem avaliar os resíduos do ajuste.
4. Volte à aba **Lei de velocidade**. A tabela indica quais ensaios entraram no cálculo e compara as velocidades iniciais estimadas e ajustadas. O resumo mostra as ordens, a constante k e sua unidade. O gráfico sobrepõe as séries temporais dos ensaios usados.

Para experimentar o ajuste, clique em **Carregar conjunto simulado para regressão** na tela experimental e escolha **Exemplos simulados** na aba **Lei de velocidade**.

## Rodar no computador

Abra o terminal na pasta que contém o `package.json`. Para iniciar o Vite, use npm e uma versão compatível do Node.js, como Node.js 20.19.0 ou posterior na série 20, ou Node.js a partir da versão 22.12.0.

**Windows** · Use o PowerShell.

```powershell
.\run.bat
```

**Linux ou macOS** · Na primeira vez, dê permissão aos dois scripts. Depois, use `./run.sh` para abrir o laboratório.

```bash
chmod +x run.sh dev.sh
./run.sh
```

Os scripts `run` chamam o `dev` do seu sistema, instalam as dependências se a pasta `node_modules` estiver ausente e abrem o laboratório no navegador. O endereço aparece no terminal, normalmente `http://localhost:5173/`. Use **Ctrl+C** para encerrar o servidor.

Você também pode instalar as dependências e iniciar o servidor diretamente pelo npm. Abra no navegador o endereço que aparecer no terminal.

```sh
npm ci
npm run dev
```


## Confira um resultado de exemplo

Na tela experimental, use **Carregar exemplo simulado de referência** para preencher a série abaixo, com ν = 1.

| Tempo (s) | Concentração (mol/L) |
| ---: | ---: |
| 0 | 0,000 |
| 10 | 0,120 |
| 20 | 0,210 |
| 30 | 0,290 |
| 40 | 0,350 |
| 50 | 0,400 |

Os resultados esperados são **0,012 mol/(L·s)** para a velocidade inicial estimada, **0,008 mol/(L·s)** para a média global e **0,0105 mol/(L·s)** para a velocidade instantânea em 10 s. As médias dos cinco intervalos são 0,012, 0,009, 0,008, 0,006 e 0,005 mol/(L·s).

## Como os cálculos funcionam

- **Velocidade média.** O laboratório divide a variação de concentração Δ[P] pelo tempo Δt e pelo coeficiente ν. O gráfico coloca cada média no ponto médio do intervalo. A média global usa o primeiro e o último ponto da série, inclusive quando os intervalos têm durações diferentes.
- **Velocidade instantânea.** O motor estima a derivada d[P]/dt e divide por ν. Com três ou mais amostras, ele diferencia um polinômio local de Lagrange de três pontos, usando os tempos reais. Com duas amostras, usa a inclinação da secante. A curva usada na tangente é interpolada pelo método cúbico de Hermite. Sua inclinação coincide com as derivadas estimadas nos pontos medidos.
- **Velocidade inicial.** Quando a série começa em t = 0, v₀ é estimada pela média do primeiro intervalo. Um intervalo curto aproxima melhor a velocidade no início da reação. A tabela de velocidades instantâneas também mostra a estimativa por derivada no primeiro ponto.
- **Lei de velocidade.** O laboratório normaliza v₀ para mol·L⁻¹·s⁻¹ e ajusta ln(v₀) = ln(k) + Σ nⱼ ln([Rⱼ]₀) por QR de Householder com pivotamento. O motor verifica o posto e o condicionamento do ajuste. A ordem global n é a soma das ordens parciais. A constante k é a exponencial do intercepto e tem unidade (mol/L)^(1 − n) · s⁻¹.

## Para mexer no código

O laboratório usa HTML, CSS, JavaScript e Canvas. Depois de instalar as dependências com `npm ci`, use os comandos abaixo para gerar o site estático em `dist/` e abrir uma prévia local.

```sh
npm run build
npm run preview
```

- Interface e navegação. [index.html](index.html) e [app.js](public/js/app.js)
- Estilos. [styles.css](public/css/styles.css)
- Validação, velocidades e regressão. [kinetics-engine.js](public/js/kinetics-engine.js)
- Gráficos em Canvas e exportação de imagens. [charts.js](public/js/charts.js)
- Comandos e configuração do Vite. [package.json](package.json) e [vite.config.ts](vite.config.ts)
