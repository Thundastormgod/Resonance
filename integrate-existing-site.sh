#!/bin/bash

# Integration script for existing Netlify deployment
# This script helps integrate the Docker pipeline with your existing Netlify site

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

echo "🔗 Resonance News - Existing Site Integration"
echo "============================================="
echo ""

log_info "This script will integrate the Docker pipeline with your existing Netlify deployment"
log_info "from https://github.com/Thundastormgod/Resonance"
echo ""

# Check if user is logged into Netlify
log_info "Checking Netlify authentication..."
if ! ./node_modules/.bin/netlify status &> /dev/null; then
    log_warning "Please log into Netlify first:"
    echo "  ./node_modules/.bin/netlify login"
    exit 1
fi

log_success "Netlify authentication confirmed"

# Option 1: Link to existing site
echo ""
echo "Integration Options:"
echo "1. Link to existing Netlify site (recommended for immediate use)"
echo "2. Create GitHub integration guide (recommended for long-term)"
echo "3. Both (complete integration)"
echo ""

read -p "Choose option (1, 2, or 3): " choice

case $choice in
    1|3)
        log_info "Linking to existing Netlify site..."
        echo ""
        log_info "Please select 'Use current git remote origin' when prompted"
        ./node_modules/.bin/netlify link
        
        if [ -f ".netlify/state.json" ]; then
            log_success "Successfully linked to existing Netlify site!"
            
            # Test deployment
            log_info "Testing Docker-based deployment to existing site..."
            ./deploy.sh netlify
        else
            log_error "Failed to link to existing site"
            exit 1
        fi
        ;;
esac

case $choice in
    2|3)
        log_info "Creating GitHub integration guide..."
        
        cat > GITHUB_INTEGRATION.md << 'EOF'
# GitHub Integration Guide

## Integrating Docker Pipeline with Existing Repository

Your existing Netlify deployment from `https://github.com/Thundastormgod/Resonance` can be enhanced with the Docker pipeline.

### Steps to Integrate:

1. **Copy Pipeline Files to GitHub Repository**
   ```bash
   # Copy these files to your GitHub repository:
   .github/workflows/deploy.yml    # CI/CD pipeline
   Dockerfile.frontend            # Frontend container
   Dockerfile.backend             # Backend container  
   netlify.dockerfile             # Netlify build
   docker-compose.yml             # Development setup
   deploy.sh                      # Deployment automation
   ```

2. **Update Netlify Build Settings**
   In your Netlify dashboard:
   - Build command: `./deploy.sh build && ./deploy.sh netlify`
   - Publish directory: `netlify-deploy`
   - Node version: `20`

3. **Set Environment Variables**
   Add these to Netlify dashboard:
   ```
   NODE_VERSION=20
   DOCKER_BUILDKIT=1
   SANITY_PROJECT_ID=your_project_id
   VITE_SANITY_TOKEN=your_token
   ```

4. **GitHub Actions Setup**
   Add these secrets to GitHub repository:
   ```
   NETLIFY_AUTH_TOKEN=your_netlify_token
   NETLIFY_SITE_ID=your_site_id
   ```

### Benefits After Integration:

✅ **Automated Deployment**: Push to main branch triggers deployment
✅ **Docker Consistency**: Same environment for dev/staging/production  
✅ **Enhanced Development**: Local Docker environment with hot reload
✅ **Container Registry**: Docker images pushed to GitHub Container Registry
✅ **Zero Downtime**: Seamless integration with existing deployment

### Development Workflow:

```bash
# Local development (traditional)
npm run dev

# Local development (Docker)
npm run docker:dev

# Deploy to production
git push origin main  # Triggers automatic deployment
```

### Manual Deployment:

```bash
# Full pipeline
npm run pipeline:full

# Deploy to Netlify only  
npm run deploy:netlify
```

EOF
        
        log_success "Created GITHUB_INTEGRATION.md with detailed instructions"
        ;;
esac

echo ""
log_success "Integration completed successfully!"
echo ""
echo "Next Steps:"
echo "1. Your existing Netlify deployment will continue working normally"
echo "2. You now have enhanced Docker-based development and deployment"
echo "3. Consider pushing the pipeline files to your GitHub repository for full automation"
echo ""
echo "Available commands:"
echo "  npm run docker:dev      # Docker development environment"
echo "  npm run deploy:netlify  # Deploy using Docker pipeline"
echo "  npm run pipeline:full   # Complete build+test+deploy"
echo ""
