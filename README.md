# 模式广场 — AI Prompt 模板市场 · UI 原型

> **Purple Creative** 设计系统 · PC 端高保真交互原型

---

## 📋 项目概览

**模式广场**是一个 AI Prompt 模板发现、分享与调用平台的 PC 端 UI 原型，包含 5 个核心页面，覆盖用户从浏览模板、查看详情、在线调用到发布管理的完整流程。

### 核心功能

- 🏠 **广场首页** — Hero 区 + 分类筛选 + 模板卡片网格 + 搜索排序
- 📄 **模板详情** — Prompt 预览 + 作者信息 + 评论互动 + 相关推荐
- ⚡ **在线调用** — 变量填写表单 + 实时预览 + 一键复制/发送到 ChatGPT
- 🚀 **发布模板** — 3 步向导（基本信息 → 编写 Prompt → 预览发布）
- 👤 **个人中心** — Tab 切换（我发布的 / 我收藏的 / 使用历史）

---

## 🎨 设计规范

### Purple Creative 设计系统

| 规范项       | 规范值                                      |
| ------------ | ------------------------------------------- |
| **主色**     | `#A855F7` (Purple 500)                      |
| **主字体**   | DM Sans (400/500/600/700/800)               |
| **等宽字体** | JetBrains Mono (用于 Prompt 代码块)         |
| **圆角系统** | XS:4px / SM:6px / MD:10px / LG:14px / XL:20px |
| **间距系统** | 1:4px / 2:8px / 3:12px / 4:16px / 5:20px / 6:24px / 8:32px |
| **配色方案** | 中性灰底 + 紫色点缀（避免全紫色过于浓烈）    |

### Design Tokens（所有页面共享）

```css
:root {
  --color-primary: #A855F7;
  --color-primary-hover: #9333EA;
  --color-primary-light: rgba(168,85,247,0.10);
  --color-bg: #FAFAFA;
  --color-surface: #FFFFFF;
  --color-surface-2: #F5F3FF;
  --color-border: #E9E4FB;
  --color-muted: #6B7280;
  --color-foreground: #18181B;
  --font-sans: 'DM Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  /* ... 更多 token 见源码 */
}
```

---

## 📁 文件结构

```
output/prompt-plaza-v2-prototype/
├── viewer.html                 # 🌟 统一预览入口（暗色沉浸式 Viewer）
├── page-01-home.html           # 广场首页
├── page-02-detail.html         # 模板详情页
├── page-03-playground.html     # 在线调用页
├── page-04-publish.html        # 发布模板页
├── page-05-profile.html        # 个人中心页
└── README.md                   # 本文档
```

**所有文件均为独立 HTML**，内含完整 CSS 和 JavaScript，无外部依赖，可直接用浏览器打开。

---

## 🚀 快速开始

### 方式 1：本地 HTTP 服务器（推荐）

```bash
# 进入项目目录
cd output/prompt-plaza-v2-prototype

# 启动 Python 内置服务器
python -m http.server 7780 --bind 127.0.0.1

# 访问 Viewer
# http://127.0.0.1:7780/viewer.html
```

### 方式 2：直接打开 HTML 文件

```bash
# 双击打开 viewer.html
# 或者在浏览器中拖入文件
```

> ⚠️ **注意**：部分浏览器（如 Chrome）可能因 CORS 限制无法加载 iframe，建议使用本地服务器方式。

---

## 🖥️ Viewer 使用指南

**Viewer** 是一个暗色沉浸式预览工具，提供以下功能：

### 功能特性

- ✨ **左侧导航** — 点击页面名称快速切换
- ⌨️ **键盘快捷键** — `← →` 方向键切换页面，`R` 刷新当前页面
- 🔗 **URL 栏** — 显示当前页面路径
- ↗️ **新标签打开** — 在新标签页中独立查看当前页面
- 📋 **复制链接** — 一键复制当前页面 URL

### 页面地图

