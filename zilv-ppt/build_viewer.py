import re

with open('.agents/skills/ks-design-slide-deck/assets/viewer-shell.html', 'r', encoding='utf-8') as f:
    content = f.read()

slides = ['slide-01.html','slide-02.html','slide-03.html','slide-04.html','slide-05.html','slide-06.html','slide-07.html','slide-08.html']
titles = ['自律 — 封面','什么是自律？','自律为何重要？','不自律的代价','自律者的五大特质','如何培养自律？','自律与自由','结语']

slides_js = ','.join(['"'+s+'"' for s in slides])
titles_js = '[' + ','.join(['"'+t+'"' for t in titles]) + ']'

content = content.replace('{{MODE}}', 'professional')
content = content.replace('{{TITLE}}', '自律：决定一个人成长高度的关键')
content = content.replace('{{SLIDES}}', slides_js)
content = content.replace('{{TITLES}}', titles_js)

with open('output/zilv-ppt/viewer.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('viewer.html generated successfully')
print('Total slides:', len(slides))
