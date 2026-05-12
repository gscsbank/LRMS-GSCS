import os
import glob

html_files = glob.glob('c:/Users/iraaf/Downloads/iraasoft-solution-lmrs-main/iraasoft-solution-lmrs-main/*.html')

for file_path in html_files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'js/app.js' not in content:
        # Find </body> and insert script right before it
        if '</body>' in content:
            content = content.replace('</body>', '    <script src="js/app.js?v=3.5"></script>\n</body>')
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Added app.js to {os.path.basename(file_path)}")
        else:
            print(f"Could not find </body> in {os.path.basename(file_path)}")
    else:
        print(f"app.js already present in {os.path.basename(file_path)}")
