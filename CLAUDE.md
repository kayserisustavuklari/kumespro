# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proje Yapısı

Bu proje bir **build sistemi olmayan, saf HTML/CSS/JS** uygulamasıdır. Vite, React veya npm yoktur.

- `index.html` — Giriş/login sayfası (Supabase Google OAuth)
- `app.html` — Ana uygulama (4000+ satır, tüm CSS + HTML + JS tek dosyada)
- `sw.js` — Service Worker (PWA offline desteği)
- `manifest.json` — PWA manifest

Geliştirme için dosyayı doğrudan tarayıcıda aç ya da `python -m http.server` gibi basit bir statik sunucu kullan. Build adımı yoktur.

## Mimari

**Stack:** Vanilla JavaScript + Supabase JS SDK (CDN) + inline CSS

**Veri akışı:**
- Tüm uygulama verisi `D` adlı global nesnede tutulur: `D = { kumesler, kuluckalar, civcivUniteleri, satislar, giderler }`
- Sayfa yüklenince `dbYukle()` tüm tabloları Supabase'den çekip `D`'yi doldurur; aynı zamanda `sezonArsivi` listesini de Supabase `sezonlar` tablosundan yükler
- Her mutasyon (`dbKumesGuncelle`, `dbKuluckaEkle`, vb.) hem Supabase'i hem `D`'yi günceller
- Render fonksiyonları (`rDash`, `rKumesler`, `rKuluckalar`, vb.) `D`'yi okuyup `innerHTML` ile ekranı çizer — framework yoktur

**Sezon yönetimi:**
- `curSezon` global değişkeni: `null` = canlı veri görüntüleniyor; obje = arşivlenmiş sezon görüntüleniyor
- `sezonArsivi` — `sezonlar` tablosundan yüklenen sezon listesi (bellekte cache)
- Yeni sezon oluşturunca mevcut tüm veri `sezonlar` tablosuna snapshot olarak INSERT edilir; satış/gider/tamamlanmış kuluçkalar silinir; kümesler ve hayvanlar canlı tabloda bırakılır
- Arşivlenmiş sezon görüntülenirken `D` geçici olarak snapshot verisiyle doldurulur, üstte turuncu banner gösterilir; tüm yazma fonksiyonları (`saveSat`, `saveGid`, `saveK`) `curSezon` kontrolüyle engellenir
- `canliVeriyeDon()` → `dbYukle()` çağırır, `curSezon = null` yapılır, banner kaldırılır

**Kimlik doğrulama:** Supabase Google OAuth (implicit flow). `currentUser` global değişkeni kullanıcı nesnesini tutar. `index.html` login sayfasıdır, başarılı girişte `app.html`'e yönlendirir.

**Supabase bağlantısı:** `SUPABASE_URL` ve `SUPABASE_KEY` sabitleri `app.html` içinde (`index.html` ile aynı) kodlanmıştır. Her iki dosyada da aynı değerler olmalıdır.

