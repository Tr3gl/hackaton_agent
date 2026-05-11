import csv
import json

input_file = '/home/admindsaf/Projects/semantic-hakaton/mavi-agent/data/products_ready_fixed.csv'

def validate():
    problems = []
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader):
            row_num = idx + 2  # +2 because of 0-index and header
            
            name = row['name']
            price = float(row['price'])
            category = row['category']
            url = row['product_url']
            attributes_str = row['attributes']
            tags_str = row['tags']
            embedding_input = row['embedding_input']
            
            row_probs = []
            
            # Price check
            if price <= 0 or price > 10000:
                row_probs.append(f"Unrealistic price: {price}")
            
            # Attributes check
            try:
                attrs = json.loads(attributes_str)
            except Exception as e:
                row_probs.append(f"Invalid JSON in attributes: {e}")
                attrs = {}
            
            if attrs:
                p_type = attrs.get('product_type')
                subtype = attrs.get('item_subtype')
                seasons = attrs.get('season', [])
                temp = attrs.get('temp_range')
                
                # Category logic checks
                if category.lower() == 'pantolons' and subtype not in ['trousers', 'jeans']:
                    row_probs.append(f"Category '{category}' but subtype is '{subtype}'")
                if category.lower() == 'sweatshirts' and subtype not in ['sweater', 'hoodie']:
                    row_probs.append(f"Category '{category}' but subtype is '{subtype}'")
                if category.lower() == 'aksesuars' and p_type != 'accessory':
                    row_probs.append(f"Category '{category}' but product_type is '{p_type}'")
                if 'gomlek' in category.lower() and subtype != 'shirt':
                    row_probs.append(f"Category '{category}' but subtype is '{subtype}'")
                    
                # Seasonal logic checks
                if temp == 'hot' and 'winter' in seasons:
                    row_probs.append(f"Temp is hot but season includes winter")
                if temp in ['cool', 'cold'] and seasons == ['summer']:
                    row_probs.append(f"Temp is {temp} but season is only summer")
                
                # Verify that all attribute values (that are strings or in lists) are in tags
                # tags string looks like "{adult,autumn,base,casual,...}"
                tags_set = set(tags_str.strip('{}').split(','))
                
                missing_tags = []
                for k, v in attrs.items():
                    if isinstance(v, str):
                        if v not in tags_set:
                            missing_tags.append(v)
                    elif isinstance(v, list):
                        for item in v:
                            if item not in tags_set:
                                missing_tags.append(item)
                    elif isinstance(v, bool):
                        if v and k not in tags_set:
                            missing_tags.append(k)
                            
                if missing_tags:
                    row_probs.append(f"Attribute values missing from tags: {missing_tags}")
            
            # Name in embedding_input
            if not embedding_input.startswith(name):
                row_probs.append(f"Embedding input doesn't start with the correct name")
            
            if row_probs:
                problems.append((row_num, name, row_probs))
                
    return problems

probs = validate()
if not probs:
    print("No logical problems found.")
else:
    print(f"Found problems in {len(probs)} rows:")
    for row_num, name, probs_list in probs:
        print(f"Row {row_num} ({name}):")
        for p in probs_list:
            print(f"  - {p}")
