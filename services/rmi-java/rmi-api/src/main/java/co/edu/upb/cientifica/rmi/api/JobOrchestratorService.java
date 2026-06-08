package co.edu.upb.cientifica.rmi.api;

import java.rmi.Remote;
import java.rmi.RemoteException;

/**
 * Contrato RMI para el orquestador de trabajos MPI.
 * Los clientes (Node.js vía bridge HTTP, o Java directo)
 * usan esta interfaz para interactuar con el clúster HPC.
 */
public interface JobOrchestratorService extends Remote {

    /**
     * Envía un trabajo MPI al clúster.
     * @return ID del trabajo creado
     */
    JobStatus submitJob(JobSpec spec) throws RemoteException;

    /**
     * Consulta el estado de un trabajo.
     */
    JobStatus getJobStatus(String jobId) throws RemoteException;

    /**
     * Cancela un trabajo en cola o en ejecución.
     * @return true si se canceló exitosamente
     */
    boolean cancelJob(String jobId) throws RemoteException;

    /**
     * Recupera los resultados de un trabajo finalizado.
     */
    JobResult getJobResult(String jobId) throws RemoteException;
}