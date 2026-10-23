"""Ndërton versionin e unblej për Netlify: porositë vijnë në email (Netlify Forms) dhe pagesa bëhet me PayPal.
Përdorimi: python netlify/build.py  ->  krijon netlify/dist/ dhe unblej-netlify.zip"""
import os, re, shutil, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, '_prototipi', 'unblej.html')
ASSETS = os.path.join(ROOT, '_prototipi', 'assets')
DIST = os.path.join(ROOT, 'netlify', 'dist')
s = open(SRC, encoding='utf-8').read()


def sub(old, new):
    global s
    assert s.count(old) == 1, f'{s.count(old)} përputhje: {old[:70]!r}'
    s = s.replace(old, new)


# Arka, PayPal dhe dërgimi i porosisë
a = s.index('function checkoutView() {')
b = s.index('/* ---------- Llogaria ---------- */')
s = s[:a] + open(os.path.join(ROOT, 'netlify', 'checkout.js'), encoding='utf-8').read() + '\n' + s[b:]

# Llogaria nuk kërkohet për të porositur
sub("${me() ? 'Paguan kur e merr porosinë.' : 'Për të porositur të duhet një llogari falas.'}", 'Paguan kur e merr porosinë ose me PayPal.')
sub("['user', 'Kyçu në llogari', 'Regjistrohu falas me emër, telefon dhe email. Adresa ruhet për herën tjetër.']",
    "['truck', 'Shkruaj adresën', 'Emri, telefoni dhe adresa mjaftojnë. Nuk të duhet llogari.']")
sub("['A më duhet llogari për të porositur?', 'Po. Llogaria është falas dhe krijohet në një minutë me emër, telefon dhe email. Me të e ruan adresën, i sheh të gjitha porositë dhe mund të porositësh përsëri me një klik.']",
    "['A më duhet llogari për të porositur?', 'Jo. Mjafton emri, numri i telefonit dhe adresa.']")
sub('<h3>Llogaria</h3><p>Për të porositur të duhet një llogari në unblej. Je përgjegjës për ruajtjen e fjalëkalimit dhe për saktësinë e të dhënave që jep.</p>', '')
s = s.replace('Me para në dorë kur e merr pakon (pagesë në dorëzim) ose me transfer bankar.', 'Me para në dorë kur e merr pakon (pagesë në dorëzim) ose me PayPal kur porosit.')
s = s.replace('Paguan me para në dorë kur e merr pakon, ose me transfer bankar para dërgesës.', 'Paguan me para në dorë kur e merr pakon, ose me PayPal kur porosit.')
sub('<span>Transfer bankar</span>', '<span>PayPal</span>')
sub("  if (el.name === 'ship') renderSummary();", "  if (el.name === 'ship' || el.name === 'pay') renderSummary();")
# ---------- Pa vlerësime, shitje dhe urgjencë të shpikur ----------
sub('      <div class="rating">${stars(p.rating)}<span>${dec1(p.rating)} (${kfmt(p.reviews)})</span><span class="sold">${soldTxt(p.sold)}</span></div>\n', '')
sub("      ${o.deal && p.stock ? `<div class=\"stock\"><span><i style=\"width:${Math.max(12, 100 - p.stock * 5)}%\"></i></span><small>Mbeten vetëm <b>${p.stock}</b> copë</small></div>` : ''}\n", '')
sub('        <div class="rating">${stars(p.rating)}<b>${dec1(p.rating)}</b><span>(${kfmt(p.reviews)} vlerësime)</span><span>· ${soldTxt(p.sold)}</span></div>\n', '')
sub('        <div class="rating">${stars(p.rating)}<b>${dec1(p.rating)}</b><span>(${kfmt(p.reviews)} vlerësime)</span></div>\n', '')
sub("        ${p.stock && p.stock < 10 ? `<p class=\"pd-stock\">${icon('clock')} Mbeten vetëm ${p.stock} copë me këtë çmim</p>` : ''}\n", '')
sub("""    <div class="fg"><fieldset><legend>Vlerësimi</legend>${rad(0, 'Të gjitha')}${rad(4.5, '4,5 ★ e lart')}${rad(4, '4 ★ e lart')}</fieldset></div>\n""", '')
sub(", ['rating', 'Vlerësimi më i lartë']];", '];')
sub("['pop', 'Më të njohurat']", "['pop', 'Të rekomanduarat']")
sub("  const deals = P.filter(p => p.stock).sort((a, b) => off(b) - off(a));", "  const deals = P.filter(p => p.old).sort((a, b) => off(b) - off(a));")
sub("  ${shelf('s-deals', 'Oferta e ditës', deals, 'zbritje', { ic: 'clock', deal: true, sub: `<span class=\"cd\">Mbaron për <b data-cd>--:--:--</b></span>` })}",
    "  ${shelf('s-deals', 'Ofertat', deals, 'zbritje', { ic: 'percent', sub: '<p class=\"sec-sub\">Produktet me zbritje tani.</p>' })}")
