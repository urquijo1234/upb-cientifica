package co.edu.upb.cientifica.rmi.api;

import java.io.Serializable;
import java.util.List;

public class JobResult implements Serializable {

    private static final long serialVersionUID = 1L;

    private String jobId;
    private String stdout;
    private String stderr;
    private int exitCode;
    private List<String> outputFiles;  // Rutas en el Home del usuario
    private long executionTimeMs;

    public JobResult() {}

    // --- Getters y Setters ---
    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }

    public String getStdout() { return stdout; }
    public void setStdout(String stdout) { this.stdout = stdout; }

    public String getStderr() { return stderr; }
    public void setStderr(String stderr) { this.stderr = stderr; }

    public int getExitCode() { return exitCode; }
    public void setExitCode(int exitCode) { this.exitCode = exitCode; }

    public List<String> getOutputFiles() { return outputFiles; }
    public void setOutputFiles(List<String> outputFiles) { this.outputFiles = outputFiles; }

    public long getExecutionTimeMs() { return executionTimeMs; }
    public void setExecutionTimeMs(long executionTimeMs) { this.executionTimeMs = executionTimeMs; }
}