import os
import glob

html_files = glob.glob('c:/Users/iraaf/Downloads/iraasoft-solution-lmrs-main/iraasoft-solution-lmrs-main/*.html')

for file_path in html_files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace(r'\${', '${')
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Unescaped literal \\${{ in {os.path.basename(file_path)}")
    else:
        print(f"No changes needed in {os.path.basename(file_path)}")
