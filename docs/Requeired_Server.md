# System Audit & Server Specification Report

## 1. System Overview

**Project**: Shema Backend
**Architecture**: Microservices
**Runtime**: Bun (v1.x)
**Framework**: Hono (Lightweight, High Performance)

### Services Breakdown

| Service             | Technology  | Port | Dependencies                     |
| :------------------ | :---------- | :--- | :------------------------------- |
| **API Gateway**     | Bun + Hono  | 3000 | Redis, All Services              |
| **Auth Service**    | Bun + Hono  | 3001 | Redis, Supabase (Auth), Postgres |
| **Admin Service**   | Bun + Hono  | 3002 | Redis, Supabase (DB)             |
| **Course Service**  | Bun + Hono  | 3003 | Redis, Supabase (DB)             |
| **Booking Service** | Bun + Hono  | 3008 | Redis, RabbitMQ, Supabase (DB)   |
| **Recommendation**  | Bun + Hono  | 3005 | Redis, RabbitMQ, Google AI       |
| **Notification**    | Bun + Hono  | 3009 | Redis, RabbitMQ                  |
| **Documentation**   | Static/Node | 3007 | -                                |

### Infrastructure Components

- **Database**: Supabase (PostgreSQL 15)
- **Cache**: Redis (Alpine)
- **Message Broker**: RabbitMQ (Alpine)

## 2. Resource Requirements Analysis

### Compute (CPU)

- **App Services**: The use of Bun and Hono indicates a highly efficient, IO-bound architecture. CPU usage will primarily be driven by serialization/deserialization and business logic, which is minimal.
- **Database (Postgres)**: Will be the primary consumer of CPU during complex queries (e.g., joins in Booking/Course services).
- **Recommendation Service**: If this performs any local vector operations or heavy logic before calling Google AI, it may need more CPU.

### Memory (RAM)

- **Bun/Hono Services**: Extremely lightweight. ~64MB - 128MB per service is often sufficient for baseline.
  - 7 Services × 128MB ≈ **1 GB** (Safety margin included).
- **RabbitMQ**: ~256MB - 512MB (Base + load).
- **Redis**: ~256MB.
- **Supabase (Self-hosted)**:
  - Postgres: ~512MB - 1GB (Minimum).
  - Additional Supabase containers (GoTrue, Realtime, Storage): ~512MB.
  - **Total DB (Self-hosted)**: ~1.5GB - 2GB.
- **Total System Baseline (Self-hosted DB)**: ~3.5GB - 4GB.
- **Total System Baseline (Managed DB)**: ~2GB.

## 3. Recommended Server Specifications

We recommend two options depending on your database deployment strategy.

### Option A: All-in-One (Self-Hosted Database)

_Best for cost-saving or complete control, but requires more maintenance._

| Component     | Specification                    | Notes                                            |
| :------------ | :------------------------------- | :----------------------------------------------- |
| **OS**        | Linux (Ubuntu 22.04 / Debian 11) | Standard Docker support                          |
| **CPU**       | 2 vCPUs                          | Dedicated Compute preferred                      |
| **RAM**       | 4 GB                             | Minimum for typically usually 70-80% utilization |
| **Storage**   | 40GB - 80GB NVMe SSD             | Database logs & storage will grow                |
| **Bandwidth** | 1TB+ Transfer                    | Standard                                         |

**Recommended Provider Examples:**

- **DigitalOcean**: Basic Droplet (4GB / 2 CPU) ~ $24/mo
- **Hetzner**: CX31 (8GB / 2 CPU) ~ €6/mo (Best Value)
- **AWS**: t3.medium (4GB / 2 vCPU)

### Option B: Hybrid (Managed Database)

_Recommended for production stability. App on VPS, Database on Supabase Cloud._

| Component   | Specification                    | Notes                              |
| :---------- | :------------------------------- | :--------------------------------- |
| **OS**      | Linux (Ubuntu 22.04 / Debian 11) |                                    |
| **CPU**     | 1 - 2 vCPUs                      | Burstable (Shared) is fine         |
| **RAM**     | 2 GB                             | Application + Queue + Redis only   |
| **Storage** | 25GB NVMe SSD                    | Mostly for logs & container images |

**Recommended Provider Examples:**

- **DigitalOcean**: Basic Droplet (2GB / 1-2 CPU) ~ $12/mo
- **Hetzner**: CX21 (4GB / 2 CPU) ~ €5/mo
- **Supabase Cloud**: Free Tier or Pro ($25/mo)

## 4. Deployment Strategy

1.  **Containerize**: Ensure all `Dockerfile`s are production-ready (multi-stage builds).
2.  **Orchestration**: Use `docker-compose` for single-node deployment (simplest).
3.  **Reverse Proxy**: Set up Nginx or Traefik in front of the API Gateway (Port 3000) to handle SSL/TLS (LetsEncrypt) and domain routing.
4.  **Security**:
    - Firewall (UFW): Allow only ports 80, 443, and SSH (22).
    - Block ports 3000-3009, 5432, 6379, 5672 externally.
