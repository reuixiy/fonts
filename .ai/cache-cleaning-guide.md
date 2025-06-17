# Cache Cleaning Guide

This document explains how to use the cache cleaning functionality in the Web Font Auto-Subsetting Workflow.

## Quick Start

```bash
# Clean everything
pnpm run clean

# Clean only specific items
pnpm run clean:build    # Only build artifacts
pnpm run clean:deps     # Only dependencies  
pnpm run clean:git      # Only git cache branch
```

## What Gets Cleaned

### Build Artifacts (`--build`)
- `build/` - Generated fonts and CSS files
- `downloads/` - Downloaded font files
- `.version-cache.json` - Local version cache

### Dependencies (`--deps`)
- `node_modules/` - Node.js packages
- `pnpm-lock.yaml` - pnpm lock file
- `package-lock.json` - npm lock file (if exists)
- `yarn.lock` - yarn lock file (if exists)

### Git Cache (`--git`)
- Local `cache` branch
- Remote `cache` branch (if exists)

### System Cache (`--system`)
- `.DS_Store` files (macOS)
- `.npm/` - npm cache
- `.pnpm-store/` - pnpm store
- `.cache/` - general cache directory
- `__pycache__/` - Python cache directories
- `*.pyc` - Python compiled files

## Advanced Usage

### Direct Script Usage

```bash
# Show all options
./clean-cache.sh --help

# Clean multiple specific items
./clean-cache.sh --deps --system

# Clean everything (default)
./clean-cache.sh
```

### Common Scenarios

#### Fresh Start
```bash
# Complete reset for fresh development
pnpm run clean
pnpm install
npm start -- --build-only
```

#### Build Issues
```bash
# Clean only build artifacts and rebuild
pnpm run clean:build
npm start -- --build-only
```

#### Dependency Issues
```bash
# Clean and reinstall dependencies
pnpm run clean:deps
pnpm install
```

#### Git Cache Issues
```bash
# Reset version cache branch
pnpm run clean:git
# The version checker will recreate it on next run
```

## Safety Features

- **Confirmation**: The script safely checks for file existence before removal
- **Git Safety**: Won't delete cache branch if you're currently on it (switches first)
- **Error Handling**: Continues cleaning even if some operations fail
- **Colored Output**: Clear visual feedback for each operation

## Post-Cleaning Steps

After cleaning, you typically need to:

1. **After cleaning dependencies**: `pnpm install`
2. **After cleaning build**: `npm start -- --build-only`
3. **After cleaning git cache**: Version checker will recreate on next run

## Troubleshooting

### Permission Errors
If you get permission errors:
```bash
chmod +x clean-cache.sh
```

### Script Not Found
If `./clean-cache.sh` doesn't work:
```bash
# Use npm scripts instead
pnpm run clean
```

### Git Errors
If git cache cleaning fails:
- Ensure you're in a git repository
- Check if you have permission to delete branches
- Manually delete: `git branch -D cache`
