# luzifeng · 在线预览合集

> 把 HTML 文件推送到这里，立刻变成永久在线网址，随时发给同事预览。
>
> 🌐 **首页**：https://luzifeng999-arch.github.io/online-sites/

---

## 📦 项目列表

| 项目 | 在线地址 | 类型 |
|------|----------|------|
| 模式广场 v2 | [/online-sites/prompt-plaza-v2/viewer.html](https://luzifeng999-arch.github.io/online-sites/prompt-plaza-v2/viewer.html) | UI 原型 |

---

## 📐 URL 规则

GitHub Pages 会把仓库里每个文件直接映射成网址：

```
仓库文件路径                      →  在线 URL
─────────────────────────────────────────────────────────────
index.html                        →  .../online-sites/           （导航首页）
项目名.html                       →  .../online-sites/项目名.html
项目名/index.html（或viewer.html）  →  .../online-sites/项目名/
项目名/page-01.html               →  .../online-sites/项目名/page-01.html
```

**规则很简单：文件放哪里，URL 就是哪里。**

---

## 🚀 上传新项目（三步）

### 单页 HTML

```bash
# 把 my-page.html 复制到仓库根目录
git add my-page.html
git commit -m "add: my-page"
git push
```

在线地址：`https://luzifeng999-arch.github.io/online-sites/my-page.html`

---

### 多页 HTML（有 viewer/多个页面）

```bash
# 建文件夹，放入所有 html 文件
mkdir my-project
# 把文件复制进去，入口命名为 index.html 或 viewer.html

git add my-project/
git commit -m "add: my-project"
git push
```

在线地址：`https://luzifeng999-arch.github.io/online-sites/my-project/`

---

### 更新导航首页（可选）

在 `index.html` 的 `#grid` 区域复制一张卡片，填写项目信息，这样同事可以从首页点击进入：

```html
<a class="card c-blue" href="my-project/" target="_blank">
  <div class="card-row">
    <div class="icon i-blue">🎨</div>
    <span class="pill pill-new">NEW</span>
  </div>
  <div class="card-title">项目名称</div>
  <div class="card-desc">一句话介绍</div>
  <div class="card-foot">
    <div class="card-tags"><span class="tag">类型</span></div>
    <span class="arrow">↗</span>
  </div>
</a>
```

颜色可选：`c-purple` / `c-blue` / `c-green` / `c-orange` / `c-pink` / `c-teal`

---

## 🗂️ 仓库目录结构

```
online-sites/
├── index.html              ← 导航首页（所有项目入口）
├── README.md               ← 本文件
│
├── prompt-plaza-v2/        ← 模式广场 v2 原型
│   ├── viewer.html
│   ├── page-01-home.html
│   └── ...
│
├── 你的下一个项目/           ← 直接新建文件夹放进来
│   └── index.html
│
└── 单页项目.html            ← 或者直接放根目录
```

---

## ⚙️ GitHub Pages 配置

Settings → Pages → Source: **Deploy from a branch → main → / (root)**

推送后约 **1 分钟**自动部署完成。

---

👨‍💻 **luzifeng**
