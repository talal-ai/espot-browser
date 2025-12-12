"""
Browser Spoofing Engine for ESPOT Browser
Production-ready spoofing engine with comprehensive fingerprint generation
"""

import hashlib
import random
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class FingerprintGenerator:
    """Generate realistic browser fingerprints"""
    
    # Common user agents by platform
    USER_AGENTS = {
        'Windows': [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
        ],
        'macOS': [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
        ],
        'Linux': [
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0'
        ]
    }
    
    # GPU vendors and models
    GPU_PROFILES = {
        'NVIDIA': [
            ('NVIDIA Corporation', 'NVIDIA GeForce RTX 3080'),
            ('NVIDIA Corporation', 'NVIDIA GeForce RTX 3070'),
            ('NVIDIA Corporation', 'NVIDIA GeForce GTX 1660 Ti'),
            ('NVIDIA Corporation', 'NVIDIA GeForce RTX 2060')
        ],
        'AMD': [
            ('AMD', 'AMD Radeon RX 6800 XT'),
            ('AMD', 'AMD Radeon RX 5700 XT'),
            ('AMD', 'AMD Radeon RX 580')
        ],
        'Intel': [
            ('Intel Inc.', 'Intel(R) Iris(R) Xe Graphics'),
            ('Intel Inc.', 'Intel(R) UHD Graphics 630'),
            ('Intel Inc.', 'Intel(R) HD Graphics 620')
        ]
    }
    
    # Screen resolutions
    SCREEN_RESOLUTIONS = [
        (1920, 1080), (2560, 1440), (3840, 2160),  # Common desktop
        (1366, 768), (1536, 864), (1600, 900),      # Laptop
        (2560, 1600), (3440, 1440)                  # Ultrawide
    ]
    
    def __init__(self, seed: Optional[int] = None):
        self.seed = seed or random.randint(1, 1000000)
        random.seed(self.seed)
    
    def generate_canvas_fingerprint(self, noise_level: int = 2) -> str:
        """Generate unique canvas fingerprint hash"""
        base_hash = hashlib.sha256(str(self.seed).encode()).hexdigest()
        
        # Add noise variation
        noise = ''.join(random.choices('0123456789abcdef', k=noise_level))
        return f"{base_hash[:60]}{noise}"
    
    def generate_webgl_fingerprint(self, platform: str = 'Windows') -> Dict[str, Any]:
        """Generate WebGL parameters"""
        # Select GPU based on platform
        if platform == 'macOS':
            vendor, renderer = random.choice(self.GPU_PROFILES['Intel'])
        else:
            gpu_vendor = random.choice(['NVIDIA', 'AMD', 'Intel'])
            vendor, renderer = random.choice(self.GPU_PROFILES[gpu_vendor])
        
        return {
            'vendor': vendor,
            'renderer': renderer,
            'version': 'WebGL 2.0',
            'shading_language_version': 'WebGL GLSL ES 3.00',
            'max_texture_size': random.choice([8192, 16384]),
            'max_vertex_attribs': 16,
            'max_varying_vectors': random.choice([30, 31, 32]),
            'max_vertex_uniform_vectors': random.choice([1024, 2048, 4096]),
            'max_fragment_uniform_vectors': random.choice([1024, 2048]),
            'max_renderbuffer_size': random.choice([8192, 16384]),
            'max_viewport_dims': [16384, 16384],
            'aliased_line_width_range': [1, 1],
            'aliased_point_size_range': [1, random.choice([1024, 2048, 8192])]
        }
    
    def generate_audio_fingerprint(self) -> Dict[str, Any]:
        """Generate audio context parameters"""
        return {
            'sample_rate': random.choice([44100, 48000]),
            'max_channel_count': random.choice([2, 6, 8]),
            'number_of_inputs': 1,
            'number_of_outputs': 1,
            'channel_count': 2,
            'channel_count_mode': 'max',
            'channel_interpretation': 'speakers',
            'base_latency': round(random.uniform(0.00290, .005), 6),
            'output_latency': round(random.uniform(0.01, 0.03), 6)
        }
    
    def generate_font_list(self, platform: str = 'Windows') -> List[str]:
        """Generate realistic font list for platform"""
        common_fonts = [
            'Arial', 'Arial Black', 'Calibri', 'Cambria', 'Cambria Math',
            'Comic Sans MS', 'Consolas', 'Courier', 'Courier New', 'Georgia',
            'Helvetica', 'Impact', 'Lucida Console', 'Lucida Sans Unicode',
            'Microsoft Sans Serif', 'Palatino Linotype', 'Segoe UI',
            'Symbol', 'Tahoma', 'Times', 'Times New Roman', 'Trebuchet MS',
            'Verdana', 'Webdings', 'Wingdings'
        ]
        
        if platform == 'macOS':
            mac_fonts = [
                'Apple Chancery', 'Apple Color Emoji', 'Apple SD Gothic Neo',
                'Apple Symbols', 'AppleGothic', 'AppleMyungjo', 'Avenir',
                'Avenir Next', 'Baghdad', 'Baskerville', 'Big Caslon',
                'Bodoni 72', 'Bradley Hand', 'Chalkboard', 'Chalkboard SE',
                'Cochin', 'Copperplate', 'Didot', 'Futura', 'Geneva',
                'Gill Sans', 'Helvetica Neue', 'Herculanum', 'Hoefler Text',
                'Lucida Grande', 'Luminari', 'Marker Felt', 'Monaco',
                'Noteworthy', 'Optima', 'Palatino', 'Papyrus', 'Phosphate',
                'Rockwell', 'SignPainter', 'Skia', 'Snell Roundhand',
                'Trattatello', 'Zapfino'
            ]
            return common_fonts + mac_fonts
        
        elif platform == 'Linux':
            linux_fonts = [
                'DejaVu Sans', 'DejaVu Sans Mono', 'DejaVu Serif',
                'FreeMono', 'FreeSans', 'FreeSerif', 'Liberation Mono',
                'Liberation Sans', 'Liberation Serif', 'Nimbus Mono L',
                'Nimbus Roman No9 L', 'Nimbus Sans L', 'Ubuntu', 'Ubuntu Mono'
            ]
            return common_fonts + linux_fonts
        
        return common_fonts
    
    def generate_hardware_profile(self, device_type: str = 'desktop') -> Dict[str, Any]:
        """Generate hardware specifications"""
        if device_type == 'mobile':
            return {
                'cpu_cores': random.choice([4, 6, 8]),
                'device_memory': random.choice([4, 6, 8]),
                'max_touch_points': random.choice([5, 10]),
                'platform': random.choice(['Android', 'iOS'])
            }
        
        return {
            'cpu_cores': random.choice([4, 6, 8, 12, 16]),
            'device_memory': random.choice([8, 16, 32]),
            'max_touch_points': 0,
            'platform': random.choice(['Windows', 'macOS', 'Linux'])
        }
    
    def generate_screen_profile(self) -> Dict[str, Any]:
        """Generate screen parameters"""
        width, height = random.choice(self.SCREEN_RESOLUTIONS)
        
        return {
            'width': width,
            'height': height,
            'color_depth': random.choice([24, 30, 32]),
            'pixel_ratio': random.choice([1, 1.25, 1.5, 2]),
            'available_width': width,
            'available_height': height - random.choice([30, 40, 60])  # taskbar
        }
    
    def generate_timezone_locale(self, country: str = 'US') -> Dict[str, str]:
        """Generate timezone and locale based on country"""
        timezones = {
            'US': ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'],
            'GB': ['Europe/London'],
            'DE': ['Europe/Berlin'],
            'FR': ['Europe/Paris'],
            'JP': ['Asia/Tokyo'],
            'CN': ['Asia/Shanghai'],
            'IN': ['Asia/Kolkata'],
            'BR': ['America/Sao_Paulo'],
            'AU': ['Australia/Sydney', 'Australia/Melbourne']
        }
        
        locales = {
            'US': 'en-US',
            'GB': 'en-GB',
            'DE': 'de-DE',
            'FR': 'fr-FR',
            'JP': 'ja-JP',
            'CN': 'zh-CN',
            'IN': 'en-IN',
            'BR': 'pt-BR',
            'AU': 'en-AU'
        }
        
        return {
            'timezone': random.choice(timezones.get(country, timezones['US'])),
            'locale': locales.get(country, 'en-US'),
            'language': locales.get(country, 'en-US').split('-')[0]
        }
    
    def generate_complete_profile(self, platform: str = 'Windows', country: str = 'US') -> Dict[str, Any]:
        """Generate complete browser fingerprint profile"""
        hardware = self.generate_hardware_profile()
        screen = self.generate_screen_profile()
        timezone_locale = self.generate_timezone_locale(country)
        webgl = self.generate_webgl_fingerprint(platform)
        audio = self.generate_audio_fingerprint()
        
        return {
            'user_agent': random.choice(self.USER_AGENTS.get(platform, self.USER_AGENTS['Windows'])),
            'platform': platform,
            'canvas_hash': self.generate_canvas_fingerprint(),
            'webgl_vendor': webgl['vendor'],
            'webgl_renderer': webgl['renderer'],
            'webgl_params': webgl,
            'audio_context': audio,
            'fonts': self.generate_font_list(platform),
            'screen_resolution': f"{screen['width']}x{screen['height']}",
            'screen_width': screen['width'],
            'screen_height': screen['height'],
            'color_depth': screen['color_depth'],
            'pixel_ratio': screen['pixel_ratio'],
            'hardware_concurrency': hardware['cpu_cores'],
            'device_memory': hardware['device_memory'],
            'max_touch_points': hardware['max_touch_points'],
            'timezone': timezone_locale['timezone'],
            'locale': timezone_locale['locale'],
            'language': timezone_locale['language'],
            'created_at': datetime.utcnow().isoformat(),
            'seed': self.seed
        }


