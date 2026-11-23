(() => {
  const R_CONST = 8.314462618; // J/(mol*K)

  // Presets de Cinética Química Clássica
  const PRESETS = {
    no_o2: {
      name: "2 NO + O₂ → 2 NO₂",
      reagents: ["NO", "O₂"],
      data: [
        { concs: [0.010, 0.010], v: 0.0071 },
        { concs: [0.010, 0.020], v: 0.0142 },
        { concs: [0.010, 0.030], v: 0.0213 },
        { concs: [0.020, 0.010], v: 0.0284 },
        { concs: [0.030, 0.010], v: 0.0639 }
      ],
      temperatures: [
        { tempC: 25, k: 7100 },
        { tempC: 35, k: 7850 },
        { tempC: 45, k: 8650 },
        { tempC: 55, k: 9500 }
      ]
    },
    s2o8_i: {
      name: "S₂O₈²⁻ + 3 I⁻ → 2 SO₄²⁻ + I₃⁻",
      reagents: ["S₂O₈²⁻", "I⁻"],
      data: [
        { concs: [0.08, 0.034], v: 2.2e-4 },
        { concs: [0.08, 0.017], v: 1.1e-4 },
        { concs: [0.16, 0.017], v: 2.2e-4 },
        { concs: [0.04, 0.034], v: 1.1e-4 },
        { concs: [0.12, 0.025], v: 2.43e-4 }
      ],
      temperatures: [
        { tempC: 20, k: 0.052 },
        { tempC: 30, k: 0.081 },
        { tempC: 40, k: 0.122 },
        { tempC: 50, k: 0.180 }
      ]
    },
    tbutyl: {
      name: "(CH₃)₃CCl + OH⁻ → (CH₃)₃COH + Cl⁻",
      reagents: ["(CH₃)₃CCl", "OH⁻"],
      data: [
        { concs: [0.05, 0.05], v: 0.0125 },
        { concs: [0.10, 0.05], v: 0.0250 },
        { concs: [0.15, 0.05], v: 0.0375 },
        { concs: [0.10, 0.10], v: 0.0250 },
        { concs: [0.10, 0.20], v: 0.0250 }
      ],
      temperatures: [
        { tempC: 25, k: 0.25 },
        { tempC: 35, k: 0.72 },
        { tempC: 45, k: 1.95 },
        { tempC: 55, k: 4.88 }
      ]
    },
    n2o5: {
      name: "2 N₂O₅ → 4 NO₂ + O₂ (1 Reagente)",
      reagents: ["N₂O₅"],
      data: [
        { concs: [0.010], v: 0.00048 },
        { concs: [0.020], v: 0.00096 },
        { concs: [0.030], v: 0.00144 },
        { concs: [0.040], v: 0.00192 }
      ],
      temperatures: [
        { tempC: 25, k: 0.048 },
        { tempC: 35, k: 0.135 },
        { tempC: 45, k: 0.498 },
        { tempC: 55, k: 1.500 }
      ]
    },
    bro3_br_h: {
      name: "BrO₃⁻ + 5 Br⁻ + 6 H⁺ → 3 Br₂ + 3 H₂O (3 Reagentes)",
      reagents: ["BrO₃⁻", "Br⁻", "H⁺"],
      data: [
        { concs: [0.10, 0.10, 0.10], v: 0.0012 },
        { concs: [0.20, 0.10, 0.10], v: 0.0024 },
        { concs: [0.10, 0.20, 0.10], v: 0.0024 },
        { concs: [0.10, 0.10, 0.20], v: 0.0048 },
        { concs: [0.20, 0.20, 0.10], v: 0.0048 },
        { concs: [0.15, 0.15, 0.15], v: 0.00608 }
      ],
      temperatures: [
        { tempC: 20, k: 0.75 },
        { tempC: 30, k: 1.20 },
        { tempC: 40, k: 1.88 },
        { tempC: 50, k: 2.85 }
      ]
    }
  };

  let currentPresetKey = "no_o2";
  let activeReagents = ["NO", "O₂"];
  let lastRegressionResults = null;
  let lastArrheniusResults = null;

  // Resolução de OLS por Eliminação de Gauss-Jordan com Pivoteamento Parcial
  function solveOLS(X, Y) {
    const n = X.length;
    const p = X[0].length;
    if (n < p) return null; // Graus de liberdade insuficientes

    const XtX = Array.from({ length: p }, () => Array(p).fill(0));
    const XtY = Array(p).fill(0);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < p; j++) {
        XtY[j] += X[i][j] * Y[i];
        for (let k = 0; k < p; k++) {
          XtX[j][k] += X[i][j] * X[i][k];
        }
      }
    }

    // Matriz aumentada [XtX | XtY]
    const M = XtX.map((row, i) => [...row, XtY[i]]);

    for (let i = 0; i < p; i++) {
      let maxRow = i;
      for (let r = i + 1; r < p; r++) {
        if (Math.abs(M[r][i]) > Math.abs(M[maxRow][i])) maxRow = r;
      }
      [M[i], M[maxRow]] = [M[maxRow], M[i]];

      const pivot = M[i][i];
      if (Math.abs(pivot) < 1e-11) return null; // Matriz singular / colinearidade

      for (let c = i; c <= p; c++) M[i][c] /= pivot;
      for (let r = 0; r < p; r++) {
        if (r !== i) {
          const factor = M[r][i];
          for (let c = i; c <= p; c++) {
            M[r][c] -= factor * M[i][c];
          }
        }
      }
    }

    return M.map(row => row[p]);
  }

  // Notação científica elegante
  function formatSci(v, decimals = 2) {
    if (!Number.isFinite(v)) return "—";
    const abs = Math.abs(v);
    if (abs === 0) return "0";
    if (abs < 0.01 || abs >= 1000) {
      const exp = Math.floor(Math.log10(abs));
      const mantissa = (v / Math.pow(10, exp)).toFixed(decimals);
      const supers = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
      const expStr = String(exp).split("").map(c => supers[c] || c).join("");
      return `${mantissa.replace(".", ",")} × 10${expStr}`;
    }
    return v.toFixed(decimals).replace(".", ",");
  }

  // Unidade dimensional de k para reação de ordem n
  function getRateConstantUnit(totalOrder) {
    const rounded = Math.round(totalOrder * 10) / 10;
    const p = 1 - rounded;
    if (Math.abs(p) < 0.05) return "s⁻¹";
    if (Math.abs(p - (-1)) < 0.05) return "L·mol⁻¹·s⁻¹";
    if (Math.abs(p - (-2)) < 0.05) return "L²·mol⁻²·s⁻¹";
    if (Math.abs(p - 1) < 0.05) return "mol·L⁻¹·s⁻¹";
    return `(mol·L⁻¹)<sup>${p.toFixed(1)}</sup>·s⁻¹`;
  }

  // Renderizar a tabela editável com base nos reagentes ativos
  function renderExperimentsTable(data) {
    const tbody = document.querySelector("#experimentsTbody");
    const thead = document.querySelector("#experimentsThead");
    if (!tbody || !thead) return;

    // Header
    let theadHtml = `<tr>
      <th style="width: 70px;">Exp.</th>`;
    activeReagents.forEach((reagent, idx) => {
      theadHtml += `<th>[${reagent}]₀ <small>(mol/L)</small></th>`;
    });
    theadHtml += `<th>Velocidade Inicial v₀ <small>(mol·L⁻¹·s⁻¹)</small></th>
      <th style="width: 50px;">Ação</th>
    </tr>`;
    thead.innerHTML = theadHtml;

    // Linhas
    tbody.innerHTML = "";
    data.forEach((row, idx) => {
      const tr = document.createElement("tr");
      let rowHtml = `<td><span class="exp-num">${idx + 1}</span></td>`;
      activeReagents.forEach((_, rIdx) => {
        const val = row.concs && row.concs[rIdx] !== undefined ? row.concs[rIdx] : 0.01;
        rowHtml += `<td><input type="number" step="any" min="0.000001" class="conc-input" data-row="${idx}" data-reagent="${rIdx}" value="${val}"></td>`;
      });
      const vVal = row.v !== undefined ? row.v : 0.001;
      rowHtml += `<td><input type="number" step="any" min="0.000000001" class="rate-input" data-row="${idx}" value="${vVal}"></td>
        <td><button class="btn btn-danger btn-sm delete-row" data-row="${idx}" title="Excluir linha">✕</button></td>`;
      tr.innerHTML = rowHtml;
      tbody.appendChild(tr);
    });
  }

  // Coleta dados digitados na tabela
  function collectTableData() {
    const tbody = document.querySelector("#experimentsTbody");
    const rows = tbody.querySelectorAll("tr");
    const data = [];
    rows.forEach(tr => {
      const concInputs = tr.querySelectorAll(".conc-input");
      const rateInput = tr.querySelector(".rate-input");
      const concs = Array.from(concInputs).map(inp => parseFloat(inp.value));
      const v = parseFloat(rateInput.value);
      if (concs.every(c => Number.isFinite(c) && c > 0) && Number.isFinite(v) && v > 0) {
        data.push({ concs, v });
      }
    });
    return data;
  }

  // Executa o Método das Velocidades Iniciais via Regressão Linear Múltipla
  function runKineticsRegression() {
    const errorEl = document.querySelector("#regressionError");
    if (errorEl) errorEl.textContent = "";

    const rawData = collectTableData();
    const p = activeReagents.length;

    if (rawData.length <= p) {
      if (errorEl) errorEl.textContent = `São necessários pelo menos ${p + 1} experimentos válidos para determinar as ordens de ${p} reagente(s).`;
      return null;
    }

    // Montar matrizes logarítmicas: y = ln(v), x_j = ln([R_j])
    const X = rawData.map(d => [1, ...d.concs.map(c => Math.log(c))]);
    const Y = rawData.map(d => Math.log(d.v));

    const beta = solveOLS(X, Y);
    if (!beta) {
      if (errorEl) errorEl.textContent = "Não foi possível inverter a matriz: certifique-se de que as concentrações variam independentemente entre os experimentos.";
      return null;
    }

    const lnK = beta[0];
    const k = Math.exp(lnK);
    const orders = beta.slice(1);
    const totalOrder = orders.reduce((sum, ord) => sum + ord, 0);

    // Calcular valores previstos e resíduos
    const meanY = Y.reduce((a, b) => a + b, 0) / Y.length;
    let ssTot = 0, ssRes = 0;
    const experiments = rawData.map((d, idx) => {
      const yObs = Y[idx];
      let yPred = lnK;
      d.concs.forEach((c, cIdx) => {
        yPred += orders[cIdx] * Math.log(c);
      });
      const vObs = d.v;
      const vPred = Math.exp(yPred);
      const resid = vObs - vPred;
      const relError = Math.abs(resid / vObs) * 100;

      ssTot += Math.pow(yObs - meanY, 2);
      ssRes += Math.pow(yObs - yPred, 2);

      return {
        id: idx + 1,
        concs: d.concs,
        v_obs: vObs,
        v_pred: vPred,
        resid,
        relError
      };
    });

    const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 1;
    const nExp = rawData.length;
    const adjR2 = nExp > p + 1 ? 1 - ((1 - r2) * (nExp - 1)) / (nExp - p - 1) : r2;
    const rmse = Math.sqrt(experiments.reduce((acc, e) => acc + Math.pow(e.resid, 2), 0) / nExp);

    const reagents = activeReagents.map((name, i) => ({
      name,
      order: orders[i],
      approxOrder: Math.round(orders[i])
    }));

    const results = {
      k,
      lnK,
      reagents,
      totalOrder,
      r2,
      adjR2,
      rmse,
      experiments
    };

    lastRegressionResults = results;
    displayResults(results);
    runArrheniusAnalysis();

    return results;
  }

  // Apresentar os resultados na tela
  function displayResults(res) {
    if (!res) return;

    // Métricas principais
    document.querySelector("#metricK").textContent = formatSci(res.k);
    document.querySelector("#metricKUnit").innerHTML = getRateConstantUnit(res.totalOrder);
    document.querySelector("#metricOrder").textContent = res.totalOrder.toFixed(2);
    document.querySelector("#metricOrderSub").textContent = `Ordem Global (aprox. ${Math.round(res.totalOrder)})`;
    document.querySelector("#metricR2").textContent = res.r2.toFixed(4);
    document.querySelector("#metricRmse").textContent = formatSci(res.rmse);

    // Cartão de Lei de Velocidade
    const equationEl = document.querySelector("#lawEquationDisplay");
    let eqStr = `v = k`;
    res.reagents.forEach(r => {
      const ordFormatted = r.order.toFixed(2).replace(".", ",");
      eqStr += ` · [${r.name}]<sup>${ordFormatted}</sup>`;
    });
    equationEl.innerHTML = eqStr;

    // Detalhes da Lei
    const detailsEl = document.querySelector("#lawDetailsDisplay");
    let detailsHtml = `
      <div class="law-item">Constante Cinética (k): <b>${formatSci(res.k)} ${getRateConstantUnit(res.totalOrder)}</b></div>
      <div class="law-item">R² Ajustado: <b>${res.adjR2.toFixed(4)}</b></div>`;
    res.reagents.forEach(r => {
      detailsHtml += `<div class="law-item">Ordem parcial de [${r.name}]: <b>${r.order.toFixed(2).replace(".", ",")}</b> (≈ ${r.approxOrder})</div>`;
    });
    detailsEl.innerHTML = detailsHtml;

    // Tabela de Resíduos
    const resTbody = document.querySelector("#residualsTbody");
    if (resTbody) {
      resTbody.innerHTML = "";
      res.experiments.forEach(e => {
        const tr = document.createElement("tr");
        let concsStr = e.concs.map((c, i) => `[${res.reagents[i].name}]=${c}`).join(", ");
        tr.innerHTML = `
          <td><span class="exp-num">${e.id}</span></td>
          <td>${concsStr}</td>
          <td><b>${formatSci(e.v_obs, 3)}</b></td>
          <td>${formatSci(e.v_pred, 3)}</td>
          <td style="color: ${e.resid >= 0 ? 'var(--cyan)' : 'var(--orange)'};">${formatSci(e.resid, 3)}</td>
          <td>${e.relError.toFixed(2).replace(".", ",")}%</td>
        `;
        resTbody.appendChild(tr);
      });
    }
  }

  // Análise de Arrhenius
  function runArrheniusAnalysis() {
    const preset = PRESETS[currentPresetKey];
    if (!preset || !preset.temperatures || preset.temperatures.length < 2) return;

    const temps = preset.temperatures;
    // Linearização: ln(k) = ln(A) - (Ea/R) * (1/T)
    const points = temps.map(t => {
      const kelvin = t.tempC + 273.15;
      return {
        tempC: t.tempC,
        kelvin,
        invT: 1 / kelvin,
        k: t.k,
        lnK: Math.log(t.k)
      };
    });

    const n = points.length;
    const meanX = points.reduce((acc, p) => acc + p.invT, 0) / n;
    const meanY = points.reduce((acc, p) => acc + p.lnK, 0) / n;

    let num = 0, den = 0;
    points.forEach(p => {
      num += (p.invT - meanX) * (p.lnK - meanY);
      den += Math.pow(p.invT - meanX, 2);
    });

    const slope = num / den; // -Ea / R
    const intercept = meanY - slope * meanX; // ln(A0)
    const ea = (-slope * R_CONST) / 1000; // kJ/mol
    const a0 = Math.exp(intercept);

    let ssTot = 0, ssRes = 0;
    points.forEach(p => {
      const predY = intercept + slope * p.invT;
      ssTot += Math.pow(p.lnK - meanY, 2);
      ssRes += Math.pow(p.lnK - predY, 2);
    });
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 1;

    lastArrheniusResults = {
      points,
      ea,
      a0,
      r2,
      fit: (invT) => intercept + slope * invT
    };

    // Preencher valores na UI
    const eaEl = document.querySelector("#arrheniusEa");
    const a0El = document.querySelector("#arrheniusA0");
    const r2El = document.querySelector("#arrheniusR2");
    if (eaEl) eaEl.textContent = `${ea.toFixed(2)} kJ/mol`;
    if (a0El) a0El.textContent = formatSci(a0);
    if (r2El) r2El.textContent = r2.toFixed(4);

    if (window.KineticsCharts) {
      window.KineticsCharts.renderAll(lastRegressionResults, lastArrheniusResults);
    }
  }

  // Carregar um Preset
  function loadPreset(key) {
    const preset = PRESETS[key];
    if (!preset) return;
    currentPresetKey = key;
    activeReagents = [...preset.reagents];

    // Atualizar seletor de quantidade de reagentes
    const select = document.querySelector("#reagentsCountSelect");
    if (select) select.value = String(activeReagents.length);

    // Atualizar pílulas
    document.querySelectorAll(".preset-pill").forEach(pill => {
      pill.classList.toggle("active", pill.dataset.preset === key);
    });

    renderExperimentsTable(preset.data);
    runKineticsRegression();
  }

  // Configuração de Event Listeners
  function setupEvents() {
    // Pílulas de presets
    document.querySelectorAll(".preset-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        loadPreset(pill.dataset.preset);
      });
    });

    // Seletor de número de reagentes
    const reagentSelect = document.querySelector("#reagentsCountSelect");
    if (reagentSelect) {
      reagentSelect.addEventListener("change", (e) => {
        const count = parseInt(e.target.value, 10);
        if (count === 1) activeReagents = ["A"];
        else if (count === 2) activeReagents = ["A", "B"];
        else if (count === 3) activeReagents = ["A", "B", "C"];

        // Gerar linhas padrão
        const sampleData = Array.from({ length: count + 2 }, (_, i) => ({
          concs: Array(count).fill(0.01 * (i + 1)),
          v: 0.001 * Math.pow(i + 1, count)
        }));
        renderExperimentsTable(sampleData);
        runKineticsRegression();
      });
    }

    // Botão Adicionar Experimento
    const addBtn = document.querySelector("#addExpBtn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        const data = collectTableData();
        data.push({
          concs: Array(activeReagents.length).fill(0.02),
          v: 0.005
        });
        renderExperimentsTable(data);
        runKineticsRegression();
      });
    }

    // Botão Executar Regressão
    const calcBtn = document.querySelector("#runRegressionBtn");
    if (calcBtn) {
      calcBtn.addEventListener("click", () => {
        runKineticsRegression();
      });
    }

    // Delegação para exclusão de linhas e inputs
    const tbody = document.querySelector("#experimentsTbody");
    if (tbody) {
      tbody.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-row")) {
          const rowIdx = parseInt(e.target.dataset.row, 10);
          const data = collectTableData();
          if (data.length <= activeReagents.length + 1) {
            alert(`Não é possível excluir. São necessários pelo menos ${activeReagents.length + 1} experimentos para calcular as ordens.`);
            return;
          }
          data.splice(rowIdx, 1);
          renderExperimentsTable(data);
          runKineticsRegression();
        }
      });

      tbody.addEventListener("input", () => {
        runKineticsRegression();
      });
    }

    // Navegação Sidebar
    document.querySelectorAll(".navitem").forEach(button => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".navitem").forEach(b => b.classList.remove("active"));
        button.classList.add("active");
        const target = document.querySelector(`#${button.dataset.target}`);
        if (target) target.scrollIntoView({ behavior: "smooth" });
      });
    });

    // Resize
    window.addEventListener("resize", () => {
      if (window.KineticsCharts && lastRegressionResults) {
        window.KineticsCharts.renderAll(lastRegressionResults, lastArrheniusResults);
      }
    });
  }

  // Inicialização
  document.addEventListener("DOMContentLoaded", () => {
    setupEvents();
    loadPreset("no_o2");
  });
})();
