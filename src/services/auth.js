import { store } from './storage';

const SUPABASE_URL = "https://attbpsintsvbzgkjacby.supabase.co";
const SUPABASE_KEY = "sb_publishable_H64WUt66keAHJsS8DJr-aQ_yUs7bLZu";
export const SESSION_KEY = "gpm:session";

export const supabaseAuth = {
  _headers(token) {
    const h = { "apikey": SUPABASE_KEY, "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  },
  async signUp(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST", headers: this._headers(), body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || data.message || "signup failed");
    return data;
  },
  async signIn(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST", headers: this._headers(), body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || data.message || "invalid credentials");
    return data; // { access_token, refresh_token, expires_in, user, ... }
  },
  async signOut(token) {
    try { await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: this._headers(token) }); } catch {}
  },
  async getUser(token) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { method: "GET", headers: this._headers(token) });
    if (!res.ok) return null;
    return res.json();
  },
  async refresh(refreshToken) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST", headers: this._headers(), body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    return res.json();
  },
  async saveSession(data) {
    await store.set(SESSION_KEY, {
      access_token: data.access_token, refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    });
  },
  async loadSession() {
    const s = await store.get(SESSION_KEY);
    if (!s) return null;
    // if expired, try refresh
    if (Date.now() > (s.expires_at || 0) - 60000) {
      if (!s.refresh_token) return null;
      const refreshed = await this.refresh(s.refresh_token);
      if (!refreshed || !refreshed.access_token) { await store.del(SESSION_KEY); return null; }
      await this.saveSession(refreshed);
      return refreshed;
    }
    // validate token still works
    const user = await this.getUser(s.access_token);
    if (!user) { await store.del(SESSION_KEY); return null; }
    return { ...s, user };
  },
  async clearSession() { await store.del(SESSION_KEY); },
};
