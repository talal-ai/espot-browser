import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

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

const WebView = forwardRef(({ url, isActive, partition, userAgent, credentials, onTitleChange, onUrlChange, onLoadingChange, onFaviconChange }, ref) => {
    const webviewRef = useRef(null);

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

        const handleDidNavigate = (e) => onUrlChange(e.url);
        const handleDidNavigateInPage = (e) => onUrlChange(e.url);

        const handleDomReady = () => {
            // Anti-detection: Delete navigator.webdriver in the webview
            webview.executeJavaScript(`
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
             `).catch(() => { });
            
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

        return () => {
            if (webview) {
                webview.removeEventListener('did-start-loading', handleDidStartLoading);
                webview.removeEventListener('did-stop-loading', handleDidStopLoading);
                webview.removeEventListener('did-finish-load', handleDidFinishLoad);
                webview.removeEventListener('page-title-updated', handlePageTitleUpdated);
                webview.removeEventListener('did-navigate', handleDidNavigate);
                webview.removeEventListener('did-navigate-in-page', handleDidNavigateInPage);
                webview.removeEventListener('dom-ready', handleDomReady);
            }
        };
    }, []);

    return (
        <div className={`w-full h-full flex flex-col ${isActive ? 'visible' : 'hidden'}`}>
            <webview
                ref={webviewRef}
                src={url}
                partition={partition || 'persist:main'}
                useragent={userAgent}
                style={{ width: '100%', height: '100%', display: 'flex' }}
                allowpopups="true"
                webpreferences="contextIsolation=yes"
            />
        </div>
    );
});

export default WebView;