class CanvasNoiseInjector:
    """Inject noise into canvas to prevent fingerprinting"""
    
    def __init__(self, noise_level: int = 2, seed: Optional[int] = None):
        self.noise_level = noise_level
        self.seed = seed or random.randint(1, 1000000)
    
    def get_injection_script(self) -> str:
        """Get JavaScript code to inject canvas noise"""
        return f"""
        (function() {{
            const noiseLevel = {self.noise_level};
            const seed = {self.seed};
            
            // Seeded random number generator
            function seededRandom(seed) {{
                let state = seed;
                return function() {{
                    state = (state * 9301 + 49297) % 233280;
                    return state / 233280;
                }};
            }}
            
            const rng = seededRandom(seed);
            
            // Override toDataURL
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function(...args) {{
                const ctx = this.getContext('2d');
                if (ctx) {{
                    const imageData = ctx.getImageData(0, 0, this.width, this.height);
                    const pixels = imageData.data;
                    
                    for (let i = 0; i < pixels.length; i += 4) {{
                        const noise = (rng() - 0.5) * noiseLevel;
                        pixels[i] = Math.max(0, Math.min(255, pixels[i] + noise));
                        pixels[i+1] = Math.max(0, Math.min(255, pixels[i+1] + noise));
                        pixels[i+2] = Math.max(0, Math.min(255, pixels[i+2] + noise));
                    }}
                    
                    ctx.putImageData(imageData, 0, 0);
                }}
                return originalToDataURL.apply(this, args);
            }};
        }})();
        """


