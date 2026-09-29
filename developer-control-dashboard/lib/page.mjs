const icon = (content, className = '') => `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${content}</svg>`;

const lockIcon = icon('<rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>');
const powerIcon = icon('<path d="M12 2v10"/><path d="M6.4 5.6a9 9 0 1 0 11.2 0"/>');
const globeIcon = icon('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>');
const shieldIcon = icon('<path d="M12 3l8 4v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7z"/><path d="M9 12l2 2 4-4"/>');
const eyeIcon = icon('<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>');

const document = (content, page) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%2335d07f'/%3E%3Cpath d='M10 15v-3a6 6 0 0 1 12 0v3M8 15h16v12H8z' fill='none' stroke='%2307101e' stroke-width='2.5'/%3E%3C/svg%3E" />
    <link rel="stylesheet" href="/styles.css" />
    <title>Invitation Control — Private Developer Dashboard</title>
  </head>
  <body data-page="${page}">${content}<script src="/app.js" defer></script></body>
</html>`;

export const renderLoginPage = () => document(`
  <main class="login-shell">
    <section class="card login-card" aria-labelledby="loginTitle">
      <div class="login-icon">${lockIcon}</div>
      <span class="eyebrow">PRIVATE DEVELOPER ACCESS</span>
      <h1 id="loginTitle">Invitation Control</h1>
      <p class="lead">Sign in to privately switch between the live invitation and its professional closing page. No dashboard link or control appears publicly.</p>
      <form id="loginForm" novalidate>
        <label for="password">Developer password</label>
        <div class="password-field">
          <input id="password" name="password" type="password" autocomplete="current-password" required aria-describedby="passwordHelp loginError" />
          <button id="togglePassword" class="icon-button" type="button" aria-label="Show password" aria-pressed="false">${eyeIcon}</button>
        </div>
        <p id="passwordHelp" class="field-help">Your password is sent only to the secure server for verification.</p>
        <p id="loginError" class="error-message" role="alert" hidden></p>
        <button id="loginButton" class="primary-button" type="submit">${lockIcon}<span>Sign in securely</span></button>
      </form>
      <div class="security-note">${shieldIcon}<span>Protected by an encrypted HttpOnly session. The Vercel control token is never sent to this browser.</span></div>
    </section>
  </main>`, 'login');

export const renderDashboardPage = () => document(`
  <main class="shell">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">SP</span><span><strong>Invitation Control</strong><small>Private developer dashboard</small></span></div>
      <div class="header-actions"><span class="private-badge">${lockIcon} Developer only</span><button id="logoutButton" class="secondary-button" type="button">Sign out</button></div>
    </header>

    <div class="dashboard-grid">
      <div class="main-column">
        <section class="card hero-card" aria-labelledby="statusTitle">
          <span class="status-pill checking" id="statusPill"><span class="status-dot"></span><span id="statusLabel">CHECKING</span></span>
          <h1 id="statusTitle">Checking website status…</h1>
          <p class="lead" id="statusCopy">Securely reading the current production state from Vercel.</p>
          <a class="site-address" href="https://navyuvak-ganesh-utsav-2026.vercel.app/" target="_blank" rel="noopener noreferrer">${globeIcon}<span>navyuvak-ganesh-utsav-2026.vercel.app</span></a>
        </section>

        <section class="card controls-card" aria-labelledby="controlsTitle">
          <div class="section-header"><div><span class="eyebrow">PRIVATE PRODUCTION CONTROL</span><h2 id="controlsTitle">Website controls</h2><p>Switch safely between the invitation and the professional closing page.</p></div></div>
          <button id="websiteToggle" class="website-toggle" type="button" role="switch" aria-checked="false" aria-busy="true" disabled>
            <span class="toggle-copy">
              <strong id="toggleTitle">Checking website…</strong>
              <small id="toggleHint">Please wait while the live state is confirmed.</small>
            </span>
            <span class="toggle-track" aria-hidden="true">
              <span class="toggle-label toggle-label-off">OFF</span>
              <span class="toggle-label toggle-label-on">ON</span>
              <span class="toggle-thumb">${powerIcon}</span>
            </span>
          </button>
          <p class="action-message" id="actionMessage" role="status" aria-live="polite">Waiting for current status…</p>
        </section>
      </div>

      <aside class="side-column">
        <section class="card info-card" aria-labelledby="privacyTitle">
          <div class="info-icon">${shieldIcon}</div>
          <h2 id="privacyTitle">Private by design</h2>
          <ul>
            <li>Separate dashboard URL</li>
            <li>No controls on the invitation site</li>
            <li>Server-only Vercel credentials</li>
            <li>Eight-hour secure login session</li>
          </ul>
        </section>
        <section class="card info-card visitor-card" aria-labelledby="visitorTitle">
          <div class="info-icon">${globeIcon}</div>
          <h2 id="visitorTitle">What visitors see</h2>
          <p id="visitorText">When OFF, visitors see only a polished Marathi thank-you page—never a Vercel error or these controls.</p>
        </section>
      </aside>
    </div>
  </main>`, 'dashboard');
