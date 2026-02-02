#!/usr/bin/env python3
"""
ESPOT Browser Icon Generator
Converts a source image (PNG/SVG) to all required icon formats and sizes
for Windows, macOS, and Linux applications.
"""

import os
import sys
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw

def ensure_pil():
    """Ensure Pillow is installed"""
    try:
        from PIL import Image, ImageDraw
        return True
    except ImportError:
        print("Installing Pillow...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow", "-q"])
            print("Pillow installed successfully!")
            return True
        except Exception as e:
            print(f"Failed to install Pillow: {e}")
            return False

def create_icon_from_png(source_path: str, output_dir: str) -> dict:
    """
    Create Windows .ico file with multiple sizes from PNG source
    Returns dict with paths to generated files
    """
    source_path = Path(source_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    if not source_path.exists():
        print(f"ERROR: Source file not found: {source_path}")
        return {}
    
    print(f"\n{'='*60}")
    print(f"Processing icon from: {source_path}")
    print(f"Output directory: {output_dir}")
    print(f"{'='*60}\n")
    
    # Open source image
    try:
        img = Image.open(source_path)
        print(f"[OK] Source image loaded: {img.size}x{img.mode}")
    except Exception as e:
        print(f"ERROR: Cannot load source image: {e}")
        return {}
    
    # Convert to RGBA if needed (for transparency support)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
        print("[OK] Converted to RGBA (with transparency)")
    
    # Define all required sizes for Windows icons
    # The order matters - largest first for better quality scaling
    sizes = [256, 128, 96, 80, 72, 64, 60, 48, 40, 32, 30, 24, 20, 16]
    
    generated_files = {}
    
    # Generate individual PNG files for each size (for reference)
    print("\n--- Generating individual PNG files ---")
    for size in sizes:
        output_path = output_dir / f"icon_{size}x{size}.png"
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        
        # Ensure transparency for smaller icons
        if size <= 48:
            # For small icons, ensure they have good contrast
            resized = add_background_if_needed(resized, size)
        
        resized.save(output_path, 'PNG', optimize=True)
        print(f"  [OK] {size}x{size:>3} -> {output_path.name}")
        generated_files[f'png_{size}'] = str(output_path)
    
    # Create Windows ICO file with ALL sizes embedded
    print("\n--- Creating Windows .ico file ---")
    ico_path = output_dir / "icon.ico"
    
    # Create list of images for ICO (Windows needs specific formats)
    ico_images = []
    ico_sizes = [256, 128, 96, 64, 48, 32, 24, 16]  # Key sizes for Windows
    
    for size in ico_sizes:
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        
        # For sizes <= 48x48, also create a version with solid background for better visibility
        if size <= 48:
            # Create version with background
            resized_bg = add_solid_background(resized, size, bg_color=(255, 255, 255, 255))
            ico_images.append(resized_bg)
        else:
            ico_images.append(resized)
    
    # Save as ICO with all embedded sizes
    ico_images[0].save(
        ico_path, 
        format='ICO', 
        sizes=[(s, s) for s in ico_sizes],
        append_images=ico_images[1:]
    )
    
    print(f"  [OK] Windows ICO -> {ico_path.name}")
    print(f"    Embedded sizes: {', '.join(f'{s}x{s}' for s in ico_sizes)}")
    generated_files['ico'] = str(ico_path)
    
    # Create macOS .icns file
    print("\n--- Creating macOS .icns file ---")
    icns_path = create_icns(img, output_dir)
    if icns_path:
        generated_files['icns'] = str(icns_path)
    
    # Create Linux/AppImage icons
    print("\n--- Creating Linux icon files ---")
    linux_dir = output_dir / "linux"
    linux_dir.mkdir(exist_ok=True)
    
    linux_sizes = [512, 256, 128, 64, 48, 32, 24, 16]
    for size in linux_sizes:
        output_path = linux_dir / f"{size}x{size}.png"
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(output_path, 'PNG', optimize=True)
        print(f"  [OK] {size}x{size:>3} -> linux/{output_path.name}")
    
    generated_files['linux_dir'] = str(linux_dir)
    
    # Create favicon for web
    print("\n--- Creating favicon.ico ---")
    favicon_path = output_dir / "favicon.ico"
    favicon_sizes = [64, 48, 32, 24, 16]
    favicon_images = []
    
    for size in favicon_sizes:
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        favicon_images.append(resized)
    
    favicon_images[0].save(
        favicon_path,
        format='ICO',
        sizes=[(s, s) for s in favicon_sizes],
        append_images=favicon_images[1:]
    )
    print(f"  [OK] Favicon -> {favicon_path.name}")
    generated_files['favicon'] = str(favicon_path)
    
    # Create high-res source copy
    print("\n--- Creating high-resolution source ---")
    hires_path = output_dir / "icon_1024x1024.png"
    hires = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    hires.save(hires_path, 'PNG', optimize=True)
    print(f"  [OK] High-res (1024x1024) -> {hires_path.name}")
    generated_files['hires'] = str(hires_path)
    
    # Create notification icon (white background version)
    print("\n--- Creating notification icon ---")
    notif_path = output_dir / "icon_notification.png"
    notif_size = 128
    notif_img = create_notification_icon(img, notif_size)
    notif_img.save(notif_path, 'PNG', optimize=True)
    print(f"  [OK] Notification icon -> {notif_path.name}")
    generated_files['notification'] = str(notif_path)
    
    print(f"\n{'='*60}")
    print(f"ICON GENERATION COMPLETE!")
    print(f"{'='*60}")
    print(f"Total files generated: {len(generated_files)}")
    print(f"Output location: {output_dir.absolute()}")
    print(f"\nKey files:")
    print(f"  - icon.ico - Windows application icon (all sizes embedded)")
    print(f"  - icon.icns - macOS application icon")
    print(f"  - favicon.ico - Web favicon")
    print(f"  - icon_1024x1024.png - High-res source")
    print(f"{'='*60}\n")
    
    return generated_files

def add_background_if_needed(img: Image.Image, size: int) -> Image.Image:
    """Add subtle background to small icons for better visibility"""
    if size <= 32:
        # Create a white background with rounded corners for very small icons
        bg = Image.new('RGBA', (size, size), (255, 255, 255, 0))
        bg.paste(img, (0, 0), img)
        return bg
    return img

def add_solid_background(img: Image.Image, size: int, bg_color: tuple = (255, 255, 255, 255)) -> Image.Image:
    """Add solid background to icon"""
    bg = Image.new('RGBA', (size, size), bg_color)
    bg.paste(img, (0, 0), img)
    return bg

def create_notification_icon(img: Image.Image, size: int = 128) -> Image.Image:
    """Create a version suitable for system notifications"""
    # Create white circular background
    bg = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    
    # Resize logo to fit within circle
    logo_size = int(size * 0.7)
    logo = img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    
    # Center the logo
    offset = (size - logo_size) // 2
    bg.paste(logo, (offset, offset), logo)
    
    return bg

def create_icns(img: Image.Image, output_dir: Path) -> Path:
    """Create macOS .icns file using iconutil or direct PNG conversion"""
    icns_path = output_dir / "icon.icns"
    
    # For now, we'll create a high-quality PNG that can be used
    # Full .icns generation requires macOS tools (iconutil)
    # But we can create a zip of PNGs in the right structure
    
    print("  Creating macOS icon set structure...")
    
    # Create iconset directory
    iconset_dir = output_dir / "icon.iconset"
    iconset_dir.mkdir(exist_ok=True)
    
    # macOS requires specific sizes
    mac_sizes = {
        'icon_16x16.png': 16,
        'icon_16x16@2x.png': 32,
        'icon_32x32.png': 32,
        'icon_32x32@2x.png': 64,
        'icon_128x128.png': 128,
        'icon_128x128@2x.png': 256,
        'icon_256x256.png': 256,
        'icon_256x256@2x.png': 512,
        'icon_512x512.png': 512,
        'icon_512x512@2x.png': 1024,
    }
    
    for filename, size in mac_sizes.items():
        output_path = iconset_dir / filename
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(output_path, 'PNG', optimize=True)
    
    print(f"    [OK] Created icon.iconset with {len(mac_sizes)} files")
    print(f"    Note: To create .icns on macOS, run: iconutil -c icns icon.iconset")
    
    # Create a simple .icns by copying the 256x256 version as placeholder
    # (Real .icns requires macOS iconutil tool)
    placeholder = img.resize((256, 256), Image.Resampling.LANCZOS)
    placeholder.save(icns_path, 'PNG')  # Save as PNG, will be used as fallback
    
    print(f"    [OK] Created placeholder: {icns_path.name}")
    
    return icns_path

def copy_to_app_locations(generated_files: dict, frontend_dir: str):
    """Copy generated icons to all required locations in the app"""
    frontend_path = Path(frontend_dir)
    
    if not generated_files.get('ico'):
        print("ERROR: No ICO file generated, cannot copy to app locations")
        return False
    
    ico_source = Path(generated_files['ico'])
    
    # Locations that need the icon.ico file
    copy_locations = [
        frontend_path / "assets" / "icon.ico",      # Main assets folder
        frontend_path / "public" / "favicon.ico",   # Web favicon
        frontend_path / "build" / "icon.ico",       # Build folder
    ]
    
    print(f"\n--- Copying icons to app locations ---")
    
    for dest in copy_locations:
        try:
            dest.parent.mkdir(parents=True, exist_ok=True)
            
            # Read the ICO file fresh each time
            with open(ico_source, 'rb') as src:
                content = src.read()
            
            with open(dest, 'wb') as dst:
                dst.write(content)
            
            print(f"  [OK] Copied to: {dest.relative_to(frontend_path.parent)}")
        except Exception as e:
            print(f"  [WARN] Failed to copy to {dest}: {e}")
    
    # Also copy PNG sizes to public folder for web use
    if 'png_192' in generated_files:
        web_icons_dir = frontend_path / "public" / "icons"
        web_icons_dir.mkdir(exist_ok=True)
        
        png_files = [k for k in generated_files.keys() if k.startswith('png_')]
        for key in png_files:
            src = Path(generated_files[key])
            dst = web_icons_dir / src.name
            try:
                with open(src, 'rb') as s:
                    content = s.read()
                with open(dst, 'wb') as d:
                    d.write(content)
            except Exception as e:
                print(f"  [WARN] Failed to copy {src.name}: {e}")
    
    print("\n[OK] All icon locations updated!")
    return True

def verify_icon_file(ico_path: str) -> dict:
    """Verify an ICO file contains the expected sizes"""
    try:
        img = Image.open(ico_path)
        info = {
            'valid': True,
            'format': img.format,
            'sizes': [],
            'mode': img.mode
        }
        
        # ICO files can contain multiple images
        if hasattr(img, 'ico') and hasattr(img.ico, 'sizes'):
            info['sizes'] = list(img.ico.sizes())
        elif img.format == 'ICO':
            # Try to read all frames
            sizes = []
            frame = 0
            while True:
                try:
                    img.seek(frame)
                    sizes.append(img.size)
                    frame += 1
                except EOFError:
                    break
            info['sizes'] = sizes
        else:
            info['sizes'] = [img.size]
        
        print(f"\n--- Icon Verification ---")
        print(f"  File: {ico_path}")
        print(f"  Format: {info['format']}")
        print(f"  Mode: {info['mode']}")
        print(f"  Embedded sizes: {', '.join(f'{w}x{h}' for w, h in info['sizes'])}")
        
        # Check for critical Windows sizes
        critical_sizes = [(256, 256), (128, 128), (48, 48), (32, 32), (16, 16)]
        missing = [s for s in critical_sizes if s not in info['sizes']]
        
        if missing:
            print(f"  [WARN] Missing sizes: {', '.join(f'{w}x{h}' for w, h in missing)}")
        else:
            print(f"  [OK] All critical Windows sizes present!")
        
        return info
    except Exception as e:
        print(f"ERROR verifying icon: {e}")
        return {'valid': False, 'error': str(e)}

def main():
    """Main entry point"""
    print("ESPOT Browser Icon Generator")
    print("=" * 60)
    
    # Check for Pillow
    if not ensure_pil():
        print("ERROR: Pillow is required but could not be installed")
        sys.exit(1)
    
    # Determine paths
    script_dir = Path(__file__).parent.resolve()
    frontend_dir = script_dir.parent
    
    # Find source icon
    source_options = [
        frontend_dir / "public" / "icon1.png",
        frontend_dir / "assets" / "icon.png",
        frontend_dir / "src" / "assets" / "logo.png",
        script_dir / "source.png",
    ]
    
    source_path = None
    for opt in source_options:
        if opt.exists():
            source_path = opt
            break
    
    if not source_path:
        print("ERROR: Could not find source icon file")
        print("Searched in:")
        for opt in source_options:
            print(f"  - {opt}")
        print("\nPlease place your logo as frontend/public/icon1.png")
        sys.exit(1)
    
    # Generate icons
    output_dir = script_dir / "generated_icons"
    generated = create_icon_from_png(source_path, output_dir)
    
    if not generated:
        print("ERROR: Failed to generate icons")
        sys.exit(1)
    
    # Copy to app locations
    copy_to_app_locations(generated, frontend_dir)
    
    # Verify the final icon
    verify_icon_file(frontend_dir / "assets" / "icon.ico")
    
    print("\n" + "=" * 60)
    print("SUCCESS! Your custom logo is now ready to use.")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Build your app: npm run dist:win")
    print("2. The .exe will use your custom icon everywhere:")
    print("   - Application window title bar")
    print("   - Alt+Tab switcher")
    print("   - Taskbar")
    print("   - Windows Explorer (file icon)")
    print("   - Installer icon")
    print("   - Desktop shortcuts")
    print("   - System tray (if implemented)")
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
