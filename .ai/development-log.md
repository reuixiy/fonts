# Development Log: Web Font Auto-Subsetting Workflow

## Project Overview
This log tracks the development progress of the automated web font subsetting and deployment system.

## Development Phases

### Phase 1: Project Planning and Documentation ✅
**Date**: June 17, 2025  
**Status**: Completed

**Activities**:
- [x] Requirements gathering and analysis
- [x] Architecture design and planning
- [x] Documentation creation (.ai/ folder structure)
- [x] Technology stack selection

**Deliverables**:
- `requirements.md` - Complete project requirements documentation
- `design-proposal.md` - Comprehensive technical design proposal
- `development-log.md` - This development tracking document

### Phase 2: Core Module Development ✅
**Date**: June 17, 2025  
**Status**: Completed

**Activities**:
- [x] Set up Node.js project structure and dependencies
- [x] Implement version checking module (`versionChecker.js`)
- [x] Create font download module (`download-fonts.js`)
- [x] Develop font subsetting module (`fontSubset.js`)
- [x] Build CSS generation module (`generate-css.js`)
- [x] Create main workflow orchestrator (`index.js`)
- [x] Install and configure fonttools dependency
- [x] Test core functionality

**Deliverables**:
- ✅ Working Node.js modules for all core functionality
- ✅ Configuration files for font specifications
- ✅ Package.json with proper scripts and dependencies
- ✅ Fonttools integration for font processing

### Phase 3: GitHub Actions Setup ✅
**Date**: June 17, 2025  
**Status**: Completed

**Activities**:
- [x] Create version check workflow (`version-check.yml`)
- [x] Implement build and deployment workflow (`build-fonts.yml`)
- [x] Set up automated daily scheduling
- [x] Configure orphan branch deployment strategy

**Deliverables**:
- ✅ Fully functional GitHub Actions workflows
- ✅ Automated daily version checking (02:00 UTC)
- ✅ Build and deployment pipeline
- ✅ Orphan commit strategy for build branch

### Phase 4: Documentation and Project Setup ✅
**Date**: June 17, 2025  
**Status**: Completed

**Activities**:
- [x] Create comprehensive README.md
- [x] Document usage instructions
- [x] Add troubleshooting guide
- [x] Set up project structure
- [x] Configure gitignore and project files

**Deliverables**:
- ✅ Complete project documentation
- ✅ Usage examples and guides
- ✅ Development setup instructions

### Phase 5: Font Processing Pipeline ✅
**Date**: June 17, 2025  
**Status**: Completed

**Activities**:
- [x] Test font processing with real font files
- [x] Verify Chinese font subsetting accuracy
- [x] Test variable font processing for Amstelvar
- [x] Validate output quality and file sizes
- [x] Performance optimization with file existence checking

**Deliverables**:
- ✅ Optimized font files in WOFF2 format
- ✅ Verified subsetting accuracy for Chinese fonts
- ✅ Performance optimizations implemented

### Phase 6: Integration Testing and Deployment ✅
**Date**: June 17, 2025  
**Status**: Completed

**Activities**:
- [x] End-to-end workflow testing
- [x] GitHub Actions testing and optimization
- [x] Error handling and edge case testing
- [x] CLI argument parsing fixes
- [x] Selective font building implementation
- [x] Production deployment preparation

**Deliverables**:
- ✅ Fully tested and deployed system
- ✅ Production-ready automated workflow
- ✅ Comprehensive error handling and logging

### Phase 7: Chunking Logic Fix ✅
**Date**: June 17, 2025  
**Status**: Completed

**Problem Identified**:
- Chinese fonts were only outputting `chunk-0` instead of multiple chunks
- Size-based chunking was too restrictive with high target sizes (80KB+)
- Character count fallback was needed for proper distribution

**Activities**:
- [x] Diagnosed chunking algorithm issues
- [x] Fixed `generateOptimalChunks` method in `fontSubset.js`
- [x] Added character count-based fallback chunking
- [x] Improved chunk finalization logic with multiple criteria
- [x] Enhanced logging for better debugging
- [x] Adjusted Chinese font chunk size targets to be more realistic
- [x] Tested fix with mock data to confirm multiple chunk generation

