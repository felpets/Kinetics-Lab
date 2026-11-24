/**
 * Kinetics Lab - Motor de Cálculo Cinético Experimental
 * Implementa métodos numéricos para análise de velocidade de reação química
 * a partir de dados de concentração de produtos ao longo do tempo.
 * 
 * DIRETRIZ: Sem uso de Arrhenius ou parâmetros de ativação térmica.
 */

const KineticsEngine = (() => {
  // Validação e higienização dos dados de entrada
  function validateData(rawPoints, options = {}) {
    const errors = [];
    const warnings = [];

    if (!Array.isArray(rawPoints) || rawPoints.length < 2) {
      errors.push("São necessários pelo menos 2 pontos experimentais (tempo e concentração).");
      return { valid: false, errors, warnings, points: [] };
    }

    const nu = Number(options.nu);
    if (!Number.isFinite(nu) || nu <= 0) {
      errors.push("O coeficiente estequiométrico do produto (ν) deve ser um número positivo.");
    }

    const cleanPoints = [];
    const seenTimes = new Set();

    for (let i = 0; i < rawPoints.length; i++) {
      const p = rawPoints[i];
      const t = Number(p.t);
      const conc = Number(p.conc);

      if (!Number.isFinite(t)) {
        errors.push(`Ponto #${i + 1}: Tempo inválido ou ausente.`);
        continue;
      }
      if (!Number.isFinite(conc)) {
        errors.push(`Ponto #${i + 1}: Concentração inválida ou ausente.`);
        continue;
      }
      if (t < 0) {
        errors.push(`Ponto #${i + 1}: O tempo não pode ser negativo (${t}).`);
      }
      if (conc < 0) {
        warnings.push(`Ponto #${i + 1}: Concentração negativa detectada (${conc}). Verifique possíveis desvios ou ruído experimental.`);
      }
      if (seenTimes.has(t)) {
        errors.push(`Tempo duplicado detectado em t = ${t}. Remova ou corrija instantes repetidos.`);
      }
      seenTimes.add(t);

      cleanPoints.push({ id: i + 1, t, conc });
    }

    // Ordenação estrita pelo tempo
    cleanPoints.sort((a, b) => a.t - b.t);

    // Validação de estequiometria do reagente se fornecido
    if (options.initialA !== undefined && options.initialA !== null && options.initialA !== "") {
      const a0 = Number(options.initialA);
      const coefA = Number(options.coefA || 1);
      if (!Number.isFinite(a0) || a0 < 0) {
        errors.push("A concentração inicial do reagente [A]₀ deve ser um número não negativo.");
      }
      if (!Number.isFinite(coefA) || coefA <= 0) {
        errors.push("O coeficiente estequiométrico do reagente deve ser maior que zero.");
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings, points: [] };
    }

    return { valid: true, errors: [], warnings, points: cleanPoints };
  }

  // Suavização opcional dos dados para mitigar ruídos experimentais (Filtro Médio Ponderado Local)
  function smoothPoints(points) {
    if (points.length < 3) return points.map(p => ({ ...p }));
    const n = points.length;
    const smoothed = [];

    // Primeiro ponto (3-pontos ponderado)
    smoothed.push({
      id: points[0].id,
      t: points[0].t,
      conc: (5 * points[0].conc + 2 * points[1].conc - points[2].conc) / 6
    });

    // Pontos internos (filtro central 3 pontos)
    for (let i = 1; i < n - 1; i++) {
      smoothed.push({
        id: points[i].id,
        t: points[i].t,
        conc: (points[i - 1].conc + 2 * points[i].conc + points[i + 1].conc) / 4
      });
    }

    // Último ponto
    smoothed.push({
      id: points[n - 1].id,
      t: points[n - 1].t,
      conc: (-points[n - 3].conc + 2 * points[n - 2].conc + 5 * points[n - 1].conc) / 6
    });

    return smoothed;
  }

  // Cálculo das velocidades médias por intervalo e global
  function computeAverageRates(points, nu) {
    const intervals = [];
    const n = points.length;

    for (let i = 0; i < n - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dt = p2.t - p1.t;
      const dP = p2.conc - p1.conc;

      if (dt <= 0) continue;

      const vP = dP / dt; // Velocidade de formação do produto
      const v = (1 / nu) * vP; // Velocidade da reação corrigida pela estequiometria
      const tMid = (p1.t + p2.t) / 2;

      intervals.push({
        index: i + 1,
        t1: p1.t,
        t2: p2.t,
        tMid,
        dt,
        p1: p1.conc,
        p2: p2.conc,
        dP,
        vProduct: vP,
        vReaction: v,
        // Memória de cálculo detalhada
        calcMemory: {
          formula: "v = (1 / ν) × (Δ[P] / Δt)",
          substitution: `v = (1 / ${nu}) × (${p2.conc.toFixed(4)} − ${p1.conc.toFixed(4)}) / (${p2.t} − ${p1.t}) = (1 / ${nu}) × (${dP >= 0 ? '+' : ''}${dP.toFixed(4)} / ${dt.toFixed(2)})`,
          result: `${v >= 0 ? '+' : ''}${v.toFixed(6)}`
        }
      });
    }

    // Velocidade Média Global
    const dtGlobal = points[n - 1].t - points[0].t;
    const dPGlobal = points[n - 1].conc - points[0].conc;
    const vGlobal = dtGlobal > 0 ? (1 / nu) * (dPGlobal / dtGlobal) : 0;

    return { intervals, vGlobal, dtGlobal, dPGlobal };
  }

  // Cálculo da velocidade instantânea aproximada por Diferenciação Numérica
  // Utiliza diferenças centrais para pontos internos e diferenças de 3 pontos para as extremidades
  function computeInstantaneousRates(points, nu) {
    const n = points.length;
    const rates = [];

    if (n < 2) return rates;

    if (n === 2) {
      // Caso limítrofe de apenas 2 pontos: velocidade instantânea aproximada pela taxa média
      const dt = points[1].t - points[0].t;
      const dP = points[1].conc - points[0].conc;
      const v = dt > 0 ? (1 / nu) * (dP / dt) : 0;
      return [
        { ...points[0], vProduct: v * nu, vReaction: v, method: "Diferença Progressiva de 2 Pontos" },
        { ...points[1], vProduct: v * nu, vReaction: v, method: "Diferença Regressiva de 2 Pontos" }
      ];
    }

    // Extremidade Inicial (t = 0): Fórmula de 3 pontos progressiva (Lagrange)
    {
      const h1 = points[1].t - points[0].t;
      const h2 = points[2].t - points[1].t;
      const f0 = points[0].conc, f1 = points[1].conc, f2 = points[2].conc;
      let dPdt;

      if (Math.abs(h1 - h2) < 1e-9) {
        // Uniforme: (-3 f0 + 4 f1 - f2) / (2 h)
        dPdt = (-3 * f0 + 4 * f1 - f2) / (2 * h1);
      } else {
        // Não-uniforme
        dPdt = -((2 * h1 + h2) / (h1 * (h1 + h2))) * f0 +
               ((h1 + h2) / (h1 * h2)) * f1 -
               (h1 / (h2 * (h1 + h2))) * f2;
      }
      rates.push({
        id: points[0].id,
        t: points[0].t,
        conc: points[0].conc,
        vProduct: dPdt,
        vReaction: (1 / nu) * dPdt,
        method: "Diferenças Finitas Progressivas (3 pontos)"
      });
    }

    // Pontos Internos (1 <= i <= n - 2): Diferenças Centrais (Lagrange 3 pontos)
    for (let i = 1; i < n - 1; i++) {
      const h1 = points[i].t - points[i - 1].t;
      const h2 = points[i + 1].t - points[i].t;
      const fPrev = points[i - 1].conc;
      const fCurr = points[i].conc;
      const fNext = points[i + 1].conc;
      let dPdt;

      if (Math.abs(h1 - h2) < 1e-9) {
        // Uniforme: (f_{i+1} - f_{i-1}) / (2 h)
        dPdt = (fNext - fPrev) / (2 * h1);
      } else {
        // Não-uniforme
        dPdt = ((-Math.pow(h2, 2) * fPrev + (Math.pow(h2, 2) - Math.pow(h1, 2)) * fCurr + Math.pow(h1, 2) * fNext)) /
               (h1 * h2 * (h1 + h2));
      }

      rates.push({
        id: points[i].id,
        t: points[i].t,
        conc: points[i].conc,
        vProduct: dPdt,
        vReaction: (1 / nu) * dPdt,
        method: Math.abs(h1 - h2) < 1e-9 ? "Diferença Finita Central Uniforme" : "Diferença Finita Central Não-Uniforme (Lagrange)"
      });
    }

    // Extremidade Final (i = n - 1): Fórmula de 3 pontos regressiva
    {
      const h1 = points[n - 2].t - points[n - 3].t;
      const h2 = points[n - 1].t - points[n - 2].t;
      const fn2 = points[n - 3].conc, fn1 = points[n - 2].conc, fn0 = points[n - 1].conc;
      let dPdt;

      if (Math.abs(h1 - h2) < 1e-9) {
        // Uniforme: (fn2 - 4 fn1 + 3 fn0) / (2 h)
        dPdt = (fn2 - 4 * fn1 + 3 * fn0) / (2 * h2);
      } else {
        // Não-uniforme
        dPdt = (h2 / (h1 * (h1 + h2))) * fn2 -
               ((h1 + h2) / (h1 * h2)) * fn1 +
               ((h1 + 2 * h2) / (h2 * (h1 + h2))) * fn0;
      }

      rates.push({
        id: points[n - 1].id,
        t: points[n - 1].t,
        conc: points[n - 1].conc,
        vProduct: dPdt,
        vReaction: (1 / nu) * dPdt,
        method: "Diferenças Finitas Regressivas (3 pontos)"
      });
    }

    return rates;
  }

  // Interpolação Hermitiana Cúbica Monótona para avaliação contínua e reta tangente
  function createSpline(points) {
    const n = points.length;
    if (n < 2) return null;

    const x = points.map(p => p.t);
    const y = points.map(p => p.conc);

    // Derivadas nos nós
    const m = new Array(n).fill(0);
    const deltas = [];
    for (let i = 0; i < n - 1; i++) {
      deltas.push((y[i + 1] - y[i]) / (x[i + 1] - x[i]));
    }

    // Inicialização das inclinações
    m[0] = deltas[0];
    for (let i = 1; i < n - 1; i++) {
      m[i] = (deltas[i - 1] + deltas[i]) / 2;
    }
    m[n - 1] = deltas[n - 2];

    // Preservação de monotonicidade (Fritsch-Carlson)
    for (let i = 0; i < n - 1; i++) {
      if (Math.abs(deltas[i]) < 1e-12) {
        m[i] = 0;
        m[i + 1] = 0;
      } else {
        const alpha = m[i] / deltas[i];
        const beta = m[i + 1] / deltas[i];
        const dist = Math.hypot(alpha, beta);
        if (dist > 3) {
          const tau = 3 / dist;
          m[i] = tau * alpha * deltas[i];
          m[i + 1] = tau * beta * deltas[i];
        }
      }
    }

    // Função de avaliação em qualquer instante t
    return function evaluate(tTarget) {
      if (tTarget <= x[0]) {
        const d = m[0];
        const val = y[0] + d * (tTarget - x[0]);
        return { val, deriv: d };
      }
      if (tTarget >= x[n - 1]) {
        const d = m[n - 1];
        const val = y[n - 1] + d * (tTarget - x[n - 1]);
        return { val, deriv: d };
      }

      // Localizar o intervalo [x_i, x_{i+1}]
      let i = 0;
      while (i < n - 2 && tTarget > x[i + 1]) i++;

      const h = x[i + 1] - x[i];
      const t = (tTarget - x[i]) / h;
      const t2 = t * t;
      const t3 = t2 * t;

      // Base de Hermite
      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;

      const val = h00 * y[i] + h10 * h * m[i] + h01 * y[i + 1] + h11 * h * m[i + 1];

      // Derivada d/dt
      const dh00 = (6 * t2 - 6 * t) / h;
      const dh10 = 3 * t2 - 4 * t + 1;
      const dh01 = (-6 * t2 + 6 * t) / h;
      const dh11 = 3 * t2 - 2 * t;

      const deriv = dh00 * y[i] + dh10 * m[i] + dh01 * y[i + 1] + dh11 * m[i + 1];

      return { val, deriv };
    };
  }

  // Regressão Linear Simples (MQO): y = a * x + b
  function linearRegression(x, y) {
    const n = x.length;
    if (n < 2) return null;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumX2 += x[i] * x[i];
      sumY2 += y[i] * y[i];
    }

    const denom = n * sumX2 - sumX * sumX;
    if (Math.abs(denom) < 1e-12) return null;

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    // Coeficiente de Determinação R²
    const meanY = sumY / n;
    let ssTot = 0, ssRes = 0;
    for (let i = 0; i < n; i++) {
      const pred = slope * x[i] + intercept;
      ssTot += Math.pow(y[i] - meanY, 2);
      ssRes += Math.pow(y[i] - pred, 2);
    }
    const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 1;
    const rmse = Math.sqrt(ssRes / n);

    return { slope, intercept, r2, rmse, n };
  }

  // Modelagem Cinética Integrada (Ordem 0, 1 e 2 para único reagente [A])
  function fitIntegratedKineticModels(points, initialA, coefA, nuP) {
    if (!Number.isFinite(initialA) || initialA <= 0) return null;
    const aOverC = (coefA || 1) / (nuP || 1);
    const p0 = points[0].conc;

    // Cálculo da concentração de A ao longo do tempo: [A](t) = [A]0 - (a/c)*([P](t) - [P]0)
    const reactantData = [];
    for (const pt of points) {
      const concA = initialA - aOverC * (pt.conc - p0);
      reactantData.push({ t: pt.t, concA, concP: pt.conc });
    }

    // Filtragem de pontos válidos para análise cinética
    const validData = reactantData.filter(d => d.concA > 1e-9);
    if (validData.length < 3) {
      return {
        available: false,
        message: "A concentração do reagente calculada tornou-se nula ou negativa. Verifique os coeficientes estequiométricos."
      };
    }

    const tVals = validData.map(d => d.t);
    const aVals = validData.map(d => d.concA);

    // 1. Ordem Zero: [A] = [A]0 - k*t  => y = [A], x = t, slope = -k
    const fit0 = linearRegression(tVals, aVals);
    let order0 = null;
    if (fit0) {
      const k0 = -fit0.slope;
      // Resíduos e RMSE na escala original
      let ssRes = 0;
      const residuals = validData.map(d => {
        const pred = fit0.intercept - k0 * d.t;
        const res = d.concA - pred;
        ssRes += res * res;
        return { t: d.t, obs: d.concA, pred, resid: res };
      });
      const rmseOriginal = Math.sqrt(ssRes / validData.length);
      order0 = {
        name: "Ordem Zero (n = 0)",
        equation: "[A] = [A]₀ − k·t",
        slope: fit0.slope,
        intercept: fit0.intercept,
        k: k0,
        unit: "mol·L⁻¹·s⁻¹",
        r2: fit0.r2,
        rmseOriginal,
        residuals
      };
    }

    // 2. Primeira Ordem: ln[A] = ln[A]0 - k*t => y = ln[A], x = t, slope = -k
    const lnAVals = aVals.map(Math.log);
    const fit1 = linearRegression(tVals, lnAVals);
    let order1 = null;
    if (fit1) {
      const k1 = -fit1.slope;
      let ssRes = 0;
      const a0_est = Math.exp(fit1.intercept);
      const residuals = validData.map(d => {
        const pred = a0_est * Math.exp(-k1 * d.t);
        const res = d.concA - pred;
        ssRes += res * res;
        return { t: d.t, obs: d.concA, pred, resid: res };
      });
      const rmseOriginal = Math.sqrt(ssRes / validData.length);
      order1 = {
        name: "Primeira Ordem (n = 1)",
        equation: "ln[A] = ln[A]₀ − k·t",
        slope: fit1.slope,
        intercept: fit1.intercept,
        k: k1,
        unit: "s⁻¹",
        r2: fit1.r2,
        rmseOriginal,
        residuals
      };
    }

    // 3. Segunda Ordem: 1/[A] = 1/[A]0 + k*t => y = 1/[A], x = t, slope = k
    const invAVals = aVals.map(a => 1 / a);
    const fit2 = linearRegression(tVals, invAVals);
    let order2 = null;
    if (fit2) {
      const k2 = fit2.slope;
      let ssRes = 0;
      const residuals = validData.map(d => {
        const pred = 1 / (fit2.intercept + k2 * d.t);
        const res = d.concA - pred;
        ssRes += res * res;
        return { t: d.t, obs: d.concA, pred, resid: res };
      });
      const rmseOriginal = Math.sqrt(ssRes / validData.length);
      order2 = {
        name: "Segunda Ordem (n = 2)",
        equation: "1/[A] = 1/[A]₀ + k·t",
        slope: fit2.slope,
        intercept: fit2.intercept,
        k: k2,
        unit: "L·mol⁻¹·s⁻¹",
        r2: fit2.r2,
        rmseOriginal,
        residuals
      };
    }

    // Identificar o modelo mais compatível (avaliando R² linear e RMSE na escala original)
    const models = [order0, order1, order2].filter(Boolean);
    models.sort((m1, m2) => {
      // Prioridade: menor RMSE na escala original, ponderado por R²
      const score1 = m1.r2 * 0.5 - (m1.rmseOriginal / initialA) * 0.5;
      const score2 = m2.r2 * 0.5 - (m2.rmseOriginal / initialA) * 0.5;
      return score2 - score1;
    });

    const bestModel = models[0] || null;

    return {
      available: true,
      reactantData,
      models: { order0, order1, order2 },
      bestModel
    };
  }

  // Execução principal da análise completa de um conjunto experimental
  function analyzeExperiment(rawPoints, options = {}) {
    const validation = validateData(rawPoints, options);
    if (!validation.valid) {
      return { success: false, errors: validation.errors, warnings: validation.warnings };
    }

    const nu = Number(options.nu || 1);
    const useSmoothing = Boolean(options.useSmoothing);

    // Dados de trabalho (com ou sem suavização opcional)
    const activePoints = useSmoothing ? smoothPoints(validation.points) : validation.points;

    // 1. Velocidades Médias
    const average = computeAverageRates(activePoints, nu);

    // 2. Velocidades Instantâneas
    const instantaneous = computeInstantaneousRates(activePoints, nu);

    // 3. Spline Hermitiana para avaliação contínua e reta tangente
    const spline = createSpline(activePoints);

    // 4. Estatísticas globais do experimento
    const reactionRates = instantaneous.map(r => r.vReaction);
    const vMax = Math.max(...reactionRates);
    const vMin = Math.min(...reactionRates);
    const vInitial = instantaneous[0] ? instantaneous[0].vReaction : 0;
    const totalTime = activePoints[activePoints.length - 1].t - activePoints[0].t;
    const totalDeltaP = activePoints[activePoints.length - 1].conc - activePoints[0].conc;

    // 5. Modelagem Cinética Integrada (quando [A]0 é informado)
    let kineticsFit = null;
    if (options.initialA !== undefined && options.initialA !== null && options.initialA !== "") {
      kineticsFit = fitIntegratedKineticModels(activePoints, Number(options.initialA), Number(options.coefA || 1), nu);
    }

    return {
      success: true,
      errors: [],
      warnings: validation.warnings,
      rawPoints: validation.points,
      activePoints,
      useSmoothing,
      nu,
      average,
      instantaneous,
      spline,
      stats: {
        vInitial,
        vGlobal: average.vGlobal,
        vMax,
        vMin,
        totalDeltaP,
        totalTime,
        pointCount: activePoints.length
      },
      kineticsFit,
      metadata: {
        name: options.name || "Experimento Cinético",
        reactionEquation: options.reactionEquation || "A → P",
        productName: options.productName || "P",
        nu,
        coefA: options.coefA || 1,
        initialA: options.initialA !== undefined && options.initialA !== "" ? Number(options.initialA) : null,
        concUnit: options.concUnit || "mol/L",
        timeUnit: options.timeUnit || "s",
        temperatureDesc: options.temperatureDesc || "" // Descritivo apenas, sem Arrhenius!
      }
    };
  }

  return {
    validateData,
    smoothPoints,
    computeAverageRates,
    computeInstantaneousRates,
    createSpline,
    linearRegression,
    fitIntegratedKineticModels,
    analyzeExperiment
  };
})();

// Exportação para navegador e Node.js
if (typeof window !== "undefined") {
  window.KineticsEngine = KineticsEngine;
}
if (typeof globalThis !== "undefined") {
  globalThis.KineticsEngine = KineticsEngine;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = KineticsEngine;
}