sub("  ${shelf('s-best', 'Më të shiturat', best, 'dyqani')}", "  ${shelf('s-best', 'Të zgjedhura për ty', best, 'dyqani')}")
# Zbritja maksimale llogaritet nga produktet, jo "deri −70%"
sub("const TICK = ['Zbritje deri −70%',", "const MAXOFF = Math.max(0, ...P.map(off));\nconst TICK = [`Zbritje deri −${MAXOFF}%`,")
sub("'<b class=\"pct\" data-to=\"70\">−70%</b>'", '`<b class="pct" data-to="${MAXOFF}">−${MAXOFF}%</b>`')
sub("${icon('percent')} Zbritje −70%</span>", "${icon('percent')} Zbritje deri −${MAXOFF}%</span>")
s = s.replace('Zbritje deri -70%, pagesë në dorëzim', 'Pagesë në dorëzim ose me PayPal')

# ---------- Pa llogari (pa server ruheshin vetëm në shfletues) ----------
sub('      <button class="act" type="button" data-open="account" aria-label="Llogaria"><svg class="ic" aria-hidden="true"><use href="#i-user"/></svg><span class="act-l">Llogaria</span></button>\n', '')
sub('      <li><button type="button" data-open="account">Llogaria ime</button></li>\n', '')
sub("  const u = me(), b = $('.act[data-open=\"account\"]');", "  const u = me(), b = $('.act[data-open=\"account\"]'); if (!b) return;")
sub("  else if (h === 'llogaria') { v = 'account'; html = accountView(); }", "  else if (h === 'llogaria') { html = null; }")
sub("        ['Si i shoh porositë e mia?', 'Kyçu dhe hap “Llogaria ime”. Aty janë të gjitha porositë, me produktet, adresën dhe kohën e mbërritjes.']",
    "        ['Si e di që porosia u pranua?', 'Pas porosisë të shfaqet numri i porosisë. Për pagesë në dorëzim të telefonojmë për konfirmim; për PayPal merr edhe faturën e PayPal-it në email.']")
sub('<h3>Çfarë të dhënash mbledhim</h3><p>Për llogarinë: emrin, email-in, numrin e telefonit dhe fjalëkalimin, të cilin e ruajmë vetëm të koduar. Për porosinë: adresën e dërgesës. I përdorim vetëm për llogarinë dhe për ta dërguar porosinë.</p>',
    '<h3>Çfarë të dhënash mbledhim</h3><p>Për porosinë: emrin, numrin e telefonit, adresën e dërgesës dhe email-in, nëse e jep. I përdorim vetëm për ta dërguar porosinë dhe për të të kontaktuar për të.</p>')

# Kthimi nga PayPal-i
sub("  else if (h === 'porosia') { v = 'done'; html = doneView(); }",
    "  else if (h === 'porosia') { v = 'done'; html = doneView(); }\n"
    "  else if (h === 'paguar' || h === 'anuluar') { setTimeout(() => paypalReturn(h === 'paguar')); html = '<div class=\"wrap page\"><p class=\"loading\">Po kthehesh nga PayPal…</p></div>'; v = 'done'; }")

# Email-i i llogarisë PayPal që merr pagesat (vendoset nga PAYPAL_EMAIL ose skedari netlify/paypal-email.txt)
pp_email = os.environ.get('PAYPAL_EMAIL') or (open(os.path.join(ROOT, 'netlify', 'paypal-email.txt'), encoding='utf-8').read().strip() if os.path.exists(os.path.join(ROOT, 'netlify', 'paypal-email.txt')) else '')
assert re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', pp_email), 'Vendos email-in e PayPal te netlify/paypal-email.txt'
sub("const PAYPAL_EMAIL = '__PAYPAL_EMAIL__';", f"const PAYPAL_EMAIL = '{pp_email}';")

# Abonimi te ofertat shkon edhe ai te Netlify Forms
sub("i.value = ''; toast(`${icon('check')}<span><b>Faleminderit!</b><small>Version demo: email-i ende nuk ruhet.</small></span>`);",
    "fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ 'form-name': 'abonime', email: i.value.trim() }).toString() })\n"
    "      .then(r => { if (!r.ok) throw 0; i.value = ''; toast(`${icon('check')}<span><b>Faleminderit!</b><small>Do të të shkruajmë kur të kemi oferta të reja.</small></span>`); })\n"
    "      .catch(() => toast(`${icon('close')}<span>Abonimi nuk u ruajt. Provo përsëri.</span>`));")

# Formularët e fshehur që Netlify i zbulon gjatë ngarkimit
FORMS = '''<form name="porosi" data-netlify="true" netlify-honeypot="bot-field" hidden>
  <input name="bot-field"><input name="numri"><input name="emri"><input name="telefoni"><input name="email"><input name="shteti"><input name="qyteti"><input name="adresa">
  <textarea name="shenimi"></textarea><textarea name="produktet"></textarea><input name="dergesa"><input name="kuponi"><input name="totali"><input name="pagesa"><input name="paypal">
</form>
<form name="abonime" data-netlify="true" netlify-honeypot="bot-field" hidden><input name="bot-field"><input name="email"></form>

<div class="toasts"'''
sub('<div class="toasts"', FORMS)

