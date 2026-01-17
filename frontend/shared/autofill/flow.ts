/**
 * Autofill Flow Orchestrator
 * 
 * Handles single-step and multi-step login flows automatically.
 * Supports:
 * - Single-page logins (username + password on same page)
 * - Multi-step logins (email → Next → password)
 * - Navigation-based flows (email submit navigates to password page)
 */

import {
  waitForSelector,
  findField,
  findFieldByLabel,
  safeFillField,
  findButtonByText,
  clickButton,
  cleanupCredentials,
  installGuard,
} from './helpers';

export interface AutofillCredentials {
  username: string;
  password: string;
}

export interface AutofillOptions {
  usernameSelectors?: string[];
  passwordSelectors?: string[];
  nextButtonTexts?: string[];
  submitButtonTexts?: string[];
  passwordWaitTimeout?: number;
  maxRetries?: number;
}

export interface AutofillResult {
  success: boolean;
  reason?: string;
  usernameFilled: boolean;
  passwordFilled: boolean;
}

// Default selectors (priority-ordered)
const DEFAULT_USERNAME_SELECTORS = [
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
  'input[type="text"]',
];

const DEFAULT_PASSWORD_SELECTORS = [
  'input[type="password"]',
  'input[autocomplete="current-password"]',
  'input[autocomplete="new-password"]',
  'input[name*="pass" i]',
  'input[id*="pass" i]',
];

const DEFAULT_NEXT_BUTTON_TEXTS = [
  'next',
  'continue',
  'next step',
  'proceed',
  'siguiente',
  'continuar',
  'suivant',
];

const DEFAULT_SUBMIT_BUTTON_TEXTS = [
  'sign in',
  'signin',
  'log in',
  'login',
  'submit',
  'entrar',
  'connexion',
];

/**
 * Run the autofill flow
 * Handles both single-step and multi-step login flows
 */
