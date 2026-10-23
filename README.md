# unblej: dyqani online me server

Ky projekt përmban dyqanin unblej të plotë:

- **Faqja** (`public/`): kryefaqja me karuselin 3D, dyqani, faqet e produkteve, shporta, arka dhe "Llogaria ime".
- **Serveri** (`server.js`, `lib/`):
  - llogari të vërteta me fjalëkalime të koduara dhe kodin e fjalëkalimit të harruar në email
  - porositë, email-et e konfirmimit dhe pagesa me **PayPal**
- **Paneli i administrimit** (`/admin`): porositë dhe statusi i tyre, produktet me foto, klientët dhe abonentët.

Të dhënat (llogaritë, porositë, produktet dhe fotot e ngarkuara) ruhen në PostgreSQL (Neon). Në kompjuter, pa `DATABASE_URL`, përdoret një bazë lokale te dosja `data/`.

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

## 2. Ta vendosësh online falas (Neon + Render, pa kartë)

### a) Baza e të dhënave te Neon
1. Hyr te [neon.tech](https://neon.tech) me GitHub ose Google. Plani falas nuk kërkon kartë.
2. Krijo një projekt, p.sh. `unblej`, dhe zgjidh rajonin **Europe (Frankfurt)**.
3. Te **Connection string** kopjo lidhjen që fillon me `postgresql://...` dhe mbaron me `sslmode=require`. Kjo është `DATABASE_URL`.

### b) Serveri te Render
1. Hyr te [render.com](https://render.com) me GitHub.
2. Kliko **New + → Web Service** (jo Blueprint) dhe zgjidh repozitorin e dyqanit.
3. Plotëso:
   - **Language:** Node
   - **Build Command:** `npm ci`
   - **Start Command:** `npm start`
   - **Instance Type:** **Free**
4. Te **Environment Variables** shto:

   | Emri | Vlera |
   |---|---|
   | `NODE_VERSION` | `24` |
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | lidhja nga Neon |
   | `ADMIN_EMAILS` | email-i yt |
   | `PAYPAL_ENV` | `live` |
   | `PAYPAL_CLIENT_ID` | Client ID e PayPal (është edhe te `render.yaml`) |

5. Kliko **Create Web Service**. Pas 2–4 minutash merr adresën, p.sh. `https://unblej.onrender.com`. Shtoje edhe si `SITE_URL`.
6. Herën e parë serveri krijon vetë tabelat dhe produktet. Regjistrohu me email-in e `ADMIN_EMAILS` dhe hap `/admin`.

**Kufizimet e planit falas:** serveri "fle" pas 15 minutash pa vizita, dhe vizitori i parë pas kësaj pret rreth 30–50 sekonda. Të dhënat dhe fotot nuk humbasin, sepse janë te Neon. Kur të rritet dyqani, kalon te një plan me pagesë pa ndryshuar asgjë në kod.

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

**Client ID e dyqanit është vendosur tashmë** te `render.yaml` (`PAYPAL_ENV=live`). Te arka del vetëm butoni PayPal, pa opsionin e kartës.

- **Shuma që paguan klienti** = çmimi i çdo produkti × sasia, plus dërgesa, minus kuponi. E llogarit serveri nga çmimet te paneli, jo shfletuesi.
- **Vetëm me Client ID:** serveri e pranon porosinë vetëm nëse PayPal raporton pagesë të plotë në EUR me shumën e saktë. Te paneli porosia shënohet "Kontrolloje te PayPal para dërgesës", bashkë me ID-në e pagesës. Para se ta nisësh pakon, gjeje atë ID te paypal.com → Aktiviteti.
- **Për verifikim automatik (rekomandohet):** shto edhe `PAYPAL_CLIENT_SECRET` te Render, nga i njëjti aplikacion. Atëherë serveri e merr dhe e kontrollon pagesën direkt te PayPal, dhe shënimi "Kontrolloje" nuk del më. Secret vendoset vetëm te Render, kurrë në GitHub.

Për prova me para të rreme, me aplikacion Sandbox:
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
lib/db.js            baza e të dhënave (PostgreSQL / PGlite lokal)
lib/auth.js          fjalëkalimet, seancat, kufizimi i përpjekjeve
lib/shop.js          çmimet, dërgesa, kuponët, llogaritja e porosisë
lib/mail.js          email-et (Resend) dhe pamja e tyre
lib/paypal.js        PayPal Checkout
lib/seed-products.json  produktet fillestare (mbushen herën e parë)
public/              dyqani, paneli dhe fotot
```

Kodi i zbritjes `MIRESEVINI` jep −10% dhe vlen vetëm për porosinë e parë të çdo llogarie. Ndryshohet te `lib/shop.js`.
