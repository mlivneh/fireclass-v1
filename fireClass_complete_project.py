import os
import datetime

# ==============================================================================
#  Python Concatenation Script for fireClass Project
#
#  This script creates a single text file containing all project files
#  for easy sharing and review. Based on the build.py structure but
#  focused on concatenation instead of minification.
# ==============================================================================

# --- Configuration ---
SOURCE_DIR = 'public'
OUTPUT_FILE = 'fireClass_complete_project.txt'

# File extensions to include (add more as needed)
INCLUDE_EXTENSIONS = {'.html', '.js', '.css', '.json', '.xml', '.txt', '.md'}

# Files/directories to exclude
EXCLUDE_PATTERNS = {
    'node_modules',
    '.git',
    'BUILD',
    '.DS_Store',
    'Thumbs.db',
    '__pycache__',
    '.pyc'
}

def should_include_file(filepath, filename):
    """Determines if a file should be included in the concatenation."""
    # Check if file extension is in our include list
    _, ext = os.path.splitext(filename)
    if ext.lower() not in INCLUDE_EXTENSIONS:
        return False
    
    # Check if any exclude pattern is in the file path
    for pattern in EXCLUDE_PATTERNS:
        if pattern in filepath:
            return False
    
    return True

def read_file_safely(filepath):
    """Reads a file safely, handling encoding issues."""
    encodings = ['utf-8', 'utf-8-sig', 'cp1252', 'latin1']
    
    for encoding in encodings:
        try:
            with open(filepath, 'r', encoding=encoding) as file:
                return file.read()
        except UnicodeDecodeError:
            continue
        except Exception as e:
            return f"Error reading file: {str(e)}"
    
    return "Could not read file with any supported encoding"

def main():
    """Main function to concatenate all project files."""
    print(f"--- Starting fireClass project concatenation ---")
    print(f"Source directory: {SOURCE_DIR}")
    print(f"Output file: {OUTPUT_FILE}")

    # Check if source directory exists
    if not os.path.exists(SOURCE_DIR):
        print(f"ERROR: Source directory '{SOURCE_DIR}' does not exist!")
        return

    # Create/overwrite output file
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as output:
        # Write header
        header = f"""=================================================================
FireClass System - Complete Project Files
Created: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Source Directory: {SOURCE_DIR}
=================================================================

"""
        output.write(header)

        files_processed = 0
        files_skipped = 0

        # Walk through all files in the source directory
        for root, dirs, files in os.walk(SOURCE_DIR):
            # Remove excluded directories from the walk
            dirs[:] = [d for d in dirs if d not in EXCLUDE_PATTERNS]
            
            for filename in files:
                filepath = os.path.join(root, filename)
                
                if should_include_file(filepath, filename):
                    print(f"Processing: {filepath}")
                    
                    # Calculate relative path for cleaner display
                    relative_path = os.path.relpath(filepath, SOURCE_DIR)
                    
                    # Write file separator
                    separator = f"""
=================================================================
FILE: {relative_path}
FULL PATH: {filepath}
=================================================================

"""
                    output.write(separator)
                    
                    # Read and write file content
                    content = read_file_safely(filepath)
                    output.write(content)
                    
                    # Add spacing between files
                    output.write("\n\n")
                    
                    files_processed += 1
                else:
                    files_skipped += 1
                    print(f"Skipped: {filepath}")

        # Write footer
        footer = f"""
=================================================================
END OF PROJECT FILES
Total files processed: {files_processed}
Total files skipped: {files_skipped}
Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
=================================================================
"""
        output.write(footer)

    # Final summary
    print("\n" + "="*50)
    print(f"✅ Concatenation complete!")
    print(f"📁 Files processed: {files_processed}")
    print(f"⏭️  Files skipped: {files_skipped}")
    print(f"📄 Output file: {OUTPUT_FILE}")
    
    # Show file size
    if os.path.exists(OUTPUT_FILE):
        size = os.path.getsize(OUTPUT_FILE)
        print(f"📊 File size: {size:,} bytes ({size/1024:.1f} KB)")
    
    print("="*50)

if __name__ == "__main__":
    main()
