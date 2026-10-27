import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class SimulationService {
    public SimulationResponse simulate(SimulationRequest request) {
        request.validate();
        double k = ReactionModel.rateConstant(request.preExponential(), request.activationEnergyKj(), request.temperatureC());
        if (!Double.isFinite(k) || k <= 0) throw new IllegalArgumentException("Os parâmetros produziram uma constante de velocidade numericamente inválida.");

        List<Map<String, Object>> points = new ArrayList<>();
        int count = 121;
        for (int i = 0; i < count; i++) {
            double t = request.totalTime() * i / (count - 1.0);
            double a = ReactionModel.reactant(request.initialA(), k, t);
            points.add(point(t, a, ReactionModel.product(request.initialA(), request.initialB(), a), ReactionModel.velocity(k, a)));
        }

        List<Map<String, Object>> temperatures = new ArrayList<>();
        for (double offset : new double[] {-10, 0, 10}) {
            double temp = request.temperatureC() + offset;
            if (temp <= -273.15) continue;
            double scenarioK = ReactionModel.rateConstant(request.preExponential(), request.activationEnergyKj(), temp);
            List<Map<String, Object>> values = new ArrayList<>();
            for (int i = 0; i < count; i++) {
                double t = request.totalTime() * i / (count - 1.0);
                values.add(Map.of("t", t, "a", ReactionModel.reactant(request.initialA(), scenarioK, t)));
            }
            temperatures.add(Map.of("temperatureC", temp, "k", scenarioK, "values", values));
        }

        return new SimulationResponse(request.temperatureC() + 273.15, k, ReactionModel.halfLife(k),
                ReactionModel.velocity(k, request.initialA()), points, temperatures);
    }

    private Map<String, Object> point(double t, double a, double b, double velocity) {
        Map<String, Object> point = new LinkedHashMap<>();
        point.put("t", t); point.put("a", a); point.put("b", b); point.put("velocity", velocity);
        return point;
    }
}
