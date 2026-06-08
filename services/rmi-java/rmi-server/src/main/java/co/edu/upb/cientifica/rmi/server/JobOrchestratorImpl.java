package co.edu.upb.cientifica.rmi.server;

import co.edu.upb.cientifica.rmi.api.*;

import java.rmi.RemoteException;
import java.rmi.server.UnicastRemoteObject;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class JobOrchestratorImpl extends UnicastRemoteObject
        implements JobOrchestratorService {

    private final Map<String, JobStatus> jobs = new ConcurrentHashMap<>();
    private final Map<String, JobResult> results = new ConcurrentHashMap<>();

    public JobOrchestratorImpl() throws RemoteException {
        super();
    }

    @Override
    public JobStatus submitJob(JobSpec spec) throws RemoteException {
        String jobId = "job_" + System.currentTimeMillis();
        JobStatus status = new JobStatus(jobId, JobStatus.State.QUEUED,
                                         spec.getUserId());
        status.setMessage(String.format(
            "Job encolado: %s, %d procesos en %d nodos",
            spec.getLanguage(), spec.getProcesses(), spec.getNodes()));
        jobs.put(jobId, status);

        System.out.printf("[RMI] Job %s recibido de %s (%s, %d procs)%n",
            jobId, spec.getUserId(), spec.getLanguage(), spec.getProcesses());

        // TODO Semana 3: ejecutar mpirun real en el clúster
        // Por ahora simular que se completa
        simulateExecution(jobId, spec);

        return status;
    }

    @Override
    public JobStatus getJobStatus(String jobId) throws RemoteException {
        JobStatus status = jobs.get(jobId);
        if (status == null) {
            throw new RemoteException("Job no encontrado: " + jobId);
        }
        return status;
    }

    @Override
    public boolean cancelJob(String jobId) throws RemoteException {
        JobStatus status = jobs.get(jobId);
        if (status == null) return false;
        status.setState(JobStatus.State.CANCELLED);
        status.setMessage("Cancelado por el usuario");
        return true;
    }

    @Override
    public JobResult getJobResult(String jobId) throws RemoteException {
        JobResult result = results.get(jobId);
        if (result == null) {
            throw new RemoteException("Resultado no disponible para: " + jobId);
        }
        return result;
    }

    private void simulateExecution(String jobId, JobSpec spec) {
        // Simular en un hilo aparte
        new Thread(() -> {
            try {
                JobStatus s = jobs.get(jobId);
                s.setState(JobStatus.State.RUNNING);
                s.setProgress(50);

                Thread.sleep(2000); // Simular 2 segundos de ejecución

                s.setState(JobStatus.State.COMPLETED);
                s.setProgress(100);
                s.setFinishedAt(Instant.now());

                JobResult result = new JobResult();
                result.setJobId(jobId);
                result.setStdout("Hello from MPI process 0 of " +
                                 spec.getProcesses() + "\n");
                result.setStderr("");
                result.setExitCode(0);
                result.setOutputFiles(List.of("/home/" + spec.getUserId() +
                                              "/results/" + jobId + "/output.txt"));
                result.setExecutionTimeMs(2000);
                results.put(jobId, result);

                System.out.printf("[RMI] Job %s completado%n", jobId);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }).start();
    }
}