import os
import glob

html_files = glob.glob('*.html')

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove firebase scripts
    content = content.replace('<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js?v=3.5"></script>\n', '')
    content = content.replace('<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js"></script>\n', '')
    content = content.replace('<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>\n', '')
    
    # Replace firebase-config.js with db.js
    content = content.replace('<script src="js/firebase-config.js?v=3.5"></script>', '<script src="js/db.js"></script>')
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
