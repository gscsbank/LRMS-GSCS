import os
import glob

html_files = glob.glob('c:/Users/iraaf/Downloads/iraasoft-solution-lmrs-main/iraasoft-solution-lmrs-main/*.html')

for file_path in html_files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'js/db.js' not in content:
        # Find lucide@latest and insert db.js before it
        target = '<script src="https://unpkg.com/lucide@latest"></script>'
        if target in content:
            content = content.replace(target, '    <script src="js/db.js"></script>\n    ' + target)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Added db.js to {os.path.basename(file_path)}")
        else:
            print(f"Could not find lucide in {os.path.basename(file_path)}")
    else:
        print(f"db.js already present in {os.path.basename(file_path)}")
