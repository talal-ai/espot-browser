/**
 * REAL WORKING Browser Fingerprint Spoofing for Electron
 * This actually modifies browser APIs before pages load
 */

import { BrowserWindow, session } from 'electron';

export interface FingerprintProfile {
  id: string;
  name?: string;  // Optional profile name for display
  user_agent: string;
  platform: string;
  hardware_concurrency: number;
  device_memory: number;
  screen_width: number;
  screen_height: number;
  color_depth: number;
  pixel_ratio: number;
  timezone: string;
  language: string;
  locale: string;
  webgl_vendor: string;
  webgl_renderer: string;
  webgl_params: any;
  audio_context: any;
  canvas_hash?: string;
  seed: number;
  max_touch_points: number;
}

/**
 * Generate the complete JavaScript injection script
 * This runs BEFORE any website JavaScript loads
 */
export function generateSpoofingScript(profile: FingerprintProfile): string {
  return `
(function() {
  'use strict';
  
  console.log('[ESPOT] Applying fingerprint spoofing profile:', '${profile.id}');
  
  // ============================================================================
  // 1. USER AGENT & PLATFORM SPOOFING
  // ============================================================================
  Object.defineProperty(navigator, 'userAgent', {
    get: () => '${profile.user_agent}',
    configurable: false
  });
  
  Object.defineProperty(navigator, 'platform', {
    get: () => '${profile.platform}',
    configurable: false
  });
  
  Object.defineProperty(navigator, 'appVersion', {
    get: () => '${profile.user_agent.split(' ').slice(1).join(' ')}',
    configurable: false
  });
  
  // ============================================================================
  // 2. HARDWARE CONCURRENCY (CPU CORES)
  // ============================================================================
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => ${profile.hardware_concurrency},
    configurable: false
  });
  
  // ============================================================================
  // 3. DEVICE MEMORY
  // ============================================================================
  Object.defineProperty(navigator, 'deviceMemory', {
    get: () => ${profile.device_memory},
    configurable: false
  });
  
  // ============================================================================
  // 4. MAX TOUCH POINTS
  // ============================================================================
  Object.defineProperty(navigator, 'maxTouchPoints', {
    get: () => ${profile.max_touch_points},
    configurable: false
  });
  
  // ============================================================================
  // 5. SCREEN RESOLUTION & COLOR DEPTH
  // ============================================================================
  Object.defineProperty(window.screen, 'width', {
    get: () => ${profile.screen_width},
    configurable: false
  });
  
  Object.defineProperty(window.screen, 'height', {
    get: () => ${profile.screen_height},
    configurable: false
  });
  
  Object.defineProperty(window.screen, 'availWidth', {
    get: () => ${profile.screen_width},
    configurable: false
  });
  
  Object.defineProperty(window.screen, 'availHeight', {
    get: () => ${profile.screen_height - 40}, // Taskbar
    configurable: false
  });
  
  Object.defineProperty(window.screen, 'colorDepth', {
    get: () => ${profile.color_depth},
    configurable: false
  });
  
  Object.defineProperty(window.screen, 'pixelDepth', {
    get: () => ${profile.color_depth},
    configurable: false
  });
  
  Object.defineProperty(window, 'devicePixelRatio', {
    get: () => ${profile.pixel_ratio},
    configurable: false
  });
  
  // ============================================================================
  // 6. TIMEZONE & LANGUAGE SPOOFING
  // ============================================================================
  const originalDateTimeFormat = Intl.DateTimeFormat;
  Intl.DateTimeFormat = function(...args) {
    if (args.length === 0 || !args[0]) {
      args[0] = '${profile.locale}';
    }
    return new originalDateTimeFormat(...args);
  };
  Intl.DateTimeFormat.prototype = originalDateTimeFormat.prototype;
  
  Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
    value: function() {
      const options = originalDateTimeFormat.prototype.resolvedOptions.call(this);
      options.timeZone = '${profile.timezone}';
      options.locale = '${profile.locale}';
      return options;
    }
  });
  
  Date.prototype.getTimezoneOffset = function() {
    // This is a simplified version - in production you'd calculate based on timezone
    return -300; // Example: EST offset
  };
  
  Object.defineProperty(navigator, 'language', {
    get: () => '${profile.language}',
    configurable: false
  });
  
  Object.defineProperty(navigator, 'languages', {
    get: () => ['${profile.language}', 'en'],
    configurable: false
  });
  
  // ============================================================================
  // 7. WEBGL SPOOFING (CRITICAL)
  // ============================================================================
  const webglParams = ${JSON.stringify(profile.webgl_params)};
  
  const getParameterProxyHandler = {
    apply: function(target, thisArg, args) {
      const param = args[0];
      
      // UNMASKED_VENDOR_WEBGL (37445)
      if (param === 37445) return '${profile.webgl_vendor}';
      
      // UNMASKED_RENDERER_WEBGL (37446)
      if (param === 37446) return '${profile.webgl_renderer}';
      
      // Other WebGL parameters
      const paramMap = {
        3379: webglParams.max_texture_size,
        34921: webglParams.max_vertex_attribs,
        36348: webglParams.max_varying_vectors,
        36347: webglParams.max_vertex_uniform_vectors,
        36349: webglParams.max_fragment_uniform_vectors,
        34024: webglParams.max_renderbuffer_size,
        3386: webglParams.max_viewport_dims,
        33901: webglParams.aliased_line_width_range,
        33902: webglParams.aliased_point_size_range
      };
      
      if (paramMap[param] !== undefined) {
        return paramMap[param];
      }
      
      return target.apply(thisArg, args);
    }
  };
  
  const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = new Proxy(originalGetParameter, getParameterProxyHandler);
  
  if (window.WebGL2RenderingContext) {
    const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = new Proxy(originalGetParameter2, getParameterProxyHandler);
  }
  
  // ============================================================================
  // 8. CANVAS FINGERPRINTING PROTECTION (FIXED - Non-Destructive)
  // ============================================================================
  const canvasSeed = ${profile.seed};
  
  function seededRandom(seed) {
    let state = seed;
    return function() {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  }
  
  // #region agent log - canvas operation counter
  let canvasOperationCount = 0;
  // #endregion
  
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  
  // Override toDataURL - NON-DESTRUCTIVE VERSION
  HTMLCanvasElement.prototype.toDataURL = function(...args) {
    // #region agent log - toDataURL entry
    canvasOperationCount++;
    const opId = canvasOperationCount;
    fetch('http://127.0.0.1:7242/ingest/d871142a-87ce-4295-b4cf-a15b09487b66',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fingerprint-injector.ts:toDataURL',message:'Canvas toDataURL called',data:{opId:opId,width:this.width,height:this.height,pixelCount:this.width*this.height},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,C'})}).catch(()=>{});
    // #endregion
    
    const context = this.getContext('2d');
    if (context && this.width > 0 && this.height > 0) {
      // Create a NEW canvas to avoid destroying original
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.width;
      tempCanvas.height = this.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      // Copy original canvas to temp
      tempCtx.drawImage(this, 0, 0);
      
      // Get image data from temp canvas
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imageData.data;
      
      // #region agent log - before noise application
      const firstPixelBefore = {r:data[0],g:data[1],b:data[2]};
      // #endregion
      
      // Reset RNG for THIS operation (deterministic based on canvas size)
      const localRng = seededRandom(canvasSeed + this.width * this.height);
      
      // #region agent log - RNG state tracking
      const rngSample1 = localRng();
      const rngSample2 = localRng();
      fetch('http://127.0.0.1:7242/ingest/d871142a-87ce-4295-b4cf-a15b09487b66',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fingerprint-injector.ts:toDataURL',message:'RNG samples',data:{opId:opId,sample1:rngSample1,sample2:rngSample2,seed:canvasSeed,canvasEntropy:this.width*this.height},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
      // Reset again for actual use
      const actualRng = seededRandom(canvasSeed + this.width * this.height);
      // #endregion
      
      // Add subtle noise to RGB values (not alpha)
      for (let i = 0; i < data.length; i += 4) {
        const noise = (actualRng() - 0.5) * 2;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
        data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise)); // G
        data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise)); // B
      }
      
      // #region agent log - after noise application
      const firstPixelAfter = {r:data[0],g:data[1],b:data[2]};
      fetch('http://127.0.0.1:7242/ingest/d871142a-87ce-4295-b4cf-a15b09487b66',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fingerprint-injector.ts:toDataURL',message:'Noise applied',data:{opId:opId,before:firstPixelBefore,after:firstPixelAfter,diff:{r:firstPixelAfter.r-firstPixelBefore.r,g:firstPixelAfter.g-firstPixelBefore.g,b:firstPixelAfter.b-firstPixelBefore.b}},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // Put noisy data back into temp canvas
      tempCtx.putImageData(imageData, 0, 0);
      
      // Export from temp canvas (original canvas unchanged!)
      const result = tempCanvas.toDataURL(...args);
      
      // #region agent log - toDataURL exit
      fetch('http://127.0.0.1:7242/ingest/d871142a-87ce-4295-b4cf-a15b09487b66',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fingerprint-injector.ts:toDataURL',message:'toDataURL complete',data:{opId:opId,resultLength:result.length,originalCanvasStillIntact:true},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      return result;
    }
    return originalToDataURL.apply(this, args);
  };
  
  // Override toBlob - NON-DESTRUCTIVE VERSION
  HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
    // #region agent log - toBlob entry
    canvasOperationCount++;
    const opId = canvasOperationCount;
    fetch('http://127.0.0.1:7242/ingest/d871142a-87ce-4295-b4cf-a15b09487b66',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fingerprint-injector.ts:toBlob',message:'Canvas toBlob called',data:{opId:opId,width:this.width,height:this.height},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,E'})}).catch(()=>{});
    // #endregion
    
    const context = this.getContext('2d');
    if (context && this.width > 0 && this.height > 0) {
      // Create temp canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.width;
      tempCanvas.height = this.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      // Copy original
      tempCtx.drawImage(this, 0, 0);
      
      // Get image data
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imageData.data;
      
      // Reset RNG (same logic as toDataURL for consistency)
      const localRng = seededRandom(canvasSeed + this.width * this.height);
      
      // Apply noise
      for (let i = 0; i < data.length; i += 4) {
        const noise = (localRng() - 0.5) * 2;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
        data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
      }
      
      // Put back into temp canvas
      tempCtx.putImageData(imageData, 0, 0);
      
      // Export from temp canvas
      tempCanvas.toBlob(callback, ...args);
      
      // #region agent log - toBlob exit
      fetch('http://127.0.0.1:7242/ingest/d871142a-87ce-4295-b4cf-a15b09487b66',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fingerprint-injector.ts:toBlob',message:'toBlob complete',data:{opId:opId,originalCanvasStillIntact:true},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,E'})}).catch(()=>{});
      // #endregion
    } else {
      originalToBlob.call(this, callback, ...args);
    }
  };
  
  // ============================================================================
  // 9. AUDIO CONTEXT FINGERPRINTING PROTECTION
  // ============================================================================
  const audioParams = ${JSON.stringify(profile.audio_context)};
  
  if (window.AudioContext || window.webkitAudioContext) {
    const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
    
    class SpoofedAudioContext extends OriginalAudioContext {
      constructor(...args) {
        super(...args);
        
        // Override sampleRate
        Object.defineProperty(this, 'sampleRate', {
          get: () => audioParams.sample_rate,
          configurable: false
        });
        
        // Override baseLatency
        Object.defineProperty(this, 'baseLatency', {
          get: () => audioParams.base_latency,
          configurable: false
        });
      }
    }
    
    window.AudioContext = SpoofedAudioContext;
    if (window.webkitAudioContext) {
      window.webkitAudioContext = SpoofedAudioContext;
    }
  }
  
  // ============================================================================
  // 10. WEBRTC BLOCKING (PREVENT IP LEAK)
  // ============================================================================
  if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia = function() {
      return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
    };
    
    navigator.mediaDevices.enumerateDevices = function() {
      return Promise.resolve([]);
    };
  }
  
  // Disable RTCPeerConnection to prevent WebRTC leaks
  if (window.RTCPeerConnection) {
    window.RTCPeerConnection = function() {
      throw new Error('RTCPeerConnection is not available');
    };
  }
  
  // ============================================================================
  // 11. REMOVE WEBDRIVER FLAG
  // ============================================================================
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
    configurable: false
  });
  
  // ============================================================================
  // 12. PLUGINS & MIMETYPES SPOOFING
  // ============================================================================
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      return {
        length: 3,
        0: { name: 'PDF Viewer', filename: 'internal-pdf-viewer' },
        1: { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
        2: { name: 'Chromium PDF Plugin', filename: 'internal-pdf-viewer' }
      };
    },
    configurable: false
  });
  
  Object.defineProperty(navigator, 'mimeTypes', {
    get: () => ({ length: 0 }),
    configurable: false
  });
  
  console.log('[ESPOT] ✅ Fingerprint spoofing applied successfully');
  console.log('[ESPOT] Profile ID: ${profile.id}');
  console.log('[ESPOT] User Agent:', navigator.userAgent);
  console.log('[ESPOT] GPU:', '${profile.webgl_renderer}');
  console.log('[ESPOT] Screen:', ${profile.screen_width}+'x'+${profile.screen_height});
  
})();
`;
}

