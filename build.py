import os
import shutil
import subprocess

# ==============================================================================
#  Python Build Script for fireClass Project (Corrected Version)
# ==============================================================================

SOURCE_DIR = 'public'
BUILD_DIR = 'BUILD'
TERSER_CMD = os.path.join('node_modules', '.bin', 'terser')
MINIFY_CMD = os.path.join('node_modules', '.bin', 'minify')

def run_command(command_parts):
    """Runs a command and checks for errors."""
    print(f"  > Running: {' '.join(command_parts)}")
    is_windows = os.name == 'nt'
    result = subprocess.run(command_parts, capture_output=True, text=True, shell=is_windows)
    if result.returncode != 0:
        print(f"    ERROR: Command failed with exit code {result.returncode}")
        print(f"    Stderr: {result.stderr}")
    return result.returncode == 0

def main():
    """Main function to orchestrate the build process."""
    print(f"--- Starting fireClass build process ---")

    print(f"\n--- Step 1: Cleaning up old '{BUILD_DIR}' directory... ---")
    if os.path.exists(BUILD_DIR):
        shutil.rmtree(BUILD_DIR)
        print(f"Removed old '{BUILD_DIR}' directory.")
    
    os.makedirs(BUILD_DIR, exist_ok=True)
    print(f"Created clean '{BUILD_DIR}' directory.")

    print(f"\n--- Step 2: Minifying and copying project files from '{SOURCE_DIR}'... ---")
    
    files_processed = 0
    for root, _, files in os.walk(SOURCE_DIR):
        for filename in files:
            source_path = os.path.join(root, filename)
            relative_path = os.path.relpath(source_path, SOURCE_DIR)
            dest_path = os.path.join(BUILD_DIR, relative_path)
            
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            
            print(f"\nProcessing: {source_path}")

            success = False
            # *** THIS IS THE FIX: We exclude firebase-config.js from being minified by Terser ***
            if filename.endswith('.js') and filename != 'firebase-config.js':
                command = [TERSER_CMD, source_path, '-o', dest_path, '-c', '-m']
                success = run_command(command)
            elif filename.endswith(('.css', '.html')):
                with open(dest_path, 'w', encoding='utf-8') as f_out:
                    result = subprocess.run([MINIFY_CMD, source_path], capture_output=True, text=True, shell=(os.name == 'nt'))
                    if result.returncode == 0:
                        f_out.write(result.stdout)
                        success = True
                    else:
                        print(f"    ERROR: Minify failed for {filename}")
                        print(f"    Stderr: {result.stderr}")
            else:
                # All other files (like config.json AND firebase-config.js) will be copied as-is
                shutil.copy2(source_path, dest_path)
                print(f"  > Copied '{filename}' as-is.")
                success = True

            if success:
                files_processed += 1

    print("\n" + "="*50)
    print(f"✅ Build process complete! Processed {files_processed} files.")
    print(f"Production-ready files are located in the '{BUILD_DIR}' directory.")
    print("="*50)

if __name__ == "__main__":
    main()