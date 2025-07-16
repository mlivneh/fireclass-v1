#!/usr/bin/env python3
"""
MCP Server Setup Script for fireClass Control Project - FIXED VERSION
This script sets up MCP for managing your fireClass project including i18n support
"""

import json
import os
import sys
from pathlib import Path

def install_mcp_servers():
    """Install only the MCP servers that actually exist"""
    print("📦 Installing MCP servers...")
    
    # Only install the servers that actually exist
    servers = [
        "@modelcontextprotocol/server-filesystem"
    ]
    
    for server in servers:
        print(f"Installing {server}...")
        result = os.system(f"npm install -g {server}")
        if result != 0:
            print(f"❌ Failed to install {server}")
            return False
    
    print("✅ MCP servers installed successfully!")
    return True

def create_mcp_config():
    """Create MCP configuration for fireClass project management"""
    
    # Get project root directory
    project_root = input("Enter the full path to your fireClass project directory: ").strip()
    
    if not os.path.exists(project_root):
        print(f"❌ Directory {project_root} does not exist!")
        return False
    
    # Validate it's a fireClass project
    required_files = ['public/index.html', 'functions/index.js', 'public/js/ClassroomSDK.js']
    missing_files = []
    
    for file in required_files:
        if not os.path.exists(os.path.join(project_root, file)):
            missing_files.append(file)
    
    if missing_files:
        print(f"❌ This doesn't appear to be a fireClass project. Missing files: {missing_files}")
        return False
    
    # Create MCP configuration - ONLY filesystem server
    config = {
        "mcpServers": {
            "fireclass-filesystem": {
                "command": "npx",
                "args": ["@modelcontextprotocol/server-filesystem", project_root]
            }
        }
    }
    
    # Find Claude config directory
    claude_config_dir = None
    possible_dirs = [
        os.path.expanduser("~/Library/Application Support/Claude"),  # macOS
        os.path.expanduser("~/.config/claude"),  # Linux
        os.path.expanduser("~/AppData/Roaming/Claude")  # Windows
    ]
    
    for dir_path in possible_dirs:
        if os.path.exists(dir_path):
            claude_config_dir = dir_path
            break
    
    if not claude_config_dir:
        print("⚠️  Could not find Claude config directory.")
        claude_config_dir = input("Enter Claude config directory path: ").strip()
        if not claude_config_dir or not os.path.exists(claude_config_dir):
            print("Config will be saved to current directory as claude_desktop_config.json")
            claude_config_dir = "."
    
    # Save configuration
    config_path = os.path.join(claude_config_dir, "claude_desktop_config.json")
    
    try:
        # Load existing config if it exists
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                existing_config = json.load(f)
        else:
            existing_config = {}
        
        # Merge configurations
        if "mcpServers" not in existing_config:
            existing_config["mcpServers"] = {}
        
        existing_config["mcpServers"].update(config["mcpServers"])
        
        # Write updated config
        with open(config_path, 'w') as f:
            json.dump(existing_config, f, indent=2)
        
        print(f"✅ MCP configuration saved to: {config_path}")
        return True
        
    except Exception as e:
        print(f"❌ Error saving config: {e}")
        return False

def create_i18n_structure(project_root):
    """Create i18n structure for the project"""
    print("🌍 Creating i18n structure...")
    
    locales_dir = os.path.join(project_root, "public", "locales")
    os.makedirs(locales_dir, exist_ok=True)
    
    # Create language directories
    languages = ["en", "he", "ar", "es", "fr"]
    
    for lang in languages:
        lang_dir = os.path.join(locales_dir, lang)
        os.makedirs(lang_dir, exist_ok=True)
        
        # Create translation files
        translations = {
            "common": {
                "loading": "Loading..." if lang == "en" else f"[{lang}] Loading...",
                "error": "Error" if lang == "en" else f"[{lang}] Error",
                "success": "Success" if lang == "en" else f"[{lang}] Success"
            },
            "teacher": {
                "dashboard": "Teacher Dashboard" if lang == "en" else f"[{lang}] Teacher Dashboard",
                "students": "Students" if lang == "en" else f"[{lang}] Students",
                "messages": "Messages" if lang == "en" else f"[{lang}] Messages"
            },
            "student": {
                "join": "Join Lesson" if lang == "en" else f"[{lang}] Join Lesson",
                "name": "Your name" if lang == "en" else f"[{lang}] Your name",
                "roomCode": "Room Code" if lang == "en" else f"[{lang}] Room Code"
            }
        }
        
        for file_name, content in translations.items():
            file_path = os.path.join(lang_dir, f"{file_name}.json")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(content, f, indent=2, ensure_ascii=False)
    
    # Create i18n configuration file
    i18n_config = {
        "defaultLanguage": "en",
        "supportedLanguages": languages,
        "fallbackLanguage": "en",
        "autoDetect": True,
        "rtlLanguages": ["he", "ar"]
    }
    
    config_path = os.path.join(project_root, "public", "i18n-config.json")
    with open(config_path, 'w') as f:
        json.dump(i18n_config, f, indent=2)
    
    print(f"✅ i18n structure created with {len(languages)} languages")
    return True

