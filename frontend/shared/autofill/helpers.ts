/**
 * Shared Autofill Helpers
 * 
 * Core utilities for intelligent form detection and filling.
 * Used by all autofill injection points to ensure consistent behavior.
 */

export interface WaitForSelectorOptions {
  visible?: boolean;
  timeout?: number;
}

/**
 * Wait for an element matching selector to appear in the DOM
 * Returns the element or null if timeout expires
 */
export function waitForSelector(
  selector: string,
  options: WaitForSelectorOptions = {}
): Promise<HTMLElement | null> {
  const { visible = true, timeout = 8000 } = options;

  return new Promise((resolve) => {
    // Check if element already exists
    const existing = document.querySelector(selector) as HTMLElement;
    if (existing && (!visible || isVisible(existing))) {
      return resolve(existing);
    }

    // Set up observer to watch for element
    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector) as HTMLElement;
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

    // Timeout handler
    const timeoutId = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * Check if an element is visible on the page
 */
export function isVisible(element: HTMLElement): boolean {
  if (!element) return false;
  
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetParent !== null
  );
}

/**
 * Find a visible input field using an array of selectors (priority-ordered)
 */
export function findField(selectors: string[]): HTMLInputElement | null {
  for (const selector of selectors) {
    try {
      const fields = document.querySelectorAll(selector);
      for (const field of fields) {
        const input = field as HTMLInputElement;
        if (isVisible(input) && !input.disabled && !input.readOnly) {
          return input;
        }
      }
    } catch (e) {
      // Invalid selector, skip
    }
  }
  return null;
}

/**
 * Find an input field by its associated label text
 */
export function findFieldByLabel(labelText: string): HTMLInputElement | null {
  const labels = document.querySelectorAll('label');
  
  for (const label of labels) {
    const text = (label.textContent || '').toLowerCase();
    if (text.includes(labelText.toLowerCase())) {
      // Method 1: Check 'for' attribute
      const forAttr = label.getAttribute('for');
      if (forAttr) {
        const input = document.getElementById(forAttr) as HTMLInputElement;
        if (input && input.tagName === 'INPUT' && isVisible(input)) {
          return input;
        }
      }
      
      // Method 2: Input inside label
      const input = label.querySelector('input') as HTMLInputElement;
      if (input && isVisible(input)) {
        return input;
      }
      
      // Method 3: Adjacent input
      const nextEl = label.nextElementSibling as HTMLInputElement;
      if (nextEl && nextEl.tagName === 'INPUT' && isVisible(nextEl)) {
        return nextEl;
      }
    }
  }
  
  return null;
}

/**
 * Safely fill an input field with proper event triggering
 * Works with React, Vue, Angular, and vanilla forms
 */
export function safeFillField(field: HTMLInputElement, value: string): boolean {
  if (!field || !value) return false;

  try {
    // Focus the field
    field.focus();

    // Clear existing value
    field.value = '';

    // Set value using native setter (important for React/Vue/Angular)
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;

    if (nativeSetter) {
      nativeSetter.call(field, value);
    } else {
      field.value = value;
    }

    // Trigger all necessary events
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

/**
 * Find a button by text content (supports substring matching)
 */
export function findButtonByText(texts: string[]): HTMLElement | null {
  const candidates = document.querySelectorAll(
    'button, input[type="submit"], input[type="button"], a[role="button"], div[role="button"]'
  );

  for (const candidate of candidates) {
    if (!isVisible(candidate as HTMLElement)) continue;

    const element = candidate as HTMLElement;
    const text = (
      element.textContent ||
      (element as HTMLInputElement).value ||
      ''
    ).toLowerCase().trim();

    for (const searchText of texts) {
      if (text.includes(searchText.toLowerCase())) {
        return element;
      }
    }
  }

  return null;
}

/**
 * Click a button/element with multiple event strategies for reliability
 */
export function clickButton(element: HTMLElement): boolean {
  if (!element) return false;

  try {
    // Scroll into view
    element.scrollIntoView({ behavior: 'instant', block: 'center' });

    // Focus
    element.focus();

    // Method 1: Direct click
    element.click();

    // Method 2: MouseEvent
    element.dispatchEvent(
      new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
        button: 0,
      })
    );

    // Method 3: PointerEvents (for modern sites)
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    // Method 4: If it's inside a form, submit the form
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

/**
 * Clean up credentials from sessionStorage and memory
 */
export function cleanupCredentials(): void {
  try {
    // Remove all ESPOT-related sessionStorage keys
    const keysToRemove = [
      'ESPOT_PASS',
      'ESPOT_GOOGLE_PASS',
      'ESPOT_AUTOFILL_PASSWORD',
    ];

    for (const key of keysToRemove) {
      try {
        sessionStorage.removeItem(key);
      } catch (e) {
        // Ignore if sessionStorage is not accessible
      }
    }
  } catch (e) {
    console.warn('[ESPOT] cleanupCredentials error:', e);
  }
}

/**
 * Install a guard to prevent duplicate autofill operations
 * Returns true if guard was successfully installed (first time)
 * Returns false if guard already exists (operation already running)
 */
export function installGuard(key: string, ttl: number = 60000): boolean {
  const guardKey = `__ESPOT_GUARD_${key}`;
  
  // Check if guard already exists
  if ((window as any)[guardKey]) {
    return false;
  }

  // Install guard
  (window as any)[guardKey] = true;

  // Auto-remove after TTL
  setTimeout(() => {
    delete (window as any)[guardKey];
  }, ttl);

  return true;
}
