/* Shared Auth0 sign-in for non-SDK pages. SDK Testing keeps its own conversation-aware Auth0 lifecycle. */
(() => {
  const config = {
    domain: "dev-q1lngtdo3cgl4m8c.us.auth0.com",
    clientId: "ZtCJT5jQo3Wegk1GJsSnjG6oA4K2kqm1",
    authorizationParams: {
      redirect_uri: window.location.origin,
      audience: "https://alchemer-interaction-api"
    },
    cacheLocation: "localstorage",
    useRefreshTokens: false
  };
  let client;
  let readyPromise;
  const $ = (id) => document.getElementById(id);
  const status = $("authStatusText");
  const login = $("loginButton"), signup = $("signupButton"), logout = $("logoutButton");
  function render(user) {
    if (status) status.textContent = user ? (user.email || user.name || "Signed in") : "Anonymous";
    const indicator = $("authStatus");
    if (indicator) indicator.dataset.authenticated = user ? "true" : "false";
    if (login) login.hidden = !!user;
    if (signup) signup.hidden = !!user;
    if (logout) logout.hidden = !user;
    // Populate homepage overview only when those elements are present.
    const set = (id, value) => { const el = $(id); if (el) el.textContent = value; };
    const signedIn = !!user;
    const provider = user?.sub?.split("|")[0] || null;
    const providerNames = {auth0:"Auth0 database","google-oauth2":"Google",github:"GitHub",windowslive:"Microsoft",apple:"Apple"};
    const homeState = $("homeAuthState");
    if (homeState) homeState.dataset.authenticated = String(signedIn);
    set("homeAuthState", signedIn ? "Signed in" : "Not signed in");
    set("homeUserName", signedIn ? (user.name || user.nickname || user.email || "Signed-in user") : "Not signed in");
    set("homeUserEmail", signedIn ? (user.email || "No email provided") : "Log in to see your account");
    set("homeSession", signedIn ? "Active" : "Anonymous");
    set("homeProvider", signedIn ? (providerNames[provider] || provider || "Unknown") : "—");
    set("homeVerified", signedIn ? (user.email_verified === true ? "Yes" : user.email_verified === false ? "No" : "Unknown") : "—");

  }
  function fail(error) {
    console.error("Auth0 authentication error:", error);
    render(null);
    if (status) status.textContent = "Authentication unavailable";
    const state = $("homeAuthState");
    if (state) state.textContent = "Connection error";
    const name = $("homeUserName");
    if (name) name.textContent = "Unable to load account";
    const email = $("homeUserEmail");
    if (email) email.textContent = error?.message || "Try refreshing or signing in again";
  }
  async function start() {
    if (!window.auth0?.createAuth0Client) {
      // Recover if the external SDK script failed or loaded after auth.js.
      const sources = [
        "https://cdn.auth0.com/js/auth0-spa-js/2.18/auth0-spa-js.production.js",
        "https://cdn.jsdelivr.net/npm/@auth0/auth0-spa-js@2.1.3/dist/auth0-spa-js.production.js"
      ];
      for (const src of sources) {
        if (window.auth0?.createAuth0Client) break;
        try {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error("Failed to load " + src));
            document.head.appendChild(script);
          });
        } catch (error) { console.warn(error); }
      }
    }
    if (!window.auth0?.createAuth0Client) throw new Error("Auth0 SDK could not be loaded");
    client = await window.auth0.createAuth0Client(config);
    const query = new URLSearchParams(window.location.search);
    if (query.has("code") && query.has("state")) {
      await client.handleRedirectCallback();
      history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    } else if (query.has("error")) {
      const message = query.get("error_description") || query.get("error");
      history.replaceState({}, document.title, window.location.pathname + window.location.hash);
      throw new Error(message);
    }
    render((await client.isAuthenticated()) ? await client.getUser() : null);
  }
  async function ensureClient() {
    if (client) return client;
    if (!readyPromise) readyPromise = start();
    await readyPromise;
    if (!client) throw new Error("Auth0 client unavailable");
    return client;
  }
  login?.addEventListener("click", async () => {
    try {
      const authClient = await ensureClient();
      await authClient.loginWithRedirect({ authorizationParams: { audience: config.authorizationParams.audience } });
    } catch (error) { fail(error); }
  });
  signup?.addEventListener("click", async () => {
    try {
      const authClient = await ensureClient();
      await authClient.loginWithRedirect({ authorizationParams: { audience: config.authorizationParams.audience, screen_hint: "signup" } });
    } catch (error) { fail(error); }
  });
  logout?.addEventListener("click", async () => {
    try {
      const authClient = await ensureClient();
      await authClient.logout({ logoutParams: { returnTo: window.location.origin } });
    } catch (error) { fail(error); }
  });
  // Never leave the account UI stuck on a loading placeholder.
  render(null);
  readyPromise = start();
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Auth0 session check timed out")), 12000));
  Promise.race([readyPromise, timeout]).catch(fail);
})();
