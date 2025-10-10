/**
 * Test script to verify axios requests are intercepted and tunneled
 *
 * This simulates an MCP server using axios (like the official weather server example)
 *
 * Usage:
 * 1. Start worker: cd ../packages/worker && npm start
 * 2. Run this test: ABLY_API_KEY=xxx TENANT_ID=yyy node --require ../packages/wrapper/dist/preload.js test-axios.js
 */

import axios from 'axios';

async function main() {
  console.log('[Test Axios] Starting axios test...');
  console.log('[Test Axios] This simulates an MCP server using axios');

  try {
    // Test 1: Simple GET request
    console.log('\n[Test Axios] Test 1: GET request to httpbin.org');
    const response1 = await axios.get('https://httpbin.org/get');
    console.log('[Test Axios] ✅ GET succeeded, status:', response1.status);
    console.log('[Test Axios] Response data:', JSON.stringify(response1.data, null, 2).substring(0, 200));

    // Test 2: POST request with JSON body
    console.log('\n[Test Axios] Test 2: POST request with JSON body');
    const response2 = await axios.post('https://httpbin.org/post', {
      message: 'Hello from MCP tunnel!',
      timestamp: new Date().toISOString(),
    });
    console.log('[Test Axios] ✅ POST succeeded, status:', response2.status);
    console.log('[Test Axios] Response data:', JSON.stringify(response2.data, null, 2).substring(0, 200));

    // Test 3: Request with custom headers
    console.log('\n[Test Axios] Test 3: Request with custom headers');
    const response3 = await axios.get('https://httpbin.org/headers', {
      headers: {
        'X-Custom-Header': 'MCP-Tunnel-Test',
        'User-Agent': 'MCP-Tunnel/1.0',
      },
    });
    console.log('[Test Axios] ✅ Headers test succeeded, status:', response3.status);

    console.log('\n[Test Axios] ✅ All axios tests passed!');
    console.log('[Test Axios] The interceptor successfully tunneled axios requests through Ably');
    process.exit(0);
  } catch (error) {
    console.error('\n[Test Axios] ❌ Test failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('[Test Axios] Axios error details:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
      });
    }
    process.exit(1);
  }
}

main();
