import java.util.Map;

public record SimulationRequest(
        double temperatureC, double activationEnergyKj, double preExponential,
        double initialA, double initialB, double totalTime) {

    public static SimulationRequest fromJson(Object value) {
        if (!(value instanceof Map<?, ?> map)) throw new IllegalArgumentException("O corpo deve ser um objeto JSON.");
        return new SimulationRequest(
                number(map, "temperatureC"), number(map, "activationEnergyKj"),
                number(map, "preExponential"), number(map, "initialA"),
                number(map, "initialB"), number(map, "totalTime"));
    }

    private static double number(Map<?, ?> map, String key) {
        Object value = map.get(key);
        if (!(value instanceof Number number) || !Double.isFinite(number.doubleValue())) {
            throw new IllegalArgumentException("Campo ausente ou inválido: " + key);
        }
        return number.doubleValue();
    }

    public void validate() {
        if (temperatureC <= -273.15 || temperatureC > 1000) throw new IllegalArgumentException("A temperatura deve estar entre -273,15 °C e 1000 °C.");
        if (activationEnergyKj < 0 || activationEnergyKj > 1000) throw new IllegalArgumentException("A energia de ativação deve estar entre 0 e 1000 kJ/mol.");
        if (preExponential <= 0 || preExponential > 1e30) throw new IllegalArgumentException("O fator pré-exponencial deve ser positivo e finito.");
        if (initialA < 0 || initialA > 1e6 || initialB < 0 || initialB > 1e6) throw new IllegalArgumentException("As concentrações devem ser não negativas.");
        if (totalTime <= 0 || totalTime > 1e9) throw new IllegalArgumentException("O tempo total deve ser positivo.");
    }
}
