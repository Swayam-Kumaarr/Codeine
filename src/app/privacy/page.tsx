import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — Codeine' }

const EFFECTIVE_DATE = '27 June 2025'
const VERSION = '1.0'
const CONTACT_EMAIL = 'mailbox.swayam@gmail.com'

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '60px 24px 120px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>

        <Link href="/" style={{ fontSize: 13, color: 'var(--ink-3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 40 }}>← Back to home</Link>

        <p style={{ fontFamily: 'var(--font-head)', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>Codeine</p>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--ink)', marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>Version {VERSION} · Effective {EFFECTIVE_DATE}</p>
        <div style={{ padding: '14px 18px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 3, marginBottom: 48 }}>
          <p style={{ fontSize: 13, color: '#1E40AF', lineHeight: 1.6 }}>This policy is drafted in compliance with the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> of India. You are a <em>Data Principal</em> under this Act. We are the <em>Data Fiduciary</em>.</p>
        </div>

        <Section title="1. Who we are (Data Fiduciary)">
          <p>Codeine is operated by an individual developer based in India ("we", "us", "Codeine"). We are the Data Fiduciary responsible for your personal data under the DPDP Act.</p>
          <p><strong>Contact / Grievance Officer:</strong><br />Email: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--ink)', textDecoration: 'underline' }}>{CONTACT_EMAIL}</a><br />Response time: within 72 hours for grievances, within 30 days for data rights requests.</p>
          <p>This Privacy Policy applies to all personal data collected through the Codeine web application.</p>
        </Section>

        <Section title="2. What personal data we collect">
          <p>We collect only data that is necessary for the purposes described below ("data minimisation").</p>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 8, marginTop: 4 }}>Data you provide directly</h3>
          <ul>
            <li><strong>Account data:</strong> email address, full name, password (stored as a bcrypt hash by Supabase — we never see your plaintext password)</li>
            <li><strong>Profile data:</strong> GitHub username, LeetCode username, XP points, level, preferred study start time, college name (all optional)</li>
            <li><strong>Usage data:</strong> tasks you create, roadmap progress, syllabus entries, homework items, gym split and logs, notification preferences</li>
          </ul>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 8, marginTop: 12 }}>Data collected automatically</h3>
          <ul>
            <li><strong>Consent log:</strong> IP address, browser user-agent string, and timestamp at the moment you accept these terms — retained as legal proof of consent</li>
            <li><strong>Push subscription token:</strong> a browser-generated token used to deliver push notifications (no personal data, browser-controlled)</li>
            <li><strong>Login streak:</strong> daily task completion counts used to calculate your streak</li>
          </ul>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 8, marginTop: 12 }}>Data we do NOT collect</h3>
          <ul>
            <li>Payment or financial information</li>
            <li>Precise geolocation</li>
            <li>Browser history or data from other websites</li>
            <li>Biometric data</li>
          </ul>
        </Section>

        <Section title="3. Purposes of processing">
          <p>Under the DPDP Act, we may only process your data for specified, clear, and lawful purposes. We process your data <strong>solely</strong> for the following purposes:</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginTop: 4 }}>
            <thead>
              <tr style={{ background: 'var(--bg-panel)' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', border: '1px solid var(--line)', fontWeight: 600, color: 'var(--ink)' }}>Purpose</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', border: '1px solid var(--line)', fontWeight: 600, color: 'var(--ink)' }}>Legal basis (DPDP)</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Provide the Codeine application and its features', 'Consent (T&C acceptance)'],
                ['Authenticate your identity and secure your account', 'Consent + Legitimate use'],
                ['Send task reminders and daily digest notifications', 'Consent (T&C acceptance)'],
                ['Send marketing and promotional emails (if opted in)', 'Separate, explicit consent'],
                ['Record proof of consent for legal compliance', 'Legal obligation'],
                ['Display your GitHub/LeetCode activity inside the app', 'Consent (profile setup)'],
                ['Calculate XP, level, and streaks', 'Consent (T&C acceptance)'],
                ['Improve the Service and fix bugs (via aggregated/anonymous data)', 'Legitimate use'],
              ].map(([purpose, basis], i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg)' : 'var(--bg-panel)' }}>
                  <td style={{ padding: '10px 14px', border: '1px solid var(--line)', color: 'var(--ink-2)' }}>{purpose}</td>
                  <td style={{ padding: '10px 14px', border: '1px solid var(--line)', color: 'var(--ink-2)' }}>{basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>We do not use your data for profiling, automated decision-making, targeted advertising, or any purpose not listed above.</p>
        </Section>

        <Section title="4. Consent">
          <p>Our primary legal basis for processing is your freely given, specific, informed, and unambiguous consent, obtained through separate unchecked checkboxes during signup. Consent for marketing emails is <strong>separate</strong> from and <strong>not a condition of</strong> using the Service.</p>
          <p><strong>You have the right to withdraw consent at any time</strong> without affecting the lawfulness of processing before withdrawal. To withdraw:</p>
          <ul>
            <li><strong>Marketing emails:</strong> Settings → Notifications → Email, or click "Unsubscribe" in any email we send</li>
            <li><strong>Push notifications:</strong> Settings → Notifications → Push, or revoke in your browser settings</li>
            <li><strong>All consent / account deletion:</strong> Settings → Account → Delete account, or email <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--ink)', textDecoration: 'underline' }}>{CONTACT_EMAIL}</a></li>
          </ul>
        </Section>

        <Section title="5. Data retention">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginTop: 4 }}>
            <thead>
              <tr style={{ background: 'var(--bg-panel)' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', border: '1px solid var(--line)', fontWeight: 600, color: 'var(--ink)' }}>Data category</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', border: '1px solid var(--line)', fontWeight: 600, color: 'var(--ink)' }}>Retention period</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Account data (email, name)', 'Until account deletion'],
                ['Usage data (tasks, roadmaps, gym logs)', 'Until account deletion'],
                ['Consent log (IP, user-agent, timestamp)', '7 years (legal compliance requirement)'],
                ['Push subscription token', 'Until revoked or account deletion'],
                ['Notification log', '90 days, then deleted'],
                ['Auth tokens / session data', 'Managed by Supabase; expires per session'],
              ].map(([category, period], i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg)' : 'var(--bg-panel)' }}>
                  <td style={{ padding: '10px 14px', border: '1px solid var(--line)', color: 'var(--ink-2)' }}>{category}</td>
                  <td style={{ padding: '10px 14px', border: '1px solid var(--line)', color: 'var(--ink-2)' }}>{period}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>Consent logs are retained for 7 years even after account deletion, as they are required to demonstrate legal compliance.</p>
        </Section>

        <Section title="6. Data processors and cross-border transfers">
          <p>We use the following sub-processors to operate the Service. Your data may be stored or processed on servers outside India (USA):</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginTop: 4 }}>
            <thead>
              <tr style={{ background: 'var(--bg-panel)' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', border: '1px solid var(--line)', fontWeight: 600, color: 'var(--ink)' }}>Processor</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', border: '1px solid var(--line)', fontWeight: 600, color: 'var(--ink)' }}>Purpose</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', border: '1px solid var(--line)', fontWeight: 600, color: 'var(--ink)' }}>Location</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Supabase Inc.', 'Database, authentication, file storage', 'USA (AWS)'],
                ['Vercel Inc.', 'Application hosting, serverless functions', 'USA / Global edge'],
                ['Google LLC', 'OAuth sign-in (if used)', 'USA / Global'],
              ].map(([name, purpose, location], i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg)' : 'var(--bg-panel)' }}>
                  <td style={{ padding: '10px 14px', border: '1px solid var(--line)', color: 'var(--ink-2)' }}>{name}</td>
                  <td style={{ padding: '10px 14px', border: '1px solid var(--line)', color: 'var(--ink-2)' }}>{purpose}</td>
                  <td style={{ padding: '10px 14px', border: '1px solid var(--line)', color: 'var(--ink-2)' }}>{location}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>Cross-border transfers occur with your consent (given at signup). We ensure all processors maintain appropriate security standards. We do not sell your data to any third party.</p>
        </Section>

        <Section title="7. Your rights as a Data Principal (DPDP Act, 2023)">
          <p>Under the DPDP Act, you have the following rights. To exercise any of them, email <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--ink)', textDecoration: 'underline' }}>{CONTACT_EMAIL}</a> with the subject line "Data Rights Request".</p>
          <ul>
            <li><strong>Right to access:</strong> Know what personal data we hold about you and how it is being processed.</li>
            <li><strong>Right to correction:</strong> Request correction of inaccurate or incomplete personal data.</li>
            <li><strong>Right to erasure:</strong> Request deletion of your personal data (subject to legal retention obligations — see Section 5).</li>
            <li><strong>Right to withdraw consent:</strong> Withdraw consent at any time (see Section 4). Withdrawal does not affect prior lawful processing.</li>
            <li><strong>Right to grievance redressal:</strong> Lodge a grievance with our Grievance Officer (see Section 1). We will respond within 72 hours and resolve within 30 days.</li>
            <li><strong>Right to nominate:</strong> Nominate another individual to exercise your data rights in the event of your death or incapacity. Contact us to register a nominee.</li>
          </ul>
          <p>We will respond to rights requests within 30 days. If we are unable to fulfil a request, we will explain the reason. You may also lodge a complaint with the Data Protection Board of India once established.</p>
        </Section>

        <Section title="8. Security">
          <p>We implement the following security measures:</p>
          <ul>
            <li>Passwords stored as bcrypt hashes — never in plaintext</li>
            <li>All data in transit encrypted via HTTPS / TLS 1.2+</li>
            <li>Row-level security (RLS) on the database — each user can only access their own data</li>
            <li>API routes protected with bearer token authentication</li>
            <li>Access to the database service role is restricted to server-side functions only</li>
          </ul>
          <p>Despite these measures, no system is 100% secure. In the event of a data breach that is likely to result in harm to you, we will notify you and, where required, the Data Protection Board of India, within 72 hours of becoming aware.</p>
        </Section>

        <Section title="9. Cookies and local storage">
          <p>We use browser cookies solely for authentication session management (set by Supabase Auth). We do not use tracking cookies, advertising cookies, or third-party analytics. We use browser localStorage for minor UI preferences (e.g. remembering login streak counts). No persistent tracking identifiers are set.</p>
        </Section>

        <Section title="10. Children's privacy">
          <p>The Service is not directed at children under 13. We do not knowingly collect personal data from children under 13. If we discover we have done so, we will delete that data immediately. If you are a parent or guardian and believe your child has provided us with personal data, contact us at <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--ink)', textDecoration: 'underline' }}>{CONTACT_EMAIL}</a>.</p>
        </Section>

        <Section title="11. Changes to this policy">
          <p>We may update this Privacy Policy from time to time. We will notify you of material changes by email (if provided) or by a prominent notice within the Service at least 7 days before the changes take effect. The version number and effective date at the top of this page will be updated. Your continued use of the Service after the effective date constitutes acceptance of the updated policy.</p>
          <p>If the changes require fresh consent under the DPDP Act, we will obtain it explicitly before continuing to process your data.</p>
        </Section>

        <Section title="12. Contact and grievance redressal">
          <p>For any privacy concerns, data rights requests, or complaints:</p>
          <address style={{ fontStyle: 'normal', lineHeight: 1.8, color: 'var(--ink-2)', fontSize: 14 }}>
            <strong>Grievance Officer — Codeine</strong><br />
            Email: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--ink)', textDecoration: 'underline' }}>{CONTACT_EMAIL}</a><br />
            Subject line: "Privacy Grievance" or "Data Rights Request"<br />
            Response: within 72 hours acknowledgement, 30 days resolution
          </address>
          <p>If your grievance is not resolved to your satisfaction, you may contact the Data Protection Board of India (once operationalised under the DPDP Act, 2023).</p>
        </Section>

        <div style={{ marginTop: 60, paddingTop: 32, borderTop: '1px solid var(--line)', display: 'flex', gap: 24, fontSize: 13, color: 'var(--ink-3)' }}>
          <Link href="/terms" style={{ color: 'var(--ink-3)', textDecoration: 'underline' }}>Terms & Conditions</Link>
          <Link href="/" style={{ color: 'var(--ink-3)', textDecoration: 'underline' }}>Back to home</Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)', marginBottom: 16 }}>{title}</h2>
      <div style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.75, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  )
}
