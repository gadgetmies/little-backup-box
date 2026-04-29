# E2E Test Suite

This directory contains end-to-end integration tests for the Little Backup Box webapp using Playwright.

## Overview

The test suite verifies that the React webapp functionality and UI content matches the original PHP implementation. Tests cover:

- **Content Verification**: Ensures all text, labels, buttons, and form fields match the PHP version
- **Functionality Testing**: Verifies all user interactions work correctly
- **Integration Flows**: Tests complete user workflows across multiple pages

## Test Structure

```
tests/
├── e2e/
│   ├── home.spec.js              # Dashboard/Backup page tests
│   ├── setup.spec.js              # Settings page tests
│   ├── view.spec.js                # Media gallery page tests
│   ├── tools.spec.js               # System tools page tests
│   ├── sysinfo.spec.js             # System info page tests
│   ├── navigation.spec.js         # Navigation and layout tests
│   ├── service-connections.spec.js # Service connections/integrations page tests
│   ├── integration-flows.spec.js  # Complete user flow tests
│   └── fixtures/
│       ├── api-responses.js        # Mock API response data
│       └── php-content.js         # PHP content snapshots for comparison
└── helpers/
    ├── test-utils.js              # General test utilities
    ├── content-extractor.js       # Extract content from pages
    └── content-comparator.js      # Compare PHP vs React content
```

## Running Tests

### Install Dependencies

First, install Playwright browsers:

```bash
npx playwright install
```

### Run All Tests

```bash
npm run test:e2e
```

### Run Tests in UI Mode

```bash
npm run test:e2e:ui
```

### Run Tests in Headed Mode (see browser)

```bash
npm run test:e2e:headed
```

### Run Tests in Debug Mode

```bash
npm run test:e2e:debug
```

### Run Specific Test File

```bash
npx playwright test tests/e2e/home.spec.js
```

## Test Configuration

Tests are configured in `playwright.config.js`. The configuration:

- Runs tests against `http://localhost:5173`
- Automatically starts the dev server with mocks enabled
- Tests in Chromium, Firefox, and WebKit browsers
- Generates HTML reports in `playwright-report/`

## Writing Tests

### Content Verification

Tests use the `ContentExtractor` and `ContentComparator` helpers to verify UI content matches PHP:

```javascript
import { ContentExtractor } from '../helpers/content-extractor.js';
import { ContentComparator } from '../helpers/content-comparator.js';

test('should display correct header', async ({ page }) => {
  const extractor = new ContentExtractor(page);
  const comparator = new ContentComparator();
  
  const headers = await extractor.extractSectionHeaders();
  const hasHeader = headers.some(h => 
    comparator.compareText(h, 'Expected Header')
  );
  expect(hasHeader).toBeTruthy();
});
```

### API Mocking

The test suite uses the existing mock system (enabled via `USE_MOCKS=true`). Mock data is defined in `tests/e2e/fixtures/api-responses.js`.

### Waiting for API Calls

Use the `waitForApiCall` helper to wait for API responses:

```javascript
import { waitForApiCall } from '../helpers/test-utils.js';

await waitForApiCall(page, '/backup/services');
```

## Test Coverage

### Pages Covered

- ✅ Home/Dashboard - Backup interface
- ✅ Setup/Settings - Configuration
- ✅ View - Media gallery
- ✅ Tools - System utilities
- ✅ SysInfo - System information
- ✅ Service Connections/Integrations - Email, rsync, social media, and cloud service configuration

### Functionality Covered

- ✅ Page navigation
- ✅ Form interactions
- ✅ API calls
- ✅ Content matching
- ✅ User flows
- ✅ Error handling
- ✅ Empty states
- ✅ Configuration file persistence (verifies values are saved to config.cfg)

## CI/CD Integration

Tests can be run in CI/CD pipelines. The configuration automatically:

- Uses fewer workers in CI
- Retries failed tests
- Generates HTML reports
- Takes screenshots on failure

## Troubleshooting

### Tests Fail to Start

- Ensure the dev server can start: `npm run dev:mock`
- Check that port 5173 is available
- Verify Playwright browsers are installed: `npx playwright install`

### Tests Timeout

- Increase timeout in `playwright.config.js`
- Check that API mocks are working correctly
- Verify the dev server is responding

### Content Mismatches

- Check that language files are loaded correctly
- Verify i18n translations match PHP version
- Review content comparison logic in `content-comparator.js`






