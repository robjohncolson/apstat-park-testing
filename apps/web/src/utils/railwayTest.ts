/**
 * Test Railway API connectivity
 * This utility helps verify if the Railway API is accessible
 */

const RAILWAY_API_URL = 'https://apstat-park-testing-api.up.railway.app';

export async function testRailwayConnection(): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  try {
    console.log('🚀 Testing Railway API connection...');
    
    // Test basic health check
    const healthResponse = await fetch(`${RAILWAY_API_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status} - ${healthResponse.statusText}`);
    }

    const healthData = await healthResponse.json();
    console.log('✅ Railway API health check passed:', healthData);

    // Test username generation
    const usernameResponse = await fetch(`${RAILWAY_API_URL}/api/generate-username`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!usernameResponse.ok) {
      throw new Error(`Username generation failed: ${usernameResponse.status} - ${usernameResponse.statusText}`);
    }

    const usernameData = await usernameResponse.json();
    console.log('✅ Railway API username generation passed:', usernameData);

    return {
      success: true,
      message: 'Railway API connection successful',
      data: {
        health: healthData,
        username: usernameData,
      },
    };

  } catch (error) {
    console.error('❌ Railway API connection failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Helper function to test from browser console
// Usage: window.testRailway()
export function exposeRailwayTest(): void {
  if (typeof window !== 'undefined') {
    (window as any).testRailway = testRailwayConnection;
    console.log('🔧 Railway test function exposed: Run window.testRailway() in console');
  }
} 