/**
 * Kinetics Lab - Motor de Cálculo Cinético Experimental
 * Implementa métodos numéricos para análise de velocidade de reação química
 * a partir de dados de concentração de produtos ao longo do tempo.
 */

const KineticsEngine = (() => {

  function parseNumber(value) {
    if (typeof value === "number") return value;
    if (typeof value !== "string") return NaN;
    const normalized = value.trim().replace(",", ".");
    return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)
      ? Number(normalized)
      : NaN;
  }

  function parseSeriesCsv(text) {
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const separator = lines[0]?.includes(";") ? ";" : lines[0]?.includes("\t") ? "\t" : ",";
    const header = /^(?:tempo|t|time)(?:$|[\s_(\[])/i;
    return lines.flatMap((line, index) => {
      const fields = (line.match(/"(?:[^"]|"")*"|[^"\r\n]+/g) || []).join("") === line
        ? line.split(new RegExp(separator + '(?=(?:[^"]*"[^"]*")*[^"]*$)'))
        : [];
      const cells = fields.map(cell => cell.trim().replace(/^"(.*)"$/, "$1"));
      if (index === 0 && cells.length === 2 && header.test(cells[0]) && /^(?:concentra|conc|produto|product|\[p\]|p\b)/i.test(cells[1])) return [];
      if (cells.length !== 2 || cells.some(cell => !Number.isFinite(parseNumber(cell)))) {
        throw new Error(`Linha ${index + 1} do arquivo inválida. Use duas colunas numéricas: tempo e concentração.`);
      }
      return [{ t: parseNumber(cells[0]), conc: parseNumber(cells[1]) }];
    });
  }

  // Validação e higienização dos dados de entrada
  function validateData(rawPoints, options = {}) {
    const errors = [];
    const warnings = [];

    if (!Array.isArray(rawPoints) || rawPoints.length < 2) {
      errors.push("São necessários pelo menos 2 pontos experimentais (tempo e concentração).");
      return { valid: false, errors, warnings, points: [] };
    }

    const nu = parseNumber(options.nu ?? 1);
    if (!Number.isFinite(nu) || nu <= 0) {
      errors.push("O coeficiente estequiométrico do produto (ν) deve ser um número positivo.");
    }

    const cleanPoints = [];
    const seenTimes = new Set();

    for (let i = 0; i < rawPoints.length; i++) {
      const p = rawPoints[i];
      const t = parseNumber(p.t);
      const conc = parseNumber(p.conc);

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


  // A forma em inclinações secantes é a derivada do interpolador de Lagrange.
  // Os pesos usam os dois espaçamentos reais, inclusive nas extremidades.
  function computeInstantaneousRates(points, nu) {
    const n = points.length;
    if (n < 2) return [];
    return points.map((point, index) => {
      const start = Math.max(0, Math.min(index - 1, n - 3));
      const [a, b, c] = points.slice(start, start + 3);
      const h1 = b.t - a.t;
      const slope1 = (b.conc - a.conc) / h1;
      let vProduct = slope1;
      let method = "Secante de dois pontos";
      let substitution = `(${b.conc} − ${a.conc}) / (${b.t} − ${a.t})`;

      if (c) {
        const h2 = c.t - b.t;
        const slope2 = (c.conc - b.conc) / h2;
        const offset = (point.t - a.t) + (point.t - b.t);
        vProduct = slope1 + offset * ((slope2 - slope1) / (h1 + h2));
        const equalSpacing = Math.abs(h1 - h2) <= 8 * Number.EPSILON * Math.max(h1, h2);
        if (index === 0) {
          method = "Diferença progressiva (3 pontos)";
        } else if (index === n - 1) {
          method = "Diferença regressiva (3 pontos)";
        } else {
          method = equalSpacing ? "Diferença central uniforme" : "Diferença central não uniforme";
        }

        if (equalSpacing && index > 0 && index < n - 1) {
          vProduct = (c.conc - a.conc) / (h1 + h2);
          substitution = `(${c.conc} − ${a.conc}) / (${c.t} − ${a.t})`;
        } else {
          const secondSlope = `(${c.conc} − ${b.conc}) / (${c.t} − ${b.t})`;
          substitution = `[${substitution} + ((${point.t} − ${a.t}) + (${point.t} − ${b.t})) × (${secondSlope} − (${substitution})) / ((${b.t} − ${a.t}) + (${c.t} − ${b.t}))]`;
        }
      }

      return {
        ...point, vProduct, vReaction: vProduct / nu, method,
        substitution: `v = (1 / ${nu}) × (${substitution})`
      };
    });
  }

  // Interpolação Hermitiana Cúbica Monótona para avaliação contínua e reta tangente
  function createSpline(points, derivatives) {
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

    if (derivatives) derivatives.forEach((slope, i) => { m[i] = slope; });

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
      let low = 0;
      let high = n - 1;
      while (high - low > 1) {
        const middle = Math.floor((high + low) / 2);
        if (x[middle] > tTarget) high = middle;
        else low = middle;
      }
      const i = low;
      if (tTarget === x[i]) return { val: y[i], deriv: m[i] };

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


  function kineticConstantUnit(order) {
    const exponent = Math.round((1 - order) * 1e8) / 1e8;
    if (exponent === 0) return "s⁻¹";
    if (exponent === 1) return "mol·L⁻¹·s⁻¹";
    if (exponent === -1) return "L·mol⁻¹·s⁻¹";
    return `(mol/L)^${String(exponent).replace(".", ",")} · s⁻¹`;
  }

  // QR de Householder com pivotamento de colunas e posto revelado pelo resíduo.
  function solveLeastSquares(matrix, target) {
    const rows = matrix.length;
    const columns = matrix[0].length;
    const permutation = Array.from({ length: columns }, (_, i) => i);
    const norm = (values) => values.reduce((length, value) => Math.hypot(length, value), 0);
    let firstPivot;
    for (let step = 0; step < columns; step++) {
      let pivot = step;
      let pivotNorm = 0;
      for (let column = step; column < columns; column++) {
        const columnNorm = norm(matrix.slice(step).map(row => row[column]));
        if (columnNorm > pivotNorm) {
          pivotNorm = columnNorm;
          pivot = column;
        }
      }
      if (step === 0) firstPivot = pivotNorm;
      if (pivotNorm <= firstPivot * 1e-8) return { rank: step };
      [permutation[pivot], permutation[step]] = [permutation[step], permutation[pivot]];
      for (const row of matrix) [row[pivot], row[step]] = [row[step], row[pivot]];

      const vector = matrix.slice(step).map(row => row[step]);
      vector[0] += (vector[0] < 0 ? -1 : 1) * pivotNorm;
      const length = norm(vector);
      for (let i = 0; i < vector.length; i++) vector[i] /= length;
      for (let column = step; column < columns; column++) {
        const projection = vector.reduce((sum, value, i) => sum + value * matrix[step + i][column], 0);
        vector.forEach((value, i) => { matrix[step + i][column] -= 2 * value * projection; });
      }
      const projection = vector.reduce((sum, value, i) => sum + value * target[step + i], 0);
      vector.forEach((value, i) => { target[step + i] -= 2 * value * projection; });
    }

    function backSubstitute(values) {
      const solution = new Array(columns);
      for (let i = columns - 1; i >= 0; i--) {
        let residual = values[i];
        for (let j = i + 1; j < columns; j++) residual -= matrix[i][j] * solution[j];
        solution[i] = residual / matrix[i][i];
      }
      return solution;
    }

    // Condicionamento de R em norma 1, incluindo dependências entre vários regressores.
    let inverseNorm = 0;
    let triangularNorm = 0;
    for (let j = 0; j < columns; j++) {
      const basis = Array.from({ length: columns }, (_, i) => Number(i === j));
      const inverseColumn = backSubstitute(basis);
      inverseNorm = Math.max(inverseNorm, inverseColumn.reduce((sum, value) => sum + Math.abs(value), 0));
      triangularNorm = Math.max(triangularNorm, matrix.slice(0, j + 1).reduce((sum, row) => sum + Math.abs(row[j]), 0));
    }
    const condition = triangularNorm * inverseNorm;
    const coefficients = new Array(columns);
    backSubstitute(target).forEach((value, index) => { coefficients[permutation[index]] = value; });
    return { rank: columns, condition, coefficients };
  }

  function fitInitialRateLaw(experiments, reagentCount) {
    if (!Number.isInteger(reagentCount) || reagentCount < 1 || experiments.length < reagentCount + 1) {
      return { success: false, error: `São necessários pelo menos ${reagentCount + 1} ensaios válidos para ${reagentCount} reagente(s).` };
    }

    const measured = [];
    const logs = [];
    for (const experiment of experiments) {
      const rate = experiment.analysis?.stats?.vInitial;
      const concentrations = experiment.initialConcentrations.map(parseNumber);
      if (experiment.analysis?.rawPoints[0]?.t !== 0 || !Number.isFinite(rate) || rate <= 0 ||
          concentrations.length !== reagentCount || concentrations.some(value => !Number.isFinite(value) || value <= 0)) {
        return { success: false, error: "Cada ensaio precisa iniciar em t = 0, ter velocidade inicial positiva e concentrações iniciais positivas." };
      }
      measured.push(Math.log(rate));
      logs.push(concentrations.map(Math.log));
    }

    const count = measured.length;
    const means = logs[0].map((_, j) => logs.reduce((sum, row) => sum + row[j] / count, 0));
    const matrix = logs.map(row => [1, ...row.map((value, j) => value - means[j])]);
    const qr = solveLeastSquares(matrix, [...measured]);
    if (qr.rank < reagentCount + 1) {
      return { success: false, error: `Posto insuficiente (${qr.rank}/${reagentCount + 1}). Varie as concentrações iniciais de forma independente.` };
    }
    if (!Number.isFinite(qr.condition) || qr.condition > 1e8) {
      return { success: false, error: "A regressão está mal condicionada. Amplie a variação independente das concentrações iniciais." };
    }

    const [centeredIntercept, ...orders] = qr.coefficients;
    const lnK = centeredIntercept - means.reduce((sum, mean, index) => sum + mean * orders[index], 0);
    const k = Math.exp(lnK);
    const globalOrder = orders.reduce((sum, order) => sum + order, 0);
    if (!Number.isFinite(k) || k <= 0 || !Number.isFinite(globalOrder)) {
      return { success: false, error: "A constante ou a ordem calculada excede a faixa numérica." };
    }

    const fitted = logs.map(row => lnK + row.reduce((sum, value, j) => sum + value * orders[j], 0));
    const meanResponse = measured.reduce((sum, value) => sum + value / count, 0);
    const sumSquaredResiduals = measured.reduce((sum, value, i) => sum + (value - fitted[i]) ** 2, 0);
    const total = measured.reduce((sum, value) => sum + (value - meanResponse) ** 2, 0);
    return {
      success: true, orders, globalOrder, k, lnK, unit: kineticConstantUnit(globalOrder),
      condition: qr.condition, degreesOfFreedom: count - reagentCount - 1,
      r2: total > Number.EPSILON ** 2 * count ? 1 - sumSquaredResiduals / total : null,
      rmseLog: Math.sqrt(sumSquaredResiduals / count),
      predicted: fitted.map(Math.exp)
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

    const nu = parseNumber(options.nu ?? 1);
    const useSmoothing = Boolean(options.useSmoothing);

    // Dados de trabalho (com ou sem suavização opcional)
    const activePoints = useSmoothing ? smoothPoints(validation.points) : validation.points;

    // 1. Velocidades Médias
    const average = computeAverageRates(activePoints, nu);

    // 2. Velocidades Instantâneas
    const instantaneous = computeInstantaneousRates(activePoints, nu);

    // 3. Spline Hermitiana para avaliação contínua e reta tangente
    if (![average.vGlobal, ...instantaneous.map(rate => rate.vReaction)].every(Number.isFinite)) {
      return { success: false, errors: ["As velocidades excedem a faixa numérica. Verifique a escala dos dados."], warnings: validation.warnings };
    }
    const spline = createSpline(activePoints, instantaneous.map(rate => rate.vProduct));

    // 4. Estatísticas globais do experimento
    const reactionRates = instantaneous.map(r => r.vReaction);
    const vMax = Math.max(...reactionRates);
    const vMin = Math.min(...reactionRates);
    const vInitial = average.intervals[0].vReaction;
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
        timeUnit: options.timeUnit || "s"
      }
    };
  }

  return {
    parseNumber,
    parseSeriesCsv,
    validateData,
    smoothPoints,
    computeAverageRates,
    computeInstantaneousRates,
    createSpline,
    linearRegression,
    fitIntegratedKineticModels,
    analyzeExperiment,
    fitInitialRateLaw,
    kineticConstantUnit
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
