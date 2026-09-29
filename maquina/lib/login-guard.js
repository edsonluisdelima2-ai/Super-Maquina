'use strict';
/* Bloqueio de tentativas de senha.
   Conta erros por origem numa janela de tempo. Ao atingir o limite, bloqueia o login por um tempo que
   dobra a cada novo bloqueio (até um teto). Enquanto bloqueado, nem a senha correta é aceita.
   O estado fica em memória: reiniciar o programa zera os contadores (quem já reinicia o programa no seu
   próprio computador também poderia redefinir a senha pelo REDEFINIR_SENHA_ADMIN.bat). */
function createLoginGuard({ max = 5, windowMs = 15 * 60e3, lockMs = 15 * 60e3, maxLockMs = 24 * 3600e3, now = () => Date.now() } = {}) {
  const map = new Map();
  const secs = ms => Math.max(1, Math.ceil(ms / 1000));
  function prune(t) {
    // o histórico de bloqueios só é esquecido depois de uma janela inteira sem erros nem bloqueio
    for (const [k, r] of map) if (r.lockedUntil + windowMs <= t && r.fails.every(x => t - x >= windowMs)) map.delete(k);
  }
  function check(key) {
    const r = map.get(key), t = now();
    return r && r.lockedUntil > t ? { locked: true, retryAfter: secs(r.lockedUntil - t) } : { locked: false };
  }
  function fail(key) {
    const t = now();
    prune(t);
    let r = map.get(key);
    if (!r) { r = { fails: [], lockedUntil: 0, locks: 0 }; map.set(key, r); }
    r.fails = r.fails.filter(x => t - x < windowMs);
    r.fails.push(t);
    if (r.fails.length >= max) {
      r.locks++;
      const d = Math.min(maxLockMs, lockMs * 2 ** (r.locks - 1));
      r.lockedUntil = t + d;
      r.fails = [];
      return { locked: true, retryAfter: secs(d) };
    }
    return { locked: false, remaining: max - r.fails.length };
  }
  const success = key => { map.delete(key); };
  return { check, fail, success, size: () => map.size };
}
const waitText = s => s >= 3600 ? `${Math.ceil(s / 3600)} hora(s)` : s >= 60 ? `${Math.ceil(s / 60)} minuto(s)` : `${s} segundo(s)`;
module.exports = { createLoginGuard, waitText };
