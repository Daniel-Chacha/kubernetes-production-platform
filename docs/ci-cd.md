# TaskFlow CI/CD Pipeline

## 1. Overview

TaskFlow uses GitHub Actions to automate continuous integration, container image publishing, security scanning, and Kubernetes deployment.

The pipeline is divided into two workflows:

- **CI workflow (`ci.yml`)** — validates application code, builds container images, scans images for vulnerabilities, and publishes successful images to GitHub Container Registry (GHCR).
- **Deployment workflow (`deploy.yml`)** — deploys successfully built images to the Kubernetes environment using a self-hosted runner.

The deployment environment uses the `portfolio` namespace in Minikube.

## 2. Pipeline Architecture

```text
Developer pushes code to master
              |
              v
       GitHub Actions CI
              |
       +------+------+
       |             |
       v             v
   Backend CI    Frontend CI
       |             |
       v             v
   Django tests   Lint and build
       |             |
       +------+------+
              |
              v
       Docker image build
              |
              v
       Trivy vulnerability scan
              |
              v
       Publish images to GHCR
              |
              v
       CI workflow succeeds
              |
              v
      Deployment workflow
              |
              v
       Self-hosted runner
              |
              v
       Update Kubernetes
              |
              v
       Wait for rollouts
              |
              v
       HTTPS health check
              |
       +------+------+
       |             |
       v             v
    Success       Failure
       |             |
       v             v
   Deployment    Restore previous
   complete      image references
```

## 3. Workflow Files

The workflows are located in:

```text
.github/workflows/
├── ci.yml
└── deploy.yml
```

### CI workflow

The CI workflow is responsible for validating code and producing deployable container images.

It runs on:

- Pushes to `master`
- Pull requests targeting `master`
- Manual workflow dispatch

### Deployment workflow

The deployment workflow runs after a successful CI workflow on `master`, or through manual workflow dispatch.

It uses a self-hosted Linux x64 runner with access to the Kubernetes cluster.

The workflow checks that the deployment is associated with the intended branch and a successful CI run before proceeding.

## 4. Backend Continuous Integration

The backend CI job validates the Django application.

Its responsibilities include:

1. Setting up Python 3.12.
2. Installing backend dependencies.
3. Running Django system checks.
4. Running Django tests.

The CI environment uses SQLite:

```text
DB_ENGINE: sqlite
DJANGO_DB_PATH: /tmp/taskflow-ci.sqlite3
```

This is intentionally separate from the Kubernetes runtime configuration, which uses PostgreSQL.

The CI workflow validates backend application behavior without depending on the running Kubernetes database.

## 5. Frontend Continuous Integration

The frontend CI job validates the Next.js application.

It performs the following operations:

1. Sets up Node.js 24.
2. Installs dependencies using `npm ci`.
3. Runs linting.
4. Builds the production application.

Using `npm ci` ensures dependencies are installed from the committed lockfile.

A successful frontend job confirms that the application passes the configured lint and build checks.

## 6. Container Image Build

After the application checks, the workflow builds Docker images for:

- TaskFlow API
- TaskFlow frontend

Docker Buildx is used for image builds.

The images are tagged using the commit SHA and a `latest` tag for successful pushes to `master`.

Commit-SHA tags provide traceability between a deployed image and the source revision that produced it.

## 7. Container Security Scanning

The CI workflow uses Trivy to scan container images.

The configured scan checks:

- Operating system packages
- Application libraries
- HIGH severity vulnerabilities
- CRITICAL severity vulnerabilities

The workflow is configured to:

- Ignore vulnerabilities without available fixes.
- Fail the scan when matching HIGH or CRITICAL vulnerabilities are detected.

This introduces a security validation step before images are published.

A failed vulnerability scan prevents the pipeline from treating the image as ready for publication.

## 8. Publishing Images to GHCR

Successfully validated images are published to GitHub Container Registry.

The registry is:

```text
ghcr.io
```

Images are associated with the repository and tagged with the commit SHA.

The `latest` tag is also updated for successful pushes to `master`.

The deployment workflow uses commit-SHA image references so that deployments are tied to a specific source revision.

Registry authentication is handled through GitHub Actions permissions and credentials. Do not commit registry tokens or passwords to the repository.

## 9. Kubernetes Deployment

The deployment workflow runs on a self-hosted Linux x64 runner.

The runner must have:

- Access to the Kubernetes cluster
- A working `kubectl` installation
- A valid Kubernetes context
- Permission to inspect and update resources in the `portfolio` namespace
- Network access to the application endpoint

The workflow performs the following steps.

### 9.1 Pre-deployment checks

Before deployment, it verifies:

- The expected branch and CI result
- Kubernetes connectivity
- The target namespace
- Required application Deployments

### 9.2 Capture currently deployed images

The workflow records the existing API and frontend image references before changing them.

These references provide a recovery point if the new deployment fails.

### 9.3 Update application images

The workflow updates the API and frontend Deployments to use the images associated with the current commit SHA.

This makes the deployed version traceable to the source commit.

### 9.4 Verify rollout completion

The workflow waits for Kubernetes rollouts to complete.

A rollout timeout or failed Deployment causes the deployment process to enter its failure-handling path.

### 9.5 Verify application health

After the rollouts, the workflow checks the HTTPS application endpoint.

The check uses a bounded retry process rather than assuming that a successful Kubernetes rollout guarantees application-level availability.

## 10. Deployment Failure Handling

The deployment workflow includes failure handling.

When deployment or health verification fails, it attempts to restore the previously recorded API and frontend image references.

It then verifies the resulting rollout and application health.

This is an image-reference recovery mechanism. It does not automatically reverse database schema changes or restore database data.

Kubernetes also provides Deployment rollout history and manual rollback capabilities:

```bash
kubectl rollout history deployment/task-api -n portfolio
kubectl rollout history deployment/task-frontend -n portfolio
```

A manual rollback can be initiated with:

```bash
kubectl rollout undo deployment/task-api -n portfolio
kubectl rollout undo deployment/task-frontend -n portfolio
```

Verify the result:

```bash
kubectl rollout status deployment/task-api -n portfolio
kubectl rollout status deployment/task-frontend -n portfolio
curl -I https://taskflow.test
```

## 11. Monitoring the Pipeline

GitHub Actions provides logs for every workflow run and job.

When a workflow fails:

1. Open the repository on GitHub.
2. Navigate to the Actions tab.
3. Select the failed workflow run.
4. Identify the failed job.
5. Inspect the failing step logs.
6. Correct the underlying issue and push a new commit.

Common failure areas include:

| Failure | Investigation |
|---|---|
| Django checks or tests fail | Inspect backend test output and application configuration |
| Frontend lint fails | Review ESLint output |
| Frontend build fails | Inspect Next.js build logs |
| Docker build fails | Review Dockerfile and build context |
| Trivy scan fails | Review reported HIGH and CRITICAL vulnerabilities |
| GHCR publishing fails | Check registry permissions and authentication |
| Self-hosted runner unavailable | Check runner status and connectivity |
| Kubernetes deployment fails | Inspect Deployment events, pod logs, and rollout status |
| HTTPS verification fails | Check Ingress, TLS, DNS resolution, and application readiness |

## 12. Security Considerations

The pipeline incorporates several security practices:

- Vulnerability scanning before image publication
- Commit-SHA image tags for traceability
- GitHub-managed workflow permissions and credentials
- No hardcoded registry credentials in source files
- Kubernetes Secrets for application-sensitive configuration
- Deployment execution through a controlled self-hosted runner

The self-hosted runner has access to the Kubernetes environment. Its operating system, credentials, and GitHub runner configuration should therefore be protected.

Review workflow permissions periodically and grant only the access required by each job.

## 13. Current Pipeline Limitations

The current implementation has the following boundaries:

- The deployment target is a local Minikube environment.
- Deployment depends on a self-hosted runner with access to that environment.
- The pipeline restores application image references on deployment failure; it does not perform database rollback.
- Automated database backup and restore are not implemented.
- NetworkPolicies are not enforced in the current cluster configuration.
- The workflow does not establish a formal production availability guarantee.

## 14. Workflow Verification

Inspect the workflow definitions locally:

```bash
sed -n '1,260p' .github/workflows/ci.yml
sed -n '1,300p' .github/workflows/deploy.yml
```

Check the latest workflow runs in the GitHub Actions interface.

For a deployment, verify the resulting Kubernetes state:

```bash
kubectl get deployments -n portfolio
kubectl get pods -n portfolio
kubectl get services -n portfolio
curl -I https://taskflow.test
```

## Related Documentation

- Architecture
- Deployment Guide
- Operations Runbook
- Monitoring and Observability