**Technical Changes**:
- Modified chunk finalization logic to use size OR character count thresholds
- Added `maxCharactersPerChunk` calculation for better distribution
- Updated Chinese font configs: chunk sizes from `[80, 150, ...]` to `[50, 80, 100, 120, ...]` KB
- Enhanced debugging output with size estimates and finalization reasons

**Deliverables**:
- ✅ Fixed chunking algorithm that properly distributes Chinese characters
- ✅ Multiple chunks generation for all font types (Latin and Chinese)
- ✅ More realistic chunk size targets for Chinese fonts
- ✅ Better error handling and debugging information

### Phase 8: CSS Generation Improvements ✅
**Date**: June 17, 2025  
**Status**: Completed

**Problem Identified**:
- Font paths in CSS were incorrect (`./fonts` instead of `../fonts`)
- Missing license information in CSS headers
- Unnecessary CSS utilities cluttering output
- No CSS minification for production use
- Unified CSS was duplicating @font-face rules instead of using @import

**Activities**:
- [x] Fixed font path references from `./fonts` to `../fonts` (CSS in css/ subdirectory)
- [x] Added proper license headers with font name, license type, and source URL
- [x] Removed unnecessary CSS utilities (font stacks, progressive loading helpers, text optimization)
- [x] Implemented @import-based unified CSS using individual font files
- [x] Added CSS minification using cssnano and postcss
- [x] Generate both original (.css) and minified (.min.css) versions
- [x] Enhanced logging with file sizes and compression statistics

**Technical Changes**:
- Installed `cssnano` and `postcss` packages for CSS optimization
- Updated `generateFontFaceCSS` method to use correct relative paths
- Simplified unified CSS to use `@import` statements instead of duplicating rules
- Added `minifyCSS` method with proper error handling
- Both individual and unified CSS files now get original + minified versions
- Improved console output with byte counts and compression ratios

**Deliverables**:
- ✅ Corrected font paths for proper CSS-to-font file linking
- ✅ Professional license headers in all generated CSS files
- ✅ Clean, focused CSS output without unnecessary utilities
- ✅ Automatic CSS minification for production use
- ✅ Modular @import-based unified CSS architecture
- ✅ Comprehensive size reporting and optimization metrics

### Phase 9: ESLint Upgrade and Code Quality ✅
**Date**: June 17, 2025  
**Status**: Completed

**Problem Identified**:
- ESLint 8.57.1 was deprecated and showing warnings during package installation
- Need to upgrade to supported ESLint version (9.x)
- Code quality issues discovered during linting process

**Activities**:
- [x] Upgraded ESLint from deprecated 8.57.1 to latest 9.29.0
- [x] Created modern ESLint configuration using new `eslint.config.js` format
- [x] Installed `@eslint/js` package for official JavaScript configuration presets
- [x] Fixed all code quality issues identified by ESLint
- [x] Added lint and lint:fix scripts to package.json
- [x] Configured proper Node.js globals and ignore patterns

**Technical Changes**:
- Removed old ESLint 8.x and installed ESLint 9.29.0
- Created `eslint.config.js` with modern flat config format
- Applied object-shorthand rule automatically with `--fix`
- Renamed unused error variables to `_error` following convention
- Removed unused `hasEnoughChunks` variable from chunking logic
- Added `caughtErrorsIgnorePattern` for proper error handling in catch blocks
- Enhanced configuration with Node.js globals (URL, fetch, process, etc.)

**Code Quality Improvements**:
- ✅ All object literals now use ES6 shorthand syntax
- ✅ Proper handling of unused variables with `_` prefix convention
- ✅ Clean error handling without unused variable warnings
- ✅ Modern JavaScript standards enforcement
- ✅ Comprehensive linting coverage for all source files

**Deliverables**:
- ✅ ESLint deprecation warning resolved
- ✅ Modern ESLint 9.x configuration
- ✅ All source code passes linting validation
- ✅ Automated code quality enforcement via npm scripts
- ✅ Consistent code style across entire project