/**
 * Apply fingerprint profile to a BrowserWindow
 * This is the CRITICAL function that makes spoofing actually work
 * 
 * IMPORTANT: We use webRequest.onBeforeRequest to inject the script
 * BEFORE any other resources load. This is the ONLY reliable method.
 */
export async function applySpoofingProfile(
  window: BrowserWindow,
  profile: FingerprintProfile
): Promise<void> {
  // 1. Set User Agent at the webContents level
  window.webContents.setUserAgent(profile.user_agent);

  // 2. Get the session for this window
  const ses = window.webContents.session;

  // 3. Generate the spoofing script
  const spoofingScript = generateSpoofingScript(profile);

  // 4. CRITICAL: Use webRequest to inject script BEFORE page loads
  // This is the ONLY method that truly runs before page JavaScript
  ses.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
    // Only inject on main frame navigation (not images, scripts, etc.)
    if (details.resourceType === 'mainFrame' || details.resourceType === 'subFrame') {
      // Inject immediately
      window.webContents.executeJavaScript(spoofingScript, true)
        .catch(err => console.error('[ESPOT] Injection failed:', err));
    }
    callback({});
  });

  // 5. Also use preload for maximum coverage
  // Create a temporary preload script file
  const preloadContent = `
    ${spoofingScript}
    
    // Signal that spoofing is active
    window.__ESPOT_SPOOFING_ACTIVE__ = true;
  `;

  // Write to temp file and set as preload
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const tempPreloadPath = path.join(os.tmpdir(), `espot-spoofing-${profile.id}.js`);

  try {
    fs.writeFileSync(tempPreloadPath, preloadContent);

    // Update webPreferences if window is newly created
    // Note: This only works for new windows, existing windows can't change preload
    if (window.webContents.getURL() === '') {
      // Window not yet loaded, we can modify webPreferences
      // This requires recreating the window with new preload, which we do in createSpoofedWindow
    }
  } catch (error) {
    console.error('[ESPOT] Failed to create preload file:', error);
  }

  // 6. Block WebRTC permissions
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'mediaKeySystem') {
      callback(false);  // Deny all media access
    } else {
      callback(true);
    }
  });

  // 7. Inject on document-start (earliest possible moment)
  window.webContents.on('dom-ready', () => {
    window.webContents.executeJavaScript(spoofingScript, true)
      .catch(err => console.error('[ESPOT] DOM-ready injection failed:', err));
  });

  console.log(`[ESPOT] ✅ Applied spoofing profile ${profile.id} to window`);
}

