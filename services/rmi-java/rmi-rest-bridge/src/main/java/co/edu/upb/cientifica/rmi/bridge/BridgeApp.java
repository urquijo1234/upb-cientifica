package co.edu.upb.cientifica.rmi.bridge;

import co.edu.upb.cientifica.rmi.api.*;
import com.google.gson.Gson;
import io.javalin.Javalin;

import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;
import java.util.List;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.javalin.Javalin;
import io.javalin.json.JavalinJackson;

/**
 * Bridge HTTP/REST que traduce peticiones REST a llamadas RMI.
 * Node.js llama a este bridge por HTTP, y el bridge llama al RMI Server.
 */
public class BridgeApp {

    private static final Gson gson = new Gson();

    public static void main(String[] args) throws Exception {
        // Conectar al RMI Registry
        Registry registry = LocateRegistry.getRegistry("localhost", 1099);
        JobOrchestratorService orchestrator =
            (JobOrchestratorService) registry.lookup("JobOrchestrator");

        System.out.println("Conectado al RMI Server");

ObjectMapper mapper = new ObjectMapper();
mapper.registerModule(new JavaTimeModule()); // <--- ¡Esta es la clave!

Javalin app = Javalin.create(config -> {
    config.jsonMapper(new JavalinJackson(mapper));
}).start(7070);

        // POST /jobs — enviar trabajo
        app.post("/jobs", ctx -> {
            JobSpec spec = gson.fromJson(ctx.body(), JobSpec.class);
            JobStatus status = orchestrator.submitJob(spec);
            ctx.json(status);
        });

        // GET /jobs/:id/status
       app.get("/jobs/{id}/status", ctx -> {
    String id = ctx.pathParam("id");
    // Si el usuario no puso el prefijo, se lo agregamos automáticamente
    if (!id.startsWith("job_")) {
        id = "job_" + id;
    }
    JobStatus status = orchestrator.getJobStatus(id);
    ctx.json(status);
});

        // GET /jobs/:id/result
        app.get("/jobs/{id}/result", ctx -> {
            JobResult result = orchestrator.getJobResult(ctx.pathParam("id"));
            ctx.json(result);
        });

        // DELETE /jobs/:id — cancelar
        app.delete("/jobs/{id}", ctx -> {
            boolean ok = orchestrator.cancelJob(ctx.pathParam("id"));
            ctx.json(java.util.Map.of("cancelled", ok));
        });

        // Health
        app.get("/health", ctx -> ctx.json(
            java.util.Map.of("status", "ok", "service", "rmi-rest-bridge")
        ));

        System.out.println("REST Bridge corriendo en http://localhost:7070");
    }
}