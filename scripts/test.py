#!/usr/bin/env python3
"""
Test script for font editing module

This is a simple test script that demonstrates the font editing workflow.
"""

from pathlib import Path
import sys

# Import utilities
try:
    from utils import load_font, print_font_info, log_progress
except ImportError:
    print("❌ utils.py not found - make sure you're running from the scripts directory")
    sys.exit(1)

def test_font_info(font_path: Path) -> bool:
    """
    Test function that loads a font and prints its information
    
    Args:
        font_path: Path to the font file
        
    Returns:
        True if successful, False otherwise
    """
    try:
        log_progress(f"Testing font info extraction for: {font_path}")
        font = load_font(font_path)
        print_font_info(font)
        log_progress("Font info extraction test completed successfully", 'success')
        return True
        
    except Exception as e:
        log_progress(f"Font info extraction test failed: {e}", 'error')
        return False

def main():
    """Main test function"""
    # Get font path from command line argument
    if len(sys.argv) < 2:
        log_progress("Usage: test.py <font_path>", 'error')
        sys.exit(1)
    
    font_path = Path(sys.argv[1])
    
    log_progress("Starting font editing test script")
    
    try:
        if not font_path.exists():
            log_progress(f"Font file not found: {font_path}", 'warn')
            log_progress("This is expected if fonts haven't been downloaded yet", 'info')
            sys.exit(0)
        
        success = test_font_info(font_path)
        
        if success:
            log_progress("All tests passed!", 'success')
            sys.exit(0)
        else:
            log_progress("Some tests failed", 'error')
            sys.exit(1)
            
    except Exception as e:
        log_progress(f"Test script error: {e}", 'error')
        sys.exit(1)

if __name__ == "__main__":
    main()
