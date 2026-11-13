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
    const providerNames = {auth0:"Auth0 database",google-oauth2:"Google",github:"GitHub",windowslive:"Microsoft",apple:"Apple"};
    set("homeAuthState", signedIn ? "Signed in" : "Not signed in");
    set("homeUserName", signedIn ? (user.name || user.nickname || user.email || "Signed-in user") : "Not signed in");
    set("homeUserEmail", signedIn ? (user.email || "No email provided") : "Log in to see your account");
    set("homeSession", signedIn ? "Active" : "Anonymous");
    set("homeProvider", signedIn ? (providerNames[provider] || provider || "Unknown") : "—");
    set("homeVerified", signedIn ? (user.email_verified === true ? "Yes" : user.email_verified === false ? "No" : "Unknown") : "—");

  }
  function fail(error) {
    console.error("Auth0 authentication error:", error);
    if (status) status.textContent = "Authentication unavailable";
  }
  async function start() {
    if (!window.auth0?.createAuth0Client) throw new Error("Auth0 SDK did not load");
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
  login?.addEventListener("click", () => client?.loginWithRedirect({
    authorizationParams: { audience: config.authorizationParams.audience }
  }).catch(fail));
  signup?.addEventListener("click", () => client?.loginWithRedirect({
    authorizationParams: { audience: config.authorizationParams.audience, screen_hint: "signup" }
  }).catch(fail));
  logout?.addEventListener("click", () => client?.logout({
    logoutParams: { returnTo: window.location.origin }
  }));
  start().catch(fail);
})();
