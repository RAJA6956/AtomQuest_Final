import zipfile
import xml.etree.ElementTree as ET
import re
from pathlib import Path

path = Path('6a2bdcd474b89_AtomQuest_Hackathon_1.0_Finale_Problem_Statement.docx')
with zipfile.ZipFile(path, 'r') as z:
    xml = z.read('word/document.xml')
root = ET.fromstring(xml)
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
texts = [node.text for node in root.findall('.//w:t', ns) if node.text]
text = ' '.join(texts)
text = re.sub(r'\s+', ' ', text)
print(text)
