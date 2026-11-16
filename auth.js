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
    const signedIn = !!user;
    if (status) status.textContent = signedIn ? (user.email || user.name || "Signed in") : "Anonymous";
    const indicator = $("authStatus");
    if (indicator) {
      indicator.dataset.authenticated = String(signedIn);
      indicator.classList.toggle("authenticated", signedIn);
    }
    if (login) login.hidden = signedIn;
    if (signup) signup.hidden = signedIn;
    if (logout) logout.hidden = !signedIn;
  }
  function fail(error) {
    console.error("Auth0 authentication error:", error);
    render(null);
    if (status) status.textContent = "Authentication unavailable";
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
    const user = (await client.isAuthenticated()) ? await client.getUser() : null;
    render(user);
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