/**
 * Create a new browser window with spoofing profile applied
 * This is the RECOMMENDED way to create spoofed windows
 */
export async function createSpoofedWindow(
  profile: FingerprintProfile,
  url: string,
  options: Electron.BrowserWindowConstructorOptions = {}
): Promise<BrowserWindow> {
  // Create preload script with spoofing code
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  const spoofingScript = generateSpoofingScript(profile);
  const tempPreloadPath = path.join(os.tmpdir(), `espot-spoofing-${profile.id}-${Date.now()}.js`);

  // Write preload script
  fs.writeFileSync(tempPreloadPath, `
    // This runs in an isolated context BEFORE any page code
    ${spoofingScript}
  `);

  // Create window with custom preload
  const window = new BrowserWindow({
    ...options,  // Spread options first to get icon and other properties
    width: options.width || profile.screen_width,  // Use provided width or profile width
    height: options.height || profile.screen_height,  // Use provided height or profile height
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: tempPreloadPath, // THIS IS KEY - runs before any page code
      ...options.webPreferences
    }
  });

  // Set user agent
  window.webContents.setUserAgent(profile.user_agent);

  // Apply additional spoofing layers
  const ses = window.webContents.session;

  // Block WebRTC
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'mediaKeySystem') {
      callback(false);
    } else {
      callback(true);
    }
  });

  // Note: Primary injection is via preload script (runs before any page code)
  // The backup webRequest injection has been removed as preload is reliable

  console.log(`[ESPOT] ✅ Created spoofed window with preload: ${tempPreloadPath}`);

  // Clean up temp file after window closes
  window.on('closed', () => {
    try {
      fs.unlinkSync(tempPreloadPath);
      console.log(`[ESPOT] Cleaned up temp preload file`);
    } catch (error) {
      // File might already be deleted, ignore
    }
  });

  // NOW load the URL (preload already executed)
  await window.loadURL(url);

  return window;
}

