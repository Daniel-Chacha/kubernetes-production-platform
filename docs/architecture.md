# TaskFlow — System Architecture

## 1. Overview

TaskFlow is a containerized task-management application deployed on Kubernetes.
It consists of a Next.js frontend, a Django REST API, and a PostgreSQL database.

The application runs in the `portfolio` namespace. Its monitoring stack runs
separately in the `monitoring` namespace and consists of Prometheus, Grafana,
and Alertmanager.

The application is accessed through an NGINX Ingress using HTTPS.

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Backend | Python, Django REST Framework |
| Database | PostgreSQL 17 |
| Containerization | Docker |
| Orchestration | Kubernetes (Minikube) |
| Ingress | NGINX Ingress Controller |
| Local TLS | mkcert |
| Metrics collection | Prometheus |
| Dashboards | Grafana |
| Alerting | Prometheus Alertmanager |
| CI | GitHub Actions |
| Image registry | GitHub Container Registry |
| Image vulnerability scanning | Trivy |

## 3. Application Request Flow

The application request path is:

1. A user opens `https://taskflow.test`.
2. NGINX Ingress receives the HTTPS request and terminates TLS using
   the `taskflow-tls` Kubernetes Secret.
3. The Ingress routes application traffic to the `task-frontend`
   ClusterIP Service.
4. The frontend runs in a Next.js container listening on port 3000.
5. The frontend is configured to reach the backend through
   `http://task-api.portfolio.svc.cluster.local`.
6. The `task-api` ClusterIP Service forwards traffic to the Django
   container on port 8000.
7. Django connects to PostgreSQL through the `task-postgres` Service
   on port 5432.

### Logical architecture

```text
                    User Browser
                         |
                         | HTTPS
                         v
             NGINX Ingress Controller
                taskflow.test
                         |
                         |
                         v
             task-frontend Service
                    Port 80
                         |
                         |
                         v
              Next.js Frontend Pod
                    Port 3000
                         |
                         | Internal HTTP
                         v
                task-api Service
                    Port 80
                         |
                         |
                         v
                Django API Pod
                    Port 8000
                         |
                         | PostgreSQL protocol
                         v
            task-postgres Service
                  Port 5432
                         |
                         |
                         v
                PostgreSQL Pod
                         |
                         |
                         v
           task-postgres-data PVC

```

## 4. Kubernetes Organization

### Application namespace: `portfolio`

| Resource | Purpose |
| --- | --- |
| `task-frontend` Deployment | Runs the Next.js frontend |
| `task-frontend` Service | Exposes the frontend internally |
| `task-api` Deployment | Runs the Django REST API |
| `task-api` Service | Exposes the API internally |
| `task-postgres` Deployment | Runs PostgreSQL |
| `task-postgres` Service | Provides internal database connectivity |
| `task-postgres-data` PVC | Persists PostgreSQL data |
| `task-api-data` PVC | Mounted by the API at `/data` |
| `task-api-config` ConfigMap | Provides non-sensitive API configuration |
| `task-api-secret` Secret | Provides the Django secret key |
| `task-postgres-secret` Secret | Provides PostgreSQL credentials |
| `taskflow-ingress` Ingress | Routes HTTPS application traffic |
| `taskflow-tls` Secret | Holds the Ingress TLS certificate and key |

### Monitoring namespace: `monitoring`

| Component | Purpose |
| --- | --- |
| Prometheus | Scrapes metrics and evaluates alert rules |
| Grafana | Displays monitoring dashboards |
| Alertmanager | Receives and routes Prometheus alerts |
| PersistentVolumeClaims | Persist monitoring data |

Application and monitoring workloads are separated by Kubernetes namespaces.

## 5. Database Configuration and Persistence

The Django application selects its database backend through the `DB_ENGINE` environment variable.

The Kubernetes API ConfigMap sets:

* `DB_ENGINE=postgres`
* `DB_NAME=taskflow`
* `DB_HOST=task-postgres`
* `DB_PORT=5432`

