# iOS Ana Ekran Web Push Bildirimleri — Tasarım

**Tarih:** 2026-08-28
**Durum:** Onaylandı

## Amaç

Android APK, Capacitor `LocalNotifications` ile kuluçka sepete alma (çıkım−3) ve çıkım günü için yerel bildirim veriyor. iOS'ta native uygulama yok; kullanıcılar `app.html`'i Safari'de "Ana Ekrana Ekle" ile PWA olarak kullanıyor. iOS Safari, cihazda kendi kendine zamanlanan bildirimi desteklemiyor — yalnızca sunucudan tetiklenen Web Push (iOS 16.4+, sadece standalone modda) çalışıyor. Bu tasarım, aynı bildirim kapsamını (sepete alma + çıkım günü, 08:00 TR) Web Push üzerinden tüm web/PWA kullanıcılarına (Capaitor/APK hariç) sağlamayı hedefliyor.

## Kapsam

- Bildirim içeriği ve zamanlaması Android ile birebir aynı: sepete alma (çıkım−3) ve çıkım günü, saat 08:00 Türkiye saati.
- Hedef kitle: Capacitor native (APK) dışındaki tüm web/PWA kullanıcıları — iOS dahil, Android tarayıcı/masaüstü de dahil. APK zaten kendi yerel bildirimini kullandığı için web push UI'sı APK'da hiç gösterilmez.
- iOS Safari'de push aboneliği yalnızca standalone (ana ekrana eklenmiş) modda çalışır; kullanıcı henüz eklememişse abonelik butonu yerine "Paylaş → Ana Ekrana Ekle" adımlarını gösteren bir uyarı çıkar.

## Mimari

Supabase `pg_cron`, her gün **05:00 UTC (08:00 TR)** `pg_net` ile yeni bir Edge Function'ı (`push-gonder`) tetikler. Fonksiyon o günün sepete alma/çıkım tarihine denk gelen kuluçkaları bulur, ilgili kullanıcıların kayıtlı push aboneliklerine VAPID imzalı Web Push mesajı gönderir. Bu, mevcut `hesap-sil` Edge Function desenine (Supabase içi, dış servis yok) paralel bir yapı.

## Bileşenler

### 1. `push_subscriptions` tablosu (yeni)
- Kolonlar: `id, user_id, endpoint, p256dh, auth, created_at`
- RLS: diğer tablolar gibi `user_id` bazlı, kullanıcı yalnızca kendi aboneliğini okuyup yazabilir
- `unique(user_id, endpoint)` — aynı cihazdan tekrar abone olma durumunda upsert

### 2. VAPID anahtar çifti
- Public key `app.html` içine gömülür (mevcut `SUPABASE_URL`/`SUPABASE_KEY` sabitleriyle aynı yerde)
- Private key + subject (mailto:saimkamil@gmail.com) Edge Function secret olarak Supabase'e kaydedilir, repoya girmez

### 3. `sw.js` genişletmesi
- `self.addEventListener('push', ...)` — gelen payload'ı `showNotification` ile gösterir
- `self.addEventListener('notificationclick', ...)` — uygulamayı açar/odaklar
- Mevcut offline-cache mantığına dokunulmaz

### 4. `app.html` istemci tarafı
- Bilgi sekmesinde, 7.9'daki Android bildirim durum kartının web-push eşdeğeri (`#webPushKart`)
- Yalnızca `!Capacitor.isNativePlatform()` ise gösterilir (APK'da hiç render edilmez)
- Üç durum: **granted** (abone, "Kapat" seçeneği yok — tarayıcı ayarından yönetilir), **denied** (tarayıcı bildirim izni engellenmiş, adımlar gösterilir), **prompt** (abone ol butonu)
- iOS özel durumu: `navigator.standalone !== true` && iOS UA ise, abone ol butonu yerine "Paylaş → Ana Ekrana Ekle" adımlı uyarı
- Abone olma akışı: `Notification.requestPermission()` → `registration.pushManager.subscribe({userVisibleOnly:true, applicationServerKey: VAPID_PUBLIC})` → `sb.from('push_subscriptions').upsert(...)`

### 5. `push-gonder` Edge Function (yeni)
- `verify_jwt off` (hesap-sil ile aynı sebep: CORS/cron çağrısı JWT taşımaz)
- Çağıran doğrulaması: pg_cron isteğinde sabit bir paylaşılan-sır header (`X-Cron-Secret`) taşınır, fonksiyon bunu Edge Function secret'ıyla karşılaştırır — kullanıcı JWT'si değil, cron-özel statik sır
- `npm:web-push` kütüphanesiyle VAPID imzalı gönderim
- Mantık: `Europe/Istanbul` bugünkü tarihe göre `kuluckalar` tablosunda `durum='devam'` ve (`baslangicTarihi + sure - 3 gün == bugün` veya `baslangicTarihi + sure == bugün`) olan kayıtları bul → `user_id` bazında grupla → her `user_id` için `push_subscriptions` satırlarını çek → gönder

### 6. pg_cron job
- `cron.schedule('push-gonder-daily', '0 5 * * *', $$ select net.http_post(url:='.../functions/v1/push-gonder', headers:=jsonb_build_object('X-Cron-Secret', '<secret>'), body:='{}'::jsonb) $$)`

## Veri Akışı

```
pg_cron (05:00 UTC)
  → pg_net http_post → push-gonder Edge Function
    → kuluckalar sorgusu (bugünün sepete alma/çıkım tarihleri)
    → user_id bazında grupla
    → push_subscriptions sorgusu (her user_id için)
    → web-push gönderimi (her abonelik için)
```

İstemci tarafı (bağımsız akış):
```
Bilgi sekmesi → "Bildirimleri Aç" → Notification.requestPermission()
  → pushManager.subscribe() → push_subscriptions'a upsert
```

## Hata Yönetimi

- Push gönderiminde 404/410 (süresi dolmuş/iptal edilmiş abonelik) dönerse ilgili `push_subscriptions` satırı otomatik silinir
- Diğer gönderim hataları loglanır, batch'in geri kalanı durdurulmaz (bir kullanıcının hatası diğerini etkilemez)
- İstemci tarafında abonelik hatası (`requestPermission` reddi, `subscribe` hatası) toast ile gösterilir, sessizce yutulmaz
- `push-gonder` cron secret uyuşmazlığında 401 döner, gönderim yapılmaz

## Test Planı

Projede otomatik test altyapısı yok (build'siz statik HTML/JS). Manuel doğrulama:
1. iOS Safari'de PWA'yı ana ekrana ekle, standalone modda aç, "Bildirimleri Aç" ile abone ol
2. Supabase dashboard'dan `push-gonder` fonksiyonunu elle tetikle (test kuluçka kaydıyla), bildirimin cihaza düştüğünü doğrula
3. Bildirime dokunulduğunda uygulamanın açıldığını doğrula
4. Aboneliği tarayıcı ayarından iptal edip fonksiyonu tekrar tetikleyerek `push_subscriptions` satırının 410 sonrası silindiğini doğrula
5. Android APK'da kartın hiç görünmediğini, mevcut native bildirim akışının etkilenmediğini doğrula
6. Android tarayıcıdan (Chrome) PWA olarak da abone olunabildiğini doğrula
