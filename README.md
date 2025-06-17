# Web Font Auto-Subsetting Workflow

An automated workflow for downloading, subsetting, and deploying web fonts with GitHub Actions.

## 🎯 Features

- **Automated Version Detection**: Daily checks for font updates from multiple sources
- **Smart Font Subsetting**: Optimized subsetting for Chinese and variable fonts
- **WOFF2 Output**: Modern compression for optimal web performance
- **CSS Generation**: Ready-to-use CSS files with proper @font-face declarations
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

- Node.js 18+ 
- Python 3.8+
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

# Individual steps
pnpm run check-versions       # Check for font version updates
pnpm run download-fonts       # Download fonts
pnpm run subset-fonts         # Process and subset fonts  
pnpm run generate-css         # Generate CSS files
pnpm run generate-license     # Generate license information
pnpm run build               # Complete build process (legacy, use pnpm start instead)
```

**Font IDs**: `imingcp`, `lxgwwenkaitc`, `amstelvar`

### Cache Management

Clean various cache files and build artifacts:

```bash
# Clean everything (build, downloads, node_modules, git cache)
pnpm run clean:all

# Clean only build artifacts (build/, downloads/, cache files)
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
- Subsetting strategies
- Output specifications
- CSS class names

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
        "type": "chinese-common"
      }
    }
  }
}
```

## 🔄 Automated Workflow

### Daily Version Check
- **Trigger**: Every day at 02:00 UTC (10:00 AM Beijing Time)
- **Action**: Check for new font releases using GitHub API and git commits
- **Result**: Triggers build workflow if updates found
- **Optimization**: Only builds fonts that have actual version changes

### Selective Build and Deploy
- **Trigger**: When version check finds updates, or manual dispatch
- **Intelligence**: Only processes fonts that have version updates (not all fonts)
- **Process**:
  1. Download latest font files (skip if already exist and valid)
  2. Apply subsetting optimizations (skip if output files exist)
  3. Generate WOFF2 files
  4. Create CSS files
  5. Generate license information
  6. Deploy to `build` branch

### Performance Optimizations
- **Smart Caching**: Skip downloads when files already exist and pass validation
- **Incremental Processing**: Only subset fonts that need updates
- **Selective Builds**: GitHub Actions only builds changed fonts, not all fonts
- **Fast Iterations**: Subsequent builds complete in seconds instead of minutes

## 📁 Output Structure

The build process creates the following structure in the `build` branch:

```
build/
├── fonts/
│   ├── imingcp/
│   │   └── imingcp-regular.woff2
│   ├── lxgwwenkaitc/
│   │   └── lxgwwenkaitc-light.woff2
│   └── amstelvar/
│       ├── amstelvar-roman.woff2
│       └── amstelvar-italic.woff2
├── css/
│   ├── imingcp.css
│   ├── lxgwwenkaitc.css
│   ├── amstelvar.css
│   └── fonts.css              # Combined CSS file
├── FONT_LICENSES.md           # Human-readable license information
├── font-licenses.json         # Machine-readable license data
├── metadata.json              # Build information
├── processing-metadata.json   # Font processing details
├── css-metadata.json          # CSS generation details
└── download-metadata.json     # Download information
```

## 🎨 Using the Fonts

### Option 1: Direct CSS Import

```html
<link rel="stylesheet" href="https://your-domain.com/path-to-build/css/fonts.css">
```

### Option 2: Individual Font CSS

```html
<link rel="stylesheet" href="https://your-domain.com/path-to-build/css/imingcp.css">
```

### Option 3: Self-hosted

Download the files from the `build` branch and host them yourself.

## 🔧 Development

### Project Structure

```
.
├── .ai/                    # AI-generated documentation
├── .github/workflows/      # GitHub Actions workflows
├── src/
│   ├── config/
│   │   └── fonts.json     # Font configuration
│   ├── fontSubset.js      # Font subsetting logic
│   ├── versionChecker.js  # Version checking utility
│   └── index.js          # Main entry point
├── scripts/
│   ├── download-fonts.js  # Font download script
│   └── generate-css.js    # CSS generation script
└── package.json
```

### Adding New Fonts

1. **Update configuration** in `src/config/fonts.json`
2. **Add font-specific logic** if needed in the processing modules
3. **Test locally** with `pnpm run build`
4. **Commit changes** to trigger automated build

### Local Testing

```bash
# Test complete workflows
pnpm start                    # Full workflow with version checking
pnpm start -- --build-only   # Build all fonts (skip version check)
pnpm start -- --fonts imingcp # Test specific font processing

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
**Version**: 1.0.0
