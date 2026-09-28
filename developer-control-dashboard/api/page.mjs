import { isAuthenticated } from '../lib/auth.mjs';
import { renderDashboardPage, renderLoginPage } from '../lib/page.mjs';

export default function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  return response.status(200).send(isAuthenticated(request) ? renderDashboardPage() : renderLoginPage());
}
