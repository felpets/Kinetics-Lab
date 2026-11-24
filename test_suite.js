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
  if (diff > tolerance) {
    console.error(`❌ FALHA: ${message} - Obtido: ${actual}, Esperado: ${expected} (dif: ${diff})`);
    process.exit(1);
  } else {
    passed++;
    console.log(`✅ APROVADO: ${message} (${actual})`);
  }
}

// 1. Dados do Critério de Aceitação da Seção 15
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

// Verificação das taxas médias da Seção 15
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

console.log(`\n🎉 SUCESSO: Todos os ${passed}/${total} testes unitários passaram perfeitamente!`);
