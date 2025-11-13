# CLP Package Helm Chart

This Helm chart deploys the CLP (Compressed Log Processor) package on a Kubernetes cluster.

## Overview

The CLP package consists of multiple services working together to provide log compression, storage, and querying capabilities:

### Infrastructure Services (StatefulSets)
- **Database (MariaDB)**: Stores metadata and system information
- **Queue (RabbitMQ)**: Message queue for job orchestration
- **Redis**: Caching and result backend
- **Results Cache (MongoDB)**: Stores query results

### Application Services (Deployments)
- **Compression Scheduler**: Schedules compression jobs
- **Compression Worker**: Executes compression tasks
- **Query Scheduler**: Schedules query jobs
- **Query Worker**: Executes query tasks
- **Reducer**: Aggregates query results
- **Web UI**: User interface for interacting with CLP
- **API Server**: REST API for programmatic access
- **Garbage Collector**: Cleans up old data
- **MCP Server**: (Optional) Model Context Protocol server

## Prerequisites

- Kubernetes 1.20+
- Helm 3.0+
- PersistentVolume provisioner support in the underlying infrastructure (for data persistence)
- At least 8GB of available memory across your cluster
- StorageClass configured for dynamic volume provisioning (recommended)

## Installation

### Quick Start

1. **Create a values file with required credentials:**

```bash
cat > my-values.yaml <<EOF
database:
  auth:
    password: "your-secure-db-password"
    rootPassword: "your-secure-root-password"

queue:
  auth:
    password: "your-secure-queue-password"

redis:
  auth:
    password: "your-secure-redis-password"
EOF
```

2. **Install the chart:**

```bash
helm install clp ./tools/deployment/package-helm -f my-values.yaml
```

### Detailed Installation

#### 1. Configure Storage

If your cluster doesn't have a default StorageClass, specify one:

```yaml
global:
  storageClass: "your-storage-class"
```

#### 2. Set Required Credentials

Create a `values.yaml` file with secure passwords:

```yaml
database:
  auth:
    database: clp-db
    username: clp-user
    password: "change-me-db-password"
    rootPassword: "change-me-root-password"

queue:
  auth:
    username: clp-user
    password: "change-me-queue-password"

redis:
  auth:
    password: "change-me-redis-password"
```

#### 3. Configure Resource Limits (Optional but Recommended)

```yaml
database:
  resources:
    limits:
      memory: 4Gi
      cpu: 2000m
    requests:
      memory: 1Gi
      cpu: 500m

compressionWorker:
  replicaCount: 2
  resources:
    limits:
      memory: 4Gi
      cpu: 4000m
```

#### 4. Configure Persistence

```yaml
database:
  persistence:
    enabled: true
    size: 20Gi

compressionWorker:
  persistence:
    archives:
      enabled: true
      size: 100Gi
    stagedArchives:
      enabled: true
      size: 50Gi
```

#### 5. Install the Chart

```bash
# Install with custom values
helm install clp ./tools/deployment/package-helm \
  -f values.yaml \
  --namespace clp \
  --create-namespace

# Or install with inline values
helm install clp ./tools/deployment/package-helm \
  --namespace clp \
  --create-namespace \
  --set database.auth.password=securepass \
  --set database.auth.rootPassword=securepass \
  --set queue.auth.password=securepass \
  --set redis.auth.password=securepass
```

## Accessing the Services

### Web UI

By default, the Web UI is exposed as a ClusterIP service. To access it:

**Port forwarding (for testing):**
```bash
kubectl port-forward -n clp svc/clp-clp-package-webui 4000:4000
```
Then access at: http://localhost:4000

**LoadBalancer (for production):**
```yaml
webui:
  service:
    type: LoadBalancer
```

**Ingress (recommended for production):**
```yaml
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: clp.example.com
      paths:
        - path: /
          pathType: Prefix
          service: webui
          port: 4000
  tls:
    - secretName: clp-tls
      hosts:
        - clp.example.com
```

### API Server

Access the API server:
```bash
kubectl port-forward -n clp svc/clp-clp-package-api-server 3001:3001
```

## Configuration

### Service Dependencies

The chart automatically handles service dependencies:
- Init jobs (`db-table-creator`, `results-cache-indices-creator`) run during installation/upgrade
- Application services depend on infrastructure services being healthy
- Services use Kubernetes service discovery to find each other

