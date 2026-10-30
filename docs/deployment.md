# TaskFlow Deployment Guide

## 1. Overview

TaskFlow is deployed to a local Kubernetes cluster using Minikube.

The deployment consists of:

- Django REST API
- Next.js frontend
- PostgreSQL database
- NGINX Ingress Controller
- TLS termination for HTTPS access
- Prometheus, Grafana, and Alertmanager for monitoring

The application workloads run in the `portfolio` namespace. Monitoring components run separately in the `monitoring` namespace.

The deployment process supports both manual Kubernetes operations and automated deployment through GitHub Actions.

> This guide documents the current Minikube-based environment. It should not be interpreted as a production cloud deployment procedure.

## 2. Prerequisites

Install and configure the following tools:

- Docker
- Minikube
- kubectl
- Git
- mkcert (for locally trusted HTTPS certificates)

Verify the tools are available:

```bash
docker --version
minikube version
kubectl version --client
git --version
mkcert -version
```

Start the Minikube cluster if it is not already running:

```bash
minikube start --driver=docker
```

Verify cluster connectivity:

```bash
kubectl cluster-info
kubectl get nodes
```

## 3. Repository Structure

The deployment-related files are organized approximately as follows:

```text
kubernetes-production-platform/
├── kubernetes/
│   ├── namespace.yaml
│   ├── api-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── postgres-deployment.yaml
│   └── ingress.yaml
├── monitoring/
├── scripts/
├── tasks-mngt-frontend/
├── task-api/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
└── docs/
```

The actual manifest and script filenames may differ as the project evolves. Refer to the repository when running deployment commands.

## 4. Kubernetes Namespace

The application resources are deployed into the `portfolio` namespace.

Create the namespace if it does not already exist:

```bash
kubectl apply -f kubernetes/namespace.yaml
```

Verify:

```bash
kubectl get namespace portfolio
```

## 5. Application Configuration and Secrets

The application uses Kubernetes ConfigMaps and Secrets to separate configuration from sensitive values.

The API configuration includes PostgreSQL connection settings:

- Database engine: PostgreSQL
- Database name: `taskflow`
- Database host: `task-postgres`
- Database port: `5432`

Database credentials and Django's secret key are supplied through Kubernetes Secrets.

Do not commit actual secret values, passwords, application keys, or SMTP credentials to Git.

Before applying application workloads, verify that the required ConfigMaps and Secrets exist:

```bash
kubectl get configmaps -n portfolio
kubectl get secrets -n portfolio
```

Inspect resource names and references in the Deployment manifests before applying them.

## 6. Deploying the Application

Apply the Kubernetes manifests from the repository.

The exact order should respect resource dependencies:

1. Namespace
2. ConfigMaps and Secrets
3. PersistentVolumeClaims and database resources
4. API Deployment and Service
5. Frontend Deployment and Service
6. Ingress resources

Apply the relevant manifests using their actual repository paths.

For example:

```bash
kubectl apply -f kubernetes/
```

Only use the directory-wide command if the directory contains the intended application manifests and does not include unrelated or unfinished resources.

Check deployment status:

```bash
kubectl get deployments -n portfolio
kubectl get pods -n portfolio
kubectl get services -n portfolio
```

Wait for the application Deployments to become available:

```bash
kubectl rollout status deployment/task-api -n portfolio
kubectl rollout status deployment/task-frontend -n portfolio
kubectl rollout status deployment/task-postgres -n portfolio
```

If a workload does not become ready, inspect its status and logs:

```bash
kubectl describe pods -n portfolio
kubectl logs deployment/task-api -n portfolio
kubectl logs deployment/task-frontend -n portfolio
kubectl logs deployment/task-postgres -n portfolio
```

## 7. Database Persistence

PostgreSQL stores its persistent data using the `task-postgres-data` PersistentVolumeClaim.

Verify the claim is bound:

```bash
kubectl get pvc -n portfolio
```

Verify the PostgreSQL pod is running:

```bash
kubectl get pods -n portfolio -l app=task-postgres
```

Do not delete the PostgreSQL PVC when troubleshooting application Deployments. Deleting persistent storage can result in data loss.

Database backup and restore procedures are not currently implemented as part of this project.

## 8. Ingress and HTTPS

The application is exposed through the NGINX Ingress Controller using the hostname:

```text
taskflow.test
```

The Ingress resource routes requests to the frontend Service. TLS is configured using the Kubernetes Secret:

```text
taskflow-tls
```

The local hostname must resolve to the Minikube IP address.

Check the Minikube IP:

```bash
minikube ip
```

Add the hostname to `/etc/hosts`, using the IP returned by Minikube:

```text
<MINIKUBE_IP> taskflow.test
```

