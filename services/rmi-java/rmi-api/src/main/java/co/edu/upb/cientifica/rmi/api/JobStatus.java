package co.edu.upb.cientifica.rmi.api;

import java.io.Serializable;
import java.time.Instant;

public class JobStatus implements Serializable {

    private static final long serialVersionUID = 1L;

    public enum State {
        QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    }

    private String jobId;
    private State state;
    private String userId;
    private int progress;    // 0-100
    private String message;
    private Instant submittedAt;
    private Instant finishedAt;

    public JobStatus() {}

    public JobStatus(String jobId, State state, String userId) {
        this.jobId = jobId;
        this.state = state;
        this.userId = userId;
        this.submittedAt = Instant.now();
    }

    // --- Getters y Setters ---
    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }

    public State getState() { return state; }
    public void setState(State state) { this.state = state; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public int getProgress() { return progress; }
    public void setProgress(int progress) { this.progress = progress; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Instant getSubmittedAt() { return submittedAt; }
    public Instant getFinishedAt() { return finishedAt; }
    public void setFinishedAt(Instant finishedAt) { this.finishedAt = finishedAt; }
}