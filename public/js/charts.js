/**
 * Kinetics Lab - Motor Gráfico Científico em Canvas Nativo
 * Renderiza gráficos interativos de alta precisão com suporte a Retina/DPI,
 * tooltips, download de PNG e tangente interativa com derivada geométrica.
 */

window.KineticsCharts = (() => {
  const palette = {
    grid: "#1a2a40",
    axis: "#2f4666",
    text: "#8fa4be",
    textBright: "#e3effc",
    cyan: "#21d4e8",
    orange: "#ff8958",
    violet: "#9a7cff",
    green: "#43d6a0",
    pink: "#ff6699",
    yellow: "#ffd166",
    tangent: "#ff7043",
    bgCard: "#0c1729"
  };

  function setup(canvas, customPadding = {}) {
    const dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    const w = r.width || 450;
    const h = r.height || 280;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const padding = {
      l: 86, // Aumentado para 86px para garantir folga total contra sobreposição do título do eixo Y
      r: 24,
      t: 28,
      b: 46,
      ...customPadding
    };

    return { ctx, w, h, p: padding, pw: w - padding.l - padding.r, ph: h - padding.t - padding.b };
  }

  function formatTick(v) {
    if (!Number.isFinite(v)) return "—";
    const abs = Math.abs(v);
    if (abs === 0) return "0";
    if (abs < 0.005 || abs >= 1000) {
      const exp = Math.floor(Math.log10(abs));
      const mant = (v / Math.pow(10, exp)).toFixed(1);
      return `${mant}e${exp}`;
    }
    return abs < 0.1 ? v.toFixed(3) : abs < 1 ? v.toFixed(2) : v.toFixed(1);
  }

  // Desenha eixos cartesianos, grid quadriculada e títulos
  function drawAxes(ctx, { w, h, p, pw, ph }, { xMin, xMax, yMin, yMax, xTitle, yTitle, xTicks = 5, yTicks = 4 }) {
    ctx.clearRect(0, 0, w, h);

    ctx.font = "10px Inter, sans-serif";
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;

    // Linhas horizontais (Eixo Y)
    for (let i = 0; i <= yTicks; i++) {
      const y = p.t + ph * (1 - i / yTicks);
      ctx.beginPath();
      ctx.moveTo(p.l, y);
      ctx.lineTo(w - p.r, y);
      ctx.stroke();

      const val = yMin + ((yMax - yMin) * i) / yTicks;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = palette.text;
      ctx.fillText(formatTick(val), p.l - 8, y);
    }

    // Linhas verticais (Eixo X)
    for (let i = 0; i <= xTicks; i++) {
      const x = p.l + (pw * i) / xTicks;
      ctx.beginPath();
      ctx.moveTo(x, p.t);
      ctx.lineTo(x, h - p.b);
      ctx.stroke();

      const val = xMin + ((xMax - xMin) * i) / xTicks;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = palette.text;
      ctx.fillText(formatTick(val), x, h - p.b + 8);
    }

    // Eixos principais
    ctx.strokeStyle = palette.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.l, p.t);
    ctx.lineTo(p.l, h - p.b);
    ctx.lineTo(w - p.r, h - p.b);
    ctx.stroke();

    // Título do Eixo X
    if (xTitle) {
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "#b0c4de";
      ctx.font = "11px Inter, sans-serif";
      ctx.fillText(xTitle, p.l + pw / 2, h - 6);
    }

    // Título do Eixo Y (Rotacionado e centralizado à esquerda)
    if (yTitle) {
      ctx.save();
      ctx.translate(18, p.t + ph / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#b0c4de";
      ctx.font = "11px Inter, sans-serif";
      ctx.fillText(yTitle, 0, 0);
      ctx.restore();
    }
  }

  // Adiciona suporte a tooltip interativo via hover no Canvas
  function attachTooltip(canvas, getHoverData) {
    const parent = canvas.parentElement;
    if (!parent) return;

    let tooltip = parent.querySelector(".chart-tooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className = "chart-tooltip";
      tooltip.style.position = "absolute";
      tooltip.style.display = "none";
      tooltip.style.pointerEvents = "none";
      tooltip.style.whiteSpace = "pre-line";
      tooltip.style.background = "rgba(7, 16, 31, 0.94)";
      tooltip.style.border = "1px solid #21d4e8";
      tooltip.style.borderRadius = "6px";
      tooltip.style.padding = "6px 10px";
      tooltip.style.fontSize = "11px";
      tooltip.style.color = "#fff";
      tooltip.style.zIndex = "50";
      tooltip.style.boxShadow = "0 8px 20px rgba(0,0,0,0.4)";
      parent.style.position = "relative";
      parent.appendChild(tooltip);
    }

    canvas.onmousemove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const match = getHoverData(mouseX, mouseY);

      if (match) {
        tooltip.textContent = match.label;
        tooltip.style.display = "block";
        tooltip.style.left = `${Math.min(rect.width - 150, Math.max(10, mouseX + 14))}px`;
        tooltip.style.top = `${Math.max(10, mouseY - 30)}px`;
      } else {
        tooltip.style.display = "none";
      }
    };

    canvas.onmouseleave = () => {
      tooltip.style.display = "none";
    };
  }

  // Exportação do gráfico como imagem PNG
  function exportAsPNG(canvas, fileName = "grafico-cinetica.png") {
    const link = document.createElement("a");
    link.download = fileName;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  // =========================================================================
  // GRÁFICO 1: Concentração do Produto × Tempo
  // =========================================================================
  function drawProductVsTime(canvas, data, options = {}) {
    if (!data || !data.activePoints || data.activePoints.length === 0) return;
    const { ctx, w, h, p, pw, ph } = setup(canvas);
    const points = data.activePoints;
    const rawPoints = data.rawPoints || points;

    const xMax = Math.max(...points.map(pt => pt.t)) * 1.05 || 1;
    const xMin = 0;
    const yMin = Math.min(0, ...points.map(pt => pt.conc)) * 1.15;
    const yMax = Math.max(0, ...points.map(pt => pt.conc)) * 1.15 || (yMin === 0 ? 1 : 0);

    const timeUnit = options.timeUnit || "s";
    const concUnit = options.concUnit || "mol/L";
    const pName = options.productName || "P";

    drawAxes(ctx, { w, h, p, pw, ph }, {
      xMin, xMax, yMin, yMax,
      xTitle: `Tempo (${timeUnit})`,
      yTitle: `Concentração [${pName}] (${concUnit})`
    });

    const xSpan = (xMax - xMin) || 1;
    const ySpan = (yMax - yMin) || 1;
    const toX = (t) => p.l + ((t - xMin) / xSpan) * pw;
    const toY = (c) => h - p.b - ((c - yMin) / ySpan) * ph;

    // Curva contínua interpolada (Spline)
    if (data.spline) {
      ctx.strokeStyle = palette.cyan;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const steps = 120;
      for (let i = 0; i <= steps; i++) {
        const tVal = points[0].t + (points.at(-1).t - points[0].t) * i / steps;
        const cVal = data.spline(tVal).val;
        const px = toX(tVal);
        const py = toY(cVal);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Pontos experimentais
    const pointTargets = [];
    rawPoints.forEach(pt => {
      const cx = toX(pt.t);
      const cy = toY(pt.conc);

      ctx.beginPath();
      ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = palette.orange;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.8;
      ctx.stroke();

      pointTargets.push({
        x: cx,
        y: cy,
        label: `Exp #${pt.id}\nTempo: ${pt.t} ${timeUnit}\n[${pName}]: ${pt.conc.toFixed(4)} ${concUnit}`
      });
    });

    // Legenda no topo
    ctx.textAlign = "right";
    ctx.font = "10px Inter, sans-serif";
    ctx.fillStyle = palette.text;
    ctx.fillText(`● Pontos Experimentais   ― Curva Ajustada`, w - p.r, p.t - 10);

    attachTooltip(canvas, (mx, my) => {
      return pointTargets.find(pt => Math.hypot(pt.x - mx, pt.y - my) <= 12);
    });
  }

  // =========================================================================
  // GRÁFICO 2: Velocidade Média × Tempo (posicionada em t_médio)
  // =========================================================================
  function drawAverageRateVsTime(canvas, data, options = {}) {
    if (!data || !data.average || !data.average.intervals || data.average.intervals.length === 0) return;
    const { ctx, w, h, p, pw, ph } = setup(canvas);
    const intervals = data.average.intervals;

    const xMax = Math.max(...intervals.map(iv => iv.t2)) * 1.05 || 1;
    const allV = intervals.map(iv => iv.vReaction);
    let yMax = Math.max(0, ...allV) * 1.25;
    let yMin = Math.min(0, Math.min(...allV) * 1.25);
    if (yMax <= yMin) yMax = yMin + 1;

    const timeUnit = options.timeUnit || "s";
    const concUnit = options.concUnit || "mol/L";
    const rateUnit = `${concUnit}·${timeUnit}⁻¹`;

    drawAxes(ctx, { w, h, p, pw, ph }, {
      xMin: 0, xMax, yMin, yMax,
      xTitle: `Tempo Médio do Intervalo (${timeUnit})`,
      yTitle: `Velocidade Média (${rateUnit})`
    });

    const toX = (t) => p.l + (t / xMax) * pw;
    const toY = (v) => h - p.b - ((v - yMin) / (yMax - yMin)) * ph;

    // Linha de degraus para os intervalos
    ctx.strokeStyle = "rgba(154, 124, 255, 0.45)";
    ctx.lineWidth = 1.5;
    intervals.forEach(iv => {
      const x1 = toX(iv.t1);
      const x2 = toX(iv.t2);
      const y = toY(iv.vReaction);
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
    });

    // Linha conectando os pontos médios
    ctx.strokeStyle = palette.violet;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    intervals.forEach((iv, i) => {
      const cx = toX(iv.tMid);
      const cy = toY(iv.vReaction);
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.stroke();

    // Pontos nos instantes médios
    const pointTargets = [];
    intervals.forEach(iv => {
      const cx = toX(iv.tMid);
      const cy = toY(iv.vReaction);

      ctx.beginPath();
      ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = palette.violet;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.8;
      ctx.stroke();

      pointTargets.push({
        x: cx,
        y: cy,
        label: `Intervalo [${iv.t1} a ${iv.t2} ${timeUnit}]\nInstante médio: ${iv.tMid.toFixed(1)} ${timeUnit}\nv_méd = ${iv.vReaction.toFixed(6)} ${rateUnit}`
      });
    });

    attachTooltip(canvas, (mx, my) => {
      return pointTargets.find(pt => Math.hypot(pt.x - mx, pt.y - my) <= 12);
    });
  }

  // Interpolação cúbica monótona para curva contínua de velocidade instantânea passando exatamente pelos nós (ti, vi)
  function createRateSpline(ratePoints) {
    const n = ratePoints.length;
    if (n < 2) return (t) => (ratePoints[0] ? ratePoints[0].vReaction : 0);

    const x = ratePoints.map(r => r.t);
    const y = ratePoints.map(r => r.vReaction);

    const deltas = [];
    for (let i = 0; i < n - 1; i++) {
      const dx = x[i + 1] - x[i];
      deltas.push(dx !== 0 ? (y[i + 1] - y[i]) / dx : 0);
    }

    const m = new Array(n).fill(0);
    m[0] = deltas[0];
    for (let i = 1; i < n - 1; i++) {
      m[i] = (deltas[i - 1] + deltas[i]) / 2;
    }
    m[n - 1] = deltas[n - 2];

    // Preservação de monotonicidade (Fritsch-Carlson) para eliminar oscilações espúrias
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

    return function evaluateRate(tTarget) {
      if (tTarget <= x[0]) return y[0];
      if (tTarget >= x[n - 1]) return y[n - 1];

      let i = 0;
      while (i < n - 2 && tTarget > x[i + 1]) i++;

      const h = x[i + 1] - x[i];
      if (h <= 0) return y[i];

      const t = (tTarget - x[i]) / h;
      const t2 = t * t;
      const t3 = t2 * t;

      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;

      return h00 * y[i] + h10 * h * m[i] + h01 * y[i + 1] + h11 * h * m[i + 1];
    };
  }

  // =========================================================================
  // GRÁFICO 3: Velocidade Instantânea × Tempo (Diferenciação Numérica)
  // =========================================================================
  function drawInstantaneousVsTime(canvas, data, options = {}) {
    if (!data || !data.instantaneous || data.instantaneous.length === 0) return;
    const { ctx, w, h, p, pw, ph } = setup(canvas);
    const rates = data.instantaneous;

    const xMax = Math.max(...rates.map(r => r.t)) * 1.05 || 1;
    const allV = rates.map(r => r.vReaction);
    let yMax = Math.max(0, ...allV) * 1.25;
    let yMin = Math.min(0, Math.min(...allV) * 1.25);
    if (yMax <= yMin) yMax = yMin + 1;

    const timeUnit = options.timeUnit || "s";
    const concUnit = options.concUnit || "mol/L";
    const rateUnit = `${concUnit}·${timeUnit}⁻¹`;

    drawAxes(ctx, { w, h, p, pw, ph }, {
      xMin: 0, xMax, yMin, yMax,
      xTitle: `Tempo (${timeUnit})`,
      yTitle: `Velocidade Instantânea v(t) (${rateUnit})`
    });

    const toX = (t) => p.l + (t / xMax) * pw;
    const toY = (v) => h - p.b - ((v - yMin) / (yMax - yMin)) * ph;

    // Curva suave de velocidade instantânea passando EXATAMENTE por todas as bolinhas (ti, vi)
    if (rates.length >= 2) {
      const vSpline = createRateSpline(rates);
      ctx.strokeStyle = palette.green;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      const steps = 140;
      for (let i = 0; i <= steps; i++) {
        const tVal = (xMax * i) / steps;
        const vVal = vSpline(tVal);
        const px = toX(tVal);
        const py = toY(vVal);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Pontos discretos calculados por diferenças finitas (perfeitamente alinhados à curva)
    const pointTargets = [];
    rates.forEach(r => {
      const cx = toX(r.t);
      const cy = toY(r.vReaction);

      ctx.beginPath();
      ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = palette.green;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.8;
      ctx.stroke();

      pointTargets.push({
        x: cx,
        y: cy,
        label: `Instante: ${r.t} ${timeUnit}\nv_inst: ${r.vReaction.toFixed(6)} ${rateUnit}\n${r.method}`
      });
    });

    // Legenda no topo
    ctx.textAlign = "right";
    ctx.font = "10px Inter, sans-serif";
    ctx.fillStyle = palette.text;
    ctx.fillText(`● Pontos por Diferenças Finitas   ― Curva Suave v(t)`, w - p.r, p.t - 10);

    attachTooltip(canvas, (mx, my) => {
      return pointTargets.find(pt => Math.hypot(pt.x - mx, pt.y - my) <= 12);
    });
  }

  // =========================================================================
  // GRÁFICO 4: Velocidade × Concentração do Produto
  // =========================================================================
  function drawRateVsProduct(canvas, data, options = {}) {
    if (!data || !data.instantaneous || data.instantaneous.length === 0) return;
    const { ctx, w, h, p, pw, ph } = setup(canvas);
    const rates = data.instantaneous;

    const xMin = Math.min(0, ...rates.map(r => r.conc)) * 1.15;
    const xMax = Math.max(0, ...rates.map(r => r.conc)) * 1.15 || (xMin === 0 ? 1 : 0);
    const allV = rates.map(r => r.vReaction);
    let yMax = Math.max(0, ...allV) * 1.25;
    let yMin = Math.min(0, Math.min(...allV) * 1.25);
    if (yMax <= yMin) yMax = yMin + 1;

    const concUnit = options.concUnit || "mol/L";
    const timeUnit = options.timeUnit || "s";
    const rateUnit = `${concUnit}·${timeUnit}⁻¹`;
    const pName = options.productName || "P";

    drawAxes(ctx, { w, h, p, pw, ph }, {
      xMin, xMax, yMin, yMax,
      xTitle: `Concentração do Produto [${pName}] (${concUnit})`,
      yTitle: `Velocidade v (${rateUnit})`
    });

    const toX = (c) => p.l + ((c - xMin) / (xMax - xMin)) * pw;
    const toY = (v) => h - p.b - ((v - yMin) / (yMax - yMin)) * ph;

    // Linha conectando a evolução temporal
    ctx.strokeStyle = "rgba(255, 137, 88, 0.4)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    rates.forEach((r, i) => {
      const cx = toX(r.conc);
      const cy = toY(r.vReaction);
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.stroke();

    const pointTargets = [];
    rates.forEach(r => {
      const cx = toX(r.conc);
      const cy = toY(r.vReaction);

      ctx.beginPath();
      ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = palette.orange;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.8;
      ctx.stroke();

      pointTargets.push({
        x: cx,
        y: cy,
        label: `t = ${r.t} ${timeUnit}\n[${pName}]: ${r.conc.toFixed(4)} ${concUnit}\nv: ${r.vReaction.toFixed(6)} ${rateUnit}`
      });
    });

    attachTooltip(canvas, (mx, my) => {
      return pointTargets.find(pt => Math.hypot(pt.x - mx, pt.y - my) <= 12);
    });
  }

  // =========================================================================
  // GRÁFICO 6: Tangente Interativa à Curva de Concentração
  // =========================================================================
  function drawInteractiveTangent(canvas, data, selectedTime, options = {}) {
    if (!data || !data.activePoints || data.activePoints.length === 0) return null;
    const { ctx, w, h, p, pw, ph } = setup(canvas);
    const points = data.activePoints;
    const nu = data.nu || 1;

    const xMin = points[0].t;
    const xMax = points[points.length - 1].t;
    const yMin = Math.min(0, ...points.map(pt => pt.conc)) * 1.15;
    const yMax = Math.max(0, ...points.map(pt => pt.conc)) * 1.15 || (yMin === 0 ? 1 : 0);

    const timeUnit = options.timeUnit || "s";
    const concUnit = options.concUnit || "mol/L";
    const pName = options.productName || "P";

    drawAxes(ctx, { w, h, p, pw, ph }, {
      xMin, xMax, yMin, yMax,
      xTitle: `Tempo (${timeUnit})`,
      yTitle: `Concentração [${pName}] (${concUnit})`
    });

    const xSpan = (xMax - xMin) || 1;
    const ySpan = (yMax - yMin) || 1;
    const toX = (t) => p.l + ((t - xMin) / xSpan) * pw;
    const toY = (c) => h - p.b - ((c - yMin) / ySpan) * ph;

    // Curva contínua do produto [P](t)
    if (data.spline) {
      ctx.strokeStyle = palette.cyan;
      ctx.lineWidth = 3;
      ctx.beginPath();
      const steps = 140;
      for (let i = 0; i <= steps; i++) {
        const tVal = xMin + ((xMax - xMin) * i) / steps;
        const cVal = data.spline(tVal).val;
        const px = toX(tVal);
        const py = toY(cVal);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Avaliação no instante t* selecionado
    const tTarget = Math.max(xMin, Math.min(xMax, selectedTime !== undefined ? selectedTime : xMin));
    const evalResult = data.spline ? data.spline(tTarget) : { val: points[0].conc, deriv: 0 };
    const pVal = evalResult.val;
    const dPdt = evalResult.deriv; // Inclinação da reta tangente = taxa de formação d[P]/dt
    const vReaction = (1 / nu) * dPdt; // Velocidade da reação corrigida por ν

    const tSpan = xMax - xMin;
    const deltaT = tSpan * 0.22; // Comprimento visual da reta tangente
    const tA = Math.max(xMin, tTarget - deltaT);
    const tB = Math.min(xMax, tTarget + deltaT);
    const pA = pVal + dPdt * (tA - tTarget);
    const pB = pVal + dPdt * (tB - tTarget);

    // Traçado da reta tangente (Laranja brilhante)
    ctx.strokeStyle = palette.tangent;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(toX(tA), toY(pA));
    ctx.lineTo(toX(tB), toY(pB));
    ctx.stroke();

    // Linha tracejada projetando no eixo X
    const cx = toX(tTarget);
    const cy = toY(pVal);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, h - p.b);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ponto de tangência em destaque (círculo com borda dupla)
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fillStyle = palette.tangent;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Legenda no topo
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillStyle = palette.cyan;
    ctx.fillText("― Concentração [P]   ", w - p.r - 95, p.t - 10);
    ctx.fillStyle = palette.tangent;
    ctx.fillText("― Reta Tangente", w - p.r, p.t - 10);

    return {
      t: tTarget,
      conc: pVal,
      dPdt,
      vReaction,
      nu
    };
  }

  // =========================================================================
  // GRÁFICO 8: Comparação Multi-Experimental (Sobreposição)
  // =========================================================================
  function drawExperimentComparison(canvas, experimentsList, options = {}) {
    if (!experimentsList || experimentsList.length === 0) return;
    const { ctx, w, h, p, pw, ph } = setup(canvas);

    const colors = [palette.cyan, palette.orange, palette.green, palette.violet, palette.pink, palette.yellow];

    // Encontrar máximos globais para escala conjunta
    let xMax = 0;
    let yMax = 0;
    let yMin = 0;
    experimentsList.forEach(exp => {
      if (exp.analysis && exp.analysis.activePoints) {
        exp.analysis.activePoints.forEach(pt => {
          if (pt.t > xMax) xMax = pt.t;
          if (pt.conc > yMax) yMax = pt.conc;
          if (pt.conc < yMin) yMin = pt.conc;
        });
      }
    });

    xMax = xMax * 1.05 || 1;
    yMin *= 1.15;
    yMax = yMax * 1.15 || (yMin === 0 ? 1 : 0);

    const timeUnit = options.timeUnit || "s";
    const concUnit = options.concUnit || "mol/L";

    drawAxes(ctx, { w, h, p, pw, ph }, {
      xMin: 0, xMax, yMin: 0, yMax,
      xTitle: `Tempo (${timeUnit})`,
      yTitle: `Concentração do Produto (${concUnit})`
    });

    const toX = (t) => p.l + (t / xMax) * pw;
    const toY = (c) => h - p.b - (c / yMax) * ph;

    // Curvas sobrepostas
    experimentsList.forEach((exp, idx) => {
      const color = colors[idx % colors.length];
      const pts = exp.analysis ? exp.analysis.activePoints : [];
      if (pts.length === 0) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      pts.forEach((pt, i) => {
        const cx = toX(pt.t);
        const cy = toY(pt.conc);
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();

      pts.forEach(pt => {
        ctx.beginPath();
        ctx.arc(toX(pt.t), toY(pt.conc), 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
    });

    // Legenda no topo
    let legOffset = 0;
    ctx.font = "10px Inter, sans-serif";
    experimentsList.forEach((exp, idx) => {
      const color = colors[idx % colors.length];
      const name = exp.name || `Exp ${idx + 1}`;
      ctx.fillStyle = color;
      ctx.fillRect(p.l + legOffset, p.t - 16, 9, 9);
      ctx.fillStyle = palette.textBright;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(name, p.l + legOffset + 13, p.t - 11);
      legOffset += ctx.measureText(name).width + 30;
    });
  }

  return {
    drawProductVsTime,
    drawAverageRateVsTime,
    drawInstantaneousVsTime,
    drawRateVsProduct,
    drawInteractiveTangent,
    drawExperimentComparison,
    exportAsPNG
  };
})();
