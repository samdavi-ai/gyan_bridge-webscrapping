import os

search_str = "visualization components"
root_dir = "d:\\GB_web_scraber\\client\\dist"

print(f"Searching for '{search_str}' in {root_dir}...")

for subdir, dirs, files in os.walk(root_dir):
    for file in files:
        filepath = os.path.join(subdir, file)
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                if search_str in content:
                    print(f"FOUND IN: {filepath}")
        except Exception as e:
            pass
print("Done.")
