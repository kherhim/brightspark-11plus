import { escapeHTML, h, button, clear } from "./components.js";
import { hasBackend } from "../config.js";
import { isSignedIn, logout } from "../auth.js";
import { refreshAccount, account } from "../entitlement.js";

// Brightspark Prep is free and takes no payments, so the account screen
// only shows who is signed in. Everything is open to everyone.
export function renderAccount(ctx) {
  const { mount } = ctx;
  clear(mount);

  if (!hasBackend()) {
    mount.appendChild(
      h("div", { class: "card center" }, [
        h("h1", { text: "Accounts are coming soon" }),
        h("p", {
          class: "muted",
          text: "Brightspark Prep is free to use right now — no account needed. Sign-in for cross-device sync is being switched on shortly.",
        }),
        button("Practise free now", () => ctx.navigate("home"), "btn big"),
      ])
    );
    return;
  }

  if (!isSignedIn()) {
    mount.appendChild(
      h("div", { class: "card center" }, [
        h("h1", { text: "Your account" }),
        h("p", { class: "muted", text: "Sign in to keep your child's progress in sync across your devices." }),
        button("Sign in", () => ctx.navigate("signup"), "btn big"),
      ])
    );
    return;
  }

  mount.appendChild(
    h("div", { class: "card center" }, [h("p", { class: "muted", text: "Loading your account…" })])
  );

  (async () => {
    await refreshAccount();
    clear(mount);
    const acc = account();

    const rows = [
      h("h1", { text: "Your account" }),
      h("p", { html: `Signed in as <b>${escapeHTML((acc && acc.email) || "—")}</b>.` }),
      h("p", {
        class: "muted",
        text: "Brightspark Prep is free for everyone — every subject, mock exams, smart review, analytics and worksheets, with nothing to pay. Your account keeps your progress in sync across every device you sign in on.",
      }),
    ];

    rows.push(
      h("div", { class: "btn-row" }, [
        button(
          "Sign out",
          async () => {
            await logout();
            await refreshAccount();
            ctx.navigate("home");
            ctx.rerender();
          },
          "btn secondary"
        ),
        button("Back to practice", () => ctx.navigate("home"), "btn secondary"),
      ])
    );

    mount.appendChild(h("div", { class: "card" }, rows));
  })();
}
