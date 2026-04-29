# Kümespro 6.5
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
