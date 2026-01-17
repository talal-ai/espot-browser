/**
 * Autofill Script Generator
 * 
 * Generates injectable JavaScript code for autofill functionality.
 * Uses the shared autofill helpers and flow orchestrator.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Get the inlined helper code as a string for injection
 * This reads the compiled helpers and flow modules and inlines them
 */
export function getInlinedHelpersCode(): string {
  // In production, these would be bundled. For now, we inline the source.
  // The helpers and flow modules will be stringified and injected.
  
  return `
    // === AUTOFILL HELPERS (Inlined) ===
    
    function waitForSelector(selector, options = {}) {
      const { visible = true, timeout = 8000 } = options;
      
      return new Promise((resolve) => {
        const existing = document.querySelector(selector);
        if (existing && (!visible || isVisible(existing))) {
          return resolve(existing);
        }
        
        const observer = new MutationObserver(() => {
          const element = document.querySelector(selector);
          if (element && (!visible || isVisible(element))) {
            observer.disconnect();
            clearTimeout(timeoutId);
            resolve(element);
          }
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class'],
        });
        
        const timeoutId = setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, timeout);
      });
    }
    
    function isVisible(element) {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        element.offsetParent !== null
      );
    }
    
    function findField(selectors) {
      for (const selector of selectors) {
        try {
          const fields = document.querySelectorAll(selector);
          for (const field of fields) {
            if (isVisible(field) && !field.disabled && !field.readOnly) {
              return field;
            }
          }
        } catch (e) {}
      }
      return null;
    }
    
    function findFieldByLabel(labelText) {
      const labels = document.querySelectorAll('label');
      for (const label of labels) {
        const text = (label.textContent || '').toLowerCase();
        if (text.includes(labelText.toLowerCase())) {
          const forAttr = label.getAttribute('for');
          if (forAttr) {
            const input = document.getElementById(forAttr);
            if (input && input.tagName === 'INPUT' && isVisible(input)) {
              return input;
            }
          }
          const input = label.querySelector('input');
          if (input && isVisible(input)) {
            return input;
          }
          const nextEl = label.nextElementSibling;
          if (nextEl && nextEl.tagName === 'INPUT' && isVisible(nextEl)) {
            return nextEl;
          }
        }
      }
      return null;
    }
    
    function safeFillField(field, value) {
      if (!field || !value) return false;
      try {
        field.focus();
        field.value = '';
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeSetter) {
          nativeSetter.call(field, value);
        } else {
          field.value = value;
        }
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        field.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
        field.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
        return true;
      } catch (e) {
        console.warn('[ESPOT] safeFillField error:', e);
        return false;
      }
    }
    
    function findButtonByText(texts) {
      const candidates = document.querySelectorAll(
        'button, input[type="submit"], input[type="button"], a[role="button"], div[role="button"]'
      );
      for (const candidate of candidates) {
        if (!isVisible(candidate)) continue;
        const text = (candidate.textContent || candidate.value || '').toLowerCase().trim();
        for (const searchText of texts) {
          if (text.includes(searchText.toLowerCase())) {
            return candidate;
          }
        }
      }
      return null;
    }
    
    function clickButton(element) {
      if (!element) return false;
      try {
        element.scrollIntoView({ behavior: 'instant', block: 'center' });
        element.focus();
        element.click();
        element.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true, button: 0 }));
        element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        const form = element.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
        return true;
      } catch (e) {
        console.warn('[ESPOT] clickButton error:', e);
        return false;
      }
    }
    
    function cleanupCredentials() {
      try {
        const keysToRemove = ['ESPOT_PASS', 'ESPOT_GOOGLE_PASS', 'ESPOT_AUTOFILL_PASSWORD'];
        for (const key of keysToRemove) {
          try {
            sessionStorage.removeItem(key);
          } catch (e) {}
        }
      } catch (e) {
        console.warn('[ESPOT] cleanupCredentials error:', e);
      }
    }
    
    function installGuard(key, ttl = 60000) {
      const guardKey = '__ESPOT_GUARD_' + key;
      if (window[guardKey]) {
        return false;
      }
      window[guardKey] = true;
      setTimeout(() => {
        delete window[guardKey];
      }, ttl);
      return true;
    }
  `;
}

/**
 * Generate autofill script using the shared flow orchestrator
 */
