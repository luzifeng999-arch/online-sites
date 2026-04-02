/* ═══════════════════════════════════════════
   storage.js · Known Failures 持久化管理
   使用 localStorage 存储评测历史
═══════════════════════════════════════════ */

const Storage = (() => {
  const KEY_SESSIONS = 'aqe_sessions';
  const KEY_API_CONFIG = 'aqe_api_config';

  /* ─── 评测会话 CRUD ─── */
  function getSessions() {
    try {
      return JSON.parse(localStorage.getItem(KEY_SESSIONS) || '[]');
    } catch { return []; }
  }

  function saveSession(session) {
    const sessions = getSessions();
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.unshift(session); // 最新的排前面
    }
    localStorage.setItem(KEY_SESSIONS, JSON.stringify(sessions));
    return session;
  }

  function deleteSession(id) {
    const sessions = getSessions().filter(s => s.id !== id);
    localStorage.setItem(KEY_SESSIONS, JSON.stringify(sessions));
  }

  function clearAllSessions() {
    localStorage.removeItem(KEY_SESSIONS);
  }

  function getSession(id) {
    return getSessions().find(s => s.id === id) || null;
  }

  /* ─── 筛选 ─── */
  function filterSessions({ direction, dimension, verdict } = {}) {
    let list = getSessions();
    if (direction) list = list.filter(s => s.direction === direction);
    if (verdict)   list = list.filter(s => s.scores?.verdict === verdict);
    if (dimension) list = list.filter(s =>
      s.failures?.some(f => f.dimension?.startsWith('AQE-' + dimension))
    );
    return list;
  }

  /* ─── 统计 ─── */
  function getStats() {
    const sessions = getSessions();
    const total = sessions.length;
    const byVerdict = { PASS: 0, WATCH: 0, FAIL: 0, BLOCK: 0 };
    const avgScores = { A: [], B: [], C: [], D: [], E: [], composite: [] };

    sessions.forEach(s => {
      if (s.scores?.verdict) byVerdict[s.scores.verdict] = (byVerdict[s.scores.verdict] || 0) + 1;
      if (s.scores) {
        ['A','B','C','D','E'].forEach(d => {
          if (s.scores[d] != null) avgScores[d].push(s.scores[d]);
        });
        if (s.scores.composite != null) avgScores.composite.push(s.scores.composite);
      }
    });

    const avg = obj => {
      const arr = obj.filter(n => !isNaN(n));
      return arr.length ? (arr.reduce((a,b) => a+b, 0) / arr.length).toFixed(1) : '—';
    };

    return {
      total,
      byVerdict,
      avgDim: {
        A: avg(avgScores.A),
        B: avg(avgScores.B),
        C: avg(avgScores.C),
        D: avg(avgScores.D),
        E: avg(avgScores.E),
      },
      avgComposite: avg(avgScores.composite),
      trend: sessions.slice(0, 12).reverse().map(s => ({
        date: s.date,
        score: s.scores?.composite,
        verdict: s.scores?.verdict,
        name: s.skillName
      }))
    };
  }

  /* ─── API 配置 ─── */
  function getApiConfig() {
    try {
      return JSON.parse(localStorage.getItem(KEY_API_CONFIG) || '{}');
    } catch { return {}; }
  }

  function saveApiConfig(config) {
    localStorage.setItem(KEY_API_CONFIG, JSON.stringify(config));
  }

  /* ─── 生成唯一 ID ─── */
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  return {
    getSessions, saveSession, deleteSession, clearAllSessions, getSession,
    filterSessions, getStats, getApiConfig, saveApiConfig, generateId
  };
})();
