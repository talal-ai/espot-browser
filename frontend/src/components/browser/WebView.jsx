import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

/**
 * WebView Component - Renders isolated browser tab
 * Uses Electron session partitions to share cookies across tabs for same user
 */

/**
 * Generate autofill script for injection into webview
 */
function generateAutofillScript(username, password, url) {
    const escapedUsername = username.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
    const escapedPassword = password.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');

    return `
(function() {
    'use strict';
    
    const USERNAME = "${escapedUsername}";
    const PASSWORD = "${escapedPassword}";
    let submitClicked = false;
    
    const usernameSelectors = [
        'input[autocomplete="username"]', 'input[autocomplete="email"]', 'input[type="email"]',
        'input[name*="user" i]', 'input[name*="email" i]', 'input[name*="login" i]',
        'input[id*="user" i]', 'input[id*="email" i]', 'input[type="text"]'
    ];
    
    const passwordSelectors = [
        'input[type="password"]', 'input[autocomplete="current-password"]',
        'input[name*="pass" i]', 'input[id*="pass" i]'
    ];
    
    const submitSelectors = [
        'button[data-uia="login-submit-button"]', 'button[data-uia*="login"]',
        'button[type="submit"]', 'input[type="submit"]',
        'button[id*="login" i]', 'button[id*="signin" i]',
        'button[name*="login" i]', 'button[class*="login" i]',
        'button[class*="submit" i]', 'button[class*="signin" i]'
    ];
    
    function isVisible(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
    }
    
    function findField(selectors) {
        for (const sel of selectors) {
            try {
                const els = document.querySelectorAll(sel);
                for (const el of els) {
                    if (isVisible(el) && !el.disabled) return el;
                }
            } catch (e) {}
        }
        return null;
    }
    
    function findByLabel(text) {
        for (const label of document.querySelectorAll('label')) {
            if (label.textContent && label.textContent.toLowerCase().includes(text)) {
                const forId = label.getAttribute('for');
                if (forId) { const inp = document.getElementById(forId); if (inp) return inp; }
                const inp = label.querySelector('input');
                if (inp) return inp;
            }
        }
        return null;
    }
    
    function fillField(field, value) {
        if (!field) return false;
        field.focus();
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        if (setter) setter.call(field, value);
        else field.value = value;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    }
    
    function findButtonByText(texts) {
        const btns = document.querySelectorAll('button, input[type="submit"], a[role="button"], div[role="button"]');
        for (const btn of btns) {
            if (!isVisible(btn)) continue;
            const txt = (btn.textContent || btn.value || btn.innerText || '').toLowerCase().trim();
            for (const t of texts) { 
                if (txt === t || txt.includes(t)) {
                    console.log('[ESPOT] Found button by text:', txt);
                    return btn; 
                }
            }
        }
        return null;
    }
    
    function clickSubmit() {
        if (submitClicked) return true;
        
        let btn = findField(submitSelectors);
        if (!btn) btn = findButtonByText(['sign in', 'signin']);
        if (!btn) btn = findButtonByText(['login', 'log in', 'submit', 'continue', 'next']);
        
        if (btn) {
            console.log('[ESPOT] Found submit button:', btn.tagName, btn.textContent || btn.value);
            btn.scrollIntoView({ behavior: 'instant', block: 'center' });
            btn.focus();
            btn.click();
            btn.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true }));
            btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
            btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
            const form = btn.closest('form');
            if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
            submitClicked = true;
            console.log('[ESPOT] ✅ Clicked submit button');
            return true;
        }
        console.log('[ESPOT] ❌ Submit button not found');
        return false;
    }
    
    function tryClick() {
        if (!submitClicked) clickSubmit();
    }
    
    function autofill() {
        const userField = findByLabel('email') || findByLabel('username') || findField(usernameSelectors);
        const passField = findByLabel('password') || findField(passwordSelectors);
        
        let uf = false, pf = false;
        if (userField && !userField.value) { fillField(userField, USERNAME); uf = true; console.log('[ESPOT] Username filled'); }
        else if (userField) uf = true;
        
        if (passField && !passField.value) { fillField(passField, PASSWORD); pf = true; console.log('[ESPOT] Password filled'); }
        else if (passField) pf = true;
        else { sessionStorage.setItem('ESPOT_PASS', PASSWORD); }
        
        if (uf && pf) {
            setTimeout(tryClick, 500);
            setTimeout(tryClick, 1000);
            setTimeout(tryClick, 2000);
        } else if (uf && !passField) {
            setTimeout(tryClick, 500);
        }
        
        return { user: !!userField, pass: !!passField };
    }
    
    function watchPass() {
        const stored = sessionStorage.getItem('ESPOT_PASS');
        if (!stored) return;
        const obs = new MutationObserver(() => {
            const pw = findField(passwordSelectors);
            if (pw && !pw.value) {
                fillField(pw, stored);
                sessionStorage.removeItem('ESPOT_PASS');
                setTimeout(tryClick, 500);
                setTimeout(tryClick, 1000);
                obs.disconnect();
            }
        });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => obs.disconnect(), 60000);
    }
    
    const r = autofill();
    if (!r.pass) watchPass();
    setTimeout(autofill, 1500);
    setTimeout(autofill, 3000);
    console.log('[ESPOT] Autofill initialized');
})();
`;
}