export async function runAutofillFlow(
  credentials: AutofillCredentials,
  options: AutofillOptions = {}
): Promise<AutofillResult> {
  const {
    usernameSelectors = DEFAULT_USERNAME_SELECTORS,
    passwordSelectors = DEFAULT_PASSWORD_SELECTORS,
    nextButtonTexts = DEFAULT_NEXT_BUTTON_TEXTS,
    submitButtonTexts = DEFAULT_SUBMIT_BUTTON_TEXTS,
    passwordWaitTimeout = 10000,
    maxRetries = 3,
  } = options;

  console.log('[ESPOT] Starting autofill flow...');

  // Install guard to prevent duplicate runs
  if (!installGuard('AUTOFILL_FLOW', 60000)) {
    console.log('[ESPOT] Autofill flow already running, skipping');
    return {
      success: false,
      reason: 'Already running',
      usernameFilled: false,
      passwordFilled: false,
    };
  }

  let usernameFilled = false;
  let passwordFilled = false;

  try {
    // Step 1: Check if password field is already visible (single-step flow)
    let passwordField = findField(passwordSelectors);

    if (passwordField) {
      console.log('[ESPOT] Detected single-step login (password visible)');

      // Fill username
      const usernameField =
        findFieldByLabel('email') ||
        findFieldByLabel('username') ||
        findFieldByLabel('user') ||
        findField(usernameSelectors);

      if (usernameField && !usernameField.value) {
        usernameFilled = safeFillField(usernameField, credentials.username);
        console.log(`[ESPOT] Username filled: ${usernameFilled}`);
      }

      // Fill password
      if (!passwordField.value) {
        passwordFilled = safeFillField(passwordField, credentials.password);
        console.log(`[ESPOT] Password filled: ${passwordFilled}`);
      }

      // Submit form
      if (usernameFilled || passwordFilled) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const submitButton = findButtonByText(submitButtonTexts);
        if (submitButton) {
          clickButton(submitButton);
          console.log('[ESPOT] Form submitted');
        }
      }

      cleanupCredentials();
      return {
        success: true,
        usernameFilled,
        passwordFilled,
      };
    }

    // Step 2: Multi-step flow - Fill username and click Next
    console.log('[ESPOT] Detected multi-step login (password not visible)');

    const usernameField =
      findFieldByLabel('email') ||
      findFieldByLabel('username') ||
      findFieldByLabel('user') ||
      findField(usernameSelectors);

    if (!usernameField) {
      console.log('[ESPOT] Username field not found, waiting...');
      const waitedField = await waitForSelector(usernameSelectors[0], {
        timeout: 5000,
      });

      if (!waitedField) {
        return {
          success: false,
          reason: 'Username field not found',
          usernameFilled: false,
          passwordFilled: false,
        };
      }

      usernameFilled = safeFillField(
        waitedField as HTMLInputElement,
        credentials.username
      );
    } else {
      usernameFilled = safeFillField(usernameField, credentials.username);
    }

    console.log(`[ESPOT] Username filled: ${usernameFilled}`);

    // Store password for next step
    try {
      sessionStorage.setItem('ESPOT_PASS', credentials.password);
    } catch (e) {
      console.warn('[ESPOT] Could not store password in sessionStorage');
    }

    // Click Next button
    await new Promise((resolve) => setTimeout(resolve, 500));
    const nextButton = findButtonByText(nextButtonTexts);

    if (nextButton) {
      console.log('[ESPOT] Clicking Next button...');
      clickButton(nextButton);
    } else {
      // Fallback: Press Enter on username field
      console.log('[ESPOT] Next button not found, pressing Enter');
      if (usernameField) {
        usernameField.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
        );
        usernameField.dispatchEvent(
          new KeyboardEvent('keyup', { key: 'Enter', bubbles: true })
        );
      }
    }

    // Step 3: Wait for password field to appear
    console.log('[ESPOT] Waiting for password field...');
    passwordField = await waitForSelector(passwordSelectors[0], {
      timeout: passwordWaitTimeout,
    }) as HTMLInputElement;

    if (!passwordField) {
      // Try alternative selectors
      passwordField = findField(passwordSelectors);
    }

    if (passwordField) {
      console.log('[ESPOT] Password field found');

      // Retrieve stored password
      let storedPassword = credentials.password;
      try {
        storedPassword =
          sessionStorage.getItem('ESPOT_PASS') || credentials.password;
        sessionStorage.removeItem('ESPOT_PASS');
      } catch (e) {
        // Use original password
      }

      // Fill password
      if (!passwordField.value) {
        passwordFilled = safeFillField(passwordField, storedPassword);
        console.log(`[ESPOT] Password filled: ${passwordFilled}`);
      }

      // Submit form
      await new Promise((resolve) => setTimeout(resolve, 500));
      const submitButton = findButtonByText(submitButtonTexts);
      if (submitButton) {
        clickButton(submitButton);
        console.log('[ESPOT] Form submitted');
      }

      cleanupCredentials();
      return {
        success: true,
        usernameFilled,
        passwordFilled,
      };
    } else {
      console.log('[ESPOT] Password field not found after waiting');
      return {
        success: false,
        reason: 'Password field not found',
        usernameFilled,
        passwordFilled: false,
      };
    }
  } catch (error) {
    console.error('[ESPOT] Autofill flow error:', error);
    cleanupCredentials();
    return {
      success: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
      usernameFilled,
      passwordFilled,
    };
  }
}

/**
 * Watch for password field in case of delayed rendering or navigation
 * Used as a fallback mechanism
 */
export function watchForPasswordField(
  credentials: AutofillCredentials,
  options: AutofillOptions = {}
): void {
  const {
    passwordSelectors = DEFAULT_PASSWORD_SELECTORS,
    submitButtonTexts = DEFAULT_SUBMIT_BUTTON_TEXTS,
  } = options;

  // Check if password is stored in sessionStorage
  let storedPassword: string | null = null;
  try {
    storedPassword = sessionStorage.getItem('ESPOT_PASS');
  } catch (e) {
    // Not available
  }

  if (!storedPassword && !credentials.password) {
    return;
  }

  const password = storedPassword || credentials.password;

  const observer = new MutationObserver(() => {
    const passwordField = findField(passwordSelectors);
    if (passwordField && !passwordField.value) {
      console.log('[ESPOT] Password field detected (delayed)');
      safeFillField(passwordField, password);

      // Clean up
      try {
        sessionStorage.removeItem('ESPOT_PASS');
      } catch (e) {
        // Ignore
      }

      // Submit
      setTimeout(() => {
        const submitButton = findButtonByText(submitButtonTexts);
        if (submitButton) {
          clickButton(submitButton);
        }
      }, 500);

      observer.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Auto-disconnect after 30 seconds
  setTimeout(() => {
    observer.disconnect();
    cleanupCredentials();
  }, 30000);
}
