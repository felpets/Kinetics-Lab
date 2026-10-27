import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class Json {
    private Json() {}

    public static Object parse(String text) {
        Parser parser = new Parser(text);
        Object value = parser.value();
        parser.space();
        if (parser.index != text.length()) throw new IllegalArgumentException("JSON inválido.");
        return value;
    }

    public static String stringify(Object value) {
        if (value == null) return "null";
        if (value instanceof String s) return quote(s);
        if (value instanceof Number || value instanceof Boolean) return value.toString();
        if (value instanceof SimulationResponse r) return stringify(Map.of(
                "temperatureK", r.temperatureK(), "rateConstant", r.rateConstant(), "halfLife", r.halfLife(),
                "initialVelocity", r.initialVelocity(), "series", r.series(), "temperatureSeries", r.temperatureSeries()));
        if (value instanceof Map<?, ?> map) {
            StringBuilder out = new StringBuilder("{"); boolean first = true;
            for (var entry : map.entrySet()) {
                if (!first) out.append(','); first = false;
                out.append(quote(String.valueOf(entry.getKey()))).append(':').append(stringify(entry.getValue()));
            }
            return out.append('}').toString();
        }
        if (value instanceof Iterable<?> list) {
            StringBuilder out = new StringBuilder("["); boolean first = true;
            for (Object item : list) { if (!first) out.append(','); first = false; out.append(stringify(item)); }
            return out.append(']').toString();
        }
        throw new IllegalArgumentException("Tipo JSON não suportado.");
    }

    private static String quote(String value) {
        StringBuilder out = new StringBuilder("\"");
        for (char c : value.toCharArray()) {
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> { if (c < 32) out.append(String.format("\\u%04x", (int)c)); else out.append(c); }
            }
        }
        return out.append('"').toString();
    }

    private static final class Parser {
        private final String text; private int index;
        Parser(String text) { this.text = text; }
        void space() { while (index < text.length() && Character.isWhitespace(text.charAt(index))) index++; }
        Object value() {
            space(); if (index >= text.length()) throw new IllegalArgumentException("JSON vazio.");
            return switch (text.charAt(index)) {
                case '{' -> object(); case '[' -> array(); case '"' -> string();
                case 't' -> literal("true", true); case 'f' -> literal("false", false); case 'n' -> literal("null", null);
                default -> number();
            };
        }
        Object literal(String token, Object value) {
            if (!text.startsWith(token, index)) throw new IllegalArgumentException("JSON inválido.");
            index += token.length(); return value;
        }
        Map<String, Object> object() {
            Map<String, Object> map = new LinkedHashMap<>(); index++; space();
            if (take('}')) return map;
            do { space(); String key = string(); space(); require(':'); map.put(key, value()); space(); } while (take(','));
            require('}'); return map;
        }
        List<Object> array() {
            List<Object> list = new ArrayList<>(); index++; space();
            if (take(']')) return list;
            do { list.add(value()); space(); } while (take(','));
            require(']'); return list;
        }
        String string() {
            require('"'); StringBuilder out = new StringBuilder();
            while (index < text.length()) {
                char c = text.charAt(index++);
                if (c == '"') return out.toString();
                if (c == '\\') {
                    if (index >= text.length()) break;
                    char e = text.charAt(index++);
                    if (e == 'u') { out.append((char)Integer.parseInt(text.substring(index, index + 4), 16)); index += 4; }
                    else out.append(switch (e) { case 'n' -> '\n'; case 'r' -> '\r'; case 't' -> '\t'; case 'b' -> '\b'; case 'f' -> '\f'; default -> e; });
                } else out.append(c);
            }
            throw new IllegalArgumentException("String JSON inválida.");
        }
        Number number() {
            int start = index;
            while (index < text.length() && "-+0123456789.eE".indexOf(text.charAt(index)) >= 0) index++;
            try { return Double.parseDouble(text.substring(start, index)); }
            catch (RuntimeException e) { throw new IllegalArgumentException("Número JSON inválido."); }
        }
        boolean take(char c) { space(); if (index < text.length() && text.charAt(index) == c) { index++; return true; } return false; }
        void require(char c) { if (!take(c)) throw new IllegalArgumentException("JSON inválido: esperado '" + c + "'."); }
    }
}
