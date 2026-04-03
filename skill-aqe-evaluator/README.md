# AQE Evaluator · Skill 评测专家

> **用 Skill 评测 Skill** — 基于官方 AQE 标准，对设计类 AI Skill 执行 SQE-5 工程评测 + AQE 美学评测，自动输出精美 HTML 评测报告。

---

## 快速开始

### 方式一：直接在浏览器中使用

用浏览器打开 `index.html`，填写被测 Skill 的信息，点击「开始 AQE 评测」。

```
skill-aqe-evaluator/
└── index.html   ← 直接用浏览器打开
```

### 方式二：作为 Skill 调用（AI Agent）

在 AI Agent 中引用本 Skill，触发词示例：

- "帮我评测这个 UI 生成 Skill"
- "对 `ks-design-slide-deck` 做 AQE 评测"
- "这个 Skill 能过 Gate 2 吗"
- "生成 AQE 评测报告"

---

## 项目结构

```
skill-aqe-evaluator/
├── SKILL.md                    # Skill 描述（触发词、输入输出、评分逻辑）
├── README.md                   # 本文档
├── index.html                  # 本地调试 Web UI
├── style.css                   # Web UI 样式
├── app.js                      # 前端流程控制器（状态机）
├── api.js                      # 核心评测引擎（SQE-5 + AQE）
├── storage.js                  # 历史记录持久化（localStorage）
├── radar-chart.js              # SVG 雷达图组件
├── prompt/
│   ├── system.md               # AI 核心评测系统提示词（SQE-5 + AQE 全规则）
│   ├── aqe-ui.md               # DIR-01 UI 生成专属 Checklist
│   ├── aqe-img.md              # DIR-02 图片生成专属 Checklist
│   ├── aqe-video.md            # DIR-03 视频动效专属 Checklist
│   ├── aqe-doc.md              # DIR-04 文档/PPT 专属 Checklist
│   └── aqe-eval.md             # DIR-05 评测类专属 Checklist
└── report-template/
    └── template.html           # 独立精美 HTML 报告模板（雷达图 + 双轨评分）
```

---

## 评测标准

本工具实现官方 **双轨评测体系**：

### Gate 1：SQE-5 工程质量评测

| 维度 | 说明 | 过关线 |
|------|------|--------|
| D1 触发准确率 | 测试 Prompt 能否稳定触发 Skill | ≥ 8.0 |
| D2 意图理解 | 是否准确理解用户意图（含隐含需求） | ≥ 8.0 |
| D3 产出质量 | 输出是否完整可用，零严重错误 | ≥ 8.0 |
| D4 边界处理 | 异常/模糊输入是否优雅降级 | ≥ 8.0 |
| D5 文档规范 | SKILL.md 是否完整规范 | ≥ 8.0 |

**SQE-5 综合分** = (D1+D2+D3+D4+D5) / 5，需 ≥ 8.0 进入 Gate 2。

---

### Gate 2：AQE 美学质量评测

| 维度 | 说明 | 强制阻断 |
|------|------|---------|
| A 视觉层级 | 字号梯度 ≥ 1.5x，F/Z 动线自然 | — |
| B 色彩美学 | 主色 ≤ 5 种，饱和度 30%-80% | — |
| C 版式规范 | 4/8px 体系，对齐，留白 ≥ 30% | — |
| D 品牌一致 | 同 Prompt 调 3 次风格差异可忽略 | — |
| E 可访问性 | 对比度 ≥ 4.5:1，颜色非唯一信息 | **E1/E2 < 5.0 → BLOCK** |

**AQE 综合分** = Σ（维度分 × 方向权重），需 ≥ 7.5 且无维度 < 6.0。

---

### 判定结果

| 判定 | 条件 | 处理 |
|------|------|------|
| ✅ PASS | SQE-5 ≥ 8.0 **且** AQE ≥ 7.5 **且** 无维度 < 6.0 | 允许上线 |
| 👀 WATCH | SQE-5 ≥ 8.0 **且** AQE 7.0–7.4 **且** 无维度 < 6.0 | 有条件上线，2周内修复 |
| ❌ FAIL | AQE < 7.0 **或** 任意维度 < 6.0 | 打回修改 |
| 🚫 BLOCK | AQE-E 子项 E1 或 E2 < 5.0 | 强制阻断，不可有条件上线 |
| ↩ 退回 | SQE-5 < 8.0 | 不进入 Gate 2，退回工程侧 |

---

## 五大 Skill 方向

