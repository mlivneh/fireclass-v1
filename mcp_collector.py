#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MCP File Collector Script
=========================
Collects a specific, predefined list of essential project files 
into a single text file for creating a Minimum Viable Product (MCP) document.
This script uses a "whitelist" approach for precision.
"""

import os
from pathlib import Path

def collect_mcp_files(root_dir):
    """
    Collects a specific list of important files from the project root.
    Returns a list of full paths for existing files.
    """
    
    # --- זוהי רשימת הקבצים החשובים (Whitelist) ---
    # ניתן לערוך רשימה זו לפי הצורך
    important_files = [
        'fireClass-documentation/updated_specs.md',
        'functions/index.js',
        'public/js/ClassroomSDK.js',
        'public/js/teacher-dashboard.js',
        'public/js/student-app.js',
        'public/index.html',
        'public/student-app.html',
        'public/config.json',
        'firebase.json',
        'functions/package.json',
        'installation_guide.md',
    ]
    
    print("Collecting essential project files:")
    collected_paths = []
    
    for relative_path in important_files:
        # יצירת נתיב מלא על ידי שילוב ספריית הבסיס עם הנתיב היחסי
        full_path = Path(root_dir) / relative_path
        
        if full_path.exists():
            print(f"  [V] Found: {relative_path}")
            collected_paths.append(str(full_path))
        else:
            print(f"  [!] Not Found (Skipping): {relative_path}")
            
    return collected_paths

def read_file_content(file_path):
    """
    Reads file content with robust encoding handling.
    """
    # A list of common encodings to try
    encodings = ['utf-8', 'utf-8-sig', 'windows-1255', 'iso-8859-8', 'cp1252']
    
    for encoding in encodings:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                return f.read()
        except (UnicodeDecodeError, UnicodeError):
            continue  # Try the next encoding
        except Exception as e:
            return f"ERROR: Could not read file '{file_path}' - {str(e)}"
    
    return f"ERROR: Could not decode file '{file_path}' with any supported encoding"

def create_output_file(files, output_path, root_dir):
    """
    Creates the output file with all collected files.
    Uses relative paths for cleaner output.
    """
    with open(output_path, 'w', encoding='utf-8') as output_file:
        output_file.write("=" * 80 + "\n")
        output_file.write("COLLECTED MCP FILES - FIRECLASS PROJECT\n")
        output_file.write("=" * 80 + "\n\n")
        
        for i, file_path in enumerate(files, 1):
            # Create separator with relative file info for clarity
            relative_path = os.path.relpath(file_path, root_dir)
            separator = "=" * 80
            file_info = f"File {i}/{len(files)}: {relative_path}"
            
            output_file.write(f"{separator}\n")
            output_file.write(f"{file_info}\n")
            output_file.write(f"{separator}\n\n")
            
            # Read and write file content
            content = read_file_content(file_path)
            output_file.write(content)
            output_file.write("\n\n")
        
        # Final separator
        output_file.write("=" * 80 + "\n")
        output_file.write("END OF MCP COLLECTED FILES\n")
        output_file.write("=" * 80 + "\n")

def main():
    """Main function"""
    current_dir = os.getcwd()
    print(f"Scanning from root directory: {current_dir}\n")
    
    # Collect files based on the whitelist
    files_to_collect = collect_mcp_files(current_dir)
    
    if not files_to_collect:
        print("\nNo files found from the important list.")
        return
    
    # Create output file
    output_filename = "mcp_collected_files.txt"
    output_path = os.path.join(current_dir, output_filename)
    print(f"\nCreating output file: {output_path}")
    
    create_output_file(files_to_collect, output_path, current_dir)
    
    print(f"\nDone! All essential files collected into: {output_filename}")
    print(f"Total files processed: {len(files_to_collect)}")

if __name__ == "__main__":
    main()