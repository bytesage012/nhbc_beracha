import { CONFIG, configured } from './config.js';
export { configured };
export async function dbFetch(path, {method='GET', token, body, headers={}}={}) {
  if (!configured()) throw new Error('Supabase has not been configured. See README.md.');
  const response = await fetch(`${CONFIG.supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: CONFIG.supabaseAnonKey,
      Authorization: `Bearer ${token || CONFIG.supabaseAnonKey}`,
      ...(body === undefined ? {} : {'Content-Type':'application/json'}),
      ...headers
    },
    ...(body === undefined ? {} : {body:JSON.stringify(body)})
  });
  if (!response.ok) {
    let message = `Database request failed (${response.status})`;
    try { const result=await response.json(); message=result.message || result.error_description || message; } catch {}
    throw new Error(message);
  }
  return response.status===204 ? null : response.json();
}
export async function readStream() {
  const rows = await dbFetch('livestream?id=eq.1&select=id,video_id,status,announcement,updated_at');
  return rows[0] || null;
}
export function cleanVideoId(input) {
  const raw=String(input||'').trim();
  if (!raw) return null;
  if (/^[\w-]{11}$/.test(raw)) return raw;
  try {
    const u=new URL(raw);
    const host=u.hostname.toLowerCase();
    if (host==='youtu.be' || host==='www.youtu.be') {
      const id=u.pathname.split('/').filter(Boolean)[0];
      return /^[\w-]{11}$/.test(id||'') ? id : null;
    }
    if (!['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host)) return null;
    let id=u.searchParams.get('v');
    if (!id) {
      const parts=u.pathname.split('/').filter(Boolean);
      if (['live','embed','shorts'].includes(parts[0])) id=parts[1];
    }
    return /^[\w-]{11}$/.test(id||'') ? id : null;
  } catch {return null;}
}
export function playerUrl(id, autoplay=false) {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&playsinline=1${autoplay?'&autoplay=1':''}`;
}
