/// <reference types="npm:@types/react@18.3.1" />
import * as React from "npm:react@18.3.1";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "npm:@react-email/components@0.0.22";

export const BRAND = {
  name: "AndamanBazaar",
  primary: "#0ea5b7",
  primaryDark: "#0b7c8c",
  text: "#0f172a",
  muted: "#64748b",
  bg: "#ffffff",
  panel: "#f8fafc",
  border: "#e2e8f0",
  url: "https://andamanbazaar.in",
};

interface LayoutProps {
  preview: string;
  children: React.ReactNode;
}

export const EmailLayout = ({ preview, children }: LayoutProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brandMark}>
            Andaman<span style={{ color: BRAND.primary }}>Bazaar</span>
          </Text>
          <Text style={tagline}>Island marketplace, boat pe bharosa</Text>
        </Section>
        <Section style={card}>{children}</Section>
        <Hr style={hr} />
        <Section>
          <Text style={footer}>
            You're receiving this email because of activity on your{" "}
            {BRAND.name} account.
          </Text>
          <Text style={footerSmall}>
            © {new Date().getFullYear()} {BRAND.name} · Port Blair, Andaman
            &amp; Nicobar Islands
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main: React.CSSProperties = {
  backgroundColor: "#ffffff",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: 0,
  padding: 0,
};
const container: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "32px 20px",
};
const header: React.CSSProperties = { textAlign: "center", marginBottom: 24 };
const brandMark: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: BRAND.text,
  margin: 0,
  letterSpacing: "-0.01em",
};
const tagline: React.CSSProperties = {
  fontSize: 12,
  color: BRAND.muted,
  margin: "4px 0 0",
};
const card: React.CSSProperties = {
  background: BRAND.panel,
  border: `1px solid ${BRAND.border}`,
  borderRadius: 14,
  padding: "28px 28px",
};
const hr: React.CSSProperties = {
  borderColor: BRAND.border,
  margin: "28px 0 16px",
};
const footer: React.CSSProperties = {
  fontSize: 12,
  color: BRAND.muted,
  textAlign: "center",
  margin: "0 0 6px",
};
const footerSmall: React.CSSProperties = {
  fontSize: 11,
  color: BRAND.muted,
  textAlign: "center",
  margin: 0,
};

export const styles = {
  h1: {
    fontSize: 22,
    fontWeight: 700,
    color: BRAND.text,
    margin: "0 0 12px",
  } as React.CSSProperties,
  p: {
    fontSize: 15,
    lineHeight: 1.55,
    color: BRAND.text,
    margin: "0 0 14px",
  } as React.CSSProperties,
  muted: {
    fontSize: 13,
    color: BRAND.muted,
    lineHeight: 1.5,
    margin: "0 0 14px",
  } as React.CSSProperties,
  button: {
    backgroundColor: BRAND.primary,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 600,
    padding: "12px 22px",
    borderRadius: 10,
    textDecoration: "none",
    display: "inline-block",
  } as React.CSSProperties,
  code: {
    display: "inline-block",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 22,
    letterSpacing: "0.25em",
    fontWeight: 700,
    color: BRAND.text,
    background: "#ffffff",
    border: `1px solid ${BRAND.border}`,
    borderRadius: 10,
    padding: "10px 16px",
  } as React.CSSProperties,
};