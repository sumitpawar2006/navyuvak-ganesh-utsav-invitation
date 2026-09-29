const page = document.body.dataset.page;

const request = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? 'Something went wrong.');
  return data;
};

if (page === 'login') {
  const form = document.querySelector('#loginForm');
  const password = document.querySelector('#password');
  const error = document.querySelector('#loginError');
  const submit = document.querySelector('#loginButton');
  const toggle = document.querySelector('#togglePassword');

  toggle.addEventListener('click', () => {
    const visible = password.type === 'text';
    password.type = visible ? 'password' : 'text';
    toggle.setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
    toggle.setAttribute('aria-pressed', String(!visible));
    password.focus();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
    if (!password.value) {
      error.textContent = 'Enter your developer password.';
      error.hidden = false;
      password.focus();
      return;
    }
    submit.disabled = true;
    submit.querySelector('span').textContent = 'Signing in…';
    try {
      await request('/api/login', { method: 'POST', body: JSON.stringify({ password: password.value }) });
      password.value = '';
      window.location.replace('/dashboard');
    } catch (requestError) {
      error.textContent = requestError.message;
      error.hidden = false;
      password.select();
      submit.disabled = false;
      submit.querySelector('span').textContent = 'Sign in securely';
    }
  });
}

if (page === 'dashboard') {
  const statusPill = document.querySelector('#statusPill');
  const statusLabel = document.querySelector('#statusLabel');
  const statusTitle = document.querySelector('#statusTitle');
  const statusCopy = document.querySelector('#statusCopy');
  const message = document.querySelector('#actionMessage');
  const websiteToggle = document.querySelector('#websiteToggle');
  const toggleTitle = document.querySelector('#toggleTitle');
  const toggleHint = document.querySelector('#toggleHint');
  let currentStatus = 'unknown';
  let isSwitching = false;
  const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  const updateStatus = (status) => {
    currentStatus = status;
    statusPill.className = `status-pill ${status}`;
    statusLabel.textContent = status === 'online' ? 'INVITATION LIVE' : status === 'offline' ? 'CLOSING PAGE LIVE' : 'UNKNOWN';
    statusTitle.textContent = status === 'online' ? 'Invitation website is live' : status === 'offline' ? 'Professional closing page is live' : 'Website status unavailable';
    statusCopy.textContent = status === 'online'
      ? 'Production traffic is active. Visitors can open and use the invitation website.'
      : status === 'offline'
        ? 'Visitors see the branded Marathi thank-you page. No error page or developer control is visible.'
        : 'The current production state could not be confirmed. Refresh before making a change.';
    const online = status === 'online';
    websiteToggle.classList.toggle('is-on', online);
    websiteToggle.setAttribute('aria-checked', String(online));
    websiteToggle.setAttribute('aria-label', online ? 'Website is on. Tap to turn it off.' : 'Website is off. Tap to turn it on.');
    websiteToggle.disabled = isSwitching || status === 'unknown';
    websiteToggle.setAttribute('aria-busy', String(isSwitching));
    toggleTitle.textContent = online ? 'Website is ON' : status === 'offline' ? 'Website is OFF' : 'Website state unavailable';
    toggleHint.textContent = online ? 'Tap once to show the closing page.' : status === 'offline' ? 'Tap once to show the invitation.' : 'Refresh the dashboard and try again.';
    message.textContent = status === 'online' ? 'The full invitation is currently visible.' : status === 'offline' ? 'The professional closing page is currently visible.' : 'Refresh the page to check again.';
  };

  const loadStatus = async () => {
    try {
      const data = await request('/api/status');
      updateStatus(data.status);
    } catch (error) {
      if (error.message === 'Authentication required.') window.location.replace('/');
      else updateStatus('unknown');
    }
  };

  const waitForPublicStatus = async (expectedStatus) => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const data = await request(`/api/status?check=${Date.now()}`);
      if (data.status === expectedStatus) {
        updateStatus(data.status);
        return;
      }
      await wait(1500);
    }
    throw new Error('Vercel is taking longer than expected to update the public link.');
  };

  websiteToggle.addEventListener('click', async () => {
    if (isSwitching || !['online', 'offline'].includes(currentStatus)) return;
    const action = currentStatus === 'online' ? 'pause' : 'resume';
    const expectedStatus = action === 'resume' ? 'online' : 'offline';
    isSwitching = true;
    websiteToggle.disabled = true;
    websiteToggle.classList.add('is-busy');
    websiteToggle.setAttribute('aria-busy', 'true');
    toggleTitle.textContent = action === 'resume' ? 'Turning website ON…' : 'Turning website OFF…';
    toggleHint.textContent = 'Waiting for the public website to confirm the change.';
    message.classList.remove('error');
    message.textContent = 'Sending secure request to Vercel…';
    try {
      const data = await request('/api/control', { method: 'POST', body: JSON.stringify({ action }) });
      message.classList.remove('error');
      message.textContent = 'Change accepted. Waiting for the public link to update…';
      await waitForPublicStatus(data.status);
      message.classList.remove('error');
      message.textContent = data.status === 'online' ? 'Invitation is now live.' : 'Professional closing page is now live.';
    } catch (error) {
      await loadStatus();
      message.classList.add('error');
      message.textContent = `${error.message} Please try again.`;
    } finally {
      isSwitching = false;
      websiteToggle.classList.remove('is-busy');
      websiteToggle.setAttribute('aria-busy', 'false');
      websiteToggle.disabled = currentStatus === 'unknown';
      updateStatus(currentStatus === expectedStatus ? expectedStatus : currentStatus);
    }
  });

  document.querySelector('#logoutButton').addEventListener('click', async () => {
    try { await request('/api/logout', { method: 'POST', body: '{}' }); } finally { window.location.replace('/'); }
  });

  loadStatus();
}
