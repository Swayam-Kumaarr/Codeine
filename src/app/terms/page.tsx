import Link from 'next/link'

export const metadata = { title: 'Terms & Conditions — Codeine' }

const EFFECTIVE_DATE = '27 June 2025'
const VERSION = '1.0'

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '60px 24px 120px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>

        <Link href="/" style={{ fontSize: 13, color: 'var(--ink-3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 40 }}>← Back to home</Link>

        <p style={{ fontFamily: 'var(--font-head)', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>Codeine</p>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--ink)', marginBottom: 8 }}>Terms & Conditions</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 48 }}>Version {VERSION} · Effective {EFFECTIVE_DATE}</p>

        <Section title="1. Acceptance of terms">
          <p>By creating an account on Codeine and ticking the acceptance checkbox during signup, you ("User", "you") agree to be bound by these Terms & Conditions ("Terms"). If you do not agree, do not use the Service. Your acceptance is logged with a timestamp and is legally binding under Indian contract law.</p>
          <p>These Terms are a contract between you and the operator of Codeine ("we", "us", "Codeine"), an individual operating from India. The operator can be contacted at <a href="mailto:mailbox.swayam@gmail.com" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>mailbox.swayam@gmail.com</a>.</p>
        </Section>

        <Section title="2. Description of service">
          <p>Codeine is a personal productivity application for students and developers. It provides tools for:</p>
          <ul>
            <li>Scheduling and tracking daily coding tasks and study sessions</li>
            <li>Following structured DSA and Java learning roadmaps</li>
            <li>Tracking gym workouts and personal habits</li>
            <li>Monitoring syllabus completion and academic deadlines</li>
            <li>Receiving optional push notifications and email digests</li>
            <li>Earning XP points and level progression for completed tasks</li>
          </ul>
          <p>The Service is provided on a free, personal-use basis. We do not guarantee uptime, data persistence, or availability of any specific feature.</p>
        </Section>

        <Section title="3. Eligibility">
          <p>You must be at least 13 years of age to use Codeine. By using the Service, you represent that you meet this requirement. If you are between 13 and 18 years of age, you represent that your parent or legal guardian has consented to your use of the Service.</p>
          <p>The Service is not directed at children under 13 and we do not knowingly collect personal data from children under 13.</p>
        </Section>

        <Section title="4. User accounts">
          <p>You are responsible for:</p>
          <ul>
            <li>Maintaining the confidentiality of your login credentials</li>
            <li>All activity that occurs under your account</li>
            <li>Notifying us immediately of any unauthorised use at <a href="mailto:mailbox.swayam@gmail.com" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>mailbox.swayam@gmail.com</a></li>
          </ul>
          <p>You may not share your account with another person or create multiple accounts for the purpose of circumventing any restrictions.</p>
        </Section>

        <Section title="5. Acceptable use">
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful purpose or in violation of any applicable Indian or international law</li>
            <li>Attempt to reverse-engineer, decompile, or derive the source code of the Service</li>
            <li>Introduce viruses, malware, or other harmful code</li>
            <li>Attempt to gain unauthorised access to the Service, its servers, or related systems</li>
            <li>Use the Service to harass, abuse, or harm another person</li>
            <li>Scrape, crawl, or systematically extract data from the Service</li>
            <li>Use the Service for commercial purposes without prior written consent</li>
          </ul>
        </Section>

        <Section title="6. Intellectual property">
          <p>All content, design, code, branding, and features of the Service are the intellectual property of Codeine and its operator, protected under applicable Indian and international intellectual property laws. You are granted a limited, non-exclusive, non-transferable licence to use the Service for personal, non-commercial purposes only.</p>
          <p>Your personal data (tasks, notes, roadmap progress) remains yours. We claim no ownership over content you create within the Service.</p>
        </Section>

        <Section title="7. Data and privacy">
          <p>Your use of the Service is also governed by our <Link href="/privacy" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>Privacy Policy</Link>, which is incorporated into these Terms by reference. Please read it carefully. We process your personal data in accordance with the Digital Personal Data Protection Act, 2023 (India).</p>
        </Section>

        <Section title="8. Push notifications and emails">
          <p>The Service may send you task reminders and digest emails as part of its core functionality, as described in the Privacy Policy. If you separately opted into marketing emails during signup, you may withdraw that consent at any time from Settings → Notifications, or by contacting us.</p>
        </Section>

        <Section title="9. Third-party services">
          <p>The Service uses the following third-party service providers:</p>
          <ul>
            <li><strong>Supabase Inc. (USA)</strong> — database and authentication hosting</li>
            <li><strong>Vercel Inc. (USA)</strong> — application hosting and deployment</li>
            <li><strong>Google LLC (USA)</strong> — optional Google Sign-In via OAuth 2.0</li>
          </ul>
          <p>These providers may process your data outside India. Your use of the Service constitutes acknowledgement of such cross-border data transfer, subject to appropriate safeguards.</p>
        </Section>

        <Section title="10. Disclaimer of warranties">
          <p>The Service is provided "as is" and "as available" without warranties of any kind, express or implied, including but not limited to merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or free of viruses.</p>
        </Section>

        <Section title="11. Limitation of liability">
          <p>To the maximum extent permitted under applicable Indian law, Codeine and its operator shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service, including loss of data, revenue, or goodwill.</p>
          <p>Our total aggregate liability for any claim arising out of these Terms shall not exceed INR 1,000 (One Thousand Indian Rupees).</p>
        </Section>

        <Section title="12. Termination">
          <p>We may suspend or terminate your account at any time, with or without notice, for conduct we determine to be in violation of these Terms or harmful to other users, us, or third parties. You may delete your account at any time from Settings → Account.</p>
          <p>Upon termination, your right to use the Service ceases immediately. We will handle your data as described in our Privacy Policy.</p>
        </Section>

        <Section title="13. Changes to these terms">
          <p>We reserve the right to modify these Terms at any time. We will provide notice of material changes via email (if you have provided one) or by posting a notice within the Service at least 7 days before the changes take effect. Your continued use of the Service after that date constitutes acceptance of the revised Terms. If you do not agree, you must stop using the Service and may delete your account.</p>
        </Section>

        <Section title="14. Governing law and dispute resolution">
          <p>These Terms are governed by the laws of India. Any disputes arising under these Terms shall first be attempted to be resolved through good-faith negotiation. If unresolved, disputes shall be submitted to the exclusive jurisdiction of the courts at India.</p>
        </Section>

        <Section title="15. Contact">
          <p>For any questions about these Terms, contact:</p>
          <address style={{ fontStyle: 'normal', lineHeight: 1.8, color: 'var(--ink-2)', fontSize: 14 }}>
            Codeine<br />
            Email: <a href="mailto:mailbox.swayam@gmail.com" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>mailbox.swayam@gmail.com</a>
          </address>
        </Section>

        <div style={{ marginTop: 60, paddingTop: 32, borderTop: '1px solid var(--line)', display: 'flex', gap: 24, fontSize: 13, color: 'var(--ink-3)' }}>
          <Link href="/privacy" style={{ color: 'var(--ink-3)', textDecoration: 'underline' }}>Privacy Policy</Link>
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
