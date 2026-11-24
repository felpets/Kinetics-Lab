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

  let state = loadState();
  let demoSession;
  const current = () => state.experiments.find(exp => exp.id === state.selected) || state.experiments[0];
  const analyses = new WeakMap();
  let selectedTime;
  let activePanel = "analysis";

  function save() {
    if (demoSession) return;
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
    byId("dataOrigin").textContent = demoSession
      ? "Dados simulados para a demonstração."
      : experiment.simulated
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

  function renderAnalysis({ showResults = true } = {}) {
    const experiment = current();
    byId("timeHeading").textContent = `Tempo (${experiment.timeUnit})`;
    byId("concentrationHeading").textContent = `Concentração do produto (${experiment.concUnit})`;
    const result = showResults ? analysisFor(experiment) : null;
    byId("validationAlertBox").textContent = result ? [...result.errors, ...result.warnings].join(" ") : "";
    byId("experimentalResults").hidden = !result?.success;
    if (!result?.success) return;

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
    const entries = state.experiments.filter(exp =>
      exp.simulated === simulated && (!demoSession || exp.example === "fit")
    ).map(fitInput);
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

  function selectExperiment(id, analysisOptions) {
    state.selected = id;
    selectedTime = undefined;
    byId("importStatus").textContent = "";
    save();
    renderEditor();
    renderAnalysis(analysisOptions);
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

  function createReference() {
    return createExperiment("Referência de velocidades", {
      simulated: true, example: "reference",
      points: [0, 0.12, 0.21, 0.29, 0.35, 0.40].map((conc, i) => ({ t: 10 * i, conc }))
    });
  }

  function loadReference() {
    let example = state.experiments.find(exp => exp.example === "reference");
    if (!example) {
      example = createReference();
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

  const tourResultSteps = [
    {
      panel: "analysis", target: "#averageRatesTable",
      title: "Velocidade média por intervalo",
      instructions: "Cada linha resume o intervalo entre duas medições. Ela mostra o ponto médio do intervalo, a variação da concentração do produto e a velocidade média da reação nesse período."
    },
    {
      panel: "analysis", target: "#instantaneousRatesTable",
      title: "Velocidade instantânea",
      instructions: "Cada linha corresponde ao instante de uma medição. A tabela reúne a concentração do produto, a velocidade estimada naquele instante e o método de cálculo."
    },
    {
      panel: "analysis", target: "#productVsTimeCanvas",
      title: "Concentração do produto × tempo",
      instructions: "Leia o tempo no eixo horizontal e a concentração do produto no vertical. Cada ponto corresponde a uma medição da tabela. A curva representa a concentração estimada entre os pontos."
    },
    {
      panel: "analysis", target: "#averageRateVsTimeCanvas",
      title: "Velocidade média × tempo",
      instructions: "Cada ponto representa a velocidade média da reação entre duas medições. No eixo horizontal, ele aparece no tempo médio daquele intervalo."
    },
    {
      panel: "analysis", target: "#instantaneousVsTimeCanvas",
      title: "Velocidade instantânea × tempo",
      instructions: "O eixo horizontal mostra o tempo. O vertical mostra a velocidade instantânea estimada a partir das medições de concentração. Cada ponto marca a estimativa em um instante medido."
    },
    {
      panel: "analysis", target: "#rateVsProductCanvas",
      title: "Velocidade × concentração do produto",
      instructions: "O eixo horizontal mostra a concentração medida do produto. O vertical mostra a velocidade instantânea estimada para aquele mesmo ponto."
    },
    {
      panel: "analysis", target: "#tangentCanvas", tangent: true,
      title: "Tangente à curva de concentração",
      instructions: "A inclinação da reta indica a taxa de formação do produto no instante escolhido. Dividindo essa taxa pelo coeficiente do produto, obtemos a velocidade da reação."
    },
    {
      panel: "modeling", target: "#reagentList", fit: true,
      title: "Reagentes do modelo",
      instructions: "Cadastre aqui os reagentes que entram no ajuste. As concentrações iniciais de cada um são preenchidas separadamente em cada ensaio, na tela de determinação experimental."
    },
    {
      panel: "modeling", target: "#fitExperimentTable", fit: true,
      title: "Ensaios usados na lei de velocidade",
      instructions: "Cada linha resume um ensaio. A tabela reúne as concentrações iniciais dos reagentes, a velocidade inicial estimada pelas medições e a prevista pelo ajuste. A coluna Situação indica quais ensaios entraram no cálculo."
    },
    {
      panel: "modeling", target: "#fitSummary", fit: true,
      title: "Resultados do ajuste",
      instructions: "O resumo mostra a ordem de cada reagente, a ordem global e a constante cinética com sua unidade. Os indicadores R² e RMSE ajudam a avaliar a qualidade do ajuste."
    },
    {
      panel: "modeling", target: "#comparisonChartCanvas", fit: true,
      title: "Comparação dos ensaios",
      instructions: "Cada série mostra a concentração do produto ao longo do tempo em um ensaio usado no ajuste. A legenda identifica os ensaios para que você possa comparar as medições."
    },
    {
      panel: "theory", target: "#theoryRate",
      title: "Fórmula da velocidade média",
      instructions: "A fórmula divide a variação da concentração pelo tempo transcorrido e pelo coeficiente do produto. É o cálculo usado na tabela de velocidade média."
    },
    {
      panel: "theory", target: "#theoryTangent",
      title: "Diferenças finitas e tangente",
      instructions: "Este trecho explica como o laboratório usa pontos próximos para estimar a velocidade instantânea e como a curva interpolada permite traçar uma tangente entre as medições."
    },
    {
      panel: "theory", target: "#theoryInitialRates",
      title: "Método das velocidades iniciais",
      instructions: "Esta seção descreve como o ajuste usa as velocidades iniciais e as concentrações dos reagentes para calcular as ordens e a constante cinética. Também explica quais ensaios podem entrar no cálculo."
    },
    {
      panel: "reports", target: "#reports .panelbody", fit: true,
      title: "Relatório e exportação",
      instructions: "O CSV de dados contém as medições do ensaio selecionado. O CSV de velocidades reúne os valores calculados. A opção de imprimir ou salvar em PDF abre o relatório do ensaio e do ajuste ativo."
    }
  ];

  const tourPanelIntroductions = {
    analysis: "É aqui que você registra as medições de um ensaio e consulta as velocidades calculadas.",
    modeling: "Nesta tela, o laboratório usa as velocidades iniciais de vários ensaios para ajustar a lei de velocidade.",
    theory: "Esta tela reúne as fórmulas e os métodos usados pelo laboratório.",
    reports: "Nesta tela, você pode baixar os dados e gerar um relatório do ensaio."
  };

  function createTourSteps(reference) {
    const configuration = [
      { id: "expNameInp", title: "Nome do ensaio", instructions: "O nome ajuda a encontrar esta série quando houver mais de um ensaio no laboratório." },
      { id: "productNameInp", title: "Produto monitorado", instructions: "Este campo identifica o produto cuja concentração será medida ao longo do ensaio." },
      { id: "nuInp", title: "Coeficiente do produto", instructions: "O laboratório usa o coeficiente da equação balanceada para converter a taxa de formação do produto em velocidade da reação." }
    ].map(({ id, title, instructions }) => ({
      panel: "analysis", target: "#experimentSettings", title, instructions,
      entries: [{ input: `#${id}`, key: settings[id], value: reference[settings[id]] }]
    }));
    const measurements = {
      panel: "analysis", target: "#seriesTable",
      title: "Tabela de medições",
      instructions: "Cada linha registra o tempo desde o início da reação e a concentração do produto medida naquele instante. As unidades aparecem no cabeçalho.",
      entries: reference.points.flatMap((point, row) => ["t", "conc"].map(key => ({
        input: `#dataTableTbody tr[data-index="${row}"] [data-field="${key}"]`, row, key, value: format(point[key])
      })))
    };
    return [...configuration, measurements, ...tourResultSteps];
  }

  const tour = byId("firstAccessTour");
  const spotlight = byId("tourSpotlight");
  const navigation = $(".sidebar nav");
  const navigationButtons = [...navigation.querySelectorAll("[data-target]")];
  const demoControls = document.querySelectorAll([
    ".experiment-toolbar", "#experimentSettings", "#initialConcentrations",
    "[data-open]", "#seriesActions", "#pasteBoxWrap", "#dataTableTbody",
    "#reagentList", "#modeling .actions", "#fitTableBody"
  ].join(","));
  let tourSteps = [];
  let tourIndex = -1;
  let pendingTourStep;
  let tourTarget;
  let tourFocus;
  let tourTypingTimer;

  function tourViewport() {
    return {
      left: 14, right: document.documentElement.clientWidth - 14,
      top: $(".topbar").getBoundingClientRect().bottom + 12,
      bottom: window.innerHeight - (window.matchMedia("(max-width: 680px)").matches ? 64 : 14)
    };
  }

  function centerTour() {
    spotlight.classList.add("is-scrim");
    spotlight.removeAttribute("style");
    tour.removeAttribute("style");
    tour.dataset.placement = "center";
  }

  function positionTour() {
    if (!tour.open) return;
    const target = tourFocus || tourTarget;
    if (!target?.isConnected) return centerTour();
    const boundary = tourViewport();
    const rect = target.getBoundingClientRect();
    const focusBoundary = pendingTourStep === undefined ? boundary : {
      left: 0, right: document.documentElement.clientWidth, top: 0, bottom: window.innerHeight
    };
    const left = Math.max(focusBoundary.left, rect.left - 5);
    const right = Math.min(focusBoundary.right, rect.right + 5);
    const top = Math.max(focusBoundary.top, rect.top - 5);
    const bottom = Math.min(focusBoundary.bottom, rect.bottom + 5);
    if (right <= left || bottom <= top) return centerTour();

    spotlight.classList.remove("is-scrim");
    Object.assign(spotlight.style, { left: `${left}px`, top: `${top}px`, width: `${right - left}px`, height: `${bottom - top}px` });

    const gap = 16;
    const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
    if (tour.dataset.placement === "center") tour.dataset.placement = "overlap";
    const { offsetWidth: width, offsetHeight: height } = tour;
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const alignedX = clamp(centerX - width / 2, boundary.left, boundary.right - width);
    const alignedY = clamp(centerY - height / 2, boundary.top, boundary.bottom - height);
    const candidates = [
      { placement: "right", x: right + gap, y: alignedY },
      { placement: "below", x: alignedX, y: bottom + gap },
      { placement: "above", x: alignedX, y: top - gap - height },
      { placement: "left", x: left - gap - width, y: alignedY }
    ];
    const { placement, x, y } = candidates.find(card =>
      card.x >= boundary.left && card.x + width <= boundary.right &&
      card.y >= boundary.top && card.y + height <= boundary.bottom
    ) || { placement: "overlap", x: alignedX, y: Math.max(boundary.top, boundary.bottom - height) };
    const horizontal = placement === "above" || placement === "below";
    tour.dataset.placement = placement;
    tour.style.left = `${x}px`;
    tour.style.top = `${y}px`;
    tour.style.setProperty("--tour-arrow", `${horizontal
      ? clamp(centerX - x, 18, width - 18)
      : clamp(centerY - y, 18, height - 18)}px`);
  }

  function clearTourHighlight() {
    tourFocus = undefined;
    if (!tourTarget) return;
    tourTarget.querySelector(".tour-typing")?.classList.remove("tour-typing");
    tourTarget.classList.remove("tour-target");
    tourTarget = null;
  }

  function highlightTourTarget(target) {
    clearTourHighlight();
    tourTarget = typeof target === "string" ? $(target) : target;
    tourTarget.classList.add("tour-target");
    if (pendingTourStep === undefined) tourTarget.scrollIntoView({ block: "start", behavior: "instant" });
    positionTour();
  }

  function spotlightField(input) {
    tourFocus = input.closest(".config-group, tr");
    const { top, bottom } = tourFocus.getBoundingClientRect();
    const viewport = tourViewport();
    const limit = Math.max(viewport.top + 75, viewport.bottom - tour.offsetHeight - 26);
    if (top < viewport.top) window.scrollBy({ top: top - viewport.top - 8, behavior: "instant" });
    else if (bottom > limit) window.scrollBy({ top: bottom - limit, behavior: "instant" });
    positionTour();
  }

  function showTourReference() {
    const reference = demoSession.reference;
    state.experiments[0] = reference;
    selectExperiment(reference.id);
  }

  function writeTourEntry(experiment, { row, key, value }) {
    const record = row === undefined ? experiment : experiment.points[row];
    record[key] = value;
  }

  function showTourEntries(step, index) {
    const reference = demoSession.reference;
    const rows = Math.max(2, ...step.entries.map(({ row }) => (row ?? -1) + 1));
    const draft = {
      ...reference, name: "", productName: "", nu: "",
      points: Array.from({ length: rows }, () => ({ t: "", conc: "" }))
    };
    const previousEntries = tourSteps.slice(0, index).flatMap(previous => previous.entries);
    previousEntries.forEach(entry => writeTourEntry(draft, entry));
    state.experiments[0] = draft;
    selectExperiment(draft.id, { showResults: false });
    highlightTourTarget(step.target);

    const next = byId("tourNext");
    function focusEntry(input) {
      tourTarget.querySelector(".tour-typing")?.classList.remove("tour-typing");
      input.classList.add("tour-typing");
      spotlightField(input);
    }

    function finish() {
      if (step.entries[0].key === "name") renderExperimentSelect();
      if (step.entries.length > 1) highlightTourTarget(step.target);
      next.removeAttribute("aria-disabled");
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      step.entries.forEach(entry => {
        writeTourEntry(draft, entry);
        $(entry.input).value = entry.value;
      });
      if (step.entries.length === 1) focusEntry($(step.entries[0].input));
      finish();
      return;
    }

    function typeEntry(entryIndex) {
      if (!tour.open) return;
      const entry = step.entries[entryIndex];
      const input = $(entry.input);
      focusEntry(input);
      let length = 0;
      function typeCharacter() {
        if (!tour.open) return;
        length += 1;
        input.value = entry.value.slice(0, length);
        if (length < entry.value.length) {
          tourTypingTimer = setTimeout(typeCharacter, 90);
          return;
        }
        writeTourEntry(draft, entry);
        if (entryIndex + 1 < step.entries.length) {
          tourTypingTimer = setTimeout(() => typeEntry(entryIndex + 1), 110);
        } else {
          finish();
        }
      }
      tourTypingTimer = setTimeout(typeCharacter, 150);
    }

    next.setAttribute("aria-disabled", "true");
    typeEntry(0);
  }

  function showTourStep(index) {
    clearTimeout(tourTypingTimer);
    clearTourHighlight();
    tourIndex = index;
    const step = tourSteps[index];
    byId("tourProgress").textContent = `Passo ${index + 1} de ${tourSteps.length}`;
    byId("tourMeter").value = index + 1;
    byId("tourTitle").textContent = step.title;
    byId("tourInstructions").textContent = step.instructions || "";
    byId("tourTangentTime").hidden = !step.tangent;
    byId("tourPrevious").hidden = false;
    byId("tourPrevious").disabled = index === 0;
    const next = byId("tourNext");
    next.hidden = false;
    next.textContent = index === tourSteps.length - 1 ? "Concluir" : "Próximo";
    next.removeAttribute("aria-disabled");

    if (step.entries) {
      if (activePanel !== step.panel) openPanel(step.panel);
      showTourEntries(step, index);
      return;
    }

    if (step.fit && current().example !== "fit") loadSimulatedGroup();
    if (step.panel === "analysis" && current() !== demoSession.reference) showTourReference();
    if (activePanel !== step.panel) openPanel(step.panel);
    highlightTourTarget(step.target);
  }

  function clearTourNavigation() {
    pendingTourStep = undefined;
    navigation.inert = true;
    for (const button of navigationButtons) {
      button.inert = false;
      button.removeAttribute("aria-describedby");
    }
    const note = byId("tourNavigationNote");
    note.hidden = true;
    note.textContent = "";
  }

  function requestTourStep(index) {
    const { panel } = tourSteps[index];
    if (panel === activePanel) {
      showTourStep(index);
      return;
    }

    pendingTourStep = index;
    const button = navigationButtons.find(item => item.dataset.target === panel);
    const label = button.textContent.trim();
    byId("tourProgress").textContent = "Troca de tela";
    byId("tourTitle").textContent = label;
    byId("tourInstructions").textContent = tourPanelIntroductions[panel];
    const note = byId("tourNavigationNote");
    note.textContent = `Para continuar, clique em ${label} no menu.`;
    note.hidden = false;
    byId("tourTangentTime").hidden = true;
    byId("tourNext").hidden = true;
    byId("tourPrevious").hidden = tourIndex < 0;
    byId("tourPrevious").disabled = tourIndex < 0;

    for (const item of navigationButtons) item.inert = item !== button;
    navigation.inert = false;
    button.setAttribute("aria-describedby", note.id);
    highlightTourTarget(button);
    button.focus({ preventScroll: true });
  }

  function beginTour() {
    const first = demoSession.reference;
    state = {
      experiments: [first], selected: first.id, fitOrigin: "simulated",
      reagents: [{ id: newId(), name: "A" }, { id: newId(), name: "B" }]
    };
    $("main").inert = false;
    tour.removeAttribute("aria-modal");
    demoControls.forEach(control => { control.inert = true; });
    renderReagents();
    tourSteps = createTourSteps(first);
    byId("tourMeter").max = tourSteps.length;
    byId("tourMeter").value = 0;
    byId("tourMeter").hidden = false;
    requestTourStep(0);
    if (pendingTourStep === undefined) byId("tourNext").focus({ preventScroll: true });
  }

  bind("firstAccessBtn", "click", () => {
    if (!demoSession) {
      demoSession = {
        state, activePanel, selectedTime, scrollY: window.scrollY,
        importStatus: byId("importStatus").textContent, reference: createReference()
      };
      tourIndex = -1;
      $("main").inert = true;
      $(".topbar").inert = true;
      clearTourNavigation();
      byId("tourProgress").textContent = "Primeiro acesso";
      byId("tourMeter").hidden = true;
      byId("tourTitle").textContent = "Seu primeiro ensaio no Kinetics Lab";
      byId("tourInstructions").textContent = "Veja como registrar um ensaio, interpretar as tabelas e os gráficos e usar as demais telas do laboratório. Ao chegar a uma troca de tela, o guia indicará qual botão clicar no menu.";
      byId("tourPrevious").hidden = true;
      byId("tourTangentTime").hidden = true;
      byId("tourNext").hidden = false;
      byId("tourNext").textContent = "Iniciar tour";
      byId("tourNext").removeAttribute("aria-disabled");
      byId("firstAccessBtn").setAttribute("aria-expanded", "true");
      tour.setAttribute("aria-modal", "true");
      centerTour();
      spotlight.hidden = false;
      tour.show();
    }
    byId("tourNext").focus({ preventScroll: true });
  });
  bind("tourNext", "click", event => {
    if (pendingTourStep !== undefined || event.currentTarget.getAttribute("aria-disabled") === "true") return;
    if (tourIndex < 0) beginTour();
    else if (tourIndex === tourSteps.length - 1) tour.close();
    else requestTourStep(tourIndex + 1);
  });
  bind("tourPrevious", "click", () => {
    if (pendingTourStep !== undefined) {
      clearTourNavigation();
      showTourStep(tourIndex);
      byId("tourNext").focus({ preventScroll: true });
      return;
    }
    requestTourStep(tourIndex - 1);
    if (tourIndex === 0 && pendingTourStep === undefined) byId("tourNext").focus({ preventScroll: true });
  });
  bind("tourClose", "click", () => tour.close());
  bind("tourTangentTime", "click", () => {
    const { rawPoints } = analysisFor(current());
    const point = rawPoints.find(point => point.t > selectedTime) ?? rawPoints[0];
    selectedTime = point.t;
    drawTangent();
  });
  tour.addEventListener("close", () => {
    clearTimeout(tourTypingTimer);
    clearTourNavigation();
    clearTourHighlight();
    spotlight.hidden = true;
    const previous = demoSession;
    demoSession = undefined;
    state = previous.state;
    selectedTime = previous.selectedTime;
    $("main").inert = false;
    $(".topbar").inert = false;
    navigation.inert = false;
    demoControls.forEach(control => { control.inert = false; });
    byId("importStatus").textContent = previous.importStatus;
    renderReagents();
    renderEditor();
    renderAnalysis();
    openPanel(previous.activePanel);
    window.scrollTo({ top: previous.scrollY, behavior: "instant" });
    byId("firstAccessBtn").setAttribute("aria-expanded", "false");
    byId("firstAccessBtn").focus({ preventScroll: true });
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || event.defaultPrevented || !tour.open) return;
    event.preventDefault();
    tour.close();
  });
  new ResizeObserver(positionTour).observe(tour);
  window.addEventListener("scroll", positionTour, { passive: true });
  window.addEventListener("resize", positionTour);


  navigation.addEventListener("click", event => {
    const button = event.target.closest("[data-target]");
    if (!button) return;
    if (!tour.open) {
      openPanel(button.dataset.target);
    } else if (pendingTourStep !== undefined && tourSteps[pendingTourStep].panel === button.dataset.target) {
      const index = pendingTourStep;
      clearTourNavigation();
      showTourStep(index);
      byId("tourNext").focus({ preventScroll: true });
    }
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
