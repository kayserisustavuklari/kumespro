# iOS Web Push Bildirimleri Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** iOS Safari'de ana ekrana eklenmiş KümesPro PWA'sı için, Android APK'daki yerel bildirimlerle aynı kapsamda (kuluçka sepete alma ve çıkım günü, 08:00 TR) sunucu tetiklemeli Web Push bildirimleri kurmak.

**Architecture:** Supabase `pg_cron`, her gün 05:00 UTC'de `pg_net` ile yeni bir Edge Function'ı (`push-gonder`) tetikler. Fonksiyon bugüne denk gelen kuluçkaları bulur, `push_subscriptions` tablosundaki VAPID abonelere `web-push` ile bildirim gönderir. İstemci tarafında `app.html`/`sw.js`, Capacitor native (APK) dışındaki tüm web/PWA kullanıcılarına abonelik UI'sı sunar.

**Tech Stack:** Supabase (Postgres, pg_cron, pg_net, Vault, Edge Functions/Deno), Web Push API, Service Worker, vanilla JS (mevcut `app.html`/`sw.js` deseni)

**Spec:** `docs/superpowers/specs/2026-08-28-ios-web-push-design.md`

**Proje referansları:** Supabase project_id = `pddkeomtxgygftuuwdzi`. Mevcut Edge Function deseni: `supabase/functions/hesap-sil/index.ts`. Kuluçka alanları: `kuluckalar.baslangic` (date), `kuluckalar.sure` (int gün), `kuluckalar.durum` ('devam'/'tamamlandi'), `kuluckalar.ad`, `kuluckalar.user_id`. Sepete alma günü = `baslangic + (sure-3)` gün; çıkım günü = `baslangic + sure` gün.

---

### Task 1: `push_subscriptions` tablosu ve RLS

**Bu görev Supabase MCP `apply_migration` aracıyla yapılır (dosya değişikliği yok).**

- [ ] **Step 1: Migration'ı uygula**

`mcp__claude_ai_Supabase__apply_migration` çağır:
- `project_id`: `pddkeomtxgygftuuwdzi`
- `name`: `push_subscriptions_tablosu`
- `query`:
```sql
create table public.push_subscriptions (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_all on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 2: Doğrula**

`mcp__claude_ai_Supabase__execute_sql` ile `project_id: pddkeomtxgygftuuwdzi`, `query: "select count(*) from public.push_subscriptions;"` — hatasız `0` dönmeli.

---

### Task 2: pg_cron, pg_net, Vault secret

**Bu görev Supabase MCP araçlarıyla yapılır.**

- [ ] **Step 1: Rastgele cron secret üret**

```bash
openssl rand -hex 24
```

Çıkan değeri **not al** (sonraki adımlarda `<CRON_SECRET>` yerine kullanılacak).

- [ ] **Step 2: Uzantıları etkinleştir ve secret'ı Vault'a kaydet**

`mcp__claude_ai_Supabase__apply_migration` çağır:
- `project_id`: `pddkeomtxgygftuuwdzi`
- `name`: `pg_cron_pg_net_ve_push_secret`
- `query` (`<CRON_SECRET>` yerine Step 1'deki değeri koy):
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('<CRON_SECRET>', 'push_cron_secret');
```

- [ ] **Step 3: Doğrula**

`mcp__claude_ai_Supabase__execute_sql` ile:
```sql
select extname from pg_extension where extname in ('pg_cron','pg_net');
select name from vault.secrets where name = 'push_cron_secret';
```
İki uzantı ve `push_cron_secret` satırı dönmeli.

---

### Task 3: VAPID anahtar çifti üret

- [ ] **Step 1: Anahtarları üret**

```bash
npx --yes web-push generate-vapid-keys
```

Çıktıdaki `Public Key` ve `Private Key` değerlerini not al. Bunlar Task 4 (Edge Function secrets) ve Task 8'de (`app.html`) kullanılacak.

---

### Task 4: `push-gonder` Edge Function

**Files:**
- Create: `supabase/functions/push-gonder/index.ts`

- [ ] **Step 1: Fonksiyon dosyasını yaz**

