export type ApiClient = {
  delete(path: string): Promise<void>;
  get<T>(path: string): Promise<T>;
  post<TRequest, TResponse>(path: string, body: TRequest): Promise<TResponse>;
  put<TRequest, TResponse>(path: string, body: TRequest): Promise<TResponse>;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

async function request<TResponse>(
  path: string,
  init: RequestInit,
  getToken: () => Promise<string | undefined>,
): Promise<TResponse> {
  const token = await getToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(!token && import.meta.env.DEV ? { "X-Development-User": "local-user" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return response.json() as Promise<TResponse>;
}

export function createApiClient(getToken: () => Promise<string | undefined>): ApiClient {
  return {
    delete: (path) => request(path, { method: "DELETE" }, getToken),
    get: (path) => request(path, { method: "GET" }, getToken),
    post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }, getToken),
    put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) }, getToken),
  };
}
