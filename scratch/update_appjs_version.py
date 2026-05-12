import os
import glob
import re

html_files = glob.glob('c:/Users/iraaf/Downloads/iraasoft-solution-lmrs-main/iraasoft-solution-lmrs-main/*.html')

for file_path in html_files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace any app.js?v=... or app.js with app.js?v=3.11
    new_content = re.sub(r'src="js/app\.js(\?v=[0-9.]+)?(["]?)', r'src="js/app.js?v=3.11\2', content)
    
    # Replace any style.css?v=... or style.css with style.css?v=3.11
    new_content = re.sub(r'href="css/style\.css(\?v=[0-9.]+)?(["]?)', r'href="css/style.css?v=3.11\2', new_content)
    
    # Replace any db.js?v=... or db.js with db.js?v=3.11
    new_content = re.sub(r'src="js/db\.js(\?v=[0-9.]+)?(["]?)', r'src="js/db.js?v=3.11\2', new_content)
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated versions in {os.path.basename(file_path)}")
    else:
        print(f"No changes needed in {os.path.basename(file_path)}")
