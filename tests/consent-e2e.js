// End-to-end tests for cookie consent and the legal pages.
// Usage (from the repository root):
//   python3 -m http.server 8765 --bind 127.0.0.1      # in one terminal
//   node tests/consent-e2e.js                          # in another (needs the "playwright" package)
// Cookies need http(s), so the pages must be served, not opened as files.
// Two dummy scripts (analytics + marketing) are injected into index.html at request time to prove
// that optional scripts never run before consent; the real site contains none.
const {chromium, devices} = require('playwright');
const B = process.env.BASE_URL || 'http://127.0.0.1:8765/';
const OUT = process.env.SCREENSHOT_PREFIX || require('os').tmpdir() + '/cn_';
const INJECT = `<script type="text/plain" data-consent="analytics" data-cookies="_test_an">window.__an=(window.__an||0)+1;document.cookie="_test_an=1;path=/"<\/script>
<script type="text/plain" data-consent="marketing" data-cookies="_test_mk,_test_mk_*">window.__mk=(window.__mk||0)+1;document.cookie="_test_mk=1;path=/";document.cookie="_test_mk_x=1;path=/"<\/script>
</body>`;
let pass = 0, fail = 0; const errors = [];
const ok = (cond, msg) => { if (cond) { pass++; console.log('  PASS', msg); } else { fail++; console.log('  FAIL', msg); } };

