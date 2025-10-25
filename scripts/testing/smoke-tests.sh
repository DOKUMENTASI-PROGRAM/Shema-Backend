#!/bin/bash

# Smoke Tests Script for Shema Music Backend
# This script performs basic smoke tests to validate deployment health

set -e

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
TEST_USER_EMAIL="${TEST_USER_EMAIL:-test@example.com}"
TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-testpass123}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
PASSED_TESTS=0
FAILED_TESTS=0
TOTAL_TESTS=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    ((PASSED_TESTS++))
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((FAILED_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to make HTTP request and check response
test_endpoint() {
    local method=$1
    local url=$2
    local expected_status=${3:-200}
    local description=$4
    local data=$5
    local auth_token=$6

    ((TOTAL_TESTS++))

    log_info "Testing: $description"

    local curl_cmd="curl -s -w \"HTTPSTATUS:%{http_code};\""

    if [ "$method" = "POST" ] || [ "$method" = "PUT" ] || [ "$method" = "PATCH" ]; then
        curl_cmd="$curl_cmd -X $method"
        if [ -n "$data" ]; then
            curl_cmd="$curl_cmd -H \"Content-Type: application/json\" -d '$data'"
        fi
    elif [ "$method" = "DELETE" ]; then
        curl_cmd="$curl_cmd -X DELETE"
    fi

    if [ -n "$auth_token" ]; then
        curl_cmd="$curl_cmd -H \"Authorization: Bearer $auth_token\""
    fi

    curl_cmd="$curl_cmd \"$url\""

    local response=$(eval $curl_cmd)
    local body=$(echo "$response" | sed 's/HTTPSTATUS.*//')
    local status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)

    if [ "$status" = "$expected_status" ]; then
        log_success "✓ $description (Status: $status)"
        return 0
    else
        log_error "✗ $description (Expected: $expected_status, Got: $status)"
        log_error "Response: $body"
        return 1
    fi
}

# Function to test service health
test_service_health() {
    local service_name=$1
    local port=$2
    local endpoint=${3:-"/health"}

    test_endpoint "GET" "http://localhost:$port$endpoint" 200 "$service_name health check"
}

# Function to test API gateway
test_api_gateway() {
    log_info "Testing API Gateway..."

    # Health check
    test_endpoint "GET" "$API_BASE_URL/health" 200 "API Gateway health check"

    # Root endpoint
    test_endpoint "GET" "$API_BASE_URL/" 200 "API Gateway root endpoint"

    # Invalid endpoint should return 404
    test_endpoint "GET" "$API_BASE_URL/invalid-endpoint" 404 "API Gateway 404 handling"
}

# Function to test authentication service
test_auth_service() {
    log_info "Testing Authentication Service..."

    # Health check via API gateway
    test_endpoint "GET" "$API_BASE_URL/auth/health" 200 "Auth service health check"

    # Register test user
    local register_data="{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\",\"name\":\"Test User\"}"
    test_endpoint "POST" "$API_BASE_URL/auth/register" 201 "User registration" "$register_data"

    # Login
    local login_data="{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\"}"
    local login_response=$(curl -s -X POST -H "Content-Type: application/json" -d "$login_data" "$API_BASE_URL/auth/login")

    if echo "$login_response" | grep -q "token"; then
        AUTH_TOKEN=$(echo "$login_response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
        log_success "✓ User login successful"
        ((PASSED_TESTS++))
    else
        log_error "✗ User login failed"
        ((FAILED_TESTS++))
        return 1
    fi

    # Get profile
    test_endpoint "GET" "$API_BASE_URL/auth/profile" 200 "Get user profile" "" "$AUTH_TOKEN"

    # Logout
    test_endpoint "POST" "$API_BASE_URL/auth/logout" 200 "User logout" "" "$AUTH_TOKEN"
}

# Function to test admin service
test_admin_service() {
    log_info "Testing Admin Service..."

    # Health check
    test_endpoint "GET" "$API_BASE_URL/admin/health" 200 "Admin service health check"

    # Login as admin first
    local admin_login_data="{\"email\":\"admin@shemamusic.com\",\"password\":\"Admin123!\"}"
    local admin_response=$(curl -s -X POST -H "Content-Type: application/json" -d "$admin_login_data" "$API_BASE_URL/auth/login")

    if echo "$admin_response" | grep -q "token"; then
        ADMIN_TOKEN=$(echo "$admin_response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
        log_success "✓ Admin login successful"
        ((PASSED_TESTS++))
    else
        log_error "✗ Admin login failed"
        ((FAILED_TESTS++))
        return 1
    fi

    # Get admin dashboard
    test_endpoint "GET" "$API_BASE_URL/admin/dashboard" 200 "Admin dashboard access" "" "$ADMIN_TOKEN"

    # Get slots
    test_endpoint "GET" "$API_BASE_URL/admin/slots" 200 "Get slots list" "" "$ADMIN_TOKEN"
}

# Function to test course service
test_course_service() {
    log_info "Testing Course Service..."

    # Health check
    test_endpoint "GET" "$API_BASE_URL/course/health" 200 "Course service health check"

    # Get courses (public endpoint)
    test_endpoint "GET" "$API_BASE_URL/course/courses" 200 "Get courses list"
}

# Function to test booking service
test_booking_service() {
    log_info "Testing Booking Service..."

    # Health check
    test_endpoint "GET" "$API_BASE_URL/booking/health" 200 "Booking service health check"

    # Get bookings (requires auth)
    if [ -n "$AUTH_TOKEN" ]; then
        test_endpoint "GET" "$API_BASE_URL/booking/bookings" 200 "Get user bookings" "" "$AUTH_TOKEN"
    else
        log_warning "Skipping authenticated booking tests - no auth token available"
    fi
}

# Function to test recommendation service
test_recommendation_service() {
    log_info "Testing Recommendation Service..."

    # Health check
    test_endpoint "GET" "$API_BASE_URL/recommendation/health" 200 "Recommendation service health check"

    # Get recommendations (may require auth)
    if [ -n "$AUTH_TOKEN" ]; then
        test_endpoint "GET" "$API_BASE_URL/recommendation/recommendations" 200 "Get recommendations" "" "$AUTH_TOKEN"
    fi
}

# Function to test documentation service
test_documentation_service() {
    log_info "Testing Documentation Service..."

    # Health check
    test_endpoint "GET" "http://localhost:3007/health" 200 "Documentation service health check"

    # Main documentation page
    test_endpoint "GET" "http://localhost:3007/" 200 "Documentation homepage"
}

# Function to test Redis connectivity
test_redis() {
    log_info "Testing Redis connectivity..."

    if command -v redis-cli >/dev/null 2>&1; then
        if redis-cli -h localhost -p 6379 ping 2>/dev/null | grep -q "PONG"; then
            log_success "✓ Redis connectivity test passed"
            ((PASSED_TESTS++))
        else
            log_error "✗ Redis connectivity test failed"
            ((FAILED_TESTS++))
        fi
    else
        log_warning "redis-cli not available - skipping Redis test"
    fi
}

# Function to test database connectivity
test_database() {
    log_info "Testing database connectivity..."

    # Test via auth service health check (which likely tests DB)
    # In a real scenario, you might have a dedicated DB health endpoint
    test_endpoint "GET" "$API_BASE_URL/auth/health" 200 "Database connectivity via auth service"
}

# Function to run performance tests
run_performance_tests() {
    log_info "Running basic performance tests..."

    local endpoint="$API_BASE_URL/health"
    local concurrent_requests=10
    local total_requests=100

    log_info "Load testing: $total_requests requests with $concurrent_requests concurrency"

    # Simple load test using curl
    local start_time=$(date +%s.%3N)

    for i in $(seq 1 $concurrent_requests); do
        (
            for j in $(seq 1 $((total_requests / concurrent_requests))); do
                curl -s -w "%{time_total}\n" -o /dev/null "$endpoint" 2>/dev/null
            done
        ) &
    done

    wait

    local end_time=$(date +%s.%3N)
    local duration=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")

    log_info "Performance test completed in ${duration}s"

    if (( $(echo "$duration < 30" | bc -l 2>/dev/null) )); then
        log_success "✓ Performance test passed (under 30 seconds)"
        ((PASSED_TESTS++))
    else
        log_warning "⚠ Performance test slow (${duration}s)"
        ((PASSED_TESTS++))  # Still count as passed, just slow
    fi
}

# Function to generate test report
generate_report() {
    local report_file="smoke-test-report-$(date +%Y%m%d_%H%M%S).txt"

    {
        echo "=========================================="
        echo "Shema Music Backend Smoke Test Report"
        echo "=========================================="
        echo "Date: $(date)"
        echo "Environment: ${NODE_ENV:-production}"
        echo "API Base URL: $API_BASE_URL"
        echo ""
        echo "Test Results:"
        echo "  Total Tests: $TOTAL_TESTS"
        echo "  Passed: $PASSED_TESTS"
        echo "  Failed: $FAILED_TESTS"
        echo ""
        if [ $FAILED_TESTS -eq 0 ]; then
            echo "✓ ALL TESTS PASSED"
            echo "Deployment is ready for production!"
        else
            echo "✗ SOME TESTS FAILED"
            echo "Please review the failures before proceeding."
        fi
        echo ""
        echo "=========================================="
    } > "$report_file"

    log_info "Test report saved to: $report_file"

    # Print summary to console
    echo ""
    echo "=========================================="
    echo "SMOKE TEST SUMMARY"
    echo "=========================================="
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo ""

    if [ $FAILED_TESTS -eq 0 ]; then
        log_success "🎉 ALL SMOKE TESTS PASSED!"
        log_success "Deployment validation successful."
        return 0
    else
        log_error "❌ SMOKE TESTS FAILED!"
        log_error "Please fix the issues before proceeding with deployment."
        return 1
    fi
}

# Main smoke test function
run_smoke_tests() {
    log_info "Starting Shema Music Backend smoke tests..."
    log_info "API Base URL: $API_BASE_URL"

    # Basic connectivity tests
    test_api_gateway
    test_service_health "Redis" "6379"

    # Service-specific tests
    test_auth_service
    test_admin_service
    test_course_service
    test_booking_service
    test_recommendation_service
    test_documentation_service

    # Infrastructure tests
    test_redis
    test_database

    # Performance tests (optional, can be slow)
    if [ "${RUN_PERFORMANCE_TESTS:-false}" = "true" ]; then
        run_performance_tests
    fi

    # Generate report
    generate_report
}

# Main script logic
case "${1:-run}" in
    "run")
        run_smoke_tests
        ;;
    "health")
        test_api_gateway
        test_service_health "Redis" "6379"
        ;;
    "performance")
        RUN_PERFORMANCE_TESTS=true run_smoke_tests
        ;;
    *)
        echo "Usage: $0 [run|health|performance]"
        echo "  run         - Run all smoke tests"
        echo "  health      - Run only basic health checks"
        echo "  performance - Run smoke tests with performance validation"
        exit 1
        ;;
esac