#!/usr/bin/env python3
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
    
    print("\n🎛️  fireClass Project Manager")
    print("1. Check project health")
    print("2. Add new language")
    print("3. Update translation")
    print("4. Build project")
    print("5. Deploy project")
    print("6. Check functions dependencies")
    print("7. Create backup")
    print("8. Exit")
    
    while True:
        choice = input("\nEnter your choice (1-8): ").strip()
        
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
