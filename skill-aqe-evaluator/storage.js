/* ═══════════════════════════════════════════
   storage.js · 历史记录持久化（localStorage）
═══════════════════════════════════════════ */

const Storage = (() => {
  const KEY = 'aqe_history_v2';
  const MAX = 50;

  function loadAll() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  }

  function saveAll(records) {
    localStorage.setItem(KEY, JSON.stringify(records));
  }

  function save(item) {
    const records = loadAll();
    const newItem = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2,7),
      createdAt: new Date().toLocaleString('zh-CN'),
      ...item
    };
    records.unshift(newItem);
    if (records.length > MAX) records.length = MAX;
    saveAll(records);
    return newItem;
  }

  function remove(id) {
    saveAll(loadAll().filter(r => r.id !== id));
  }

  function clearAll() {
    localStorage.removeItem(KEY);
  }

  function getById(id) {
    return loadAll().find(r => r.id === id) || null;
  }

  /* app.js 调用的别名 */
  function genId() {
    return Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }
  function list() { return loadAll(); }
  function clear() { return clearAll(); }

  return { loadAll, save, remove, clearAll, getById, genId, list, clear };
})();
