#!/bin/bash

# Clean Cache Script for Web Font Auto-Subsetting Workflow
# This script helps clean various cache files and build artifacts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to safely remove directory/file
safe_remove() {
    local target="$1"
    local description="$2"
    
    if [ -e "$target" ]; then
        print_status "Removing $description..."
        rm -rf "$target"
        print_success "Removed $description"
    else
        print_warning "$description not found, skipping"
    fi
}

# Function to clean git cache branch
clean_git_cache() {
    print_status "Checking for git cache branch..."
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_warning "Not in a git repository, skipping git cache cleanup"
        return
    fi
    
    # Check if cache branch exists
    if git show-ref --verify --quiet refs/heads/cache; then
        print_status "Found cache branch, cleaning..."
        
        # Save current branch
        current_branch=$(git rev-parse --abbrev-ref HEAD)
        
        # Switch to main/master if we're on cache branch
        if [ "$current_branch" = "cache" ]; then
            if git show-ref --verify --quiet refs/heads/main; then
                git checkout main
            elif git show-ref --verify --quiet refs/heads/master; then
                git checkout master
            else
                print_error "Cannot switch away from cache branch"
                return 1
            fi
        fi
        
        # Delete cache branch
        git branch -D cache
        print_success "Deleted local cache branch"
        
        # Delete remote cache branch if it exists
        if git ls-remote --heads origin cache | grep -q cache; then
            print_status "Deleting remote cache branch..."
            git push origin --delete cache 2>/dev/null || print_warning "Could not delete remote cache branch"
        fi
    else
        print_warning "No cache branch found"
    fi
}

# Function to clean node modules
clean_node_modules() {
    print_status "Cleaning Node.js dependencies..."
    safe_remove "node_modules" "node_modules directory"
    safe_remove "pnpm-lock.yaml" "pnpm lock file"
    safe_remove "package-lock.json" "npm lock file"
    safe_remove "yarn.lock" "yarn lock file"
}

# Function to clean build artifacts
clean_build_artifacts() {
    print_status "Cleaning build artifacts..."
    safe_remove "build" "build directory"
    safe_remove "dist" "TypeScript compiled output directory"
    safe_remove "downloads" "downloads directory"
    safe_remove ".version-cache.json" "local version cache file"
}

# Function to clean system cache
clean_system_cache() {
    print_status "Cleaning system cache files..."
    
    # Clean macOS specific files
    if [[ "$OSTYPE" == "darwin"* ]]; then
        find . -name ".DS_Store" -type f -delete 2>/dev/null || true
        print_success "Removed .DS_Store files"
    fi
    
    # Clean common cache files
    safe_remove ".npm" "npm cache directory"
    safe_remove ".pnpm-store" "pnpm store directory"
    safe_remove ".cache" "cache directory"
    
    # Clean Python cache
    find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find . -name "*.pyc" -type f -delete 2>/dev/null || true
    print_success "Removed Python cache files"
}

# Function to show help
show_help() {
    echo "Clean Cache Script for Web Font Auto-Subsetting Workflow"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --all, -a           Clean everything (default)"
    echo "  --build, -b         Clean only build artifacts"
    echo "  --deps, -d          Clean only dependencies (node_modules, etc.)"
    echo "  --git, -g           Clean only git cache branch"
    echo "  --system, -s        Clean only system cache files"
    echo "  --help, -h          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                  # Clean everything"
    echo "  $0 --build          # Clean only build files"
    echo "  $0 --deps --system  # Clean dependencies and system cache"
    echo ""
}

# Main function
main() {
    echo -e "${BLUE}🧹 Web Font Cache Cleaner${NC}"
    echo "=================================="
    
    # Parse command line arguments
    clean_all=true
    clean_build=false
    clean_deps=false
    clean_git_cache_only=false
    clean_system_only=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --all|-a)
                clean_all=true
                shift
                ;;
            --build|-b)
                clean_all=false
                clean_build=true
                shift
                ;;
            --deps|-d)
                clean_all=false
                clean_deps=true
                shift
                ;;
            --git|-g)
                clean_all=false
                clean_git_cache_only=true
                shift
                ;;
            --system|-s)
                clean_all=false
                clean_system_only=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Execute cleaning based on options
    if [ "$clean_all" = true ]; then
        print_status "Cleaning all cache and build files..."
        clean_build_artifacts
        clean_node_modules
        clean_git_cache
        clean_system_cache
    else
        if [ "$clean_build" = true ]; then
            clean_build_artifacts
        fi
        
        if [ "$clean_deps" = true ]; then
            clean_node_modules
        fi
        
        if [ "$clean_git_cache_only" = true ]; then
            clean_git_cache
        fi
        
        if [ "$clean_system_only" = true ]; then
            clean_system_cache
        fi
    fi
    
    echo ""
    print_success "Cache cleaning completed! 🎉"
    echo ""
    print_status "Next steps:"
    echo "  • Run 'pnpm install' to reinstall dependencies"
    echo "  • Run 'pnpm run build' to compile TypeScript"
    echo "  • Run 'pnpm start -- --build-only' to rebuild fonts"
    echo ""
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
