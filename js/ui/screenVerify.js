import { h, button, clear } from "./components.js";
import { verifyToken } from "../auth.js";
import { refreshEntitlement } from "../entitlement.js";

// Lands here from the emailed magic link: app.html#/verify/<token>.
export function renderVerify(ctx, params) {
  const { mount } = ctx;
  clear(mount);
  const token = params && params[0] ? decodeURIComponent(params[0]) : null;

  mount.appendChild(
    h("div", { class: "card center" }, [
      h("h1", { text: "Signing you in…" }),
      h("p", { class: "muted", text: "One moment." }),
    ])
  );

  (async () => {
    if (!token) return fail(ctx);
    const res = await verifyToken(token);
    if (!res.ok) return fail(ctx);
    await refreshEntitlement();
    ctx.navigate("account"); // account screen continues any pending plan
  })();
}

function fail(ctx) {
  clear(ctx.mount);
  ctx.mount.appendChild(
    h("div", { class: "card center" }, [
      h("h1", { text: "That link didn't work" }),
      h("p", {
        class: "muted",
        text: "Sign-in links are single-use and expire after 15 minutes. Request a fresh one.",
      }),
      button("Get a new link", () => ctx.navigate("signup"), "btn big"),
    ])
  );
}