The local TLS certificate is generated and trusted using mkcert. Do not commit private certificate keys to the repository.

Verify the Ingress and TLS resources:

```bash
kubectl get ingress -n portfolio
kubectl get secret taskflow-tls -n portfolio
```

Test the application:

```bash
curl -I https://taskflow.test
```

A successful response should return an HTTP success or redirect status, depending on the endpoint and application routing.

Open the application in a browser:

```text
https://taskflow.test
```

## 9. Automated Deployment with GitHub Actions

The repository contains two GitHub Actions workflows:

### Continuous Integration

The CI workflow runs on pushes to `master`, pull requests targeting `master`, and manual workflow dispatch.

Its responsibilities include:

- Installing backend dependencies
- Running Django checks and tests
- Installing frontend dependencies
- Running frontend linting
- Building the frontend
- Building container images
- Scanning images with Trivy for HIGH and CRITICAL vulnerabilities
- Publishing images to GitHub Container Registry (GHCR) after successful pushes to `master`

The backend CI checks use SQLite. The deployed Kubernetes application uses PostgreSQL.

### Deployment Workflow

The deployment workflow runs after a successful CI workflow on `master`, or through manual workflow dispatch.

It uses a self-hosted Linux x64 GitHub Actions runner with access to the Kubernetes cluster.

The workflow:

1. Checks the branch and CI result.
2. Verifies Kubernetes connectivity and required resources.
3. Records the currently deployed application image references.
4. Updates the API and frontend to images associated with the commit SHA.
5. Waits for Kubernetes rollouts to complete.
6. Checks application availability over HTTPS.
7. Attempts to restore the previous image references if deployment or health verification fails.

The workflow requires the self-hosted runner to have the necessary Kubernetes context and permissions.

Review the workflow files for the current runner labels, deployment configuration, and image references:

```text
.github/workflows/ci.yml
.github/workflows/deploy.yml
```

## 10. Deployment Verification

After deployment, verify the application workloads:

```bash
kubectl get pods -n portfolio
kubectl get deployments -n portfolio
kubectl get services -n portfolio
kubectl get ingress -n portfolio
```

Check the application endpoint:

```bash
curl -I https://taskflow.test
```

Inspect recent events if a resource is unhealthy:

```bash
kubectl get events -n portfolio --sort-by=.metadata.creationTimestamp
```

Check the deployed container images:

```bash
kubectl get deployments -n portfolio \
  -o jsonpath='{range .items[*]}{.metadata.name}{": "}{.spec.template.spec.containers[*].image}{"\n"}{end}'
```

## 11. Troubleshooting

### Pod is not starting

Inspect the pod:

```bash
kubectl get pods -n portfolio
kubectl describe pod <POD_NAME> -n portfolio
kubectl logs <POD_NAME> -n portfolio
```

For containers that have restarted, inspect the previous container logs:

```bash
kubectl logs <POD_NAME> -n portfolio --previous
```

### ImagePullBackOff or ErrImageNeverPull

Check the image reference and pull policy:

```bash
kubectl describe pod <POD_NAME> -n portfolio
```

Confirm that the image is available to the cluster or that the registry credentials are configured correctly.

### Database connection errors

Check PostgreSQL readiness and Service discovery:

```bash
kubectl get pods -n portfolio -l app=task-postgres
kubectl get service task-postgres -n portfolio
kubectl get endpoints task-postgres -n portfolio
```

Verify the API ConfigMap and Secret references without exposing secret values.

### HTTPS or hostname resolution errors

Check:

```bash
minikube ip
kubectl get ingress -n portfolio
kubectl get secret taskflow-tls -n portfolio
kubectl get pods -n ingress-nginx
```

Confirm that `taskflow.test` resolves to the current Minikube IP and that the local certificate authority is trusted.

### Deployment rollout failure

Inspect the Deployment and its events:

```bash
kubectl rollout status deployment/task-api -n portfolio
kubectl rollout status deployment/task-frontend -n portfolio
kubectl describe deployment task-api -n portfolio
kubectl describe deployment task-frontend -n portfolio
```

Do not delete persistent volumes or claims as a routine deployment troubleshooting step.

## 12. Operational Considerations

- Keep Kubernetes Secrets and private keys out of source control.
- Use commit-SHA image tags to identify deployed application versions.
- Verify application health after deployments.
- Monitor pod restarts, resource usage, and application alerts.
- Protect PostgreSQL persistent storage.
- Review Trivy findings before publishing images.
- The current environment is a local Minikube deployment, not a highly available production cluster.
- NetworkPolicies are not enforced in the current cluster configuration.
- Database backup and restore automation remains outside the current project scope.

## Related Documentation

- Architecture
- Monitoring and Observability
- Operations Runbook
- CI/CD
