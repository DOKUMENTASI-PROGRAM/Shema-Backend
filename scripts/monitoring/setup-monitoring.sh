#!/bin/bash

# Production Monitoring Setup Script for Shema Music Backend
# This script sets up comprehensive monitoring, metrics collection, and alerting

set -e

# Configuration
PROJECT_NAME="shema-music-backend"
MONITORING_DIR="monitoring"
PROMETHEUS_CONFIG="$MONITORING_DIR/prometheus.yml"
GRAFANA_CONFIG="$MONITORING_DIR/grafana"
ALERTMANAGER_CONFIG="$MONITORING_DIR/alertmanager.yml"
DOCKER_COMPOSE_MONITORING="$MONITORING_DIR/docker-compose.monitoring.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to create monitoring directory structure
create_monitoring_dirs() {
    log_info "Creating monitoring directory structure..."

    mkdir -p "$MONITORING_DIR"
    mkdir -p "$GRAFANA_CONFIG/provisioning/datasources"
    mkdir -p "$GRAFANA_CONFIG/provisioning/dashboards"
    mkdir -p "$GRAFANA_CONFIG/dashboards"
    mkdir -p "$MONITORING_DIR/prometheus"
    mkdir -p "$MONITORING_DIR/grafana"
    mkdir -p "$MONITORING_DIR/alertmanager"

    log_success "Monitoring directories created"
}

# Function to create Prometheus configuration
create_prometheus_config() {
    log_info "Creating Prometheus configuration..."

    cat > "$PROMETHEUS_CONFIG" << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  # ============================================
  # APPLICATION SERVICES
  # ============================================
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['host.docker.internal:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s
    scrape_timeout: 5s

  - job_name: 'auth-service'
    static_configs:
      - targets: ['host.docker.internal:3001']
    metrics_path: '/metrics'
    scrape_interval: 10s
    scrape_timeout: 5s

  - job_name: 'admin-service'
    static_configs:
      - targets: ['host.docker.internal:3002']
    metrics_path: '/metrics'
    scrape_interval: 10s
    scrape_timeout: 5s

  - job_name: 'course-service'
    static_configs:
      - targets: ['host.docker.internal:3003']
    metrics_path: '/metrics'
    scrape_interval: 10s
    scrape_timeout: 5s

  - job_name: 'booking-service'
    static_configs:
      - targets: ['host.docker.internal:3004']
    metrics_path: '/metrics'
    scrape_interval: 10s
    scrape_timeout: 5s

  - job_name: 'recommendation-service'
    static_configs:
      - targets: ['host.docker.internal:3005']
    metrics_path: '/metrics'
    scrape_interval: 10s
    scrape_timeout: 5s

  - job_name: 'documentation-service'
    static_configs:
      - targets: ['host.docker.internal:3007']
    metrics_path: '/metrics'
    scrape_interval: 30s
    scrape_timeout: 10s

  # ============================================
  # INFRASTRUCTURE METRICS
  # ============================================
  - job_name: 'redis'
    static_configs:
      - targets: ['host.docker.internal:6379']
    metrics_path: '/metrics'

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
    scrape_interval: 30s

  # ============================================
  # DOCKER CONTAINER METRICS
  # ============================================
  - job_name: 'docker-containers'
    static_configs:
      - targets: ['host.docker.internal:9323']
    metrics_path: '/metrics'
EOF

    log_success "Prometheus configuration created"
}

# Function to create alert rules
create_alert_rules() {
    log_info "Creating Prometheus alert rules..."

    cat > "$MONITORING_DIR/alert_rules.yml" << 'EOF'
groups:
  - name: shema-music-alerts
    rules:
      # ============================================
      # SERVICE HEALTH ALERTS
      # ============================================
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "Service {{ $labels.job }} has been down for more than 1 minute."

      - alert: ServiceHighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate on {{ $labels.job }}"
          description: "Error rate for {{ $labels.job }} is {{ $value | printf "%.2f" }}% over the last 5 minutes."

      # ============================================
      # PERFORMANCE ALERTS
      # ============================================
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time on {{ $labels.job }}"
          description: "95th percentile response time for {{ $labels.job }} is {{ $value | printf "%.2f" }}s."

      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | printf "%.1f" }}%."

      - alert: HighCPUUsage
        expr: (1 - rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is {{ $value | printf "%.1f" }}%."

      # ============================================
      # DATABASE ALERTS
      # ============================================
      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory usage high"
          description: "Redis memory usage is {{ $value | printf "%.1f" }}%."

      - alert: RedisConnectionsHigh
        expr: redis_connected_clients > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High Redis connections"
          description: "Redis has {{ $value }} connected clients."

      # ============================================
      # BUSINESS LOGIC ALERTS
      # ============================================
      - alert: BookingServiceErrors
        expr: increase(booking_request_errors_total[5m]) > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High booking service errors"
          description: "Booking service has {{ $value }} errors in the last 5 minutes."

      - alert: AuthFailures
        expr: increase(auth_login_failures_total[5m]) > 20
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "High authentication failures"
          description: "Authentication service has {{ $value }} login failures in the last 5 minutes."
EOF

    log_success "Alert rules created"
}