class WebGLSpoofer:
    """Spoof WebGL parameters"""
    
    def __init__(self, webgl_params: Dict[str, Any]):
        self.params = webgl_params
    
    def get_injection_script(self) -> str:
        """Get JavaScript code to spoof WebGL"""
        params_json = json.dumps(self.params)
        
        return f"""
        (function() {{
            const params = {params_json};
            
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {{
                // UNMASKED_VENDOR_WEBGL
                if (parameter === 37445) {{
                    return params.vendor;
                }}
                // UNMASKED_RENDERER_WEBGL
                if (parameter === 37446) {{
                    return params.renderer;
                }}
                
                const paramMap = {{
                    3379: params.max_texture_size,
                    34921: params.max_vertex_attribs,
                    36348: params.max_varying_vectors,
                    36347: params.max_vertex_uniform_vectors,
                    36349: params.max_fragment_uniform_vectors,
                    34024: params.max_renderbuffer_size
                }};
                
                if (paramMap[parameter]) {{
                    return paramMap[parameter];
                }}
                
                return getParameter.call(this, parameter);
            }};
            
            // Also override WebGL2
            if (window.WebGL2RenderingContext) {{
                WebGL2RenderingContext.prototype.getParameter = WebGLRenderingContext.prototype.getParameter;
            }}
        }})();
        """


