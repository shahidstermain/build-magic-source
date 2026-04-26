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