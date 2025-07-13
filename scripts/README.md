# Font Editing Scripts

This directory contains Python scripts used for font editing and modification tasks as part of the Font Build Workflow v5.0.0.

The FontEditor module automatically executes these scripts during the build process, after downloading fonts and before subsetting.

## Available Scripts

### iming-halt-fix.py
**Purpose**: Fix GPOS halt feature for I.MingCP specific characters  
**Target Fonts**: I.MingCP (`imingcp`)  
**Dependencies**: fonttools  
**Description**: Removes specific glyphs from the 'halt' feature in GPOS table to fix rendering issues

### lxgw-halt-fix.py
**Purpose**: Fix GPOS halt feature for LXGW WenKai TC punctuation  
**Target Fonts**: LXGW WenKai TC (`lxgwwenkaitc`)  
**Dependencies**: fonttools  
**Description**: Removes punctuation characters (：、，；。！) from the 'halt' feature to fix rendering issues

### test.py
**Purpose**: Test script for font information extraction  
**Target Fonts**: All fonts (for testing)  
**Dependencies**: fonttools  
**Description**: Demonstrates font loading and information extraction (disabled by default)

### template.py
**Purpose**: Template for creating new font editing scripts  
**Target Fonts**: N/A (template only)  
**Dependencies**: fonttools  
**Description**: Provides a starting point for new scripts with proper structure and error handling

### utils.py
**Purpose**: Utility functions for font operations  
**Target Fonts**: N/A (utility module)  
**Dependencies**: fonttools  
**Description**: Common functions that can be imported by other scripts (load_font, save_font, log_progress, etc.)

## Adding New Scripts

To add a new font editing script:

1. **Create the Python script** in this directory
2. **Update FontEditor configuration** in `src/modules/edit/FontEditor.ts`
3. **Add to the scripts array** with the following properties:

```typescript
{
  name: 'script-name',
  path: 'scripts/your-script.py',
  description: 'What the script does',
  requiredPackages: ['package1', 'package2'], // Optional
  targetFonts: ['fontId1', 'fontId2'] | 'all', // Optional, defaults to 'all'
  enabled: true, // Optional, defaults to true
}
```

## Script Requirements

### Input Handling
Scripts receive the font file path as a command line argument. Your script should:

```python
import sys
from pathlib import Path

# Get font path from command line argument
if len(sys.argv) < 2:
    print("Usage: script.py <font_path>", file=sys.stderr)
    sys.exit(1)

font_path = Path(sys.argv[1])
```

### Dependencies
If your script requires Python packages, list them in the `requiredPackages` array when configuring the script in FontEditor. The system will automatically:
- Create a virtual environment if needed
- Install missing packages using pip
- Handle externally-managed Python environments gracefully

### Error Handling
Scripts should:
- Exit with code 0 for success
- Exit with non-zero code for errors
- Print meaningful error messages to stderr
- Print progress/success messages to stdout

### Example Script Structure

```python
from fontTools.ttLib import TTFont
from pathlib import Path
import sys

def main():
    # Get font path from command line argument
    if len(sys.argv) < 2:
        print("Usage: script.py <font_path>", file=sys.stderr)
        sys.exit(1)
    
    font_path = Path(sys.argv[1])
    
    try:
        font = TTFont(font_path)
        
        # Your font modification logic here
        
        # Save the modified font
        font.save(font_path)
        print(f"✔ Successfully processed {font_path}")
        
    except Exception as e:
        print(f"❌ Error processing font: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
```

## Testing Scripts

You can test scripts individually:

```bash
# The FontEditor automatically manages Python dependencies,
# but for manual testing you can install them:
pip install fonttools

# Run script directly with a font file
python scripts/iming-halt-fix.py /path/to/font.ttf

# Or test through the FontEditor (recommended)
pnpm run cli:edit --fonts imingcp
```

## Environment Management

The FontEditor automatically handles Python environment setup:

- **Virtual Environment**: Creates `.venv-scripts/` for isolated package installation
- **Package Management**: Installs required packages automatically
- **Compatibility**: Works with externally-managed Python environments (like Homebrew)
- **Cleanup**: Use `pnpm run cli:clean --cache` to remove Python environments
