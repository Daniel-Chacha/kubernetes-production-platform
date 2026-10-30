# TaskFlow Operations Runbook

## 1. Purpose

This runbook provides operational procedures for maintaining and troubleshooting the TaskFlow Kubernetes environment.

It covers:

- Kubernetes cluster health checks
- Application workload monitoring
- API, frontend, and database troubleshooting
- Ingress and HTTPS diagnostics
- Persistent storage checks
- Monitoring and alert investigation
- Deployment failure investigation
- Resource usage and cleanup

The application runs in the `portfolio` namespace. Monitoring components run in the `monitoring` namespace.

## 2. Environment Overview

| Component | Kubernetes namespace | Purpose |
|---|---|---|
| TaskFlow API | `portfolio` | Django REST API |
| TaskFlow frontend | `portfolio` | Next.js application |
| PostgreSQL | `portfolio` | Persistent application database |
| NGINX Ingress | `ingress-nginx` | External application routing |
| Prometheus | `monitoring` | Metrics collection |
| Grafana | `monitoring` | Metrics visualization |
| Alertmanager | `monitoring` | Alert notification |

Application hostname:

```text
https://taskflow.test
```

## 3. Initial Health Assessment

Start every investigation by checking the cluster and its workloads.

### 3.1 Check cluster connectivity

```bash
kubectl cluster-info
kubectl get nodes -o wide
```

Confirm that the Minikube node is `Ready`.

### 3.2 Check application workloads

```bash
kubectl get deployments -n portfolio
kubectl get pods -n portfolio -o wide
kubectl get services -n portfolio
kubectl get ingress -n portfolio
```

### 3.3 Check monitoring workloads

```bash
kubectl get deployments -n monitoring
kubectl get pods -n monitoring -o wide
kubectl get services -n monitoring
```

### 3.4 Check recent events

```bash
kubectl get events -n portfolio \
  --sort-by=.metadata.creationTimestamp

kubectl get events -n monitoring \
  --sort-by=.metadata.creationTimestamp
```

Look for:

- Failed scheduling
- Image pull failures
- Failed health probes
- PersistentVolumeClaim errors
- Container restarts
- Failed mounts
- Deployment rollout failures

## 4. Resource Utilization

Check node resource consumption:

```bash
kubectl top nodes
```

Check pod resource consumption across namespaces:

```bash
kubectl top pods -A
```

Check application namespace resource consumption:

```bash
kubectl top pods -n portfolio
```

If resource consumption is unexpectedly high:

1. Identify the affected pod.
2. Inspect its resource requests and limits.
3. Review its logs.
4. Check whether it is restarting or experiencing repeated failures.
5. Investigate application behavior before changing resource limits.

Resource metrics depend on the Metrics Server being available.

## 5. Application Troubleshooting

### 5.1 API troubleshooting

Check the API Deployment and pods:

```bash
kubectl get deployment task-api -n portfolio
kubectl get pods -n portfolio -l app=task-api
```

Inspect API logs:

```bash
kubectl logs deployment/task-api -n portfolio
```

Follow logs continuously:

```bash
kubectl logs deployment/task-api -n portfolio -f
```

Inspect the Deployment:

```bash
kubectl describe deployment task-api -n portfolio
```

Check the API Service and endpoints:

```bash
kubectl get service task-api -n portfolio
kubectl get endpoints task-api -n portfolio
```

An empty endpoint list can indicate that no ready pods currently match the Service selector.

### 5.2 Frontend troubleshooting

Check frontend availability:

```bash
kubectl get deployment task-frontend -n portfolio
kubectl get pods -n portfolio -l app=task-frontend
```

Inspect frontend logs:

```bash
kubectl logs deployment/task-frontend -n portfolio
```

Inspect the Deployment:

```bash
kubectl describe deployment task-frontend -n portfolio
```

Check its Service:

```bash
kubectl get service task-frontend -n portfolio
kubectl get endpoints task-frontend -n portfolio
```

### 5.3 Database troubleshooting

Check PostgreSQL pod status:

```bash
kubectl get pods -n portfolio -l app=task-postgres
```

Inspect PostgreSQL logs:

```bash
kubectl logs deployment/task-postgres -n portfolio
```

Check the PostgreSQL Service:

```bash
kubectl get service task-postgres -n portfolio
kubectl get endpoints task-postgres -n portfolio
```

Check database storage:

```bash
kubectl get pvc -n portfolio
kubectl describe pvc task-postgres-data -n portfolio
```

Investigate:

- Whether the PostgreSQL pod is ready
- Whether the PVC is bound
- Whether the Service has ready endpoints
- Whether the API is referencing the correct database host and port
- Whether the database credentials are correctly configured

Do not expose database passwords or Secret values when collecting diagnostic output.

Important: Do not delete `task-postgres-data` as a troubleshooting shortcut. It contains persistent database data.

## 6. Pod Failure Investigation

When a pod is not running or ready, follow this sequence.

### Step 1: Identify the pod

```bash
kubectl get pods -n portfolio
```

### Step 2: Inspect its events and configuration

```bash
kubectl describe pod <POD_NAME> -n portfolio
```

### Step 3: Inspect current logs

```bash
kubectl logs <POD_NAME> -n portfolio
```

### Step 4: Inspect previous container logs

For containers that have restarted:

```bash
kubectl logs <POD_NAME> -n portfolio --previous
```

### Step 5: Check restart counts

```bash
kubectl get pods -n portfolio \
  -o custom-columns='NAME:.metadata.name,STATUS:.status.phase,RESTARTS:.status.containerStatuses[*].restartCount'
```

Common failure states:

| State | Possible cause | Investigation |
|---|---|---|
| `CrashLoopBackOff` | Application exits repeatedly | Inspect current and previous logs |
| `ImagePullBackOff` | Registry or image reference problem | Inspect pod events and image configuration |
| `ErrImageNeverPull` | Image unavailable with `Never` pull policy | Verify image availability in Minikube |
| `Pending` | Scheduling or storage issue | Inspect pod events and PVCs |
| `ContainerCreating` | Image, volume, or container setup issue | Inspect pod events |
| `Running` but not `Ready` | Readiness probe or application health issue | Inspect probes, logs, and events |

## 7. Ingress and HTTPS Troubleshooting

Check the Minikube IP:

```bash
minikube ip
```

Check the Ingress resource:

```bash
kubectl get ingress -n portfolio
kubectl describe ingress -n portfolio
```

Check the NGINX Ingress Controller:

```bash
kubectl get pods -n ingress-nginx
kubectl get services -n ingress-nginx
```

Check the TLS Secret:

```bash
kubectl get secret taskflow-tls -n portfolio
```

Test HTTPS:

```bash
curl -I https://taskflow.test
```

If hostname resolution fails, inspect the local hosts file:

```bash
grep taskflow.test /etc/hosts
```

Confirm that the hostname resolves to the current Minikube IP.

If certificate verification fails, verify that the local mkcert certificate authority is trusted and that the Ingress references the correct TLS Secret.

## 8. Persistent Storage Checks

List PersistentVolumeClaims:

```bash
kubectl get pvc -n portfolio
kubectl get pvc -n monitoring
```

List PersistentVolumes:

```bash
kubectl get pv
```

Inspect the PostgreSQL claim:

```bash
kubectl describe pvc task-postgres-data -n portfolio
```

Inspect monitoring storage:

```bash
kubectl describe pvc prometheus-data -n monitoring
kubectl describe pvc grafana-data -n monitoring
kubectl describe pvc alertmanager-data -n monitoring
```

A claim should normally be in the `Bound` state.

Do not delete PersistentVolumeClaims during routine troubleshooting. Removing a claim may result in permanent data loss depending on the storage reclaim policy.

Automated database backup and restore procedures are not currently part of this project.

## 9. Monitoring and Alert Investigation

### 9.1 Prometheus

Check Prometheus:

```bash
kubectl get pods -n monitoring
kubectl logs deployment/prometheus -n monitoring
```

Access Prometheus locally using port forwarding:

```bash
kubectl port-forward -n monitoring svc/prometheus 9090:9000
```

Open:

```text
http://localhost:9090
```

Inspect target health and confirm that the TaskFlow API metrics endpoint is being scraped.

### 9.2 Grafana

Check Grafana:

```bash
kubectl get pods -n monitoring -l app=grafana
kubectl logs deployment/grafana -n monitoring
```

Forward the Grafana Service:

```bash
kubectl port-forward -n monitoring svc/grafana 3000:3000
```

Open:

```text
http://localhost:3000
```

Authenticate using the configured Grafana credentials. The administrator password is supplied through a Kubernetes Secret.

Review the TaskFlow API observability dashboard for request rates, response status codes, latency, errors, and process resource metrics.

### 9.3 Alertmanager

Check Alertmanager:

```bash
kubectl get pods -n monitoring -l app=alertmanager
kubectl logs deployment/alertmanager -n monitoring
```

Forward its Service:

```bash
kubectl port-forward -n monitoring svc/alertmanager 9093:9093
```

Open:

```text
http://localhost:9093
```

Inspect active alerts and notification status.

Email notifications use the configured SMTP settings and a Kubernetes Secret for the SMTP application password. Never print or commit the secret value.

## 10. Deployment Operations

Check the current rollout status:

```bash
kubectl rollout status deployment/task-api -n portfolio
kubectl rollout status deployment/task-frontend -n portfolio
```

Inspect rollout history:

```bash
kubectl rollout history deployment/task-api -n portfolio
kubectl rollout history deployment/task-frontend -n portfolio
```

If a Deployment update causes a failure, inspect its rollout history and events before taking corrective action.

A manual Kubernetes rollout rollback can be performed with:

```bash
kubectl rollout undo deployment/task-api -n portfolio
```

Or:

```bash
kubectl rollout undo deployment/task-frontend -n portfolio
```

After a rollback, verify the rollout and application endpoint:

```bash
kubectl rollout status deployment/task-api -n portfolio
kubectl rollout status deployment/task-frontend -n portfolio
curl -I https://taskflow.test
```

The GitHub Actions deployment workflow also contains failure handling that attempts to restore the previously deployed API and frontend image references.

Do not assume that a rollback of application images also rolls back database schema or data changes.

## 11. Safe Operational Practices

Before making changes:

1. Identify the affected Kubernetes resource.
2. Inspect its current configuration.
3. Review recent events and logs.
4. Understand whether the resource uses persistent storage.
5. Make the smallest appropriate change.
6. Verify the resulting application health.

Avoid the following:

- Deleting PostgreSQL PVCs to resolve application errors.
- Printing Secret values into terminal logs or CI output.
- Applying unreviewed manifests across the cluster.
- Replacing working image references without recording the current versions.
- Assuming that a successful pod rollout guarantees application-level health.

## 12. Known Project Limitations

The current project environment has the following limitations:

- It uses a local Minikube cluster rather than a highly available managed Kubernetes environment.
- NetworkPolicies are not enforced in the current cluster configuration.
- Database backup and restore automation has not been implemented.
- The deployment environment depends on a self-hosted runner with access to the local cluster.
- The environment is intended as a Kubernetes production-platform portfolio project, not as a production service with a formal availability guarantee.

## Related Documentation

- Architecture
- Deployment Guide
- Monitoring and Observability
- CI/CD
