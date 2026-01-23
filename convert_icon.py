from PIL import Image
import sys
import os

png_path = r"C:/Users/heyyt/.gemini/antigravity/brain/e02d1b05-013f-4c7c-966e-26c944ab95f2/espot_browser_icon_1768692278459.png"
ico_path = r"c:/Users/heyyt/Downloads/github/espot-browser/frontend/assets/icon.ico"

try:
    img = Image.open(png_path)
    # Ensure it's resized high quality
    img = img.resize((256, 256), Image.Resampling.LANCZOS)
    img.save(ico_path, format='ICO', sizes=[(256, 256)])
    print("Successfully converted icon")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