CSS = '''.pp-mark{font:800 italic 17px/1 var(--f-body);color:#003087;background:#fff;padding:6px 9px;border-radius:7px;border:1px solid var(--line);white-space:nowrap}
.pp-mark b{color:#009cde}
.pp-go{background:#ffc439;color:#111;border:0}
.pp-go:hover{background:#f2b51d}
.pp-word{font-style:italic;font-weight:800;color:#003087}
.pp-word b{color:#009cde}
.pp-how{font-size:13.5px;background:var(--surface-2);border-radius:12px;padding:12px 14px;margin:4px 0 10px}
.pp-how ol,.pp-pay ol{margin:6px 0 0;padding-left:20px;display:grid;gap:4px;color:var(--muted)}
.pp-how b,.pp-pay b{color:var(--fg)}
.pp-pay{text-align:left;display:grid;gap:14px}
.pp-pay ol{gap:10px;font-size:15px}
.pp-pay .copy{display:inline-flex;margin-left:8px;vertical-align:middle}
.pp-pay small{color:var(--muted);font-size:13px}
'''
title = re.search(r'<title>.*?</title>', s).group(0)
body = s.replace(title, '', 1)
# Pamja kur lidhja shpërndahet në WhatsApp, Facebook, Viber (adresa e plotë merret nga netlify/site-url.txt nëse ekziston)
url_file = os.path.join(ROOT, 'netlify', 'site-url.txt')
site = (open(url_file, encoding='utf-8').read().strip().rstrip('/') if os.path.exists(url_file) else '')
desc = 'unblej: dyqani online ku gjen gjithçka në një vend. Pagesë në dorëzim ose me PayPal, dërgesë falas mbi 30 €.'
og = (f'<meta property="og:type" content="website">\n<meta property="og:site_name" content="unblej">\n'
      f'<meta property="og:title" content="unblej: Gjithçka në një vend">\n<meta property="og:description" content="{desc}">\n'
      f'<meta property="og:image" content="{site}/assets/og.jpg">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'
      + (f'<meta property="og:url" content="{site}/">\n<link rel="canonical" href="{site}/">\n' if site else '')
      + '<meta name="twitter:card" content="summary_large_image">\n<meta name="theme-color" content="#0b0a0c">\n<link rel="apple-touch-icon" href="assets/icon-orange.png">\n')
doc = ('<!doctype html>\n<html lang="sq">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
       f'{title}\n<link rel="icon" href="assets/icon-orange.png">\n' + og +
       '<style>:root{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0}[hidden]{display:none!important}\n' + CSS + '</style>\n'
       '</head>\n<body>\n' + body.strip() + '\n</body>\n</html>\n')

shutil.rmtree(DIST, ignore_errors=True)
os.makedirs(os.path.join(DIST, 'assets'))
open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8').write(doc)
for f in os.listdir(ASSETS):
    shutil.copy(os.path.join(ASSETS, f), os.path.join(DIST, 'assets', f))
shutil.copy(os.path.join(ROOT, 'netlify', 'og.jpg'), os.path.join(DIST, 'assets', 'og.jpg'))
open(os.path.join(DIST, 'robots.txt'), 'w', encoding='utf-8').write('User-agent: *\nAllow: /\n' + (f'Sitemap: {site}/sitemap.xml\n' if site else ''))
if site:
    open(os.path.join(DIST, 'sitemap.xml'), 'w', encoding='utf-8').write(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>{site}/</loc></url></urlset>\n')
open(os.path.join(DIST, '404.html'), 'w', encoding='utf-8').write('''<!doctype html><html lang="sq"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Faqja nuk u gjet · unblej</title><link rel="icon" href="/assets/icon-orange.png">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0a0c;color:#f5f2ee;font:16px/1.5 "Segoe UI",system-ui,sans-serif;text-align:center;padding:24px}
img{height:56px}h1{font-size:28px;margin:24px 0 8px}p{color:#a39b94;margin:0 0 24px}a{display:inline-block;background:#ff7a0d;color:#1a0c00;font-weight:700;text-decoration:none;padding:13px 22px;border-radius:12px}</style></head>
<body><main><img src="/assets/logo-dark.png" alt="unblej"><h1>Kjo faqe nuk u gjet</h1><p>Lidhja mund të jetë e gabuar ose faqja është hequr.</p><a href="/">Kthehu te dyqani</a></main></body></html>
''')

zp = os.path.join(ROOT, 'unblej-netlify.zip')
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
    for dp, _, fs in os.walk(DIST):
        for f in fs:
            full = os.path.join(dp, f)
            z.write(full, os.path.relpath(full, DIST).replace(os.sep, '/'))
print('ok', zp, os.path.getsize(zp) // 1024, 'KB')
