# Web Font Auto-Subsetting Workflow

An automated workflow for downloading, subsetting, and deploying web fonts with GitHub Actions.

## 🎯 Features

- **Automated Version Detection**: Daily checks for font updates from multiple sources (HK Time 00:00)
- **Size-Based Font Chunking**: Google Fonts-style splitting with optimized chunk sizes
- **Progressive Loading**: Critical characters load first, others load on-demand
- **WOFF2 Output**: Modern compression for optimal web performance
- **Smart CSS Generation**: Multiple @font-face rules with unicode-range declarations
- **Complete Coverage**: Ensures no characters are lost during chunking process
- **GitHub Actions Integration**: Fully automated CI/CD pipeline
- **Incremental Deployment**: Selective builds preserve all existing fonts while updating only changed ones

## 📦 Supported Fonts

### Chinese Fonts

#### I.Ming CP (Traditional Chinese Serif)
- **Font ID**: `imingcp`
- **Weight**: 400 (Regular)
- **Source**: [ichitenfont/I.Ming](https://github.com/ichitenfont/I.Ming)
- **License**: [IPA Font License Agreement v1.0](https://github.com/ichitenfont/I.Ming/blob/master/LICENSE.md)
- **Description**: A high-quality Traditional Chinese serif font based on Mincho style

#### LXGW WenKai TC (Traditional Chinese Handwriting)
- **Font ID**: `lxgwwenkaitc`
- **Weight**: 300 (Light)
- **Source**: [lxgw/LxgwWenkaiTC](https://github.com/lxgw/LxgwWenkaiTC)
- **License**: [SIL Open Font License 1.1](https://github.com/lxgw/LxgwWenkaiTC/blob/main/OFL.txt)
- **Description**: A handwriting-style Traditional Chinese font with elegant strokes

### Variable Fonts

#### Amstelvar (Latin Variable Font)
- **Font ID**: `amstelvar`
- **Variants**: Roman, Italic
- **Weight Range**: 100-900 (Variable)
- **Source**: [googlefonts/amstelvar](https://github.com/googlefonts/amstelvar)
- **License**: [SIL Open Font License 1.1](https://github.com/googlefonts/amstelvar/blob/main/OFL.txt)
- **Description**: A parametric variable font with multiple design axes

## 📄 Font Licensing

All fonts included in this project maintain their original licenses:

- **I.Ming CP**: Available under IPA Font License Agreement v1.0
- **LXGW WenKai TC**: Available under SIL Open Font License 1.1  
- **Amstelvar**: Available under SIL Open Font License 1.1

Please refer to each font's source repository for complete license terms and attribution requirements.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (TypeScript compilation and runtime)
- pnpm 9+ (package manager)
- Python 3.8+ (for font processing)
- `fonttools` with WOFF support

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd fonts
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Install fonttools** (required for font processing)
   ```bash
   # macOS with Homebrew
   brew install fonttools
   
   # Or with pip
   pip install 'fonttools[woff]'
   ```

4. **Set up GitHub token** (for API access)
   ```bash
   export GITHUB_TOKEN=your_github_token
   ```

### Manual Usage

```bash
# Complete workflows
pnpm start                    # Full workflow with version checking
pnpm start -- --build-only   # Build all fonts without version checking
pnpm start -- --fonts <ids>  # Process specific fonts (e.g., imingcp lxgwwenkaitc)

# Individual steps (TypeScript)
pnpm run check-versions       # Check for font version updates
pnpm run download-fonts       # Download fonts
pnpm run subset-fonts         # Process and subset fonts
pnpm run generate-css         # Generate CSS files
pnpm run generate-license     # Generate license information

# Development and Build Commands
pnpm run build               # Compile TypeScript to JavaScript (dist/)
pnpm run type-check          # Type checking without compilation
pnpm run lint                # ESLint code linting
pnpm run lint:fix            # Auto-fix linting issues
pnpm run dev                 # Development mode with watch (tsx watch)
```

**Font IDs**: `imingcp`, `lxgwwenkaitc`, `amstelvar`

### Cache Management

Clean various cache files and build artifacts:

```bash
# Clean everything (dist/, build/, downloads/, node_modules, git cache)
pnpm run clean:all

# Clean only build artifacts (dist/, build/, downloads/, cache files)
pnpm run clean:build

# Clean only dependencies (node_modules, lock files)
pnpm run clean:deps

# Clean only git cache branch
pnpm run clean:git

# Default clean (same as clean:all)
pnpm run clean

# Alternative: use script directly with more options
./clean-cache.sh --help
```

## ⚙️ Configuration

Font configuration is stored in `src/config/fonts.json`. This file defines:

- Font sources and release patterns
- Size-based chunking strategies
- Character priority rankings
- Output specifications
- CSS generation parameters

The project is built with **TypeScript** for enhanced type safety and developer experience. All source files use absolute imports with path mapping configured in `tsconfig.json`.

### Example Configuration

```json
{
  "fonts": {
    "imingcp": {
      "name": "I.MingCP",
      "source": {
        "type": "github-release",
        "owner": "ichitenfont",
        "repo": "I.Ming",
        "filePattern": "I.MingCP-{version}.ttf"
      },
      "weight": 400,
      "subset": {
        "type": "size-based-chunks",
        "strategy": "chinese-frequency", 
        "chunkSizes": [80, 150, 150, 150, 200, 200, 250],
        "maxChunks": 30,
        "ensureCompleteCoverage": true,
        "priorityData": "traditional-chinese-frequency"
      }
    }
  }
}
```

### Chunking Configuration Options

- **chunkSizes**: Array of target sizes in KB for each chunk
- **strategy**: Character priority algorithm (`chinese-frequency`, `latin-basic`)
- **maxChunks**: Maximum number of chunks to prevent excessive splitting
- **ensureCompleteCoverage**: Validate that all original characters are preserved
- **priorityData**: Character frequency data source for optimization

## 🔄 Automated Workflow

### Daily Version Check
- **Trigger**: Every day at 16:00 UTC (00:00 AM Hong Kong Time)
- **Action**: Check for new font releases using GitHub API and git commits
- **Result**: Triggers build workflow if updates found
- **Optimization**: Only builds fonts that have actual version changes

### Build and Deploy
- **Trigger**: When version check finds updates, or manual dispatch
- **Intelligence**: Only processes fonts that have version updates (not all fonts)
- **Deployment Strategy**: 
  - **Full Builds**: Complete rebuild when building all fonts
  - **Selective Builds**: Preserves existing fonts while updating only changed ones
- **Process**:
  1. Download latest font files (skip if already exist and valid)
  2. Analyze font character coverage and apply frequency-based priority ranking
  3. Generate size-based chunks (80KB-250KB per chunk) with complete coverage validation
  4. Create multiple WOFF2 files per font with progressive loading optimization
  5. Generate CSS files with unicode-range declarations for each chunk
  6. Generate license information
  7. Deploy to `build` branch with incremental updates

### Performance Optimizations
- **Smart Caching**: Skip downloads when files already exist and pass validation
- **Incremental Processing**: Only subset fonts that need updates
- **Selective Builds**: GitHub Actions only builds changed fonts, preserves all existing fonts in build branch
- **Chunked Loading**: Progressive font loading with critical characters first
- **Size-Based Splitting**: Optimal chunk sizes for fast loading and efficient caching

## 📁 Output Structure

The build process creates the following structure in the `build` branch with chunked fonts:

```
build/
├── fonts/
│   ├── imingcp/
│   │   ├── imingcp-chunk-0.woff2     # Critical chars (80KB)
│   │   ├── imingcp-chunk-1.woff2     # High-freq chars (150KB)
│   │   ├── imingcp-chunk-2.woff2     # High-freq chars (150KB)
│   │   ├── imingcp-chunk-3.woff2     # Medium-freq chars (200KB)
│   │   ├── ...
│   │   └── imingcp-chunk-N.woff2     # Remaining chars (250KB)
│   ├── lxgwwenkaitc/
│   │   ├── lxgwwenkaitc-chunk-0.woff2
│   │   ├── lxgwwenkaitc-chunk-1.woff2
│   │   ├── ...
│   │   └── lxgwwenkaitc-chunk-M.woff2
│   └── amstelvar/
│       ├── amstelvar-roman-chunk-0.woff2
│       ├── amstelvar-roman-chunk-1.woff2
│       ├── amstelvar-italic-chunk-0.woff2
│       └── amstelvar-italic-chunk-1.woff2
├── css/
│   ├── imingcp.css                   # Individual font CSS with license header
│   ├── imingcp.min.css              # Minified version
│   ├── lxgwwenkaitc.css             # Individual font CSS with license header  
│   ├── lxgwwenkaitc.min.css         # Minified version
│   ├── amstelvar.css                # Individual font CSS with license header
│   ├── amstelvar.min.css            # Minified version
│   ├── fonts.css                    # Import-based unified CSS (@import statements)
│   └── fonts.min.css                # Import-based minified unified CSS
├── FONT_LICENSES.md                  # Human-readable license information
├── font-licenses.json                # Machine-readable license data
├── metadata.json                     # Build information
├── processing-metadata.json          # Font processing details
├── css-metadata.json                 # CSS generation details
└── download-metadata.json            # Download information
```

## 🎨 Using the Chunked Fonts

The chunked fonts provide progressive loading with optimal performance and include proper license headers:

### Option 1: Import-Based Unified CSS (Recommended)

```html
<!-- Loads all fonts via import statements -->
<link rel="stylesheet" href="https://your-domain.com/path-to-build/css/fonts.css">

<!-- Or use minified version -->
<link rel="stylesheet" href="https://your-domain.com/path-to-build/css/fonts.min.css">
```

### Option 2: Individual Font CSS

```html
<!-- Loads specific font family with all its chunks and license info -->
<link rel="stylesheet" href="https://your-domain.com/path-to-build/css/imingcp.css">

<!-- Or use minified version -->
<link rel="stylesheet" href="https://your-domain.com/path-to-build/css/imingcp.min.css">
```

### Option 3: Preload Critical Chunks

```html
<!-- Preload critical chunk for faster initial render -->
<link rel="preload" href="https://your-domain.com/path-to-build/fonts/imingcp/imingcp-chunk-0.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="https://your-domain.com/path-to-build/css/imingcp.css">
```

### CSS Structure

#### Unified CSS (fonts.css)
```css
/*!
 * Chinese Fonts CSS - Unified Import-Based Stylesheet
 * 
 * This file imports individual font CSS files with their respective licenses.
 * See individual CSS files for specific font license information.
 * 
 * Generated: 2025-06-18
 * Generator: Web Font Auto-Subsetting Workflow
 */

@import './imingcp.css';
@import './lxgwwenkaitc.css';
@import './amstelvar.css';
```

#### Individual Font CSS (imingcp.css)
```css
/*!
 * I.MingCP Web Font
 * 
 * Licensed under: IPA Font License Agreement v1.0
 * License URL: https://github.com/ichitenfont/I.Ming/blob/master/LICENSE.md
 * 
 * Generated: 2025-06-18
 * Generator: Web Font Auto-Subsetting Workflow
 */

/* Critical chunk - loads immediately */
@font-face {
  font-family: 'I.MingCP';
  src: url('../fonts/imingcp/imingcp-chunk-0.woff2') format('woff2');
  unicode-range: U+0020-007F, U+3000-303F, U+FF00-FFEF;
  font-display: swap;
  font-weight: 400;
  font-style: normal;
}

/* High-frequency Chinese characters - loads on demand */
@font-face {
  font-family: 'I.MingCP';
  src: url('../fonts/imingcp/imingcp-chunk-1.woff2') format('woff2');
  unicode-range: U+4E00-4EFF, U+5000-50FF;
  font-display: swap;
  font-weight: 400;
  font-style: normal;
}
```

## 🔧 Development

### Project Structure

```
.
├── .ai/                    # AI-generated documentation
├── .github/workflows/      # GitHub Actions workflows
├── dist/                   # TypeScript compiled output (build artifacts)
├── src/
│   ├── config/
│   │   └── fonts.json     # Font configuration
│   ├── fontSubset.ts      # Font subsetting logic (TypeScript)
│   ├── versionChecker.ts  # Version checking utility (TypeScript)
│   ├── types.ts           # TypeScript type definitions
│   └── index.ts          # Main entry point (TypeScript)
├── scripts/
│   ├── download-fonts.ts  # Font download script (TypeScript)
│   ├── generate-css.ts    # CSS generation script (TypeScript)
│   └── generate-license.ts # License generation script (TypeScript)
├── tsconfig.json          # TypeScript configuration
├── eslint.config.ts       # ESLint configuration (TypeScript)
├── clean-cache.sh         # Cache cleaning script
└── package.json
```

### Adding New Fonts

1. **Update configuration** in `src/config/fonts.json`
2. **Add font-specific logic** if needed in the TypeScript processing modules
3. **Update type definitions** in `src/types.ts` if new configuration options are added
4. **Test locally** with `pnpm run build` (compile TypeScript) and `pnpm start`
5. **Run type checking** with `pnpm run type-check` to ensure type safety
6. **Commit changes** to trigger automated build

### Local Testing

```bash
# Test complete workflows
pnpm start                    # Full workflow with version checking
pnpm start -- --build-only   # Build all fonts (skip version check)
pnpm start -- --fonts imingcp # Test specific font processing

# TypeScript Development
pnpm run build                # Compile TypeScript to dist/
pnpm run type-check          # Check types without compilation
pnpm run lint                # Lint TypeScript code
pnpm run lint:fix            # Auto-fix linting issues
pnpm run dev                 # Development mode with watch

# Test individual components
pnpm run check-versions       # Test version checking
pnpm run download-fonts       # Test font downloads
pnpm run subset-fonts         # Test font processing
pnpm run generate-css         # Test CSS generation

# Test cache management
pnpm run clean:build          # Clean build artifacts for fresh test
```

## 📊 Monitoring

### Build Status
- Check GitHub Actions tab for workflow status
- View build logs for detailed processing information

### Output Verification
- Check the `build` branch for generated files
- Verify font file sizes and CSS output
- Test font loading in browsers

## 🛠️ Troubleshooting

### Common Issues

**fonttools not found**
```bash
# Install fonttools
brew install fonttools
# or
pip install 'fonttools[woff]'
```

**GitHub API rate limits**
- Ensure `GITHUB_TOKEN` is set correctly
- Use personal access token for higher rate limits

**Font download failures**
- Check internet connectivity
- Verify font source URLs are still valid
- Check if font repositories have moved or changed structure

**Workflow always builds all fonts**
- Ensure `build-fonts.yml` is updated to use selective building
- Check that `updated-fonts` parameter is being passed correctly
- Verify version checker is detecting changes properly

**Build is too slow**
- Use `pnpm start -- --fonts <specific-id>` for faster testing
- Clean cache with `pnpm run clean:build` if files are corrupted
- Check if font subsetting is being skipped for existing files

**Files not being skipped when they should be**
- Delete corrupted files in `build/` or `downloads/` directories
- Run `pnpm run clean:build` to force regeneration
- Check file validation is passing correctly

**Amstelvar font download failures**
```bash
# Fixed in v2.0.0 - now uses proper GitHub raw URLs
# If issues persist, check:
ls -la downloads/amstelvar/
# Should contain both Roman and Italic .ttf files
```

**CSS import paths not working**
```bash
# Fixed in v2.0.0 - now uses proper import structure
# fonts.css and fonts.min.css use @import statements
# Individual CSS files include license headers
```

**Missing license information in CSS**
```bash
# Fixed in v2.0.0 - all CSS files now include license headers
# Check the top of any .css file for license information
head -n 10 build/css/imingcp.css
```

**Selective builds lose existing fonts**
```bash
# Fixed in v2.0.1 - selective builds now preserve all existing fonts
# Deployment now uses force_orphan: false with content preservation
# Check GitHub Actions logs for: "Selective build - preserving existing fonts"
# Verify all fonts present in build branch after selective updates
```

**Version check runs at wrong time**
```bash
# Fixed in v2.0.1 - now runs at 16:00 UTC (00:00 AM Hong Kong Time)
# Previous: 02:00 UTC (10:00 AM Beijing Time)
# Check .github/workflows/version-check.yml cron schedule
```

**TypeScript compilation errors**
```bash
# Check type errors
pnpm run type-check

# Fix common issues
# - Check import paths use absolute imports (@/ prefix)
# - Ensure all TypeScript files have proper type annotations
# - Verify configuration in tsconfig.json
```

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Update documentation in `.ai/` folder
5. Submit a pull request

## 📚 Documentation

Detailed documentation is available in the `.ai/` folder:
- `requirements.md` - Project requirements
- `design-proposal.md` - Technical design
- `development-log.md` - Development progress

---

**Last Updated**: 2025-06-18
**Version**: 2.0.1 (CSS & Download Fixes)

## 🔧 Recent Improvements (v2.0.1)

### Deployment Strategy & Scheduling Fixes
- **Hong Kong Time**: Version checks now run at 00:00 AM Hong Kong Time (16:00 UTC)
- **Selective Build Preservation**: Fixed deployment to preserve all existing fonts during selective builds
- **Smart Deployment**: Removed force_orphan strategy, using incremental updates with content preservation
- **Enhanced Verification**: Added comprehensive verification steps for selective builds

### Previous Improvements (v2.0.0)

#### TypeScript Migration & Modernization
- **Full TypeScript coverage** with strict type checking
- **Absolute imports** with `@/` and `@scripts/` path mapping
- **Modern tooling**: ESLint, TypeScript compiler, tsx for development
- **Enhanced developer experience** with type-aware IDE support

### CSS Generation Enhancements
- **Import-based structure**: `fonts.css` and `fonts.min.css` use `@import` statements
- **License headers**: All CSS files include proper license information
- **Clean output**: Removed unnecessary utility classes from unified CSS
- **Minified versions**: Both individual and unified CSS have minified variants

### Font Download Improvements
- **Fixed Amstelvar download**: Proper GitHub raw file URL construction
- **Consistent structure**: All fonts download to subdirectories for organization
- **URL encoding**: Proper handling of special characters in filenames
- **Validation**: Enhanced file validation to prevent corrupted downloads

### Development Workflow
- **Hot reloading**: Development mode with `tsx watch`
- **Type safety**: Comprehensive error catching during development
- **Modern dependencies**: All packages updated to latest versions
- **Node.js 20+**: Leverages modern JavaScript features

### Adding New Fonts
