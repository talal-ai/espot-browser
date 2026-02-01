from PIL import Image
import sys
import os

# Source: High quality 512x512 PNG from public folder
png_path = r"c:\Users\heyyt\Downloads\github\espot-browser\frontend\public\web-app-manifest-512x512.png"

# Target: .ico file in assets folder
ico_path = r"c:\Users\heyyt\Downloads\github\espot-browser\frontend\assets\icon.ico"

try:
    # Open the source image
    img = Image.open(png_path)
    
    # Convert to RGBA if not already
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Generate multiple sizes for .ico file (Windows requirement)
    # Windows needs 16x16, 32x32, 48x48, and 256x256 for best quality
    sizes = [(16, 16), (32, 32), (48, 48), (256, 256)]
    
    # Save as .ico with all sizes
    img.save(ico_path, format='ICO', sizes=sizes)
    
    print(f"✅ Successfully created icon.ico with sizes: {sizes}")
    print(f"   Source: {png_path}")
    print(f"   Output: {ico_path}")
    
except FileNotFoundError as e:
    print(f"❌ Error: Source image not found at {png_path}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error converting icon: {e}")
    sys.exit(1)
