import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.concurrent.Executors;

public final class Main {
    private static final Path PUBLIC = Path.of("public").toAbsolutePath().normalize();
    private static final SimulationService SERVICE = new SimulationService();

    public static void main(String[] args) throws IOException {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.createContext("/api/health", exchange -> json(exchange, 200, Map.of("status", "ready", "service", "Kinetics Lab")));
        server.createContext("/api/simulate", Main::simulate);
        server.createContext("/", Main::staticFile);
        server.setExecutor(Executors.newFixedThreadPool(Math.max(4, Runtime.getRuntime().availableProcessors())));
        Runtime.getRuntime().addShutdownHook(new Thread(() -> server.stop(1)));
        server.start();
        System.out.println("Kinetics Lab disponível em http://127.0.0.1:" + port);
    }

    private static void simulate(HttpExchange exchange) throws IOException {
        if (!"POST".equals(exchange.getRequestMethod())) { json(exchange, 405, Map.of("error", "Use o método POST.")); return; }
        try {
            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            SimulationResponse response = SERVICE.simulate(SimulationRequest.fromJson(Json.parse(body)));
            json(exchange, 200, response);
        } catch (IllegalArgumentException error) {
            json(exchange, 400, Map.of("error", error.getMessage()));
        } catch (Exception error) {
            json(exchange, 500, Map.of("error", "Falha interna ao executar a simulação."));
        }
    }

    private static void staticFile(HttpExchange exchange) throws IOException {
        if (!"GET".equals(exchange.getRequestMethod())) { exchange.sendResponseHeaders(405, -1); return; }
        String requested = exchange.getRequestURI().getPath().equals("/") ? "index.html" : exchange.getRequestURI().getPath().substring(1);
        Path file = PUBLIC.resolve(requested).normalize();
        if (!file.startsWith(PUBLIC) || !Files.isRegularFile(file)) { exchange.sendResponseHeaders(404, -1); return; }
        String type = requested.endsWith(".css") ? "text/css" : requested.endsWith(".js") ? "text/javascript" : "text/html";
        byte[] bytes = Files.readAllBytes(file);
        exchange.getResponseHeaders().set("Content-Type", type + "; charset=utf-8");
        exchange.getResponseHeaders().set("X-Content-Type-Options", "nosniff");
        exchange.sendResponseHeaders(200, bytes.length);
        try (var output = exchange.getResponseBody()) { output.write(bytes); }
    }

    private static void json(HttpExchange exchange, int status, Object value) throws IOException {
        byte[] bytes = Json.stringify(value).getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (var output = exchange.getResponseBody()) { output.write(bytes); }
    }
}