| 序号 | 页面名称     | 文件名                  | 核心交互                                       |
| ---- | ------------ | ----------------------- | ---------------------------------------------- |
| 01   | 🏠 广场首页 | page-01-home.html       | 分类筛选、排序、搜索、收藏模板                 |
| 02   | 📄 模板详情 | page-02-detail.html     | 复制 Prompt、收藏、发表评论、分享              |
| 03   | ⚡ 在线调用 | page-03-playground.html | 填写变量、实时预览、复制/发送到 ChatGPT        |
| 04   | 🚀 发布模板 | page-04-publish.html    | 3 步向导、变量自动识别、预览效果               |
| 05   | 👤 个人中心 | page-05-profile.html    | Tab 切换、编辑/删除模板、查看历史              |

---

## 💡 交互细节亮点

### 1. 实时预览（在线调用页）

- 左侧填写变量，右侧实时渲染完整 Prompt
- 已填写变量显示为**紫色高亮**，未填写显示为**虚线占位符**
- 填写进度条实时更新
- 支持一键复制完整 Prompt 或发送到 ChatGPT

### 2. 变量自动识别（发布模板页）

- 在 Prompt 编辑器中输入 `{{变量名}}` 语法
- 系统自动提取所有变量并生成可视化列表
- 为每个变量设置提示文字
- 快速插入常用变量按钮

### 3. 步骤向导（发布模板页）

- 3 步线性流程：基本信息 → 编写 Prompt → 预览发布
- 右侧实时小预览，随填写内容同步更新
- 步骤指示器显示当前进度
- 发布成功后弹出确认弹窗

### 4. 状态管理（个人中心）

- 模板状态标签：已上线 🟢 / 审核中 🟡 / 草稿 ⚪
- 悬浮显示操作按钮：编辑 / 分享 / 删除
- 删除前弹出二次确认弹窗
- Tab 切换平滑动画

### 5. Toast 通知系统

- 全局统一 Toast 组件
- 支持成功 / 错误 / 普通三种状态
- 从右侧滑入，自动消失
- Spring 弹性动画

---

## 🔧 技术实现

### 核心技术栈

- **HTML5** — 语义化标签，无障碍支持（aria-\*）
- **CSS3** — Design Tokens + CSS 变量 + Flexbox/Grid 布局
- **Vanilla JavaScript** — 无框架依赖，纯原生 JS 实现所有交互
- **Google Fonts** — DM Sans + JetBrains Mono

### 关键实现

#### 1. 实时预览变量替换

```javascript
const TEMPLATE = `你是{{角色}}，请完成{{任务}}...`;

function updatePreview() {
  let result = TEMPLATE;
  for (const [varName, elId] of Object.entries(VAR_IDS)) {
    const val = document.getElementById(elId)?.value?.trim() || '';
    const re = new RegExp(`\\{\\{${varName}\\}\\}`, 'g');
    result = result.replace(re, val || `{{${varName}}}`);
  }
  // 渲染高亮
  const highlighted = result.replace(
    /\{\{([^}]+)\}\}/g,
    '<span class="preview-var-empty">{{$1}}</span>'
  );
  previewEl.innerHTML = highlighted;
}
```

#### 2. 变量自动提取

```javascript
function extractVars() {
  const content = document.getElementById('prompt-editor').value;
  const regex = /\{\{([^}]+)\}\}/g;
  const found = new Set();
  let m;
  while ((m = regex.exec(content)) !== null) found.add(m[1]);
  const vars = [...found];
  // 生成变量列表 UI
  renderVarList(vars);
}
```

#### 3. Toast 通知

```javascript
function showToast(msg, type = '', dur = 2400) {
  const colors = { success: '#10B981', error: '#EF4444', '': '#18181B' };
  const t = document.createElement('div');
  t.style.cssText = `background:${colors[type]};color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:500;box-shadow:0 4px 16px rgba(0,0,0,0.15);transform:translateX(120%);transition:transform 0.28s cubic-bezier(0.34,1.56,0.64,1);`;
  t.textContent = msg;
  document.getElementById('toast-ct').appendChild(t);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      t.style.transform = 'translateX(0)';
    })
  );
  setTimeout(() => {
    t.style.transform = 'translateX(120%)';
    setTimeout(() => t.remove(), 300);
  }, dur);
}
```