```typescript
// push-gonder — pg_cron tarafından her gün 08:00 TR'de tetiklenir.
// Bugüne denk gelen kuluçka sepete alma (çıkım-3) ve çıkım günü hatırlatmalarını
// push_subscriptions tablosundaki VAPID abonelere web push ile gönderir.
//
// Çağıran doğrulaması: kullanıcı JWT'si değil, pg_cron'un gönderdiği sabit
// X-Cron-Secret header'ı (Vault'taki push_cron_secret ile aynı değer).
//
// Deploy: Supabase MCP deploy_edge_function (verify_jwt: false)
// Gerekli Edge Function secrets: PUSH_CRON_SECRET, VAPID_SUBJECT,
// VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY
// runtime tarafından otomatik sağlanır)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

function bugunIstanbul(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
}

function eklemeliTarih(baslangic: string, gun: number): string {
  const d = new Date(baslangic + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + gun);
  return d.toISOString().slice(0, 10);
}

interface KuluckaSatiri {
  id: string;
  user_id: string;
  ad: string;
  baslangic: string;
  sure: number;
}

interface AbonelikSatiri {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

Deno.serve(async (req: Request) => {
  if (req.headers.get("X-Cron-Secret") !== Deno.env.get("PUSH_CRON_SECRET")) {
    return new Response(JSON.stringify({ error: "Yetkisiz" }), { status: 401 });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT")!,
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );

  const bugun = bugunIstanbul();

  const { data: kuluckalar, error: kErr } = await admin
    .from("kuluckalar")
    .select("id, user_id, ad, baslangic, sure")
    .eq("durum", "devam");
  if (kErr) return new Response(JSON.stringify({ error: kErr.message }), { status: 500 });

  const bildirimler: { user_id: string; baslik: string; govde: string }[] = [];
  for (const k of (kuluckalar ?? []) as KuluckaSatiri[]) {
    if (!k.baslangic || !k.sure) continue;
    if (eklemeliTarih(k.baslangic, k.sure - 3) === bugun) {
      bildirimler.push({
        user_id: k.user_id,
        baslik: "🧺 Sepete Alma Zamanı",
        govde: `"${k.ad}" kuluçkası bugün sepete alınmalı.`,
      });
    }
    if (eklemeliTarih(k.baslangic, k.sure) === bugun) {
      bildirimler.push({
        user_id: k.user_id,
        baslik: "🐣 Çıkım Günü",
        govde: `"${k.ad}" kuluçkasının çıkım günü bugün.`,
      });
    }
  }

  if (!bildirimler.length) {
    return new Response(JSON.stringify({ ok: true, gonderilen: 0 }), { status: 200 });
  }

  const userIds = [...new Set(bildirimler.map((b) => b.user_id))];
  const { data: abonelikler, error: aErr } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (aErr) return new Response(JSON.stringify({ error: aErr.message }), { status: 500 });

  let gonderilen = 0;
  for (const bildirim of bildirimler) {
    const hedefler = ((abonelikler ?? []) as AbonelikSatiri[]).filter(
      (a) => a.user_id === bildirim.user_id,
    );
    for (const abone of hedefler) {
      try {
        await webpush.sendNotification(
          { endpoint: abone.endpoint, keys: { p256dh: abone.p256dh, auth: abone.auth } },
          JSON.stringify({ title: bildirim.baslik, body: bildirim.govde }),
        );
        gonderilen++;
      } catch (e) {
        const statusCode = (e as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", abone.id);
        } else {
          console.warn("[push-gonder] Gönderim hatası:", abone.id, e);
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, gonderilen }), { status: 200 });
});
```

- [ ] **Step 2: Deploy et**

`mcp__claude_ai_Supabase__deploy_edge_function` çağır:
- `project_id`: `pddkeomtxgygftuuwdzi`
- `name`: `push-gonder`
- `entrypoint_path`: `index.ts`
- `verify_jwt`: `false`
- `files`: `[{"name": "index.ts", "content": "<Step 1'deki tam dosya içeriği>"}]`

- [ ] **Step 3: Edge Function secrets'ı elle ayarla (MCP bu adımı desteklemiyor)**

Supabase Dashboard → Project `kumespro` → Edge Functions → `push-gonder` → Secrets (veya `npx supabase login` sonrası `npx supabase secrets set --project-ref pddkeomtxgygftuuwdzi ...`) ile şu dört değeri gir:
- `PUSH_CRON_SECRET` = Task 2 Step 1'deki değer
- `VAPID_SUBJECT` = `mailto:saimkamil@gmail.com`
- `VAPID_PUBLIC_KEY` = Task 3'teki Public Key
- `VAPID_PRIVATE_KEY` = Task 3'teki Private Key

