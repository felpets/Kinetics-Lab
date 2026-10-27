public final class ReactionModel {
    public static final double GAS_CONSTANT = 8.314462618;

    private ReactionModel() {}

    public static double rateConstant(double preExponential, double activationKj, double temperatureC) {
        double kelvin = temperatureC + 273.15;
        return preExponential * Math.exp(-(activationKj * 1000.0) / (GAS_CONSTANT * kelvin));
    }

    public static double reactant(double initialA, double k, double time) {
        return initialA * Math.exp(-k * time);
    }

    public static double product(double initialA, double initialB, double reactant) {
        return initialB + initialA - reactant;
    }

    public static double velocity(double k, double reactant) {
        return k * reactant;
    }

    public static double halfLife(double k) {
        return Math.log(2.0) / k;
    }
}
