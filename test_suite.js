import './public/js/kinetics-engine.js';
const KineticsEngine = globalThis.KineticsEngine;

console.log("==================================================");
console.log("Bateria de Testes Unitários - KineticsEngine");
console.log("==================================================");

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    process.exit(1);
  } else {
    passed++;
    console.log(`✅ APROVADO: ${message}`);
  }
}

function assertClose(actual, expected, tolerance = 1e-5, message = "") {
  total++;
  const diff = Math.abs(actual - expected);
  if (!Number.isFinite(actual) || diff > tolerance) {
    console.error(`❌ FALHA: ${message} - Obtido: ${actual}, Esperado: ${expected} (dif: ${diff})`);
    process.exit(1);
  } else {
    passed++;
    console.log(`✅ APROVADO: ${message} (${actual})`);
  }
}

// 1. Dados do Critério de Aceitação
const samplePoints = [
  { t: 0, conc: 0.000 },
  { t: 10, conc: 0.120 },
  { t: 20, conc: 0.210 },
  { t: 30, conc: 0.290 },
  { t: 40, conc: 0.350 },
  { t: 50, conc: 0.400 }
];

const res1 = KineticsEngine.analyzeExperiment(samplePoints, { nu: 1 });
assert(res1.success, "Análise do experimento inicial deve ter sucesso");

// Verificação das taxas médias de referência
const iv = res1.average.intervals;
assertClose(iv[0].vReaction, 0.012, 1e-5, "v_med entre 0 e 10 s deve ser 0.012 mol/(L·s)");
assertClose(iv[1].vReaction, 0.009, 1e-5, "v_med entre 10 e 20 s deve ser 0.009 mol/(L·s)");
assertClose(iv[2].vReaction, 0.008, 1e-5, "v_med entre 20 e 30 s deve ser 0.008 mol/(L·s)");
assertClose(iv[3].vReaction, 0.006, 1e-5, "v_med entre 30 e 40 s deve ser 0.006 mol/(L·s)");
assertClose(iv[4].vReaction, 0.005, 1e-5, "v_med entre 40 e 50 s deve ser 0.005 mol/(L·s)");
assertClose(res1.stats.vGlobal, 0.008, 1e-5, "v_med global deve ser 0.008 mol/(L·s)");

// Verificação da velocidade instantânea em t = 10 s
const inst10 = res1.instantaneous.find(r => r.t === 10);
assert(Boolean(inst10), "Ponto em t = 10 s deve estar presente nas taxas instantâneas");
assertClose(inst10.vReaction, 0.0105, 1e-5, "v_inst em t = 10 s deve ser 0.0105 mol/(L·s)");

// 2. Teste de Coeficiente Estequiométrico ν = 2
const resNu2 = KineticsEngine.analyzeExperiment(samplePoints, { nu: 2 });
assertClose(resNu2.average.intervals[0].vReaction, 0.006, 1e-5, "Com ν=2, v_med da reação deve ser metade da taxa de formação");
assertClose(resNu2.average.intervals[0].vProduct, 0.012, 1e-5, "Com ν=2, taxa de formação do produto deve permanecer 0.012");

// 3. Teste com intervalos de tempo não-uniformes
const nonUniformPoints = [
  { t: 0, conc: 0.0 },
  { t: 5, conc: 0.10 },
  { t: 15, conc: 0.25 },
  { t: 40, conc: 0.45 }
];
const resNonUniform = KineticsEngine.analyzeExperiment(nonUniformPoints, { nu: 1 });
assert(resNonUniform.success, "Análise com intervalos não-uniformes deve ser processada");
assert(resNonUniform.instantaneous.length === 4, "Deve calcular derivadas em todos os 4 pontos não-uniformes");

// 4. Teste de Modelagem Cinética Integrada
const resKin = KineticsEngine.analyzeExperiment(samplePoints, {
  nu: 1,
  coefA: 1,
  initialA: 1.0
});
assert(resKin.kineticsFit && resKin.kineticsFit.available, "Modelagem cinética deve estar ativa quando [A]0 é informado");
assert(resKin.kineticsFit.models.order0 !== null, "Modelo de Ordem 0 deve ser ajustado");
assert(resKin.kineticsFit.models.order1 !== null, "Modelo de Ordem 1 deve ser ajustado");
assert(resKin.kineticsFit.models.order2 !== null, "Modelo de Ordem 2 deve ser ajustado");

// 5. Teste da Spline Contínua
const splineEval = res1.spline(20);
assertClose(splineEval.val, 0.210, 1e-4, "Spline em t = 20 s deve interpolar exatamente a concentração 0.210");
assert(splineEval.deriv > 0, "Derivada da spline deve ser positiva para formação de produto");