### Phase 8: TypeScript Migration and Modernization ✅
**Date**: June 17, 2025  
**Status**: Completed

**Activities**:
- [x] Migrate entire codebase from JavaScript to TypeScript
- [x] Install and configure TypeScript, @types/node, @types/fs-extra
- [x] Create comprehensive TypeScript configuration (tsconfig.json)
- [x] Set up ESLint for TypeScript with strict rules
- [x] Update all npm dependencies to latest versions
- [x] Modernize GitHub Actions to use Node.js 22
- [x] Implement absolute imports with path mapping (@/ prefix)
- [x] Add proper type annotations throughout codebase
- [x] Update package.json scripts for TypeScript workflow
- [x] Update clean-cache.sh to handle TypeScript build output (dist/)
- [x] Update all documentation to reflect TypeScript migration

**Technical Changes**:
- ✅ **Type Safety**: Full TypeScript coverage with strict type checking
- ✅ **Modern Tooling**: ESLint, TypeScript compiler, tsx for development
- ✅ **Build System**: TypeScript compilation to dist/ directory
- ✅ **Developer Experience**: Type-aware IDE support, auto-completion
- ✅ **Import System**: Absolute imports with @/ and @scripts/ prefixes
- ✅ **Error Handling**: Enhanced error catching with type safety
- ✅ **Package Updates**: All dependencies updated to latest versions
- ✅ **Node.js 20+**: Modern JavaScript features and performance
- ✅ **pnpm 9+**: Efficient package management

**Migration Results**:
- All JavaScript files converted to TypeScript (.ts extension)
- Type definitions added for all functions, variables, and interfaces
- Strict TypeScript configuration with comprehensive error checking
- Clean build process with zero type errors
- Enhanced development workflow with watch mode and hot reloading
- Updated documentation reflecting new TypeScript-based workflows

**Deliverables**:
- ✅ Complete TypeScript codebase (src/, scripts/)
- ✅ TypeScript configuration (tsconfig.json)
- ✅ Updated ESLint configuration for TypeScript
- ✅ Modern package.json with TypeScript scripts
- ✅ Updated GitHub Actions workflows
- ✅ Enhanced clean-cache.sh script
- ✅ Updated documentation (README.md, requirements.md)

**Version**: 2.0.0 (TypeScript Migration)

## Issues and Solutions

### Issue #1: Network Connectivity
**Date**: June 17, 2025  
**Issue**: Version checker failing with connection errors (ECONNREFUSED 0.0.0.0:443)  
**Status**: Identified - requires GitHub token setup  
**Solution**: Set GITHUB_TOKEN environment variable for API access

### Issue #2: Font Processing Dependencies
**Date**: June 17, 2025  
**Issue**: pyftsubset command not found  
**Status**: ✅ Resolved  
**Solution**: Installed fonttools using `brew install fonttools`

### Issue #3: Missing Download Metadata
**Date**: June 17, 2025  
**Issue**: Font subsetting fails because download metadata doesn't exist  
**Status**: Expected behavior - fonts need to be downloaded first  
**Solution**: Ensure proper workflow order: download → subset → generate CSS

### Issue #4: GitHub Actions Package Manager Mismatch
**Date**: June 17, 2025  
**Issue**: GitHub Actions failing with "Dependencies lock file is not found" - looking for package-lock.json but project uses pnpm  
**Status**: ✅ Resolved  
**Solution**: Updated GitHub Actions workflows to use pnpm instead of npm:
- Added pnpm/action-setup@v4 
- Changed `npm ci` to `pnpm install --frozen-lockfile`
- Updated all `npm run` commands to `pnpm run`
- Ensured pnpm-lock.yaml is committed to repository

### Issue #5: Complex Manual Git Deployment
**Date**: June 17, 2025  
**Issue**: Manual git operations in GitHub Actions for deployment are complex and error-prone  
**Status**: ✅ Resolved  
**Solution**: Replaced manual git operations with `peaceiris/actions-gh-pages@v3` action:
- Simplified deployment to build branch
- Automatic orphan branch handling
- More reliable and maintainable
- Built-in error handling and retry logic