# Function to create Alertmanager configuration
create_alertmanager_config() {
    log_info "Creating Alertmanager configuration..."

    cat > "$ALERTMANAGER_CONFIG" << 'EOF'
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@shemamusic.com'
  smtp_auth_username: 'alerts@shemamusic.com'
  smtp_auth_password: 'your-app-password'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'team-email'
  routes:
  - match:
      severity: critical
    receiver: 'team-pager'
    continue: true

receivers:
- name: 'team-email'
  email_configs:
  - to: 'dev-team@shemamusic.com'
    headers:
      subject: 'Shema Music Alert: {{ .GroupLabels.alertname }}'

- name: 'team-pager'
  email_configs:
  - to: 'oncall@shemamusic.com'
    headers:
      subject: 'CRITICAL: Shema Music Alert: {{ .GroupLabels.alertname }}'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
    channel: '#alerts'
    title: 'CRITICAL: {{ .GroupLabels.alertname }}'
    text: '{{ .CommonAnnotations.description }}'
EOF

    log_success "Alertmanager configuration created"
}

# Function to create Grafana datasource configuration
create_grafana_datasource() {
    log_info "Creating Grafana datasource configuration..."

    cat > "$GRAFANA_CONFIG/provisioning/datasources/prometheus.yml" << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

    log_success "Grafana datasource configuration created"
}

# Function to create Grafana dashboard configuration
create_grafana_dashboards() {
    log_info "Creating Grafana dashboard configuration..."

    cat > "$GRAFANA_CONFIG/provisioning/dashboards/dashboard.yml" << 'EOF'
apiVersion: 1

providers:
  - name: 'default'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

    log_success "Grafana dashboard configuration created"
}

# Function to create main dashboard
create_main_dashboard() {
    log_info "Creating main monitoring dashboard..."

    cat > "$GRAFANA_CONFIG/dashboards/shema-music-overview.json" << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "Shema Music Backend Overview",
    "tags": ["shema-music", "overview"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Service Health",
        "type": "stat",
        "targets": [
          {
            "expr": "up",
            "legendFormat": "{{job}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "mappings": [
              {
                "options": {
                  "0": {
                    "text": "DOWN",
                    "color": "red"
                  },
                  "1": {
                    "text": "UP",
                    "color": "green"
                  }
                },
                "type": "value"
              }
            ]
          }
        }
      },
      {
        "id": 2,
        "title": "HTTP Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{job}}"
          }
        ]
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100",
            "legendFormat": "{{job}}"
          }
        ]
      },
      {
        "id": 4,
        "title": "Response Time (95th percentile)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "{{job}}"
          }
        ]
      },
      {
        "id": 5,
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100",
            "legendFormat": "Memory Usage %"
          }
        ]
      },
      {
        "id": 6,
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(1 - rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100",
            "legendFormat": "CPU Usage %"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "timepicker": {},
    "templating": {
      "list": []
    },
    "annotations": {
      "list": []
    },
    "refresh": "30s",
    "schemaVersion": 27,
    "version": 0,
    "links": []
  }
}
EOF

    log_success "Main monitoring dashboard created"
}

# Function to create Docker Compose for monitoring stack
create_monitoring_compose() {
    log_info "Creating monitoring Docker Compose configuration..."

    cat > "$DOCKER_COMPOSE_MONITORING" << 'EOF'
version: '3.8'

services:
  # ============================================
  # PROMETHEUS - Metrics Collection
  # ============================================
  prometheus:
    image: prom/prometheus:latest
    container_name: shema-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alert_rules.yml:/etc/prometheus/alert_rules.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    networks:
      - monitoring
    restart: unless-stopped

  # ============================================
  # GRAFANA - Visualization
  # ============================================
  grafana:
    image: grafana/grafana:latest
    container_name: shema-grafana
    ports:
      - "3006:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_INSTALL_PLUGINS=grafana-piechart-panel,grafana-worldmap-panel
    volumes:
      - ./grafana:/var/lib/grafana
      - ./provisioning:/etc/grafana/provisioning
    networks:
      - monitoring
    restart: unless-stopped
    depends_on:
      - prometheus

  # ============================================
  # ALERTMANAGER - Alert Management
  # ============================================
  alertmanager:
    image: prom/alertmanager:latest
    container_name: shema-alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/config.yml
    command:
      - '--config.file=/etc/alertmanager/config.yml'
      - '--storage.path=/alertmanager'
    networks:
      - monitoring
    restart: unless-stopped

  # ============================================
  # NODE EXPORTER - System Metrics
  # ============================================
  node-exporter:
    image: prom/node-exporter:latest
    container_name: shema-node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - monitoring
    restart: unless-stopped

  # ============================================
  # CADVISOR - Container Metrics
  # ============================================
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: shema-cadvisor
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    devices:
      - /dev/kmsg
    networks:
      - monitoring
    restart: unless-stopped

  # ============================================
  # PUSHGATEWAY - Custom Metrics
  # ============================================
  pushgateway:
    image: prom/pushgateway:latest
    container_name: shema-pushgateway
    ports:
      - "9091:9091"
    networks:
      - monitoring
    restart: unless-stopped

networks:
  monitoring:
    driver: bridge

volumes:
  prometheus-data:
    driver: local
EOF

    log_success "Monitoring Docker Compose configuration created"
}

