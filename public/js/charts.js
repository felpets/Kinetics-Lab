window.KineticsCharts = (() => {
  const palette = {
    grid: "#1c2c44",
    axis: "#334969",
    text: "#869ab3",
    cyan: "#21d4e8",
    orange: "#ff8958",
    violet: "#9a7cff",
    green: "#43d6a0",
    danger: "#ff667f"
  };

  function setup(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    const w = r.width || 400;
    const h = r.height || 260;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    return {
      ctx,
      w,
      h,
      p: { l: 56, r: 24, t: 26, b: 42 }
    };
  }

  function formatNum(v) {
    if (!Number.isFinite(v)) return "—";
    const abs = Math.abs(v);
    if (abs === 0) return "0";
    if (abs < 0.001 || abs >= 10000) {
      return v.toExponential(2).replace("e", "×10^");
    }
    return abs < 1 ? v.toFixed(3) : v.toFixed(2);
  }

  // GRÁFICO 1: PARIDADE (Observado vs Previsto)
  function drawParity(canvas, results) {
    if (!results || !results.experiments || results.experiments.length === 0) return;
    const { ctx, w, h, p } = setup(canvas);
    const pw = w - p.l - p.r;
    const ph = h - p.t - p.b;

    const allV = results.experiments.flatMap(e => [e.v_obs, e.v_pred]);
    let maxV = Math.max(...allV) * 1.15;
    if (maxV <= 0) maxV = 1;

    ctx.clearRect(0, 0, w, h);

    // Grid e Eixos
    ctx.font = "10px Inter, sans-serif";
    ctx.fillStyle = palette.text;
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = p.t + ph * (1 - i / 4);
      ctx.beginPath();
      ctx.moveTo(p.l, y);
      ctx.lineTo(w - p.r, y);
      ctx.stroke();
      ctx.fillText(formatNum((maxV * i) / 4), 6, y + 3);

      const x = p.l + (pw * i) / 4;
      ctx.beginPath();
      ctx.moveTo(x, p.t);
      ctx.lineTo(x, h - p.b);
      ctx.stroke();
      ctx.fillText(formatNum((maxV * i) / 4), x - 12, h - p.b + 16);
    }

    // Títulos dos eixos
    ctx.fillStyle = "#b0c4de";
    ctx.fillText("Velocidade Prevista v̂ (mol·L⁻¹·s⁻¹)", w / 2 - 80, h - 10);
    ctx.save();
    ctx.translate(14, h / 2 + 60);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Velocidade Observada v (mol·L⁻¹·s⁻¹)", 0, 0);
    ctx.restore();

    // Reta Ideal de Paridade 1:1 (y = x)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(p.l, h - p.b);
    ctx.lineTo(w - p.r, p.t);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pontos Experimentais
    results.experiments.forEach(e => {
      const cx = p.l + (e.v_pred / maxV) * pw;
      const cy = h - p.b - (e.v_obs / maxV) * ph;

      ctx.beginPath();
      ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = palette.cyan;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Rótulo do experimento
      ctx.fillStyle = "#edf6ff";
      ctx.font = "9px Inter, sans-serif";
      ctx.fillText(`Exp ${e.id}`, cx + 8, cy - 4);
    });

    // Legenda no topo
    ctx.font = "10px Inter, sans-serif";
    ctx.fillStyle = palette.text;
    ctx.fillText(`R² = ${results.r2.toFixed(4)}`, w - p.r - 80, p.t - 8);
  }

  // GRÁFICO 2: RESÍDUOS POR EXPERIMENTO
  function drawResiduals(canvas, results) {
    if (!results || !results.experiments || results.experiments.length === 0) return;
    const { ctx, w, h, p } = setup(canvas);
    const pw = w - p.l - p.r;
    const ph = h - p.t - p.b;

    const resids = results.experiments.map(e => e.resid);
    const maxAbsRes = Math.max(...resids.map(Math.abs), 1e-6) * 1.3;

    ctx.clearRect(0, 0, w, h);

    // Linha Zero
    const yZero = p.t + ph / 2;
    ctx.strokeStyle = palette.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.l, yZero);
    ctx.lineTo(w - p.r, yZero);
    ctx.stroke();

    // Grid Horizontal
    ctx.font = "10px Inter, sans-serif";
    ctx.fillStyle = palette.text;
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;

    [-maxAbsRes, 0, maxAbsRes].forEach((val, i) => {
      const y = p.t + (ph * i) / 2;
      ctx.fillText(formatNum(val), 6, y + 3);
    });

    // Eixo X e Barras/Pontos de Resíduo
    const n = results.experiments.length;
    results.experiments.forEach((e, idx) => {
      const cx = p.l + ((idx + 0.5) / n) * pw;
      const cy = yZero - (e.resid / maxAbsRes) * (ph / 2);

      // Linha vertical de dispersão
      ctx.strokeStyle = e.resid >= 0 ? palette.cyan : palette.orange;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, yZero);
      ctx.lineTo(cx, cy);
      ctx.stroke();

      // Ponto
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = e.resid >= 0 ? palette.cyan : palette.orange;
      ctx.fill();

      // Rótulo Exp
      ctx.fillStyle = palette.text;
      ctx.fillText(`Exp ${e.id}`, cx - 12, h - p.b + 16);
    });

    // Título Y
    ctx.save();
    ctx.translate(14, h / 2 + 40);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "#b0c4de";
    ctx.fillText("Resíduo (v_obs - v_pred)", 0, 0);
    ctx.restore();
  }

  // GRÁFICO 3: SENSIBILIDADE (Concentração vs Velocidade)
  function drawSensitivity(canvas, results) {
    if (!results || !results.reagents || results.reagents.length === 0) return;
    const { ctx, w, h, p } = setup(canvas);
    const pw = w - p.l - p.r;
    const ph = h - p.t - p.b;

    ctx.clearRect(0, 0, w, h);

    // Amostragem das curvas teóricas de taxa com concentração normalizada de 0.1 a 2.0
    const colors = [palette.cyan, palette.orange, palette.violet];
    const steps = 60;
    const cMax = 2.0;

    // Calcular valores máximos para escalar
    let maxRate = 0;
    const curves = results.reagents.map((reagent, rIdx) => {
      const order = reagent.order;
      const points = [];
      for (let s = 0; s <= steps; s++) {
        const conc = (cMax * s) / steps;
        // Velocidade normalizada: (conc)^order
        const rate = Math.pow(Math.max(conc, 0), order);
        points.push({ conc, rate });
        if (rate > maxRate) maxRate = rate;
      }
      return { reagent, points, color: colors[rIdx % colors.length] };
    });

    if (maxRate <= 0) maxRate = 1;

    // Grid
    ctx.font = "10px Inter, sans-serif";
    ctx.fillStyle = palette.text;
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = p.t + ph * (1 - i / 4);
      ctx.beginPath();
      ctx.moveTo(p.l, y);
      ctx.lineTo(w - p.r, y);
      ctx.stroke();
      ctx.fillText(((maxRate * i) / 4).toFixed(1), 16, y + 3);

      const x = p.l + (pw * i) / 4;
      ctx.beginPath();
      ctx.moveTo(x, p.t);
      ctx.lineTo(x, h - p.b);
      ctx.stroke();
      ctx.fillText(((cMax * i) / 4).toFixed(1), x - 6, h - p.b + 16);
    }

    // Títulos
    ctx.fillStyle = "#b0c4de";
    ctx.fillText("Concentração relativa do reagente (u.a.)", w / 2 - 95, h - 10);
    ctx.save();
    ctx.translate(14, h / 2 + 50);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Velocidade relativa calculada (u.a.)", 0, 0);
    ctx.restore();

    // Traçado das curvas
    curves.forEach((curve, i) => {
      ctx.strokeStyle = curve.color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      curve.points.forEach((pt, idx) => {
        const x = p.l + (pt.conc / cMax) * pw;
        const y = h - p.b - (pt.rate / maxRate) * ph;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Legenda
      const legX = p.l + i * 110;
      ctx.fillStyle = curve.color;
      ctx.fillRect(legX, p.t - 14, 10, 10);
      ctx.fillStyle = "#edf6ff";
      ctx.fillText(`[${curve.reagent.name}] (ordem ${curve.reagent.order.toFixed(2)})`, legX + 14, p.t - 5);
    });
  }

  // GRÁFICO 4: ARRHENIUS (ln(k) vs 1000/T)
  function drawArrhenius(canvas, arrheniusData) {
    if (!arrheniusData || !arrheniusData.points || arrheniusData.points.length < 2) {
      const { ctx, w, h } = setup(canvas);
      ctx.clearRect(0, 0, w, h);
      ctx.font = "12px Inter, sans-serif";
      ctx.fillStyle = palette.text;
      ctx.fillText("Insira pelo menos 2 temperaturas para traçar Arrhenius.", w / 4, h / 2);
      return;
    }

    const { ctx, w, h, p } = setup(canvas);
    const pw = w - p.l - p.r;
    const ph = h - p.t - p.b;

    ctx.clearRect(0, 0, w, h);

    const xVals = arrheniusData.points.map(pt => pt.invT * 1000); // 1000/T
    const yVals = arrheniusData.points.map(pt => pt.lnK);

    const minX = Math.min(...xVals) * 0.96;
    const maxX = Math.max(...xVals) * 1.04;
    const minY = Math.min(...yVals) * 1.08;
    const maxY = Math.max(...yVals) * 0.92;

    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;

    // Grid
    ctx.font = "10px Inter, sans-serif";
    ctx.fillStyle = palette.text;
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = p.t + ph * (1 - i / 4);
      ctx.beginPath();
      ctx.moveTo(p.l, y);
      ctx.lineTo(w - p.r, y);
      ctx.stroke();
      ctx.fillText((minY + (spanY * i) / 4).toFixed(2), 10, y + 3);

      const x = p.l + (pw * i) / 4;
      ctx.beginPath();
      ctx.moveTo(x, p.t);
      ctx.lineTo(x, h - p.b);
      ctx.stroke();
      ctx.fillText((minX + (spanX * i) / 4).toFixed(2), x - 10, h - p.b + 16);
    }

    // Títulos
    ctx.fillStyle = "#b0c4de";
    ctx.fillText("1000 / T (K⁻¹)", w / 2 - 25, h - 10);
    ctx.save();
    ctx.translate(14, h / 2 + 25);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("ln(k)", 0, 0);
    ctx.restore();

    // Reta ajustada
    const x1 = minX, x2 = maxX;
    const y1 = arrheniusData.fit(x1 / 1000);
    const y2 = arrheniusData.fit(x2 / 1000);

    ctx.strokeStyle = palette.orange;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(p.l + ((x1 - minX) / spanX) * pw, h - p.b - ((y1 - minY) / spanY) * ph);
    ctx.lineTo(p.l + ((x2 - minX) / spanX) * pw, h - p.b - ((y2 - minY) / spanY) * ph);
    ctx.stroke();

    // Pontos experimentais
    arrheniusData.points.forEach((pt, i) => {
      const cx = p.l + ((pt.invT * 1000 - minX) / spanX) * pw;
      const cy = h - p.b - ((pt.lnK - minY) / spanY) * ph;

      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = palette.violet;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#edf6ff";
      ctx.font = "9px Inter, sans-serif";
      ctx.fillText(`${pt.tempC}°C`, cx + 8, cy - 4);
    });

    // Legenda no topo
    ctx.fillStyle = palette.text;
    ctx.font = "10px Inter, sans-serif";
    ctx.fillText(`Ea = ${arrheniusData.ea.toFixed(2)} kJ/mol | R² = ${arrheniusData.r2.toFixed(4)}`, p.l + 5, p.t - 8);
  }

  return {
    renderAll(results, arrheniusData) {
      const parityEl = document.querySelector("#parityChart");
      const residEl = document.querySelector("#residualsChart");
      const sensEl = document.querySelector("#sensitivityChart");
      const arrhEl = document.querySelector("#arrheniusChart");

      if (parityEl) drawParity(parityEl, results);
      if (residEl) drawResiduals(residEl, results);
      if (sensEl) drawSensitivity(sensEl, results);
      if (arrhEl && arrheniusData) drawArrhenius(arrhEl, arrheniusData);
    }
  };
})();