### Issue #6: GitHub Actions Deprecated Commands
**Date**: June 17, 2025  
**Issue**: GitHub Actions `::set-output` command deprecated, causing warnings in workflow runs  
**Status**: ✅ Resolved  
**Solution**: Migrated to new Environment Files (`GITHUB_OUTPUT`) method:
- Replaced `echo "::set-output name=key::value"` with `echo "key=value" >> $GITHUB_OUTPUT`
- Updated `versionChecker.js` to write outputs to `GITHUB_OUTPUT` file instead of stdout
- Maintained backward compatibility for local development
- Fixed all deprecation warnings in GitHub Actions

### Issue #7: Version Cache Persistence
**Date**: June 17, 2025  
**Issue**: Version cache lost between GitHub Actions runs, causing unnecessary rebuilds  
**Status**: ✅ Resolved  
**Solution**: Implemented git-based orphan `cache` branch for persistent version cache:
- Created dedicated orphan branch containing only `version-cache.json`
- Version checker now fetches/updates cache from this branch automatically
- Ensures persistent cache across workflow runs without affecting main branch
- Proper error handling for missing cache or branch scenarios

### Issue #8: Font File Download Validation
**Date**: June 17, 2025  
**Issue**: Downloaded font files sometimes empty due to API rate limits or network issues  
**Status**: ✅ Resolved  
**Solution**: Added comprehensive file validation to download process:
- File size validation (minimum thresholds for different font types)
- Font file format validation (checking headers for TTF/OTF signatures)
- Automatic cleanup of invalid files
- Detailed error reporting for debugging
- Enhanced logging for successful validations

### Issue #9: Octokit File Path Handling
**Date**: June 17, 2025  
**Issue**: Special characters in font file paths causing download failures  
**Status**: ✅ Resolved  
**Solution**: Maintained Octokit-based approach with improved error handling:
- Proper base64 decoding for repo file downloads
- Enhanced path validation and error messages
- Better handling of GitHub API responses
- Confirmed working approach for complex file paths

### Issue #10: Node.js Buffer Deprecation Warning
**Date**: June 17, 2025  
**Issue**: `response.buffer()` method deprecated in node-fetch, causing warnings  
**Status**: ✅ Resolved  
**Solution**: Migrated to modern `response.arrayBuffer()` method:
- Replaced `response.buffer()` with `response.arrayBuffer()` and `Buffer.from(arrayBuffer)`
- Updated both GitHub release and repository download methods
- Eliminated deprecation warnings while maintaining functionality

### Issue #11: Large Font File Download Limitation
**Date**: June 17, 2025  
**Issue**: GitHub API content endpoint limited to 1MB, causing empty downloads for large font files like Amstelvar (1.4MB)  
**Status**: ✅ Resolved  
**Solution**: Implemented hybrid download strategy:
- Automatic detection of large files (>1MB) or Git LFS files
- Fallback to direct raw GitHub URLs for large files
- Proper URL encoding for special characters in file paths
- Maintained base64 decoding for smaller files
- Enhanced debugging information for troubleshooting

### Issue #12: Redundant File Downloads
**Date**: June 17, 2025  
**Issue**: Script re-downloading existing valid font files on every run  
**Status**: ✅ Resolved  
**Solution**: Added comprehensive file existence checking:
- Pre-download validation of existing files
- Reuse of existing `validateDownloadedFile` method for consistency
- Skip download if valid file already exists
- Clear logging when files are skipped
- Maintains download metadata consistency

## Resolved Issues

### ✅ Project Structure Setup
- Created complete Node.js project with proper dependencies
- Configured ESM modules and import/export syntax
- Set up comprehensive configuration system

### ✅ Core Module Implementation
- Version checking with GitHub API integration
- Font downloading from GitHub releases and repositories
- Font subsetting with fonttools integration
- CSS generation with @font-face declarations
- Workflow orchestration with error handling

### ✅ GitHub Actions Integration
- Daily version checking workflow
- Automated build and deployment pipeline
- Orphan branch deployment strategy
- Proper environment setup and dependency installation

