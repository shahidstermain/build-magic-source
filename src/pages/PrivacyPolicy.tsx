import { useEffect } from "react";

const SUPPORT_EMAIL = "support@andamanbazaar.in";
const LAST_UPDATED = "25 April 2026";
const EFFECTIVE_DATE = "25 April 2026";

const PrivacyPolicy = () => {
  useEffect(() => {
    document.title = "Privacy Policy · AndamanBazaar";
    const meta =
      document.querySelector('meta[name="description"]') ??
      Object.assign(document.createElement("meta"), { name: "description" });
    meta.setAttribute(
      "content",
      "How AndamanBazaar collects, uses, and protects your personal data — DPDP Act 2023 compliant privacy policy for buyers, sellers, and trip planners across the Andaman Islands.",
    );
    if (!meta.parentNode) document.head.appendChild(meta);
  }, []);

  return (
    <section className="prose prose-slate max-w-none py-8 dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">
        Effective date: {EFFECTIVE_DATE} · Last updated: {LAST_UPDATED}
      </p>

      <p>
        AndamanBazaar (&ldquo;<strong>AndamanBazaar</strong>,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the
        hyperlocal marketplace and trip-planning service available at{" "}
        <a href="https://andamanbazaar.in">andamanbazaar.in</a> and its sub-domains (the &ldquo;<strong>Service</strong>&rdquo;). This Privacy
        Policy explains what personal data we collect from you (the &ldquo;<strong>Data Principal</strong>&rdquo; under India&rsquo;s Digital
        Personal Data Protection Act, 2023 — the &ldquo;<strong>DPDP Act</strong>&rdquo;), why we collect it, how we use and share it, and the
        rights and choices you have.
      </p>

      <p>
        By creating an account, posting a listing, sending a message, paying for a boost, generating a trip plan, or otherwise using the
        Service, you confirm that you have read this Policy and you provide free, specific, informed, unconditional, and unambiguous consent to
        the processing of your personal data as described here.
      </p>

      <h2>1. Who is the Data Fiduciary</h2>
      <p>
        AndamanBazaar is the &ldquo;Data Fiduciary&rdquo; for the personal data processed through the Service. For any privacy queries, requests,
        or grievances you may write to us at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with the subject line &ldquo;Privacy Request&rdquo;.
      </p>

      <h2>2. Personal data we collect</h2>
      <p>We only collect what we need to run the marketplace and trip-planning service. Categories include:</p>
      <ul>
        <li>
          <strong>Account data</strong> — name, email address, password (hashed), and, where you sign in with Google, the basic profile
          information (name, email, profile picture) released by your Google account.
        </li>
        <li>
          <strong>Profile data</strong> — phone number, profile photo, city/area, and any verification documents you voluntarily upload to
          request a Verified Local badge.
        </li>
        <li>
          <strong>Listing data</strong> — titles, descriptions, prices, categories, condition, location (city/area), and images you upload for
          items you wish to sell or boost.
        </li>
        <li>
          <strong>Communications data</strong> — chat messages and images exchanged between buyers and sellers, contact-form submissions, and
          reports you file against listings or users.
        </li>
        <li>
          <strong>Trip-planning data</strong> — preferences, budget, travel dates, party composition, and any free-text inputs you provide to
          the AI trip planner; the resulting itinerary, generated PDF, and recommendation interactions.
        </li>
        <li>
          <strong>Transaction data</strong> — payment metadata (order ID, amount, status, timestamps) returned by our payment processor for
          listing boosts and paid trips. We do <strong>not</strong> see or store your card number, UPI handle, CVV, or bank credentials.
        </li>
        <li>
          <strong>Reviews and helpfulness</strong> — ratings and written reviews you leave on listings, and your &ldquo;helpful&rdquo; votes on
          other reviews.
        </li>
        <li>
          <strong>Affiliate and share events</strong> — clicks on affiliate links and WhatsApp share events, including a one-way hash of your
          IP address, your user-agent string, the referring URL, and the recommendation involved. We log this to attribute conversions and
          prevent fraud.
        </li>
        <li>
          <strong>Notifications and email logs</strong> — delivery status, opens, bounces, and complaints reported by our email provider, used
          to maintain a healthy sender reputation and honour unsubscribe requests.
        </li>
        <li>
          <strong>Technical data</strong> — IP address (hashed where practical), browser and device information, pages visited, and approximate
          session timing collected via standard server logs.
        </li>
      </ul>
      <p>
        We do <strong>not</strong> intentionally collect special-category data such as financial account credentials, biometric data, or
        government-issued ID numbers, except where you choose to upload an ID document for location verification (which is stored privately
        and reviewed only by our verification team).
      </p>

      <h2>3. Why we process your data &amp; legal basis</h2>
      <table>
        <thead>
          <tr>
            <th>Purpose</th>
            <th>Legal basis (DPDP Act)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Create and authenticate your account; enable sign-in with email or Google.</td>
            <td>Performance of the service you requested + your consent.</td>
          </tr>
          <tr>
            <td>Publish your listings, show your public profile, and let buyers contact you.</td>
            <td>Performance of the service.</td>
          </tr>
          <tr>
            <td>Run the chat and notification systems.</td>
            <td>Performance of the service.</td>
          </tr>
          <tr>
            <td>Generate AI trip plans, store itineraries, and produce trip PDFs.</td>
            <td>Performance of the service + your consent.</td>
          </tr>
          <tr>
            <td>Process payments for boosts and paid trips, prevent fraud.</td>
            <td>Performance of the service + legitimate interest.</td>
          </tr>
          <tr>
            <td>Send transactional and account emails (sign-in, password reset, receipts, message notifications).</td>
            <td>Performance of the service.</td>
          </tr>
          <tr>
            <td>Send optional product or marketing emails.</td>
            <td>Your consent (you can withdraw any time via the unsubscribe link).</td>
          </tr>
          <tr>
            <td>Detect abuse, moderate listings, action reports, and enforce our Terms.</td>
            <td>Legitimate interest + legal obligation.</td>
          </tr>
          <tr>
            <td>Comply with applicable Indian laws and respond to lawful requests.</td>
            <td>Legal obligation.</td>
          </tr>
        </tbody>
      </table>

      <h2>4. How we share your data</h2>
      <p>We do <strong>not</strong> sell your personal data. We share it only with the parties listed below, only for the purposes listed:</p>
      <ul>
        <li>
          <strong>Other users of the Service</strong> — your name, photo, city/area, location-verified status, listings, ratings, and reviews
          are visible to anyone who can view the relevant listing. Your email and phone are only revealed to a counter-party once you choose to
          share them in chat.
        </li>
        <li>
          <strong>Cloud &amp; database hosting</strong> — Supabase (operated through Lovable Cloud) for database, authentication, file storage
          (listing images, chat images, trip PDFs), and serverless functions.
        </li>
        <li>
          <strong>AI provider</strong> — Google (Gemini) and OpenAI models accessed via the Lovable AI Gateway, used to generate listing
          descriptions and trip itineraries from the inputs you provide.
        </li>
        <li>
          <strong>Payments</strong> — Cashfree Payments India Pvt. Ltd. for processing listing boosts and paid trips.
        </li>
        <li>
          <strong>Email delivery</strong> — Resend for transactional and account emails, including sign-in links and notifications.
        </li>
        <li>
          <strong>Affiliate partners</strong> — when you click an affiliate link in a trip recommendation you are redirected to a third-party
          merchant. We share the click identifier with that merchant so we can be credited if you transact. Each affiliate link carries an
          inline disclosure.
        </li>
        <li>
          <strong>Law-enforcement and regulators</strong> — when we are legally compelled by a valid order from an Indian authority, or when we
          believe in good faith that disclosure is necessary to protect rights, property, or safety.
        </li>
        <li>
          <strong>Successors</strong> — in the event of a merger, acquisition, or sale of all or substantially all of our assets, your data may
          be transferred subject to this Policy.
        </li>
      </ul>

      <h2>5. International transfers</h2>
      <p>
        Some of our processors (notably Supabase, Resend, and the AI providers) may store or process data on servers located outside India.
        Where this happens we rely on the recipient&rsquo;s contractual safeguards and on the cross-border-transfer rules permitted under the
        DPDP Act and the rules notified thereunder. Indian Government may, at any time, restrict transfers to specific countries.
      </p>

      <h2>6. How long we keep your data</h2>
      <ul>
        <li>
          <strong>Account, profile, listings, chats, reviews</strong> — for as long as your account is active and for up to 18 months after
          deletion to handle disputes, fraud investigations, and legal claims.
        </li>
        <li>
          <strong>Trip requests, itineraries, and PDFs</strong> — kept for as long as your account is active so you can re-download them; you
          may delete a trip at any time from <em>My Trips</em>.
        </li>
        <li>
          <strong>Payment records</strong> — retained for at least 8 years as required by Indian tax and accounting law.
        </li>
        <li>
          <strong>Email logs &amp; suppression list</strong> — retained for up to 24 months to prove deliverability and to respect bounce or
          unsubscribe events.
        </li>
        <li>
          <strong>Server and security logs</strong> — typically 30–90 days, longer if needed for an active investigation.
        </li>
      </ul>

      <h2>7. Your rights as a Data Principal</h2>
      <p>Under the DPDP Act you have the right to:</p>
      <ul>
        <li>Access a summary of the personal data we hold about you and the processing activities involved.</li>
        <li>Correction, completion, or update of your personal data, and erasure of data that is no longer required.</li>
        <li>Withdraw consent at any time — withdrawal does not affect the lawfulness of processing carried out before withdrawal.</li>
        <li>Nominate another person to exercise your rights in the event of your death or incapacity.</li>
        <li>File a grievance with us (see Section 12) and, if unresolved, with the Data Protection Board of India.</li>
      </ul>
      <p>
        You can exercise most of these rights from inside the app — edit your profile on the <em>Profile</em> page, delete listings or trips
        from your dashboard, or unsubscribe from any marketing email. For anything you can&rsquo;t do yourself, email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we will respond within 30 days.
      </p>

      <h2>8. Children&rsquo;s data</h2>
      <p>
        The Service is intended for users aged 18 and above. We do not knowingly collect personal data from children. If you believe a child
        has provided us with personal data, write to{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we will delete the account and associated data.
      </p>

      <h2>9. Cookies and similar technologies</h2>
      <p>
        We use a small number of strictly necessary browser-storage items to keep you signed in, remember your preferences (such as theme), and
        secure the session. We do not use third-party advertising cookies or cross-site tracking. We may use first-party analytics in aggregate
        form to understand which features are used.
      </p>

      <h2>10. Security</h2>
      <p>
        We use industry-standard safeguards including HTTPS in transit, encryption at rest in the underlying database and storage, role-based
        access control, row-level security policies, hashed passwords, and least-privilege service credentials. No method of transmission or
        storage is 100% secure; if we ever become aware of a personal data breach affecting your data we will notify you and the Data Protection
        Board of India in accordance with the DPDP Act and the rules notified thereunder.
      </p>

      <h2>11. Account deletion</h2>
      <p>
        You may delete your account at any time from the <em>Profile</em> page. Deletion removes your profile, listings, chats, and reviews from
        public view immediately and from our active databases within 30 days, subject to the retention windows in Section 6 and any legal
        holds.
      </p>

      <h2>12. Grievance Officer</h2>
      <p>
        If you have a complaint about how we have handled your personal data, please contact our Grievance Officer:
      </p>
      <p>
        <strong>Grievance Officer, AndamanBazaar</strong>
        <br />
        Email: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> (subject: &ldquo;Grievance&rdquo;)
        <br />
        We will acknowledge your complaint within 7 working days and provide a final response within 30 days, in line with the Information
        Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 and the DPDP Act.
      </p>

      <h2>13. Changes to this Policy</h2>
      <p>
        We may update this Policy from time to time. When we make material changes we will update the &ldquo;Last updated&rdquo; date above and
        notify you in the app or by email before the changes take effect. Continued use of the Service after the effective date of an update
        means you accept the revised Policy.
      </p>

      <h2>14. Governing law and jurisdiction</h2>
      <p>
        This Policy is governed by the laws of India. Subject to any non-waivable rights you may have under the DPDP Act, the courts at Port
        Blair, Andaman &amp; Nicobar Islands shall have exclusive jurisdiction over any dispute arising out of or in connection with this
        Policy.
      </p>
    </section>
import { usePageSeo } from "@/hooks/usePageSeo";

const PrivacyPolicy = () => {
  usePageSeo({
    title: "Privacy Policy — AndamanBazaar",
    description: "AndamanBazaar privacy policy. We collect only what's needed to run the marketplace and never sell your data.",
    path: "/privacy",
  });
  return (
  <section className="prose prose-slate max-w-none py-8 dark:prose-invert">
    <h1>Privacy Policy</h1>
    <p className="text-muted-foreground">
      AndamanBazaar respects your privacy. We collect only what's needed to run the marketplace: your account email,
      profile details you choose to share, and the listings and messages you create.
    </p>
  </section>
  );
};

export default PrivacyPolicy;