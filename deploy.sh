#!/bin/bash

# Resonance News - Docker to Netlify Deployment Pipeline
# This script provides a complete development-to-production pipeline

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="resonance-news"
DOCKER_REGISTRY="ghcr.io"  # Change to your preferred registry
REGISTRY_USER="${GITHUB_USERNAME:-$USER}"

# Functions
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

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check Netlify CLI (local or global)
    if ! command -v netlify &> /dev/null && ! [ -f "./node_modules/.bin/netlify" ]; then
        log_warning "Netlify CLI not found. Installing locally..."
        npm install --save-dev netlify-cli
    fi
    
    # Use local netlify CLI if available
    if [ -f "./node_modules/.bin/netlify" ]; then
        NETLIFY_CMD="./node_modules/.bin/netlify"
    else
        NETLIFY_CMD="netlify"
    fi
    
    log_success "All dependencies are available"
}

build_docker_images() {
    log_info "Building Docker images..."
    
    # Build frontend image
    log_info "Building frontend image..."
    docker build -f Dockerfile.frontend -t ${PROJECT_NAME}-frontend:latest .
    
    # Build backend image
    log_info "Building backend image..."
    docker build -f Dockerfile.backend -t ${PROJECT_NAME}-backend:latest .
    
    # Build Netlify-optimized image
    log_info "Building Netlify deployment image..."
    docker build -f netlify.dockerfile -t ${PROJECT_NAME}-netlify:latest .
    
    log_success "Docker images built successfully"
}

test_docker_locally() {
    log_info "Testing Docker containers locally..."
    
    # Stop any existing containers
    docker-compose down 2>/dev/null || true
    
    # Start containers
    docker-compose up -d
    
    # Wait for containers to be ready
    log_info "Waiting for containers to be ready..."
    sleep 10
    
    # Test frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        log_success "Frontend container is responding"
    else
        log_error "Frontend container is not responding"
        docker-compose logs frontend
        exit 1
    fi
    
    # Test backend
    if curl -f http://localhost:3333 > /dev/null 2>&1; then
        log_success "Backend container is responding"
    else
        log_warning "Backend container may still be starting up"
    fi
    
    # Test Nginx proxy
    if curl -f http://localhost:80 > /dev/null 2>&1; then
        log_success "Nginx proxy is responding"
    else
        log_warning "Nginx proxy may have issues"
    fi
    
    log_success "Local Docker testing completed"
}

extract_build_for_netlify() {
    log_info "Extracting build artifacts for Netlify deployment..."
    
    # Create temporary directory
    mkdir -p ./netlify-deploy
    
    # Extract built files from Docker container
    docker run --rm -v $(pwd)/netlify-deploy:/netlify ${PROJECT_NAME}-netlify:latest
    
    log_success "Build artifacts extracted to ./netlify-deploy"
}

deploy_to_netlify() {
    log_info "Deploying to Netlify..."
    
    # Check if we have build artifacts
    if [ ! -d "./netlify-deploy" ]; then
        log_error "No build artifacts found. Run extract_build_for_netlify first."
        exit 1
    fi
    
    # Deploy to Netlify
    cd netlify-deploy
    
    # Check if this is a new deployment or update
    if [ -f "../.netlify/state.json" ]; then
        log_info "Deploying to existing Netlify site..."
        $NETLIFY_CMD deploy --prod --dir=.
    else
        log_info "Creating new Netlify site..."
        $NETLIFY_CMD deploy --prod --dir=. --open
    fi
    
    cd ..
    
    log_success "Deployment to Netlify completed"
}

push_to_registry() {
    log_info "Pushing Docker images to registry..."
    
    # Tag images for registry
    docker tag ${PROJECT_NAME}-frontend:latest ${DOCKER_REGISTRY}/${REGISTRY_USER}/${PROJECT_NAME}-frontend:latest
    docker tag ${PROJECT_NAME}-backend:latest ${DOCKER_REGISTRY}/${REGISTRY_USER}/${PROJECT_NAME}-backend:latest
    
    # Push to registry
    docker push ${DOCKER_REGISTRY}/${REGISTRY_USER}/${PROJECT_NAME}-frontend:latest
    docker push ${DOCKER_REGISTRY}/${REGISTRY_USER}/${PROJECT_NAME}-backend:latest
    
    log_success "Docker images pushed to registry"
}

cleanup() {
    log_info "Cleaning up temporary files..."
    
    # Stop containers
    docker-compose down 2>/dev/null || true
    
    # Remove temporary deployment directory
    rm -rf ./netlify-deploy
    
    log_success "Cleanup completed"
}

show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev          - Start development environment"
    echo "  build        - Build Docker images"
    echo "  test         - Test Docker containers locally"
    echo "  deploy       - Full deployment pipeline (build + test + deploy)"
    echo "  netlify      - Deploy to Netlify only"
    echo "  push         - Push Docker images to registry"
    echo "  clean        - Clean up containers and temporary files"
    echo "  status       - Show status of running containers"
    echo ""
    echo "Examples:"
    echo "  $0 dev       - Start development environment"
    echo "  $0 deploy    - Run full deployment pipeline"
    echo "  $0 clean     - Clean up everything"
}

# Main execution
case "${1:-}" in
    "dev")
        log_info "Starting development environment..."
        check_dependencies
        npm run dev
        ;;
    "build")
        check_dependencies
        build_docker_images
        ;;
    "test")
        check_dependencies
        test_docker_locally
        ;;
    "deploy")
        log_info "Running full deployment pipeline..."
        check_dependencies
        build_docker_images
        test_docker_locally
        extract_build_for_netlify
        deploy_to_netlify
        cleanup
        ;;
    "netlify")
        check_dependencies
        extract_build_for_netlify
        deploy_to_netlify
        cleanup
        ;;
    "push")
        check_dependencies
        push_to_registry
        ;;
    "clean")
        cleanup
        ;;
    "status")
        docker-compose ps
        ;;
    *)
        show_usage
        exit 1
        ;;
esac

log_success "Pipeline completed successfully!"
