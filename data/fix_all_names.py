import csv
import re
import os

input_file = '/home/admindsaf/Projects/semantic-hakaton/mavi-agent/data/products_ready_fixed.csv'
output_file = '/home/admindsaf/Projects/semantic-hakaton/mavi-agent/data/products_ready_fixed.csv.tmp'

TR_MAPPING = {
    'baskili': 'Baskılı',
    'kapusonlu': 'Kapüşonlu',
    'islemeli': 'İşlemeli',
    'cizgili': 'Çizgili',
    'kisa': 'Kısa',
    'tisort': 'Tişört',
    'gomlek': 'Gömlek',
    'cepli': 'Cepli',
    'detayli': 'Detaylı',
    'hasir': 'Hasır',
    'sapka': 'Şapka',
    'kadin': 'Kadın',
    'erkek': 'Erkek',
    'sac': 'Saç',
    'tokasi': 'Tokası',
    'kiskac': 'Kıskaç',
    'toka': 'Toka',
    'sari': 'Sarı',
    'acik': 'Açık',
    'yesil': 'Yeşil',
    'kirmizi': 'Kırmızı',
    'nazar': 'Nazar',
    'degmesin': 'Değmesin',
    'hediye': 'Hediye',
    'paketi': 'Paketi',
    'lacivert': 'Lacivert',
    'antrasit': 'Antrasit',
    'ekru': 'Ekru',
    'bej': 'Bej',
    'beyaz': 'Beyaz',
    'siyah': 'Siyah',
    'kahverengi': 'Kahverengi',
    'gri': 'Gri',
    'mor': 'Mor',
    'pembe': 'Pembe',
    'mavi': 'Mavi',
    'bordo': 'Bordo',
    'ceket': 'Ceket',
    'sweatshirt': 'Sweatshirt',
    'kolye': 'Kolye',
    'bandana': 'Bandana',
    'sal': 'Şal',
    'anahtarlik': 'Anahtarlık',
    'pantolon': 'Pantolon',
    'jean': 'Jean',
    'crop': 'Crop',
    'bucket': 'Bucket',
    'basic': 'Basic',
    'logo': 'Logo',
    'yari': 'Yarı',
    'fermuarli': 'Fermuarlı',
    'bisiklet': 'Bisiklet',
    'yaka': 'Yaka',
    'dik': 'Dik',
    'polo': 'Polo',
    'kollu': 'Kollu',
    'dantel': 'Dantel',
    'ekose': 'Ekose',
    'potikareli': 'Potikareli',
    'deniz': 'Deniz',
    'kabugu': 'Kabuğu',
    'kizi': 'Kızı',
    'cicek': 'Çiçek',
    'etnik': 'Etnik',
    'vivi': 'Vivi',
    '90lar': "90'lar",
    'leopar': 'Leopar',
    'desenli': 'Desenli',
    'istanbul': 'İstanbul',
    'arkeoloji': 'Arkeoloji',
    'muzeleri': 'Müzeleri',
    'yengec': 'Yengeç',
    'nakisli': 'Nakışlı',
    'nakis': 'Nakış',
    'puantiyeli': 'Puantiyeli',
    'puantiye': 'Puantiye',
    'malibu': 'Malibu',
    'vizor': 'Vizör',
    'new': 'New',
    'york': 'York',
    'saint': 'Saint',
    'tropez': 'Tropez',
    'amalfi': 'Amalfi',
    'fiyonk': 'Fiyonk',
    'boncuklu': 'Boncuklu',
    '2li': "2'li",
    '3lu': "3'lü",
    'klipsli': 'Klipsli',
    'lastik': 'Lastik',
    'karisimli': 'Karışımlı',
    'keten': 'Keten',
    'ince': 'İnce',
    'koyu': 'Koyu',
    'm': 'M',
    'kalp': 'Kalp',
    'garfield': 'Garfield',
    'mickey': 'Mickey',
    'mouse': 'Mouse',
    'sirt': 'Sırt',
    'peanuts': 'Peanuts',
    'mvjns': 'Mvjns',
    'x': 'X',
    'dugme': 'Düğme',
    'cep': 'Cep',
    'kareli': 'Kareli',
    'liyosel': 'Liyosel',
    'genis': 'Geniş',
    'paca': 'Paça',
    'sky': 'Sky',
    'gabardin': 'Gabardin',
    'dokulu': 'Dokulu',
    'bagcik': 'Bağcık',
    'beli': 'Beli',
    'bagcikli': 'Bağcıklı',
    'pilili': 'Pilili',
    'kumas': 'Kumaş',
    'soft': 'Soft',
    'premium': 'Premium',
    'modal': 'Modal',
    'ada': 'Ada',
    'krem': 'Krem',
    'paloma': 'Paloma',
    'haki': 'Haki',
    'molly': 'Molly',
    'mona': 'Mona',
    'kemerli': 'Kemerli'
}

def translate_slug(slug):
    words = slug.split('-')
    res = []
    for w in words:
        if not w:
            continue
        w_lower = w.lower()
        if w_lower in TR_MAPPING:
            res.append(TR_MAPPING[w_lower])
        else:
            res.append(w.capitalize())
    return ' '.join(res)

with open(input_file, 'r', encoding='utf-8') as f_in, open(output_file, 'w', encoding='utf-8', newline='') as f_out:
    reader = csv.reader(f_in)
    writer = csv.writer(f_out)
    
    header = next(reader)
    writer.writerow(header)
    
    count = 0
    for row in reader:
        name = row[0]
        url = row[3]
        
        slug = url.split('/')[-3]
        new_name = translate_slug(slug)
        
        # update name column
        row[0] = new_name
        
        # update embedding string prefix if needed
        if row[7].startswith(name):
            row[7] = row[7].replace(name, new_name, 1)
        
        writer.writerow(row)
        count += 1

os.rename(output_file, input_file)
print(f"Done! Updated all {count} rows.")
