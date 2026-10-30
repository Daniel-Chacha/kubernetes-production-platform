# TaskFlow — Monitoring and Observability

## 1. Overview

TaskFlow uses Prometheus, Grafana, and Alertmanager to monitor the Django REST API and provide operational visibility.

The monitoring stack runs in the Kubernetes `monitoring` namespace, while the application workloads run in the `portfolio` namespace.

The monitoring architecture provides:
- Application and process metrics through Django Prometheus instrumentation.
- Periodic metric collection using Prometheus.
- Dashboards and visualizations using Grafana.
- Alert evaluation using Prometheus alerting rules.
- Email notification delivery through Alertmanager and Gmail SMTP.
- Persistent storage for monitoring data.

## 2. Monitoring Architecture

```text
                     Django REST API
                     /metrics endpoint
                            |
                            |
                   Prometheus Scraper
                    Every 15 seconds
                            |
             +--------------+--------------+
             |                             |
             v                             v
      Prometheus TSDB             Alert Evaluation
      Persistent PVC              Prometheus Rules
                                           |
                                           v
                                      Alertmanager
                                           |
                                           v
                                       Gmail SMTP
                                           |
                                           v
                                      Email Alerts


                     Prometheus Data
                            |
                            v
                         Grafana
                            |
                            v
                TaskFlow API Dashboard

```

## 3. Prometheus

Prometheus collects metrics from the Django API through its internal Kubernetes Service.

### Configuration

| Setting | Value |
| --- | --- |
| Namespace | `monitoring` |
| Deployment | `prometheus` |
| Service | `prometheus` |
| Service port | `9000` |
| Container port | `9090` |
| Scrape interval | `15s` |
| Evaluation interval | `15s` |
| Metrics retention | `7 days` |
| Metrics endpoint | `/metrics` |

The API scrape target is:
`task-api.portfolio.svc.cluster.local:80`

Prometheus also scrapes its own metrics through `localhost:9090`.

### Storage

Prometheus stores time-series data in its `/prometheus` directory, which is backed by the `prometheus-data` PersistentVolumeClaim. The configured retention period is seven days.

### Access

Use port forwarding to access the Prometheus interface:

```bash
kubectl port-forward -n monitoring svc/prometheus 9090:9000

```

Open: `http://localhost:9090`

### Useful Prometheus Checks

* Check whether the API target is being scraped: `http://localhost:9090/targets`
* Inspect active alert rules: `http://localhost:9090/alerts`
* Inspect available metrics: `http://localhost:9090/graph`

## 4. Grafana

Grafana provides dashboards for visualizing application metrics collected by Prometheus.

### Configuration

| Setting | Value |
| --- | --- |
| Namespace | `monitoring` |
| Deployment | `grafana` |
| Service | `grafana` |
| Service port | `3000` |
| Container port | `3000` |
| Dashboard | TaskFlow API Observability |

The Grafana administrator password is obtained from the `grafana-admin` Kubernetes Secret. Credentials should not be committed to the repository.

### Dashboard Metrics

The TaskFlow API dashboard includes:

1. API request rate
2. HTTP responses by status code
3. 95th-percentile API request latency
4. HTTP 5xx error rate
5. API process memory usage
6. API process CPU usage
7. API scrape health

### Access

Use port forwarding:

```bash
kubectl port-forward -n monitoring svc/grafana 3000:3000

```

Open: `http://localhost:3000` and sign in using the configured Grafana administrator credentials.

## 5. Alerting with Prometheus and Alertmanager

Prometheus evaluates configured alert rules and forwards firing alerts to Alertmanager.

### Configured Alert Rules

| Alert | Condition | Duration | Severity |
| --- | --- | --- | --- |
| `TaskAPIUnavailable` | API scrape is unavailable or its target is absent | 2 minutes | Critical |
| `TaskAPIHigh5xxRate` | HTTP 5xx responses exceed 5% of requests when traffic is sufficient | 5 minutes | Warning |
| `TaskAPIHighLatency` | p95 request latency exceeds 1 second | 5 minutes | Warning |

### Alert Delivery Flow

