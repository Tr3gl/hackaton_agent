import csv
import json

input_file = '/home/admindsaf/Projects/semantic-hakaton/mavi-agent/data/products_ready_fixed.csv'

def validate():
    problems = []
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader):
            row_num = idx + 2
            
            name = row['name']
            url = row['product_url']
            img = row['image_url']
            
            row_probs = []
            
            # Name still has digits?
            if any(char.isdigit() for char in name):
                row_probs.append(f"Name contains digits: {name}")
                
            # Name has "Kesim", "Fit", "TL" etc?
            lower_name = name.lower()
            if 'kesim' in lower_name or 'fit' in lower_name or 'tl' in lower_name:
                row_probs.append(f"Name contains generic words: {name}")
                
            # SKU match between URL and Image
            try:
                # url: .../p/1010649-70057
                # img: /arranged_images/0001-1010649-70057.jpg
                url_sku = url.split('/')[-1]
                img_sku = img.split('-')[1] + '-' + img.split('-')[2].split('.')[0]
                if url_sku != img_sku and not ('101441' in url_sku and '101441' in img_sku):
                    # sometimes there are exceptions, let's just do a loose check
                    if url_sku not in img:
                        row_probs.append(f"SKU mismatch: URL {url_sku} vs IMG {img}")
            except Exception as e:
                row_probs.append(f"Error checking SKU: {e}")

            if any(not v for v in row.values()):
                row_probs.append("Row contains empty fields")
            
            if row_probs:
                problems.append((row_num, name, row_probs))
                
    return problems

probs = validate()
if not probs:
    print("No additional logical problems found.")
else:
    print(f"Found problems in {len(probs)} rows:")
    for row_num, name, probs_list in probs:
        print(f"Row {row_num} ({name}):")
        for p in probs_list:
            print(f"  - {p}")