---

## 📊 原型数据

### 模拟数据量

- 模板总数：**5,238** 个
- 用户数：**128K** 月活
- 使用次数：**2.4M** 月调用
- 贡献者：**12K** 人

### 模拟分类

- ✍️ 写作创作：1,842 个模板
- 🎨 设计创意：763 个
- 💻 编程开发：1,124 个
- 📣 营销推广：589 个
- 📊 数据分析：412 个
- 📚 教育学习：308 个
- 💼 商业策划：200 个

---

## 🎯 用户流程

### 主流程 1：浏览与使用模板

1. 用户进入**广场首页**，浏览热门模板或使用搜索/筛选功能
2. 点击感兴趣的模板卡片，进入**模板详情页**
3. 查看 Prompt 内容、作者信息、用户评论
4. 点击「立即使用」，进入**在线调用页**
5. 填写变量，实时预览完整 Prompt
6. 点击「复制 Prompt」或「发送到 ChatGPT」

### 主流程 2：发布模板

1. 用户点击顶部「发布模板」按钮，进入**发布模板页**
2. **步骤 1**：填写模板名称、分类、简介、标签，选择封面
3. **步骤 2**：在编辑器中编写 Prompt 模板，使用 `{{变量}}` 语法
4. 系统自动提取变量，用户为每个变量设置提示文字
5. **步骤 3**：预览卡片效果，确认无误后点击「发布」
6. 发布成功，跳转到**个人中心**查看管理

### 主流程 3：管理我的模板

1. 用户进入**个人中心页**
2. 默认显示「我发布的」Tab，查看所有发布的模板
3. 悬浮模板卡片，显示「编辑 / 分享 / 删除」按钮
4. 切换到「我收藏的」Tab，查看收藏的模板
5. 切换到「使用历史」Tab，查看最近 30 天的使用记录

---

## 🌈 设计哲学

### 1. 紫色点缀，而非紫色主导

**问题**：纯紫色背景容易造成视觉疲劳，可读性差。

**解决方案**：
- 背景和表面使用中性灰色（#FAFAFA、#FFFFFF）
- 紫色仅用于主要按钮、链接、选中状态、品牌标识
- 紫色辅助色用于 Hover 状态和强调元素

### 2. 代码块深色模式

Prompt 内容使用深色背景 + 语法高亮，模拟代码编辑器体验：

```css
.prompt-code {
  background: var(--color-foreground); /* #18181B 深灰近黑 */
  color: rgba(255,255,255,0.88);
  font-family: var(--font-mono);
}
.prompt-var { color: #C084FC; } /* 紫色变量 */
.prompt-keyword { color: #67E8F9; } /* 青色关键词 */
```

### 3. 卡片悬浮交互

所有卡片支持悬浮效果：
- `transform: translateY(-2px)` — 轻微上浮
- 边框颜色从灰色变为紫色
- 阴影增强
- Prompt 预览卡片内的收藏按钮仅在悬浮时显示

### 4. 弹性动画

使用 `cubic-bezier(0.34,1.56,0.64,1)` 缓动函数，产生轻微"弹簧"效果，提升交互愉悦感。

---

## 🔍 浏览器兼容性

### 推荐浏览器

- ✅ Chrome 90+
- ✅ Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+

### 不支持特性

- ❌ IE 11 及以下（不支持 CSS 变量、Flexbox Grid）

---

## 📝 更新日志

### v2.0.0 (2026-03-31)

- ✨ 完整 5 页原型发布
- 🎨 Purple Creative 设计系统
- ⚡ 实时预览与变量自动识别
- 🚀 3 步向导发布流程
- 👤 个人中心 Tab 切换管理
- 🌙 暗色沉浸式 Viewer

---

## 📄 许可证

本原型仅供**学习与演示**使用，不得用于商业用途。

---

## 👨‍💻 作者

**luzifeng** — 产品经理 · 专注 AI 提效工具

如有问题或建议，欢迎反馈！

---

**🎉 感谢使用本原型！**
