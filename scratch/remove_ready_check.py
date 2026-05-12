import os
import glob

html_files = glob.glob('c:/Users/iraaf/Downloads/iraasoft-solution-lmrs-main/iraasoft-solution-lmrs-main/*.html')

for file_path in html_files:
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    skip = False
    modified = False
    
    for line in lines:
        if "if (document.readyState === 'complete' || document.readyState === 'interactive') {" in line:
            skip = True
            modified = True
            continue
        
        if skip:
            if "window.initPage();" in line:
                continue
            if "}" in line:
                skip = False
                continue
            continue
            
        new_lines.append(line)
        
    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print(f"Cleaned {os.path.basename(file_path)}")
