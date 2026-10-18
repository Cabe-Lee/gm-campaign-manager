const gmDB = (() => {
  const base = '/api';

  async function request(path, options = {}) {
    const res = await fetch(`${base}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Request failed: ${res.status}`);
    }
    return res.json();
  }

  return {
    test: () => request('/db'),
    campaigns: () => request('/campaigns'),
    campaign: (id) => request(`/campaigns/${id}`),
    createCampaign: (data) =>
      request('/campaigns', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    pcs: () => request('/pcs'),
  };
})();

window.gmDB = gmDB;
