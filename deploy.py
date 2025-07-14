import os
import subprocess
import shutil
import json
import argparse
import getpass

# ==============================================================================
#  Python Installation Script for fireClass & Game Theory Projects
#
#  This script automates the setup process described in the installation guide.
#  SIMULATION MODE IS THE DEFAULT.
#
#  Usage:
#    - Simulation Mode (default): python install.py
#    - Live Execution Mode:       python install.py --live
# ==============================================================================

def print_header(title):
    """Prints a formatted header."""
    print("\n" + "="*70)
    print(f"--- {title} ---")
    print("="*70)

def run_command(command_parts, simulate=True, capture_output=False):
    """
    Runs a command and checks for errors.
    In simulation mode (default), it just prints the command.
    """
    command_str = ' '.join(command_parts)
    print(f"  > Executing: {command_str}")
    
    if simulate:
        print("    [SIMULATE] Command not executed.")
        return True, "simulated_output"
        
    try:
        is_windows = os.name == 'nt'
        result = subprocess.run(
            command_parts, 
            capture_output=capture_output, 
            text=True, 
            shell=is_windows,
            check=not capture_output
        )
        if capture_output and result.returncode != 0:
            print(f"    ERROR: Command failed with exit code {result.returncode}")
            print(f"    Stderr: {result.stderr}")
            return False, result.stderr
            
        return True, result.stdout if capture_output else ""
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f"    FATAL ERROR: Could not run command. {e}")
        return False, str(e)

def check_dependencies(simulate=True):
    """Checks if required command-line tools are installed."""
    print_header("Step 0: Checking Prerequisites")
    dependencies = ['node', 'npm', 'firebase']
    all_found = True
    
    for dep in dependencies:
        if shutil.which(dep):
            print(f"  [V] Found: {dep}")
        else:
            print(f"  [X] NOT FOUND: {dep}")
            all_found = False
            
    if not all_found:
        print("\nERROR: One or more dependencies are missing.")
        print("Please install Node.js (which includes npm) and the Firebase CLI.")
        print(" - Node.js: https://nodejs.org/")
        print(" - Firebase CLI: npm install -g firebase-tools")
        return False
        
    print("  All prerequisites are installed.")
    return True

def create_project(simulate=True):
    """Guides the user through creating a new Firebase project."""
    print_header("Step 1: Create Firebase Project")
    
    project_id = input("Enter a unique ID for your new Firebase project (e.g., 'my-poker-game-123'): ")
    if not project_id:
        print("Project ID cannot be empty.")
        return None
        
    print("\nAttempting to create Firebase project...")
    success, _ = run_command(['firebase', 'projects:create', project_id, '--display-name', project_id, '--location=europe-west1'], simulate)

    if success:
        print(f"Project '{project_id}' created successfully (or simulated).")
        return project_id
    else:
        print("Failed to create project.")
        return None

def enable_services(project_id, simulate=True):
    """Enables required Google Cloud services for the project."""
    print_header("Step 2: Enable Cloud Services")

    services_to_enable = [
        'secretmanager.googleapis.com',
        'cloudfunctions.googleapis.com',
        'cloudbuild.googleapis.com',
        'artifactregistry.googleapis.com'
    ]

    for service in services_to_enable:
        print(f"\nEnabling {service}...")
        run_command(['gcloud', 'services', 'enable', service, '--project', project_id], simulate)

    print("\nEnabling Firestore...")
    run_command(['gcloud', 'firestore', 'databases', 'create', '--location=eur3', '--project', project_id], simulate)
    
    print("\nNote: Anonymous Authentication must be enabled manually in the Firebase Console.")
    print("Go to Authentication > Sign-in method > Add new provider > Anonymous > Enable.")

