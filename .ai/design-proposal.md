# Design Proposal: Web Font Auto-Subsetting Workflow

## 📋 Overall Architecture Design

This document outlines the comprehensive design solution for an automated web font subsetting and deployment workflow.

## 1. Project Structure

```
fonts/
├── .github/
│   └── workflows/
│       ├── version-check.yml     # Daily font version checking
│       └── build-fonts.yml       # Font building and deployment workflow
├── src/
│   ├── fontSubset.js            # Main font subsetting program
│   ├── versionChecker.js        # Version checking utility
│   └── config/
│       └── fonts.json           # Font configuration file
├── scripts/
│   ├── download-fonts.js        # Font downloading script
│   └── generate-css.js          # CSS generation script
├── .ai/
│   ├── requirements.md          # Project requirements
│   ├── design-proposal.md       # This design document
│   └── development-log.md       # Development progress log
├── package.json
├── README.md
└── .gitignore
```

## 2. Core Functional Modules

### A. Version Checking Module (`versionChecker.js`)

**Purpose**: Detect font updates and trigger builds only when necessary

**Functionality**:
- **I.MingCP & LXGWWenKaiTC**: Check latest versions via GitHub API releases endpoint
- **Amstelvar**: Monitor latest commit hash (since it doesn't use releases)
- Store current version information in GitHub repository variables
- Compare local records with remote versions to determine build necessity

**Implementation Details**:
- Use GitHub API with authentication tokens
- Store version metadata as repository variables
- Output boolean flags for each font indicating update status

### B. Font Download Module (`download-fonts.js`)

**Purpose**: Retrieve the latest font files from their respective sources

**Download Strategy**:
- **I.Ming**: Download `I.MingCP-[version].ttf` from GitHub releases
- **LXGWWenKaiTC**: Download `LXGWWenKaiTC-Light.ttf` from GitHub releases  
- **Amstelvar**: Clone repository and extract both variable font files from `fonts/` directory

**Error Handling**:
- Retry mechanism for failed downloads
- Checksum verification where available
- Fallback to previous versions if current download fails

### C. Font Subsetting Module (`fontSubset.js`)

**Purpose**: Process fonts for optimal web delivery

**Technology Stack**:
- Primary: `fonttools` (Python) with `pyftsubset`
- Alternative: Node.js wrapper for font processing libraries

**Processing Strategy**:

#### Chinese Fonts (I.MingCP, LXGWWenKaiTC)
- Create subsets for common Chinese characters (基础汉字、扩展A区)
- Include essential punctuation and symbols
- Generate multiple subset files if needed for large character sets
- Output format: WOFF2 only (modern web standard)

#### Variable Fonts (Amstelvar)
- Preserve full variable font capabilities
- Optimize file size while maintaining all axes functionality
- Output format: WOFF2 (with variable font support)
- Generate static fallbacks for older browsers

**Configuration**:
- Configurable character sets via JSON configuration
- Font-specific processing parameters
- Output format specifications

### D. CSS Generation Module (`generate-css.js`)

**Purpose**: Create ready-to-use CSS files for font integration

**Output**:
- Individual CSS files for each font family
- Unified `fonts.css` file combining all fonts
- `@font-face` declarations with proper font-display and fallback chains

**CSS Features**:
- Font-display: swap for better loading performance
- Unicode-range declarations for subset optimization
- Font-weight and font-style specifications
- Fallback font stacks

## 3. GitHub Actions Workflows

### A. Version Check Workflow (`version-check.yml`)

**Trigger**: Daily at 02:00 UTC (10:00 AM Beijing Time)

**Process Flow**:
1. Check current stored versions
2. Query each font source for latest version
3. Compare versions and set update flags
4. Trigger build workflow if updates detected
5. Update version records

**Outputs**:
- Environment variables indicating which fonts need updates
- Workflow dispatch trigger for build process

### B. Font Build Workflow (`build-fonts.yml`)

**Triggers**:
- Automatic: When version check detects updates
- Manual: `workflow_dispatch` for manual builds

**Process Steps**:
1. **Setup Environment**
   - Install Node.js and Python dependencies
   - Configure fonttools and subsetting utilities

2. **Download Fonts**
   - Execute download scripts for updated fonts
   - Verify file integrity

3. **Process Fonts**
   - Run subsetting operations
   - Generate optimized web font files
   - Create CSS files

4. **Deploy Results**
   - Create orphan commit on `build` branch
   - Upload processed fonts and CSS files
   - Update deployment metadata

5. **Update Records**
   - Store new version information
   - Generate build report

## 4. Font Configuration Specifications

### I.MingCP Font (Weight: 400)
```json
{
  "id": "imingcp",
  "name": "I.MingCP",
  "weight": 400,
  "style": "normal",
  "subset": "chinese-common",
  "formats": ["woff2"],
  "cssClass": "font-imingcp"
}
```

### LXGW WenKai TC Font (Weight: 300)
```json
{
  "id": "lxgwwenkaitc",
  "name": "LXGW WenKai TC",
  "weight": 300,
  "style": "normal", 
  "subset": "chinese-common",
  "formats": ["woff2"],
  "cssClass": "font-lxgwwenkaitc"
}
```

### Amstelvar Font (Variable)
```json
{
  "id": "amstelvar",
  "name": "Amstelvar",
  "type": "variable",
  "styles": ["roman", "italic"],
  "formats": ["woff2"],
  "cssClass": "font-amstelvar",
  "variableAxes": ["GRAD", "XOPQ", "XTRA", "YOPQ", "YTAS", "YTDE", "YTFI", "YTLC", "YTUC", "wdth", "wght", "opsz"]
}
```

## 5. Technology Stack

### Core Technologies
- **Node.js**: Primary development language for scripting and automation
- **Python + fonttools**: Font processing and subsetting operations
- **GitHub Actions**: CI/CD platform for automation
- **GitHub API**: Version checking and release monitoring

### Dependencies
- `@octokit/rest`: GitHub API client
- `fonttools`: Python font processing library
- `node-fetch`: HTTP client for downloads
- `fs-extra`: Enhanced file system operations

## 6. Deployment and Usage Strategy

### Build Output Structure
```
build/ (on build branch)
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
│   └── fonts.css
└── metadata.json
```

### Integration Methods
1. **Direct CDN**: Serve fonts via GitHub Pages or CDN
2. **Package Manager**: Publish as npm package for easy integration
3. **Direct Download**: Manual download from build branch

## 7. Workflow Process Flow

```mermaid
graph TD
    A[Daily Version Check] --> B{Updates Found?}
    B -->|No| C[Wait for Next Check]
    B -->|Yes| D[Trigger Build Workflow]
    D --> E[Download Updated Fonts]
    E --> F[Process and Subset Fonts]
    F --> G[Generate CSS Files]
    G --> H[Create Orphan Commit]
    H --> I[Push to Build Branch]
    I --> J[Update Version Records]
    J --> C
```

## 8. Benefits and Advantages

- ✅ **Full Automation**: Zero manual intervention required
- ✅ **Multi-Source Support**: Handles different font release mechanisms
- ✅ **Optimized Strategy**: Targeted subsetting approaches for different font types
- ✅ **Version Control**: Complete versioning and rollback capabilities
- ✅ **Modular Design**: Easy maintenance and extensibility
- ✅ **Performance Optimized**: WOFF2-only delivery for maximum compression and modern browser support
- ✅ **Developer Friendly**: Simple integration with existing projects

## 9. Implementation Timeline

1. **Phase 1**: Core module development and testing
2. **Phase 2**: GitHub Actions workflow setup
3. **Phase 3**: Font processing pipeline implementation
4. **Phase 4**: CSS generation and deployment
5. **Phase 5**: Testing and optimization
6. **Phase 6**: Documentation and deployment

## Date Created
June 17, 2025

## Author
GitHub Copilot AI Assistant
