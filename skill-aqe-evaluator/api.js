/* ═══════════════════════════════════════════
   api.js · 内置 Wanqing API 配置
   内网接口：Authorization: Bearer
═══════════════════════════════════════════ */

const ApiService = (() => {

  /* ─── 内置配置（不需要用户手动填写）─── */
  const BUILTIN_CONFIG = {
    apiKey:   'k0h3hn2v5rrobqodhr3zpwwmrhors9yn6xtc',
    baseUrl:  'https://wanqing-api.corp.kuaishou.com/api/gateway/v1',
    model:    'ep-yi4t2l-1775115584174507438',
    autoAnalyze: true
  };

  /* ─── 连接状态 ─── */
  let _status = 'unknown'; // 'unknown' | 'online' | 'offline'

  function getStatus() { return _status; }

  function setStatus(s) {
    _status = s;
    updateStatusUI(s);
  }

  function updateStatusUI(s) {
    const dot  = document.getElementById('apiStatusDot');
    const text = document.getElementById('apiStatusText');
    if (!dot || !text) return;

    const map = {
      unknown: { color: '#94A3B8', label: '检测中…',  title: '正在检测 API 连接' },
      online:  { color: '#16A34A', label: '已连接',    title: '内网 API 连接正常' },
      offline: { color: '#DC2626', label: '离线',      title: '无法连接内网 API，请确认在公司网络内' },
    };

    const cfg = map[s] || map.unknown;
    dot.style.background = cfg.color;
    dot.title = cfg.title;
    text.textContent = cfg.label;
    text.style.color = cfg.color;

    // 在线时做呼吸动画
    dot.classList.toggle('pulse', s === 'online');
  }

  /* ─── 获取有效配置（优先内置，再看 localStorage 覆盖）─── */
  function getConfig() {
    try {
      const stored = JSON.parse(localStorage.getItem('aqe_api_config') || '{}');
      return {
        apiKey:  stored.apiKey  || BUILTIN_CONFIG.apiKey,
        baseUrl: stored.baseUrl || BUILTIN_CONFIG.baseUrl,
        model:   stored.model   || BUILTIN_CONFIG.model,
        autoAnalyze: stored.autoAnalyze != null ? stored.autoAnalyze : BUILTIN_CONFIG.autoAnalyze
      };
    } catch { return { ...BUILTIN_CONFIG }; }
  }

  /* ─── 公共 fetch 封装 ─── */
  async function callApi(messages, maxTokens = 1024, systemPrompt = '') {
    const cfg = getConfig();
    const body = {
      model: cfg.model,
      max_tokens: maxTokens,
      messages
    };
    if (systemPrompt) body.system = systemPrompt;

    const res = await fetch(`${cfg.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    return res.json();
  }

  /* ─── 测试连接（轻量请求）─── */
  async function testConnection() {
    setStatus('unknown');
    try {
      await callApi([{ role: 'user', content: 'hi' }], 5);
      setStatus('online');
      return { success: true, message: '连接正常' };
    } catch (e) {
      setStatus('offline');
      return { success: false, message: e.message };
    }
  }

  /* ─── AQE 自动分析 ─── */
  const SYSTEM_PROMPT = `你是一位专业的 UI/UX 设计评审专家，精通 AQE（Aesthetic Quality Evaluation）美学质量评测体系。

AQE 包含 5 个维度：
- AQE-A（视觉层级与信息架构）：评估信息层次清晰度，字号对比，视觉动线
- AQE-B（色彩美学与情感调性）：评估色彩和谐度，饱和度，情感一致性
- AQE-C（版式规范与排版质量）：评估对齐规则，间距一致性（4px/8px体系），留白比例
- AQE-D（品牌一致性与风格稳定）：评估多次调用风格稳定性，品牌调性匹配
- AQE-E（可访问性基线）：文字对比度≥4.5:1（WCAG AA），颜色非唯一信息载体，交互状态

判定规则：PASS(≥7.5) / WATCH(7.0-7.4) / FAIL(<7.0或任一维度<6.0) / BLOCK(E<5.0强制阻断)

请严格返回 JSON，不要有任何额外文字。`;

  async function analyze({ direction, description, imageBase64 } = {}) {
    const dirMap = { ui:'UI生成', img:'图片生成', video:'视频动效', doc:'文档/PPT', eval:'评测' };

    const userContent = [];
    if (imageBase64) {
      userContent.push({ type:'image', source:{ type:'base64', media_type:'image/png', data: imageBase64 } });
    }
    userContent.push({ type:'text', text:
      `请对以下 Skill 进行 AQE 评测：\n方向：${dirMap[direction]||direction}\nSkill Description：${description||'（未提供）'}\n\n` +
      `严格返回如下 JSON 格式：\n{"scores":{"A":<1-10>,"B":<1-10>,"C":<1-10>,"D":<1-10>,"E":<1-10>},"analysis":{"A":"<100字分析>","B":"<100字>","C":"<100字>","D":"<100字>","E":"<100字>"},"failures":[{"dimension":"<如AQE-C2>","title":"<标题>","suggestion":"<可执行修复建议>","isBlock":<true/false>}],"summary":"<150字总评>"}`
    });

    try {
      const data = await callApi([{ role:'user', content: userContent }], 1200, SYSTEM_PROMPT);
      const text = data.content?.[0]?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { error:'PARSE_ERROR', message:'无法解析 AI 返回的 JSON' };
      return { success: true, data: JSON.parse(jsonMatch[0]) };
    } catch (e) {
      setStatus('offline');
      return { error:'API_ERROR', message: e.message };
    }
  }

  /* ─── Storage 兼容：getApiConfig / saveApiConfig ─── */
  function getApiConfig() { return getConfig(); }
  function saveApiConfig(cfg) {
    localStorage.setItem('aqe_api_config', JSON.stringify(cfg));
  }

  return { analyze, testConnection, getStatus, getConfig, getApiConfig, saveApiConfig };
})();

/* Storage 中 getApiConfig 代理到 ApiService */
if (typeof Storage !== 'undefined') {
  Storage.getApiConfig  = ApiService.getApiConfig;
  Storage.saveApiConfig = ApiService.saveApiConfig;
}