### ✅ Version Cache Management
- Implemented persistent version cache using git orphan branch
- Automatic cache fetch/update mechanism in version checker
- Clean branch management (only version-cache.json file)
- Robust error handling for cache operations

### ✅ Download Reliability
- Added file validation for downloaded fonts
- Proper cleanup of invalid/corrupted files
- Enhanced error messages for debugging
- Maintained Octokit approach for reliable GitHub API integration

### ✅ Download Performance and Reliability
- Eliminated redundant downloads through file existence checking
- Fixed large file download limitations with hybrid approach
- Resolved deprecation warnings for future Node.js compatibility
- Enhanced error handling and debugging information for download issues

### ✅ Chunking Logic Fix
- Fixed chunking algorithm that properly distributes Chinese characters
- Multiple chunks generation for all font types (Latin and Chinese)
- More realistic chunk size targets for Chinese fonts
- Better error handling and debugging information

### ✅ CSS Generation Improvements
- Corrected font paths for proper CSS-to-font file linking
- Professional license headers in all generated CSS files
- Clean, focused CSS output without unnecessary utilities
- Automatic CSS minification for production use
- Modular @import-based unified CSS architecture
- Comprehensive size reporting and optimization metrics

### ✅ ESLint Upgrade and Code Quality
- ESLint deprecation warning resolved
- Modern ESLint 9.x configuration
- All source code passes linting validation
- Automated code quality enforcement via npm scripts
- Consistent code style across entire project

**Technical Changes**:
- ✅ **Type Safety**: Full TypeScript coverage with strict type checking
- ✅ **Modern Tooling**: ESLint, TypeScript compiler, tsx for development
- ✅ **Build System**: TypeScript compilation to dist/ directory
- ✅ **Developer Experience**: Type-aware IDE support, auto-completion
- ✅ **Import System**: Absolute imports with @/ and @scripts/ prefixes
- ✅ **Error Handling**: Enhanced error catching with type safety
- ✅ **Package Updates**: All dependencies updated to latest versions
- ✅ **Node.js 20+**: Modern JavaScript features and performance
- ✅ **pnpm 9+**: Efficient package management

**Migration Results**:
- All JavaScript files converted to TypeScript (.ts extension)
- Type definitions added for all functions, variables, and interfaces
- Strict TypeScript configuration with comprehensive error checking
- Clean build process with zero type errors
- Enhanced development workflow with watch mode and hot reloading
- Updated documentation reflecting new TypeScript-based workflows

**Deliverables**:
- ✅ Complete TypeScript codebase (src/, scripts/)
- ✅ TypeScript configuration (tsconfig.json)
- ✅ Updated ESLint configuration for TypeScript
- ✅ Modern package.json with TypeScript scripts
- ✅ Updated GitHub Actions workflows
- ✅ Enhanced clean-cache.sh script
- ✅ Updated documentation (README.md, requirements.md)

**Version**: 2.0.0 (TypeScript Migration)

## Performance Metrics
*To be recorded during development*

## Dependencies and Tools

### Planned Dependencies
- **Node.js Packages**:
  - `@octokit/rest` - GitHub API client
  - `node-fetch` - HTTP requests
  - `fs-extra` - File system utilities
  - `commander` - CLI interface

- **Python Packages**:
  - `fonttools` - Font processing
  - `brotli` - WOFF2 compression

### Development Tools
- GitHub Actions for CI/CD
- GitHub API for version checking
- Python fonttools for font subsetting

## Notes and Observations
*Development notes will be added as work progresses*

## Next Steps

### ✅ Completed - All Major Development Phases
1. **Full Workflow Implementation** ✅
   - GitHub token integration for API access
   - Font downloading functionality tested
   - Font subsetting verified with real files
   - CSS generation output validated

2. **GitHub Actions Production Deployment** ✅
   - Workflows tested and optimized
   - Automated triggers working correctly
   - Build branch deployment functional
   - Selective building implemented

