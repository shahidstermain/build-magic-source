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
    <p className="text-muted-foreground">
      By using AndamanBazaar you agree to use the platform lawfully, post only items you own, and be respectful in
      conversations with other islanders.
    </p>
  </section>
  );
};

export default TermsOfService;