# Contratos RMI

Las interfaces Remote están en:
`services/rmi-java/rmi-api/src/main/java/co/edu/upb/cientifica/rmi/api/`

## Operaciones del Service Bus (RMI)

| Método | Descripción |
|--------|-------------|
| submitJob(JobSpec) | Envía un trabajo MPI al clúster |
| getJobStatus(jobId) | Consulta estado del trabajo |
| cancelJob(jobId) | Cancela un trabajo en cola o ejecución |
| getJobResult(jobId) | Recupera resultados (stdout, stderr, archivos) |