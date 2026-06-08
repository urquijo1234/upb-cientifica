package co.edu.upb.cientifica.rmi.api;

import java.io.Serializable;
import java.util.List;

/**
 * Especificación de un trabajo MPI a ejecutar en el clúster.
 */
public class JobSpec implements Serializable {

    private static final long serialVersionUID = 1L;

    private String userId;
    private String language;        // "C", "C++", "Python"
    private List<String> sourceFiles;
    private List<String> dataFiles;
    private int processes;          // Número de procesos MPI
    private int nodes;              // Número de nodos
    private String mpiRuntime;      // "OpenMPI" o "MPICH"

    // --- Constructores ---
    public JobSpec() {}

    public JobSpec(String userId, String language, List<String> sourceFiles,
                   List<String> dataFiles, int processes, int nodes,
                   String mpiRuntime) {
        this.userId = userId;
        this.language = language;
        this.sourceFiles = sourceFiles;
        this.dataFiles = dataFiles;
        this.processes = processes;
        this.nodes = nodes;
        this.mpiRuntime = mpiRuntime;
    }

    // --- Getters y Setters ---
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public List<String> getSourceFiles() { return sourceFiles; }
    public void setSourceFiles(List<String> sourceFiles) { this.sourceFiles = sourceFiles; }

    public List<String> getDataFiles() { return dataFiles; }
    public void setDataFiles(List<String> dataFiles) { this.dataFiles = dataFiles; }

    public int getProcesses() { return processes; }
    public void setProcesses(int processes) { this.processes = processes; }

    public int getNodes() { return nodes; }
    public void setNodes(int nodes) { this.nodes = nodes; }

    public String getMpiRuntime() { return mpiRuntime; }
    public void setMpiRuntime(String mpiRuntime) { this.mpiRuntime = mpiRuntime; }
}