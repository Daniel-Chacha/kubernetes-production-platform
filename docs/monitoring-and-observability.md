# TaskFlow Kubernetes Monitoring and Observability

## Overview

TaskFlow uses Prometheus and Grafana to monitor its Django REST API running in Kubernetes. Prometheus collects application and process metrics, evaluates alert rules, and retains time-series data. Grafana provides dashboards for visualizing API behavior and operational health.

## Architecture

- **Application:** Django REST API with `django-prometheus` instrumentation.
- **Metrics endpoint:** `/metrics`, exposed through the internal Kubernetes Service.
- **Metrics collection:** Prometheus scrapes the API every 15 seconds.
- **Visualization:** Grafana dashboard named `TaskFlow API Observability`.
- **Alert evaluation:** Prometheus evaluates API availability, HTTP 5xx rate, and request-latency rules.
- **Storage:** Prometheus uses a persistent volume claim with seven-day time-series retention.
- **Deployment:** Prometheus and Grafana run in the `monitoring` namespace; TaskFlow application workloads run in the `portfolio` namespace.

## Dashboard Metrics

The Grafana dashboard includes:

1. API request rate.
2. HTTP responses by status code.
3. 95th-percentile API request latency.
4. HTTP 5xx error rate.
5. API process memory usage.
6. API process CPU usage.
7. Task API scrape health.

## Alert Rules

| Alert | Condition | Duration | Severity |
|---|---|---|---|
| `TaskAPIUnavailable` | API scrape reports unavailable or its target is absent | 2 minutes | Critical |
| `TaskAPIHigh5xxRate` | HTTP 5xx responses exceed 5% of requests when traffic is sufficient | 5 minutes | Warning |
| `TaskAPIHighLatency` | p95 request latency exceeds 1 second | 5 minutes | Warning |

These rules are evaluated by Prometheus. Notification delivery requires a separately configured alert receiver and notification policy.

## Kubernetes Resources

Monitoring resources are defined under `k8s/monitoring/`, including:

- Prometheus Deployment, Service, ConfigMap, and persistent storage.
- Prometheus alert rules ConfigMap.
- Grafana Deployment, Service, and persistent storage.

## Validation

The monitoring implementation was validated by checking:

- Kubernetes monitoring pods and services.
- Persistent volume claim status.
- Prometheus API scrape target health.
- API metrics availability.
- Prometheus alert rule evaluation.
- Grafana datasource connectivity and dashboard panels.

A temporary always-firing test alert can be used to validate alert state transitions. Remove it after testing.

## Access

For local development, use Kubernetes port forwarding:

```bash
kubectl port-forward -n monitoring svc/prometheus 9090:9000
kubectl port-forward -n monitoring svc/grafana 3000:3000
```

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`

These are local development access methods, not public production endpoints.

## Security and Operational Notes

- Keep Grafana credentials in Kubernetes Secrets; never commit passwords or tokens.
- Keep monitoring interfaces internal unless authenticated access and network controls are configured.
- Persistent storage protects retained metrics across pod restarts.
- Seven-day retention is suitable for this local portfolio environment; production retention should be based on capacity and operational requirements.
- Prometheus alert rules do not, by themselves, send notifications.

