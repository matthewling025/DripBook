import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "68bda1e4ac023962388b8a1b", 
  requiresAuth: true // Ensure authentication is required for all operations
});
