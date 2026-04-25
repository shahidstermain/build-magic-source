/// <reference types="npm:@types/react@18.3.1" />
import * as React from "npm:react@18.3.1";
import { render } from "npm:@react-email/components@0.0.22";
import {
  Button,
  Section,
  Text,
} from "npm:@react-email/components@0.0.22";
import { EmailLayout, styles, BRAND } from "./layout.tsx";

interface CommonProps {
  url?: string;
  token?: string;
  email?: string;
  newEmail?: string;
}

const Signup = ({ url }: CommonProps) => (
  <EmailLayout preview="Confirm your email to get started on AndamanBazaar">
    <Text style={styles.h1}>Welcome to {BRAND.name} 👋</Text>
    <Text style={styles.p}>
      Tap the button below to confirm your email and start buying or selling
      across the Andaman Islands.
    </Text>
    <Section style={{ textAlign: "center", margin: "22px 0 8px" }}>
      <Button href={url} style={styles.button}>
        Confirm my email
      </Button>
    </Section>
    <Text style={styles.muted}>
      If the button doesn't work, copy and paste this link into your browser:
      <br />
      <span style={{ wordBreak: "break-all" }}>{url}</span>
    </Text>
  </EmailLayout>
);

const MagicLink = ({ url }: CommonProps) => (
  <EmailLayout preview="Your AndamanBazaar sign-in link">
    <Text style={styles.h1}>Sign in to {BRAND.name}</Text>
    <Text style={styles.p}>
      Click below to sign in. This link works once and expires shortly.
    </Text>
    <Section style={{ textAlign: "center", margin: "22px 0 8px" }}>
      <Button href={url} style={styles.button}>
        Sign in
      </Button>
    </Section>
    <Text style={styles.muted}>
      Didn't request this? You can safely ignore the email.
    </Text>
  </EmailLayout>
);

const Recovery = ({ url }: CommonProps) => (
  <EmailLayout preview="Reset your AndamanBazaar password">
    <Text style={styles.h1}>Reset your password</Text>
    <Text style={styles.p}>
      We got a request to reset your password. Tap the button below to choose
      a new one.
    </Text>
    <Section style={{ textAlign: "center", margin: "22px 0 8px" }}>
      <Button href={url} style={styles.button}>
        Reset password
      </Button>
    </Section>
    <Text style={styles.muted}>
      If you didn't request this, ignore this email — your password stays the
      same.
    </Text>
  </EmailLayout>
);

const Invite = ({ url }: CommonProps) => (
  <EmailLayout preview="You're invited to AndamanBazaar">
    <Text style={styles.h1}>You're invited 🎉</Text>
    <Text style={styles.p}>
      Someone invited you to join {BRAND.name}. Accept the invite to set up
      your account.
    </Text>
    <Section style={{ textAlign: "center", margin: "22px 0 8px" }}>
      <Button href={url} style={styles.button}>
        Accept invite
      </Button>
    </Section>
  </EmailLayout>
);

const EmailChange = ({ url, email, newEmail }: CommonProps) => (
  <EmailLayout preview="Confirm your new email on AndamanBazaar">
    <Text style={styles.h1}>Confirm email change</Text>
    <Text style={styles.p}>
      You requested to change your email from <strong>{email}</strong> to{" "}
      <strong>{newEmail}</strong>. Confirm to complete the change.
    </Text>
    <Section style={{ textAlign: "center", margin: "22px 0 8px" }}>
      <Button href={url} style={styles.button}>
        Confirm new email
      </Button>
    </Section>
    <Text style={styles.muted}>
      If you didn't request this, please reset your password right away.
    </Text>
  </EmailLayout>
);

const Reauthentication = ({ token }: CommonProps) => (
  <EmailLayout preview="Your AndamanBazaar verification code">
    <Text style={styles.h1}>Verification code</Text>
    <Text style={styles.p}>Use this one-time code to continue:</Text>
    <Section style={{ textAlign: "center", margin: "18px 0" }}>
      <span style={styles.code}>{token}</span>
    </Section>
    <Text style={styles.muted}>
      This code expires soon. If you didn't ask for it, ignore this email.
    </Text>
  </EmailLayout>
);

export type AuthAction =
  | "signup"
  | "magiclink"
  | "recovery"
  | "invite"
  | "email_change"
  | "email_change_new"
  | "email_change_current"
  | "reauthentication";

export interface RenderInput {
  action: AuthAction;
  url?: string;
  token?: string;
  email?: string;
  newEmail?: string;
}

const SUBJECTS: Record<AuthAction, string> = {
  signup: "Confirm your email · AndamanBazaar",
  magiclink: "Your AndamanBazaar sign-in link",
  recovery: "Reset your AndamanBazaar password",
  invite: "You're invited to AndamanBazaar",
  email_change: "Confirm your new email · AndamanBazaar",
  email_change_new: "Confirm your new email · AndamanBazaar",
  email_change_current: "Email change requested · AndamanBazaar",
  reauthentication: "Your AndamanBazaar verification code",
};

export async function renderAuthEmail(input: RenderInput): Promise<{
  subject: string;
  html: string;
  text: string;
  template: string;
}> {
  const { action } = input;
  let element: React.ReactElement;
  switch (action) {
    case "signup":
      element = <Signup {...input} />;
      break;
    case "magiclink":
      element = <MagicLink {...input} />;
      break;
    case "recovery":
      element = <Recovery {...input} />;
      break;
    case "invite":
      element = <Invite {...input} />;
      break;
    case "email_change":
    case "email_change_new":
    case "email_change_current":
      element = <EmailChange {...input} />;
      break;
    case "reauthentication":
      element = <Reauthentication {...input} />;
      break;
    default:
      element = <MagicLink {...input} />;
  }
  const html = await render(element);
  const text = await render(element, { plainText: true });
  return { subject: SUBJECTS[action] ?? SUBJECTS.magiclink, html, text, template: action };
}