import re

with open('.agents/skills/ks-design-slide-deck/assets/viewer-shell.html', 'r', encoding='utf-8') as f:
    content = f.read()

slides = ['images/slide-{:02d}.jpg'.format(i) for i in range(1, 11)]
titles = [
    'KAT-Coder-Pro V2 全新上线',
    'Agentic Coding With KwaiKAT',
    '编码能力基准测试 — PintBench',
    '编码能力基准测试 — Case-Eval',
    '实际案例展示',
    '模型应用场景',
    '模型概览 V2 vs V1',
    '模型定价',
    '引领 Agentic Coding 新时代',
    '立即体验 KAT-Coder-Pro V2'
]

slides_str = ','.join(['"' + s + '"' for s in slides])
titles_str = '[' + ','.join(['"' + t + '"' for t in titles]) + ']'

content = content.replace('{{TITLE}}', 'KAT-Coder-Pro V2 全新上线')
content = content.replace('{{MODE}}', 'creative')
content = content.replace('{{SLIDES}}', slides_str)
content = content.replace('{{TITLES}}', titles_str)

with open('output/kat-coder-pro-v2-c2/viewer.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('viewer.html written successfully')