### Port Mappings

| Service | Port | Description |
|---------|------|-------------|
| Database | 3306 | MariaDB |
| Queue | 5672 | RabbitMQ AMQP |
| Redis | 6379 | Redis |
| Results Cache | 27017 | MongoDB |
| Web UI | 4000 | HTTP |
| API Server | 3001 | HTTP |
| Query Scheduler | 7000 | Internal |
| MCP Server | 8000 | HTTP |

### Storage Mappings

The chart uses PersistentVolumeClaims for data storage:

| Component | Mount Path | Purpose | Default Size |
|-----------|------------|---------|--------------|
| Database | /var/lib/mysql | Database files | 10Gi |
| Queue | /var/log/rabbitmq | Queue logs | 5Gi |
| Redis | /data | Redis persistence | 5Gi |
| Results Cache | /data/db | MongoDB data | 10Gi |
| Compression Worker | /var/data/archives | Compressed archives | 50Gi |
| Compression Worker | /var/data/staged-archives | Staging area | 20Gi |
| Query Worker | /var/data/staged-streams | Query staging | 20Gi |
| Web UI | /var/data/streams | Stream files | 20Gi |

## Upgrading

```bash
# Upgrade with new values
helm upgrade clp ./tools/deployment/package-helm \
  -f values.yaml \
  --namespace clp

# Upgrade specific components
helm upgrade clp ./tools/deployment/package-helm \
  --namespace clp \
  --reuse-values \
  --set compressionWorker.replicaCount=3
```

## Uninstalling

```bash
# Uninstall the release
helm uninstall clp --namespace clp

# Delete the namespace (this will also delete PVCs)
kubectl delete namespace clp
```

**Warning:** Deleting the namespace will delete all persistent data. To preserve data, back up PVCs before deletion.

## Scaling

### Horizontal Scaling

Scale workers based on load:

```yaml
compressionWorker:
  replicaCount: 3
  concurrency: 2  # Jobs per worker

queryWorker:
  replicaCount: 3
  concurrency: 2
```

### Vertical Scaling

Adjust resource limits:

```yaml
compressionWorker:
  resources:
    limits:
      memory: 8Gi
      cpu: 4000m
```

## Monitoring

### Service Health

Check service status:
```bash
kubectl get pods -n clp
kubectl get svc -n clp
```

### Logs

View logs for specific services:
```bash
# Compression worker logs
kubectl logs -n clp deployment/clp-clp-package-compression-worker

# Web UI logs
kubectl logs -n clp deployment/clp-clp-package-webui

# Follow logs
kubectl logs -n clp -f deployment/clp-clp-package-query-scheduler
```

### Database

Connect to the database:
```bash
kubectl exec -it -n clp statefulset/clp-clp-package-database -- mysql -u clp-user -p
```

## Troubleshooting

### Pods not starting

Check events:
```bash
kubectl describe pod -n clp <pod-name>
```

### Storage issues

Check PVC status:
```bash
kubectl get pvc -n clp
```

### Service connectivity

Test service connectivity from within the cluster:
```bash
kubectl run -it --rm debug --image=busybox --restart=Never -n clp -- sh
# Inside the pod:
wget -O- http://clp-clp-package-database:3306
```

### Init jobs failing

Check job logs:
```bash
kubectl logs -n clp job/clp-clp-package-db-table-creator
kubectl logs -n clp job/clp-clp-package-results-cache-indices-creator
```

## Advanced Configuration

### Disabling Components

Disable optional components:
```yaml
garbageCollector:
  enabled: false

mcpServer:
  enabled: false
```

### Using External Services

Use external database instead of bundled one:
```yaml
database:
  enabled: false

# Update ConfigMap with external connection details
```

### Custom Configuration

Override the CLP configuration:
```yaml
clpConfig:
  storageEngine: clp-s
  queryEngine: clp-s
```

## Security Considerations

1. **Change default passwords** - Never use default passwords in production
2. **Use TLS** - Enable TLS for ingress and internal communications
3. **Network Policies** - Implement network policies to restrict traffic
4. **RBAC** - Configure appropriate RBAC permissions
5. **Secret Management** - Consider using external secret management (e.g., HashiCorp Vault)

## Support

For issues and questions:
- GitHub: https://github.com/y-scope/clp
- Documentation: https://docs.yscope.com

## License

See the main CLP repository for license information.
