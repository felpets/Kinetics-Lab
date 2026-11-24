/**
 * Controlador dos ensaios, gráficos e ajuste da lei de velocidade.
 */
(() => {
  const engine = globalThis.KineticsEngine;
  const charts = KineticsCharts;
  const $ = (selector) => document.querySelector(selector);
  const byId = (id) => document.getElementById(id);
  const stateKey = "kinetics-lab-experiments-v1";
  const concentrationFactor = { "mol/L": 1, "mmol/L": 0.001, "mol/m³": 0.001 };
  const timeFactor = { s: 1, min: 60, h: 3600 };
  const settings = { expNameInp: "name", productNameInp: "productName", nuInp: "nu", concUnitInp: "concUnit", timeUnitInp: "timeUnit" };
  const formatter = new Intl.NumberFormat("pt-BR", { maximumSignificantDigits: 8, useGrouping: false });
  const format = (value) => Number.isFinite(value) ? formatter.format(value) : "—";
  const newId = () => crypto.randomUUID();

  function createExperiment(name, options = {}) {
    return {
      id: newId(), name, productName: "P", nu: "1", concUnit: "mol/L", timeUnit: "s",
      initial: {}, points: [{ t: "", conc: "" }, { t: "", conc: "" }], simulated: false, ...options
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(stateKey));
      if (saved?.experiments?.length && saved?.reagents?.length) return saved;
    } catch {
      // O laboratório também funciona quando o armazenamento está indisponível.
    }
    const first = createExperiment("Ensaio 1");
    return {
      experiments: [first], selected: first.id,
      reagents: [{ id: newId(), name: "A" }, { id: newId(), name: "B" }],
      fitOrigin: "recorded"
    };
  }

  const state = loadState();
  const current = () => state.experiments.find(exp => exp.id === state.selected) || state.experiments[0];
  const analyses = new WeakMap();
  let selectedTime;
  let activePanel = "analysis";

  function save() {
    try {
      localStorage.setItem(stateKey, JSON.stringify(state));
    } catch {
      // Os dados continuam disponíveis na sessão atual.
    }
  }

  function make(tag, content, className) {
    const node = document.createElement(tag);
    if (content !== undefined) node.textContent = content;
    if (className) node.className = className;
    return node;
  }

  function tableRow(values, cellTag = "td") {
    const row = make("tr");
    values.forEach(value => {
      const cell = make(cellTag);
      if (value instanceof Node) cell.append(value);
      else cell.textContent = value;
      row.append(cell);
    });
    return row;
  }

  function numericInput(value, label) {
    const input = make("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.value = typeof value === "number" ? String(value).replace(".", ",") : value ?? "";
    input.setAttribute("aria-label", label);
    return input;
  }

  const reagentName = (reagent, i) => reagent.name.trim() || `R${i + 1}`;
  const experimentName = (experiment) => experiment.name.trim() || "Ensaio sem nome";
  const originName = (experiment) => experiment.simulated ? "Exemplo simulado" : "Ensaio cadastrado";
  const rateUnit = (experiment) => `${experiment.concUnit}·${experiment.timeUnit}⁻¹`;
  const hasData = (point) => String(point.t).trim() !== "" || String(point.conc).trim() !== "";

  function analysisFor(experiment) {
    if (!analyses.has(experiment)) {
      analyses.set(experiment, engine.analyzeExperiment(experiment.points.filter(hasData), experiment));
    }
    return analyses.get(experiment);
  }

  function renderExperimentSelect() {
    byId("experimentSelect").replaceChildren(...state.experiments.map(exp =>
      new Option(`${experimentName(exp)}${exp.simulated ? " [simulado]" : ""}`, exp.id)
    ));
    byId("experimentSelect").value = current().id;
  }

  function renderInputTable() {
    byId("dataTableTbody").replaceChildren(...current().points.map((point, index) => {
      const time = numericInput(point.t, `Tempo do ponto ${index + 1}`);
      const concentration = numericInput(point.conc, `Concentração do ponto ${index + 1}`);
      time.dataset.field = "t";
      concentration.dataset.field = "conc";
      const remove = make("button", "Remover", "btn btn-sm btn-danger");
      remove.dataset.remove = index;
      remove.setAttribute("aria-label", `Remover ponto ${index + 1}`);
      const row = tableRow([index + 1, time, concentration, remove]);
      row.dataset.index = index;
      return row;
    }));
  }

  function renderInitialConcentrations() {
    const experiment = current();
    byId("initialConcentrations").replaceChildren(...state.reagents.map((reagent, i) => {
      const name = reagentName(reagent, i);
      const field = make("div", undefined, "config-group");
      const input = numericInput(experiment.initial[reagent.id], `Concentração inicial de ${name} em mol/L`);
      input.id = `initial-${reagent.id}`;
      input.dataset.reagent = reagent.id;
      const label = make("label", `[${name}]₀ (mol/L)`);
      label.htmlFor = input.id;
      field.append(label, input);
      return field;
    }));
  }

  function renderEditor() {
    const experiment = current();
    renderExperimentSelect();
    for (const [id, key] of Object.entries(settings)) byId(id).value = experiment[key];
    byId("dataOrigin").textContent = experiment.simulated
      ? "Exemplo simulado para demonstração. Substituir a série por CSV ou limpar os pontos inicia uma série cadastrada."
      : "Ensaio cadastrado. Insira as medições de tempo e concentração do produto.";
    byId("dataOrigin").classList.toggle("simulated", experiment.simulated);
    renderInputTable();
    renderInitialConcentrations();
  }

  function metric(id, value, unit) {
    byId(id).textContent = format(value);
    byId(id + "Unit").textContent = unit;
  }

  function meanExpression(p1, p2, t1, t2, nu, rate, unit) {
    return `v̄ = (1 / ${format(nu)}) × (${format(p2)} − ${format(p1)}) / (${format(t2)} − ${format(t1)}) = ${format(rate)} ${unit}`;
  }

  function renderMemory(result, unit) {
    const { rawPoints, average, instantaneous, nu } = result;
    const first = rawPoints[0];
    const last = rawPoints.at(-1);
    const global = meanExpression(first.conc, last.conc, first.t, last.t, nu, average.vGlobal, unit);
    const groups = [
      ["Média global", [global]],
      ["Velocidades médias por intervalo e estimativa inicial", average.intervals.map((row, i) =>
        `${i === 0 ? "Primeiro intervalo (estimativa inicial se t₁ = 0) • " : ""}${meanExpression(row.p1, row.p2, row.t1, row.t2, nu, row.vReaction, unit)}`)],
      ["Velocidades instantâneas", instantaneous.map(row =>
        `t = ${format(row.t)} • ${row.method} • ${row.substitution.replace(/(\d)\.(?=\d)/g, "$1,")} = ${format(row.vReaction)} ${unit}`)]
    ];
    byId("calcMemoryContainer").replaceChildren(...groups.map(([label, statements], index) => {
      const details = make("details", undefined, "calc-memory-item");
      details.open = index === 0;
      details.append(make("summary", label), ...statements.map(statement => make("p", statement)));
      return details;
    }));
  }

  function renderAnalysis() {
    const experiment = current();
    byId("timeHeading").textContent = `Tempo (${experiment.timeUnit})`;
    byId("concentrationHeading").textContent = `Concentração do produto (${experiment.concUnit})`;
    const result = analysisFor(experiment);
    byId("validationAlertBox").textContent = [...result.errors, ...result.warnings].join(" ");
    byId("experimentalResults").hidden = !result.success;
    if (!result.success) return;

    const unit = rateUnit(experiment);
    const startsAtZero = result.rawPoints[0].t === 0;
    metric("metricVInitial", startsAtZero ? result.stats.vInitial : NaN, unit);
    metric("metricVGlobal", result.stats.vGlobal, unit);
    byId("initialRateNote").textContent = startsAtZero
      ? "v₀ é estimada pela velocidade média do primeiro intervalo. A tabela instantânea usa a derivada de diferenças finitas."
      : "Inclua uma medição em t = 0 para estimar v₀ e usar este ensaio no ajuste.";
    document.querySelectorAll(".rate-heading").forEach(heading => { heading.textContent = `v (${unit})`; });
    byId("averageRatesTbody").replaceChildren(...result.average.intervals.map(rate => tableRow([
      `${format(rate.t1)}–${format(rate.t2)} ${experiment.timeUnit}`, format(rate.tMid), format(rate.dP), format(rate.vReaction)
    ])));
    byId("instantaneousRatesTbody").replaceChildren(...result.instantaneous.map(rate => tableRow([
      `${format(rate.t)} ${experiment.timeUnit}`, format(rate.conc), format(rate.vReaction), rate.method
    ])));

    const first = result.rawPoints[0].t;
    const last = result.rawPoints.at(-1).t;
    selectedTime = Math.max(first, Math.min(last, selectedTime ?? first));
    const slider = byId("tangentTimeSlider");
    slider.min = first;
    slider.max = last;
    byId("tangentSample").replaceChildren(new Option("Entre amostras", ""), ...result.rawPoints.map(point =>
      new Option(`${format(point.t)} ${experiment.timeUnit}`, point.t)
    ));
    renderMemory(result, unit);
    drawExperimentalCharts();
  }

  function drawExperimentalCharts() {
    if (byId("analysis").hidden) return;
    const experiment = current();
    const result = analysisFor(experiment);
    if (!result.success) return;
    charts.drawProductVsTime(byId("productVsTimeCanvas"), result, experiment);
    charts.drawAverageRateVsTime(byId("averageRateVsTimeCanvas"), result, experiment);
    charts.drawInstantaneousVsTime(byId("instantaneousVsTimeCanvas"), result, experiment);
    charts.drawRateVsProduct(byId("rateVsProductCanvas"), result, experiment);
    drawTangent();
  }

  function drawTangent() {
    const experiment = current();
    const result = analysisFor(experiment);
    if (!result.success || byId("analysis").hidden) return;
    const point = charts.drawInteractiveTangent(byId("tangentCanvas"), result, selectedTime, experiment);
    byId("tangentTimeSlider").value = point.t;
    byId("tangentSample").value = point.t;
    byId("tangentSelectedTimeDisplay").textContent = `${format(point.t)} ${experiment.timeUnit}`;
    byId("tangentConcDisplay").textContent = `${format(point.conc)} ${experiment.concUnit}`;
    byId("tangentSlopeDisplay").textContent = `${format(point.dPdt)} ${rateUnit(experiment)}`;
    byId("tangentVInstDisplay").textContent = `${format(point.vReaction)} ${rateUnit(experiment)}`;
  }

  function renderReagents() {
    byId("reagentList").replaceChildren(...state.reagents.map((reagent, index) => {
      const group = make("div", undefined, "config-group");
      const label = make("label", `Reagente ${index + 1}`);
      const name = make("input");
      name.type = "text";
      name.maxLength = 25;
      name.value = reagent.name;
      name.id = `name-${reagent.id}`;
      name.dataset.reagent = reagent.id;
      label.htmlFor = name.id;
      const remove = make("button", "Remover", "btn btn-sm");
      remove.dataset.remove = reagent.id;
      remove.disabled = state.reagents.length === 1;
      remove.setAttribute("aria-label", `Remover reagente ${index + 1}`);
      group.append(label, name, remove);
      return group;
    }));
  }

  function fitInput(experiment) {
    const analysis = analysisFor(experiment);
    const initialConcentrations = state.reagents.map(reagent => engine.parseNumber(experiment.initial[reagent.id]));
    const normalizedRate = analysis.success ? analysis.stats.vInitial * concentrationFactor[experiment.concUnit] / timeFactor[experiment.timeUnit] : NaN;
    let problem = "";
    if (!analysis.success) problem = analysis.errors[0];
    else if (analysis.rawPoints[0].t !== 0) problem = "A série precisa iniciar em t = 0.";
    else if (!Number.isFinite(normalizedRate) || normalizedRate <= 0) problem = "v₀ deve ser positiva para aplicar o logaritmo.";
    else if (initialConcentrations.some(value => !Number.isFinite(value) || value <= 0)) problem = "Informe todas as concentrações iniciais positivas.";
    return {
      name: experimentName(experiment), experiment, initialConcentrations, problem, normalizedRate,
      analysis: analysis.success ? {
        stats: { vInitial: normalizedRate },
        rawPoints: analysis.rawPoints,
        activePoints: analysis.rawPoints.map(point => ({
          t: point.t * timeFactor[experiment.timeUnit],
          conc: point.conc * concentrationFactor[experiment.concUnit]
        }))
      } : null
    };
  }

  function summaryMetric(title, value, unit = "") {
    const item = make("article");
    const content = make("div");
    content.append(make("small", title), make("strong", value), make("em", unit));
    item.append(content);
    return item;
  }

  function renderFit() {
    const simulated = state.fitOrigin === "simulated";
    byId("fitOrigin").value = state.fitOrigin;
    byId("fitOriginNote").textContent = simulated ? "Ajuste demonstrativo com dados simulados." : "Ajuste com os ensaios cadastrados na seção experimental.";
    byId("fitOriginNote").classList.toggle("simulated", simulated);
    const names = state.reagents.map(reagentName);
    const entries = state.experiments.filter(exp => exp.simulated === simulated).map(fitInput);
    const eligible = entries.filter(entry => !entry.problem);
    const fit = engine.fitInitialRateLaw(eligible, names.length);
    byId("fitTableHead").replaceChildren(tableRow([
      "Ensaio", ...names.map(name => `[${name}]₀ (mol/L)`),
      "v₀ estimada (mol·L⁻¹·s⁻¹)", "v₀ ajustada (mol·L⁻¹·s⁻¹)", "Situação"
    ], "th"));
    let predictedIndex = 0;
    byId("fitTableBody").replaceChildren(...entries.map(entry => {
      const edit = make("button", entry.name, "text-button");
      edit.dataset.experiment = entry.experiment.id;
      const hasZero = entry.analysis?.rawPoints[0].t === 0;
      const prediction = fit.success && !entry.problem ? fit.predicted[predictedIndex++] : NaN;
      return tableRow([
        edit, ...entry.initialConcentrations.map(format), format(hasZero ? entry.normalizedRate : NaN),
        format(prediction), entry.problem || "Incluído"
      ]);
    }));
    if (!entries.length) {
      const empty = tableRow(["Nenhum ensaio nesta seleção."]);
      empty.firstElementChild.colSpan = names.length + 4;
      byId("fitTableBody").append(empty);
    }
    byId("fitStatus").textContent = fit.success
      ? (fit.degreesOfFreedom === 0 ? "Ajuste com zero graus de liberdade residuais. Adicione ensaios para avaliar os resíduos." : `${eligible.length} ensaios usados no ajuste.`)
      : fit.error;
    byId("fitResults").hidden = !fit.success;
    byId("comparisonPanel").hidden = eligible.length === 0;
    if (fit.success) {
      byId("fitSummary").replaceChildren(
        ...names.map((name, i) => summaryMetric(`ORDEM PARCIAL DE ${name}`, format(fit.orders[i]))),
        summaryMetric("ORDEM GLOBAL", format(fit.globalOrder)),
        summaryMetric("CONSTANTE CINÉTICA k", format(fit.k), fit.unit),
        summaryMetric("R² NA ESCALA LOGARÍTMICA", format(fit.r2)),
        summaryMetric("RMSE DOS LOGARITMOS", format(fit.rmseLog))
      );
      const terms = names.map((name, i) => `(${format(fit.orders[i])}) ln([${name}]₀)`).join(" + ");
      const orders = fit.orders.map(format).join(" + ");
      byId("fitMemory").replaceChildren(
        make("p", `ln(v₀) = ${format(fit.lnK)} + ${terms}`),
        make("p", `k = exp(${format(fit.lnK)}) = ${format(fit.k)} ${fit.unit}`),
        make("p", `n = ${orders} = ${format(fit.globalOrder)}`),
        make("p", `Estimativa do condicionamento de R (norma 1) = ${format(fit.condition)}`)
      );
    }
    if (!byId("modeling").hidden && eligible.length) {
      charts.drawExperimentComparison(byId("comparisonChartCanvas"), eligible, { timeUnit: "s", concUnit: "mol/L" });
    }
  }

  function updateSeries(experiment = current()) {
    analyses.delete(experiment);
    save();
    renderAnalysis();
    if (activePanel === "modeling") renderFit();
  }

  function selectExperiment(id) {
    state.selected = id;
    selectedTime = undefined;
    byId("importStatus").textContent = "";
    save();
    renderEditor();
    renderAnalysis();
  }

  function openPanel(id) {
    activePanel = id;
    document.querySelectorAll("main > section").forEach(panel => { panel.hidden = panel.id !== id; });
    document.querySelectorAll(".navitem").forEach(button => {
      const active = button.dataset.target === id;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    if (id === "analysis") drawExperimentalCharts();
    if (id === "modeling") renderFit();
    window.scrollTo(0, 0);
  }

  function loadReference() {
    let example = state.experiments.find(exp => exp.example === "reference");
    if (!example) {
      example = createExperiment("Referência de velocidades", {
        simulated: true, example: "reference",
        points: [0, 0.12, 0.21, 0.29, 0.35, 0.40].map((conc, i) => ({ t: 10 * i, conc }))
      });
      state.experiments.push(example);
    }
    selectExperiment(example.id);
  }

  function loadSimulatedGroup() {
    const model = state.reagents.map(reagent => reagent.id).join(",");
    const existing = state.experiments.find(exp => exp.example === "fit" && exp.exampleModel === model);
    if (existing) {
      selectExperiment(existing.id);
    } else {
      const count = state.reagents.length;
      const examples = Array.from({ length: count + 3 }, (_, i) => {
        const concentrations = state.reagents.map((_, j) =>
          i === count + 1 ? 0.3 : i === count + 2 ? 0.15 + 0.05 * (j % 3) : i === j + 1 ? 0.2 : 0.1
        );
        const initial = Object.fromEntries(state.reagents.map((reagent, j) => [reagent.id, concentrations[j]]));
        const rate = 0.4 * concentrations[0] * (concentrations[1] ?? 1) ** 2;
        const points = [0, 1, 2.5, 5].map(t => ({ t, conc: rate * t / (1 + 0.02 * Math.max(0, t - 1)) }));
        return createExperiment(`Demonstração ${i + 1}`, { simulated: true, example: "fit", exampleModel: model, initial, points });
      });
      state.experiments.push(...examples);
      selectExperiment(examples[0].id);
    }
    state.fitOrigin = "simulated";
    save();
  }

  function importText(text) {
    try {
      const points = engine.parseSeriesCsv(text);
      const validation = engine.validateData(points, { nu: 1 });
      if (!validation.valid) throw new Error(validation.errors.join(" "));
      const experiment = current();
      experiment.points = points;
      const simulated = /\[simulado\]/i.test(text.split(/\r?\n/, 1)[0]);
      if (experiment.simulated && !simulated) experiment.initial = {};
      experiment.simulated = simulated;
      delete experiment.example;
      selectedTime = undefined;
      renderEditor();
      updateSeries();
      byId("importStatus").textContent = `${points.length} pontos importados. Confira as unidades do ensaio.`;
      return true;
    } catch (error) {
      byId("importStatus").textContent = error.message;
      return false;
    }
  }

  function exportSeries(kind) {
    const experiment = current();
    const result = analysisFor(experiment);
    if (!result.success) {
      byId("importStatus").textContent = "Informe uma série válida antes de exportar.";
      openPanel("analysis");
      return;
    }
    const rows = kind === "raw"
      ? [[`tempo (${experiment.timeUnit})${experiment.simulated ? " [simulado]" : ""}`, `concentracao (${experiment.concUnit})`], ...result.rawPoints.map(row => [row.t, row.conc])]
      : [
          ["tipo", `tempo (${experiment.timeUnit})`, `velocidade (${rateUnit(experiment)})`],
          ...result.average.intervals.map(row => ["média", row.tMid, row.vReaction]),
          ...result.instantaneous.map(row => ["instantânea", row.t, row.vReaction]),
          ["média global", "", result.average.vGlobal],
          ...(result.rawPoints[0].t === 0 ? [["inicial estimada", 0, result.stats.vInitial]] : [])
        ];
    const csv = rows.map(row => row.map(value => String(value).replace(".", ",")).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const download = make("a");
    download.href = url;
    download.download = `${experiment.simulated ? "exemplo-simulado-" : ""}${kind === "raw" ? "serie" : "velocidades"}-cinetica.csv`;
    download.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function bind(id, event, handler) {
    byId(id).addEventListener(event, handler);
  }

  $(".sidebar nav").addEventListener("click", event => {
    const button = event.target.closest("[data-target]");
    if (button) openPanel(button.dataset.target);
  });
  $("[data-open]").addEventListener("click", event => openPanel(event.currentTarget.dataset.open));
  bind("experimentSelect", "change", event => selectExperiment(event.target.value));
  bind("newExperiment", "click", () => {
    const experiment = createExperiment(`Ensaio ${state.experiments.length + 1}`);
    state.experiments.push(experiment);
    selectExperiment(experiment.id);
    byId("expNameInp").focus();
  });
  bind("deleteExperiment", "click", () => {
    if (!confirm(`Excluir “${experimentName(current())}” do laboratório?`)) return;
    state.experiments = state.experiments.filter(exp => exp.id !== current().id);
    if (!state.experiments.length) state.experiments.push(createExperiment("Ensaio 1"));
    selectExperiment(state.experiments[0].id);
  });
  bind("referenceExample", "click", loadReference);
  bind("simulatedGroup", "click", loadSimulatedGroup);
  for (const [id, key] of Object.entries(settings)) {
    bind(id, "input", event => {
      current()[key] = event.target.value;
      if (key === "name") {
        renderExperimentSelect();
        save();
      } else {
        updateSeries();
      }
    });
  }
  bind("initialConcentrations", "input", event => {
    current().initial[event.target.dataset.reagent] = event.target.value;
    save();
  });
  bind("dataTableTbody", "input", event => {
    const row = event.target.closest("[data-index]");
    current().points[row.dataset.index][event.target.dataset.field] = event.target.value;
    updateSeries();
  });
  bind("dataTableTbody", "click", event => {
    const button = event.target.closest("[data-remove]");
    if (!button) return;
    current().points.splice(Number(button.dataset.remove), 1);
    renderInputTable();
    updateSeries();
  });
  bind("addRowBtn", "click", () => {
    current().points.push({ t: "", conc: "" });
    save();
    renderInputTable();
    $("#dataTableTbody tr:last-child input").focus();
  });
  bind("clearDataBtn", "click", () => {
    if (current().points.some(hasData) && !confirm("Limpar todos os pontos deste ensaio?")) return;
    if (current().simulated) current().initial = {};
    Object.assign(current(), { points: [{ t: "", conc: "" }, { t: "", conc: "" }], simulated: false });
    delete current().example;
    selectedTime = undefined;
    renderEditor();
    updateSeries();
  });
  bind("tangentTimeSlider", "input", event => {
    selectedTime = Number(event.target.value);
    drawTangent();
  });
  bind("tangentSample", "change", event => {
    if (event.target.value === "") return;
    selectedTime = Number(event.target.value);
    drawTangent();
  });
  bind("tangentCanvas", "pointerdown", event => {
    const { rawPoints } = analysisFor(current());
    if (!rawPoints) return;
    const { left, width } = event.currentTarget.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (event.clientX - left - 86) / (width - 86 - 24)));
    selectedTime = rawPoints[0].t + fraction * (rawPoints.at(-1).t - rawPoints[0].t);
    drawTangent();
  });
  bind("togglePasteBoxBtn", "click", event => {
    const pasteBox = byId("pasteBoxWrap");
    pasteBox.hidden = !pasteBox.hidden;
    event.currentTarget.setAttribute("aria-expanded", String(!pasteBox.hidden));
    if (!pasteBox.hidden) byId("pasteTextarea").focus();
  });
  bind("applyPasteBtn", "click", () => {
    if (!importText(byId("pasteTextarea").value)) return;
    byId("pasteBoxWrap").hidden = true;
    byId("togglePasteBoxBtn").setAttribute("aria-expanded", "false");
    byId("pasteTextarea").value = "";
  });
  bind("csvFileInput", "change", async event => {
    const input = event.target;
    const file = input.files[0];
    const experiment = current();
    input.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      if (current() === experiment) importText(text);
    } catch {
      byId("importStatus").textContent = "O arquivo não pôde ser lido.";
    }
  });

  bind("fitOrigin", "change", event => {
    state.fitOrigin = event.target.value;
    save();
    renderFit();
  });
  bind("fitTableBody", "click", event => {
    const button = event.target.closest("[data-experiment]");
    if (!button) return;
    selectExperiment(button.dataset.experiment);
    openPanel("analysis");
  });
  bind("addReagent", "click", () => {
    const id = newId();
    state.reagents.push({ id, name: "" });
    save();
    renderReagents();
    renderInitialConcentrations();
    renderFit();
    byId(`name-${id}`).focus();
  });
  bind("reagentList", "input", event => {
    const reagent = state.reagents.find(item => item.id === event.target.dataset.reagent);
    reagent.name = event.target.value;
    save();
    renderInitialConcentrations();
    renderFit();
  });
  bind("reagentList", "click", event => {
    const button = event.target.closest("[data-remove]");
    if (!button || state.reagents.length < 2) return;
    const id = button.dataset.remove;
    if (state.experiments.some(exp => exp.initial[id]) && !confirm("Remover o reagente e as concentrações iniciais registradas para ele?")) return;
    state.reagents = state.reagents.filter(reagent => reagent.id !== id);
    state.experiments.forEach(exp => { delete exp.initial[id]; });
    save();
    renderReagents();
    renderInitialConcentrations();
    renderFit();
  });

  document.querySelectorAll("[data-export]").forEach(button => {
    button.addEventListener("click", () => exportSeries(button.dataset.export));
  });
  bind("exportDataCsvBtn", "click", () => exportSeries("raw"));
  document.querySelectorAll(".export-png-btn").forEach(button => {
    button.addEventListener("click", () => charts.exportAsPNG(
      byId(button.dataset.target), `${current().simulated || (activePanel === "modeling" && state.fitOrigin === "simulated") ? "simulado-" : ""}${button.dataset.target}.png`
    ));
  });
  bind("printReportBtn", "click", () => {
    const panels = [byId("analysis"), byId("modeling")];
    panels.forEach(panel => { panel.hidden = false; });
    drawExperimentalCharts();
    renderFit();
    const controls = panels.flatMap(panel => [...panel.querySelectorAll(".config-group input, .config-group select, #dataTableTbody input")]);
    const printValues = controls.map(control => {
      const value = make("span", control.value || "—", "print-value");
      control.after(value);
      return value;
    });
    const collapsed = [...byId("calcMemoryContainer").querySelectorAll("details:not([open])")];
    collapsed.forEach(details => { details.open = true; });
    window.print();
    collapsed.forEach(details => { details.open = false; });
    printValues.forEach(value => value.remove());
    panels.forEach(panel => { panel.hidden = true; });
  });

  window.addEventListener("resize", () => {
    if (activePanel === "analysis") drawExperimentalCharts();
    if (activePanel === "modeling") renderFit();
  });
  renderEditor();
  renderReagents();
  renderAnalysis();
})();
