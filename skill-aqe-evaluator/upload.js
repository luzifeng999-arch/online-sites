/* ═══════════════════════════════════════════
   upload.js · 文件上传 & 解析模块
═══════════════════════════════════════════ */

const Uploader = (() => {

  // 颜色池用于文件类型条
  const TYPE_COLORS = {
    html: '#F97316', css: '#2563EB', js: '#EAB308', ts: '#3B82F6',
    json: '#8B5CF6', md: '#10B981', png: '#EC4899', jpg: '#EC4899',
    jpeg: '#EC4899', svg: '#06B6D4', gif: '#F43F5E', mp4: '#DC2626',
    zip: '#6B7280', py: '#3B82F6', txt: '#6B7280', other: '#94A3B8'
  };

  const DIR_RULES = [
    { dir: 'ui',    score: 0, keywords: ['html','css','component','ui','dashboard','page','layout','react','vue','tailwind','shadcn'] },
    { dir: 'img',   score: 0, keywords: ['image','img','generate','png','jpg','svg','illustration','photo','flux','dalle','midjourney'] },
    { dir: 'video', score: 0, keywords: ['video','animation','motion','lottie','framer','css-animation','keyframe','mp4','webm'] },
    { dir: 'doc',   score: 0, keywords: ['ppt','presentation','slide','document','report','markdown','pdf','powerpoint','keynote'] },
    { dir: 'eval',  score: 0, keywords: ['eval','evaluate','judge','score','assess','benchmark','metric','rating','test'] },
  ];

  const DIR_LABELS = {
    ui: '🖥 UI 生成 (DIR-01)',
    img: '🖼 图片生成 (DIR-02)',
    video: '🎬 视频动效 (DIR-03)',
    doc: '📄 文档/PPT (DIR-04)',
    eval: '📊 评测 (DIR-05)',
  };

  const FILE_ICONS = {
    html: '🌐', css: '🎨', js: '⚡', ts: '🔷', json: '📋',
    md: '📝', png: '🖼', jpg: '🖼', jpeg: '🖼', svg: '✏️',
    gif: '🎞', mp4: '🎬', zip: '📦', py: '🐍', txt: '📄', other: '📄'
  };

  /* ─── 上传区初始化 ─── */
  function init() {
    const zone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const folderInput = document.getElementById('folderInput');
    const btnSelect = document.getElementById('btnSelectFiles');

    // 拖拽事件
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', e => {
      if (!zone.contains(e.relatedTarget)) zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const items = e.dataTransfer.items;
      if (items && items.length) {
        processDataTransferItems(items);
      } else {
        processFiles(e.dataTransfer.files);
      }
    });

    zone.addEventListener('click', e => {
      // 只在点击区域本身时触发，误点内部按鈕不重复触发
      if (e.target === zone || e.target.classList.contains('upload-icon') ||
          e.target.classList.contains('upload-title') || e.target.classList.contains('upload-hint') ||
          e.target.tagName === 'SVG' || e.target.tagName === 'PATH' ||
          e.target.tagName === 'POLYLINE' || e.target.tagName === 'LINE') {
        fileInput.click();
      }
    });

    btnSelect.addEventListener('click', e => {
      e.stopPropagation();
      // 提示选择模式
      const choice = confirm('点击"确定"选择文件夹，点击"取消"选择单个文件');
      if (choice) {
        folderInput.click();
      } else {
        fileInput.click();
      }
    });

    fileInput.addEventListener('change', e => processFiles(e.target.files));
    folderInput.addEventListener('change', e => processFiles(e.target.files));
  }

  /* ─── 处理 DataTransfer Items（支持文件夹递归）─── */
  async function processDataTransferItems(items) {
    const files = [];
    const promises = [];

    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry?.() || item.getAsEntry?.();
        if (entry) {
          promises.push(readEntry(entry, files));
        } else {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
    }

    await Promise.all(promises);
    handleFiles(files);
  }

  async function readEntry(entry, files) {
    if (entry.isFile) {
      await new Promise(resolve => {
        entry.file(f => { files.push(f); resolve(); }, resolve);
      });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      await new Promise(resolve => {
        const readBatch = () => {
          reader.readEntries(async entries => {
            if (!entries.length) { resolve(); return; }
            await Promise.all(entries.map(e => readEntry(e, files)));
            readBatch();
          }, resolve);
        };
        readBatch();
      });
    }
  }

  /* ─── 处理 FileList ─── */
  function processFiles(fileList) {
    const files = Array.from(fileList);
    handleFiles(files);
  }

  /* ─── 核心：分析文件并渲染 ─── */
  function handleFiles(files) {
    if (!files.length) return;

    // 存入全局状态
    AppState.uploadedFiles = files;

    // 显示解析结果面板
    document.getElementById('parseResult').style.display = '';
    document.getElementById('skillMetaCard').style.display = '';

    renderFileTree(files);
    renderFileTypeChart(files);
    renderDirectionInference(files);
    renderPreview(files);

    // 更新上传区样式
    const zone = document.getElementById('uploadZone');
    zone.style.borderStyle = 'solid';
    zone.style.borderColor = 'var(--primary)';
    zone.querySelector('.upload-title').textContent = `已上传 ${files.length} 个文件`;
    zone.querySelector('.upload-hint').textContent = files.map(f => f.name).slice(0, 3).join(' · ') + (files.length > 3 ? `... 等` : '');
  }

  /* ─── 文件树渲染 ─── */
  function renderFileTree(files) {
    const container = document.getElementById('fileTree');
    // 最多显示 30 个文件
    const shown = files.slice(0, 30);
    container.innerHTML = shown.map(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      const icon = FILE_ICONS[ext] || FILE_ICONS.other;
      const size = formatBytes(f.size);
      return `<div class="file-tree-item">
        <span class="file-icon">${icon}</span>
        <span class="file-name">${f.webkitRelativePath || f.name}</span>
        <span class="file-size">${size}</span>
      </div>`;
    }).join('');
    if (files.length > 30) {
      container.innerHTML += `<div class="file-tree-item" style="color:var(--text-tertiary)">... 还有 ${files.length - 30} 个文件</div>`;
    }
  }

  /* ─── 文件类型分布 ─── */
  function renderFileTypeChart(files) {
    const container = document.getElementById('fileTypeChart');
    const counts = {};
    files.forEach(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      const key = TYPE_COLORS[ext] ? ext : 'other';
      counts[key] = (counts[key] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const total = files.length;
    container.innerHTML = sorted.map(([ext, count]) => {
      const pct = Math.round(count / total * 100);
      const color = TYPE_COLORS[ext] || TYPE_COLORS.other;
      return `<div class="ft-bar-row">
        <span class="ft-label">.${ext}</span>
        <div class="ft-bar-track">
          <div class="ft-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="ft-count">${count}</span>
      </div>`;
    }).join('');
  }

  /* ─── 方向智能推断 ─── */
  function renderDirectionInference(files) {
    const container = document.getElementById('directionResult');
    const rules = DIR_RULES.map(r => ({ ...r, score: 0 }));

    files.forEach(f => {
      const name = (f.name + ' ' + (f.webkitRelativePath || '')).toLowerCase();
      rules.forEach(r => {
        r.keywords.forEach(kw => {
          if (name.includes(kw)) r.score += 1;
        });
      });
      // 文件扩展名额外加分
      const ext = f.name.split('.').pop().toLowerCase();
      if (['html','css','tsx','jsx'].includes(ext)) rules.find(r=>r.dir==='ui').score += 2;
      if (['png','jpg','svg','jpeg'].includes(ext)) rules.find(r=>r.dir==='img').score += 1;
      if (['mp4','webm','json'].includes(ext)) rules.find(r=>r.dir==='video').score += 1;
      if (['md','pptx','pdf'].includes(ext)) rules.find(r=>r.dir==='doc').score += 2;
    });

    const best = rules.reduce((a, b) => b.score > a.score ? b : a);
    const total = rules.reduce((s, r) => s + r.score, 0);
    const confidence = total > 0 ? Math.min(99, Math.round(best.score / total * 100)) : 0;

    // 更新方向选择器
    const dirSelect = document.getElementById('skillDirection');
    if (dirSelect && best.score > 0) {
      dirSelect.value = best.dir;
      AppState.direction = best.dir;
    }

    container.innerHTML = `
      <div class="direction-result-badge">${DIR_LABELS[best.dir] || '未知'}</div>
      <div class="direction-confidence">置信度 ${confidence}%${best.score === 0 ? '（无法推断，请手动选择）' : ''}</div>
      <div style="margin-top:8px;font-size:11px;color:var(--text-tertiary)">
        ${rules.filter(r => r.score > 0).sort((a,b)=>b.score-a.score).map(r =>
          `<span style="margin-right:8px">${DIR_LABELS[r.dir]?.split(' ')[0]} ${r.score}分</span>`
        ).join('')}
      </div>`;
  }

  /* ─── HTML 预览 ─── */
  function renderPreview(files) {
    const htmlFile = files.find(f => f.name.toLowerCase().endsWith('.html'));
    if (!htmlFile) return;

    document.getElementById('previewCard').style.display = '';
    const reader = new FileReader();
    reader.onload = e => {
      const frame = document.getElementById('previewFrame');
      frame.srcdoc = e.target.result;
    };
    reader.readAsText(htmlFile);
  }

  /* ─── 工具函数 ─── */
  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }

  return { init, handleFiles };
})();