1. Prometheus collects API metrics.
2. Prometheus evaluates alerting rules.
3. When a rule condition remains true for its configured duration, Prometheus fires the alert.
4. Prometheus forwards the alert to Alertmanager.
5. Alertmanager groups and routes notifications.
6. Alertmanager sends email notifications through Gmail SMTP.

### Alertmanager Configuration

| Setting | Value |
| --- | --- |
| Namespace | `monitoring` |
| Deployment | `alertmanager` |
| Service | `alertmanager` |
| Service port | `9093` |
| SMTP server | `smtp.gmail.com:587` |
| Receiver | `gmail-email` |
| Group wait | `30s` |
| Group interval | `5m` |
| Repeat interval | `4h` |

The Gmail SMTP app password is stored in the `alertmanager-gmail` Kubernetes Secret and mounted into the Alertmanager container. The Alertmanager configuration references the mounted password file. Credentials must never be committed to Git.

Email notifications are configured to include resolved alerts.

### Access

Use port forwarding:

```bash
kubectl port-forward -n monitoring svc/alertmanager 9093:9093

```

Open: `http://localhost:9093`

## 6. Kubernetes Resources

Monitoring resources are defined under `k8s/monitoring/`.

### Prometheus

* `prometheus-deployment.yaml`
* `prometheus-svc.yaml`
* `prometheus-configmap.yaml`
* `prometheus-pvc.yaml`
* `prometheus-rules-configmap.yaml`
* `alert-rules.yaml`

### Grafana

* `grafana/deployment.yaml`
* `grafana/service.yaml`
* `grafana/pvc.yaml`

### Alertmanager

* `alertmanager/deployment.yaml`
* `alertmanager/service.yaml`
* `alertmanager/configmap.yaml`
* `alertmanager/config.yml`
* `alertmanager/pvc.yaml`

## 7. Validation and Troubleshooting

* **Check monitoring workloads:**
```bash
kubectl get pods -n monitoring
kubectl get services -n monitoring
kubectl get pvc -n monitoring

```


* **Check Prometheus targets:** Open `http://localhost:9090/targets` and confirm that the `task-api` target is healthy.
* **Check API metrics:** Forward the API Service port (`kubectl port-forward -n portfolio svc/task-api 8081:80`) and open `http://localhost:8081/metrics`.
* **Check Prometheus alerts:** Open `http://localhost:9090/alerts` to review alert states and confirm that rules are loaded.
* **Check Alertmanager:** Open `http://localhost:9093` to review active alerts and their notification status.
* **Inspect monitoring logs:**
```bash
kubectl logs -n monitoring deployment/prometheus
kubectl logs -n monitoring deployment/grafana
kubectl logs -n monitoring deployment/alertmanager

```


* **Inspect API logs:**
```bash
kubectl logs -n portfolio deployment/task-api

```


* **Validate email notifications:** A test alert can be used to verify the complete notification path (`Prometheus alert rule → Alertmanager → Gmail SMTP → email inbox`). Remove temporary test rules after validation. The Gmail notification test was previously verified for this project.

## 8. Security and Operational Considerations

* Monitoring Services use ClusterIP and are not exposed through the application Ingress.
* Access to monitoring interfaces is provided through Kubernetes port forwarding.
* Grafana credentials are stored in a Kubernetes Secret.
* Alertmanager SMTP credentials are stored in a Kubernetes Secret.
* Prometheus uses persistent storage with seven-day retention.
* Grafana and Alertmanager also use persistent storage.
* Monitoring workloads have configured CPU and memory requests and limits.
* Prometheus and Alertmanager run as non-root users.

> **Note:** Seven-day retention is configured for this local portfolio environment. Production retention should be determined by storage capacity and monitoring requirements.

## 9. Known Limitations

* The monitoring stack is deployed on a local Minikube cluster.
* Monitoring interfaces are not configured for public access.
* Prometheus retention is limited to seven days.
* The project does not currently implement enforced Kubernetes NetworkPolicies.

## 10. Related Documentation

* System Architecture
* Deployment Guide
* Operations Runbook
* CI/CD Pipeline
