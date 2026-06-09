# Bitácora Semana 1 — UPB-CIENTÍFICA

**Período:** 3 al 9 de junio de 2026
**Hito:** Infraestructura Base e Interoperabilidad
**Estado:**  Completado

## 1. Resumen ejecutivo

Durante la primera semana se materializó la infraestructura base del
proyecto, completando los 6 puntos del Hito 1:

- Active Directory aprovisionado sobre Samba en Ubuntu Server
- SOAP Server PHP funcionando contra AD real (LDAP bind)
- Web Server Node.js con frontend navegable
- Contratos gRPC (.proto) con los 4 modos de streaming
- Interfaces RMI Java + REST Bridge para Node.js
- Repositorio GitHub configurado con GitFlow, Kanban y plantillas

## 2. Actividades por integrante

### Joseph Camilo Urquijo Bautista (Director / Backend gRPC Go)
- Diseño del archivo `filesync.proto` con los 4 modos de streaming
- Implementación del servidor gRPC en Go con mocks
- Generación de stubs Go con protoc
- Coordinación del repositorio y la estructura monorepo
- Configuración del tablero GitHub Projects
- **Porcentaje de avance personal:** 100%

### Jan Dante Leal Arenas (Tech Lead / RMI Java)
- Diseño de las interfaces Remote: `JobOrchestratorService`,
  `JobSpec`, `JobStatus`, `JobResult`
- Implementación del RMI Server con simulación de jobs MPI
- REST Bridge con Javalin para consumo desde Node.js
- **Porcentaje de avance personal:** 100%

### Jeison Steven Flórez Julio (Frontend / Web Node.js)
- Setup del Web Server con Express
- Vistas EJS: login y dashboard
- Cliente SOAP integrado con strong-soap
- Cliente HTTP del REST Bridge RMI
- **Porcentaje de avance personal:** 100%

### Ruben Santiago Blandon Ardila (Backend / SOAP PHP)
- Setup del SOAP Server con SoapServer nativo de PHP
- Publicación inicial del WSDL contractual
- Implementación de las 4 operaciones con mocks
- Migración de mocks a LDAP real contra Samba AD
- Emisión de JWT con firebase/php-jwt
- **Porcentaje de avance personal:** 100%

### Leyder Steven Ortiz Jaimes (DevOps / Seguridad)
- Aprovisionamiento de la VM Ubuntu Server en el CCA
- Instalación y configuración de Samba como AD DC
- Configuración de DNS interno, Kerberos y políticas
- Creación de OUs (Investigadores, Docentes, Estudiantes, Servicios)
- Creación de usuarios y grupos de prueba
- Política de contraseñas configurada
- **Porcentaje de avance personal:** 100%

## 3. Entregables completados

| Actividad del Hito 1 | Evidencia |
|---|---|
| Active Directory aprovisionado | Captura `samba-tool user list` |
| Esquema LDAP, OUs, atributos, política de contraseñas | `docs/bitacoras/semana-01/ad-config.txt` |
| SOAP Server PHP + WSDL | `services/soap-php/` + `contracts/wsdl/` |
| Web Server Node.js navegable | `services/web-node/` |
| Archivos .proto con 4 streamings | `contracts/proto/filesync/v1/filesync.proto` |
| Interfaces RMI Java + Registry | `services/rmi-java/rmi-api/` |
| Repositorio GitHub + GitFlow + Kanban | https://github.com/urquijo1234/upb-cientifica |
| Plantillas de Issues y PRs | `.github/` |

## 4. Métricas técnicas

- Commits en `develop`: [poner cantidad de `git log --oneline | wc -l`]
- Servicios corriendo: 4/4 (SOAP, gRPC, RMI, Web)
- Usuarios en AD: 3 (jcurquijo, lserrano, estud01) + Administrator
- OUs creadas: 4
- Grupos de seguridad: 4
- Endpoints expuestos:
  - SOAP: http://localhost:8080
  - gRPC: localhost:50051
  - RMI: localhost:1099
  - RMI REST Bridge: http://localhost:7070
  - Web: http://localhost:3000

## 5. Decisiones técnicas

- **Samba AD en vez de Windows Server AD:** Samba es software libre,
  cumple con el requisito de licenciamiento abierto, e implementa el
  protocolo AD completo.
- **JWT HS256 (no RS256) en esta fase:** simplificación para el
  desarrollo. Migrar a RS256 en semana 2 según NFR-08.
- **REST Bridge para RMI:** Node.js no habla RMI nativo. El bridge
  Javalin traduce REST → RMI sin sacrificar el requisito del Charter.

## 6. Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Cambio de IP en la VM del AD | Media | Alta | IP fija ya configurada |
| Pérdida de la VM | Baja | Alta | Snapshot semanal en VMware |
| Indisponibilidad del lab | Media | Alta | Mocks como fallback en SOAP |

## 7. Próxima iteración (Semana 2)

- Implementar Shared File, File Sync, Photo Album, Streaming
- Cifrado GPG de backups
- Migración JWT a RS256
- Tests de integración

## 8. Anexos

- ad-config.txt — Salida de samba-tool con OUs, usuarios, grupos, política
- screenshots/ — Capturas de pantalla del flujo end-to-end