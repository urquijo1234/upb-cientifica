package co.edu.upb.cientifica.rmi.bridge;

import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.google.gson.Gson;

import co.edu.upb.cientifica.rmi.api.JobOrchestratorService;
import co.edu.upb.cientifica.rmi.api.JobResult;
import co.edu.upb.cientifica.rmi.api.JobSpec;
import co.edu.upb.cientifica.rmi.api.JobStatus;
import co.edu.upb.cientifica.rmi.api.security.JwtValidator;
import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.json.JavalinJackson;
import io.jsonwebtoken.JwtException;

public class BridgeApp {

    private static final Gson gson = new Gson();
    private static JwtValidator jwtValidator;

    public static void main(String[] args) throws Exception {
        // Cargar el validador JWT
        // Cambia la línea de publicKeyPath por esta:
String projectRoot = "D:/Documents/dsystems/upb-cientifica";
String publicKeyPath = projectRoot + "/infrastructure/keys/jwt_public.pem";
jwtValidator = new JwtValidator(publicKeyPath);
        System.out.println("Clave pública JWT cargada");

        // Conectar al RMI Registry
        Registry registry = LocateRegistry.getRegistry("localhost", 1099);
        JobOrchestratorService orchestrator =
                (JobOrchestratorService) registry.lookup("JobOrchestrator");

        System.out.println("Conectado al RMI Server");

        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());

        Javalin app = Javalin.create(config -> {
            config.jsonMapper(new JavalinJackson(mapper));
        }).start(7071);

        // Middleware de auth: aplica a todas las rutas /jobs/*
        app.before("/jobs/*", BridgeApp::authMiddleware);
        app.before("/jobs", BridgeApp::authMiddleware);

        // POST /jobs — enviar trabajo
        app.post("/jobs", ctx -> {
            JobSpec spec = gson.fromJson(ctx.body(), JobSpec.class);
            // Forzar el userId del JWT (no del body)
            JwtValidator.ValidatedClaims user = ctx.attribute("user");
            spec.setUserId(user.uid);

            JobStatus status = orchestrator.submitJob(spec);
            ctx.json(status);
        });

        app.get("/jobs/{id}/status", ctx -> {
            String id = ctx.pathParam("id");
            if (!id.startsWith("job_")) {
                id = "job_" + id;
            }
            JobStatus status = orchestrator.getJobStatus(id);
            ctx.json(status);
        });

        app.get("/jobs/{id}/result", ctx -> {
            JobResult result = orchestrator.getJobResult(ctx.pathParam("id"));
            ctx.json(result);
        });

        app.delete("/jobs/{id}", ctx -> {
            boolean ok = orchestrator.cancelJob(ctx.pathParam("id"));
            ctx.json(java.util.Map.of("cancelled", ok));
        });

        // Health PÚBLICO
        app.get("/health", ctx -> ctx.json(
                java.util.Map.of("status", "ok", "service", "rmi-rest-bridge")
        ));

        System.out.println("REST Bridge corriendo en http://localhost:7071");
    }

    /**
     * Middleware que valida JWT en el header Authorization.
     */
    private static void authMiddleware(Context ctx) {
        String authHeader = ctx.header("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            ctx.status(401).json(java.util.Map.of(
                    "error", "No autenticado",
                    "message", "Se requiere header Authorization: Bearer <jwt>"
            ));
            throw new io.javalin.http.UnauthorizedResponse("Sin JWT");
        }

        String token = authHeader.substring(7);
        try {
            JwtValidator.ValidatedClaims claims = jwtValidator.validate(token);
            ctx.attribute("user", claims);
        } catch (JwtException e) {
            ctx.status(401).json(java.util.Map.of(
                    "error", "JWT inválido",
                    "message", e.getMessage()
            ));
            throw new io.javalin.http.UnauthorizedResponse("JWT inválido: " + e.getMessage());
        }
    }
}