def create_project_management_script():
    """Create a comprehensive Python script for managing the fireClass project"""
    
    script_content = '''#!/usr/bin/env python3
"""
fireClass Project Management Script with i18n Support
Use this script to perform operations on your fireClass project
"""

import os
import json
import subprocess
import shutil
from pathlib import Path

class FireClassManager:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.public_dir = self.project_root / "public"
        self.functions_dir = self.project_root / "functions"
        self.build_dir = self.project_root / "BUILD"
        self.locales_dir = self.public_dir / "locales"
    
    def check_project_health(self):
        """Check if project structure is healthy"""
        print("🔍 Checking project health...")
        
        required_files = [
            "public/index.html",
            "public/student-app.html",
            "public/js/ClassroomSDK.js",
            "public/js/teacher-dashboard.js",
            "public/js/student-app.js",
            "public/config.json",
            "functions/index.js",
            "functions/package.json",
            "firebase.json"
        ]
        
        missing = []
        for file in required_files:
            if not (self.project_root / file).exists():
                missing.append(file)
        
        if missing:
            print(f"❌ Missing files: {missing}")
            return False
        
        # Check i18n structure
        if self.locales_dir.exists():
            print("✅ i18n structure found")
        else:
            print("⚠️  No i18n structure found")
        
        print("✅ Project structure is healthy!")
        return True
    
    def add_language(self, lang_code, lang_name):
        """Add a new language to the project"""
        print(f"🌍 Adding language: {lang_name} ({lang_code})")
        
        if not self.locales_dir.exists():
            print("❌ i18n structure not found. Run setup first.")
            return False
        
        lang_dir = self.locales_dir / lang_code
        lang_dir.mkdir(exist_ok=True)
        
        # Copy English files as templates
        en_dir = self.locales_dir / "en"
        if en_dir.exists():
            for file in en_dir.glob("*.json"):
                shutil.copy2(file, lang_dir / file.name)
        
        # Update i18n config
        config_path = self.public_dir / "i18n-config.json"
        if config_path.exists():
            with open(config_path, 'r') as f:
                config = json.load(f)
            
            if lang_code not in config["supportedLanguages"]:
                config["supportedLanguages"].append(lang_code)
                
                with open(config_path, 'w') as f:
                    json.dump(config, f, indent=2)
        
        print(f"✅ Language {lang_code} added successfully")
        return True
    
    def update_translation(self, lang_code, file_name, key, value):
        """Update a translation"""
        trans_file = self.locales_dir / lang_code / f"{file_name}.json"
        
        if not trans_file.exists():
            print(f"❌ Translation file not found: {trans_file}")
            return False
        
        try:
            with open(trans_file, 'r', encoding='utf-8') as f:
                translations = json.load(f)
            
            translations[key] = value
            
            with open(trans_file, 'w', encoding='utf-8') as f:
                json.dump(translations, f, indent=2, ensure_ascii=False)
            
            print(f"✅ Updated translation: {lang_code}.{file_name}.{key}")
            return True
            
        except Exception as e:
            print(f"❌ Error updating translation: {e}")
            return False
    
    def build_project(self):
        """Build project for deployment"""
        print("🔨 Building project...")
        
        # Check if build script exists
        build_script = self.project_root / "build.py"
        if build_script.exists():
            result = subprocess.run([sys.executable, str(build_script)], 
                                  cwd=self.project_root)
            return result.returncode == 0
        else:
            print("⚠️  No build script found, creating basic build...")
            return self.create_basic_build()
    
    def create_basic_build(self):
        """Create basic build without minification"""
        if self.build_dir.exists():
            shutil.rmtree(self.build_dir)
        
        shutil.copytree(self.public_dir, self.build_dir)
        print("✅ Basic build created")
        return True
    
    def deploy_project(self):
        """Deploy project to Firebase"""
        print("🚀 Deploying to Firebase...")
        
        result = subprocess.run(["firebase", "deploy"], 
                              cwd=self.project_root)
        return result.returncode == 0
    
    def check_functions_dependencies(self):
        """Check and install functions dependencies"""
        print("📦 Checking functions dependencies...")
        
        result = subprocess.run(["npm", "install"], 
                              cwd=self.functions_dir)
        return result.returncode == 0
    
    def backup_project(self):
        """Create a backup of the project"""
        import datetime
        
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"fireclass_backup_{timestamp}"
        backup_path = self.project_root.parent / backup_name
        
        print(f"💾 Creating backup: {backup_path}")
        shutil.copytree(self.project_root, backup_path, ignore=shutil.ignore_patterns('.git', 'node_modules', 'BUILD'))
        
        print(f"✅ Backup created successfully")
        return True

def main():
    import sys
    
    if len(sys.argv) != 2:
        print("Usage: python manage_fireclass.py <project_root>")
        sys.exit(1)
    
    project_root = sys.argv[1]
    manager = FireClassManager(project_root)
    
    if not manager.check_project_health():
        print("⚠️  Project has issues but continuing...")
    
    print("\\n🎛️  fireClass Project Manager")
    print("1. Check project health")
    print("2. Add new language")
    print("3. Update translation")
    print("4. Build project")
    print("5. Deploy project")
    print("6. Check functions dependencies")
    print("7. Create backup")
    print("8. Exit")
    
    while True:
        choice = input("\\nEnter your choice (1-8): ").strip()
        
        if choice == '1':
            manager.check_project_health()
        elif choice == '2':
            lang_code = input("Enter language code (e.g., 'de'): ").strip()
            lang_name = input("Enter language name (e.g., 'German'): ").strip()
            manager.add_language(lang_code, lang_name)
        elif choice == '3':
            lang_code = input("Language code: ").strip()
            file_name = input("Translation file (common/teacher/student): ").strip()
            key = input("Translation key: ").strip()
            value = input("Translation value: ").strip()
            manager.update_translation(lang_code, file_name, key, value)
        elif choice == '4':
            manager.build_project()
        elif choice == '5':
            manager.deploy_project()
        elif choice == '6':
            manager.check_functions_dependencies()
        elif choice == '7':
            manager.backup_project()
        elif choice == '8':
            print("👋 Goodbye!")
            break
        else:
            print("❌ Invalid choice. Please try again.")

if __name__ == "__main__":
    main()
'''
    
    with open("manage_fireclass.py", 'w', encoding='utf-8') as f:
        f.write(script_content)
    
    print("✅ Created manage_fireclass.py script with i18n support")

