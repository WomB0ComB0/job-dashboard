const BASE_URL = '/api';
const AUTH_URL = '/auth';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw { response: { status: response.status, data: error } };
  }
  return { data: await response.json() };
};

export const api = {
  get: async (url: string) => {
    const response = await fetch(`${BASE_URL}${url}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
  post: async (url: string, body?: any) => {
    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(response);
  },
  patch: async (url: string, body?: any) => {
    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(response);
  },
  delete: async (url: string) => {
    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

export const authApi = {
  post: async (url: string, body?: any) => {
    const response = await fetch(`${AUTH_URL}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(response);
  },
};

export default api;