const WebView = forwardRef(({ url, isActive, partition, userId, userAgent, credentials, onTitleChange, onUrlChange, onLoadingChange, onFaviconChange }, ref) => {
    const webviewRef = useRef(null);
    const [initialUrl] = React.useState(url); // Capture initial URL for unchecked src attribute
    const [cookiesInjected, setCookiesInjected] = React.useState(false);

    // Use a SHARED session partition for all tabs of the same user
    // If partition passed as null, use DEFAULT session (shared with main window)
    const sessionPartition = partition === null ? undefined : (partition || (userId ? `persist:user-${userId}` : 'persist:main'));



    // Inject Google cookies when component mounts (if userId provided AND using isolated partition)
    useEffect(() => {
        // If using default session (sessionPartition is undefined), we already have cookies from main window!
        if (!userId || cookiesInjected || sessionPartition === undefined) return;

        const injectCookies = async () => {
            try {
                // Get auth token from localStorage
                const authToken = localStorage.getItem('auth_token');
                if (!authToken) {
                    console.warn('[WebView] No auth token found, skipping cookie injection');
                    return;
                }

                console.log('[WebView] 🍪 Injecting Google cookies for user:', userId);

                // Call Electron IPC to inject cookies
                if (window.electron?.browser?.launch) {
                    // Use browser.launch which handles cookie injection
                    console.log('[WebView] Cookie injection via browser.launch not needed for webview');
                } else if (window.electronAPI?.invoke) {
                    // Direct IPC call
                    const result = await window.electronAPI.invoke('google:injectCookies', userId, sessionPartition);
                    if (result.success) {
                        console.log('[WebView] ✅ Cookies injected successfully');
                        setCookiesInjected(true);
                    } else {
                        console.warn('[WebView] ⚠️ Cookie injection failed:', result.error);
                    }
                }
            } catch (error) {
                console.error('[WebView] Error injecting cookies:', error);
            }
        };

        injectCookies();
    }, [userId, sessionPartition, cookiesInjected]);

    // Use a ref to track the current expected URL to avoid cycles
    const currentUrlRef = useRef(url);

    // Update ref when url prop changes (e.g. from address bar input)
    useEffect(() => {
        if (url !== currentUrlRef.current) {
            currentUrlRef.current = url;
            // Only imperatively load if the webview isn't already there
            // This prevents re-loading the page when the update came from the page itself
            if (webviewRef.current && webviewRef.current.getURL() !== url) {
                // Ignore empty or about:blank unless explicitly requested
                if (url && url !== 'about:blank') {
                    webviewRef.current.loadURL(url);
                }
            }
        }
    }, [url]);

    useImperativeHandle(ref, () => ({
        reload: () => {
            if (webviewRef.current && typeof webviewRef.current.reload === 'function') {
                webviewRef.current.reload();
            }
        },
        goBack: () => {
            if (webviewRef.current && typeof webviewRef.current.goBack === 'function') {
                webviewRef.current.goBack();
            }
        },
        goForward: () => {
            if (webviewRef.current && typeof webviewRef.current.goForward === 'function') {
                webviewRef.current.goForward();
            }
        },
        stop: () => {
            if (webviewRef.current && typeof webviewRef.current.stop === 'function') {
                webviewRef.current.stop();
            }
        },
        loadURL: (url) => {
            if (webviewRef.current && typeof webviewRef.current.loadURL === 'function') {
                webviewRef.current.loadURL(url);
            }
        }
    }));

    useEffect(() => {
        const webview = webviewRef.current;
        if (!webview) return;

        const handleDidStartLoading = () => onLoadingChange(true);
        const handleDidStopLoading = () => onLoadingChange(false);
        const handleDidFinishLoad = () => onLoadingChange(false);

        const handlePageTitleUpdated = (e) => onTitleChange(e.title);

        // Helper to check if URL is a main frame navigation or noise
        const isValidNavigation = (navUrl) => {
            if (!navUrl) return false;
            // Ignore Google hovercards, widgets, and internal frames
            if (navUrl.includes('contacts.google.com/widget')) return false;
            if (navUrl.includes('plus.google.com/u/0/_/hovercard')) return false;
            if (navUrl.includes('accounts.google.com/SignOutOptions')) return false;
            return true;
        };

        const handleDidNavigate = (e) => {
            if (isValidNavigation(e.url)) {
                // Update our ref so we don't trigger a re-load loop
                currentUrlRef.current = e.url;
                onUrlChange(e.url);
            } else {
                console.log('[WebView] Ignoring navigation to:', e.url);
            }
        };

        const handleDidNavigateInPage = (e) => {
            if (isValidNavigation(e.url)) {
                currentUrlRef.current = e.url;
                onUrlChange(e.url);
            }
        };

        // Handle new windows (popups) - e.g. preventing them or opening in new tab
        const handleNewWindow = (e) => {
            console.log('[WebView] New window requested:', e.url);
            // Verify if it's a valid navigation or a popup we want to block/handle
            if (e.url.includes('contacts.google.com/widget')) {
                e.preventDefault(); // Block widget popups if they try to open separately
                return;
            }
            // For now, let Electron default handle it (usually new window) or we could implement open in new tab
            // e.preventDefault();
            // window.electronAPI.window.createForUser(userId, e.url);
        };

        const handleDomReady = () => {
            // Check if navigating to Google
            const currentUrl = webview.getURL ? webview.getURL() : url;
            const isGoogleUrl = currentUrl.includes('google.com') ||
                currentUrl.includes('googleapis.com') ||
                currentUrl.includes('gstatic.com');

            // Full stealth script for Google pages
            const stealthScript = `
(function() {
    'use strict';
    
    // Delete Electron/Node.js globals
    ['require', 'exports', 'module', 'process', '__dirname', '__filename', 'Buffer', 'global'].forEach(prop => {
        try { if (window[prop] !== undefined) delete window[prop]; } catch(e) {}
    });
    
    // Remove webdriver flag
    try {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
    } catch(e) {}
    
    // Add Chrome object (Google checks this!)
    if (!window.chrome) window.chrome = {};
    if (!window.chrome.runtime) {
        window.chrome.runtime = {
            id: undefined,
            connect: function() { return { onMessage: { addListener: function() {} }, postMessage: function() {} }; },
            sendMessage: function() {},
            onConnect: { addListener: function() {} },
            onMessage: { addListener: function() {} },
            getManifest: function() { return {}; },
            getURL: function(path) { return ''; }
        };
    }
    if (!window.chrome.loadTimes) {
        window.chrome.loadTimes = function() {
            return {
                commitLoadTime: Date.now() / 1000,
                connectionInfo: 'h2',
                finishDocumentLoadTime: Date.now() / 1000,
                finishLoadTime: Date.now() / 1000,
                firstPaintTime: Date.now() / 1000,
                navigationType: 'Other',
                requestTime: Date.now() / 1000 - 0.1,
                startLoadTime: Date.now() / 1000 - 0.1
            };
        };
    }
    if (!window.chrome.csi) {
        window.chrome.csi = function() {
            return { onloadT: Date.now(), pageT: Date.now() - performance.timing.navigationStart, startE: performance.timing.navigationStart, tran: 15 };
        };
    }
    if (!window.chrome.app) {
        window.chrome.app = { isInstalled: false, getDetails: function() { return null; }, getIsInstalled: function() { return false; } };
    }
    
    // Navigator overrides
    try { Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'], configurable: true }); } catch(e) {}
    try { Object.defineProperty(navigator, 'platform', { get: () => 'Win32', configurable: true }); } catch(e) {}
    try { Object.defineProperty(navigator, 'vendor', { get: () => 'Google Inc.', configurable: true }); } catch(e) {}
    try { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8, configurable: true }); } catch(e) {}
    try { Object.defineProperty(navigator, 'deviceMemory', { get: () => 8, configurable: true }); } catch(e) {}
    try { Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0, configurable: true }); } catch(e) {}
    
    // Plugins (Chrome has these)
    try {
        Object.defineProperty(navigator, 'plugins', {
            get: () => {
                const p = [
                    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
                    { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
                ];
                p.length = 3;
                return p;
            },
            configurable: true
        });
    } catch(e) {}
    
    console.log('[WebView Stealth] Applied');
})();
`;

            // Always apply stealth for Google URLs, basic for others
            if (isGoogleUrl) {
                webview.executeJavaScript(stealthScript).catch(() => { });
            } else {
                // Basic anti-detection for non-Google
                webview.executeJavaScript(`
                    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                `).catch(() => { });
            }

            // Inject autofill if credentials provided
            if (credentials && credentials.username && credentials.password) {
                const autofillScript = generateAutofillScript(credentials.username, credentials.password, url);
                webview.executeJavaScript(autofillScript).catch((e) => {
                    console.error('Autofill injection failed:', e);
                });
            }
        };

        // Event listeners
        webview.addEventListener('did-start-loading', handleDidStartLoading);
        webview.addEventListener('did-stop-loading', handleDidStopLoading);
        webview.addEventListener('did-finish-load', handleDidFinishLoad);
        webview.addEventListener('page-title-updated', handlePageTitleUpdated);
        webview.addEventListener('did-navigate', handleDidNavigate);
        webview.addEventListener('did-navigate-in-page', handleDidNavigateInPage);
        webview.addEventListener('dom-ready', handleDomReady);
        webview.addEventListener('new-window', handleNewWindow);

        return () => {
            // Using a ref-safe cleanup
            const cleanupWebview = webviewRef.current;
            if (cleanupWebview) {
                cleanupWebview.removeEventListener('did-start-loading', handleDidStartLoading);
                cleanupWebview.removeEventListener('did-stop-loading', handleDidStopLoading);
                cleanupWebview.removeEventListener('did-finish-load', handleDidFinishLoad);
                cleanupWebview.removeEventListener('page-title-updated', handlePageTitleUpdated);
                cleanupWebview.removeEventListener('did-navigate', handleDidNavigate);
                cleanupWebview.removeEventListener('did-navigate-in-page', handleDidNavigateInPage);
                cleanupWebview.removeEventListener('dom-ready', handleDomReady);
                cleanupWebview.removeEventListener('new-window', handleNewWindow);
            }
        };
    }, [userId, sessionPartition]); // Removed 'url' from dependency to prevent re-binding loops

    // Log partition usage only on mount or change
    useEffect(() => {
        console.log('[WebView] Active partition:', sessionPartition || 'DEFAULT (Shared)');
    }, [sessionPartition]);

    return (
        <div className={`w-full h-full flex flex-col ${isActive ? 'visible' : 'hidden'}`}>
            <webview
                ref={webviewRef}
                src={initialUrl} // Initial src only - updates handled by loadURL
                partition={sessionPartition}
                useragent={userAgent}
                style={{ width: '100%', height: '100%', display: 'flex' }}
                allowpopups="true"
                webpreferences="contextIsolation=yes"
            />
        </div>
    );
});

// Custom comparison to avoid re-renders due to new function references in parent
const arePropsEqual = (prevProps, nextProps) => {
    return (
        prevProps.url === nextProps.url &&
        prevProps.isActive === nextProps.isActive &&
        prevProps.partition === nextProps.partition &&
        prevProps.userId === nextProps.userId &&
        prevProps.userAgent === nextProps.userAgent &&
        // Deep compare credentials if necessary, or just shallow
        prevProps.credentials === nextProps.credentials
    );
};

export default React.memo(WebView, arePropsEqual);
