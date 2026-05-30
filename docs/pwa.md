# PWA – Slavic Alliance

Progressive Web App implementace pro Android a iOS.

---

## Architektura

| Vrstva | Soubor | Popis |
|---|---|---|
| Manifest | `apps/site/public/manifest.json` | Servírován z kořene domény `/manifest.json` |
| Service worker | `apps/site/public/sw.js` | Root-scope SW (`/`), kontroluje i `/vysledky/*` |
| iOS/Android meta | `apps/site/src/app/layout.tsx` | `appleWebApp`, `themeColor`, `apple-touch-icon` |
| Manifest odkaz (results) | `apps/results/src/app/layout.tsx` | `<link rel="manifest" href="/manifest.json">` |
| Push subscribe API | `apps/results/src/app/api/push/subscribe/route.ts` | POST – uloží subscription do DB |
| Push unsubscribe API | `apps/results/src/app/api/push/unsubscribe/route.ts` | POST – deaktivuje subscription |
| Test push API | `apps/results/src/app/api/push/test/route.ts` | POST – odešle test všem (Bearer auth) |
| Push DB helper | `apps/results/src/lib/push-db.ts` | PostgreSQL CRUD pro `push_subscriptions` |
| SW registrace | `apps/results/src/app/_components/ServiceWorkerRegistration.tsx` | Tichá registrace SW |
| Install banner | `apps/results/src/app/_components/PwaInstallBanner.tsx` | Mobilní banner (<768 px) |
| DB migrace | `scripts/migrations/001_push_subscriptions.sql` | Tabulka `push_subscriptions` |
| Test script | `scripts/test-push.mjs` | Node.js script pro přímý test push |

---

## VAPID klíče

VAPID (Voluntary Application Server Identification) je asymetrický klíčový pár (ECDSA P-256) identifikující server při odesílání push notifikací.

### Vygenerování

```bash
npx web-push generate-vapid-keys
```

Výstup:

```
Public Key:
BExamplePublicKey...

Private Key:
ExamplePrivateKey...
```

### Nastavení env proměnných

**.env.local** (lokální vývoj):

```
VAPID_PUBLIC_KEY=BExamplePublicKey...
VAPID_PRIVATE_KEY=ExamplePrivateKey...
VAPID_SUBJECT=mailto:admin@slavicalliance.cz
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BExamplePublicKey...
```

> `NEXT_PUBLIC_VAPID_PUBLIC_KEY` musí mít stejnou hodnotu jako `VAPID_PUBLIC_KEY` — je to public key
> bezpečně exposovaný do prohlížeče.

### Cloudflare Workers secrets

```bash
# Pro apps/results Worker:
wrangler secret put VAPID_PUBLIC_KEY --name slavicalliance-results
wrangler secret put VAPID_PRIVATE_KEY --name slavicalliance-results
wrangler secret put VAPID_SUBJECT --name slavicalliance-results
wrangler secret put ADMIN_PASSWORD --name slavicalliance-results

# NEXT_PUBLIC_VAPID_PUBLIC_KEY jde do vars (public, ne secret):
# Přidej do apps/results/wrangler.jsonc:
# "vars": { "NEXT_PUBLIC_VAPID_PUBLIC_KEY": "BExamplePublicKey..." }
```

**Nikdy necommituj `VAPID_PRIVATE_KEY` do repozitáře.**

---

## DB migrace

Spusť jednou před nasazením PWA funkcionality:

```bash
psql "$DATABASE_URL" -f scripts/migrations/001_push_subscriptions.sql
```

Vytvoří tabulku `public.push_subscriptions`:

| Sloupec | Typ | Popis |
|---|---|---|
| `id` | SERIAL | PK |
| `endpoint` | TEXT UNIQUE | Push endpoint URL z prohlížeče |
| `p256dh` | TEXT | ECDH public key pro šifrování zprávy |
| `auth` | TEXT | Auth secret |
| `platform` | TEXT | `ios` / `android` / `web` |
| `user_agent` | TEXT | User-Agent řetězec |
| `team_name` | TEXT | Jméno týmu (volitelné) |
| `notification_type` | TEXT | Typ notifikace, výchozí `results` |
| `enabled` | BOOLEAN | `TRUE` = aktivní subscription |
| `created_at` | TIMESTAMPTZ | Čas vytvoření |
| `updated_at` | TIMESTAMPTZ | Čas poslední změny |

---

## Automatické push notifikace (cron)

GitHub Actions workflow `.github/workflows/push-notify.yml` volá každých 10 minut:

```
POST /vysledky/api/push/notify
Authorization: Bearer <CRON_SECRET>
```

Endpoint (`apps/results/src/lib/push-notify.ts`) porovná aktuální DB stav se snapshoty a odešle
push jen pokud se něco změnilo:

| Událost | Snapshot klíč | Obsah notifikace |
|---|---|---|
| Změna top 10 v Dlouhodobé soutěži | `league_top10` | Pořadí 1.–3. týmu s body |
| Změna rezervací top 10 týmů | `reservations_top10` | Jméno týmu + hospoda + datum |

