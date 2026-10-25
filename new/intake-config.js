// The idea intake service the New Game page sends to (intake/README.md, step 8).
// Empty url: Send opens GitHub's Game idea form for a grown-up to submit, as in Phase 0.
// Every value is public: the url is the Worker's address, and the site key is
// Turnstile's public key (its secret lives only in the Worker).
window.GAMEON_INTAKE = {
  url: "https://gameon-intake.jwildfire.workers.dev",
  turnstileSiteKey: "0x4AAAAAAFkrw2xvlaI5TKLD", // Turnstile, for ideas sent without a family code
  familyCodes: false,   // no family codes yet (Jeremy, 2026-10-24): no code field, every idea waits for a grown-up
  // Optional sign-in, off until the Worker is set up (intake/README.md, "Switching sign-in on").
  googleClientId: "",   // the Google OAuth client ID (public), e.g. "123-abc.apps.googleusercontent.com"
  githubSignIn: false   // true shows "Sign in with GitHub"
};