- [ ] **Step 4: Elle doğrula**

```bash
curl -i -X POST https://pddkeomtxgygftuuwdzi.supabase.co/functions/v1/push-gonder \
  -H "X-Cron-Secret: <Task 2 Step 1 degeri>"
```
Beklenen: `200` ve `{"ok":true,"gonderilen":0}` (henüz abonelik yoksa). Yanlış secret ile `401` dönmeli — bunu da bir kez dene.

---

### Task 5: pg_cron job

**Bu görev Supabase MCP `apply_migration` ile yapılır.**

- [ ] **Step 1: Cron job'u oluştur**

`mcp__claude_ai_Supabase__apply_migration` çağır:
- `project_id`: `pddkeomtxgygftuuwdzi`
- `name`: `push_gonder_cron_job`
- `query`:
```sql
select cron.schedule(
  'push-gonder-daily',
  '0 5 * * *',
  $$
  select net.http_post(
    url := 'https://pddkeomtxgygftuuwdzi.supabase.co/functions/v1/push-gonder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

- [ ] **Step 2: Doğrula**

`mcp__claude_ai_Supabase__execute_sql` ile `select jobname, schedule, active from cron.job where jobname = 'push-gonder-daily';` — bir satır, `active = true` dönmeli.

---

### Task 6: `sw.js` — push ve notificationclick

**Files:**
- Modify: `sw.js`

- [ ] **Step 1: Sürüm yorumunu ve CACHE adını güncelle**

`sw.js:1-2` mevcut hali:
```javascript
// KümesPro Service Worker v7.11
const CACHE = 'kumespro-v711';
```
Yeni hali:
```javascript
// KümesPro Service Worker v7.12
const CACHE = 'kumespro-v712';
```

- [ ] **Step 2: push ve notificationclick listener'larını dosyanın sonuna ekle**

`sw.js` sonuna (mevcut son satırdan sonra) ekle:
```javascript

// Web Push — yalnızca web/PWA kullanıcıları abone olabilir (APK kendi native bildirimini kullanır)
self.addEventListener('push', (e) => {
  let data = { title: 'KümesPro', body: 'Yeni bildirim' };
  try { if (e.data) data = e.data.json(); } catch (err) { /* varsayılan kullanılır */ }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/kumespro/logo_.png',
      badge: '/kumespro/logo_.png',
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/kumespro/') && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/kumespro/app.html');
    })
  );
});
```

- [ ] **Step 3: Commit**

```bash
git add sw.js
git commit -m "feat: sw.js'e web push notificationclick destegi ekle"
```

---

### Task 7: `app.html` — VAPID public key ve web push aboneliği

**Files:**
- Modify: `app.html`

- [ ] **Step 1: VAPID public key sabitini ekle**

`app.html:1255-1256` civarındaki (SUPABASE_URL/SUPABASE_KEY tanımının hemen altına) satırı bul, altına ekle:
```javascript
const VAPID_PUBLIC_KEY = '<Task 3 Public Key>';
```

- [ ] **Step 2: base64→Uint8Array yardımcı fonksiyonu ekle**

`bildirimDurumGuncelle` fonksiyonundan hemen önce (app.html:3464 civarı, "BİLDİRİM DURUMU KARTI" yorumundan önce) ekle:
```javascript
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
```

- [ ] **Step 3: Bilgi sekmesine yeni kart ekle**

`app.html:647` (`bildirimKart` kapanış `</div>`) satırından hemen sonra ekle:
```html
    <!-- Web Push (yalnızca web/PWA; APK kendi native bildirimini kullanır) -->
    <div class="divlabel" id="webPushBaslik" style="display:none">Bildirimler</div>
    <div class="card mb8" id="webPushKart" style="display:none">
      <div class="row mb8">
        <div>
          <div class="f13 fw">🔔 Kuluçka Hatırlatmaları</div>
          <div class="f11 c2 mt4">Sepete alma (çıkım − 3 gün) ve çıkım günü sabah 08:00'de bildirim</div>
        </div>
        <span style="font-size:24px" id="webPushIkon">🔔</span>
      </div>
      <div id="webPushDurum" style="font-size:12px;line-height:1.7"></div>
    </div>
