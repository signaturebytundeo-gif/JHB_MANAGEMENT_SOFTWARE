#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * JHB Ecommerce Website Integration Test
 *
 * Tests all public routes and critical API endpoints for regressions.
 * Usage: BASE_URL=http://localhost:3001 node scripts/integration-test.mjs
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

// Test definitions
const tests = [
  // Public GET routes - expect 200 status
  { name: 'Homepage', method: 'GET', path: '/', expect: { status: 200, contentIncludes: ['Jamaica House', 'Jerk Sauce'] } },
  { name: 'Shop page', method: 'GET', path: '/shop', expect: { status: 200, contentIncludes: ['$3.99', '$7.99', '$14.99'] } },
  { name: 'Product: Original Jerk Sauce 2oz', method: 'GET', path: '/products/original-jerk-sauce-2oz', expect: { status: 200 } },
  { name: 'Product: Original Jerk Sauce 5oz', method: 'GET', path: '/products/original-jerk-sauce-5oz', expect: { status: 200 } },
  { name: 'Product: Original Jerk Sauce 10oz', method: 'GET', path: '/products/original-jerk-sauce-10oz', expect: { status: 200 } },
  { name: 'Product: Escovitch Pikliz 12oz', method: 'GET', path: '/products/escovitch-pikliz-12oz', expect: { status: 200 } },
  { name: 'Recipes page', method: 'GET', path: '/recipes', expect: { status: 200 } },
  { name: 'Our Story page', method: 'GET', path: '/our-story', expect: { status: 200 } },
  { name: 'Community page', method: 'GET', path: '/community', expect: { status: 200 } },
  { name: 'Restaurant Partners page', method: 'GET', path: '/restaurant-partners', expect: { status: 200 } },
  { name: 'Success page', method: 'GET', path: '/success', expect: { status: 200 } },
  { name: 'Sitemap XML', method: 'GET', path: '/sitemap.xml', expect: { status: 200 } },
  { name: 'Robots.txt', method: 'GET', path: '/robots.txt', expect: { status: 200 } },

  // API POST routes - various expectations
  {
    name: 'Checkout API - Valid Cart',
    method: 'POST',
    path: '/api/checkout',
    body: {
      items: [{ priceId: 'price_1234', quantity: 1 }]
    },
    expect: { status: 200, hasUrlField: true, allowWarnStatus: [500] }
  },
  {
    name: 'Checkout API - Empty Cart',
    method: 'POST',
    path: '/api/checkout',
    body: { items: [] },
    expect: { status: 400 }
  },
  {
    name: 'Subscribe API - Valid Email',
    method: 'POST',
    path: '/api/subscribe',
    body: { email: 'test+integration@example.com' },
    expect: { status: [200, 201], allowWarnStatus: [500] }
  },
  {
    name: 'Subscribe API - Invalid Email',
    method: 'POST',
    path: '/api/subscribe',
    body: { email: 'not-an-email' },
    expect: { status: 400 }
  },
  {
    name: 'Promo Validation - Valid Code',
    method: 'POST',
    path: '/api/validate-promo',
    body: { code: 'WELCOME10' },
    expect: { status: 200 }
  },
  {
    name: 'Promo Validation - Invalid Code',
    method: 'POST',
    path: '/api/validate-promo',
    body: { code: 'ZZZ-DOES-NOT-EXIST' },
    expect: { status: [200, 404], noServerError: true }
  },
  {
    name: 'Stripe Webhook - Unsigned Request (Security Test)',
    method: 'POST',
    path: '/api/webhooks/stripe',
    body: {},
    expect: { status: 400, critical: true }
  },
  {
    name: 'Shipping Assistant API',
    method: 'POST',
    path: '/api/shipping-assistant',
    body: { message: "What's the shipping rate to 33025?" },
    expect: { status: 200, allowWarnStatus: [500] }
  },
  {
    name: 'Restaurant Order API - Valid Payload',
    method: 'POST',
    path: '/api/restaurant-order',
    body: {
      name: 'Test Restaurant',
      email: 'test@restaurant.com',
      phone: '555-123-4567',
      business: 'Test Business LLC',
      items: [{ sku: 'original-jerk-sauce-5oz', quantity: 1 }]
    },
    expect: { status: [200, 400], noServerError: true }
  }
];