const { parseSeriesCsv, fitInitialRateLaw, kineticConstantUnit, analyzeExperiment } = KineticsEngine;
const csv = 'Tempo (s);Concentração do produto (mol/L)\r\n0;0,000\r\n10;0,120\r\n20;0,210\r\n30;0,290\r\n40;0,350\r\n50;0,400';
const imported = analyzeExperiment(parseSeriesCsv(csv), { nu: "1" });
assert(imported.success, "CSV com vírgula decimal importa o conjunto de referência");
assertClose(imported.stats.vInitial, 0.012, 1e-12, "v₀ de referência usa a média do primeiro intervalo");
assertClose(imported.spline(10).deriv, 0.0105, 1e-12, "Tangente em 10 s coincide com a derivada de diferenças finitas");
assertClose(parseSeriesCsv('time,concentration\n"10","0.12"')[0].conc, 0.12, 1e-12, "CSV separado por vírgulas aceita valores entre aspas");
assertClose(parseSeriesCsv('t\tconc\n10\t0,12')[0].conc, 0.12, 1e-12, "Colagem com tabulação preserva vírgula decimal");
assert(!analyzeExperiment([{ t: "", conc: "0,1" }, { t: 1, conc: 1 }], { nu: 1 }).success, "Tempo vazio não é interpretado como zero");
assert(!analyzeExperiment([{ t: 0, conc: 0 }, { t: "0,0", conc: 1 }], { nu: 1 }).success, "Tempos duplicados são rejeitados");

const quadratic = analyzeExperiment([9, 0, 2, 5].map(t => ({ t, conc: 1 + 2 * t + 3 * t * t })), { nu: 2 });
quadratic.instantaneous.forEach(point => {
  assertClose(point.vReaction, 1 + 3 * point.t, 1e-11, "Diferenças em malha irregular recuperam a derivada quadrática em t=" + point.t);
  assertClose(quadratic.spline(point.t).deriv / 2, point.vReaction, 1e-11, "Tangente e tabela concordam na malha irregular em t=" + point.t);
});
assertClose(quadratic.stats.vGlobal, 14.5, 1e-11, "Média global usa os extremos em malha irregular");

function makeRateExperiment(concentrations, rate, t0 = 0) {
  const nu = 2;
  const points = [0, 0.5, 2.75].map(t => ({ t: t0 + t, conc: 0.015 + nu * rate * t }));
  return { initialConcentrations: concentrations, analysis: analyzeExperiment(points, { nu }) };
}

const designs = [[0.1, 0.07], [0.2, 0.07], [0.1, 0.3], [0.14, 0.5], [0.41, 0.13]];
const trials = designs.map(([a, b]) => makeRateExperiment([a, b], 0.4 * a ** 0.5 * b ** 2));
const fit = fitInitialRateLaw(trials, 2);
assert(fit.success, "Regressão QR recebe velocidades calculadas diretamente das séries");
assertClose(fit.orders[0], 0.5, 1e-10, "Regressão recupera ordem parcial fracionária");
assertClose(fit.orders[1], 2, 1e-10, "Regressão recupera a segunda ordem parcial");
assertClose(fit.globalOrder, 2.5, 1e-10, "Regressão calcula a ordem global");
assertClose(fit.k, 0.4, 1e-10, "Regressão recupera k");
assert(fit.unit === "(mol/L)^-1,5 · s⁻¹", "Unidade de k acompanha a ordem fracionária");
assert(kineticConstantUnit(0) === "mol·L⁻¹·s⁻¹" && kineticConstantUnit(1) === "s⁻¹" &&
  kineticConstantUnit(2) === "L·mol⁻¹·s⁻¹", "Unidades corretas para ordens zero, um e dois");
assert(fit.degreesOfFreedom === 2, "Graus de liberdade descontam intercepto e ordens");
assertClose(fit.r2, 1, 1e-10, "R² logarítmico do conjunto sintético é 1");
assert(!fitInitialRateLaw(trials.slice(0, 2), 2).success, "Quantidade insuficiente de ensaios impede o ajuste");
const collinear = [1, 2, 4, 8].map(a => makeRateExperiment([a, a ** 2], 0.5 * a));
assert(/posto/i.test(fitInitialRateLaw(collinear, 2).error), "QR identifica concentrações colineares no espaço logarítmico");
const nearCollinear = [1, 2, 4, 8, 16].map((a, i) => makeRateExperiment([a, a ** 2 * (1 + 1e-10 * (i % 2))], 0.5 * a));
assert(!fitInitialRateLaw(nearCollinear, 2).success, "QR rejeita concentrações quase colineares");
assert(!fitInitialRateLaw([makeRateExperiment([1], 0.5, 1), makeRateExperiment([2], 1)], 1).success, "Série iniciada após t = 0 é inválida para v₀");
assert(!fitInitialRateLaw([makeRateExperiment([1], 0), makeRateExperiment([2], 1)], 1).success, "Velocidade inicial zero é rejeitada na regressão logarítmica");

console.log(`\n🎉 SUCESSO: Todos os ${passed}/${total} testes unitários passaram perfeitamente!`);
