package co.edu.upb.cientifica.rmi.server;

import co.edu.upb.cientifica.rmi.api.JobOrchestratorService;

import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;

public class ServerMain {
    public static void main(String[] args) throws Exception {
        int port = 1099;

        // Crear el Registry
        Registry registry = LocateRegistry.createRegistry(port);

        // Crear e registrar la implementación
        JobOrchestratorService service = new JobOrchestratorImpl();
        registry.rebind("JobOrchestrator", service);

        System.out.printf("=== RMI Server corriendo en puerto %d ===%n", port);
        System.out.println("Servicio registrado: JobOrchestrator");
        System.out.println("Presiona Ctrl+C para detener.");

        // Mantener el servidor vivo
        Thread.currentThread().join();
    }
}