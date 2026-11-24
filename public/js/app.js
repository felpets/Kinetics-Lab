/**
 * Kinetics Lab - Controlador Principal da Aplicação
 * Integra o motor numérico KineticsEngine, o motor gráfico KineticsCharts,
 * gerenciamento de múltiplos experimentos, memória de cálculo e exportações.
 * 
 * DIRETRIZ: Zero uso ou menção à equação de Arrhenius.
 */

(() => {
  // Biblioteca de Experimentos Pré-carregados
  const PRESET_EXPERIMENTS = {
    acceptance: {
      name: "Exemplo Padrão (Critérios de Aceitação)",
      reactionEquation: "A → P",
      productName: "P",
      nu: 1,
      coefA: 1,
      initialA: 0.80,
      concUnit: "mol/L",
      timeUnit: "s",
      temperatureDesc: "25 °C (ambiente)",
      points: [
        { t: 0, conc: 0.000 },
        { t: 10, conc: 0.120 },
        { t: 20, conc: 0.210 },
        { t: 30, conc: 0.290 },
        { t: 40, conc: 0.350 },
        { t: 50, conc: 0.400 }
      ]
    },
    peroxide: {
      name: "Decomposição de H₂O₂ (ν = 1 para O₂)",
      reactionEquation: "2 H₂O₂ → 2 H₂O + O₂",
      productName: "O₂",
      nu: 1,
      coefA: 2,
      initialA: 1.00,
      concUnit: "mol/L",
      timeUnit: "s",
      temperatureDesc: "30 °C",
      points: [
        { t: 0, conc: 0.000 },
        { t: 5, conc: 0.115 },
        { t: 10, conc: 0.200 },
        { t: 15, conc: 0.265 },
        { t: 20, conc: 0.315 },
        { t: 25, conc: 0.355 },
        { t: 30, conc: 0.385 }
      ]
    },
    ester: {
      name: "Hidrólise Alcalina de Éster (Segunda Ordem)",
      reactionEquation: "CH₃COOC₂H₅ + OH⁻ → CH₃COO⁻ + C₂H₅OH",
      productName: "C₂H₅OH",
      nu: 1,
      coefA: 1,
      initialA: 0.50,
      concUnit: "mol/L",
      timeUnit: "s",
      temperatureDesc: "20 °C (banho termostático)",
      points: [
        { t: 0, conc: 0.000 },
        { t: 15, conc: 0.138 },
        { t: 30, conc: 0.228 },
        { t: 60, conc: 0.330 },
        { t: 120, conc: 0.408 },
        { t: 180, conc: 0.442 }
      ]
    },
    nonuniform: {
      name: "Cinética com Intervalos Irregulares",
      reactionEquation: "A → 2 P",
      productName: "P",
      nu: 2,
      coefA: 1,
      initialA: 0.60,
      concUnit: "mol/L",
      timeUnit: "s",
      temperatureDesc: "Temperatura ambiente não controlada",
      points: [
        { t: 0, conc: 0.000 },
        { t: 8, conc: 0.160 },
        { t: 22, conc: 0.380 },
        { t: 45, conc: 0.640 },
        { t: 90, conc: 0.880 },
        { t: 150, conc: 0.980 }
      ]
    }
  };

  // Estado da Aplicação
  const state = {
    currentConfig: {
      name: PRESET_EXPERIMENTS.acceptance.name,
      reactionEquation: PRESET_EXPERIMENTS.acceptance.reactionEquation,
      productName: PRESET_EXPERIMENTS.acceptance.productName,
      nu: PRESET_EXPERIMENTS.acceptance.nu,
      coefA: PRESET_EXPERIMENTS.acceptance.coefA,
      initialA: PRESET_EXPERIMENTS.acceptance.initialA,
      concUnit: PRESET_EXPERIMENTS.acceptance.concUnit,
      timeUnit: PRESET_EXPERIMENTS.acceptance.timeUnit,
      temperatureDesc: PRESET_EXPERIMENTS.acceptance.temperatureDesc,
      useSmoothing: false
    },
    rawPoints: [...PRESET_EXPERIMENTS.acceptance.points],
    analysis: null,
    selectedTangentTime: 20,
    activeLinearModel: "order1",
    // Lista de múltiplos experimentos para comparação
    savedExperiments: []
  };

  // Notação formatada com controle de algarismos
  function formatVal(v, dec = 4) {
    if (!Number.isFinite(v)) return "—";
    const abs = Math.abs(v);
    if (abs === 0) return "0";
    if (abs < 0.001 || abs >= 10000) {
      return v.toExponential(3).replace("e", " × 10^");
    }
    return v.toFixed(dec);
  }

  // Renderiza a tabela editável de pontos experimentais
  function renderInputTable() {
    const tbody = document.querySelector("#dataTableTbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    state.rawPoints.forEach((pt, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span class="exp-badge">${idx + 1}</span></td>
        <td><input type="number" step="any" min="0" class="time-inp" data-idx="${idx}" value="${pt.t}"></td>
        <td><input type="number" step="any" class="conc-inp" data-idx="${idx}" value="${pt.conc}"></td>
        <td><button class="btn btn-danger btn-sm del-row" data-idx="${idx}" title="Excluir este ponto">✕</button></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Coleta os pontos digitados na tabela
  function collectInputPoints() {
    const rows = document.querySelectorAll("#dataTableTbody tr");
    const points = [];
    rows.forEach(tr => {
      const tInp = tr.querySelector(".time-inp");
      const cInp = tr.querySelector(".conc-inp");
      if (tInp && cInp) {
        const t = parseFloat(tInp.value);
        const conc = parseFloat(cInp.value);
        if (Number.isFinite(t) && Number.isFinite(conc)) {
          points.push({ t, conc });
        }
      }
    });
    return points;
  }

  // Lê campos de configuração da interface
  function updateConfigFromUI() {
    state.currentConfig.name = document.querySelector("#expNameInp")?.value || "Experimento Cinético";
    state.currentConfig.reactionEquation = document.querySelector("#reactionEqInp")?.value || "A → P";
    state.currentConfig.productName = document.querySelector("#productNameInp")?.value || "P";
    state.currentConfig.nu = parseFloat(document.querySelector("#nuInp")?.value) || 1;
    state.currentConfig.coefA = parseFloat(document.querySelector("#coefAInp")?.value) || 1;
    const a0Val = document.querySelector("#initialAInp")?.value;
    state.currentConfig.initialA = a0Val !== "" && a0Val !== undefined ? parseFloat(a0Val) : null;
    state.currentConfig.concUnit = document.querySelector("#concUnitInp")?.value || "mol/L";
    state.currentConfig.timeUnit = document.querySelector("#timeUnitInp")?.value || "s";
    state.currentConfig.temperatureDesc = document.querySelector("#tempDescInp")?.value || "";
    state.currentConfig.useSmoothing = Boolean(document.querySelector("#smoothingToggle")?.checked);
  }

  // Sincroniza campos de configuração para a UI
  function populateConfigToUI() {
    const cfg = state.currentConfig;
    if (document.querySelector("#expNameInp")) document.querySelector("#expNameInp").value = cfg.name;
    if (document.querySelector("#reactionEqInp")) document.querySelector("#reactionEqInp").value = cfg.reactionEquation;
    if (document.querySelector("#productNameInp")) document.querySelector("#productNameInp").value = cfg.productName;
    if (document.querySelector("#nuInp")) document.querySelector("#nuInp").value = cfg.nu;
    if (document.querySelector("#coefAInp")) document.querySelector("#coefAInp").value = cfg.coefA || 1;
    if (document.querySelector("#initialAInp")) document.querySelector("#initialAInp").value = cfg.initialA !== null && cfg.initialA !== undefined ? cfg.initialA : "";
    if (document.querySelector("#concUnitInp")) document.querySelector("#concUnitInp").value = cfg.concUnit;
    if (document.querySelector("#timeUnitInp")) document.querySelector("#timeUnitInp").value = cfg.timeUnit;
    if (document.querySelector("#tempDescInp")) document.querySelector("#tempDescInp").value = cfg.temperatureDesc || "";
    if (document.querySelector("#smoothingToggle")) document.querySelector("#smoothingToggle").checked = cfg.useSmoothing;
  }

  // Executa o processamento cinético completo
  function runCalculation() {
    updateConfigFromUI();
    const collected = collectInputPoints();
    if (collected.length > 0) {
      state.rawPoints = collected;
    }

    const result = KineticsEngine.analyzeExperiment(state.rawPoints, state.currentConfig);
    state.analysis = result;

    const errorEl = document.querySelector("#validationAlertBox");
    if (!result.success) {
      if (errorEl) {
        errorEl.style.display = "block";
        errorEl.innerHTML = `<strong>Atenção:</strong><br>${result.errors.join("<br>")}`;
      }
      return;
    }

    if (errorEl) {
      if (result.warnings && result.warnings.length > 0) {
        errorEl.style.display = "block";
        errorEl.innerHTML = `<strong>Aviso científico:</strong><br>${result.warnings.join("<br>")}`;
      } else {
        errorEl.style.display = "none";
      }
    }

    // 1. Atualizar Indicadores Principais (Dashboard da Seção 5)
    updateDashboardMetrics(result);

    // 2. Atualizar Tabelas de Velocidades Médias e Instantâneas
    renderRatesTables(result);

    // 3. Atualizar Tangente Interativa e Slider
    updateTangentSliderRange(result);
    renderInteractiveTangent();

    // 4. Atualizar Modelagem Cinética Integrada
    renderKineticsModeling(result);

    // 5. Atualizar Memória de Cálculo
    renderCalculationMemory(result);

    // 6. Atualizar Gráficos Principais
    renderAllCharts(result);

    // 7. Atualizar Tabela Comparativa de Múltiplos Experimentos
    renderComparisonSection();
  }

  // Dashboard de Indicadores Principais (Seção 5)
  function updateDashboardMetrics(res) {
    const s = res.stats;
    const timeUnit = state.currentConfig.timeUnit;
    const concUnit = state.currentConfig.concUnit;
    const rateUnit = `${concUnit}·${timeUnit}⁻¹`;

    document.querySelector("#metricVInitial").textContent = formatVal(s.vInitial, 5);
    document.querySelector("#metricVInitialUnit").textContent = rateUnit;

    document.querySelector("#metricVGlobal").textContent = formatVal(s.vGlobal, 5);
    document.querySelector("#metricVGlobalUnit").textContent = rateUnit;

    document.querySelector("#metricVMax").textContent = formatVal(s.vMax, 5);
    document.querySelector("#metricVMaxUnit").textContent = rateUnit;

    document.querySelector("#metricVMin").textContent = formatVal(s.vMin, 5);
    document.querySelector("#metricVMinUnit").textContent = rateUnit;

    document.querySelector("#metricDeltaP").textContent = `${formatVal(s.totalDeltaP, 4)} ${concUnit}`;
    document.querySelector("#metricTotalTime").textContent = `${s.totalTime} ${timeUnit}`;
    document.querySelector("#metricPointCount").textContent = `${s.pointCount} pontos`;

    // Ordem e Constante Cinética (quando disponível)
    const kFit = res.kineticsFit;
    if (kFit && kFit.available && kFit.bestModel) {
      document.querySelector("#metricEstimatedOrder").textContent = kFit.bestModel.name;
      document.querySelector("#metricEstimatedK").textContent = `${formatVal(kFit.bestModel.k, 4)} ${kFit.bestModel.unit}`;
      document.querySelector("#metricEstimatedR2").textContent = `R² = ${kFit.bestModel.r2.toFixed(4)}`;
    } else {
      document.querySelector("#metricEstimatedOrder").textContent = "Requer [A]₀";
      document.querySelector("#metricEstimatedK").textContent = "Não aplicável";
      document.querySelector("#metricEstimatedR2").textContent = "Adicione [A]₀ na conf.";
    }
  }

  // Tabelas de Velocidades da Seção 2
  function renderRatesTables(res) {
    // Tabela 1: Velocidades Médias por Intervalo
    const avgTbody = document.querySelector("#averageRatesTbody");
    if (avgTbody) {
      avgTbody.innerHTML = "";
      res.average.intervals.forEach(iv => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${iv.index}</strong></td>
          <td>${iv.t1} a ${iv.t2}</td>
          <td>${iv.dt.toFixed(1)}</td>
          <td>${iv.p1.toFixed(4)} → ${iv.p2.toFixed(4)}</td>
          <td>${iv.dP >= 0 ? '+' : ''}${iv.dP.toFixed(4)}</td>
          <td><b>${formatVal(iv.vProduct, 5)}</b></td>
          <td style="color: var(--cyan); font-weight: 700;">${formatVal(iv.vReaction, 5)}</td>
        `;
        avgTbody.appendChild(tr);
      });
    }

    // Tabela 2: Velocidades Instantâneas por Diferenciação Numérica
    const instTbody = document.querySelector("#instantaneousRatesTbody");
    if (instTbody) {
      instTbody.innerHTML = "";
      res.instantaneous.forEach((r, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><span class="exp-badge">${idx + 1}</span></td>
          <td>${r.t}</td>
          <td>${r.conc.toFixed(4)}</td>
          <td><b>${formatVal(r.vProduct, 5)}</b></td>
          <td style="color: var(--green); font-weight: 700;">${formatVal(r.vReaction, 5)}</td>
          <td><small style="color: var(--muted);">${r.method}</small></td>
        `;
        instTbody.appendChild(tr);
      });
    }
  }

  // Configura os limites do slider da tangente interativa
  function updateTangentSliderRange(res) {
    const slider = document.querySelector("#tangentTimeSlider");
    if (!slider || !res.activePoints || res.activePoints.length === 0) return;

    const tMin = res.activePoints[0].t;
    const tMax = res.activePoints[res.activePoints.length - 1].t;

    slider.min = tMin;
    slider.max = tMax;
    slider.step = ((tMax - tMin) / 100).toFixed(2);

    if (state.selectedTangentTime < tMin || state.selectedTangentTime > tMax) {
      state.selectedTangentTime = (tMin + tMax) / 2;
    }
    slider.value = state.selectedTangentTime;
  }

  // Renderiza a Tangente Interativa e atualiza os valores do painel (Widget do Usuário!)
  function renderInteractiveTangent() {
    const canvas = document.querySelector("#tangentCanvas");
    if (!canvas || !state.analysis) return;

    const tangentData = KineticsCharts.drawInteractiveTangent(
      canvas,
      state.analysis,
      state.selectedTangentTime,
      state.currentConfig
    );

    if (!tangentData) return;

    const timeUnit = state.currentConfig.timeUnit;
    const concUnit = state.currentConfig.concUnit;
    const rateUnit = `${concUnit}·${timeUnit}⁻¹`;

    // Atualiza valores textuais do widget
    const selTimeEl = document.querySelector("#tangentSelectedTimeDisplay");
    if (selTimeEl) selTimeEl.textContent = `${tangentData.t.toFixed(1)} ${timeUnit}`;

    const concEl = document.querySelector("#tangentConcDisplay");
    if (concEl) concEl.textContent = formatVal(tangentData.conc, 4);

    const vInstEl = document.querySelector("#tangentVInstDisplay");
    if (vInstEl) vInstEl.textContent = formatVal(tangentData.vReaction, 5);

    const slopeEl = document.querySelector("#tangentSlopeDisplay");
    if (slopeEl) slopeEl.textContent = formatVal(tangentData.dPdt, 5);

    const formulaEl = document.querySelector("#tangentFormulaDisplay");
    if (formulaEl) {
      if (tangentData.nu === 1) {
        formulaEl.innerHTML = `<strong>v(t) = \\frac{d[${state.currentConfig.productName}]}{dt} = ${formatVal(tangentData.vReaction, 5)} ${rateUnit}</strong><p>Coeficiente estequiométrico unitário (ν = 1). A inclinação da reta tangente equivale diretamente à velocidade de reação.</p>`;
      } else {
        formulaEl.innerHTML = `<strong>v(t) = \\frac{1}{${tangentData.nu}} \\cdot \\frac{d[${state.currentConfig.productName}]}{dt} = \\frac{1}{${tangentData.nu}} \\times ${formatVal(tangentData.dPdt, 5)} = ${formatVal(tangentData.vReaction, 5)} ${rateUnit}</strong><p>Velocidade corrigida pela estequiometria (ν = ${tangentData.nu}). A taxa de formação do produto é ${formatVal(tangentData.dPdt, 5)} ${rateUnit}.</p>`;
      }
    }
  }

  // Renderiza a seção de Modelagem Cinética Integrada (Ordem 0, 1 e 2)
  function renderKineticsModeling(res) {
    const kFit = res.kineticsFit;
    const wrap = document.querySelector("#kineticsModelingSectionWrap");
    const noA0Msg = document.querySelector("#kineticsNoA0Notice");

    if (!kFit || !kFit.available) {
      if (wrap) wrap.style.display = "none";
      if (noA0Msg) {
        noA0Msg.style.display = "block";
        noA0Msg.innerHTML = `<div class="panel" style="padding: 20px; border-left: 3px solid var(--orange);">
          <strong>Informações estequiométricas adicionais necessárias:</strong><br>
          Para testar os modelos integrados de velocidade (ordem zero, primeira ordem e segunda ordem), é preciso conhecer a 
          <strong>concentração inicial do reagente [A]₀</strong>. Defina esse valor na aba <em>02 — Análise Experimental</em> para habilitar este módulo.
        </div>`;
      }
      return;
    }

    if (noA0Msg) noA0Msg.style.display = "none";
    if (wrap) wrap.style.display = "block";

    const { order0, order1, order2 } = kFit.models;
    const best = kFit.bestModel;

    // Atualizar Cartões dos 3 Modelos
    updateModelCard("#cardOrder0", order0, best === order0);
    updateModelCard("#cardOrder1", order1, best === order1);
    updateModelCard("#cardOrder2", order2, best === order2);

    // Desenhar gráfico do modelo atualmente selecionado
    const canvas = document.querySelector("#linearizationCanvas");
    if (canvas) {
      KineticsCharts.drawKineticsLinearization(canvas, kFit, state.activeLinearModel, state.currentConfig);
    }
  }

  function updateModelCard(selector, model, isBest) {
    const card = document.querySelector(selector);
    if (!card || !model) return;

    card.classList.toggle("best-model", isBest);
    card.querySelector(".model-badge-best").style.display = isBest ? "block" : "none";
    card.querySelector(".stat-r2").textContent = model.r2.toFixed(4);
    card.querySelector(".stat-k").textContent = `${formatVal(model.k, 4)} ${model.unit}`;
    card.querySelector(".stat-rmse").textContent = formatVal(model.rmseOriginal, 4);
    card.querySelector(".stat-slope").textContent = formatVal(model.slope, 4);
    card.querySelector(".stat-intercept").textContent = formatVal(model.intercept, 4);
  }

  // Renderiza a Memória de Cálculo Passo a Passo (Seção 6)
  function renderCalculationMemory(res) {
    const container = document.querySelector("#calcMemoryContainer");
    if (!container || !res.average || !res.average.intervals) return;

    const timeUnit = state.currentConfig.timeUnit;
    const concUnit = state.currentConfig.concUnit;
    const rateUnit = `${concUnit}·${timeUnit}⁻¹`;
    const nu = res.nu;

    let html = `<div class="theory-formula-box" style="margin-bottom: 16px;">
      <strong>Fórmula Geral Aplicada:</strong> v_{\\text{méd}} = \\frac{1}{\\nu} \\times \\frac{\\Delta [P]}{\\Delta t} = \\frac{1}{\\nu} \\times \\frac{[P]_{i+1} - [P]_i}{t_{i+1} - t_i}
    </div>`;

    res.average.intervals.forEach(iv => {
      html += `
        <div class="calc-step-card">
          <div class="calc-step-header">
            <span>Intervalo #${iv.index}: t ∈ [${iv.t1}, ${iv.t2}] ${timeUnit}</span>
            <span style="color: var(--text-dim);">Δt = ${iv.dt.toFixed(2)} ${timeUnit}</span>
          </div>
          <div style="color: var(--text-dim); margin-bottom: 4px;">
            Concentração inicial [P]₁ = ${iv.p1.toFixed(4)} ${concUnit} | Concentração final [P]₂ = ${iv.p2.toFixed(4)} ${concUnit} | Δ[P] = ${iv.dP >= 0 ? '+' : ''}${iv.dP.toFixed(4)} ${concUnit}
          </div>
          <div class="calc-step-formula">
            ${iv.calcMemory.substitution}
          </div>
          <div style="margin-top: 6px; font-weight: 600; color: var(--cyan);">
            Resultado: v_{\\text{méd}} = ${iv.calcMemory.result} ${rateUnit} (taxa de formação de P = ${iv.vProduct.toFixed(6)} ${rateUnit})
          </div>
        </div>
      `;
    });

    // Passo global
    html += `
      <div class="calc-step-card" style="border-color: var(--cyan); background: rgba(33, 212, 232, 0.05); margin-top: 14px;">
        <div class="calc-step-header">
          <span style="color: #fff;">Velocidade Média Global de Toda a Reação</span>
          <span>Δt_{\\text{total}} = ${res.average.dtGlobal} ${timeUnit}</span>
        </div>
        <div class="calc-step-formula">
          v_{\\text{global}} = (1 / ${nu}) × (${res.rawPoints[res.rawPoints.length - 1].conc.toFixed(4)} − ${res.rawPoints[0].conc.toFixed(4)}) / (${res.average.dtGlobal}) = ${formatVal(res.average.vGlobal, 6)} ${rateUnit}
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // Renderiza todos os gráficos da aplicação
  function renderAllCharts(res) {
    const cfg = state.currentConfig;

    const pVsT = document.querySelector("#productVsTimeCanvas");
    if (pVsT) KineticsCharts.drawProductVsTime(pVsT, res, cfg);

    const avgVsT = document.querySelector("#averageRateVsTimeCanvas");
    if (avgVsT) KineticsCharts.drawAverageRateVsTime(avgVsT, res, cfg);

    const instVsT = document.querySelector("#instantaneousVsTimeCanvas");
    if (instVsT) KineticsCharts.drawInstantaneousVsTime(instVsT, res, cfg);

    const rateVsP = document.querySelector("#rateVsProductCanvas");
    if (rateVsP) KineticsCharts.drawRateVsProduct(rateVsP, res, cfg);

    const rpVsT = document.querySelector("#reactantsAndProductsCanvas");
    if (rpVsT) KineticsCharts.drawReactantsAndProducts(rpVsT, res, cfg);
  }

  // Renderiza a Seção de Comparação Multi-Experimental (Seção 4)
  function renderComparisonSection() {
    const tbody = document.querySelector("#comparisonTbody");
    const canvas = document.querySelector("#comparisonChartCanvas");

    if (state.savedExperiments.length === 0) {
      // Se a lista estiver vazia, adiciona o experimento atual por padrão
      saveCurrentExperiment("Experimento 1 (Base)");
      return;
    }

    if (tbody) {
      tbody.innerHTML = "";
      state.savedExperiments.forEach((exp, idx) => {
        const tr = document.createElement("tr");
        const s = exp.analysis ? exp.analysis.stats : {};
        const kFit = exp.analysis ? exp.analysis.kineticsFit : null;
        tr.innerHTML = `
          <td><strong>${exp.name}</strong></td>
          <td>${exp.temperatureDesc || "Ambiente"}</td>
          <td>${formatVal(s.vInitial, 4)}</td>
          <td>${formatVal(s.vGlobal, 4)}</td>
          <td>${formatVal(s.vMax, 4)}</td>
          <td>${s.totalTime || "—"} s</td>
          <td>${kFit && kFit.bestModel ? kFit.bestModel.name : "—"}</td>
          <td>${kFit && kFit.bestModel ? formatVal(kFit.bestModel.k, 3) : "—"}</td>
          <td><button class="btn btn-danger btn-sm del-saved-exp" data-idx="${idx}" title="Remover da comparação">✕</button></td>
        `;
        tbody.appendChild(tr);
      });
    }

    if (canvas) {
      KineticsCharts.drawExperimentComparison(canvas, state.savedExperiments, state.currentConfig);
    }
  }

  // Salva o experimento atual para a lista de comparação
  function saveCurrentExperiment(customName) {
    if (!state.analysis) return;
    const name = customName || prompt("Nome do experimento para comparação:", state.currentConfig.name) || state.currentConfig.name;
    const copy = {
      name,
      temperatureDesc: state.currentConfig.temperatureDesc,
      config: { ...state.currentConfig },
      points: [...state.rawPoints],
      analysis: KineticsEngine.analyzeExperiment(state.rawPoints, state.currentConfig)
    };
    state.savedExperiments.push(copy);
    renderComparisonSection();
  }

  // Carrega um preset pré-definido
  function loadPreset(key) {
    const preset = PRESET_EXPERIMENTS[key];
    if (!preset) return;

    state.currentConfig.name = preset.name;
    state.currentConfig.reactionEquation = preset.reactionEquation;
    state.currentConfig.productName = preset.productName;
    state.currentConfig.nu = preset.nu;
    state.currentConfig.coefA = preset.coefA;
    state.currentConfig.initialA = preset.initialA;
    state.currentConfig.concUnit = preset.concUnit;
    state.currentConfig.timeUnit = preset.timeUnit;
    state.currentConfig.temperatureDesc = preset.temperatureDesc;
    state.rawPoints = preset.points.map(p => ({ ...p }));

    populateConfigToUI();
    renderInputTable();
    runCalculation();

    // Atualizar pílula ativa
    document.querySelectorAll(".preset-pill").forEach(pill => {
      pill.classList.toggle("active", pill.dataset.preset === key);
    });
  }

  // Importação e Exportação de CSV
  function exportDataCSV() {
    let csv = "Tempo,Concentracao_Produto\n";
    state.rawPoints.forEach(p => {
      csv += `${p.t},${p.conc}\n`;
    });
    downloadFile(csv, "dados-experimentais.csv", "text/csv");
  }

  function exportRatesCSV() {
    if (!state.analysis) return;
    let csv = "Intervalo,Tempo_Inicial,Tempo_Final,Tempo_Medio,Concentracao_Inicial,Concentracao_Final,Delta_P,Velocidade_Formacao,Velocidade_Reacao\n";
    state.analysis.average.intervals.forEach(iv => {
      csv += `${iv.index},${iv.t1},${iv.t2},${iv.tMid},${iv.p1},${iv.p2},${iv.dP},${iv.vProduct},${iv.vReaction}\n`;
    });
    downloadFile(csv, "velocidades-calculadas.csv", "text/csv");
  }

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importCSVText(text) {
    const lines = text.trim().split(/\r?\n/);
    const parsed = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      // Suporta separador por vírgula, ponto-e-vírgula ou tabulação
      const parts = line.split(/[,;\t]/).map(s => s.trim().replace(",", "."));
      if (parts.length >= 2) {
        const t = parseFloat(parts[0]);
        const c = parseFloat(parts[1]);
        if (Number.isFinite(t) && Number.isFinite(c)) {
          parsed.push({ t, conc: c });
        }
      }
    }
    if (parsed.length >= 2) {
      state.rawPoints = parsed;
      renderInputTable();
      runCalculation();
    } else {
      alert("Não foi possível importar os dados. O arquivo deve conter linhas com Tempo e Concentração.");
    }
  }

  // Configuração dos Eventos da Interface
  function setupEventListeners() {
    // Presets
    document.querySelectorAll(".preset-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        loadPreset(btn.dataset.preset);
      });
    });

    // Botões da tabela de dados
    document.querySelector("#addRowBtn")?.addEventListener("click", () => {
      const last = state.rawPoints[state.rawPoints.length - 1];
      const newT = last ? last.t + 10 : 10;
      const newC = last ? Number((last.conc + 0.05).toFixed(4)) : 0.05;
      state.rawPoints.push({ t: newT, conc: newC });
      renderInputTable();
      runCalculation();
    });

    document.querySelector("#clearDataBtn")?.addEventListener("click", () => {
      if (confirm("Deseja realmente limpar todos os pontos da tabela?")) {
        state.rawPoints = [
          { t: 0, conc: 0 },
          { t: 10, conc: 0.1 }
        ];
        renderInputTable();
        runCalculation();
      }
    });

    // Edição direta nos inputs da tabela
    const tbody = document.querySelector("#dataTableTbody");
    if (tbody) {
      tbody.addEventListener("input", () => {
        runCalculation();
      });

      tbody.addEventListener("click", (e) => {
        if (e.target.classList.contains("del-row")) {
          const idx = parseInt(e.target.dataset.idx, 10);
          if (state.rawPoints.length <= 2) {
            alert("São necessários pelo menos 2 pontos experimentais.");
            return;
          }
          state.rawPoints.splice(idx, 1);
          renderInputTable();
          runCalculation();
        }
      });
    }

    // Slider da reta tangente interativa
    const tangentSlider = document.querySelector("#tangentTimeSlider");
    if (tangentSlider) {
      tangentSlider.addEventListener("input", (e) => {
        state.selectedTangentTime = parseFloat(e.target.value);
        renderInteractiveTangent();
      });
    }

    // Botões de alternância de modelo cinético (Ordem 0, 1 e 2)
    document.querySelectorAll(".btn-order-select").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".btn-order-select").forEach(b => b.classList.remove("btn-primary"));
        btn.classList.add("btn-primary");
        state.activeLinearModel = btn.dataset.order;
        if (state.analysis && state.analysis.kineticsFit) {
          const canvas = document.querySelector("#linearizationCanvas");
          if (canvas) {
            KineticsCharts.drawKineticsLinearization(canvas, state.analysis.kineticsFit, state.activeLinearModel, state.currentConfig);
          }
        }
      });
    });

    // Inputs de configuração geral
    document.querySelectorAll(".config-group input, .config-group select").forEach(inp => {
      inp.addEventListener("change", () => {
        runCalculation();
      });
    });

    // Botão Adicionar Experimento para Comparação
    document.querySelector("#addExpComparisonBtn")?.addEventListener("click", () => {
      saveCurrentExperiment();
    });

    // Delegação para exclusão de experimento salvo
    document.querySelector("#comparisonTbody")?.addEventListener("click", (e) => {
      if (e.target.classList.contains("del-saved-exp")) {
        const idx = parseInt(e.target.dataset.idx, 10);
        state.savedExperiments.splice(idx, 1);
        renderComparisonSection();
      }
    });

    // Colar dados de planilha
    const pasteToggleBtn = document.querySelector("#togglePasteBoxBtn");
    const pasteBox = document.querySelector("#pasteBoxWrap");
    const applyPasteBtn = document.querySelector("#applyPasteBtn");
    if (pasteToggleBtn && pasteBox && applyPasteBtn) {
      pasteToggleBtn.addEventListener("click", () => {
        const isHidden = pasteBox.style.display === "none" || !pasteBox.style.display;
        pasteBox.style.display = isHidden ? "block" : "none";
      });
      applyPasteBtn.addEventListener("click", () => {
        const txt = document.querySelector("#pasteTextarea")?.value;
        if (txt) {
          importCSVText(txt);
          pasteBox.style.display = "none";
        }
      });
    }

    // Importar arquivo CSV
    const csvFileInput = document.querySelector("#csvFileInput");
    if (csvFileInput) {
      csvFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => importCSVText(evt.target.result);
          reader.readAsText(file);
        }
      });
    }

    // Exportações
    document.querySelector("#exportDataCsvBtn")?.addEventListener("click", exportDataCSV);
    document.querySelector("#exportRatesCsvBtn")?.addEventListener("click", exportRatesCSV);
    document.querySelector("#printReportBtn")?.addEventListener("click", () => window.print());

    // Exportações de PNG para cada Canvas
    document.querySelectorAll(".export-png-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.target;
        const canvas = document.querySelector(`#${targetId}`);
        if (canvas) {
          KineticsCharts.exportAsPNG(canvas, `${targetId}.png`);
        }
      });
    });

    // Navegação Sidebar
    document.querySelectorAll(".navitem").forEach(button => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".navitem").forEach(b => b.classList.remove("active"));
        button.classList.add("active");
        const target = document.querySelector(`#${button.dataset.target}`);
        if (target) target.scrollIntoView({ behavior: "smooth" });
      });
    });

    // Redimensionamento de janela
    window.addEventListener("resize", () => {
      if (state.analysis) {
        renderAllCharts(state.analysis);
        renderInteractiveTangent();
        renderComparisonSection();
        if (state.analysis.kineticsFit) {
          const canvas = document.querySelector("#linearizationCanvas");
          if (canvas) {
            KineticsCharts.drawKineticsLinearization(canvas, state.analysis.kineticsFit, state.activeLinearModel, state.currentConfig);
          }
        }
      }
    });
  }

  // Inicialização no DOM
  document.addEventListener("DOMContentLoaded", () => {
    populateConfigToUI();
    renderInputTable();
    setupEventListeners();
    loadPreset("acceptance");
  });
})();