def main():
    print("🚀 fireClass Control - MCP Setup (FIXED VERSION)")
    print("=" * 60)
    
    print("This script will:")
    print("1. Install MCP server (filesystem only)")
    print("2. Create MCP configuration")
    print("3. Set up i18n structure")
    print("4. Create project management script")
    
    # Step 1: Install MCP servers
    if input("\\n1. Install MCP servers? (y/n): ").lower() == 'y':
        if not install_mcp_servers():
            print("❌ Failed to install MCP servers.")
            return
    
    # Step 2: Create MCP configuration
    if input("\\n2. Create MCP configuration? (y/n): ").lower() == 'y':
        if not create_mcp_config():
            print("❌ Failed to create MCP configuration.")
            return
    
    # Step 3: Set up i18n
    if input("\\n3. Set up i18n structure? (y/n): ").lower() == 'y':
        project_root = input("Enter project root path: ").strip()
        if project_root and os.path.exists(project_root):
            create_i18n_structure(project_root)
    
    # Step 4: Create management script
    if input("\\n4. Create project management script? (y/n): ").lower() == 'y':
        create_project_management_script()
    
    print("\\n" + "=" * 60)
    print("✅ MCP setup complete!")
    print("\\nNext steps:")
    print("1. Restart Claude Desktop application")
    print("2. Open a new conversation")
    print("3. I'll now have access to your fireClass project files")
    print("4. Use 'python manage_fireclass.py <project_path>' for project management")
    
    print("\\n🎯 What I can help you with now:")
    print("• Manage your project files")
    print("• Set up internationalization (i18n)")
    print("• Add new languages")
    print("• Update translations")
    print("• Debug and improve your code")
    print("• Deploy to Firebase")

if __name__ == "__main__":
    main()
