# Kinetics Lab — Laboratório Virtual de Análise Cinética Experimental

> *Projeto Acadêmico para minha Noiva*

[Aplicação publicada na Vercel](https://kinetics-lab-nine.vercel.app/)

O Kinetics Lab determina a velocidade de uma reação a partir de medições da concentração de um produto ao longo do tempo. Ele usa as velocidades iniciais de vários ensaios para estimar as ordens parciais, a ordem global e a constante cinética.

Use o botão **Primeiro acesso**, na barra superior, para seguir o guia interativo. Você pode avançar, voltar, sair a qualquer momento e carregar exemplos simulados durante a demonstração.

## Determinação Experimental da Velocidade

1. Crie um ensaio, identifique o produto e informe seu coeficiente estequiométrico ν.
2. Insira os pares de tempo e concentração na tabela, cole duas colunas de uma planilha ou importe um CSV. O CSV pode ter cabeçalho. Use ponto e vírgula ou tabulação com vírgula decimal, ou use vírgula como delimitador com ponto decimal.
3. Confira as unidades do ensaio. A aplicação aceita segundos, minutos ou horas e mol/L, mmol/L ou mol/m³.
4. Compare as tabelas e os gráficos de concentração × tempo, velocidade média × tempo, velocidade instantânea × tempo e velocidade instantânea × concentração. Escolha um instante na tangente interativa ou abra a memória de cálculo para ver as substituições.

A média por intervalo é v̄ = (1/ν) × Δ[P]/Δt. Cada valor é posicionado no tempo médio do intervalo. A média global usa os extremos da série, inclusive quando os intervalos têm durações diferentes.

A velocidade instantânea é v(t) = (1/ν) × d[P]/dt. Com três ou mais pontos, o motor diferencia o polinômio de Lagrange local de três amostras, usando os intervalos reais. Isso produz a diferença central nos pontos internos e diferenças unilaterais nas extremidades. Com dois pontos, o motor usa a inclinação secante. A tangente usa a curva de Hermite, cuja inclinação coincide com as diferenças finitas nos pontos medidos.

A velocidade inicial estimada para o ajuste é a média do primeiro intervalo quando a série começa em t = 0. A tabela de velocidades instantâneas também informa a derivada no primeiro ponto. A estimativa por secante é mais representativa quando o primeiro intervalo é curto.

## Determinação da Lei de Velocidade

Cadastre os reagentes na seção **Lei de velocidade**. Para cada ensaio da mesma reação, preencha as concentrações iniciais dos reagentes em mol/L e insira a série do produto. Os ensaios ficam salvos neste navegador.

A aplicação normaliza v₀ para mol·L⁻¹·s⁻¹ e ajusta ln(v₀) = ln(k) + Σ nⱼ ln([Rⱼ]₀). A regressão usa QR de Householder com pivotamento e verifica o posto e o condicionamento. São necessários pelo menos p + 1 ensaios válidos para p reagentes. Concentrações iniciais e velocidades iniciais precisam ser positivas. Variações independentes nas concentrações ajudam a identificar as ordens. Ensaios adicionais fornecem graus de liberdade para avaliar os resíduos.

A ordem global n é a soma das ordens parciais. A constante é k = exp(intercepto), com unidade (mol/L)^(1 − n) · s⁻¹.

Os exemplos de referência e de regressão são simulados. Selecione **Exemplos simulados** para ajustar esse conjunto. A seção **Relatórios** permite exportar a série e as velocidades em CSV ou imprimir o relatório em PDF.

## Caso de referência simulado

| Tempo (s) | Concentração (mol/L) |
|---:|---:|
| 0 | 0,000 |
| 10 | 0,120 |
| 20 | 0,210 |
| 30 | 0,290 |
| 40 | 0,350 |
| 50 | 0,400 |

Para ν = 1, as médias são 0,012, 0,009, 0,008, 0,006 e 0,005 mol/(L·s). A média global é 0,008 mol/(L·s). A diferença central em 10 s fornece 0,0105 mol/(L·s).

## Desenvolvimento

A aplicação usa HTML, CSS, JavaScript e Canvas, com compilação estática pelo Vite.

```sh
npm ci
npm run dev
npm test
npm run build
```

A suíte em `test_suite.js` verifica a série de referência, os formatos CSV, a diferenciação em malhas não uniformes e a regressão sobre ensaios simulados com parâmetros conhecidos.