async function ctx(browser, opts = {}) {
  const c = await browser.newContext({viewport: {width: 1280, height: 900}, colorScheme: 'light', ...opts});
  // block real third-party requests (Google Maps) so tests are deterministic; record that they were attempted
  c.thirdParty = [];
  await c.route(u => !u.href.startsWith(B), r => { c.thirdParty.push(r.request().url()); r.abort(); });
  await c.route(u => u.href === B || u.href.startsWith(B + 'index.html'), async r => {
    const resp = await r.fetch();
    r.fulfill({response: resp, body: (await resp.text()).replace('</body>', INJECT)});
  });
  return c;
}
async function page(c, path = '') {
  const p = await c.newPage();
  p.on('pageerror', e => errors.push(`${path}: ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && m.location().url.startsWith(B) && !/net::ERR_FAILED|ERR_BLOCKED/.test(m.text())) errors.push(`${path}: ${m.text()}`); });
  await p.goto(B + path); await p.waitForLoadState('domcontentloaded'); await p.waitForTimeout(300);
  return p;
}
const consent = p => p.evaluate(() => { const m = document.cookie.match(/(?:^|; )cn_consent=([^;]*)/); return m ? JSON.parse(decodeURIComponent(m[1])) : null; });
const cookies = p => p.evaluate(() => document.cookie);
const ran = p => p.evaluate(() => ({an: window.__an || 0, mk: window.__mk || 0}));
const bannerVisible = p => p.evaluate(() => { const b = document.getElementById('cn-banner'); return !!b && !b.hidden && getComputedStyle(b).display !== "none"; });
const iframes = p => p.locator('#map iframe').count();

(async () => {
  const browser = await chromium.launch();

  console.log('1. First visit: nothing optional before a choice');
  let c = await ctx(browser), p = await page(c);
  ok(await bannerVisible(p), 'banner is shown');
  ok((await ran(p)).an === 0 && (await ran(p)).mk === 0, 'analytics + marketing scripts did NOT run');
  ok(await consent(p) === null, 'no consent cookie stored yet');
  ok(!/(^|; )_test_/.test(await cookies(p)), 'no optional cookies set');
  ok(await iframes(p) === 0 && c.thirdParty.length === 0, 'Google Maps not loaded, no third-party request');
  const st = await p.evaluate(() => [...document.querySelectorAll('#cn-banner .cn-btn')].map(b => { const s = getComputedStyle(b); return [b.textContent.trim(), s.backgroundColor, s.borderColor, s.fontSize, s.fontWeight, s.color].join('|'); }));
  ok(st.length === 3 && new Set(st.map(x => x.split('|').slice(1).join('|'))).size === 1, 'three banner buttons look identical: ' + st.map(x => x.split('|')[0]).join(' / '));
  // keyboard: banner is first in tab order
  await p.keyboard.press('Tab');
  ok(await p.evaluate(() => !!document.activeElement.closest('#cn-banner')), 'first Tab lands inside the banner (' + await p.evaluate(() => document.activeElement.textContent.trim().slice(0, 30)) + ')');
  // scrolling / browsing is not consent
  await p.mouse.wheel(0, 3000); await p.waitForTimeout(400); await p.click('a.nl[href="#galerie"]'); await p.waitForTimeout(500);
  ok(await consent(p) === null && (await ran(p)).an === 0 && await bannerVisible(p), 'scrolling and navigating does not count as consent');
  await p.setViewportSize({width: 390, height: 844}); await p.waitForTimeout(300);
  await p.screenshot({path: OUT + 'banner_mobile.png'});
  await p.setViewportSize({width: 1280, height: 900}); await p.waitForTimeout(200);
  await p.screenshot({path: OUT + 'banner_desktop.png'});

  console.log('2. Reject all');
  await p.click('#cn-banner [data-cn="reject"]'); await p.waitForTimeout(300);
  let s = await consent(p);
  ok(!await bannerVisible(p), 'banner hidden');
  ok(s && s.necessary === true && s.analytics === false && s.marketing === false && s.maps === false, 'stored: only necessary');
  ok(s && /^\d{4}-\d\d-\d\dT/.test(s.ts) && Math.abs(Date.now() - Date.parse(s.ts)) < 60000 && s.v === 1, 'timestamp + version stored (' + (s && s.ts) + ')');
  ok((await ran(p)).an === 0 && (await ran(p)).mk === 0, 'scripts still blocked');
  await p.reload(); await p.waitForTimeout(400);
  ok(!await bannerVisible(p) && (await ran(p)).an === 0 && await iframes(p) === 0, 'after reload: no banner, scripts blocked, no map');
  // navigation to another page keeps the choice
  const p2 = await page(c, 'zasady-cookies.html');
  ok(!await bannerVisible(p2), 'choice carries over to legal pages (no banner on zasady-cookies.html)');
  await c.close();

  console.log('3. Accept all');
  c = await ctx(browser); p = await page(c);
  await p.click('#cn-banner [data-cn="accept"]'); await p.waitForTimeout(500);
  s = await consent(p);
  ok(s.analytics && s.marketing && s.maps, 'stored: all categories');
  ok((await ran(p)).an === 1 && (await ran(p)).mk === 1, 'analytics + marketing ran exactly once');
  ok(await iframes(p) === 1, 'map iframe inserted after consent');
  await p.reload(); await p.waitForTimeout(500);
  ok((await ran(p)).an === 1 && (await ran(p)).mk === 1 && !await bannerVisible(p), 'after reload scripts run on load, no banner');

  console.log('4. Withdraw marketing via footer "Nastavení cookies"');
  await p.click('footer [data-cn-open]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById('cn-dialog').open), 'footer link opens preferences');
  ok(await p.isChecked('#cn-form [name=marketing]') && await p.isChecked('#cn-form [name=analytics]'), 'dialog reflects current choice');
  ok(await p.isDisabled('#cn-form input[aria-labelledby="cn-l-nec"]') && await p.isChecked('#cn-form input[aria-labelledby="cn-l-nec"]'), 'necessary is locked on');
  await p.click('label:has([name=marketing])');
  await Promise.all([p.waitForNavigation(), p.click('#cn-dialog [data-cn="save"]')]);   // revoking a category that ran → reload
  await p.waitForTimeout(500);
  s = await consent(p);
  ok(s.analytics === true && s.marketing === false, 'stored: analytics on, marketing off');
  ok((await ran(p)).mk === 0 && (await ran(p)).an === 1, 'after automatic reload marketing no longer runs');
  const ck = await cookies(p);
  ok(!/_test_mk/.test(ck) && /_test_an/.test(ck), 'marketing cookies (incl. prefix _test_mk_*) deleted, analytics kept: ' + ck.replace(/cn_consent=[^;]*/, 'cn_consent=…'));
  await c.close();

  console.log('5. Granular choice from the banner, defaults unchecked');
  c = await ctx(browser); p = await page(c);
  await p.click('#cn-banner [data-cn="settings"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById('cn-dialog').open), 'settings dialog opens');
  ok(!(await p.isChecked('[name=analytics]')) && !(await p.isChecked('[name=marketing]')) && !(await p.isChecked('[name=maps]')), 'optional categories NOT pre-selected');
  await p.setViewportSize({width: 390, height: 844}); await p.waitForTimeout(300);
  await p.screenshot({path: OUT + 'dialog_mobile.png'});
  await p.setViewportSize({width: 1280, height: 900});
  await p.screenshot({path: OUT + 'dialog_desktop.png'});
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  ok(!await p.evaluate(() => document.getElementById('cn-dialog').open) && await bannerVisible(p) && await consent(p) === null, 'Esc closes dialog without deciding; banner stays');
  ok(await p.evaluate(() => document.activeElement && document.activeElement.dataset.cn === 'settings'), 'focus returns to the "Nastavení cookies" button');
  await p.click('#cn-banner [data-cn="settings"]');
  await p.click('label:has([name=analytics])');
  await p.click('#cn-dialog [data-cn="save"]'); await p.waitForTimeout(400);
  s = await consent(p);
  ok(s.analytics && !s.marketing && !s.maps, 'stored: analytics only');
  ok((await ran(p)).an === 1 && (await ran(p)).mk === 0 && await iframes(p) === 0, 'only analytics ran, map not loaded');
  ok(await p.evaluate(() => document.getElementById('cn-status').textContent).then(x => /uloženo/.test(x)), 'screen-reader status announces the save');
  await c.close();

  console.log('6. Map button = consent for "maps" only; withdrawal removes it');
  c = await ctx(browser); p = await page(c);
  await p.click('#cn-banner [data-cn="reject"]');
  await p.click('[data-map="on"]'); await p.waitForTimeout(400);
  s = await consent(p);
  ok(s.maps === true && !s.analytics && !s.marketing, 'clicking "Načíst mapu Google" grants only maps');
  ok(await iframes(p) === 1 && c.thirdParty.some(u => /google/.test(u)), 'map iframe inserted, Google requested only now');
  await p.click('[data-map="off"]'); await p.waitForTimeout(300);
  ok(await iframes(p) === 0 && (await consent(p)).maps === false, '"Odvolat souhlas s mapou" removes the map and updates consent');
  await p.click('[data-map="on"]'); await p.waitForTimeout(200);
  await p.click('footer [data-cn-open]'); await p.click('label:has([name=maps])'); await p.click('#cn-dialog [data-cn="save"]'); await p.waitForTimeout(300);
  ok(await iframes(p) === 0 && p.url() === B, 'withdrawing maps in settings removes the map without a reload');
  await c.close();

  console.log('7. Legal pages first, footer links, old links');
  c = await ctx(browser);
  for (const [path, title] of [['ochrana-osobnich-udaju.html', 'Zásady ochrany osobních údajů – Cukrové nebe'], ['zasady-cookies.html', 'Zásady používání cookies – Cukrové nebe'], ['identifikacni-udaje.html', 'Identifikační údaje provozovatele – Cukrové nebe']]) {
    p = await page(c, path);
    const t = await p.title(), d = await p.getAttribute('meta[name=description]', 'content'), lang = await p.getAttribute('html', 'lang');
    ok(t === title && d && d.length > 60 && lang === 'cs', `${path}: title, description, lang=cs`);
    ok(await p.locator('h1').count() === 1, `${path}: exactly one h1`);
    ok(await p.locator('.legalnav a[aria-current=page]').getAttribute('href') === path, `${path}: footer marks current page`);
    const ids = await p.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.querySelector(h)));
    ok(ids.length === 0, `${path}: all in-page anchors resolve`);
    await p.close();
  }
  p = await page(c, 'zasady-cookies.html');
  ok(await bannerVisible(p), 'banner shown when a legal page is the first page visited');
  await p.click('#cn-banner [data-cn="accept"]');
  const pi = await page(c, '');
  ok(!await bannerVisible(pi) && (await ran(pi)).an === 1, 'choice made on legal page applies on the main page');
  // footer links from the main page
  const links = await pi.$$eval('footer .legalnav a', as => as.map(a => [a.textContent.trim(), a.getAttribute('href')]));
  ok(links.length === 5 && await pi.locator('footer .legalnav [data-cn-open]').count() === 1, 'footer has 5 links + "Nastavení cookies": ' + links.map(l => l[0]).join(', '));
  for (const [text, href] of links.filter(l => !l[1].includes('#'))) {
    await pi.click(`footer .legalnav a[href="${href}"]`); await pi.waitForLoadState('domcontentloaded');
    ok(pi.url() === B + href && await pi.locator('h1').count() === 1, `footer "${text}" → ${href}`);
    await pi.goBack(); await pi.waitForLoadState('domcontentloaded');
  }
  await pi.click('footer .legalnav a[data-legal="podminky"]'); await pi.waitForTimeout(300);
  ok(await pi.evaluate(() => document.getElementById('legal').open && /Podmínky rezervace/.test(document.getElementById('lbody').textContent)), 'footer "Podmínky rezervace" opens the dialog');
  await pi.keyboard.press('Escape');
  const pl = await page(c, 'identifikacni-udaje.html');
  await pl.click('footer .legalnav a[href="index.html#pravni-pristupnost"]'); await pl.waitForTimeout(600);
  ok(await pl.evaluate(() => document.getElementById('legal').open && /přístupnosti/.test(document.getElementById('lbody').textContent)), 'from a legal page "Přístupnost" opens the dialog on the main page');
  for (const [hash, target] of [['osobni', 'ochrana-osobnich-udaju.html'], ['cookies', 'zasady-cookies.html'], ['provozovatel', 'identifikacni-udaje.html']]) {
    const po = await page(c, 'index.html#pravni-' + hash); await po.waitForTimeout(400);
    ok(po.url() === B + target, `old link #pravni-${hash} redirects to ${target}`); await po.close();
  }
  // legal page: settings button inside the text works
  const pc = await page(c, 'zasady-cookies.html');
  await pc.click('.doc [data-cn-open] >> nth=0'); await pc.waitForTimeout(200);
  ok(await pc.evaluate(() => document.getElementById('cn-dialog').open), 'button on cookie policy opens settings');
  await c.close();

  console.log('8. Booking still works; privacy link opens in new tab');
  c = await ctx(browser); p = await page(c);
  await p.click('#cn-banner [data-cn="reject"]');
  await p.click('[data-svc="dorty"]'); await p.click('#bnext'); await p.click('.dates .chip:not(:disabled)'); await p.click('#bnext');
  await p.click('.times .chip'); await p.click('#bnext');
  ok(await p.getAttribute('.chk a[href="ochrana-osobnich-udaju.html"]', 'target') === '_blank', 'privacy link in booking form opens in a new tab');
  await p.fill('#n', 'Test'); await p.fill('#c', '777000000'); await p.check('.chk input'); await p.click('#bnext'); await p.waitForTimeout(300);
  ok(/Rezervace připravena/.test(await p.textContent('#panel')), 'booking flow completes');
  await c.close();

  console.log('9. Mobile layout of legal pages');
  c = await ctx(browser, {...devices['Pixel 7'], colorScheme: 'dark'});
  for (const path of ['ochrana-osobnich-udaju.html', 'identifikacni-udaje.html']) {
    p = await page(c, path);
    await p.click('#cn-banner [data-cn="reject"]').catch(() => {});
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path}: no horizontal scroll on phone`);
    await p.screenshot({path: OUT + path.replace('.html', '') + '_mobile.png', fullPage: false});
  }
  await c.close();
  c = await ctx(browser); p = await page(c, 'ochrana-osobnich-udaju.html'); await p.click('#cn-banner [data-cn="reject"]');
  await p.evaluate(() => document.getElementById('ucely').scrollIntoView()); await p.waitForTimeout(300);
  await p.screenshot({path: OUT + 'privacy_desktop.png'});
  p = await page(c, ''); await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(800);
  await p.screenshot({path: OUT + 'footer_desktop.png', clip: {x: 0, y: 900 - 140, width: 1280, height: 140}});
  await c.close();

  console.log('\nConsole / page errors:', errors.length ? errors : 'none');
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
  process.exit(fail || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
