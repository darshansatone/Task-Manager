// Centralized API Client

const api = (() => {
  const TOKEN_KEY = 'taskmaster_token';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getHeaders(extraHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...extraHeaders
    };
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async function handleResponse(response) {
    if (response.status === 401) {
      // Clear token & redirect to login if on dashboard
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('taskmaster_user');
      if (window.location.pathname.includes('dashboard')) {
        window.location.href = '/login.html';
      }
    }

    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMsg = (data && data.message) || response.statusText || 'Request failed';
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  return {
    async get(endpoint, params = {}) {
      const url = new URL(endpoint, window.location.origin);
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          url.searchParams.append(key, params[key]);
        }
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: getHeaders()
      });
      return handleResponse(response);
    },

    async post(endpoint, body = {}) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body)
      });
      return handleResponse(response);
    },

    async put(endpoint, body = {}) {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body)
      });
      return handleResponse(response);
    },

    async patch(endpoint, body = {}) {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(body)
      });
      return handleResponse(response);
    },

    async delete(endpoint, body = null) {
      const options = {
        method: 'DELETE',
        headers: getHeaders()
      };
      if (body) {
        options.body = JSON.stringify(body);
      }
      const response = await fetch(endpoint, options);
      return handleResponse(response);
    },

    async downloadCsv(endpoint) {
      const token = getToken();
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to download CSV');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `tasks-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    }
  };
})();

window.api = api;
