import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Privacy Policy — WatchWise",
  description: "How WatchWise collects, uses, and protects your personal data.",
}

const LAST_UPDATED = "April 4, 2026"
const CONTACT_EMAIL = "privacy@watchwise.app"

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-300">
      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* Back */}
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors mb-12"
        >
          <div className="p-1.5 rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10">
            <ChevronLeft className="h-4 w-4" />
          </div>
          Home
        </Link>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">Privacy Policy</h1>
          <p className="text-sm text-zinc-500">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed">

          {/* 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">1. Data Controller</h2>
            <p>
              The data controller is <strong className="text-zinc-100">WatchWise</strong>.
              For any privacy-related questions, please contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-400 hover:text-violet-300 underline underline-offset-4">
                {CONTACT_EMAIL}
              </a>.
            </p>
          </section>

          {/* 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">2. Data We Collect</h2>
            <p>We collect the following categories of personal data:</p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-2">
              <li><strong className="text-zinc-300">Account data:</strong> email address, username, avatar (via Google or GitHub OAuth).</li>
              <li><strong className="text-zinc-300">Movie preferences:</strong> favourite genres, actors, and directors collected through the onboarding questionnaire.</li>
              <li><strong className="text-zinc-300">Watch history:</strong> movies you have marked as watched and your ratings.</li>
              <li><strong className="text-zinc-300">Custom lists:</strong> movie collections you create within the app.</li>
              <li><strong className="text-zinc-300">Usage data:</strong> technical information about your device and browser (IP address, browser type) collected automatically to ensure service security.</li>
            </ul>
          </section>

          {/* 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">3. Purpose and Legal Basis</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Purpose</th>
                    <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Legal basis (GDPR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    ["Account creation and management", "Performance of a contract (Art. 6.1.b)"],
                    ["Personalised movie recommendations", "Performance of a contract (Art. 6.1.b)"],
                    ["Service improvement and analytics", "Legitimate interest (Art. 6.1.f)"],
                    ["Security and fraud prevention", "Legitimate interest (Art. 6.1.f)"],
                    ["Transactional email communications", "Performance of a contract (Art. 6.1.b)"],
                  ].map(([purpose, basis]) => (
                    <tr key={purpose}>
                      <td className="py-2 pr-4 text-zinc-300">{purpose}</td>
                      <td className="py-2 text-zinc-400">{basis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">4. Third-Party Data Sharing</h2>
            <p>We do not sell your personal data. We share it only with the following technical service providers, bound by GDPR-compliant data processing agreements:</p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-2">
              <li><strong className="text-zinc-300">Google / GitHub OAuth:</strong> authentication via external providers. Please refer to their respective privacy policies.</li>
              <li><strong className="text-zinc-300">TMDB (The Movie Database):</strong> retrieval of movie metadata (titles, posters, trailers). No personal data is transmitted to TMDB.</li>
              <li><strong className="text-zinc-300">YouTube (Google LLC):</strong> trailer playback via <em>youtube-nocookie.com</em> iframe. YouTube does not set tracking cookies until you interact with the player.</li>
              <li><strong className="text-zinc-300">Vercel Inc.:</strong> cloud hosting and infrastructure (USA). Transfer is covered by Standard Contractual Clauses approved by the European Commission.</li>
            </ul>
          </section>

          {/* 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">5. Data Retention</h2>
            <p>
              Your account data is retained for the duration of your account and for 12 months following deletion,
              unless legal obligations require longer retention. Aggregated and anonymised usage data may be retained indefinitely.
            </p>
          </section>

          {/* 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">6. Your Rights (GDPR)</h2>
            <p>As a data subject, you have the following rights under Regulation (EU) 2016/679:</p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-2">
              <li><strong className="text-zinc-300">Access (Art. 15):</strong> request a copy of the data we process about you.</li>
              <li><strong className="text-zinc-300">Rectification (Art. 16):</strong> correct inaccurate or incomplete data.</li>
              <li><strong className="text-zinc-300">Erasure (Art. 17):</strong> request deletion of your account and all associated data (&quot;right to be forgotten&quot;).</li>
              <li><strong className="text-zinc-300">Restriction (Art. 18):</strong> restrict processing in specific circumstances.</li>
              <li><strong className="text-zinc-300">Portability (Art. 20):</strong> receive your data in a structured, machine-readable format.</li>
              <li><strong className="text-zinc-300">Objection (Art. 21):</strong> object to processing based on legitimate interest.</li>
            </ul>
            <p>
              To exercise your rights, send a request to{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-400 hover:text-violet-300 underline underline-offset-4">
                {CONTACT_EMAIL}
              </a>. We will respond within 30 days. You also have the right to lodge a complaint with your local supervisory authority.
            </p>
          </section>

          {/* 7 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">7. Cookies and Similar Technologies</h2>
            <p>WatchWise uses a minimal number of cookies strictly necessary for operation:</p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-2">
              <li><strong className="text-zinc-300">watchwise-token:</strong> a session cookie that stores your JWT authentication token. Required to keep you signed in.</li>
            </ul>
            <p>
              We do not use first-party tracking or profiling cookies. Trailers are embedded via{" "}
              <code className="text-violet-300 bg-white/5 px-1 rounded">youtube-nocookie.com</code>, which does not set
              third-party cookies before user interaction.
            </p>
          </section>

          {/* 8 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">8. Security</h2>
            <p>
              We implement appropriate technical and organisational measures to protect your data: HTTPS encryption,
              short-lived JWT tokens, access controls limited to authorised personnel, and HTTP security headers
              (Content-Security-Policy, X-Frame-Options, etc.).
            </p>
          </section>

          {/* 9 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">9. Minors</h2>
            <p>
              WatchWise is not intended for persons under the age of 16. We do not knowingly collect data from minors.
              If you believe a minor has created an account, please contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-400 hover:text-violet-300 underline underline-offset-4">
                {CONTACT_EMAIL}
              </a>.
            </p>
          </section>

          {/* 10 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">10. Changes to This Policy</h2>
            <p>
              We reserve the right to update this policy. For material changes, we will notify you by email or
              via a prominent notice in the application. The &quot;Last updated&quot; date at the top of this page always
              reflects the current version.
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
          <span>© {new Date().getFullYear()} WatchWise</span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms of Service</Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-zinc-400 transition-colors">{CONTACT_EMAIL}</a>
          </div>
        </div>

      </div>
    </main>
  )
}
