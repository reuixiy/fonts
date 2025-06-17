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
- **I.Ming** (Weight: 400) - Traditional Chinese serif font
- **LxgwWenkaiTC** (Weight: 300) - Traditional Chinese handwriting-style font

### Variable Fonts
- **Amstelvar** - English variable font with Roman and Italic variants

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
# Check for font version updates
pnpm run check-versions

# Download fonts
pnpm run download-fonts

# Process and subset fonts
pnpm run subset-fonts

# Generate CSS files
pnpm run generate-css

# Complete build process
pnpm run build
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
    "iming": {
      "name": "I.Ming",
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
- **Action**: Check for new font releases
- **Result**: Triggers build workflow if updates found

### Build and Deploy
- **Trigger**: When version check finds updates, or manual dispatch
- **Process**:
  1. Download latest font files
  2. Apply subsetting optimizations
  3. Generate WOFF2 files
  4. Create CSS files
  5. Deploy to `build` branch

## 📁 Output Structure

The build process creates the following structure in the `build` branch:

```
build/
├── fonts/
│   ├── iming/
│   │   └── iming-regular.woff2
│   ├── lxgw/
│   │   └── lxgw-light.woff2
│   └── amstelvar/
│       ├── amstelvar-roman.woff2
│       └── amstelvar-italic.woff2
├── css/
│   ├── iming.css
│   ├── lxgw.css
│   ├── amstelvar.css
│   └── fonts.css          # Combined CSS file
└── metadata.json          # Build information
```

## 🎨 Using the Fonts

### Option 1: Direct CSS Import

```html
<link rel="stylesheet" href="https://your-domain.com/path-to-build/css/fonts.css">
```

### Option 2: Individual Font CSS

```html
<link rel="stylesheet" href="https://your-domain.com/path-to-build/css/iming.css">
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
# Test version checking
pnpm run check-versions

# Test individual components
pnpm run download-fonts
pnpm run subset-fonts
pnpm run generate-css
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

**Last Updated**: June 17, 2025
**Version**: 1.0.0
