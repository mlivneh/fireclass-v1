#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
File Collector Script
Collects all text files (HTML, JSON, JS, MD, TXT, etc.) into a single text file with separators
"""

import os
import glob
from pathlib import Path

def should_exclude_directory(dir_path):
    """Check if directory should be excluded"""
    dir_name = os.path.basename(dir_path).lower()
    
    # Standard directories to exclude
    exclude_dirs = {
        'node_modules',
        '.firebase',
        '.git',
        '__pycache__',
        '.vscode',
        '.idea',
        'build-old',
        'test-results',
        'tests'
    }
    
    # Check for exact matches
    if dir_name in exclude_dirs:
        return True
    
    # Check for patterns
    if dir_name.startswith('folder'):
        return True
    
    return False

def should_exclude_file(file_path):
    """Check if file should be excluded"""
    file_name = os.path.basename(file_path).lower()
    
    # Specific files to exclude
    exclude_files = {
        'installation_guide.pdf',
        'pglite-debug.log'
    }
    
    if file_name in exclude_files:
        return True
    
    # Check for test patterns
    if file_name.startswith('test'):
        return True
    
    return False

def is_target_file(file_path):
    """Check if file is a text file (HTML, JSON, JS, MD, TXT, etc.)"""
    text_extensions = (
        '.html', '.htm', '.json', '.js', '.jsx', '.ts', '.tsx',
        '.md', '.txt', '.css', '.scss', '.sass', '.less',
        '.xml', '.yml', '.yaml', '.ini', '.cfg', '.conf',
        '.log', '.sql', '.py', '.php', '.rb', '.go', '.java',
        '.c', '.cpp', '.h', '.hpp', '.cs', '.vb', '.sh', '.bat',
        '.ps1', '.vue', '.svelte', '.angular', '.react'
    )
    return file_path.lower().endswith(text_extensions)

def collect_files(root_dir):
    """Collect all target files from the directory tree"""
    collected_files = []
    root_path = Path(root_dir)
    
    # Handle special case for fireClass-documentation
    documentation_dir = root_path / "fireClass-documentation"
    if documentation_dir.exists():
        special_file = documentation_dir / "updated_specs.md"
        if special_file.exists():
            collected_files.append(str(special_file))
    
def collect_files(root_dir):
    """Collect all target files from the directory tree"""
    collected_files = []
    root_path = Path(root_dir)
    
    # Handle special case for fireClass-documentation
    documentation_dir = root_path / "fireClass-documentation"
    if documentation_dir.exists():
        special_file = documentation_dir / "updated_specs.md"
        if special_file.exists():
            collected_files.append(str(special_file))
    
    # Walk through all directories
    for root, dirs, files in os.walk(root_dir):
        # Filter out excluded directories
        dirs[:] = [d for d in dirs if not should_exclude_directory(os.path.join(root, d))]
        
        # Skip the fireClass-documentation directory for normal processing
        # (we already handled the special file above)
        if os.path.basename(root) == "fireClass-documentation":
            continue
        
        # Process files in current directory
        for file in files:
            file_path = os.path.join(root, file)
            
            # Skip excluded files
            if should_exclude_file(file_path):
                continue
            
            # Check if it's a target file
            if is_target_file(file_path):
                collected_files.append(file_path)
    
    return sorted(collected_files)

def read_file_content(file_path):
    """Read file content with proper encoding handling"""
    encodings = ['utf-8', 'utf-8-sig', 'windows-1255', 'iso-8859-8', 'cp1252']
    
    for encoding in encodings:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                return f.read()
        except (UnicodeDecodeError, UnicodeError):
            continue
        except Exception as e:
            return f"ERROR: Could not read file - {str(e)}"
    
    return "ERROR: Could not decode file with any supported encoding"

def create_output_file(files, output_path):
    """Create the output file with all collected files"""
    with open(output_path, 'w', encoding='utf-8') as output_file:
        output_file.write("=" * 80 + "\n")
        output_file.write("COLLECTED FILES - FIRECLASS PROJECT\n")
        output_file.write("=" * 80 + "\n\n")
        
        for i, file_path in enumerate(files, 1):
            # Create separator with file info
            separator = "=" * 80
            file_info = f"File {i}/{len(files)}: {file_path}"
            
            output_file.write(f"{separator}\n")
            output_file.write(f"{file_info}\n")
            output_file.write(f"{separator}\n\n")
            
            # Read and write file content
            content = read_file_content(file_path)
            output_file.write(content)
            output_file.write("\n\n")
        
        # Final separator
        output_file.write("=" * 80 + "\n")
        output_file.write("END OF COLLECTED FILES\n")
        output_file.write("=" * 80 + "\n")

def main():
    """Main function"""
    # Get current directory
    current_dir = os.getcwd()
    print(f"Scanning directory: {current_dir}")
    
    # Collect files
    print("Collecting files...")
    files = collect_files(current_dir)
    
    if not files:
        print("No files found matching criteria.")
        return
    
    print(f"Found {len(files)} files:")
    for file_path in files:
        print(f"  - {file_path}")
    
    # Create output file
    output_path = os.path.join(current_dir, "collected_files.txt")
    print(f"\nCreating output file: {output_path}")
    
    create_output_file(files, output_path)
    
    print(f"Done! All files collected into: {output_path}")
    print(f"Total files processed: {len(files)}")

if __name__ == "__main__":
    main()