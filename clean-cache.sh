#!/bin/bash

# Clean Cache Script for Web Font Auto-Subsetting Workflow

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to safely remove directory/file
safe_remove() {
    local target="$1"
    
    if [ -e "$target" ]; then
        rm -rf "$target"
        print_success "Removed $target"
    fi
}

# Function to clean git cache branch
clean_git_cache() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_warning "Not in a git repository, skipping git cache cleanup"
        return
    fi
    
    if git show-ref --verify --quiet refs/heads/cache; then
        print_info "Deleting cache branch..."
        current_branch=$(git rev-parse --abbrev-ref HEAD)
        
        if [ "$current_branch" = "cache" ]; then
            git checkout main 2>/dev/null || git checkout master 2>/dev/null || {
                print_warning "Cannot switch away from cache branch"
                return
            }
        fi
        
        git branch -D cache
        git push origin --delete cache 2>/dev/null || true
        print_success "Deleted cache branch"
    fi
}

# Function to clean node modules
clean_node_modules() {
    print_info "Cleaning Node.js dependencies..."
    safe_remove "node_modules"
}

# Function to clean build artifacts
clean_build_artifacts() {
    print_info "Cleaning build artifacts..."
    safe_remove "build"
    safe_remove "dist"
    safe_remove "downloads"
    safe_remove ".version-cache.json"
}

# Function to clean system cache
clean_system_cache() {
    # Clean macOS .DS_Store files
    if [[ "$OSTYPE" == "darwin"* ]]; then
        find . -name ".DS_Store" -type f -delete 2>/dev/null || true
        print_success "Removed .DS_Store files"
    fi
}

# Function to show help
show_help() {
    echo "Clean Cache Script for Web Font Auto-Subsetting Workflow"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --build, -b         Clean only build artifacts"
    echo "  --deps, -d          Clean only dependencies (node_modules)"
    echo "  --git, -g           Clean only git cache branch"
    echo "  --help, -h          Show this help message"
    echo ""
}

# Main function
main() {
    echo -e "${BLUE}🧹 Web Font Cache Cleaner${NC}"
    echo "=================================="
    
    # Default: clean everything if no arguments
    if [ $# -eq 0 ]; then
        print_info "Cleaning all cache and build files..."
        clean_build_artifacts
        clean_node_modules
        clean_git_cache
        clean_system_cache
        echo ""
        print_success "Cache cleaning completed! 🎉"
        return
    fi
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --build|-b)
                clean_build_artifacts
                shift
                ;;
            --deps|-d)
                clean_node_modules
                shift
                ;;
            --git|-g)
                clean_git_cache
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                print_warning "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    echo ""
    print_success "Cache cleaning completed! 🎉"
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
