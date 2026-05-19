import { h, button, clear } from "./components.js";
import { hasBackend, serverConfig } from "../config.js";
import { isSignedIn, requestLink } from "../auth.js";

// Parent email → passwordless magic link. Optional plan (params[0]) is
// remembered so checkout can continue right after sign-in.
export function renderSignup(ctx, params) {
  const { mount } = ctx;
  clear(mount);

  const plan = params && params[0] ? params[0] : null;
  if (plan) {
    try {
      sessionStorage.setItem("bs.pendingPlan", plan);
    } catch (e) {
      /* ignore */
    }
  }

  if (isSignedIn()) {
    ctx.navigate("account");
    return;
  }

  if (!hasBackend()) {
    mount.appendChild(
      h("div", { class: "card center" }, [
        h("h1", { text: "Accounts are coming soon" }),
        h("p", {
          class: "muted",
          text: "Maths practice is free right now — no account needed. Full access (all four subjects, mocks, review, analytics, worksheets) is being switched on shortly.",
        }),
        button("Practise free now", () => ctx.navigate("home"), "btn big"),
      ])
    );
    return;
  }

  const cfg = serverConfig();
  const consentV = (cfg && cfg.consentVersion) || "current";

  const email = h("input", {
    type: "email",
    inputmode: "email",
    autocomplete: "email",
    placeholder: "you@example.com",
    "aria-label": "Parent email address",
  });
  const consent = h("input", { type: "checkbox", id: "consent" });
  const msg = h("p", { class: "muted" });

  const submit = async () => {
    const addr = (email.value || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) {
      msg.textContent = "Please enter a valid email address.";
      return;
    }
    if (!consent.checked) {
      msg.textContent = "Please tick the consent box to continue.";
      return;
    }
    msg.textContent = "Sending…";
    await requestLink(addr);
    clear(mount);
    mount.appendChild(
      h("div", { class: "card center" }, [
        h("h1", { text: "Check your email 📧" }),
        h("p", {
          class: "muted",
          html: `If <b>${addr}</b> is valid, a one-time sign-in link is on its way (valid 15 minutes). Open it on this device.`,
        }),
        button("Use a different email", () => ctx.navigate("signup"), "btn secondary"),
      ])
    );
  };

  mount.appendChild(
    h("div", { class: "card" }, [
      h("h1", { text: "Sign in to Brightspark 11+" }),
      h("p", {
        class: "muted",
        text: "Passwordless: enter a parent email and we'll send a one-time sign-in link. Accounts unlock full access across your devices.",
      }),
      h("div", { class: "numeric-entry" }, [email]),
      h("label", { class: "consent", for: "consent" }, [
        consent,
        h("span", {
          html: ` I'm the parent/guardian and I agree to the <a href="./terms.html" target="_blank" rel="noopener">terms</a> &amp; <a href="./privacy.html" target="_blank" rel="noopener">privacy notice</a> (v${consentV}).`,
        }),
      ]),
      h("div", { class: "btn-row" }, [
        button("Email me a sign-in link", submit, "btn big"),
      ]),
      msg,
    ])
  );
  setTimeout(() => email.focus(), 30);
}