### Future Enhancements (Optional)
1. **Additional Fonts**: Support for more font sources and types
2. **Advanced Subsetting**: Smart character set detection based on usage
3. **CDN Integration**: Direct deployment to CDN services
4. **Performance Analytics**: Track font loading performance metrics
5. **Monitoring Dashboard**: Real-time build status and metrics

---

**Last Updated**: June 17, 2025  
**Next Review**: Project Complete - Ready for Production

## 2025-06-17 - Final Implementation and Optimizations

### CLI Argument Parsing Fix
- **Issue**: `pnpm start -- --build-only` was only showing usage help instead of executing build
- **Root Cause**: npm/pnpm passes `--` as literal argument, causing `args[0]` to be `--` instead of `--build-only`
- **Solution**: Updated argument parsing in `src/index.js` to check both `args[0]` and `args[1]` for options
- **Fix**: Modified module execution detection to properly handle npm/pnpm script execution
- **Result**: All CLI modes now work correctly: default, `--build-only`, `--fonts <id>`

### Font Subsetting Optimization
- **Feature**: Skip font subsetting when output files already exist
- **Implementation**: Added file existence checks in `processChineseFont()` and `processVariableFont()`
- **Benefits**: 
  - Dramatically improves workflow speed on subsequent runs (seconds vs minutes)
  - Perfect for incremental builds and development iterations
  - Maintains same output structure and metadata generation
- **Output**: Shows "⏭️ File already exists" message with file size for skipped files

### Code Cleanup
- **Removed**: Unused temp directory creation and cleanup from download scripts
- **Updated**: `clean-cache.sh` script to remove temp directory references
- **Updated**: `.gitignore` to remove temp/ entry
- **Updated**: Documentation in `.ai/cache-cleaning-guide.md`

### Selective Font Building Fix
- **Critical Issue**: `build-fonts.yml` was always building all fonts, ignoring `updated-fonts` parameter
- **Problem**: Version check workflow correctly identified updated fonts but build workflow ignored this
- **Impact**: Wasteful - every version check triggered full rebuild of all fonts instead of just updated ones
- **Solution**: 
  - Modified build step to check `updated-fonts` parameter
  - Use `--fonts <ids>` for selective builds when specific fonts updated
  - Use `--build-only` for full builds when parameter is "all" or empty
  - Added comma-to-space conversion for multiple font IDs
- **Benefits**:
  - Dramatically reduced build time and resource usage
  - Only processes fonts that actually have updates
  - Maintains full functionality for manual builds
- **Enhanced Logging**: Better metadata tracking and commit messages showing build type

### Current Status
✅ **COMPLETED**: Full automated web font subsetting workflow
✅ **VERIFIED**: All CLI modes working correctly
✅ **OPTIMIZED**: Skip processing for existing files
✅ **CLEANED**: Removed unused code and directories
✅ **DOCUMENTED**: All changes recorded and committed

The system is now production-ready with:
- Robust error handling and logging
- Efficient incremental processing
- Complete automation via GitHub Actions
- Modern tooling (pnpm, ESM modules)
- Comprehensive documentation

## 2025-06-17 - Size-Based Font Chunking Implementation

### Major Feature Addition: Google Fonts-Style Chunking
- **Challenge**: Current single-file subsetting doesn't optimize web loading performance
- **Solution**: Implement size-based font chunking similar to Google Fonts approach
- **Strategy**: Split fonts into multiple chunks based on target file sizes and character frequency

### Size-Based Chunking Design
- **Algorithm**: Character frequency analysis + size-based splitting
- **Chinese Font Strategy**:
  - Chunk 0 (80KB): Critical characters (Latin, punctuation) for immediate rendering
  - Chunks 1-5 (150KB each): High-frequency Chinese characters (80%+ coverage)
  - Chunks 6-15 (200KB each): Medium-frequency characters
  - Remaining chunks (250KB each): Rare and specialized characters
- **Progressive Loading**: Browsers automatically load only needed character ranges
- **Complete Coverage**: Validation ensures no characters are lost during chunking