| 方向代码 | 名称 | 典型示例 | A | B | C | D | E |
|---------|------|---------|---|---|---|---|---|
| DIR-01 | UI 生成 | 界面、Dashboard、落地页 | 30% | 25% | 25% | 10% | 10% |
| DIR-02 | 图片生成 | 海报、Banner、插画 | 15% | 45% | 10% | 20% | 10% |
| DIR-03 | 视频动效 | CSS/Lottie 动效 | 10% | 35% | 10% | 35% | 10% |
| DIR-04 | 文档/PPT | 幻灯片、报告、PDF | 25% | 15% | 35% | 15% | 10% |
| DIR-05 | 评测 | 评分报告、质量审查 | 0% | 25% | 0% | 45% | 30% |

---

## 使用方法（Web UI）

### 1. 输入被测 Skill 信息

| 字段 | 是否必填 | 说明 |
|------|---------|------|
| Skill 名称 | ✅ 必填 | 被测 Skill 的名称 |
| Skill 方向 | 可选 | 留空则自动推断（ui/img/video/doc/eval）|
| Skill 描述 | ✅ 必填 | 功能说明 / SKILL.md 内容，至少 20 字 |
| 输出样本 | 推荐提供 | 实际运行的 Prompt→输出 案例（1–3 个）|
| 竞品对比 | 高级选项 | 用于 D 维度品牌一致性评估 |
| 补充说明 | 高级选项 | 已知问题或特殊要求 |

### 2. 评测流程（全自动）

```
Step 1：解析 Skill 信息（识别方向、输入输出格式）
Step 2：构造测试用例（典型 / 边界 / 缺省输入场景）
Step 3：SQE-5 工程评测（D1/D2/D3/D4/D5 逐维度打分）
Step 4：AQE 美学评测（A/B/C/D/E 五维度打分，按方向加权）
Step 5：生成 HTML 评测报告（综合判定 + 雷达图 + 修复建议）
```

### 3. 评测报告内容

生成的 HTML 报告（自包含文件，无外部依赖）包含：

- **报告头部**：Skill 名称、方向、评测时间、判定徽章
- **双轨总分**：SQE-5 工程分 + AQE 设计综合分
- **AQE 雷达图**：5 维度 SVG 可视化
- **SQE-5 明细**：D1–D5 各分项得分 + 分析
- **AQE 各维度详情**：得分 + 失分子项 + 修复建议
- **方向专属 Checklist**：逐项 ✅/⚠️/❌
- **失分项汇总**：按严重程度排序，含具体修复操作
- **Known Failures**：本次发现的典型失败模式

### 4. 快捷操作

- **快速示例**：点击「🖥 UI 生成 Skill」「📄 PPT 生成 Skill」「🖼 图片生成 Skill」，一键填入示例数据
- **历史记录**：右上角「历史记录」按钮，可查看、加载、删除历史评测结果
- **导出报告**：评测完成后可下载 HTML 报告文件，或导出 JSON 数据
- **键盘快捷键**：`Ctrl+Enter` / `Cmd+Enter` 提交评测

---

## API 说明

### 连接模式

- **在线模式**：自动检测 Wanqing API 连通性（`https://api.wanqing.ai`），使用真实 AI 评测
- **离线演示模式**：API 不可用时，自动切换演示模式，生成模拟评测数据（演示用途）

顶栏的连接状态指示灯：
- 🟢 已连接 — 实时 AI 评测
- 🔴 离线·演示模式 — 模拟数据

### 核心接口（`api.js`）

```js
ApiService.evaluate(params)         // 执行完整双轨评测，返回 { ok, data }
ApiService.generateHtmlReport(data) // 根据评测数据生成 HTML 报告字符串
ApiService.checkStatus()            // 检测 API 连通性，返回 'online'|'offline'
ApiService.inferDirection(text)     // 从文本推断 Skill 方向
ApiService.DIRECTIONS               // 五大方向配置（含名称/权重/图标）
```

---

## 开发者参考

### 本地运行

直接用浏览器打开 `index.html` 即可（无需服务器），所有资源均为相对路径引用。

### 提示词定制

- 修改 `prompt/system.md` 调整 AI 评测规则
- 修改 `prompt/aqe-ui.md` 等调整各方向专属 Checklist
- 提示词仅供参考，实际调用由 `api.js` 中的 `buildEvalPrompt()` 组装

### 报告模板定制

修改 `report-template/template.html` 调整报告样式和结构（需同步更新 `api.js` 中的 `generateHtmlReport` 函数）。

---

## 已知限制

- 本工具为 **AI 辅助评测**（LLM-as-Judge），不能完全替代人工 Gate 2 审核
- 若无具体输出样本，评测基于描述推断，准确率约 70–80%
- 视频/动效方向建议提供帧截图（AI 无法处理视频文件）
- E1 对比度精确计算需要 HTML 源码或截图（纯描述仅提供近似估算）

---

## 相关资源

- [设计侧 Skill 美学与体验准入准出标准](https://huwenji1215-ai.github.io/skill-standards/skill-design-standard.html)
- `prompt/system.md` — 完整 AI 评测规则文档
- `report-template/template.html` — 报告 HTML 模板