The API Deployment obtains the database username and password from the `task-postgres-secret` Kubernetes Secret.

PostgreSQL runs as a separate Deployment and uses the `task-postgres-data` PersistentVolumeClaim for its data directory.

The API Deployment also mounts `task-api-data` at `/data`. The active Kubernetes database configuration selects PostgreSQL; the `/data` mount is not the configured PostgreSQL data store.

The GitHub Actions backend CI job uses SQLite for automated checks and tests. This is a CI test configuration and is distinct from the PostgreSQL configuration used by the Kubernetes application.

## 6. Monitoring and Observability

The monitoring stack runs in the `monitoring` namespace.

### Metrics collection

* Django is instrumented with `django-prometheus` and exposes metrics at `/metrics`.
* Prometheus scrapes the API through its internal Kubernetes Service: `task-api.portfolio.svc.cluster.local:80`.
* The configured scrape interval and rule evaluation interval are both 15 seconds.

### Visualization

Grafana provides the **TaskFlow API Observability** dashboard. The dashboard includes:

* API request rate
* HTTP responses by status code
* 95th-percentile API request latency
* HTTP 5xx error rate
* API process memory usage
* API process CPU usage
* API scrape health

### Alert evaluation and delivery

* Prometheus evaluates alert rules for API unavailability, elevated HTTP 5xx response rates, and high API request latency.
* Prometheus forwards alerts to Alertmanager at `alertmanager.monitoring.svc.cluster.local:9093`.
* Alertmanager is configured with Gmail SMTP for email notifications.
* The SMTP app password is mounted from a Kubernetes Secret rather than stored directly in the Deployment.

### Monitoring persistence

Prometheus uses persistent storage and has a configured time-series retention period of seven days. Grafana and Alertmanager also use PersistentVolumeClaims.

## 7. Security Controls

The application manifests implement the following controls:

* API and frontend containers run as non-root users.
* API and frontend containers disable privilege escalation.
* API and frontend containers drop all Linux capabilities.
* API and frontend Pods disable automatic service-account token mounting.
* Database credentials and the Django secret key are referenced through Kubernetes Secrets.
* Grafana's administrator password is referenced through a Kubernetes Secret.
* Alertmanager's SMTP app password is mounted from a Kubernetes Secret.
* The Ingress redirects HTTP traffic to HTTPS.
* Monitoring Services use ClusterIP rather than public Ingress exposure.

The API runs as UID/GID 999. The frontend runs as UID 1001.

> **Note:** NetworkPolicy enforcement is not included in this project because the current Minikube CNI setup does not provide the required enforcement. This is a documented limitation rather than an implemented security control.

## 8. CI/CD Architecture

GitHub Actions provides the CI pipeline. The CI workflow runs:

1. Django system checks and backend tests.
2. Frontend linting and production build.
3. Backend and frontend Docker image builds.
4. Trivy vulnerability scans for HIGH and CRITICAL findings.
5. Image publication to GitHub Container Registry after successful checks and scans on pushes to master.

Images are published with commit-SHA tags and a `latest` tag.

A separate deployment workflow runs on a self-hosted Linux x64 runner. It checks the deployment environment, captures the currently deployed image references, deploys the commit-SHA images, waits for rollouts, and checks the HTTPS application endpoint.

The deployment workflow includes a failure handler that attempts to restore the previously captured image references and verify application health.

## 9. Operational Boundaries and Limitations

* The application is deployed to a local Minikube environment.
* The hostname `taskflow.test` is intended for local access.
* The TLS certificate is intended for the local development environment.
* Monitoring interfaces are accessed through Kubernetes port forwarding.
* The monitoring stack uses seven-day Prometheus retention.
* NetworkPolicy enforcement is not implemented in this cluster.
* The deployment workflow depends on the self-hosted runner being available.

## 10. Related Documentation

* Monitoring and Observability
* Deployment Guide
* Operations Runbook
* CI/CD Pipeline
