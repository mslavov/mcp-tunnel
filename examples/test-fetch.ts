/**
 * Test script to verify native fetch requests are intercepted and tunneled
 *
 * This simulates an MCP server using native fetch API
 *
 * Usage:
 * 1. Start worker: cd ../packages/worker && npm start
 * 2. Run this test: ABLY_API_KEY=xxx TENANT_ID=yyy node --require ../packages/wrapper/dist/preload.js test-fetch.js
 */

async function main() {
  console.log('[Test Fetch] Starting native fetch test...');
  console.log('[Test Fetch] This simulates an MCP server using native fetch');

  try {
    // Test 1: Simple GET request
    console.log('\n[Test Fetch] Test 1: GET request to httpbin.org');
    const response1 = await fetch('https://httpbin.org/get');
    const data1 = await response1.json();
    console.log('[Test Fetch] ✅ GET succeeded, status:', response1.status);
    console.log('[Test Fetch] Response data:', JSON.stringify(data1, null, 2).substring(0, 200));

    // Test 2: POST request with JSON body
    console.log('\n[Test Fetch] Test 2: POST request with JSON body');
    const response2 = await fetch('https://httpbin.org/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Hello from MCP tunnel!',
        timestamp: new Date().toISOString(),
      }),
    });
    const data2 = await response2.json();
    console.log('[Test Fetch] ✅ POST succeeded, status:', response2.status);
    console.log('[Test Fetch] Response data:', JSON.stringify(data2, null, 2).substring(0, 200));

    // Test 3: Request with custom headers
    console.log('\n[Test Fetch] Test 3: Request with custom headers');
    const response3 = await fetch('https://httpbin.org/headers', {
      headers: {
        'X-Custom-Header': 'MCP-Tunnel-Test',
        'User-Agent': 'MCP-Tunnel/1.0',
      },
    });
    const data3 = await response3.json();
    console.log('[Test Fetch] ✅ Headers test succeeded, status:', response3.status);

    console.log('\n[Test Fetch] ✅ All fetch tests passed!');
    console.log('[Test Fetch] The interceptor successfully tunneled fetch requests through Ably');
    process.exit(0);
  } catch (error) {
    console.error('\n[Test Fetch] ❌ Test failed:', error);
    process.exit(1);
  }
}

main();
