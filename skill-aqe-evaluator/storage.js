/* ═══════════════════════════════════════════
   storage.js · 历史记录持久化（精简版）
═══════════════════════════════════════════ */

const Storage = (() => {
  const KEY = 'aqe_records';

  function getAll() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch { return []; }
  }

  function save(record) {
    const list = getAll();
    list.unshift(record);
    // 保留最多 50 条
    if (list.length > 50) list.splice(50);
    localStorage.setItem(KEY, JSON.stringify(list));
    return record;
  }

  function deleteOne(id) {
    const list = getAll().filter(r => r.id !== id);
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function clearAll() {
    localStorage.removeItem(KEY);
  }

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  return { getAll, save, deleteOne, clearAll, genId };
})();