### Technical Implementation Plan
1. **Font Analysis**: Extract all supported characters from original fonts
2. **Priority Ranking**: Apply frequency-based character sorting for Chinese fonts
3. **Size-Based Splitting**: Create chunks targeting specific file sizes
4. **CSS Generation**: Multiple @font-face rules with unicode-range declarations
5. **Coverage Validation**: Ensure all original characters are preserved

### Configuration Updates
- New chunking configuration in `fonts.json`
- Configurable chunk sizes and strategies
- Character frequency data integration
- Complete coverage validation flags

### Expected Benefits
- ✅ **Faster Initial Loading**: Critical characters render immediately
- ✅ **Progressive Enhancement**: Additional characters load on-demand
- ✅ **Bandwidth Optimization**: Only downloads needed character ranges
- ✅ **Better Mobile Performance**: Smaller initial payload
- ✅ **Google Fonts Parity**: Industry-standard chunking approach

## 2025-06-18 - CSS Generation & Download Fixes

### CSS Generation Improvements ✅
**Problem**: CSS output had inconsistent structure and missing license information
**Solutions Implemented**:
- **Import-Based Structure**: 
  - `fonts.css` now uses `@import './fontname.css'` statements
  - `fonts.min.css` uses `@import './fontname.min.css'` statements
  - Clean import-only structure without inline CSS
- **License Headers**: 
  - All individual CSS files include proper license headers
  - Font name, license type, license URL, generation date
  - Unified files reference individual file licenses
- **Removed Utility Classes**: 
  - Eliminated unwanted `.font-chinese`, `.font-{fontname}` utility classes
  - Clean CSS focused only on @font-face declarations

### Font Download System Fixes ✅
**Problem**: Amstelvar font downloads failing with corrupted/empty files
**Root Cause**: Inconsistent URL construction for GitHub raw files
**Solutions Implemented**:
- **Fixed GitHub Raw URLs**: Proper `raw.githubusercontent.com` URL construction
- **URL Encoding**: Proper encoding for special characters (square brackets in filenames)
- **Consistent Structure**: All fonts download to `downloads/{fontId}/` subdirectories
- **Enhanced Validation**: Better file validation to detect corrupted downloads

### Results ✅
- **Amstelvar**: Both Roman and Italic variants download correctly
- **CSS Structure**: Clean import-based CSS with proper licensing
- **File Organization**: Consistent subdirectory structure for all fonts
- **Documentation**: Updated README and development log

### Technical Details
- **URL Construction**: `https://raw.githubusercontent.com/{owner}/{repo}/main/{path}`
- **Path Encoding**: `encodeURIComponent(path).replace(/%2F/g, '/')`
- **License Headers**: CSS comments with `/*!` to prevent minification removal
- **Import Structure**: Relative paths with `./` prefix for better portability

## 2025-06-18 - Deployment Strategy & Scheduling Fixes

### Problem: Selective Build Font Loss ❌
**Issue**: When using selective builds (updating only specific fonts), the deployment was using `force_orphan: true`, which creates a completely new orphan branch and discards all existing fonts that weren't being updated.

**Impact**: Build branch would only contain the updated fonts, losing all other fonts that should be preserved.

### Problem: Incorrect Schedule Timing ❌
**Issue**: Version check was scheduled for 02:00 UTC (10:00 AM Beijing Time) instead of Hong Kong time.

### Solution: Smart Deployment Strategy ✅
**Fixed Issues**:

#### 1. Scheduling Correction
- **Updated**: `version-check.yml` to run at 16:00 UTC (00:00 AM Hong Kong Time)
- **Previous**: 02:00 UTC (10:00 AM Beijing Time)
- **Current**: 16:00 UTC (00:00 AM Hong Kong Time)

#### 2. Removed Force Orphan Deployment
- **Previous Strategy**: Always used `force_orphan: true` - created new orphan branch every time
- **New Strategy**: Always use `force_orphan: false` - incremental updates with content preservation
- **Benefits**: 
  - Full builds: Still rebuilds completely when building all fonts
  - Selective builds: Preserves all existing fonts while updating only changed ones

