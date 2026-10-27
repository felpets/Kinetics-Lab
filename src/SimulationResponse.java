import java.util.List;
import java.util.Map;

public record SimulationResponse(double temperatureK, double rateConstant, double halfLife,
        double initialVelocity, List<Map<String, Object>> series,
        List<Map<String, Object>> temperatureSeries) {}
