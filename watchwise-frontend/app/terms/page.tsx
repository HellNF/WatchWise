import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Terms of Service — WatchWise",
  description: "Terms and conditions for using WatchWise.",
}

const LAST_UPDATED = "April 4, 2026"
const CONTACT_EMAIL = "legal@watchwise.app"

export default function TermsPage() {
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
          <h1 className="text-4xl font-bold text-white mb-3">Terms of Service</h1>
          <p className="text-sm text-zinc-500">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed">

          {/* 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using WatchWise (&quot;the Service&quot;) you confirm that you have read, understood, and agreed
              to these Terms of Service in their entirety. If you do not agree, please do not use the Service.
              Continued use after any updates constitutes acceptance of the revised terms.
            </p>
          </section>

          {/* 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">2. Description of the Service</h2>
            <p>WatchWise is a personalised movie recommendation platform that allows users to:</p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-2">
              <li>Receive tailored movie suggestions based on their stated preferences.</li>
              <li>Track watched movies and rate them.</li>
              <li>Create and manage custom movie lists.</li>
              <li>Share group recommendation sessions with friends.</li>
            </ul>
            <p>
              The Service uses data provided by TMDB (The Movie Database) and is not affiliated with,
              endorsed by, or sponsored by TMDB.
            </p>
          </section>

          {/* 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">3. Account Registration</h2>
            <p>
              A registered account is required to access the full features of the Service. You are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-2">
              <li>Providing accurate and up-to-date information during registration.</li>
              <li>Keeping your login credentials confidential.</li>
              <li>All activity carried out through your account.</li>
            </ul>
            <p>
              You must notify us immediately of any unauthorised access to your account by writing to{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-400 hover:text-violet-300 underline underline-offset-4">
                {CONTACT_EMAIL}
              </a>.
            </p>
          </section>

          {/* 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">4. Acceptable Use</h2>
            <p>When using the Service, you agree not to:</p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-2">
              <li>Upload, post, or share illegal, offensive, defamatory, or rights-infringing content.</li>
              <li>Attempt to access systems, data, or accounts you are not authorised to access.</li>
              <li>Use the Service for automated scraping, spam, or any form of abuse.</li>
              <li>Circumvent or compromise the security measures of the Service.</li>
              <li>Create fake accounts or impersonate other individuals.</li>
            </ul>
          </section>

          {/* 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">5. Intellectual Property</h2>
            <p>
              The WatchWise name, logo, design, and source code are the property of WatchWise and are protected
              by applicable intellectual property laws. Any unauthorised reproduction, distribution, or use is prohibited.
            </p>
            <p>
              Movie metadata (titles, descriptions, posters, trailers) is provided by TMDB and is subject to
              TMDB&apos;s terms of use. Trailers are hosted by YouTube and subject to Google&apos;s terms of service.
            </p>
          </section>

          {/* 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">6. User Content</h2>
            <p>
              Content you create within the Service (lists, ratings, preferences) remains your property.
              You grant WatchWise a non-exclusive, royalty-free, revocable licence to use such content
              solely for the purpose of providing and improving the Service.
            </p>
          </section>

          {/* 7 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">7. Service Availability</h2>
            <p>
              WatchWise strives to maintain continuous availability of the Service but does not guarantee
              uninterrupted operation. The Service may be suspended for maintenance, updates, or force majeure events.
              We are not liable for any interruptions or data loss resulting from such events.
            </p>
          </section>

          {/* 8 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">8. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by applicable law, WatchWise is not liable for any indirect,
              incidental, special, or consequential damages arising from your use of or inability to use the Service,
              including but not limited to loss of data, loss of revenue, or business interruption.
            </p>
            <p>
              Movie recommendations are generated algorithmically based on your stated preferences.
              WatchWise does not guarantee that suggestions will meet your expectations.
            </p>
          </section>

          {/* 9 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">9. Third-Party Links and Services</h2>
            <p>
              The Service may contain links to third-party websites or services (e.g. streaming platforms, TMDB, YouTube).
              WatchWise is not responsible for the content, privacy policies, or practices of those sites.
              Accessing external resources is entirely at your own risk.
            </p>
          </section>

          {/* 10 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">10. Account Termination</h2>
            <p>
              You may delete your account at any time from the Profile section or by submitting a request to{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-400 hover:text-violet-300 underline underline-offset-4">
                {CONTACT_EMAIL}
              </a>.
              WatchWise reserves the right to suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          {/* 11 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">11. Changes to These Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. Material changes will be communicated
              via email or a prominent in-app notice at least 14 days before they take effect.
              Continued use of the Service after that period constitutes acceptance of the updated Terms.
            </p>
          </section>

          {/* 12 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">12. Governing Law</h2>
            <p>
              These Terms are governed by applicable law. Any dispute arising from the use of the Service
              shall first be subject to good-faith negotiation between the parties. If no agreement is reached,
              disputes shall be resolved in accordance with the laws of the jurisdiction in which WatchWise operates,
              without prejudice to any mandatory consumer protection rights you may hold.
            </p>
          </section>

          {/* 13 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">13. Contact</h2>
            <p>
              For any questions regarding these Terms, please contact us at:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-400 hover:text-violet-300 underline underline-offset-4">
                {CONTACT_EMAIL}
              </a>.
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
          <span>© {new Date().getFullYear()} WatchWise</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy Policy</Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-zinc-400 transition-colors">{CONTACT_EMAIL}</a>
          </div>
        </div>

      </div>
    </main>
  )
}
