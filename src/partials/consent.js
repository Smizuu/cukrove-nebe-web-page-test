/* =====================================================================
   Cookie consent – Cukrové nebe
   Consent under § 89 odst. 3 zák. č. 127/2005 Sb. and čl. 4 bod 11, čl. 7 GDPR.

   - Nothing optional runs before a valid choice: optional scripts are written as a script element
     with type="text/plain", data-consent="analytics|marketing" and data-cookies="_ga,_ga_*"
     (their cookie names, so they can be deleted on withdrawal); this module executes them only
     after the matching category is granted. (No closing script tag in this comment: the file is
     inlined into an HTML script element.)
   - Categories: necessary (always on), analytics, marketing, maps (Google Maps embed).
     Optional categories are never pre-selected.
   - The choice + timestamp + version are stored in the first-party cookie "cn_consent"
     (mirrored to localStorage so it also works where cookies are blocked, e.g. file://).
   - Raise CONSENT_VERSION whenever a new tool or purpose is added: everyone is asked again.
   - Public API: window.CNConsent.{get, has, update, open, onChange}
   ===================================================================== */
(function () {
  "use strict";

  var KEY = "cn_consent";
  var CONSENT_VERSION = 1;
  var MAX_AGE_DAYS = 180;                       // how long a choice is kept before asking again
  var OPTIONAL = ["analytics", "marketing", "maps"];
  var LEGACY_COOKIES = ["cn_maps"];             // replaced by the "maps" category

  var state = null;
  var listeners = [];
  var lastFocus = null;

  /* ---------- storage ---------- */
  function readCookie(name) {
    try {
      var m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
      return m ? decodeURIComponent(m[1]) : null;
    } catch (e) { return null; }
  }
  function parse(raw) {
    if (!raw) return null;
    try {
      var s = JSON.parse(raw);
      if (!s || s.v !== CONSENT_VERSION || typeof s.ts !== "string") return null;
      var age = Date.now() - Date.parse(s.ts);
      if (!(age >= 0) || age > MAX_AGE_DAYS * 864e5) return null;   // expired or invalid → ask again
      var clean = { v: s.v, ts: s.ts, necessary: true };
      OPTIONAL.forEach(function (c) { clean[c] = s[c] === true; });
      return clean;
    } catch (e) { return null; }
  }
  /* the cookie is the record; localStorage is used only where cookies cannot be written
     (so clearing cookies in the browser also clears the consent) */
  var cookiesWork = (function () {
    try {
      document.cookie = "cn_t=1; path=/; SameSite=Lax";
      var ok = document.cookie.indexOf("cn_t=1") > -1;
      document.cookie = "cn_t=; max-age=0; path=/";
      return ok;
    } catch (e) { return false; }
  })();
  function load() {
    if (cookiesWork) {
      try { localStorage.removeItem(KEY); } catch (e) {}
      return parse(readCookie(KEY));
    }
    try { return parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }
  function persist(s) {
    var raw = JSON.stringify(s);
    if (cookiesWork) {
      document.cookie = KEY + "=" + encodeURIComponent(raw) + "; max-age=" + MAX_AGE_DAYS * 86400 +
        "; path=/; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
    } else {
      try { localStorage.setItem(KEY, raw); } catch (e) {}
    }
  }

  /* delete first-party cookies by name; a trailing * matches a prefix (e.g. "_ga_*") */
  function deleteCookies(patterns) {
    if (!patterns.length) return;
    var names = [];
    try { names = document.cookie.split("; ").map(function (c) { return c.split("=")[0]; }); } catch (e) { return; }
    var host = location.hostname, domains = ["", host];
    var parts = host.split(".");
    for (var i = 1; i < parts.length - 1; i++) domains.push("." + parts.slice(i).join("."));
    names.forEach(function (n) {
      var hit = patterns.some(function (p) { return p.slice(-1) === "*" ? n.indexOf(p.slice(0, -1)) === 0 : n === p; });
      if (!hit) return;
      domains.forEach(function (d) {
        document.cookie = n + "=; max-age=0; path=/" + (d ? "; domain=" + d : "");
      });
    });
  }

  /* ---------- gated scripts ---------- */
  function gated() { return Array.prototype.slice.call(document.querySelectorAll('script[type="text/plain"][data-consent]')); }
  function activateScripts() {
    gated().forEach(function (s) {
      if (s.hasAttribute("data-cn-done") || !has(s.getAttribute("data-consent"))) return;
      var n = document.createElement("script");
      Array.prototype.forEach.call(s.attributes, function (a) {
        if (a.name !== "type" && a.name !== "data-consent" && a.name !== "data-cookies") n.setAttribute(a.name, a.value);
      });
      if (!s.src) n.text = s.text;
      s.setAttribute("data-cn-done", "");
      s.parentNode.insertBefore(n, s.nextSibling);
    });
  }
  function cookiesOf(category) {
    var list = [];
    gated().forEach(function (s) {
      if (s.getAttribute("data-consent") === category && s.getAttribute("data-cookies"))
        list = list.concat(s.getAttribute("data-cookies").split(",").map(function (x) { return x.trim(); }).filter(Boolean));
    });
    return list;
  }

  /* ---------- public helpers ---------- */
  function has(category) {
    if (category === "necessary") return true;
    return !!(state && state[category] === true);
  }
  function get() { return state ? JSON.parse(JSON.stringify(state)) : null; }
  function onChange(fn) { listeners.push(fn); }

  function save(choice) {
    var prev = state;
    var next = { v: CONSENT_VERSION, ts: new Date().toISOString(), necessary: true };
    OPTIONAL.forEach(function (c) { next[c] = choice[c] === true; });
    state = next;
    persist(next);
    hideBanner();
    announce("Nastavení cookies bylo uloženo.");

    // withdrawn categories: remove their cookies; scripts that already ran can only be stopped by a reload
    var revoked = OPTIONAL.filter(function (c) { return prev && prev[c] && !next[c]; });
    var needsReload = false;
    revoked.forEach(function (c) {
      deleteCookies(cookiesOf(c));
      if (gated().some(function (s) { return s.getAttribute("data-consent") === c && s.hasAttribute("data-cn-done"); })) needsReload = true;
    });
    listeners.forEach(function (fn) { try { fn(get()); } catch (e) {} });
    try { document.dispatchEvent(new CustomEvent("cn:change", { detail: get() })); } catch (e) {}
    if (needsReload) { location.reload(); return; }
    activateScripts();
  }
  function update(partial) {
    var choice = {};
    OPTIONAL.forEach(function (c) { choice[c] = has(c); });
    Object.keys(partial || {}).forEach(function (k) { if (OPTIONAL.indexOf(k) > -1) choice[k] = partial[k] === true; });
    save(choice);
  }
  function all(value) { var c = {}; OPTIONAL.forEach(function (k) { c[k] = value; }); return c; }

  /* ---------- UI ---------- */
  var banner, dialog, form, status;
  function announce(msg) { if (status) { status.textContent = ""; setTimeout(function () { status.textContent = msg; }, 50); } }
  function showBanner() {
    if (!banner) return;
    banner.hidden = false;
    document.documentElement.classList.add("cn-open");
  }
  function hideBanner() {
    if (!banner) return;
    banner.hidden = true;
    document.documentElement.classList.remove("cn-open");
  }
  function open(opener) {
    if (!dialog) return;
    lastFocus = opener || document.activeElement;
    OPTIONAL.forEach(function (c) { var i = form.elements[c]; if (i) i.checked = has(c); });
    if (dialog.showModal) { if (!dialog.open) dialog.showModal(); } else dialog.setAttribute("open", "");
  }
  function close() {
    if (dialog && dialog.open) dialog.close ? dialog.close() : dialog.removeAttribute("open");
  }

  function init() {
    banner = document.getElementById("cn-banner");
    dialog = document.getElementById("cn-dialog");
    form = document.getElementById("cn-form");
    status = document.getElementById("cn-status");

    deleteCookies(LEGACY_COOKIES);
    if (state) activateScripts(); else showBanner();

    document.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("[data-cn], [data-cn-open]");
      if (!t) return;
      if (t.hasAttribute("data-cn-open")) { e.preventDefault(); open(t); return; }
      var a = t.getAttribute("data-cn");
      if (a === "accept") { save(all(true)); close(); }
      else if (a === "reject") { save(all(false)); close(); }
      else if (a === "settings") open(t);
      else if (a === "save") {
        var c = {}; OPTIONAL.forEach(function (k) { c[k] = !!(form.elements[k] && form.elements[k].checked); });
        save(c); close();
      }
      else if (a === "close") close();
    });
    if (dialog) dialog.addEventListener("close", function () {
      var back = lastFocus && document.contains(lastFocus) && lastFocus.offsetParent !== null ? lastFocus : null;
      if (!back && banner && !banner.hidden) back = banner.querySelector("button");
      if (back) back.focus();
    });
    // a choice made in another tab of the same site
    addEventListener("storage", function (e) { if (e.key === KEY) { state = load(); if (state) { hideBanner(); activateScripts(); } } });
  }

  state = load();
  window.CNConsent = { get: get, has: has, update: update, open: open, onChange: onChange };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