async function runTest(test) {
  const startTime = Date.now();
  const url = `${BASE_URL}${test.path}`;

  const requestOptions = {
    method: test.method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  if (test.body) {
    requestOptions.body = JSON.stringify(test.body);
  }

  try {
    const response = await fetch(url, requestOptions);
    const durationMs = Date.now() - startTime;

    // Get response text for content checks
    let responseText = '';
    try {
      responseText = await response.text();
    } catch (e) {
      // Ignore if we can't read response body
    }

    const result = {
      name: test.name,
      method: test.method,
      path: test.path,
      status: response.status,
      durationMs,
      passed: false,
      reason: null,
      critical: test.expect.critical || false
    };

    // Determine expected status
    const expectedStatus = Array.isArray(test.expect.status) ? test.expect.status : [test.expect.status];

    // Check if status matches expectation
    const statusMatches = expectedStatus.includes(response.status);

    // Check for server errors when not allowed
    const hasServerError = response.status >= 500;
    const serverErrorBlocked = test.expect.noServerError && hasServerError;

    // Check content requirements
    let contentCheckPassed = true;
    if (test.expect.contentIncludes) {
      contentCheckPassed = test.expect.contentIncludes.some(content =>
        responseText.toLowerCase().includes(content.toLowerCase())
      );
      if (!contentCheckPassed) {
        result.reason = `Content check failed - expected one of: ${test.expect.contentIncludes.join(', ')}`;
      }
    }

    // Check for required response fields
    let fieldCheckPassed = true;
    if (test.expect.hasUrlField && response.status < 400) {
      try {
        const jsonResponse = JSON.parse(responseText);
        fieldCheckPassed = Boolean(jsonResponse.url);
        if (!fieldCheckPassed) {
          result.reason = 'Response missing required "url" field';
        }
      } catch (e) {
        fieldCheckPassed = false;
        result.reason = 'Expected JSON response with "url" field but got invalid JSON';
      }
    }

    // Determine pass/fail/warn status
    if (serverErrorBlocked) {
      result.passed = false;
      result.reason = `Server error (${response.status}) not allowed for this endpoint`;
    } else if (!statusMatches) {
      // Check if this is an acceptable warning scenario
      const allowWarnStatus = test.expect.allowWarnStatus || [];
      if (allowWarnStatus.includes(response.status)) {
        result.passed = 'WARN';
        result.reason = `Expected ${expectedStatus.join(' or ')} but got ${response.status} (acceptable for missing env config)`;
      } else {
        result.passed = false;
        result.reason = `Expected status ${expectedStatus.join(' or ')} but got ${response.status}`;
      }
    } else if (!contentCheckPassed || !fieldCheckPassed) {
      result.passed = false;
      // reason already set above
    } else {
      result.passed = true;
    }

    // Critical security check for webhook endpoint
    if (test.expect.critical && response.status >= 200 && response.status < 300) {
      result.passed = 'CRITICAL';
      result.reason = 'SECURITY RISK: Webhook accepted unsigned request';
    }

    return result;

  } catch (error) {
    const durationMs = Date.now() - startTime;
    return {
      name: test.name,
      method: test.method,
      path: test.path,
      status: null,
      durationMs,
      passed: false,
      reason: `Network error: ${error.message}`,
      critical: test.expect.critical || false
    };
  }
}

async function preFlightCheck() {
  try {
    console.log(`Pre-flight check: Testing connectivity to ${BASE_URL}...`);
    const response = await fetch(`${BASE_URL}/`);
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    console.log('✓ Server is reachable\n');
    return true;
  } catch (error) {
    console.error(`✗ Cannot connect to ${BASE_URL}`);
    console.error(`Error: ${error.message}`);
    console.error('\nMake sure the development server is running:');
    console.error('  cd /Users/rfmstaff/Desktop/THE VAULT/01_Projects/JHB_MANAGEMENT_SOFTWARE');
    console.error('  npm run dev:ecommerce');
    console.error('\nThen retry this test.');
    process.exit(1);
  }
}

async function runTests() {
  await preFlightCheck();

  console.log('JHB Website Integration Test');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Running ${tests.length} tests...\n`);

  const results = [];

  for (const test of tests) {
    process.stdout.write(`Testing ${test.name}... `);
    const result = await runTest(test);
    results.push(result);

    if (result.passed === true) {
      console.log(`✓ PASS (${result.status})`);
    } else if (result.passed === 'WARN') {
      console.log(`⚠ WARN (${result.status}) - ${result.reason}`);
    } else if (result.passed === 'CRITICAL') {
      console.log(`🚨 CRITICAL FAIL - ${result.reason}`);
    } else {
      console.log(`✗ FAIL (${result.status || 'ERROR'}) - ${result.reason}`);
    }
  }

  // Calculate totals
  const totals = {
    pass: results.filter(r => r.passed === true).length,
    fail: results.filter(r => r.passed === false).length,
    warn: results.filter(r => r.passed === 'WARN').length,
    critical: results.filter(r => r.passed === 'CRITICAL').length
  };

  // Write JSON report
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    totals,
    results
  };

  const reportPath = join(process.cwd(), 'scripts', 'integration-test-report.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('JHB Website Integration Test');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`PASS: ${totals.pass}   FAIL: ${totals.fail}   WARN: ${totals.warn}   CRITICAL: ${totals.critical}`);

  // Print failures
  const failures = results.filter(r => r.passed === false || r.passed === 'CRITICAL');
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach(result => {
      const status = result.status || 'ERROR';
      const expected = result.method === 'GET' ? '200' : 'varies';
      console.log(`  - ${result.name} (${result.method} ${result.path}) — status ${status}, expected ${expected}: ${result.reason}`);
    });
  }

  // Print warnings
  const warnings = results.filter(r => r.passed === 'WARN');
  if (warnings.length > 0) {
    console.log('\nWarnings (acceptable for local dev):');
    warnings.forEach(result => {
      console.log(`  - ${result.name}: ${result.reason}`);
    });
  }

  console.log(`\nReport written to: ${reportPath}`);

  // Exit code: 0 if no failures or critical issues
  const exitCode = totals.fail === 0 && totals.critical === 0 ? 0 : 1;
  process.exit(exitCode);
}

// Run the tests
runTests().catch(error => {
  console.error('Unexpected error running tests:', error);
  process.exit(1);
});