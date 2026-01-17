/**
 * Unit tests for autofill helpers
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  waitForSelector,
  isVisible,
  findField,
  findFieldByLabel,
  safeFillField,
  findButtonByText,
  clickButton,
  cleanupCredentials,
  installGuard,
} from '../helpers';

describe('Autofill Helpers', () => {
  beforeEach(() => {
    // Clear document
    document.body.innerHTML = '';
    // Clear sessionStorage
    sessionStorage.clear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    sessionStorage.clear();
  });

  describe('isVisible', () => {
    it('should return false for null element', () => {
      expect(isVisible(null as any)).toBe(false);
    });

    it('should return true for visible element', () => {
      const div = document.createElement('div');
      div.style.display = 'block';
      document.body.appendChild(div);
      expect(isVisible(div)).toBe(true);
    });

    it('should return false for hidden element', () => {
      const div = document.createElement('div');
      div.style.display = 'none';
      document.body.appendChild(div);
      expect(isVisible(div)).toBe(false);
    });

    it('should return false for invisible element', () => {
      const div = document.createElement('div');
      div.style.visibility = 'hidden';
      document.body.appendChild(div);
      expect(isVisible(div)).toBe(false);
    });

    it('should return false for zero opacity element', () => {
      const div = document.createElement('div');
      div.style.opacity = '0';
      document.body.appendChild(div);
      expect(isVisible(div)).toBe(false);
    });
  });

  describe('findField', () => {
    it('should find input by selector', () => {
      const input = document.createElement('input');
      input.type = 'email';
      document.body.appendChild(input);

      const result = findField(['input[type="email"]']);
      expect(result).toBe(input);
    });

    it('should skip disabled inputs', () => {
      const input = document.createElement('input');
      input.type = 'email';
      input.disabled = true;
      document.body.appendChild(input);

      const result = findField(['input[type="email"]']);
      expect(result).toBeNull();
    });

    it('should skip readonly inputs', () => {
      const input = document.createElement('input');
      input.type = 'email';
      input.readOnly = true;
      document.body.appendChild(input);

      const result = findField(['input[type="email"]']);
      expect(result).toBeNull();
    });

    it('should use priority order', () => {
      const input1 = document.createElement('input');
      input1.type = 'text';
      input1.id = 'low-priority';
      document.body.appendChild(input1);

      const input2 = document.createElement('input');
      input2.type = 'email';
      input2.id = 'high-priority';
      document.body.appendChild(input2);

      const result = findField(['input[type="email"]', 'input[type="text"]']);
      expect(result?.id).toBe('high-priority');
    });
  });

  describe('findFieldByLabel', () => {
    it('should find input by label text (for attribute)', () => {
      const label = document.createElement('label');
      label.textContent = 'Email Address';
      label.setAttribute('for', 'email-input');
      document.body.appendChild(label);

      const input = document.createElement('input');
      input.id = 'email-input';
      input.type = 'email';
      document.body.appendChild(input);

      const result = findFieldByLabel('email');
      expect(result).toBe(input);
    });

    it('should find input inside label', () => {
      const label = document.createElement('label');
      label.textContent = 'Username: ';
      document.body.appendChild(label);

      const input = document.createElement('input');
      input.type = 'text';
      label.appendChild(input);

      const result = findFieldByLabel('username');
      expect(result).toBe(input);
    });

    it('should find adjacent input', () => {
      const label = document.createElement('label');
      label.textContent = 'Password';
      document.body.appendChild(label);

      const input = document.createElement('input');
      input.type = 'password';
      document.body.appendChild(input);

      const result = findFieldByLabel('password');
      expect(result).toBe(input);
    });

    it('should return null if no matching label', () => {
      const label = document.createElement('label');
      label.textContent = 'Something else';
      document.body.appendChild(label);

      const result = findFieldByLabel('email');
      expect(result).toBeNull();
    });
  });

  describe('safeFillField', () => {
    it('should fill input value', () => {
      const input = document.createElement('input');
      input.type = 'email';
      document.body.appendChild(input);

      const result = safeFillField(input, 'test@example.com');
      expect(result).toBe(true);
      expect(input.value).toBe('test@example.com');
    });

    it('should trigger input events', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      let inputEventFired = false;
      let changeEventFired = false;

      input.addEventListener('input', () => {
        inputEventFired = true;
      });
      input.addEventListener('change', () => {
        changeEventFired = true;
      });

      safeFillField(input, 'test');

      expect(inputEventFired).toBe(true);
      expect(changeEventFired).toBe(true);
    });

    it('should return false for null field', () => {
      const result = safeFillField(null as any, 'test');
      expect(result).toBe(false);
    });

    it('should return false for empty value', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      const result = safeFillField(input, '');
      expect(result).toBe(false);
    });
  });

  describe('findButtonByText', () => {
    it('should find button by text content', () => {
      const button = document.createElement('button');
      button.textContent = 'Sign In';
      document.body.appendChild(button);

      const result = findButtonByText(['sign in']);
      expect(result).toBe(button);
    });

    it('should find submit input by value', () => {
      const input = document.createElement('input');
      input.type = 'submit';
      input.value = 'Login';
      document.body.appendChild(input);

      const result = findButtonByText(['login']);
      expect(result).toBe(input);
    });

    it('should match case-insensitively', () => {
      const button = document.createElement('button');
      button.textContent = 'SIGN IN';
      document.body.appendChild(button);

      const result = findButtonByText(['sign in']);
      expect(result).toBe(button);
    });

    it('should support substring matching', () => {
      const button = document.createElement('button');
      button.textContent = 'Sign In Now';
      document.body.appendChild(button);

      const result = findButtonByText(['sign in']);
      expect(result).toBe(button);
    });

    it('should skip hidden buttons', () => {
      const button = document.createElement('button');
      button.textContent = 'Sign In';
      button.style.display = 'none';
      document.body.appendChild(button);

      const result = findButtonByText(['sign in']);
      expect(result).toBeNull();
    });

    it('should return null if no matching button', () => {
      const button = document.createElement('button');
      button.textContent = 'Cancel';
      document.body.appendChild(button);

      const result = findButtonByText(['sign in']);
      expect(result).toBeNull();
    });
  });

  describe('clickButton', () => {
    it('should click button', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);

      let clicked = false;
      button.addEventListener('click', () => {
        clicked = true;
      });

      const result = clickButton(button);
      expect(result).toBe(true);
      expect(clicked).toBe(true);
    });

    it('should return false for null element', () => {
      const result = clickButton(null as any);
      expect(result).toBe(false);
    });
  });

  describe('cleanupCredentials', () => {
    it('should remove ESPOT sessionStorage keys', () => {
      sessionStorage.setItem('ESPOT_PASS', 'password123');
      sessionStorage.setItem('ESPOT_GOOGLE_PASS', 'password456');
      sessionStorage.setItem('ESPOT_AUTOFILL_PASSWORD', 'password789');
      sessionStorage.setItem('OTHER_KEY', 'keep this');

      cleanupCredentials();

      expect(sessionStorage.getItem('ESPOT_PASS')).toBeNull();
      expect(sessionStorage.getItem('ESPOT_GOOGLE_PASS')).toBeNull();
      expect(sessionStorage.getItem('ESPOT_AUTOFILL_PASSWORD')).toBeNull();
      expect(sessionStorage.getItem('OTHER_KEY')).toBe('keep this');
    });
  });

  describe('installGuard', () => {
    it('should install guard successfully', () => {
      const result = installGuard('TEST_KEY');
      expect(result).toBe(true);
    });

    it('should return false if guard already exists', () => {
      const result1 = installGuard('TEST_KEY');
      const result2 = installGuard('TEST_KEY');

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should auto-remove guard after TTL', async () => {
      const result1 = installGuard('TEST_KEY', 100); // 100ms TTL
      expect(result1).toBe(true);

      // Wait for TTL
      await new Promise((resolve) => setTimeout(resolve, 150));

      const result2 = installGuard('TEST_KEY');
      expect(result2).toBe(true);
    });
  });

  describe('waitForSelector', () => {
    it('should resolve immediately if element exists', async () => {
      const div = document.createElement('div');
      div.id = 'test';
      document.body.appendChild(div);

      const result = await waitForSelector('#test', { timeout: 1000 });
      expect(result).toBe(div);
    });

    it('should wait for element to appear', async () => {
      const promise = waitForSelector('#delayed', { timeout: 2000 });

      // Add element after delay
      setTimeout(() => {
        const div = document.createElement('div');
        div.id = 'delayed';
        document.body.appendChild(div);
      }, 500);

      const result = await promise;
      expect(result).not.toBeNull();
      expect(result?.id).toBe('delayed');
    });

    it('should return null if timeout expires', async () => {
      const result = await waitForSelector('#nonexistent', { timeout: 500 });
      expect(result).toBeNull();
    });

    it('should check visibility if requested', async () => {
      const div = document.createElement('div');
      div.id = 'hidden';
      div.style.display = 'none';
      document.body.appendChild(div);

      const result = await waitForSelector('#hidden', {
        visible: true,
        timeout: 500,
      });
      expect(result).toBeNull();
    });
  });
});
