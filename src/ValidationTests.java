public final class ValidationTests {
    private static int passed;
    public static void main(String[] args) {
        test("Ea zero: k = A0", () -> close(ReactionModel.rateConstant(123, 0, 25), 123, 1e-12));
        double k = ReactionModel.rateConstant(1_000_000, 50, 25);
        test("Referência de k", () -> close(k, 0.001737, 2e-5));
        test("Concentração em t=0", () -> close(ReactionModel.reactant(1, k, 0), 1, 1e-12));
        test("Meia-vida", () -> close(ReactionModel.reactant(1, k, ReactionModel.halfLife(k)), .5, 1e-12));
        test("Conservação A+B", () -> { double a = ReactionModel.reactant(2, k, 90); close(a + ReactionModel.product(2, .3, a), 2.3, 1e-12); });
        test("Temperatura aumenta k", () -> check(ReactionModel.rateConstant(1e6, 50, 35) > k));
        test("A não aumenta", () -> check(ReactionModel.reactant(1, k, 20) <= ReactionModel.reactant(1, k, 10)));
        test("B não diminui", () -> check(ReactionModel.product(1, 0, ReactionModel.reactant(1, k, 20)) >= ReactionModel.product(1, 0, ReactionModel.reactant(1, k, 10))));
        test("Velocidade inicial", () -> close(ReactionModel.velocity(k, 1), k, 1e-12));
        test("Validação rejeita energia negativa", () -> reject(new SimulationRequest(25, -1, 1e6, 1, 0, 300)));
        test("Validação rejeita temperatura absoluta inválida", () -> reject(new SimulationRequest(-273.15, 50, 1e6, 1, 0, 300)));
        System.out.println("\n" + passed + " testes aprovados.");
    }
    private static void test(String name, Runnable test) { test.run(); passed++; System.out.println("[OK] " + name); }
    private static void close(double actual, double expected, double tolerance) { check(Math.abs(actual - expected) <= tolerance); }
    private static void check(boolean value) { if (!value) throw new AssertionError("Condição não atendida"); }
    private static void reject(SimulationRequest request) { try { request.validate(); throw new AssertionError("Valor deveria ser rejeitado"); } catch (IllegalArgumentException expected) {} }
}
