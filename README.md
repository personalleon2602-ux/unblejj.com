# unblej: dyqani online me server

Ky projekt përmban dyqanin unblej të plotë:

- **Faqja** (`public/`): kryefaqja me karuselin 3D, dyqani, faqet e produkteve, shporta, arka dhe "Llogaria ime".
- **Serveri** (`server.js`, `lib/`):
  - llogari të vërteta me fjalëkalime të koduara dhe kodin e fjalëkalimit të harruar në email
  - porositë, email-et e konfirmimit dhe pagesa me **PayPal**
- **Paneli i administrimit** (`/admin`): porositë dhe statusi i tyre, produktet me foto, klientët dhe abonentët.

Të dhënat (llogaritë, porositë, produktet dhe fotot e ngarkuara) ruhen në dosjen `data/`, në një bazë SQLite.

---

## 1. Ta provosh në kompjuterin tënd

Të duhet [Node.js 22.13 ose më i ri](https://nodejs.org).

```bash
npm install
cp .env.example .env      # në Windows: copy .env.example .env
npm start
```

Hap http://localhost:3000. Për panelin hap http://localhost:3000/admin.

- **Administratori:** regjistrohu te dyqani me email-in që ke vendosur te `ADMIN_EMAILS` në `.env`. Ajo llogari hyn në panel.
- **Email-et:** pa çelësin e Resend, email-et nuk dërgohen. Ruhen te `data/outbox/`, ku i hap në shfletues dhe sheh, p.sh., kodin e fjalëkalimit.
- **PayPal:** pa çelësat e PayPal, opsioni PayPal nuk shfaqet te arka.

---

## 2. Ta vendosësh online në Render

1. Krijo një llogari falas në [GitHub](https://github.com) dhe ngarko këtë dosje si repozitor të ri. Skedari `.gitignore` siguron që `.env`, `data/` dhe `node_modules/` të mos ngarkohen.
2. Krijo llogari në [Render](https://render.com) dhe zgjidh **New → Blueprint**. Lidh repozitorin dhe Render e lexon vetë `render.yaml`.
   - Plani **Starter** kushton rreth 7 $ në muaj, plus 1 GB disk rreth 0,25 $. Disku duhet që të mos humbasin porositë dhe llogaritë.
3. Te **Environment** plotëso vlerat:

   | Emri | Çfarë vendos |
   |---|---|
   | `SITE_URL` | adresa e dyqanit, p.sh. `https://unblej.com` |
   | `ADMIN_EMAILS` | email-i yt (dhe të tjerëve që hyjnë në panel), të ndarë me presje |
   | `SUPPORT_EMAIL` | email-i për klientët, p.sh. `info@unblej.com` |
   | `RESEND_API_KEY` | çelësi nga Resend (hapi 3) |
   | `MAIL_FROM` | p.sh. `unblej <no-reply@unblej.com>` |
   | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | nga PayPal (hapi 4) |
   | `PAYPAL_ENV` | `sandbox` për prova, `live` për pagesa të vërteta |

4. **Domeni:** blej domenin (p.sh. unblej.com) dhe te Render → **Settings → Custom Domains** shto domenin. Ndiq udhëzimet për DNS.

---

## 3. Email-et me Resend

1. Krijo llogari në [resend.com](https://resend.com). Plani falas dërgon 3.000 email në muaj.
2. Te **Domains** shto domenin tënd dhe vendos te DNS-i rekordet që të jep Resend (SPF, DKIM). Kështu email-et nuk shkojnë te Spam.
3. Te **API Keys** krijo një çelës dhe vendose te Render si `RESEND_API_KEY`.

Email-et që dërgon dyqani:
- mirëseardhje kur krijohet llogaria
- kodi 6-shifror për fjalëkalimin e ri, që skadon pas 15 minutash dhe lejon 5 përpjekje
- konfirmimi i porosisë te klienti, dhe njoftimi për çdo porosi të re te `ADMIN_EMAILS`
- njoftimi te klienti kur e ndryshon statusin te paneli: E konfirmuar, U nis, U dorëzua ose U anulua

---

## 4. Pagesa me PayPal

1. Hyr në [developer.paypal.com](https://developer.paypal.com) me llogarinë tënde PayPal **Business**.
2. Te **Apps & Credentials**, në skedën **Sandbox**, krijo një aplikacion. Kopjo **Client ID** dhe **Secret** te Render dhe lëre `PAYPAL_ENV=sandbox`.
3. Provo një blerje me një llogari prove nga **Sandbox → Accounts**.
4. Kur gjithçka punon, kalo te skeda **Live**, krijo aplikacionin, vendos Client ID dhe Secret e Live dhe ndrysho `PAYPAL_ENV=live`.

Si funksionon:
- Te arka, klienti zgjedh **PayPal** dhe paguan në faqen e PayPal. Pagesa me kartë është e çaktivizuar; lejohet vetëm llogaria PayPal.
- Shumën e llogarit gjithmonë serveri nga çmimet në bazë, jo shfletuesi.
- Pas pagesës, serveri e kontrollon shumën te PayPal dhe vetëm atëherë e pranon porosinë.
- ID-ja e pagesës shfaqet te paneli, te detajet e porosisë.

---

## Struktura

```
server.js            API-ja dhe faqja
lib/db.js            baza e të dhënave (SQLite)
lib/auth.js          fjalëkalimet, seancat, kufizimi i përpjekjeve
lib/shop.js          çmimet, dërgesa, kuponët, llogaritja e porosisë
lib/mail.js          email-et (Resend) dhe pamja e tyre
lib/paypal.js        PayPal Checkout
lib/seed-products.json  produktet fillestare (mbushen herën e parë)
public/              dyqani, paneli dhe fotot
```

Kodi i zbritjes `MIRESEVINI` jep −10% dhe vlen vetëm për porosinë e parë të çdo llogarie. Ndryshohet te `lib/shop.js`.
