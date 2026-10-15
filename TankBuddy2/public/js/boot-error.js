// Shows startup failures on screen (otherwise a failed module import leaves a blank themed page).
const show = (m) => {
  if (document.getElementById('boot-error')) return;
  const d = document.createElement('div'); d.id = 'boot-error';
  d.style.cssText = 'position:fixed;inset:auto 0 0 0;z-index:99999;padding:12px;background:#7f1d1d;color:#fff;font:13px monospace;white-space:pre-wrap';
  d.textContent = 'Startfout: ' + m; document.body.appendChild(d);
};
addEventListener('error', (e) => show(e.message + (e.filename ? ' @ ' + e.filename.split('/').pop() + ':' + e.lineno : '')));
addEventListener('unhandledrejection', (e) => show(String(e.reason && (e.reason.message || e.reason))));
setTimeout(() => { const a = document.getElementById('auth'), p = document.getElementById('app'); if (a && p && a.hidden && p.hidden) show('app startte niet (geen login/app zichtbaar)'); }, 8000);