def setup_local_project(project_id, simulate=True):
    """Sets up the local project files and installs dependencies."""
    print_header("Step 4 & 5: Setup Local Project & Configuration")
    
    firebaserc_content = { "projects": { "default": project_id } }
    print("\nCreating .firebaserc file...")
    if not simulate:
        with open('.firebaserc', 'w') as f:
            json.dump(firebaserc_content, f, indent=2)
    print(f"  Content: {json.dumps(firebaserc_content)}")

    print("\nCreating firebase.json from template...")
    firebase_json_content = {
      "firestore": {"rules": "firestore.rules", "indexes": "firestore.indexes.json"},
      "functions": {"source": "functions"},
      "hosting": {
        "public": "public",
        "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
        "rewrites": [{"source": "**", "destination": "/index.html"}]
      }
    }
    if not simulate:
        with open('firebase.json', 'w') as f:
            json.dump(firebase_json_content, f, indent=2)
    print("  firebase.json created.")

    print("\nCreating public/config.json...")
    student_app_url = f"https://{project_id}.web.app/student-app.html"
    config_json_content = {
        "studentAppUrl": student_app_url,
        "games": [
            {"name": "Poker Game", "description": "Game Theory Poker", "icon": "🃏", "url": "YOUR_POKER_GAME_URL_HERE"},
            {"name": "Homer Face Rec", "description": "Face Recognition", "icon": "👨", "url": "https://meir.world/face-recognition/"}
        ]
    }
    if not simulate:
        os.makedirs('public', exist_ok=True)
        with open(os.path.join('public', 'config.json'), 'w') as f:
            json.dump(config_json_content, f, indent=2)
    print(f"  Student App URL set to: {student_app_url}")
    
    print("\nGenerating public/firebase-config.js...")
    run_command(['firebase', 'apps:sdkconfig', 'WEB', '--project', project_id, '-o', os.path.join('public', 'firebase-config.js')], simulate)

    print("\nInstalling function dependencies (npm install)...")
    if not simulate:
        if os.path.isdir('functions') and os.path.exists(os.path.join('functions', 'package.json')):
            subprocess.run(['npm', 'install'], cwd='functions', check=True, shell=(os.name == 'nt'))
        else:
            print("  [SKIP] 'functions' directory or 'package.json' not found. Skipping npm install.")
    else:
        print("  [SIMULATE] Would run 'npm install' in 'functions' directory.")

def set_secrets(project_id, simulate=True):
    """Guides the user to set the necessary API key secrets."""
    print_header("Step 6: Set API Key Secrets")
    print("You will be prompted to enter your API keys from external services.")
    print("Your input will not be shown on screen for security.")
    
    secrets = ['OPENAI_API_KEY', 'CLAUDE_API_KEY', 'GEMINI_API_KEY']
    
    for secret_name in secrets:
        if simulate:
            print(f"\n  [SIMULATE] Would prompt for {secret_name} and run:")
            print(f"  > firebase functions:secrets:set {secret_name} --project {project_id}")
            continue
            
        try:
            secret_value = getpass.getpass(f"  Please enter your {secret_name}: ")
            if secret_value:
                command = f'echo "{secret_value}" | firebase functions:secrets:set {secret_name} --project {project_id}'
                print(f"  > Setting secret for {secret_name}...")
                subprocess.run(command, shell=True, check=True, text=True)
                print(f"  Secret for {secret_name} set successfully.")
            else:
                print(f"  Skipping {secret_name} as no value was provided.")
        except Exception as e:
            print(f"  An error occurred while setting secret {secret_name}: {e}")

def final_deploy(simulate=True):
    """Runs the final deploy command after user confirmation."""
    print_header("Step 7: Final Deployment")
    
    if simulate:
        print("  [SIMULATE] Would ask for confirmation and run 'firebase deploy'.")
        return
        
    confirm = input("Are you ready to deploy the entire project to Firebase? (y/n): ").lower()
    if confirm == 'y':
        print("Deploying project...")
        run_command(['firebase', 'deploy'], simulate=False) # Force live mode for this command
    else:
        print("Deployment cancelled by user.")

def main():
    """Main function to orchestrate the installation."""
    parser = argparse.ArgumentParser(description="Automated installer for fireClass and related projects.")
    parser.add_argument('--live', action='store_true', help="Run in live mode, executing all commands.")
    args = parser.parse_args()

    # Simulation is the default unless --live is specified.
    is_simulation = not args.live

    if is_simulation:
        print_header("RUNNING IN SIMULATION MODE")
        print("This script will only print the steps it would take.")
        print("No files will be created and no commands will be executed.")
        print("To run the installation for real, use the --live flag:")
        print("  python install.py --live")
    else:
        print_header("RUNNING IN LIVE MODE")
        print("This script will execute commands and create/modify files.")
        print("Make sure you have backed up any important data.")
        input("Press Enter to continue...")


    if not check_dependencies(is_simulation):
        return

    print("\nReminder: This script does not create API keys for you.")
    print("Please ensure you have created your keys from OpenAI, Anthropic, and Google AI Studio.")
    if not is_simulation:
        input("Press Enter to continue...")

    project_id = create_project(is_simulation)
    if not project_id and not is_simulation:
        print("Exiting due to project creation failure.")
        return
    if is_simulation and not project_id:
        project_id = "simulated-project-123"
        print(f"[SIMULATE] Using dummy project ID: {project_id}")

    enable_services
if __name__ == "__main__":
    main()    