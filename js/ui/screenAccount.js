import { h, button, clear } from "./components.js";
import { hasBackend, paymentsEnabled } from "../config.js";
import { isSignedIn, logout, startCheckout } from "../auth.js";
import { refreshEntitlement, account, isPaid } from "../entitlement.js";

const PLANS = [
  { id: "oneoff", label: "11+ Access", price: "£34 one-off" },
  { id: "family", label: "Family (up to 3 children)", price: "£49 one-off" },
  { id: "annual", label: "Annual", price: "£39 / year" },
];

export function renderAccount(ctx, params) {
  const { mount } = ctx;
  clear(mount);
  const flag = params && params[0] ? params[0] : null; // "paid" | "cancelled"

  if (!hasBackend()) {
    mount.appendChild(
      h("div", { class: "card center" }, [
        h("h1", { text: "Accounts are coming soon" }),
        h("p", {
          class: "muted",
          text: "Maths practice is free right now — no account needed. Full access is being switched on shortly.",
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
        h("p", { class: "muted", text: "Sign in to manage your access." }),
        button("Sign in", () => ctx.navigate("signup"), "btn big"),
      ])
    );
    return;
  }

  mount.appendChild(
    h("div", { class: "card center" }, [h("p", { class: "muted", text: "Loading your account…" })])
  );

  (async () => {
    await refreshEntitlement();
    clear(mount);
    const acc = account();

    if (flag === "paid") {
      mount.appendChild(
        h("div", { class: "card center" }, [
          h("h1", { text: "You're all set 🎉" }),
          h("p", { class: "muted", text: "Payment received — full access is unlocked. Thank you for supporting an indie tool!" }),
        ])
      );
    } else if (flag === "cancelled") {
      mount.appendChild(
        h("div", { class: "card" }, [
          h("p", { class: "muted", text: "Checkout cancelled — no payment was taken." }),
        ])
      );
    }

    const rows = [
      h("h1", { text: "Your account" }),
      h("p", { html: `Signed in as <b>${(acc && acc.email) || "—"}</b>.` }),
    ];

    if (isPaid()) {
      const until = acc && acc.valid_until
        ? new Date(acc.valid_until).toLocaleDateString("en-GB")
        : null;
      rows.push(
        h("p", {
          html: `Plan: <b>full access</b>${
            acc && acc.plan ? ` (${acc.plan})` : ""
          }${until ? ` — valid until <b>${until}</b>` : ""}.`,
        }),
        h("p", { class: "muted", text: "All four subjects, mocks, smart review, analytics and worksheets are unlocked on this and any device you sign in on." })
      );
    } else if (paymentsEnabled()) {
      let pending = null;
      try {
        pending = sessionStorage.getItem("bs.pendingPlan");
        sessionStorage.removeItem("bs.pendingPlan");
      } catch (e) {
        /* ignore */
      }
      rows.push(
        h("p", { class: "muted", text: "Unlock everything with one payment — no subscription." })
      );
      const ordered = pending
        ? PLANS.slice().sort((a) => (a.id === pending ? -1 : 0))
        : PLANS;
      const note = h("p", { class: "muted" });
      for (const p of ordered) {
        rows.push(
          h("div", { class: "btn-row" }, [
            button(
              `${p.label} — ${p.price}`,
              async () => {
                note.textContent = "Opening secure checkout…";
                const r = await startCheckout(p.id);
                if (r.ok && r.url) window.location.href = r.url;
                else if (r.disabled) note.textContent = "Payments aren't live yet — please check back soon.";
                else if (r.unauthorized) ctx.navigate("signup");
                else note.textContent = "Couldn't start checkout. Please try again.";
              },
              "btn" + (pending && p.id === pending ? " big" : " secondary")
            ),
          ])
        );
      }
      rows.push(note);
    } else {
      rows.push(
        h("p", { class: "muted", text: "Payments aren't live yet — you'll be able to upgrade here soon. Maths practice stays free meanwhile." })
      );
    }

    rows.push(
      h("div", { class: "btn-row" }, [
        button(
          "Sign out",
          async () => {
            await logout();
            await refreshEntitlement();
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
