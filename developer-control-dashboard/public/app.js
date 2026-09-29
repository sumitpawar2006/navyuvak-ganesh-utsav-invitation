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
  const resumeButton = document.querySelector('#resumeButton');
  const pauseButton = document.querySelector('#pauseButton');
  const confirmLayer = document.querySelector('#confirmLayer');
  const confirmTitle = document.querySelector('#confirmTitle');
  const confirmCopy = document.querySelector('#confirmCopy');
  const confirmButton = document.querySelector('#confirmButton');
  const cancelButton = document.querySelector('#cancelButton');
  let currentStatus = 'unknown';
  let pendingAction = null;

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
    resumeButton.disabled = status !== 'offline';
    pauseButton.disabled = status !== 'online';
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

  const openConfirmation = (action) => {
    pendingAction = action;
    const turningOn = action === 'resume';
    confirmTitle.textContent = turningOn ? 'Turn website ON?' : 'Turn website OFF?';
    confirmCopy.textContent = turningOn
      ? 'Visitors will see the full invitation website again.'
      : 'Visitors will see the professional Marathi thank-you page. No Vercel error will appear.';
    confirmButton.textContent = turningOn ? 'Yes, turn it ON' : 'Yes, turn it OFF';
    confirmButton.classList.toggle('danger', !turningOn);
    confirmLayer.hidden = false;
    confirmButton.focus();
  };

  const closeConfirmation = () => {
    confirmLayer.hidden = true;
    const returnButton = pendingAction === 'resume' ? resumeButton : pauseButton;
    pendingAction = null;
    returnButton.focus();
  };

  resumeButton.addEventListener('click', () => openConfirmation('resume'));
  pauseButton.addEventListener('click', () => openConfirmation('pause'));
  cancelButton.addEventListener('click', closeConfirmation);
  confirmLayer.addEventListener('click', (event) => { if (event.target === confirmLayer) closeConfirmation(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !confirmLayer.hidden) closeConfirmation(); });

  confirmButton.addEventListener('click', async () => {
    const action = pendingAction;
    if (!action) return;
    confirmButton.disabled = true;
    confirmButton.textContent = action === 'resume' ? 'Turning ON…' : 'Turning OFF…';
    message.textContent = 'Sending secure request to Vercel…';
    try {
      const data = await request('/api/control', { method: 'POST', body: JSON.stringify({ action }) });
      confirmLayer.hidden = true;
      updateStatus(data.status);
      message.classList.remove('error');
      message.textContent = data.status === 'online' ? 'Invitation is now live.' : 'Professional closing page is now live.';
    } catch (error) {
      confirmLayer.hidden = true;
      await loadStatus();
      message.classList.add('error');
      message.textContent = `${error.message} Please try again.`;
    } finally {
      pendingAction = null;
      confirmButton.disabled = false;
    }
  });

  document.querySelector('#logoutButton').addEventListener('click', async () => {
    try { await request('/api/logout', { method: 'POST', body: '{}' }); } finally { window.location.replace('/'); }
  });

  loadStatus();
}
