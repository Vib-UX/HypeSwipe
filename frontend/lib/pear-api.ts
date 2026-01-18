import { useUserStore } from '@/store/userStore';

const PEAR_API_BASE_URL = 'https://hl-v2.pearprotocol.io';
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;

export interface PearApiError {
  message: string;
  code?: string;
  details?: any;
}

export class PearApiException extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'PearApiException';
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractErrorMessage(error: any): string {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pearApiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  requireAuth: boolean = false
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const url = `${PEAR_API_BASE_URL}${endpoint}`;

      const headers = new Headers();
      headers.set('Content-Type', 'application/json');

      if (options.headers) {
        const existingHeaders = options.headers as Record<string, string>;
        Object.entries(existingHeaders).forEach(([key, value]) => {
          headers.set(key, value);
        });
      }

      if (requireAuth) {
        const state = useUserStore.getState();
        const token = state.pearAccessToken;

        if (!token) {
          throw new PearApiException('Authentication required', 401);
        }

        headers.set('Authorization', `Bearer ${token}`);
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401 && requireAuth) {
        const state = useUserStore.getState();
        const refreshToken = state.pearRefreshToken;

        if (refreshToken) {
          try {
            await refreshPearToken(refreshToken);
            const newState = useUserStore.getState();
            const newToken = newState.pearAccessToken;

            if (newToken) {
              const retryHeaders = new Headers();
              retryHeaders.set('Content-Type', 'application/json');

              if (options.headers) {
                const existingHeaders = options.headers as Record<string, string>;
                Object.entries(existingHeaders).forEach(([key, value]) => {
                  retryHeaders.set(key, value);
                });
              }

              retryHeaders.set('Authorization', `Bearer ${newToken}`);

              const retryResponse = await fetch(url, {
                ...options,
                headers: retryHeaders,
              });

              if (!retryResponse.ok) {
                const errorData = await retryResponse.json().catch(() => ({}));
                throw new PearApiException(
                  extractErrorMessage(errorData),
                  retryResponse.status,
                  errorData
                );
              }

              return retryResponse.json();
            }
          } catch (refreshError) {
            useUserStore.getState().resetPearAuth();
            throw new PearApiException('Session expired. Please reconnect.', 401);
          }
        } else {
          useUserStore.getState().resetPearAuth();
          throw new PearApiException('Session expired. Please reconnect.', 401);
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = extractErrorMessage(errorData);
        throw new PearApiException(errorMessage, response.status, errorData);
      }

      return response.json();
    } catch (error) {
      lastError = error as Error;

      if (error instanceof PearApiException && error.statusCode !== 401) {
        throw error;
      }

      if (attempt < MAX_RETRIES - 1) {
        const backoffDelay = RETRY_DELAY_BASE * Math.pow(2, attempt);
        await sleep(backoffDelay);
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

export async function getEip712Message(address: string, clientId: string = 'HLHackathon8') {
  const params = new URLSearchParams({ address, clientId });
  return pearApiRequest(`/auth/eip712-message?${params}`, {
    method: 'GET',
  });
}

export async function authenticateWithSignature(
  address: string,
  clientId: string,
  signature: string,
  timestamp: number
) {
  return pearApiRequest(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({
        method: 'eip712',
        address,
        clientId,
        details: {
          signature,
          timestamp,
        },
      }),
    },
    false
  );
}

export async function refreshPearToken(refreshToken: string) {
  const response: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
  } = await pearApiRequest(
    '/auth/refresh',
    {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    },
    false
  );

  const state = useUserStore.getState();
  state.setPearTokens(response.accessToken, response.refreshToken);

  return response;
}

export async function logoutPear(refreshToken: string) {
  try {
    await pearApiRequest(
      '/auth/logout',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      },
      false
    );
  } catch (error) {
    console.error('Logout API call failed:', error);
  } finally {
    useUserStore.getState().resetPearAuth();
  }
}

export async function getAgentWallet() {
  return pearApiRequest<{ agentWalletAddress: string }>(
    '/agentWallet',
    { method: 'GET' },
    true
  );
}

export async function createAgentWallet() {
  return pearApiRequest<{ agentWalletAddress: string }>(
    '/agentWallet',
    { method: 'POST', body: JSON.stringify({}) },
    true
  );
}
