# Kümespro 7
v7.0 yayında! 🎉
🔧 Civciv Ünitesi Düzeltmeleri

1. Toplam senkronizasyonu

Açılışta otomatik kontrol: ünite toplamı parti kalanları toplamı ile eşleşmiyorsa düzeltilir
Console'a uyarı bırakır: [Sync] Ünite "X": DB=105, parti toplamı=90. Parti toplamı esas alındı.
Ardından DB'ye doğru değer yazılır → 105 → 90'a iner

2. Parti düzenleme (yeni!) ✏️

Her aktif parti kartının altında "✏️ Düzenle" butonu
Açılan modalda: Kaynak adı, Başlangıç adeti, Kalan adet, tarih, not düzenlenebilir
Kalan değiştirilirse ünite toplamı otomatik senkronize olur
"🗑 Partiyi Sil" seçeneği de var → kalan adet kadar üniteden düşülür


3. Parti bazlı çıkarma ➖


Her aktif parti kartının altında "➖ Çıkar (Ölüm)" butonu
Modalda partinin bilgisi gösterilir (kaynak, kalan, yaş)
Adet, sebep (not) ve tarih girilir → o parti'den kesinlikle düşülür
Artık FIFO karmaşası yok, hangi partiden çıkardığın net

4. Ünite ana butonu sadeleşti

Eski "Ekle / Çıkar" yerine tek buton: "🐣 Yeni Parti Ekle"
Çıkarma artık her parti kartının içinde — partiyi bilmeden çıkarma yapılmasın

🎉 Güncelleme Bildirimi (yeni!)

Program çalışırken yeni sürüm geldiğinde üstte yeşil banner çıkar:

  🎉 Uygulama Güncellemesi Mevcut!
  
     Yeni özelliklere geçmek için yeniden başlatın.
                              [🔄 Yeniden Başlat]

Kullanıcı butona basınca "Güncelleme uygulanıyor..." spinner gösterir, sayfa yenilenir
× ile banner kapatılabilir (sonradan tekrar yenileyince yine çıkar)
30 dakikada bir otomatik kontrol — açık kalmış sayfalar da güncelleme görür
Sekmeyi geri açınca da kontrol edilir

v6.7 yayında! 🦚

Yapılan Güncellemeler

🦚 Tavus Kuşu kuluçkası

Yeni kuluçka oluştururken seçilebilir: 🦚 Tavus Kuşu — 28 gün

Kuluçka süresi 28 gün olarak otomatik ayarlanır

Hindi/Kaz ile aynı süre olduğu için ekipman planlamasında uyumlu

 Ne Yapabiliyor?
 
🏠 Kümes Yönetimi

Sınırsız kümes, her kümeste birden fazla ırk/grup (Brahma, Leghorn, Bıldırcın, Keklik, Güvercin...), erkek/dişi ayrımı, doğum tarihi ve yaş takibi, hayvan ekle/çıkar geçmişi

🥚 Kuluçka Takibi

Farklı kümeslerden çoklu yumurta kaynağı, otomatik ilerleme çubuğu ve gün sayacı, çıkım sonuçları (çıkan/boş/ölü), verim yüzdesi hesaplama, bıldırcın (17g), keklik (23g), tavuk (21g) dahil tüm türler için süre seçimi

🐣 Civciv Ünitesi

Manuel civciv ekleme/çıkarma, çıkım tarihi kaydı, tam hareket geçmişi, toplam giren/çıkan istatistikleri

💰 Satış Modülü

Tek satışta karışık ürün (hayvan + civciv + yumurta), satış stoktan otomatik düşer, müşteri kaydı, satış düzenleme/silme, türe göre filtreleme

📊 Finans Takibi

Kategorili gider (yem, ilaç, enerji, kümes, ekipman...), kümes bazlı gider takibi, gider düzenleme/silme, otomatik net kâr/zarar hesaplama

☁️ Bulut & Güvenlik

Google hesabı ile güvenli giriş, Supabase bulut veritabanı (her kullanıcı sadece kendi verisini görür), JSON yedek alma ve tam geri yükleme, çevrimdışı çalışma (PWA)

📱 Mobil & Masaüstü

Ana ekrana/masaüstüne uygulama olarak kurulabilir, tam ekran çalışır, iOS/Android/Windows/Mac uyumlu

6.5 ile Yapılan Değişiklikler

📊 Excel/CSV Aktarım (Bilgi sekmesi):

Tüm Rapor → Kümesler + Satışlar + Giderler + Finansal özet tek dosyada
Satışlar → Tarih, müşteri, ürünler, toplam, ödenen, kalan
Giderler → Tarih, tür, açıklama, tutar, ödenen, kalan
Kümesler → Kümes, tür, ırk, erkek, dişi, toplam
Türkçe karakter desteği için BOM ile kaydediliyor, Excel direkt açıyor

💰 Kısmi Ödeme Takibi:

Satış ve gider kaydederken Ödenen Tutar girin → Kalan Borç otomatik hesaplanır
Ödenen boş bırakılırsa tam ödenmiş sayılır
Satış listesinde kırmızı "Ödenen / Kalan" satırı görünür, tahsil edilenlerde ✅
Finans sayfasında da aynı şekilde gider borçları görünür

📥 Ana Sayfada Bekleyen Ödemeler:

Müşterilerden Alacaklarım (satışlardaki kalan)
Ödenecek Borçlarım (giderlerdeki kalan)
İkisi de sıfırsa "✅ Bekleyen ödeme yok" gösterilir

🔄 Yedek Sonrası Otomatik Cache Temizleme:

Yedek yüklendikten sonra SW önbelleği otomatik temizleniyor
Bir sonraki açılışta taze verilerle gelecek, "veriler yükleniyor"da kalmayacak
