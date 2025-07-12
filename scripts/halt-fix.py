#!/usr/bin/env python3
"""
GPOS Halt Feature Fix Script

Removes specific glyphs from the 'halt' feature in GPOS table to fix rendering issues.
Specifically targets the '！' character in I.MingCP font.
"""

from fontTools.ttLib import TTFont
from pathlib import Path
import sys

# Import utilities (optional, fallback to inline functions if not available)
try:
    from utils import load_font, save_font, log_progress
except ImportError:
    # Fallback functions if utils is not available
    def load_font(font_path):
        return TTFont(font_path)
    
    def save_font(font, font_path, backup=False):
        font.save(font_path)
    
    def log_progress(message, level='info'):
        icons = {'info': '📝', 'warn': '⚠️', 'error': '❌', 'success': '✅'}
        icon = icons.get(level, '📝')
        if level == 'error':
            print(f"{icon} {message}", file=sys.stderr)
        else:
            print(f"{icon} {message}")

def fix_halt_feature(font_path: Path, target_char: str = '！') -> bool:
    """
    Fix GPOS halt feature by removing specific character
    
    Args:
        font_path: Path to the font file
        target_char: Character to remove from halt feature
        
    Returns:
        True if modifications were made, False otherwise
    """
    log_progress(f"Loading font: {font_path}")
    font = load_font(font_path)
    
    # Check if font has GPOS table
    if 'GPOS' not in font:
        log_progress("Font does not have GPOS table", 'warn')
        return False
    
    # Get glyph name for target character
    cmap = font.getBestCmap()
    gname = cmap.get(ord(target_char))
    if not gname:
        log_progress(f"Glyph not found for character: {target_char}", 'warn')
        return False
    
    log_progress(f"Resolved {target_char} → glyph name: {gname}")
    
    gpos = font["GPOS"].table
    feature_list = gpos.FeatureList
    lookup_list = gpos.LookupList
    
    removed = False
    
    # Traverse the 'halt' feature
    for feat in feature_list.FeatureRecord:
        if feat.FeatureTag == "halt":
            log_progress("Found 'halt' feature, processing lookups...")
            
            for lookup_idx in feat.Feature.LookupListIndex:
                lookup = lookup_list.Lookup[lookup_idx]
                
                for sub_idx, sub in enumerate(lookup.SubTable):
                    if not hasattr(sub, 'Coverage'):
                        continue
                        
                    cov = sub.Coverage
                    if gname not in cov.glyphs:
                        continue
                    
                    # Remove glyph from Coverage (and ValueRecord if Format 2)
                    idx = cov.glyphs.index(gname)
                    del cov.glyphs[idx]
                    
                    if hasattr(sub, 'Format') and sub.Format == 2:
                        if hasattr(sub, 'Value') and idx < len(sub.Value):
                            del sub.Value[idx]
                            sub.ValueCount = len(sub.Value)
                    
                    log_progress(
                        f"Removed {gname} from halt coverage "
                        f"(lookup {lookup_idx}, subtable {sub_idx}, format {getattr(sub, 'Format', 'unknown')})"
                    )
                    removed = True
            
            break  # Found halt feature, no need to continue
    
    if not removed:
        log_progress("No halt entry for the glyph was found; font unchanged", 'warn')
        return False
    
    # Save the modified font
    log_progress("Saving modified font...")
    save_font(font, font_path, backup=False)  # No backup since we're working on copies
    log_progress(f"Successfully saved modified font to {font_path}", 'success')
    
    return True

def main():
    """Main script function"""
    # Get font path from command line argument
    if len(sys.argv) < 2:
        log_progress("Usage: halt-fix.py <font_path>", 'error')
        sys.exit(1)
    
    font_path = Path(sys.argv[1])
    
    try:
        success = fix_halt_feature(font_path)
        
        if success:
            log_progress("Halt feature fix completed successfully", 'success')
            sys.exit(0)
        else:
            log_progress("No modifications were needed", 'info')
            sys.exit(0)
            
    except FileNotFoundError:
        log_progress(f"Font file not found: {font_path}", 'error')
        sys.exit(1)
    except Exception as e:
        log_progress(f"Error processing font: {e}", 'error')
        sys.exit(1)

if __name__ == "__main__":
    main()