export function generateModernAutofillScript(
  username: string,
  password: string,
  url: string
): string {
  const escapedUsername = username.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
  const escapedPassword = password.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

  const helpersCode = getInlinedHelpersCode();

  return `
(function() {
  'use strict';
  
  ${helpersCode}
  
  // === AUTOFILL FLOW ORCHESTRATOR ===
  
  const CREDENTIALS = {
    username: \`${escapedUsername}\`,
    password: \`${escapedPassword}\`
  };
  
  const USERNAME_SELECTORS = [
    'input[autocomplete="username"]',
    'input[autocomplete="email"]',
    'input[type="email"]',
    'input[name="identifier"]',
    'input[name="email"]',
    'input[name="username"]',
    'input[name="login"]',
    'input[name="user"]',
    'input[id*="email" i]',
    'input[id*="user" i]',
    'input[id*="login" i]',
    'input[placeholder*="email" i]',
    'input[placeholder*="user" i]',
    'input[aria-label*="email" i]',
    'input[aria-label*="user" i]',
    'input[type="text"]'
  ];
  
  const PASSWORD_SELECTORS = [
    'input[type="password"]',
    'input[autocomplete="current-password"]',
    'input[autocomplete="new-password"]',
    'input[name*="pass" i]',
    'input[id*="pass" i]'
  ];
  
  const NEXT_BUTTON_TEXTS = ['next', 'continue', 'next step', 'proceed', 'siguiente', 'continuar', 'suivant'];
  const SUBMIT_BUTTON_TEXTS = ['sign in', 'signin', 'log in', 'login', 'submit', 'entrar', 'connexion'];
  
  async function runAutofillFlow() {
    console.log('[ESPOT] Starting autofill flow...');
    
    if (!installGuard('AUTOFILL_FLOW', 60000)) {
      console.log('[ESPOT] Autofill flow already running, skipping');
      return;
    }
    
    try {
      // Step 1: Check if password field is already visible (single-step flow)
      let passwordField = findField(PASSWORD_SELECTORS);
      
      if (passwordField) {
        console.log('[ESPOT] Detected single-step login');
        
        const usernameField = findFieldByLabel('email') || findFieldByLabel('username') || findFieldByLabel('user') || findField(USERNAME_SELECTORS);
        
        if (usernameField && !usernameField.value) {
          safeFillField(usernameField, CREDENTIALS.username);
          console.log('[ESPOT] Username filled');
        }
        
        if (!passwordField.value) {
          safeFillField(passwordField, CREDENTIALS.password);
          console.log('[ESPOT] Password filled');
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        const submitButton = findButtonByText(SUBMIT_BUTTON_TEXTS);
        if (submitButton) {
          clickButton(submitButton);
          console.log('[ESPOT] Form submitted');
        }
        
        cleanupCredentials();
        return;
      }
      
      // Step 2: Multi-step flow
      console.log('[ESPOT] Detected multi-step login');
      
      let usernameField = findFieldByLabel('email') || findFieldByLabel('username') || findFieldByLabel('user') || findField(USERNAME_SELECTORS);
      
      if (!usernameField) {
        console.log('[ESPOT] Waiting for username field...');
        usernameField = await waitForSelector(USERNAME_SELECTORS[0], { timeout: 5000 });
        if (!usernameField) {
          console.log('[ESPOT] Username field not found');
          return;
        }
      }
      
      safeFillField(usernameField, CREDENTIALS.username);
      console.log('[ESPOT] Username filled');
      
      // Store password for next step
      try {
        sessionStorage.setItem('ESPOT_PASS', CREDENTIALS.password);
      } catch (e) {}
      
      // Click Next button
      await new Promise(resolve => setTimeout(resolve, 500));
      const nextButton = findButtonByText(NEXT_BUTTON_TEXTS);
      
      if (nextButton) {
        console.log('[ESPOT] Clicking Next button');
        clickButton(nextButton);
      } else {
        console.log('[ESPOT] Next button not found, pressing Enter');
        usernameField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        usernameField.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      }
      
      // Step 3: Wait for password field
      console.log('[ESPOT] Waiting for password field...');
      passwordField = await waitForSelector(PASSWORD_SELECTORS[0], { timeout: 10000 });
      
      if (!passwordField) {
        passwordField = findField(PASSWORD_SELECTORS);
      }
      
      if (passwordField) {
        console.log('[ESPOT] Password field found');
        
        let storedPassword = CREDENTIALS.password;
        try {
          storedPassword = sessionStorage.getItem('ESPOT_PASS') || CREDENTIALS.password;
          sessionStorage.removeItem('ESPOT_PASS');
        } catch (e) {}
        
        if (!passwordField.value) {
          safeFillField(passwordField, storedPassword);
          console.log('[ESPOT] Password filled');
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        const submitButton = findButtonByText(SUBMIT_BUTTON_TEXTS);
        if (submitButton) {
          clickButton(submitButton);
          console.log('[ESPOT] Form submitted');
        }
        
        cleanupCredentials();
      } else {
        console.log('[ESPOT] Password field not found after waiting');
      }
    } catch (error) {
      console.error('[ESPOT] Autofill flow error:', error);
      cleanupCredentials();
    }
  }
  
  // Watch for password field (fallback)
  function watchForPasswordField() {
    let storedPassword = null;
    try {
      storedPassword = sessionStorage.getItem('ESPOT_PASS');
    } catch (e) {}
    
    if (!storedPassword && !CREDENTIALS.password) return;
    
    const password = storedPassword || CREDENTIALS.password;
    
    const observer = new MutationObserver(() => {
      const passwordField = findField(PASSWORD_SELECTORS);
      if (passwordField && !passwordField.value) {
        console.log('[ESPOT] Password field detected (delayed)');
        safeFillField(passwordField, password);
        
        try {
          sessionStorage.removeItem('ESPOT_PASS');
        } catch (e) {}
        
        setTimeout(() => {
          const submitButton = findButtonByText(SUBMIT_BUTTON_TEXTS);
          if (submitButton) {
            clickButton(submitButton);
          }
        }, 500);
        
        observer.disconnect();
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    setTimeout(() => {
      observer.disconnect();
      cleanupCredentials();
    }, 30000);
  }
  
  // Execute
  runAutofillFlow().catch(e => console.error('[ESPOT] Flow error:', e));
  watchForPasswordField();
  
  console.log('[ESPOT] Autofill script initialized');
})();
`;
}
