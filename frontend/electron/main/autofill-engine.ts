/**
 * Smart Autofill Engine for ESPOT Browser
 * 
 * Multi-layer detection approach for filling login forms:
 * 1. Label-based detection (most human-like)
 * 2. Placeholder detection
 * 3. Type/autocomplete attributes
 * 4. Name/ID heuristics
 */

export interface AutofillCredentials {
  username: string;
  password: string;
}

/**
 * Generate the autofill injection script
 * This script will be injected into the browser window after page load
 */
export function generateAutofillScript(credentials: AutofillCredentials): string {
  // Escape strings for injection
  const escapedUsername = credentials.username.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const escapedPassword = credentials.password.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  return `
(function() {
  'use strict';
  
  const CREDENTIALS = {
    username: '${escapedUsername}',
    password: '${escapedPassword}'
  };

  // Priority-ordered username field selectors
  const usernameSelectors = [
    // Level 1: Autocomplete attribute (most reliable)
    'input[autocomplete="username"]',
    'input[autocomplete="email"]',
    
    // Level 2: Type attribute
    'input[type="email"]',
    
    // Level 3: Name/ID contains common keywords (case insensitive via JS)
    'input[name*="user" i]',
    'input[name*="email" i]',
    'input[name*="login" i]',
    'input[name*="identifier" i]',
    'input[id*="user" i]',
    'input[id*="email" i]',
    'input[id*="login" i]',
    
    // Level 4: Placeholder text
    'input[placeholder*="email" i]',
    'input[placeholder*="user" i]',
    'input[placeholder*="login" i]',
    
    // Level 5: aria-label (accessibility)
    'input[aria-label*="email" i]',
    'input[aria-label*="user" i]',
    
    // Level 6: Generic text input (fallback)
    'input[type="text"]'
  ];

  // Priority-ordered password field selectors
  const passwordSelectors = [
    // Level 1: Type is password (most reliable)
    'input[type="password"]',
    
    // Level 2: Autocomplete
    'input[autocomplete="current-password"]',
    'input[autocomplete="new-password"]',
    
    // Level 3: Name/ID
    'input[name*="pass" i]',
    'input[name*="pwd" i]',
    'input[id*="pass" i]',
    'input[id*="pwd" i]'
  ];

  /**
   * Find a field by label text association
   */
  function findFieldByLabel(labelText) {
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
      if (label.textContent && label.textContent.toLowerCase().includes(labelText.toLowerCase())) {
        // Method 1: for attribute
        const forAttr = label.getAttribute('for');
        if (forAttr) {
          const input = document.getElementById(forAttr);
          if (input && input.tagName === 'INPUT') return input;
        }
        // Method 2: Input inside label
        const input = label.querySelector('input');
        if (input) return input;
        // Method 3: Adjacent input
        const nextInput = label.nextElementSibling;
        if (nextInput && nextInput.tagName === 'INPUT') return nextInput;
      }
    }
    return null;
  }

  /**
   * Find field using selector priority list
   */
  function findFieldBySelectors(selectors) {
    for (const selector of selectors) {
      try {
        const field = document.querySelector(selector);
        if (field && isVisible(field) && !field.disabled && !field.readOnly) {
          return field;
        }
      } catch (e) {
        // Skip invalid selectors
      }
    }
    return null;
  }

  /**
   * Check if element is visible
   */
  function isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetParent !== null;
  }

  /**
   * Fill a field with value, triggering proper events
   */
  function fillField(field, value) {
    if (!field || !value) return false;
    
    // Focus the field
    field.focus();
    
    // Clear existing value
    field.value = '';
    
    // Set the value
    field.value = value;
    
    // Trigger input events (important for React/Vue/Angular apps)
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    
    // For some frameworks
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(field, value);
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    return true;
  }

  // Submit button selectors (priority ordered)
  const submitSelectors = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button[data-testid*="login" i]',
    'button[data-testid*="signin" i]',
    'button[name*="login" i]',
    'button[name*="signin" i]',
    'button[id*="login" i]',
    'button[id*="signin" i]',
    'button[class*="login" i]',
    'button[class*="signin" i]',
    'input[value*="sign in" i]',
    'input[value*="login" i]',
  ];

  /**
   * Find submit button by text content
   */
  function findButtonByText(texts) {
    const buttons = document.querySelectorAll('button, input[type="submit"], a[role="button"], div[role="button"]');
    for (const btn of buttons) {
      if (!isVisible(btn)) continue;
      const btnText = (btn.textContent || btn.value || '').toLowerCase().trim();
      for (const text of texts) {
        if (btnText.includes(text.toLowerCase())) {
          return btn;
        }
      }
    }
    return null;
  }

  /**
   * Find and return submit button
   */
  function findSubmitButton() {
    // Try CSS selectors first
    for (const selector of submitSelectors) {
      try {
        const btn = document.querySelector(selector);
        if (btn && isVisible(btn) && !btn.disabled) return btn;
      } catch (e) {}
    }
    // Try text-based search
    return findButtonByText(['sign in', 'signin', 'log in', 'login', 'submit', 'continue', 'next']);
  }

  /**
   * Click the submit button
   */
  function clickSubmit() {
    const submitBtn = findSubmitButton();
    if (submitBtn) {
      console.log('[ESPOT Autofill] Found submit button, clicking...');
      submitBtn.focus();
      submitBtn.click();
      submitBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      console.log('[ESPOT Autofill] ✅ Clicked sign-in button');
      return true;
    }
    return false;
  }

  /**
   * Main autofill function
   */
  function autofill() {
    console.log('[ESPOT Autofill] Starting autofill...');
    
    let usernameField = null;
    let passwordField = null;
    
    // Try label-based detection first (most human-like)
    usernameField = findFieldByLabel('email') || 
                    findFieldByLabel('username') ||
                    findFieldByLabel('user') ||
                    findFieldByLabel('login');
    
    passwordField = findFieldByLabel('password') || 
                    findFieldByLabel('pass');
    
    // Fallback to selector-based detection
    if (!usernameField) {
      usernameField = findFieldBySelectors(usernameSelectors);
    }
    
    if (!passwordField) {
      passwordField = findFieldBySelectors(passwordSelectors);
    }
    
    let usernameFilled = false;
    let passwordFilled = false;
    
    // Fill username field
    if (usernameField && !usernameField.value) {
      fillField(usernameField, CREDENTIALS.username);
      usernameFilled = true;
      console.log('[ESPOT Autofill] Username field: FILLED');
    } else if (usernameField) {
      usernameFilled = true;
    } else {
      console.log('[ESPOT Autofill] Username field: NOT FOUND');
    }
    
    // Fill password field (may be on same page or different page)
    if (passwordField && !passwordField.value) {
      fillField(passwordField, CREDENTIALS.password);
      passwordFilled = true;
      console.log('[ESPOT Autofill] Password field: FILLED');
    } else if (passwordField) {
      passwordFilled = true;
    } else {
      console.log('[ESPOT Autofill] Password field: NOT FOUND (may be on next page)');
      // Store credentials for next page (for Google-style login)
      sessionStorage.setItem('ESPOT_AUTOFILL_PASSWORD', CREDENTIALS.password);
    }
    
    // Auto-click sign-in if both fields are filled
    if (usernameFilled && passwordFilled) {
      setTimeout(clickSubmit, 500);
    } else if (usernameFilled && !passwordField) {
      // Multi-step login: click next/continue
      setTimeout(clickSubmit, 500);
    }
    
    return {
      usernameFound: !!usernameField,
      passwordFound: !!passwordField,
      usernameFilled,
      passwordFilled
    };
  }

  /**
   * Watch for password field on page changes (for multi-step logins like Google)
   */
  function watchForPasswordField() {
    const storedPassword = sessionStorage.getItem('ESPOT_AUTOFILL_PASSWORD');
    if (!storedPassword) return;
    
    const observer = new MutationObserver((mutations) => {
      const passwordField = findFieldBySelectors(passwordSelectors);
      if (passwordField && !passwordField.value) {
        fillField(passwordField, storedPassword);
        sessionStorage.removeItem('ESPOT_AUTOFILL_PASSWORD');
        console.log('[ESPOT Autofill] Password field (delayed): FILLED');
        // Auto-click after filling password
        setTimeout(clickSubmit, 500);
        observer.disconnect();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Auto-disconnect after 30 seconds
    setTimeout(() => observer.disconnect(), 30000);
  }

  // Run autofill
  const result = autofill();
  
  // If password not found, watch for it (multi-step login)
  if (!result.passwordFound) {
    watchForPasswordField();
  }
  
  // Also try again after a short delay (for slow-loading forms)
  setTimeout(autofill, 1000);
  setTimeout(autofill, 2500);
  
  console.log('[ESPOT Autofill] Complete');
})();
`;
}