class WebRTCBlocker:
    """Block or fake WebRTC to prevent IP leaks"""
    
    def __init__(self, mode: str = 'disabled', fake_ip: Optional[str] = None):
        self.mode = mode  # 'disabled', 'fake', 'real'
        self.fake_ip = fake_ip or '192.168.1.100'
    
    def get_injection_script(self) -> str:
        """Get JavaScript code to handle WebRTC"""
        if self.mode == 'disabled':
            return """
            (function() {
                navigator.mediaDevices.getUserMedia = function() {
                    return Promise.reject(new Error('WebRTC is disabled'));
                };
                
                window.RTCPeerConnection = function() {
                    throw new Error('WebRTC is disabled');
                };
                window.webkitRTCPeerConnection = window.RTCPeerConnection;
                window.mozRTCPeerConnection = window.RTCPeerConnection;
            })();
            """
        
        elif self.mode == 'fake':
            return f"""
            (function() {{
                const fakeIP = '{self.fake_ip}';
                const OriginalRTCPeerConnection = window.RTCPeerConnection;
                
                window.RTCPeerConnection = function(config) {{
                    const pc = new OriginalRTCPeerConnection(config);
                    
                    const originalCreateOffer = pc.createOffer;
                    pc.createOffer = async function(options) {{
                        const offer = await originalCreateOffer.call(this, options);
                        offer.sdp = offer.sdp.replace(
                            /(\\r\\n|^)c=IN IP4 .+?(\\r\\n|$)/g,
                            `$1c=IN IP4 ${{fakeIP}}$2`
                        );
                        return offer;
                    }};
                    
                    return pc;
                }};
            }})();
            """
        
        return ""  # 'real' mode - no modification


class SpoofingEngine:
    """Main spoofing engine orchestrator"""
    
    def __init__(self):
        self.fingerprint_generator = FingerprintGenerator()
    
    def create_browser_profile(self, 
                               platform: str = 'Windows', 
                               country: str = 'US',
                               device_type: str = 'desktop') -> Dict[str, Any]:
        """Create a complete browser profile with all spoofing parameters"""
        
        logger.info(f"Generating browser profile for {platform}/{country}")
        
        # Generate base fingerprint
        profile = self.fingerprint_generator.generate_complete_profile(platform, country)
        
        # Add injection scripts
        canvas_injector = CanvasNoiseInjector(noise_level=2, seed=profile['seed'])
        webgl_spoofer = WebGLSpoofer(profile['webgl_params'])
        webrtc_blocker = WebRTCBlocker(mode='disabled')
        
        profile['injection_scripts'] = {
            'canvas': canvas_injector.get_injection_script(),
            'webgl': webgl_spoofer.get_injection_script(),
            'webrtc': webrtc_blocker.get_injection_script()
        }
        
        return profile
    
    def get_combined_injection_script(self, profile: Dict[str, Any]) -> str:
        """Get all injection scripts combined"""
        scripts = profile.get('injection_scripts', {})
        return '\n'.join([
            scripts.get('canvas', ''),
            scripts.get('webgl', ''),
            scripts.get('webrtc', '')
        ])
    
    def validate_profile_consistency(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Validate that all profile parameters are consistent"""
        errors = []
        warnings = []
        
        # Check platform consistency with user agent
        if profile['platform'] not in profile['user_agent']:
            warnings.append(f"Platform {profile['platform']} not in user agent")
        
        # Check timezone matches country
        timezone = profile['timezone']
        if 'America' in timezone and profile.get('country', 'US') not in ['US', 'CA', 'BR', 'MX']:
            warnings.append("Timezone/country mismatch detected")
        
        # Check hardware consistency
        if profile['platform'] == 'macOS' and 'NVIDIA' in profile['webgl_vendor']:
            errors.append("macOS rarely uses NVIDIA GPUs")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings
        }


# Global instance
if __name__ == "__main__":
    spoofing_engine = SpoofingEngine()