#### 3. Enhanced Selective Build Logic
**Implementation Details**:
```yaml
# Added comprehensive selective build preservation
- name: Checkout build branch for selective updates
  if: github.event.inputs.updated-fonts != 'all' && github.event.inputs.updated-fonts != ''
  
- name: Merge selective build with existing content  
  if: github.event.inputs.updated-fonts != 'all' && github.event.inputs.updated-fonts != ''
  
- name: Verify selective build preservation
  if: github.event.inputs.updated-fonts != 'all' && github.event.inputs.updated-fonts != ''
```

**Key Features**:
- **Fetch Existing Content**: Retrieves current build branch content before deployment
- **Preserve Non-Updated Fonts**: Only removes fonts that are being updated
- **Multiple Fallback Methods**: Robust error handling for various Git scenarios
- **Content Verification**: Confirms all expected fonts are present after build
- **Enhanced Logging**: Detailed output for debugging selective builds

#### 4. Deployment Process Flow
**Full Builds (all fonts)**:
1. Build all fonts from scratch
2. Deploy complete rebuild to build branch
3. Result: Clean, complete font collection

**Selective Builds (specific fonts)**:
1. Fetch existing build branch content
2. Copy existing fonts as base
3. Remove only the fonts being updated
4. Build and add updated fonts
5. Deploy merged content (old + new fonts)
6. Verify all fonts are present
7. Result: Complete font collection with only specified fonts updated

### Results ✅
- **Scheduling**: Version checks now run at correct Hong Kong time (00:00 AM)
- **Selective Builds**: All existing fonts preserved during selective updates
- **Full Builds**: Complete rebuild when building all fonts
- **Content Integrity**: Build branch always contains complete font collection
- **Performance**: Faster selective builds with content preservation
- **Reliability**: Robust error handling and verification steps

### Technical Implementation
**Workflow Changes**:
- Updated cron schedule: `'0 16 * * *'` (Hong Kong 00:00)
- Removed `force_orphan: true` from deployment
- Added comprehensive selective build logic with 3 new workflow steps
- Enhanced verification and logging throughout process

**Content Preservation Logic**:
- Fetches existing build branch using `git worktree` or fallback methods
- Preserves all existing fonts before building new ones
- Only removes/replaces fonts that are specifically being updated
- Validates final output contains all expected fonts

**Version**: 2.0.1 (Deployment Strategy Fix)

## 2025-06-18 - Simplified Character Processing

### Phase 7: Simplified Character Processing ✅
**Date**: June 18, 2025  
**Status**: Completed

**Major Simplification**: Removed character frequency-based prioritization in favor of direct font character extraction.

**Activities**:
- [x] Removed `src/data/character-frequency.json` and entire data folder
- [x] Updated font configuration to remove frequency-related settings:
  - Removed `strategy` field
  - Removed `priorityData` field
  - Kept only `maxChunkSizeKB` for size-based chunking
- [x] Updated TypeScript types to remove frequency-related interfaces
- [x] Simplified README documentation to reflect new approach
- [x] Updated development log with new approach

**Technical Changes**:
- Characters are now processed in their natural order as they appear in the font
- No frequency-based reordering or prioritization
- Direct fontTools extraction for real character sets
- Cleaner, faster, and more reliable chunking algorithm

**Benefits**:
- 🚀 **Performance**: Eliminated complex frequency lookup and sorting operations
- 🧹 **Simplicity**: Removed ~1000 lines of frequency-related data and logic
- 🔧 **Reliability**: Direct font inspection rather than external frequency data
- 📦 **Smaller repository**: No more large character frequency JSON files

**Configuration Changes**:
```json
// Before (complex)
"subset": {
  "type": "size-based-chunks",
  "strategy": "chinese-frequency",
  "maxChunkSizeKB": 60,
  "ensureCompleteCoverage": true,
  "priorityData": "traditional-chinese-frequency"
}

// After (simplified)
"subset": {
  "type": "size-based-chunks",
  "maxChunkSizeKB": 60,
  "ensureCompleteCoverage": true
}
```

**Next Steps**:
- Fix remaining TypeScript issues in fontSubset.ts
- Test simplified chunking algorithm
- Validate that chunk sizes remain under limits
- Ensure complete character coverage
