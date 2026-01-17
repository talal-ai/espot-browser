# Multi-Step Autofill Implementation

## Overview

This implementation adds robust support for multi-step login flows (e.g., RingCentral, where email is entered first, then a "Next" button is clicked, and the password field appears on the same or different page).

## Changes Made

### 1. New Shared Autofill Module (`frontend/shared/autofill/`)

Created a centralized, testable autofill system:

- **`helpers.ts`** - Core utility functions:
  - `waitForSelector()` - Promise-based element waiting with timeout
  - `findField()` - Priority-ordered field detection
  - `findFieldByLabel()` - Label-based field discovery
  - `safeFillField()` - Framework-safe input filling (React/Vue/Angular)
  - `findButtonByText()` - Intelligent button detection
  - `clickButton()` - Multi-method button clicking
  - `installGuard()` - Prevents duplicate autofill runs
  - `cleanupCredentials()` - Secure credential cleanup

- **`flow.ts`** - Flow orchestrator:
  - `runAutofillFlow()` - Main flow handler supporting:
    - Single-step logins (username + password on same page)
    - Multi-step logins (email → Next → password)
    - Navigation-based flows
    - Delayed password field rendering
  - `watchForPasswordField()` - Fallback observer for delayed fields

- **`__tests__/helpers.test.ts`** - Comprehensive unit tests

### 2. Modern Autofill Generator (`frontend/electron/main/autofill-generator.ts`)

New module that:
- Inlines helper code into injectable JavaScript
- Generates modern autofill scripts using the flow orchestrator
- Supports both single-step and multi-step flows automatically

### 3. Updated Main Process Integration (`frontend/electron/main/main.ts`)

- Imported `generateModernAutofillScript` from autofill-generator
- Updated `service:launch` IPC handler to use modern script
- Updated re-injection on `did-navigate-in-page` to use modern flow

### 4. Deprecated Old Implementation

Marked `autofill-engine.ts` as deprecated with JSDoc comments.

## How It Works

### Single-Step Login (e.g., Netflix)
```
1. Detect password field is visible
2. Fill username field
3. Fill password field
4. Click "Sign In" button
```

### Multi-Step Login (e.g., RingCentral)
```
1. Detect password field is NOT visible
2. Fill email/username field
3. Store password in sessionStorage
4. Click "Next" or "Continue" button
5. Wait for password field to appear (up to 10 seconds)
6. Fill password field
7. Click "Sign In" button
8. Clean up sessionStorage
```

### Fallback Mechanism
If the password field doesn't appear via `waitForSelector`, a MutationObserver watches for it for up to 30 seconds and fills it when detected.

## Testing

### Unit Tests
Run tests with:
```bash
cd frontend
npm test shared/autofill
```

Tests cover:
- Element visibility detection
- Field finding strategies
- Form filling with event triggering
- Button detection and clicking
- Guard installation
- Credential cleanup

### Manual Testing Checklist

Test these services to verify functionality:

- **RingCentral** (https://login.ringcentral.com)
  - Email entered
  - Next button clicked
  - Password field appears
  - Password filled
  - Sign-in successful

- **Google/Gmail** (https://accounts.google.com)
  - Email entered
  - Next button clicked
  - Navigation to password page
  - Password filled
  - Sign-in successful

- **Single-step services** (e.g., Netflix, Slack)
  - Both fields filled simultaneously
  - Submit button clicked
  - No regressions

## Key Features

### 1. Intelligent Detection
- 6-level priority hierarchy for field detection
- Label association support
- Framework-aware (React/Vue/Angular)
- ARIA accessibility support

### 2. Multi-Step Support
- Automatic detection of flow type
- SessionStorage for cross-page credentials
- MutationObserver for delayed fields
- Timeout handling and retries

### 3. Security
- Credentials cleaned from memory after use
- SessionStorage keys removed
- Guard prevents duplicate operations
- No credential logging

### 4. Reliability
- Multiple click strategies
- Form submission fallbacks
- Retry mechanisms
- Timeout protection

## Migration Path

Old code using `generateAutofillScript()` from `autofill-engine.ts` should migrate to `generateModernAutofillScript()` from `autofill-generator.ts`.

### Before:
```typescript
import { generateAutofillScript } from './autofill-engine';
const script = generateAutofillScript({ username, password });
```

### After:
```typescript
import { generateModernAutofillScript } from './autofill-generator';
const script = generateModernAutofillScript(username, password, url);
```

## Future Enhancements

1. **Integration Tests**: Add Playwright tests for multi-step flows
2. **Site-Specific Handlers**: Create specialized handlers for complex sites
3. **Adaptive Timeouts**: Learn optimal timeouts per service
4. **Metrics**: Track success rates and failure reasons
5. **A/B Testing**: Compare old vs new implementation performance

## Known Limitations

1. **Captcha/2FA**: Not supported (requires manual intervention)
2. **Complex Wizards**: 3+ step flows may need custom handling
3. **Dynamic Selectors**: Sites with frequently changing DOM may need updates
4. **iFrames**: Cross-origin iframe forms require special handling

## Rollback Plan

If issues are discovered:
1. Revert import in `main.ts` back to old `generateAutofillScript`
2. The old implementation in `autofill-engine.ts` remains intact
3. Test suite will catch regressions

## Support

For issues or questions:
- Check console logs for `[ESPOT]` prefixed messages
- Verify sessionStorage keys are being cleaned up
- Test with browser DevTools to inspect form elements
- Review unit test failures for hints