Snapshoty jsou uloženy v `public.push_notification_snapshots` (migrace 002).

### První spuštění

Migrace 002 vloží prázdné (`''`) snapshot hodnoty. První cron run uloží aktuální stav bez odeslání
notifikace. Od druhého spuštění se porovnává a notifikace jdou ven jen při změně.

### Nastavení `CRON_SECRET`

```bash
# Vygeneruj bezpečný secret
openssl rand -hex 32

# Přidej do GitHub secrets repozitáře jako CRON_SECRET
# Přidej do Cloudflare Worker secrets:
wrangler secret put CRON_SECRET --name slavicalliance-results
```

### Ruční spuštění cron jobu

V GitHub Actions → Push notify → Run workflow.

Nebo přímo:
```bash
curl -X POST https://slavicalliance.cz/vysledky/api/push/notify \
  -H "Authorization: Bearer <CRON_SECRET>"
```

Odpověď ukazuje co se změnilo a kolik pushů bylo odesláno:
```json
{
  "leagueChanged": true,
  "reservationsChanged": false,
  "leaguePush": { "sent": 5, "expired": 1, "failed": 0 },
  "reservationsPush": null
}
```

## Test push notifikace

### Možnost A – Node.js script (přímý přístup na DB)

```bash
# Z kořene repozitáře
node --env-file=.env.local scripts/test-push.mjs "Titulek" "Text zprávy"
```

Vyžaduje: `DATABASE_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` v prostředí nebo `.env.local`.

### Možnost B – HTTP endpoint (přes Workers API)

```bash
curl -X POST https://slavicalliance.cz/vysledky/api/push/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_PASSWORD>" \
  -d '{"title":"Test","body":"Výsledky jsou ready."}'
```

Odpověď: `{ "sent": 2, "failed": 0, "total": 2 }`

---

## Instalace PWA na Androidu

1. Otevři **Chrome** na `https://slavicalliance.cz/vysledky`.
2. Stiskni tři tečky (menu) → **„Přidat na plochu"** (nebo **„Nainstalovat aplikaci"**).
3. Potvrď instalaci.
4. Aplikace se přidá na plochu a otevírá se jako standalone bez adresního řádku.

Alternativně: banner ve spodní části stránky nabídne instalaci automaticky.

---

## Instalace PWA na iPhonu (iOS Safari)

iOS nepodporuje `beforeinstallprompt`. Uživatel musí přidat ručně:

1. Otevři **Safari** na `https://slavicalliance.cz/vysledky`.
2. Klepni na ikonu **Sdílet** (čtverec se šipkou nahoru) v dolní liště.
3. Přejdi dolů a vyber **„Přidat na plochu"**.
4. Potvrď název a klepni **„Přidat"**.

Banner na webu zobrazuje tuto instrukci automaticky na mobilních iOS zařízeních.

---

## Limity iOS PWA

| Funkce | Stav |
|---|---|
| Přidání na plochu | ✓ podporováno (Safari ≥ 11.3) |
| Standalone mód | ✓ funguje |
| Web Push notifikace | ✓ iOS 16.4+ (pouze Safari) |
| `beforeinstallprompt` | ✗ nepodporováno – nelze naprogramovat tlačítko pro instalaci |
| Push notifikace v pozadí | ✓ iOS 16.4+ ale jen pokud je PWA přidaná na plochu |
| Push při zavřeném Safari | ✗ – iOS doručí push jen přes APNs, ne Web Push API |

> **Důležité**: Web Push na iOS 16.4+ funguje **pouze** pokud uživatel přidal PWA na plochu.
> Push do Safari bez přidání na plochu nefunguje.

---

## Limity Web Push

| Funkce | Popis |
|---|---|
| Podpora platforem | Chrome (Android/Desktop), Edge, Firefox, Safari 16.4+ (iOS/macOS) |
| TTL (Time-To-Live) | Push endpoint může zprávu zahazovat pokud TTL uplynul dříve než device online |
| 410/404 od endpointu | Subscription exspirovala – je třeba uložit `enabled = FALSE` a přestat posílat |
| Payload limit | Obvykle ~4 kB po šifrování |
| Push není zdroj pravdy | Zdroj pravdy je vždy server/DB. Push je pouze upozornění – po kliknutí app načte čerstvá data |
| Agresivní caching | Záměrně není implementován – quiz výsledky se fetchují vždy čerstvě ze sítě |
| Rate limiting | Každý push provider (Google FCM, Apple APNs) má vlastní limity – neposílej příliš časté push |

---

## Exspirované subscriptions

HTTP `410 Gone` nebo `404` od push endpointu znamená, že subscription zanikla (uživatel odvolal
povolení nebo přeinstaloval browser). Test endpoint i `scripts/test-push.mjs` tuto situaci
automaticky řeší: nastaví `enabled = FALSE` a vrátí počet exspirovaných subscriptions v odpovědi.

Odpověď test endpointu:
```json
{ "sent": 3, "expired": 1, "failed": 0, "total": 4 }
```

Při budování produkčního odesílacího cron jobu aplikuj stejný vzor ze `sendOne()` v
`apps/results/src/app/api/push/test/route.ts`.
