import csv
import json

csv_file = '/home/admindsaf/Projects/semantic-hakaton/mavi-agent/data/products_ready_fixed.csv'
json_file = '/home/admindsaf/Projects/semantic-hakaton/mavi-agent/data/products_ready_fixed.json'

data = []
with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Convert tags from "{tag1,tag2}" to list ["tag1", "tag2"]
        tags_str = row['tags'].strip('{}')
        tags_list = [t.strip() for t in tags_str.split(',')] if tags_str else []
        
        item = {
            "name": row['name'],
            "price": float(row['price']),
            "category": row['category'],
            "product_url": row['product_url'],
            "image_url": row['image_url'],
            "attributes": json.loads(row['attributes']),
            "tags": tags_list,
            "embedding_input": row['embedding_input']
        }
        data.append(item)

with open(json_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Successfully wrote {len(data)} items to JSON.")
