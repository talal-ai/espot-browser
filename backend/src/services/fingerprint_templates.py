from typing import Dict, Any, List
from .spoofing_engine import SpoofingEngine

class FingerprintTemplates:
    """
    Curated list of high-quality browser fingerprint templates.
    These are used to generate consistent, realistic profiles.
    """
    
    TEMPLATES = {
        # Windows Profiles
        "win11_chrome_us": {
            "name": "Windows 11 - Chrome - US (High Privacy)",
            "description": "Standard Windows 11 user with Chrome. US IP location recommended.",
            "platform": "Windows",
            "country": "US",
            "device_type": "desktop",
            "browser": "Chrome",
            "os_version": "11",
            "screen_resolution": "1920x1080"
        },
        "win10_edge_us": {
            "name": "Windows 10 - Edge - US",
            "description": "Windows 10 user using Edge browser. Common corporate profile.",
            "platform": "Windows",
            "country": "US",
            "device_type": "desktop",
            "browser": "Edge",
            "os_version": "10",
            "screen_resolution": "1920x1080"
        },
        "win11_firefox_de": {
            "name": "Windows 11 - Firefox - Germany",
            "description": "Windows 11 user with Firefox. Optimized for EU/Germany.",
            "platform": "Windows",
            "country": "DE",
            "device_type": "desktop",
            "browser": "Firefox",
            "os_version": "11",
            "screen_resolution": "2560x1440"
        },
        
        # MacOS Profiles
        "macos_safari_us": {
            "name": "MacOS Sonoma - Safari - US",
            "description": "Modern Mac user with Safari. High trust score.",
            "platform": "macOS",
            "country": "US",
            "device_type": "desktop",
            "browser": "Safari",
            "os_version": "14",
            "screen_resolution": "1440x900" # Retina scale handled in engine?
        },
        "macos_chrome_uk": {
            "name": "MacOS Ventura - Chrome - UK",
            "description": "Mac user preferring Chrome. UK location.",
            "platform": "macOS",
            "country": "GB",
            "device_type": "desktop",
            "browser": "Chrome",
            "os_version": "13",
            "screen_resolution": "1728x1117"
        },
        
        # Linux Profiles
        "linux_firefox_dev": {
            "name": "Linux - Firefox - Developer",
            "description": "Ubuntu Linux user with Firefox. Typical developer profile.",
            "platform": "Linux",
            "country": "US",
            "device_type": "desktop",
            "browser": "Firefox",
            "os_version": "Ubuntu",
            "screen_resolution": "1920x1080"
        },
        
        # Specific Use Cases
        "win10_chrome_low_res": {
            "name": "Windows 10 - Chrome - Laptop",
            "description": "Lower resolution laptop profile (1366x768).",
            "platform": "Windows",
            "country": "US",
            "device_type": "desktop",
            "browser": "Chrome",
            "os_version": "10",
            "screen_resolution": "1366x768"
        },
        "macos_safari_high_res": {
            "name": "MacOS - Safari - 4K",
            "description": "High-end Mac workstation.",
            "platform": "macOS",
            "country": "US",
            "device_type": "desktop",
            "browser": "Safari",
            "os_version": "14",
            "screen_resolution": "3840x2160"
        },
         "win11_chrome_ca": {
            "name": "Windows 11 - Chrome - Canada",
            "description": "Canadian Windows user.",
            "platform": "Windows",
            "country": "CA",
            "device_type": "desktop",
            "browser": "Chrome",
            "os_version": "11",
            "screen_resolution": "1920x1080"
        },
        "win11_chrome_au": {
            "name": "Windows 11 - Chrome - Australia",
            "description": "Australian Windows user.",
            "platform": "Windows",
            "country": "AU",
            "device_type": "desktop",
            "browser": "Chrome",
            "os_version": "11",
            "screen_resolution": "1920x1080"
        }
    }

    def __init__(self):
        self._spoofing_engine = None  # Lazy-loaded
    
    @property
    def spoofing_engine(self):
        """Lazy-load spoofing engine only when needed"""
        if self._spoofing_engine is None:
            self._spoofing_engine = SpoofingEngine()
        return self._spoofing_engine

    def get_templates(self) -> List[Dict[str, Any]]:
        """Return list of available templates metadata (NO engine needed)"""
        # This should NEVER fail - it just returns static data
        return [
            {"id": key, **value} 
            for key, value in self.TEMPLATES.items()
        ]

    def generate_profile_from_template(self, template_id: str) -> Dict[str, Any]:
        """Generate a complete profile based on a template"""
        template = self.TEMPLATES.get(template_id)
        if not template:
            raise ValueError(f"Template {template_id} not found")
            
        # Generate base profile using engine
        profile = self.spoofing_engine.create_browser_profile(
            platform=template["platform"],
            country=template["country"],
            device_type=template["device_type"]
        )
        
        # Override with template specifics
        profile["name"] = template["name"]
        profile["description"] = template["description"]
        
        # If template specifies resolution, override it
        if "screen_resolution" in template:
            profile["screen_resolution"] = template["screen_resolution"]
            w, h = map(int, template["screen_resolution"].split('x'))
            profile["screen_width"] = w
            profile["screen_height"] = h
        
        # CRITICAL: Store the injection scripts in the profile
        # These are the actual JavaScript that will be injected
        profile["injection_scripts"] = profile.get("injection_scripts", {})
        
        # Store all WebGL parameters as JSONB
        profile["webgl_params"] = profile.get("webgl_params", {})
        
        # Store audio context parameters
        profile["audio_context_params"] = profile.get("audio_context", {})
        
        # Store seed for reproducibility
        profile["seed"] = profile.get("seed", 0)
        
        return profile

# Singleton instance
fingerprint_templates = FingerprintTemplates()

