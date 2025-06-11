// Here we define all our mock API request handlers
import { http, HttpResponse } from 'msw';

const API_BASE_URL = 'http://localhost:3001/api';

export const handlers = [
  // Mock for generating a username
  http.get(`${API_BASE_URL}/generate-username`, () => {
    return HttpResponse.json({ username: 'mocked-user-123' });
  }),

  // Mock for getting or creating a user
  http.post(`${API_BASE_URL}/users/get-or-create`, async ({ request }) => {
    const body = await request.json() as { username?: string };
    const username = body.username || 'default-mock-user';

    // Return a standard user object
    const mockUser = {
      id: Math.floor(Math.random() * 1000),
      username: username,
      created_at: new Date().toISOString(),
      last_sync: new Date().toISOString(),
    };
    return HttpResponse.json({ success: true, user: mockUser });
  }),
]; 