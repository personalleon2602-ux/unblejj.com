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
    "['truck', 'Shkruaj adresën', 'Emri, telefoni dhe adresa mjaftojnë. Llogaria nuk është e detyrueshme.']")
sub("['A më duhet llogari për të porositur?', 'Po. Llogaria është falas dhe krijohet në një minutë me emër, telefon dhe email. Me të e ruan adresën, i sheh të gjitha porositë dhe mund të porositësh përsëri me një klik.']",
    "['A më duhet llogari për të porositur?', 'Jo. Mjafton emri, numri i telefonit dhe adresa. Me llogari e ruan adresën për herën tjetër.']")
sub('<h3>Llogaria</h3><p>Për të porositur të duhet një llogari në unblej. Je përgjegjës për ruajtjen e fjalëkalimit dhe për saktësinë e të dhënave që jep.</p>',
    '<h3>Llogaria</h3><p>Llogaria nuk është e detyrueshme për të porositur. Nëse e krijon, je përgjegjës për ruajtjen e fjalëkalimit dhe për saktësinë e të dhënave që jep.</p>')
s = s.replace('Me para në dorë kur e merr pakon (pagesë në dorëzim) ose me transfer bankar.', 'Me para në dorë kur e merr pakon (pagesë në dorëzim) ose me PayPal kur porosit.')
s = s.replace('Paguan me para në dorë kur e merr pakon, ose me transfer bankar para dërgesës.', 'Paguan me para në dorë kur e merr pakon, ose me PayPal kur porosit.')
sub('<span>Transfer bankar</span>', '<span>PayPal</span>')
sub("  if (el.name === 'ship') renderSummary();", "  if (el.name === 'ship' || el.name === 'pay') renderSummary();")

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
doc = ('<!doctype html>\n<html lang="sq">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
       f'{title}\n<link rel="icon" href="assets/icon-orange.png">\n'
       '<style>:root{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0}[hidden]{display:none!important}\n' + CSS + '</style>\n'
       '</head>\n<body>\n' + body.strip() + '\n</body>\n</html>\n')

shutil.rmtree(DIST, ignore_errors=True)
os.makedirs(os.path.join(DIST, 'assets'))
open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8').write(doc)
for f in os.listdir(ASSETS):
    shutil.copy(os.path.join(ASSETS, f), os.path.join(DIST, 'assets', f))

zp = os.path.join(ROOT, 'unblej-netlify.zip')
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
    for dp, _, fs in os.walk(DIST):
        for f in fs:
            full = os.path.join(dp, f)
            z.write(full, os.path.relpath(full, DIST).replace(os.sep, '/'))
print('ok', zp, os.path.getsize(zp) // 1024, 'KB')