```

- [ ] **Step 4: Durum ve abone olma fonksiyonlarını ekle**

`bildirimIzinIste` fonksiyonunun kapanışından hemen sonra (app.html:3514 civarı) ekle:
```javascript
// ─── WEB PUSH KARTI (Bilgi sekmesi, yalnızca web/PWA — APK haric) ─────
async function webPushDurumGuncelle() {
  const kart = document.getElementById('webPushKart');
  const baslik = document.getElementById('webPushBaslik');
  const kutu = document.getElementById('webPushDurum');
  const ikon = document.getElementById('webPushIkon');
  if (!kart || !kutu) return;

  if (isCapacitorNative || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    kart.style.display = 'none'; if (baslik) baslik.style.display = 'none';
    return;
  }
  kart.style.display = ''; if (baslik) baslik.style.display = '';

  if (isIOS && !isStandalone) {
    if (ikon) ikon.textContent = '📲';
    kutu.innerHTML = `<div class="f11 c2" style="margin-bottom:8px">iPhone/iPad'de bildirim alabilmek için önce uygulamayı ana ekrana eklemen gerekiyor:</div>
      <div class="f11 c2">1️⃣ Safari'de alttaki <b>Paylaş</b> ikonuna dokun<br>2️⃣ <b>Ana Ekrana Ekle</b>'yi seç<br>3️⃣ Ana ekrandaki KümesPro simgesinden aç, buraya geri dön</div>`;
    return;
  }

  const izin = window.Notification ? Notification.permission : 'denied';
  if (izin === 'granted') {
    if (ikon) ikon.textContent = '✅';
    kutu.innerHTML = `<div style="color:var(--green);font-weight:600">✅ Bildirimler açık</div>
      <div class="f11 c2 mt4">Aktif kuluçkalarınız için sepete alma ve çıkım günü hatırlatmaları otomatik gönderilecek.</div>`;
  } else if (izin === 'denied') {
    if (ikon) ikon.textContent = '🔕';
    kutu.innerHTML = `<div class="al al-w" style="font-size:11px;margin-bottom:8px">🔕 <b>Bildirimler kapalı.</b> Kuluçka hatırlatmaları gönderilemiyor.</div>
      <div class="f11 c2">Tarayıcı adres çubuğundaki kilit/site ayarları simgesinden bu site için bildirim iznini açıp sayfayı yenileyin.</div>`;
  } else {
    if (ikon) ikon.textContent = '🔔';
    kutu.innerHTML = `<div class="f11 c2" style="margin-bottom:8px">Hatırlatmaların çalışması için bildirim izni gerekir. İzin verdiğinizde aktif kuluçkalarınız için sepete alma ve çıkım günü hatırlatmaları otomatik kurulur.</div>
      <button class="btn btn-p" onclick="webPushAboneOl()" style="background:linear-gradient(135deg,var(--ora),var(--ora-d))">🔔 &nbsp;Bildirimlere İzin Ver</button>`;
  }
}

