#!/usr/bin/env python3
"""
Template for font editing scripts

This is a template script that demonstrates the basic structure
for font editing scripts used with the FontEditor.
"""

from fontTools.ttLib import TTFont
from pathlib import Path
import sys

def main():
    """Main script function"""
    # Get font path from command line argument
    if len(sys.argv) < 2:
        print("❌ Usage: template.py <font_path>", file=sys.stderr)
        sys.exit(1)
    
    font_path = Path(sys.argv[1])
    
    try:
        print(f"📝 Processing font: {font_path}")
        
        # Load the font
        font = TTFont(font_path)
        
        # Your font modification logic goes here
        # Example: Print basic font information
        print(f"Font family: {font['name'].getDebugName(1)}")
        print(f"Number of glyphs: {font.getGlyphSet().len()}")
        
        # Example modification (uncomment to use):
        # if 'GPOS' in font:
        #     print("Font has GPOS table")
        # 
        # if 'GSUB' in font:
        #     print("Font has GSUB table")
        
        # Save the modified font (uncomment if you made changes)
        # font.save(font_path)
        
        print(f"✔ Successfully processed {font_path}")
        
    except FileNotFoundError:
        print(f"❌ Font file not found: {font_path}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error processing font: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
