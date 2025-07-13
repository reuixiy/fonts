#!/usr/bin/env python3
"""
LXGW WenKai TC Halt Feature Fix Script

Removes specific punctuation characters from the 'halt' feature in GPOS table 
to fix rendering issues in LXGW WenKai TC font.

Targets characters: ：、，；。！
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

def fix_lxgw_halt_feature(font_path: Path, target_chars: list = None) -> bool:
    """
    Fix GPOS halt feature by removing specific punctuation characters
    
    Args:
        font_path: Path to the font file
        target_chars: List of characters to remove from halt feature
        
    Returns:
        True if modifications were made, False otherwise
    """
    if target_chars is None:
        target_chars = ['：', '、', '，', '；', '。', '！']
    
    log_progress(f"Loading font: {font_path}")
    font = load_font(font_path)
    
    # Check if font has GPOS table
    if 'GPOS' not in font:
        log_progress("Font does not have GPOS table", 'warn')
        return False
    
    # Get glyph names for target characters
    cmap = font.getBestCmap()
    target_glyphs = []
    
    for char in target_chars:
        gname = cmap.get(ord(char))
        if gname:
            target_glyphs.append((char, gname))
            log_progress(f"Resolved {char} → glyph name: {gname}")
        else:
            log_progress(f"Glyph not found for character: {char}", 'warn')
    
    if not target_glyphs:
        log_progress("No target glyphs found in font", 'warn')
        return False
    
    gpos = font["GPOS"].table
    feature_list = gpos.FeatureList
    lookup_list = gpos.LookupList
    
    removed_count = 0
    total_removals = 0
    
    # Traverse the 'halt' feature
    halt_feature_found = False
    for feat in feature_list.FeatureRecord:
        if feat.FeatureTag == "halt":
            halt_feature_found = True
            log_progress("Found 'halt' feature, processing lookups...")
            
            for lookup_idx in feat.Feature.LookupListIndex:
                lookup = lookup_list.Lookup[lookup_idx]
                
                for sub_idx, sub in enumerate(lookup.SubTable):
                    if not hasattr(sub, 'Coverage'):
                        continue
                        
                    cov = sub.Coverage
                    
                    # Check each target glyph
                    for char, gname in target_glyphs:
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
                            f"Removed {char} ({gname}) from halt coverage "
                            f"(lookup {lookup_idx}, subtable {sub_idx}, format {getattr(sub, 'Format', 'unknown')})"
                        )
                        total_removals += 1
                
                if total_removals > 0:
                    removed_count += 1
            
            break  # Found halt feature, no need to continue
    
    if not halt_feature_found:
        log_progress("No 'halt' feature found in font", 'warn')
        return False
    
    if total_removals == 0:
        log_progress("No halt entries for the target glyphs were found; font unchanged", 'warn')
        return False
    
    # Save the modified font
    log_progress(f"Removed {total_removals} glyph entries from halt feature")
    log_progress("Saving modified font...")
    save_font(font, font_path, backup=False)  # No backup since we're working on copies
    log_progress(f"Successfully saved modified font to {font_path}", 'success')
    
    return True

def main():
    """Main script function"""
    # Get font path from command line argument
    if len(sys.argv) < 2:
        log_progress("Usage: lxgw-halt-fix.py <font_path>", 'error')
        sys.exit(1)
    
    font_path = Path(sys.argv[1])
    
    # Target characters for LXGW WenKai TC
    target_chars = ['：', '、', '，', '；', '。', '！']
    
    log_progress(f"LXGW WenKai TC Halt Fix - Target characters: {''.join(target_chars)}")
    
    try:
        success = fix_lxgw_halt_feature(font_path, target_chars)
        
        if success:
            log_progress("LXGW halt feature fix completed successfully", 'success')
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