async function webPushAboneOl() {
  try {
    const izin = await Notification.requestPermission();
    if (izin !== 'granted') {
      toast('🔕 Bildirim izni verilmedi', 'err', 3500);
      webPushDurumGuncelle();
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    const j = sub.toJSON();
    const { error } = await sb.from('push_subscriptions').upsert({
      user_id: currentUser.id,
      endpoint: j.endpoint,
      p256dh: j.keys.p256dh,
      auth: j.keys.auth,
    }, { onConflict: 'user_id,endpoint' });
    if (error) throw error;
    toast('✅ Bildirimler açıldı', 'ok');
  } catch (e) {
    console.warn('[KP] Web push abonelik hatası:', e);
    toast('🔕 Bildirim aboneliği kurulamadı', 'err', 3500);
  }
  webPushDurumGuncelle();
}
```

- [ ] **Step 5: `rInfo()` içinden çağır**

`app.html:3461` (`bildirimDurumGuncelle();` satırı, `rInfo()` fonksiyonu içinde) hemen altına ekle:
```javascript
  webPushDurumGuncelle();
```

- [ ] **Step 6: Sürüm sabitlerini güncelle**

`app.html:604`:
```html
      <div style="display:inline-block;background:linear-gradient(135deg,var(--ora),var(--ora-d));color:#fff;font-size:11px;font-weight:700;padding:4px 16px;border-radius:30px;margin-top:8px;letter-spacing:.6px">SÜRÜM 7.12</div>
```
`app.html:755`:
```html
      <div class="f10 fw" style="letter-spacing:.5px">KümesPro v7.12 · HTML5 · PWA</div>
```
`app.html:4402`:
```javascript
const APP_VERSION = '7.12';
```

- [ ] **Step 7: Commit**

```bash
git add app.html
git commit -m "feat: iOS/web PWA icin web push bildirim abonelik UI'si ekle (v7.12)"
```

---

### Task 8: `index.html` sürüm güncellemesi

**Files:**
- Modify: `index.html`

- [ ] **Step 1: SW log satırını güncelle**

`index.html:254`:
```javascript
          .then(r => console.log('[SW] v7.12 Registered:', r.scope))
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "chore: index.html SW log surumu 7.12'ye guncelle"
```

---

### Task 9: README sürüm geçmişi

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Yeni satırı ekle**

`README.md:56-58` civarındaki tabloya, `| **7.11** | ... |` satırının üstüne yeni satır ekle:
```markdown
| **7.12** | **iOS ana ekran bildirimleri**: PWA olarak ana ekrana eklenmiş kullanıcılar (iOS dahil) artık kuluçka sepete alma ve çıkım günü için Web Push bildirimi alabiliyor — sunucu tarafında Supabase pg_cron her gün 08:00'de kontrol ediyor |
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README surum gecmisine 7.12 ekle"
```

---

### Task 10: Uçtan uca manuel doğrulama

Otomatik test altyapısı olmadığından bu adımlar elle yapılır (spec'teki test planıyla birebir).

- [ ] **Step 1: Masaüstü Chrome'da abonelik testi**

`python -m http.server` ile projeyi yerelde aç (veya GitHub Pages'e push sonrası canlıda dene), giriş yap, Bilgi sekmesinde "🔔 Bildirimlere İzin Ver" butonuna bas, tarayıcı izin isteğini onayla. `webPushDurumGuncelle()` "✅ Bildirimler açık" göstermeli. Supabase `push_subscriptions` tablosunda yeni bir satır oluştuğunu `execute_sql` ile doğrula: `select count(*) from public.push_subscriptions;`

- [ ] **Step 2: Test kuluçkasıyla gönderim testi**

`kuluckalar` tablosunda `baslangic`'i bugünün tarihinden `sure - 3` gün öncesine ayarlanmış (yani sepete alma bugüne denk gelen) geçici bir test kaydı oluştur veya mevcut bir "devam" kuluçkasının tarihini geçici olarak buna göre ayarla. `push-gonder` fonksiyonunu Task 4 Step 4'teki curl komutuyla elle tetikle. Tarayıcıda bildirimin geldiğini doğrula, bildirime tıklayınca uygulamanın odaklandığını/açıldığını doğrula. Test için değiştirdiğin tarihi geri al.

- [ ] **Step 3: Süresi dolmuş abonelik temizliği**

Tarayıcı ayarlarından site bildirim iznini "engelle"ye çevir (veya `pushManager` aboneliğini `sub.unsubscribe()` ile konsoldan iptal et), `push-gonder`'ı tekrar tetikle, ilgili `push_subscriptions` satırının 410 sonrası silindiğini `execute_sql` ile doğrula.

- [ ] **Step 4: iOS Safari standalone testi**

Gerçek bir iPhone'da Safari'de siteyi aç (henüz ana ekrana eklenmemiş) → Bilgi sekmesinde "Ana Ekrana Ekle" adımlarının göründüğünü doğrula → Paylaş → Ana Ekrana Ekle → ana ekrandan aç → "Bildirimlere İzin Ver" butonu görünmeli → izin ver → Step 2'deki gönderim testini iOS cihazda tekrarla.

- [ ] **Step 5: Android APK'nın etkilenmediğini doğrula**

`C:\apk\kumestakip-apk` APK'sını (mevcut derlenmiş sürüm) aç, Bilgi sekmesinde yalnızca mevcut `bildirimKart`'ın (native) göründüğünü, yeni `webPushKart`'ın hiç render edilmediğini doğrula (`isCapacitorNative` kontrolü). Not: APK, GitHub Pages'ten HTML yüklediği için `git push` sonrası APK'yı kapatıp yeniden açman yeterli, yeniden derleme gerekmez.

- [ ] **Step 6: Push et**

```bash
git push
```
