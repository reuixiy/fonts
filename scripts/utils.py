#!/usr/bin/env python3
"""
Font utilities for common operations

This module provides common utility functions that can be imported
by other font editing scripts.
"""

from fontTools.ttLib import TTFont
from pathlib import Path
import sys
from typing import List, Dict, Any, Optional

def load_font(font_path: Path) -> TTFont:
    """
    Safely load a font file
    
    Args:
        font_path: Path to the font file
        
    Returns:
        Loaded TTFont object
        
    Raises:
        SystemExit: If font cannot be loaded
    """
    try:
        return TTFont(font_path)
    except Exception as e:
        print(f"❌ Failed to load font {font_path}: {e}", file=sys.stderr)
        sys.exit(1)

def save_font(font: TTFont, font_path: Path, backup: bool = True) -> None:
    """
    Safely save a font file with optional backup
    
    Args:
        font: TTFont object to save
        font_path: Path where to save the font
        backup: Whether to create a backup of the original file
    """
    try:
        if backup and font_path.exists():
            backup_path = font_path.with_suffix(f"{font_path.suffix}.backup")
            font_path.rename(backup_path)
            print(f"📋 Created backup: {backup_path}")
        
        font.save(font_path)
        print(f"✔ Saved font to: {font_path}")
        
    except Exception as e:
        print(f"❌ Failed to save font {font_path}: {e}", file=sys.stderr)
        sys.exit(1)

def get_font_info(font: TTFont) -> Dict[str, Any]:
    """
    Extract basic information about a font
    
    Args:
        font: TTFont object
        
    Returns:
        Dictionary with font information
    """
    info = {}
    
    # Basic font information
    if 'name' in font:
        name_table = font['name']
        info['family_name'] = name_table.getDebugName(1)
        info['subfamily_name'] = name_table.getDebugName(2)
        info['full_name'] = name_table.getDebugName(4)
        info['version'] = name_table.getDebugName(5)
    
    # Glyph information
    glyph_set = font.getGlyphSet()
    info['num_glyphs'] = len(glyph_set)
    info['glyph_names'] = list(glyph_set.keys())
    
    # Table information
    info['tables'] = list(font.keys())
    info['has_gpos'] = 'GPOS' in font
    info['has_gsub'] = 'GSUB' in font
    info['has_kern'] = 'kern' in font
    
    return info

def print_font_info(font: TTFont) -> None:
    """
    Print formatted font information
    
    Args:
        font: TTFont object
    """
    info = get_font_info(font)
    
    print("📋 Font Information:")
    print(f"  Family: {info.get('family_name', 'Unknown')}")
    print(f"  Subfamily: {info.get('subfamily_name', 'Unknown')}")
    print(f"  Full Name: {info.get('full_name', 'Unknown')}")
    print(f"  Version: {info.get('version', 'Unknown')}")
    print(f"  Glyphs: {info['num_glyphs']}")
    print(f"  Tables: {', '.join(info['tables'])}")
    
    features = []
    if info['has_gpos']:
        features.append('GPOS')
    if info['has_gsub']:
        features.append('GSUB')
    if info['has_kern']:
        features.append('kern')
    
    if features:
        print(f"  Features: {', '.join(features)}")

def find_glyph_by_unicode(font: TTFont, unicode_value: int) -> Optional[str]:
    """
    Find glyph name by Unicode code point
    
    Args:
        font: TTFont object
        unicode_value: Unicode code point (e.g., ord('A'))
        
    Returns:
        Glyph name if found, None otherwise
    """
    cmap = font.getBestCmap()
    return cmap.get(unicode_value)

def has_feature(font: TTFont, feature_tag: str, script: str = 'DFLT', lang: str = 'dflt') -> bool:
    """
    Check if font has a specific OpenType feature
    
    Args:
        font: TTFont object
        feature_tag: 4-character feature tag (e.g., 'kern', 'liga')
        script: Script tag (default: 'DFLT')
        lang: Language tag (default: 'dflt')
        
    Returns:
        True if feature exists, False otherwise
    """
    if 'GPOS' not in font and 'GSUB' not in font:
        return False
    
    # Check GPOS table
    if 'GPOS' in font:
        gpos = font['GPOS'].table
        if hasattr(gpos, 'FeatureList'):
            for feature_record in gpos.FeatureList.FeatureRecord:
                if feature_record.FeatureTag == feature_tag:
                    return True
    
    # Check GSUB table
    if 'GSUB' in font:
        gsub = font['GSUB'].table
        if hasattr(gsub, 'FeatureList'):
            for feature_record in gsub.FeatureList.FeatureRecord:
                if feature_record.FeatureTag == feature_tag:
                    return True
    
    return False

def log_progress(message: str, level: str = 'info') -> None:
    """
    Log a progress message with appropriate formatting
    
    Args:
        message: Message to log
        level: Log level ('info', 'warn', 'error', 'success')
    """
    icons = {
        'info': '📝',
        'warn': '⚠️',
        'error': '❌',
        'success': '✅'
    }
    
    icon = icons.get(level, '📝')
    
    if level == 'error':
        print(f"{icon} {message}", file=sys.stderr)
    else:
        print(f"{icon} {message}")

# Example usage
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Font utility functions demo')
    parser.add_argument('font_path', help='Path to font file')
    args = parser.parse_args()
    
    font_path = Path(args.font_path)
    font = load_font(font_path)
    
    print_font_info(font)
