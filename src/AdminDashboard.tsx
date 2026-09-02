import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, ExternalLink, Instagram, LockKeyhole, Mail, Phone, RefreshCw, UsersRound } from 'lucide-react';

interface RsvpEntry {
  id: string;
  fullName: string;
  rsvpStatus: 'attending' | 'not-attending';
  guestCount: number;
  phone: string;
  email: string;
  instagram: string;
  contactConsent: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DashboardData {
  summary: {
    uniqueResponses: number;
    attendingResponses: number;
    notAttendingResponses: number;
    expectedGuests: number;
    contactConsent: number;
    withPhone: number;
    withEmail: number;
    withInstagram: number;
  };
  entries: RsvpEntry[];
}

const csvCell = (value: string | number | boolean) => `"${String(value).replace(/"/g, '""')}"`;

export default function AdminDashboard() {
  const [password, setPassword] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    document.title = 'खाजगी RSVP Dashboard | नवयुवक गणेश उत्सव मंडळ';
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = 'noindex,nofollow,noarchive';
  }, []);

  const loadDashboard = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!password) {
      setMessage('Dashboard password लिहा.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin-rsvps', {
        method: 'POST',
        headers: { Authorization: `Bearer ${password}` },
      });
      const result = (await response.json()) as DashboardData & { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message || 'माहिती मिळाली नाही.');
      setData({ summary: result.summary, entries: result.entries });
    } catch (error) {
      setData(null);
      setMessage(error instanceof Error ? error.message : 'माहिती मिळाली नाही.');
    } finally {
      setLoading(false);
    }
  };

  const lastUpdated = useMemo(() => {
    const value = data?.entries[0]?.updatedAt;
    return value ? new Intl.DateTimeFormat('mr-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '';
  }, [data]);

  const downloadCsv = () => {
    if (!data) return;
    const headers = ['नाव', 'RSVP', 'एकूण व्यक्ती', 'मोबाइल', 'Email', 'Instagram', 'संपर्क संमती', 'नोंद तारीख'];
    const rows = data.entries.map((entry) => [
      entry.fullName,
      entry.rsvpStatus === 'attending' ? 'येणार' : 'येणार नाही',
      entry.guestCount,
      entry.phone,
      entry.email,
      entry.instagram,
      entry.contactConsent ? 'हो' : 'नाही',
      entry.updatedAt,
    ]);
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Navyuvak_RSVP_${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">फक्त आयोजकांसाठी</span>
          <h1>खाजगी RSVP Dashboard</h1>
          <p>नाव, उपस्थिती आणि व्यक्तीने स्वतः दिलेली ऐच्छिक संपर्क माहिती.</p>
        </div>
        <a className="admin-back-link" href="/"><ArrowLeft aria-hidden="true" /> आमंत्रण पहा</a>
      </header>

      {!data ? (
        <section className="admin-login-card" aria-labelledby="admin-login-title">
          <span className="admin-lock"><LockKeyhole aria-hidden="true" /></span>
          <div>
            <h2 id="admin-login-title">Dashboard उघडा</h2>
            <p>ही माहिती सार्वजनिक नाही. आयोजकांचा password लिहा.</p>
          </div>
          <form onSubmit={loadDashboard}>
            <label htmlFor="dashboard-password">Dashboard password</label>
            <div className="admin-password-row">
              <input id="dashboard-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              <button type="submit" disabled={loading}>{loading ? 'उघडत आहे…' : 'Dashboard उघडा'}</button>
            </div>
          </form>
          {message && <p className="admin-error" role="alert">{message}</p>}
        </section>
      ) : (
        <>
          <div className="admin-toolbar">
            <p>{lastUpdated ? `शेवटची नोंद: ${lastUpdated}` : 'अद्याप RSVP नोंद नाही.'}</p>
            <div>
              <button type="button" onClick={() => loadDashboard()} disabled={loading}><RefreshCw aria-hidden="true" /> {loading ? 'Refresh…' : 'Refresh'}</button>
              <button type="button" onClick={downloadCsv} disabled={!data.entries.length}><Download aria-hidden="true" /> CSV Download</button>
              <a href="https://vercel.com/sumits-projects-4d04664c/invitation/analytics" target="_blank" rel="noreferrer">Visitor Analytics <ExternalLink aria-hidden="true" /></a>
            </div>
          </div>

          {message && <p className="admin-error" role="alert">{message}</p>}

          <section className="admin-summary" aria-label="RSVP सारांश">
            <article><span>एकूण नावे</span><strong>{data.summary.uniqueResponses}</strong></article>
            <article><span>येणारे प्रतिसाद</span><strong>{data.summary.attendingResponses}</strong></article>
            <article><span>अपेक्षित व्यक्ती</span><strong>{data.summary.expectedGuests}</strong></article>
            <article><span>संपर्कास संमती</span><strong>{data.summary.contactConsent}</strong></article>
          </section>

          <section className="admin-directory" aria-labelledby="admin-directory-title">
            <div className="admin-directory-heading">
              <div>
                <span className="admin-eyebrow">नोंदणीकृत प्रतिसाद</span>
                <h2 id="admin-directory-title">नाव व संपर्क तपशील</h2>
              </div>
              <p><Phone aria-hidden="true" /> {data.summary.withPhone} <Mail aria-hidden="true" /> {data.summary.withEmail} <Instagram aria-hidden="true" /> {data.summary.withInstagram}</p>
            </div>

            {!data.entries.length ? (
              <div className="admin-empty"><UsersRound aria-hidden="true" /><p>अद्याप कोणी RSVP पाठवलेला नाही.</p></div>
            ) : (
              <div className="admin-table-wrap">
                <table>
                  <thead><tr><th>नाव</th><th>RSVP</th><th>व्यक्ती</th><th>मोबाइल</th><th>Email / Gmail</th><th>Instagram</th><th>संपर्क संमती</th><th>नोंद</th></tr></thead>
                  <tbody>
                    {data.entries.map((entry) => (
                      <tr key={entry.id}>
                        <td data-label="नाव"><strong>{entry.fullName}</strong></td>
                        <td data-label="RSVP"><span className={`admin-status ${entry.rsvpStatus}`}>{entry.rsvpStatus === 'attending' ? 'येणार' : 'येणार नाही'}</span></td>
                        <td data-label="व्यक्ती">{entry.rsvpStatus === 'attending' ? entry.guestCount : '—'}</td>
                        <td data-label="मोबाइल">{entry.phone ? <a href={`tel:${entry.phone}`}>{entry.phone}</a> : '—'}</td>
                        <td data-label="Email / Gmail">{entry.email ? <a href={`mailto:${entry.email}`}>{entry.email}</a> : '—'}</td>
                        <td data-label="Instagram">{entry.instagram ? <a href={`https://instagram.com/${entry.instagram}`} target="_blank" rel="noreferrer">@{entry.instagram}</a> : '—'}</td>
                        <td data-label="संपर्क संमती">{entry.contactConsent ? 'हो' : 'नाही'}</td>
                        <td data-label="नोंद">{new Intl.DateTimeFormat('mr-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.updatedAt))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