/**
 * Generate script for Google-specific login flow
 * Google has a multi-step login that requires special handling
 */
export function generateGoogleAutofillScript(credentials: AutofillCredentials): string {
  const escapedUsername = credentials.username.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const escapedPassword = credentials.password.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  return `
(function() {
  'use strict';
  
  const CREDENTIALS = {
    username: '${escapedUsername}',
    password: '${escapedPassword}'
  };

  function fillField(field, value) {
    if (!field) return false;
    field.focus();
    field.value = value;
    // Native value setter for React
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    if (nativeSetter) nativeSetter.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function clickButton(selectors) {
    for (const selector of selectors) {
      try {
        const btn = document.querySelector(selector);
        if (btn && !btn.disabled) {
          btn.click();
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          return true;
        }
      } catch (e) {}
    }
    return false;
  }

  // Google login step 1: Email
  const emailField = document.querySelector('input[type="email"]') || 
                     document.querySelector('input[name="identifier"]');
  
  if (emailField && !emailField.value) {
    fillField(emailField, CREDENTIALS.username);
    console.log('[ESPOT] Google email filled');
    
    // Store password for next step
    sessionStorage.setItem('ESPOT_GOOGLE_PASS', CREDENTIALS.password);
    
    // Try to click Next button
    setTimeout(() => {
      clickButton([
        'button[type="submit"]',
        '#identifierNext',
        '#identifierNext button',
        'div[id="identifierNext"]',
        'button[jsname]'
      ]);
      console.log('[ESPOT] Clicked Next on Google login');
    }, 500);
  }
  
  // Google login step 2: Password
  const passwordField = document.querySelector('input[type="password"]') ||
                        document.querySelector('input[name="password"]');
  
  if (passwordField && !passwordField.value) {
    const storedPass = sessionStorage.getItem('ESPOT_GOOGLE_PASS') || CREDENTIALS.password;
    fillField(passwordField, storedPass);
    sessionStorage.removeItem('ESPOT_GOOGLE_PASS');
    console.log('[ESPOT] Google password filled');
    
    // Click sign-in
    setTimeout(() => {
      clickButton([
        'button[type="submit"]',
        '#passwordNext',
        '#passwordNext button',
        'div[id="passwordNext"]'
      ]);
      console.log('[ESPOT] Clicked Sign In on Google login');
    }, 500);
  }
  
  // Watch for password field on page change
  const observer = new MutationObserver(() => {
    const pwField = document.querySelector('input[type="password"]');
    if (pwField && !pwField.value) {
      const storedPass = sessionStorage.getItem('ESPOT_GOOGLE_PASS');
      if (storedPass) {
        fillField(pwField, storedPass);
        sessionStorage.removeItem('ESPOT_GOOGLE_PASS');
        console.log('[ESPOT] Google password filled (delayed)');
        
        // Click sign-in
        setTimeout(() => {
          clickButton([
            'button[type="submit"]',
            '#passwordNext',
            '#passwordNext button'
          ]);
        }, 500);
        
        observer.disconnect();
      }
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 60000);
})();
`;
}

