#!/bin/bash

# ATMA API Gateway Docker Build Script
# This script builds and optionally runs the API Gateway Docker container

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
IMAGE_NAME="atma-api-gateway"
IMAGE_TAG="latest"
BUILD_ONLY=false
RUN_CONTAINER=false
DEVELOPMENT=false

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -t, --tag TAG        Set image tag (default: latest)"
    echo "  -n, --name NAME      Set image name (default: atma-api-gateway)"
    echo "  -b, --build-only     Build image only, don't run"
    echo "  -r, --run            Build and run container"
    echo "  -d, --dev            Run in development mode"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --build-only                    # Build image only"
    echo "  $0 --run                          # Build and run container"
    echo "  $0 --run --dev                    # Build and run in development mode"
    echo "  $0 --tag v1.0.0 --run             # Build with specific tag and run"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -n|--name)
            IMAGE_NAME="$2"
            shift 2
            ;;
        -b|--build-only)
            BUILD_ONLY=true
            shift
            ;;
        -r|--run)
            RUN_CONTAINER=true
            shift
            ;;
        -d|--dev)
            DEVELOPMENT=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running"
    exit 1
fi

# Check if we're in the correct directory
if [[ ! -f "Dockerfile" ]]; then
    print_error "Dockerfile not found. Please run this script from the api-gateway directory."
    exit 1
fi

if [[ ! -f "package.json" ]]; then
    print_error "package.json not found. Please run this script from the api-gateway directory."
    exit 1
fi

# Build the Docker image
print_status "Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG}"

# Build arguments
BUILD_ARGS=""
if [[ "$DEVELOPMENT" == true ]]; then
    BUILD_ARGS="--build-arg NODE_ENV=development"
fi

# Execute build
if docker build $BUILD_ARGS -t "${IMAGE_NAME}:${IMAGE_TAG}" .; then
    print_success "Docker image built successfully: ${IMAGE_NAME}:${IMAGE_TAG}"
else
    print_error "Failed to build Docker image"
    exit 1
fi

# Show image size
IMAGE_SIZE=$(docker images "${IMAGE_NAME}:${IMAGE_TAG}" --format "table {{.Size}}" | tail -n 1)
print_status "Image size: ${IMAGE_SIZE}"

# If build-only flag is set, exit here
if [[ "$BUILD_ONLY" == true ]]; then
    print_success "Build completed. Use 'docker run' or 'docker-compose up' to run the container."
    exit 0
fi

# Run the container if requested
if [[ "$RUN_CONTAINER" == true ]]; then
    print_status "Starting container..."
    
    # Stop existing container if running
    if docker ps -q -f name=atma-api-gateway | grep -q .; then
        print_warning "Stopping existing container..."
        docker stop atma-api-gateway || true
        docker rm atma-api-gateway || true
    fi
    
    # Create network if it doesn't exist
    if ! docker network ls | grep -q atma-network; then
        print_status "Creating Docker network: atma-network"
        docker network create atma-network
    fi
    
    # Run container based on mode
    if [[ "$DEVELOPMENT" == true ]]; then
        print_status "Running in development mode with docker-compose..."
        if command -v docker-compose &> /dev/null; then
            docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
        else
            print_error "docker-compose not found. Please install docker-compose or use Docker directly."
            exit 1
        fi
    else
        print_status "Running in production mode..."
        docker run -d \
            --name atma-api-gateway \
            --network atma-network \
            -p 3000:3000 \
            -e NODE_ENV=production \
            -e PORT=3000 \
            -v "$(pwd)/logs:/app/logs" \
            "${IMAGE_NAME}:${IMAGE_TAG}"
    fi
    
    # Wait for container to be ready
    print_status "Waiting for container to be ready..."
    sleep 5
    
    # Check if container is running
    if docker ps -q -f name=atma-api-gateway | grep -q .; then
        print_success "Container is running!"
        print_status "Container logs:"
        docker logs atma-api-gateway --tail 10
        
        # Test health endpoint
        print_status "Testing health endpoint..."
        sleep 2
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            print_success "Health check passed! API Gateway is ready."
            print_status "Access the API Gateway at: http://localhost:3000"
            print_status "Health check: http://localhost:3000/health"
            print_status "Detailed health: http://localhost:3000/health/detailed"
        else
            print_warning "Health check failed. Container may still be starting up."
            print_status "Check logs with: docker logs atma-api-gateway"
        fi
    else
        print_error "Container failed to start"
        print_status "Check logs with: docker logs atma-api-gateway"
        exit 1
    fi
fi

print_success "Script completed successfully!"
