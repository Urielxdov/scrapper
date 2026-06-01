// public/interceptor.js
// Injected into proxied pages. Handles hover highlight, click-to-pin, postMessage to parent.
(function () {
  'use strict';

  // ─── CSS Selector Generator ──────────────────────────────────────────────────
  function escapeCSS(str) {
    return CSS.escape ? CSS.escape(str) : str.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, '\\$1');
  }

  function generateSelector(el) {
    if (el.id) return '#' + escapeCSS(el.id);

    const classes = Array.from(el.classList).filter(Boolean);
    for (const cls of classes) {
      const sel = '.' + escapeCSS(cls);
      try { if (document.querySelectorAll(sel).length === 1) return sel; } catch {}
    }

    if (classes.length > 0) {
      const sel = el.tagName.toLowerCase() + '.' + classes.map(escapeCSS).join('.');
      try { if (document.querySelectorAll(sel).length === 1) return sel; } catch {}
    }

    // Build nth-of-type path up to body
    const path = [];
    let current = el;
    while (current && current.tagName && current.tagName.toLowerCase() !== 'body') {
      if (current.id) { path.unshift('#' + escapeCSS(current.id)); break; }
      const tag = current.tagName.toLowerCase();
      const siblings = Array.from(current.parentNode ? current.parentNode.children : [])
        .filter(s => s.tagName === current.tagName);
      const selector = siblings.length > 1
        ? tag + ':nth-of-type(' + (siblings.indexOf(current) + 1) + ')'
        : tag;
      path.unshift(selector);
      current = current.parentNode;
    }
    return path.join(' > ');
  }

  // ─── Hover Highlight ─────────────────────────────────────────────────────────
  let hovered = null;
  const HIGHLIGHT_STYLE = '2px solid #3b82f6';

  document.addEventListener('mouseover', function (e) {
    if (hovered) hovered.style.outline = '';
    hovered = e.target;
    if (hovered && hovered !== document.body && hovered !== document.documentElement) {
      hovered.style.outline = HIGHLIGHT_STYLE;
    }
  }, true);

  document.addEventListener('mouseout', function (e) {
    if (e.target === hovered) {
      hovered.style.outline = '';
      hovered = null;
    }
  }, true);

  // ─── Popup ───────────────────────────────────────────────────────────────────
  let popup = null;

  function removePopup() {
    if (popup) { popup.remove(); popup = null; }
  }

  function showPopup(x, y, css) {
    removePopup();
    popup = document.createElement('div');
    popup.id = '__scrapper_popup';
    popup.style.cssText = [
      'position:fixed',
      'top:' + Math.min(y, window.innerHeight - 160) + 'px',
      'left:' + Math.min(x, window.innerWidth - 230) + 'px',
      'background:#fff',
      'border:1px solid #e5e7eb',
      'border-radius:8px',
      'padding:12px',
      'box-shadow:0 4px 12px rgba(0,0,0,.15)',
      'z-index:2147483647',
      'font-family:system-ui,sans-serif',
      'font-size:13px',
      'min-width:220px',
      'box-sizing:border-box',
    ].join(';');

    popup.innerHTML =
      '<div style="margin-bottom:6px;color:#374151;font-weight:600;">Nombre del campo</div>' +
      '<input id="__scrapper_input" type="text" placeholder="ej. precio" autocomplete="off" style="' +
        'width:100%;border:1px solid #d1d5db;border-radius:4px;padding:6px 8px;' +
        'outline:none;box-sizing:border-box;font-size:13px;' +
      '" />' +
      '<div style="margin-top:8px;display:flex;gap:6px;justify-content:flex-end;">' +
        '<button id="__scrapper_cancel" style="padding:4px 10px;border:1px solid #d1d5db;border-radius:4px;background:#fff;cursor:pointer;font-size:12px;">Cancelar</button>' +
        '<button id="__scrapper_add" style="padding:4px 10px;background:#3b82f6;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Agregar</button>' +
      '</div>';

    document.body.appendChild(popup);

    var input = popup.querySelector('#__scrapper_input');
    input.focus();

    popup.querySelector('#__scrapper_cancel').addEventListener('click', removePopup);

    popup.querySelector('#__scrapper_add').addEventListener('click', function () {
      var label = input.value.trim();
      if (!label) { input.focus(); return; }
      window.parent.postMessage({ type: 'PIN_ADDED', label: label, css: css }, '*');
      removePopup();
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') popup.querySelector('#__scrapper_add').click();
      if (e.key === 'Escape') removePopup();
    });
  }

  // ─── Click Handler ───────────────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    // Clicks inside our popup bubble normally
    if (popup && popup.contains(e.target)) return;

    e.preventDefault();
    e.stopPropagation();

    if (hovered) hovered.style.outline = '';
    hovered = null;

    var css = generateSelector(e.target);
    showPopup(e.clientX + 8, e.clientY + 8, css);
  }, true);

  // Block all link navigation
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a') : null;
    if (a) e.preventDefault();
  }, true);

  // Close popup on Escape globally
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') removePopup();
  });
})();
