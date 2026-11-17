// Notificaciones push (Web Push). Se activa desde un botón en el panel de cada usuario.
(function () {
  'use strict';
  var C = window.LANZEC_CONFIG || {};
  var ua = navigator.userAgent || '';
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  function b64ToU8(s) {
    var p = '='.repeat((4 - s.length % 4) % 4);
    var b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/'));
    var o = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) o[i] = b.charCodeAt(i);
    return o;
  }

  function card(html) {
    var main = document.querySelector('main');
    if (!main) return null;
    var el = document.getElementById('pushCard');
    if (!el) {
      el = document.createElement('section');
      el.id = 'pushCard';
      el.className = 'card';
      el.style.padding = '14px 18px';
      main.insertBefore(el, main.firstChild);
    }
    el.innerHTML = html;
    return el;
  }

  async function subscribe(sb) {
    var reg = await navigator.serviceWorker.register('sw.js');
    await navigator.serviceWorker.ready;
    var sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(C.VAPID_PUBLIC) });
    var j = sub.toJSON();
    var r = await sb.rpc('save_push_subscription', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth });
    if (r.error) throw r.error;
  }

  function showOn() {
    card('<span class="muted">🔔 Notificaciones activas en este dispositivo.</span>');
  }

  function showButton(sb, notice) {
    var el = card('<div class="split"><div><b>🔔 Activa las notificaciones</b><br><small class="muted">Recibe avisos al instante, aunque tengas la página cerrada.</small></div>' +
      '<button class="btn" id="pushBtn" type="button">Activar</button></div>');
    var b = el && el.querySelector('#pushBtn');
    if (!b) return;
    b.addEventListener('click', async function () {
      b.disabled = true;
      try {
        var perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          card('<span class="muted">🔕 Notificaciones bloqueadas. Actívalas en los permisos del sitio (candado junto a la dirección) y recarga la página.</span>');
          return;
        }
        await subscribe(sb);
        showOn();
        notice('Notificaciones activadas.');
      } catch (e) {
        console.error(e);
        b.disabled = false;
        notice('No se pudieron activar las notificaciones: ' + ((e && e.message) || e), true);
      }
    });
  }

  window.LanzecPush = {
    init: async function (sb, notice) {
      try {
        if (!C.VAPID_PUBLIC) return;
        if (!supported) {
          if (isIOS && !standalone) {
            card('<b>🔔 Notificaciones en iPhone</b><br><small class="muted">Abre esta página en Safari, toca Compartir → «Añadir a pantalla de inicio» y abre LANZEC desde ese ícono. Luego podrás activarlas.</small>');
          }
          return;
        }
        if (Notification.permission === 'granted') { await subscribe(sb); showOn(); }
        else if (Notification.permission === 'denied') card('<span class="muted">🔕 Notificaciones bloqueadas. Actívalas en los permisos del sitio y recarga la página.</span>');
        else showButton(sb, notice);
      } catch (e) { console.error('push init', e); }
    },
    // Al cerrar sesión: este dispositivo deja de recibir avisos de esa cuenta.
    leave: async function (sb) {
      try {
        if (!supported) return;
        var reg = await navigator.serviceWorker.getRegistration();
        var sub = reg && await reg.pushManager.getSubscription();
        if (sub) await sb.rpc('delete_push_subscription', { p_endpoint: sub.endpoint });
      } catch (e) { console.error(e); }
    }
  };
})();
