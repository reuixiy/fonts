# Web Font Auto-Subsetting Workflow

An automated workflow for downloading, subsetting, and deploying web fonts with GitHub Actions.

## 🎯 Features

- **Automated Version Detection**: Daily checks for font updates from multiple sources
- **Size-Based Font Chunking**: Google Fonts-style splitting with optimized chunk sizes
- **Progressive Loading**: Critical characters load first, others load on-demand
- **WOFF2 Output**: Modern compression for optimal web performance
- **Smart CSS Generation**: Multiple @font-face rules with unicode-range declarations
- **Complete Coverage**: Ensures no characters are lost during chunking process
- **GitHub Actions Integration**: Fully automated CI/CD pipeline
- **Orphan Branch Deployment**: Clean separation between source and build artifacts

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
- **Trigger**: Every day at 02:00 UTC (10:00 AM Beijing Time)
- **Action**: Check for new font releases using GitHub API and git commits
- **Result**: Triggers build workflow if updates found
- **Optimization**: Only builds fonts that have actual version changes

### Build and Deploy
- **Trigger**: When version check finds updates, or manual dispatch
- **Intelligence**: Only processes fonts that have version updates (not all fonts)
- **Process**:
  1. Download latest font files (skip if already exist and valid)
  2. Analyze font character coverage and apply frequency-based priority ranking
  3. Generate size-based chunks (80KB-250KB per chunk) with complete coverage validation
  4. Create multiple WOFF2 files per font with progressive loading optimization
  5. Generate CSS files with unicode-range declarations for each chunk
  6. Generate license information
  7. Deploy to `build` branch

### Performance Optimizations
- **Smart Caching**: Skip downloads when files already exist and pass validation
- **Incremental Processing**: Only subset fonts that need updates
- **Selective Builds**: GitHub Actions only builds changed fonts, not all fonts
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
│   ├── imingcp.css                   # Multiple @font-face rules
│   ├── lxgwwenkaitc.css             # with unicode-range per chunk
│   ├── amstelvar.css
│   └── fonts.css                     # Combined CSS file
├── FONT_LICENSES.md                  # Human-readable license information
├── font-licenses.json                # Machine-readable license data
├── metadata.json                     # Build information
├── processing-metadata.json          # Font processing details
├── css-metadata.json                 # CSS generation details
└── download-metadata.json            # Download information
```

## 🎨 Using the Chunked Fonts

The chunked fonts provide progressive loading with optimal performance:

### Option 1: Direct CSS Import (Recommended)

```html
<!-- Loads all chunks with progressive loading -->
<link rel="stylesheet" href="https://your-domain.com/path-to-build/css/fonts.css">
```

### Option 2: Individual Font CSS

```html
<!-- Loads specific font family with all its chunks -->
<link rel="stylesheet" href="https://your-domain.com/path-to-build/css/imingcp.css">
```

### Option 3: Preload Critical Chunks

```html
<!-- Preload critical chunk for faster initial render -->
<link rel="preload" href="https://your-domain.com/path-to-build/fonts/imingcp/imingcp-chunk-0.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="https://your-domain.com/path-to-build/css/imingcp.css">
```

### CSS Example Output

```css
/* Critical chunk - loads immediately */
@font-face {
  font-family: 'I.MingCP';
  src: url('fonts/imingcp/imingcp-chunk-0.woff2') format('woff2');
  unicode-range: U+0020-007F, U+3000-303F, U+FF00-FFEF;
  font-display: swap;
}

/* High-frequency Chinese characters - loads on demand */
@font-face {
  font-family: 'I.MingCP';
  src: url('fonts/imingcp/imingcp-chunk-1.woff2') format('woff2');
  unicode-range: U+4E00-4EFF, U+5000-50FF;
  font-display: swap;
}

/* Additional chunks load progressively as needed */
@font-face {
  font-family: 'I.MingCP';
  src: url('fonts/imingcp/imingcp-chunk-2.woff2') format('woff2');
  unicode-range: U+5100-51FF, U+5200-52FF;
  font-display: swap;
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

**Last Updated**: 2025-06-17
**Version**: 2.0.0 (TypeScript Migration)