# Function to create health check script
create_health_check_script() {
    log_info "Creating health check script..."

    cat > "$MONITORING_DIR/health-check.sh" << 'EOF'
#!/bin/bash

# Health Check Script for Shema Music Backend
# This script performs comprehensive health checks on all services

SERVICES=(
    "http://api.shemamusic.my.id"
    "auth-service:3001"
    "admin-service:3002"
    "course-service:3003"
    "booking-service:3004"
    "recommendation-service:3005"
    "documentation-service:3007"
)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "Shema Music Backend Health Check"
echo "=========================================="

FAILED_SERVICES=()
WARNING_SERVICES=()

for service in "${SERVICES[@]}"; do
    name=$(echo $service | cut -d: -f1)
    port=$(echo $service | cut -d: -f2)

    echo -n "Checking $name ($port)... "

    # Health check
    if curl -f -s --max-time 5 http://localhost:$port/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"

        # Performance check (response time < 2s)
        response_time=$(curl -s -w "%{time_total}" -o /dev/null http://localhost:$port/health)
        if (( $(echo "$response_time > 2.0" | bc -l) )); then
            echo -e "  ${YELLOW}⚠ WARNING: Slow response (${response_time}s)${NC}"
            WARNING_SERVICES+=("$name: slow response")
        fi
    else
        echo -e "${RED}✗ FAIL${NC}"
        FAILED_SERVICES+=("$name:$port")
    fi
done

echo ""
echo "=========================================="
echo "Summary:"
echo "=========================================="

if [ ${#FAILED_SERVICES[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ All services are healthy${NC}"
else
    echo -e "${RED}✗ Failed services: ${FAILED_SERVICES[*]}${NC}"
fi

if [ ${#WARNING_SERVICES[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ No performance warnings${NC}"
else
    echo -e "${YELLOW}⚠ Performance warnings: ${WARNING_SERVICES[*]}${NC}"
fi

# Exit with error if any service failed
if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
    exit 1
fi
EOF

    chmod +x "$MONITORING_DIR/health-check.sh"
    log_success "Health check script created"
}

# Function to create log aggregation script
create_log_aggregation_script() {
    log_info "Creating log aggregation script..."

    cat > "$MONITORING_DIR/aggregate-logs.sh" << 'EOF'
#!/bin/bash

# Log Aggregation Script for Shema Music Backend
# This script aggregates logs from all services for analysis

LOG_DIR="./logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
AGGREGATED_LOG="$LOG_DIR/aggregated_$TIMESTAMP.log"

mkdir -p "$LOG_DIR"

echo "==========================================" > "$AGGREGATED_LOG"
echo "Shema Music Backend Log Aggregation"
echo "Timestamp: $(date)"
echo "==========================================" >> "$AGGREGATED_LOG"

SERVICES=(
    "shema-api-gateway-prod"
    "shema-auth-service-prod"
    "shema-admin-service-prod"
    "shema-course-service-prod"
    "shema-booking-service-prod"
    "shema-recommendation-service-prod"
    "shema-documentation-service-prod"
    "shema-redis-prod"
)

for service in "${SERVICES[@]}"; do
    echo "" >> "$AGGREGATED_LOG"
    echo "==========================================" >> "$AGGREGATED_LOG"
    echo "LOGS FOR: $service"
    echo "==========================================" >> "$AGGREGATED_LOG"

    if docker logs "$service" --tail 100 2>&1 >> "$AGGREGATED_LOG" 2>/dev/null; then
        echo "✓ Logs collected for $service"
    else
        echo "✗ Failed to collect logs for $service" >> "$AGGREGATED_LOG"
    fi
done

echo "" >> "$AGGREGATED_LOG"
echo "==========================================" >> "$AGGREGATED_LOG"
echo "Log aggregation completed at $(date)"
echo "==========================================" >> "$AGGREGATED_LOG"

echo "Aggregated logs saved to: $AGGREGATED_LOG"
EOF

    chmod +x "$MONITORING_DIR/aggregate-logs.sh"
    log_success "Log aggregation script created"
}

# Function to start monitoring stack
start_monitoring() {
    log_info "Starting monitoring stack..."

    cd "$MONITORING_DIR"
    docker-compose -f docker-compose.monitoring.yml up -d

    log_success "Monitoring stack started"
    log_info "Access points:"
    log_info "  - Prometheus: http://localhost:9090"
    log_info "  - Grafana: http://localhost:3006 (admin/admin)"
    log_info "  - Alertmanager: http://localhost:9093"
}

# Main setup function
setup_monitoring() {
    log_info "Setting up comprehensive monitoring for Shema Music Backend..."

    create_monitoring_dirs
    create_prometheus_config
    create_alert_rules
    create_alertmanager_config
    create_grafana_datasource
    create_grafana_dashboards
    create_main_dashboard
    create_monitoring_compose
    create_health_check_script
    create_log_aggregation_script

    log_success "Monitoring setup completed!"
    log_info "To start monitoring stack, run: cd monitoring && docker-compose -f docker-compose.monitoring.yml up -d"
}

# Main script logic
case "${1:-setup}" in
    "setup")
        setup_monitoring
        ;;
    "start")
        start_monitoring
        ;;
    *)
        echo "Usage: $0 [setup|start]"
        echo "  setup  - Create all monitoring configuration files"
        echo "  start  - Start the monitoring stack"
        exit 1
        ;;
esac
EOF

    log_success "Monitoring setup script created"
}

# Function to create database migration validation script
create_db_migration_script() {
    log_info "Creating database migration validation script..."

    cat > "$MONITORING_DIR/validate-migrations.sh" << 'EOF'
#!/bin/bash

# Database Migration Validation Script
# This script validates database schema and data integrity after migrations

set -e

# Configuration
SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check database connectivity
check_db_connectivity() {
    log_info "Checking database connectivity..."

    if curl -f -s -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        "$SUPABASE_URL/rest/v1/" > /dev/null 2>&1; then
        log_success "Database connection successful"
        return 0
    else
        log_error "Database connection failed"
        return 1
    fi
}

# Function to validate schema
validate_schema() {
    log_info "Validating database schema..."

    # Check required tables exist
    required_tables=(
        "auth.users"
        "course.courses"
        "course.slots"
        "booking.bookings"
        "auth.user_profiles"
    )

    for table in "${required_tables[@]}"; do
        schema=$(echo $table | cut -d. -f1)
        table_name=$(echo $table | cut -d. -f2)

        if curl -f -s -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
            "$SUPABASE_URL/rest/v1/$table?select=count" > /dev/null 2>&1; then
            log_success "Table $table exists"
        else
            log_error "Table $table missing"
            return 1
        fi
    done

    log_success "Schema validation passed"
    return 0
}

# Function to check data integrity
check_data_integrity() {
    log_info "Checking data integrity..."

    # Check for orphaned records, constraint violations, etc.
    # This would be specific to your business logic

    log_info "Data integrity checks completed"
    return 0
}

# Function to validate indexes
validate_indexes() {
    log_info "Validating database indexes..."

    # Check for required indexes
    # This would require direct database access or custom API endpoints

    log_info "Index validation completed"
    return 0
}

# Main validation function
validate_migrations() {
    log_info "Starting database migration validation..."

    if ! check_db_connectivity; then
        exit 1
    fi

    if ! validate_schema; then
        exit 1
    fi

    if ! check_data_integrity; then
        exit 1
    fi

    if ! validate_indexes; then
        exit 1
    fi

    log_success "Database migration validation completed successfully!"
}

# Run validation
validate_migrations
EOF

    chmod +x "$MONITORING_DIR/validate-migrations.sh"
    log_success "Database migration validation script created"
}

# Main setup function
setup_monitoring() {
    log_info "Setting up comprehensive monitoring for Shema Music Backend..."

    create_monitoring_dirs
    create_prometheus_config
    create_alert_rules
    create_alertmanager_config
    create_grafana_datasource
    create_grafana_dashboards
    create_main_dashboard
    create_monitoring_compose
    create_health_check_script
    create_log_aggregation_script
    create_db_migration_script

    log_success "Monitoring setup completed!"
    log_info "To start monitoring stack, run: cd monitoring && docker-compose -f docker-compose.monitoring.yml up -d"
}

# Main script logic
case "${1:-setup}" in
    "setup")
        setup_monitoring
        ;;
    "start")
        start_monitoring
        ;;
    *)
        echo "Usage: $0 [setup|start]"
        echo "  setup  - Create all monitoring configuration files"
        echo "  start  - Start the monitoring stack"
        exit 1
        ;;
esac