const LAST_UPDATED = "25 April 2026";

const TermsOfService = () => (
  <article className="prose prose-slate max-w-none py-8 dark:prose-invert">
import { usePageSeo } from "@/hooks/usePageSeo";

const TermsOfService = () => {
  usePageSeo({
    title: "Terms of Service — AndamanBazaar",
    description: "AndamanBazaar terms of service. Use the platform lawfully, post only items you own, and be respectful with fellow islanders.",
    path: "/terms",
  });
  return (
  <section className="prose prose-slate max-w-none py-8 dark:prose-invert">
    <h1>Terms of Service</h1>
    <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

    <p>
      Welcome to <strong>AndamanBazaar</strong> (the "Platform"), a hyperlocal
      classifieds marketplace for the Andaman & Nicobar Islands operated from
      Port Blair, India. These Terms of Service ("Terms") form a binding
      agreement between you ("User", "you") and AndamanBazaar ("we", "us",
      "our"). By accessing or using the Platform — whether to browse, sign up,
      list an item, chat with a seller, book an experience, or generate an AI
      trip plan — you confirm that you have read, understood and agree to be
      bound by these Terms, our{" "}
      <a href="/privacy">Privacy Policy</a>, and any policies referenced
      herein. If you do not agree, please stop using the Platform.
    </p>

    <p>
      This document is an electronic record published in accordance with the
      provisions of the <em>Information Technology Act, 2000</em>, and the{" "}
      <em>Information Technology (Intermediary Guidelines and Digital Media
      Ethics Code) Rules, 2021</em>. It does not require any physical or
      digital signature.
    </p>

    <h2>1. Eligibility</h2>
    <ul>
      <li>You must be at least 18 years old and competent to contract under the Indian Contract Act, 1872.</li>
      <li>If you are using the Platform on behalf of a business, you confirm you are authorised to bind that business.</li>
      <li>You must not be barred from using the Platform under any applicable law or by a previous suspension by us.</li>
    </ul>

    <h2>2. The Platform's role — we are an intermediary</h2>
    <p>
      AndamanBazaar is an "intermediary" as defined under the IT Act. We
      provide the technology that lets buyers and sellers find each other,
      communicate, and transact. <strong>We are not a party to any sale, rental,
      booking or service contract</strong> formed between users. We do not
      inspect, warranty, ship, hold inventory, or guarantee the existence,
      quality, safety, legality, or accuracy of any listing, user, or
      transaction.
    </p>

    <h2>3. Your account</h2>
    <ul>
      <li>You agree to provide accurate, current and complete information during signup and to keep it updated.</li>
      <li>You are responsible for maintaining the confidentiality of your password and for all activity under your account.</li>
      <li>You agree to notify us immediately of any unauthorised access. We are not liable for losses caused by your failure to safeguard credentials.</li>
      <li>One person, one account. Duplicate or impersonating accounts may be removed.</li>
    </ul>

    <h2>4. Listings & seller responsibilities</h2>
    <p>If you post a listing, you represent and warrant that:</p>
    <ul>
      <li>You own the item or have the right to sell, rent or offer it.</li>
      <li>The listing is accurate, truthful, and not misleading — including title, description, condition, photos, location and price.</li>
      <li>The item or service is legal to sell in India and in the Andaman & Nicobar Islands.</li>
      <li>You will honour the price and condition advertised, or promptly mark the listing as sold/paused if circumstances change.</li>
      <li>You will respond to buyer messages in good faith and within a reasonable time.</li>
    </ul>

    <h3>Prohibited items & content</h3>
    <p>You must not list, advertise or solicit any of the following:</p>
    <ul>
      <li>Drugs, narcotics, tobacco, alcohol, prescription medicines, or anything restricted under the NDPS Act.</li>
      <li>Weapons, firearms, ammunition, explosives, or military equipment.</li>
      <li>Wildlife, coral, shells, turtle products, sea cucumber, or any item protected under the Wildlife (Protection) Act, 1972 — collection or sale of marine life from protected zones in the Andamans is a criminal offence.</li>
      <li>Tribal artefacts or anything sourced from restricted tribal reserves; any activity that violates the Andaman & Nicobar Islands (Protection of Aboriginal Tribes) Regulation, 1956.</li>
      <li>Counterfeit, stolen, smuggled, or pirated goods; software cracks; copyrighted media without rights.</li>
      <li>Human body parts, blood, organs, or services involving them.</li>
      <li>Currency, lottery tickets, multi-level-marketing schemes, gambling, or financial securities.</li>
      <li>Adult content, escort services, or anything sexually suggestive involving minors.</li>
      <li>Hateful, defamatory, harassing, threatening, obscene or unlawful content; content that promotes discrimination on caste, religion, gender, race, or sexual orientation.</li>
      <li>Personal data of others, spam, malware, phishing links, or content that violates any third party's intellectual-property or privacy rights.</li>
      <li>Anything restricted under the IT Rules, 2021 or notified by competent authorities.</li>
    </ul>

    <h2>5. Buyer responsibilities</h2>
    <ul>
      <li>Inspect the item and verify the seller before paying. Prefer in-person handover at a public location.</li>
      <li>Do not share OTPs, UPI PINs, bank credentials, or scan unknown QR codes — no genuine seller will ever ask for these to "receive" a payment.</li>
      <li>Use the in-app chat. Off-platform deals are at your own risk and we cannot help recover funds.</li>
      <li>Report suspicious listings or users using the in-app "Report" action.</li>
    </ul>

    <h2>6. Transactions, payments & disputes</h2>
    <p>
      Sales are typically settled directly between buyer and seller (cash on
      delivery, UPI, or bank transfer). For paid Platform features such as
      <em> Featured Listing boosts</em> and the <em>AI Trip Planner</em>,
      payments are processed through licensed payment gateways
      (e.g.&nbsp;Cashfree). All such payments are final and non-refundable
      except where required by law or expressly stated in the relevant
      product description.
    </p>
    <p>
      <strong>Disputes between users</strong> (non-delivery, item
      misrepresentation, refund disagreements, etc.) must be resolved
      directly between the parties. We may, at our discretion, share
      non-confidential information to assist resolution but we are not
      obliged to mediate, arbitrate or compensate any party.
    </p>

    <h2>7. AI Trip Planner</h2>
    <p>
      The AI Trip Planner generates suggested itineraries, ferry guesses,
      and weather notes based on automated models and third-party data. It
      is provided <strong>"as is" for planning purposes only</strong> and is
      <em> not</em> a substitute for official ferry timings, hotel
      bookings, or local advisories. Always re-confirm bookings, prices,
      permits and weather with operators before travel. We do not guarantee
      seat availability, pricing accuracy, or the safety of any
      recommended activity.
    </p>

    <h2>8. Affiliate links & recommendations</h2>
    <p>
      Some recommendations on the Platform — including in trip plans —
      contain affiliate links. If you click and purchase, we may earn a
      small commission at no extra cost to you. Affiliate inclusion does
      not imply endorsement; please evaluate each merchant on its own
      merits.
    </p>

    <h2>9. User content & licence to us</h2>
    <p>
      You retain ownership of the photos, descriptions, reviews and other
      content you post. By posting, you grant AndamanBazaar a worldwide,
      royalty-free, non-exclusive, sub-licensable licence to host,
      reproduce, adapt, display and distribute that content for the
      purpose of operating, promoting and improving the Platform. You
      also confirm that the content does not infringe any third-party
      right.
    </p>

    <h2>10. Reviews & ratings</h2>
    <p>
      Reviews must reflect genuine first-hand experience. We may remove
      reviews that are fake, paid-for, abusive, off-topic, or that
      contain personal information. Sellers may not solicit, incentivise
      or retaliate against reviews.
    </p>

    <h2>11. Acceptable use</h2>
    <ul>
      <li>No scraping, crawling, automated access, or reverse-engineering of the Platform.</li>
      <li>No attempts to disrupt, overload, or breach the security of our systems.</li>
      <li>No use of the Platform to send spam, unsolicited marketing, or chain messages.</li>
      <li>No use of bots, fake reviews, or manipulated metrics to game search rankings.</li>
    </ul>

    <h2>12. Verified Local badge</h2>
    <p>
      Our "Island Verified" badge is awarded based on basic location and
      identity checks. It is a trust signal — not a guarantee. Verified
      status can be revoked at any time if we receive credible reports of
      fraud, misrepresentation, or repeated policy violations.
    </p>

    <h2>13. Suspension & termination</h2>
    <p>
      We may, without notice, remove listings, suspend or terminate
      accounts, or restrict access to features if we reasonably believe
      you have breached these Terms, the law, or the rights of others, or
      if required by a competent authority. You may close your account at
      any time from the Profile page.
    </p>

    <h2>14. Intellectual property</h2>
    <p>
      The Platform — including the AndamanBazaar name, logo, design,
      software, copy and graphics — is owned by us or our licensors and
      protected by Indian and international IP laws. You receive a
      limited, non-exclusive, non-transferable licence to access the
      Platform for personal, non-commercial use. Any other use requires
      our written permission.
    </p>

    <h2>15. Disclaimers</h2>
    <p>
      The Platform and all content are provided <strong>"as is" and "as
      available"</strong>, without warranties of any kind, express or
      implied, including merchantability, fitness for a particular
      purpose, accuracy, non-infringement, or uninterrupted operation.
      We do not warrant that listings are genuine, that users are who
      they claim to be, or that any transaction will be completed.
    </p>

    <h2>16. Limitation of liability</h2>
    <p>
      To the maximum extent permitted by law, AndamanBazaar, its
      promoters, employees and partners shall not be liable for any
      indirect, incidental, special, consequential, exemplary or
      punitive damages, or for any loss of profits, revenue, data,
      goodwill, or substitute goods/services arising out of or in
      connection with your use of the Platform — even if advised of
      the possibility of such damages. Our aggregate liability for any
      claim shall not exceed the higher of (a) the amount you paid us
      in the three (3) months preceding the event giving rise to the
      claim, or (b) ₹1,000.
    </p>

    <h2>17. Indemnity</h2>
    <p>
      You agree to indemnify and hold harmless AndamanBazaar and its
      affiliates from any claim, demand, loss, liability or expense
      (including reasonable legal fees) arising out of (i) your use of
      the Platform, (ii) your breach of these Terms or any law, (iii)
      content you post, or (iv) your interactions with other users.
    </p>

    <h2>18. Third-party services</h2>
    <p>
      The Platform integrates with third-party services such as Supabase
      (hosting & data), Resend (email), Cashfree (payments), Google
      (sign-in), and various affiliate merchants. Your use of those
      services is governed by their own terms and privacy policies. We
      are not responsible for their acts or omissions.
    </p>

    <h2>19. Grievance Officer</h2>
    <p>
      In compliance with the IT Rules, 2021, complaints about content,
      conduct or these Terms may be sent to our Grievance Officer:
    </p>
    <ul>
      <li><strong>Name:</strong> Grievance Officer, AndamanBazaar</li>
      <li><strong>Email:</strong> <a href="mailto:grievance@andamanbazaar.in">grievance@andamanbazaar.in</a></li>
      <li><strong>Address:</strong> Port Blair, Andaman & Nicobar Islands, India</li>
      <li><strong>Response time:</strong> Acknowledgement within 24 hours; resolution within 15 days.</li>
    </ul>

    <h2>20. Changes to these Terms</h2>
    <p>
      We may update these Terms from time to time. Material changes will
      be highlighted on the Platform or notified by email. Continued use
      after the effective date constitutes acceptance of the revised
      Terms.
    </p>

    <h2>21. Governing law & jurisdiction</h2>
    <p>
      These Terms are governed by the laws of India. Subject to mandatory
      consumer-protection rights, the courts at <strong>Port Blair,
      Andaman & Nicobar Islands</strong> shall have exclusive
      jurisdiction over any dispute arising out of or in connection
      with these Terms or the Platform.
    </p>

    <h2>22. Contact</h2>
    <p>
      Questions about these Terms? Reach us at{" "}
      <a href="mailto:hello@andamanbazaar.in">hello@andamanbazaar.in</a>{" "}
      or via the <a href="/contact">Contact</a> page.
    </p>
  </article>
);
  </section>
  );
};

export default TermsOfService;
