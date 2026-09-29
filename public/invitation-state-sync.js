(() => {
  const currentState = document.body.dataset.invitationState;
  if (!['online', 'closed'].includes(currentState)) return;

  let checking = false;

  const readState = (html) => {
    if (html.includes('data-invitation-state="closed"')) return 'closed';
    if (html.includes('data-invitation-state="online"')) return 'online';
    return null;
  };

  const checkPublicState = async () => {
    if (checking || document.hidden) return;
    checking = true;
    try {
      const url = new URL('/', window.location.origin);
      url.searchParams.set('stateCheck', Date.now().toString());
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { Accept: 'text/html' },
      });
      if (!response.ok) return;
      const nextState = readState(await response.text());
      if (nextState && nextState !== currentState) {
        window.location.replace(`${window.location.origin}/?state=${Date.now()}`);
      }
    } catch {
      // Stay on the current page when the visitor temporarily loses connectivity.
    } finally {
      checking = false;
    }
  };

  window.setInterval(checkPublicState, 4000);
  window.addEventListener('focus', checkPublicState);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkPublicState();
  });
})();
