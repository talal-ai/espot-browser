import json
from collections import Counter

def check_dupes(o, path=""):
    if isinstance(o, dict):
        keys = []
        # We need to parse manually to find duplicates because json.load overrides them
        content = open('package.json').read()
        # This is hard. Let's just use a simpler method to find duplicate keys in the string.
    
    # Actually, the IDE message gives us the line numbers.
    # Line 72, 73, 74... are duplicates.
    pass

# Read the file and find duplicate keys in the same object
with open('package.json', 'r') as f:
    lines = f.readlines()

keys_seen = {}
for i, line in enumerate(lines):
    if ':' in line:
        key = line.split(':')[0].strip().strip('"')
        if key in ['dependencies', 'devDependencies', 'scripts', 'build']:
            # Reset for top level keys? No, this is too simple.
            pass
