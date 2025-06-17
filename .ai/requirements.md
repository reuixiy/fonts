# Project Requirements: Web Font Auto-Subsetting Workflow

## Project Overview

This repository aims to design a web font auto-subsetting workflow that provides automated font processing, building, and deployment capabilities.

## Core Functionality Requirements

### 1. Font Subsetting and Processing
- Automatically split font files into multiple optimized chunks using size-based splitting
- Generate Google Fonts-style font chunking for improved loading performance
- Create priority-based character distribution (Latin first, then frequency-ranked Chinese characters)
- Output format: WOFF2 only (modern browser support focus)
- Ensure complete character coverage - no characters lost during chunking process

### 2. Automated GitHub Actions Build
- Automatically run the font processing program through GitHub Actions
- Deploy processed fonts to an independent `build` branch using orphan commits
- Maintain clean separation between source code and build artifacts

### 3. Daily Version Detection
- Automatically detect release versions of used fonts daily through GitHub Actions
- Only trigger the font processing workflow when new versions are detected
- Avoid unnecessary builds when fonts are up-to-date

## Font Requirements

### Chinese Fonts

#### 1. I.Ming Font
- **Source**: https://github.com/ichitenfont/I.Ming
- **Release Method**: GitHub Releases
- **Target File**: `I.MingCP-[version].ttf`
- **Font Weight**: 400 (Regular)
- **Type**: Chinese font

#### 2. LxgwWenkaiTC Font
- **Source**: https://github.com/lxgw/LxgwWenkaiTC
- **Release Method**: GitHub Releases
- **Target File**: `LXGWWenKaiTC-Light.ttf`
- **Font Weight**: 300 (Light)
- **Type**: Chinese font

### English Fonts

#### 3. Amstelvar Font
- **Source**: https://github.com/googlefonts/amstelvar
- **Release Method**: Direct repository builds (no GitHub Releases)
- **Target Files**:
  - `Amstelvar-Roman[GRAD,XOPQ,XTRA,YOPQ,YTAS,YTDE,YTFI,YTLC,YTUC,wdth,wght,opsz].ttf`
  - `Amstelvar-Italic[GRAD,YOPQ,YTAS,YTDE,YTFI,YTLC,YTUC,wdth,wght,opsz].ttf`
- **Font Styles**: Both Roman (regular) and Italic variants needed
- **Type**: English variable font
- **Source Location**: `fonts/` directory in the repository

## Technical Requirements

### Version Detection Strategy
- **I.Ming & LxgwWenkaiTC**: Monitor GitHub Releases API for version updates
- **Amstelvar**: Monitor repository commits since it doesn't use releases

### Font Processing Strategy
- **Chinese Fonts**: Apply size-based chunking with frequency-prioritized character distribution
- **Variable Fonts**: Maintain full variable font capabilities while creating optimized chunks
- **Output Formats**: Multiple WOFF2 files per font family (chunk-based loading)
- **Progressive Loading**: Critical characters (Latin, punctuation) in first chunk for fast rendering
- **Complete Coverage**: Ensure all original font characters are preserved across chunks

### Deployment Strategy
- Use orphan commits to keep build artifacts separate from source code
- Deploy to dedicated `build` branch for clean version management
- Provide easy access to processed fonts and CSS files

## Success Criteria

1. **Automation**: Zero manual intervention required for font updates
2. **Efficiency**: Only process fonts when updates are detected
3. **Reliability**: Consistent builds with proper error handling
4. **Accessibility**: Easy integration of processed fonts into web projects
5. **Performance**: Optimized font files suitable for web delivery

## Date Created
June 17, 2025
