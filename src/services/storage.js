export const store = {
  async get(key, fallback = null) {
    try {
      if (typeof window.storage !== 'undefined') {
        const r = await window.storage.get(key);
        if (!r) return fallback;
        try { return JSON.parse(r.value); } catch { return r.value; }
      } else {
        const r = localStorage.getItem(key);
        if (!r) return fallback;
        try { return JSON.parse(r); } catch { return r; }
      }
    } catch { return fallback; }
  },
  async set(key, value) {
    try {
      const val = typeof value === "string" ? value : JSON.stringify(value);
      if (typeof window.storage !== 'undefined') {
        await window.storage.set(key, val);
      } else {
        localStorage.setItem(key, val);
      }
      return true;
    } catch { return false; }
  },
  async del(key) {
    try {
      if (typeof window.storage !== 'undefined') {
        await window.storage.delete(key);
      } else {
        localStorage.removeItem(key);
      }
      return true;
    } catch { return false; }
  },
};