**Tablo yapısı (tüm tablolar `user_id` ile kullanıcıya özeldir):**
- `kumesler` — kümesler; `irklar[]` JSONB, `hareketler[]` JSONB
- `kuluckalar` — kuluçka kayıtları; `kaynaklar[]`, `cikim` JSONB
- `civciv_uniteleri` — civciv/yavru güvercin üniteleri; `hareketler[]` JSONB (ilk eleman `{_meta:true, tip}` şeklinde tip bilgisi taşır)
- `satislar` — satış kayıtları; `urunler[]` JSONB
- `giderler` — gider kayıtları
- `sezonlar` — sezon arşivleri; `veri` JSONB (tüm veri snapshot'ı: kumesler, kuluckalar, civcivUniteleri, satislar, giderler)

**Navigasyon:** Alt tab bar ile sekme geçişi. `goTab(t)` → `curTab` değişkenini günceller, ilgili `r*()` render fonksiyonunu çağırır. Sekme isimleri: `anasayfa`, `kumesler`, `kulucka`, `satis`, `finans`, `info`.

**Modallar:** `openM(id)` / `closeM(id)` ile `.mo` class'lı div'ler açılıp kapanır.

## Önemli Alan Kavramları (Türkçe değişken adları)

- `ad` — isim
- `tur` — tür: `guvercin`, `tavuk`, `hindi`, `kaz`, `karisik`, `bildircin`, `keklik`, `tavus`, `diger`
- `irklar` — ırk listesi `[{id, ad, erkek, disi}]`
- `hareketler` — hareket geçmişi `[{islem:'ekle'|'cikar', erkek, disi, tarih, ...}]`
- `erkek` / `disi` — cinsiyet sayıları
- `islem` — işlem tipi: `'ekle'` (giriş) veya `'cikar'` (çıkış)
- `kalan` — civciv ünitelerinde partide kalan adet
- `partiId` — civciv ünitelerinde her "ekle" hareketinin benzersiz kimliği
- `durum` — kuluçka durumu: `'devam'` veya `'tamamlandi'`
- `cikim` — kuluçka çıkım sonuçları JSONB
- `tip` — civciv ünitesi türü: `'civciv'` veya `'yavru_guvercin'`
- `gelir` / `gider` — finans kayıt tipi
- `sezonArsivi` — Supabase'den yüklenen arşivlenmiş sezon listesi `[{id, ad, tarih, veri}]`
- `curSezon` — aktif arşiv görünümü; `null` ise canlı veri gösteriliyor

## CSS Tasarım Sistemi

CSS custom property'leri `app.html` içindeki `<style>` bloğunun başında tanımlıdır:
- `--pri` / `--pri-d` / `--pri-l` — mavi ana renk
- `--ora` / `--ora-d` / `--ora-l` — turuncu vurgu rengi
- `--gr0`…`--gr6` — gri tonları (koyu → açık)
- `--green` / `--red` — durum renkleri

**Önemli:** `.btn-p` sınıfı `width:100%` içerir (tam genişlik CTA buton). Filtre gibi dar yerlerde kullanılacaksa mutlaka `style="width:auto"` veya JS'de `b.style.width='auto'` ekle.

Yazı tipleri CDN'den yüklenir: `Dela Gothic One` (logo/başlıklar), `Instrument Sans` (gövde).

## Önemli Özellik Notları

**Üniteden kümese aktarım:**
- Ünite kartındaki her aktif partide (kalan > 0) "🏠 Kümese Aktar" butonu → `aktarParti(uId, partiId)` → `mUniteAktar` modalı
- Kullanıcı hedef kümesi, ırkı (`paIrkDoldur()`; `__yeni` seçeneği partinin kaynak adıyla yeni ırk oluşturur) ve erkek/dişi adetlerini girer (toplam ≤ parti kalan)
- `saveAktar()`: partiden düşer + üniteye `cikar` hareketi, kümeste ırkın erkek/dişi artar + `ekle` hareketi (`dogumTarihi` olarak partinin tarihi taşınır); `Promise.all([dbUniteGuncelle, dbKumesGuncelle])`

**Alacaklarım — kişi kartları:**
- `showAlacakDetay()` ödenmemiş satışları müşteri adına göre gruplar (boş ad → 'Anonim'), toplam alacağa göre sıralar
- Kişi kartına tıklayınca accordion detay açılır (`adGrup{i}` div toggle); her satışta "✅ Alındı" butonu → `alacakAlindi(id, kalan)` → `satisBorcAl()` + liste tazeleme

**Logo:**
- Uygulama logosu `app.html` (5 yer) ve `index.html` (3 yer) içine base64 PNG olarak gömülüdür; kaynak dosya repo kökündeki `logo_.png`
- Logoyu değiştirmek için: mevcut base64 string'i yakala ve her iki dosyada yeni görselin base64'üyle değiştir (tüm kopyalar aynı string'dir)

**Satış — "Alındı" butonu:**
- Kalan borcu olan satış kartlarında "✏️ Düzenle" yanında yeşil "✅ Alındı" butonu çıkar (`sKalan > 0` koşulunda)
- `satisBorcAl(id, kalan)` fonksiyonu confirm dialog gösterir; onaylanırsa `odenen = toplam` yaparak `dbSatisGuncelle` çağırır

**Sezon yönetimi — Info sekmesi:**
- "🌱 Yeni Sezon Başlat" → `openYeniSezon()` → modal → `yeniSezonOlustur()`: snapshot Supabase'e INSERT, canlı satış/gider/tamamlanmış kuluçkalar silinir
- "📂 Sezonları Göster" → `openSezonlar()`: her açılışta Supabase'den güncel liste çeker
- Sezon görüntüleme → `sezonGor(id)`: `D` geçici olarak snapshot'la doldurulur, `rSezonBanner()` turuncu banner gösterir
- Arşivden çıkış: banner'daki "✖ Çık" → `canliVeriyeDon()` → `dbYukle()` ile sıfırlanır
- JSON yedek hem canlı veriyi hem `sezonArsivi`'ni içerir; yedek yüklenirken sezonlar da Supabase'e restore edilir

**Modallar (yeni):**
- `mYeniSezon` — sezon adı girişi ve özet
- `mSezonlar` — arşivlenmiş sezon listesi
