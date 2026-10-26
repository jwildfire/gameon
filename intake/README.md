# GameOn idea intake

A small Cloudflare Worker that lets kids send game ideas from the New Game page with no
GitHub sign-in. It's the only thing holding a GitHub key. It files each idea as an issue
in the private [jwildfire/gameon-ideas](https://github.com/jwildfire/gameon-ideas) repo,
signed in as the GameOn GitHub App (gameon-arcade-bot), and serves the idea line without anyone's
raw words. Background: the hardened front door objective (#55), the intake task (#80), and
[docs/ideas.md](../docs/ideas.md).

| Route | What it does |
|---|---|
| `POST /ideas` | Checks the idea (5 to 1,000 words), the family code, the session token or the Turnstile check, and the daily limits, then files the issue. Returns its number |
| `POST /auth/google` | Checks a Google ID token from "Sign in with Google" and answers with a session token. [Sign-in](#sign-in-and-the-allowlist) |
| `GET /auth/github/start`, `GET /auth/github/callback` | "Sign in with GitHub": off to GitHub and back to the New Game page with a session token |
| `GET /queue` | The idea line: the eval's title and one-liner, status, nickname and date for each idea, never the words. "Just sent" until the eval has read it. Cached for 60 seconds |
| `GET /` | `{"ok":true,"service":"gameon-intake"}`, a health check |

Nothing here is deployed yet. Jeremy does that once, with the steps below. These already
exist and are filled in, since none of them is a secret:

- the Cloudflare account (`account_id` in `wrangler.toml`);
- the KV namespace `gameon-intake` (bound as `INTAKE_KV` in `wrangler.toml`);
- the Turnstile widget, managed mode, for `jwildfire.github.io` and `localhost` (its public
  site key is in `new/intake-config.js`);
- the GitHub App **gameon-arcade-bot**, installed on gameon, trampoline-battle and
  gameon-ideas (`APP_ID` and `INSTALLATION_ID` in `wrangler.toml`).

What's left is three secrets, the deploy, the family codes and the switch in the page.

## Going live (Jeremy, about 15 minutes)

Run everything below from this folder, `intake/`, in a checkout of gameon.
`npx wrangler@4` fetches Cloudflare's CLI the first time.

### 1. Sign in to Cloudflare

```sh
cd ~/Documents/games/gameon/intake
npx wrangler@4 login        # opens the browser; click Allow
npx wrangler@4 whoami       # should list account 27ba7e53c52c4eff786faec8ad1fa823
```

### 2. Deploy the Worker

```sh
npx wrangler@4 deploy
```

It prints the Worker's address, like `https://gameon-intake.<your-subdomain>.workers.dev`.
That's the **intake URL**. It answers `GET /` straight away; ideas fail with "The idea
machine is taking a nap" until steps 3 to 5 are done. Secrets set after a deploy take
effect without deploying again.

### 3. Give the Worker the Turnstile secret

Cloudflare dashboard → **Turnstile** → the GameOn widget → **Settings**, and copy the
**secret key** (the site key is the public half, already in the page). Then:

```sh
npx wrangler@4 secret put TURNSTILE_SECRET    # paste the secret key, press Return
```

### 4. Give the Worker the app's key, in PKCS#8

The Worker signs in with WebCrypto, which reads PKCS#8 keys (`-----BEGIN PRIVATE KEY-----`).
GitHub hands out PKCS#1 (`-----BEGIN RSA PRIVATE KEY-----`), so convert it.

1. On the app's settings page (https://github.com/settings/apps/gameon-arcade-bot), under
   **Private keys**, click **Generate a private key**. Use a new key just for the Worker,
   not the one in your Keychain, so each can be revoked on its own.
2. Convert it, hand it to the Worker, and delete both files:

   ```sh
   openssl pkcs8 -topk8 -nocrypt -in ~/Downloads/gameon-arcade-bot.*.private-key.pem -out /tmp/gameon-intake-key.pem
   head -1 /tmp/gameon-intake-key.pem                   # must say -----BEGIN PRIVATE KEY-----
   npx wrangler@4 secret put APP_PRIVATE_KEY < /tmp/gameon-intake-key.pem
   rm /tmp/gameon-intake-key.pem ~/Downloads/gameon-arcade-bot.*.private-key.pem
   ```

   (If you skip the conversion, the Worker's log says exactly this command.)

### 5. Check the app can file issues in gameon-ideas

Nothing to type if the app was set up as in `~/Documents/games/gameon-bot-setup.md`: it has
**Issues: Read and write**, and its installation (174983225) includes **gameon-ideas**, plus
gameon so the idea line can show older public ideas. If you change either, check
https://github.com/settings/installations/174983225.

The Worker asks GitHub for a token that can only touch Issues on gameon-ideas, whatever
else the app can do. Its issues show as filed by gameon-arcade-bot[bot].

### 6. Add the family codes

A family code is how the Worker knows an idea comes from a family we know
(`submitter: known`). Make each one hard to guess: three words and a number, like
`purple-otter-moon-58` (don't use that one). Codes are matched in lower case.

```sh
npx wrangler@4 secret put FAMILY_CODES
```

and paste one line of JSON, code to family nickname:

```json
{"<code for your family>": "wildfire", "<code for Ryan's family>": "killjoy"}
```

The nickname goes in the private issue's `### Family` section, so use a family nickname,
never a surname. To add or remove a family, run the same command with the whole new list.
Then give each grown-up their code by message, not in GitHub. Never put a code in the repo.

(Codes can also live in KV, one key each, if you'd rather not resend the list:
`npx wrangler@4 kv key put --binding INTAKE_KV --remote "family:<code>" "<nickname>"`.)

### 7. Check it with curl

Set the address once, then try each case. Each answer is JSON with a `message` the page
shows the kid.

```sh
INTAKE=https://gameon-intake.<your-subdomain>.workers.dev
ORIGIN="Origin: https://jwildfire.github.io"
JSON="Content-Type: application/json"

curl -s $INTAKE/                                                  # {"ok":true,"service":"gameon-intake"}
curl -s -H "$ORIGIN" $INTAKE/queue                                # {"ok":true,"at":"…","ideas":[…]}: no idea words anywhere
curl -s -H "$ORIGIN" -H "$JSON" $INTAKE/ideas -d '{"idea":"a fun game","code":"<your code>"}'
                                                                  # 400 too_short
curl -s -H "$ORIGIN" -H "$JSON" $INTAKE/ideas -d '{"idea":"a game where a snail races a turtle to the moon","code":"wrong-code"}'
                                                                  # 403 bad_code
curl -s -H "$ORIGIN" -H "$JSON" $INTAKE/ideas -d '{"idea":"a game where a snail races a turtle to the moon"}'
                                                                  # 400 need_check (no code, no Turnstile)
curl -s -H "$ORIGIN" -H "$JSON" $INTAKE/ideas -d '{"idea":"a test idea where a snail races a turtle to the moon","maker":"Tester","told_by":"typing","code":"<your code>"}'
                                                                  # 201 {"ok":true,"number":2,…,"submitter":"known"}
curl -s -o /dev/null -w '%{http_code}\n' -X OPTIONS -H "Origin: https://evil.example" $INTAKE/ideas
                                                                  # 403: other sites can't use it
```

Send the good one twice more: the second files another, and the third in a day gets
`429 limit_family`. Then open the new issues in gameon-ideas, add the `test` label so the
idea line hides them, and close them. A
`502` with "taking a nap" means GitHub refused: run `npx wrangler@4 tail` while you retry
to see why (a missing secret, a PKCS#1 key, or the app not installed on gameon-ideas).

### 8. Turn it on in the New Game page

Put the intake URL in `url` in `new/intake-config.js` (a small task PR into dev; the
Turnstile site key is already there). With `url` empty, the page keeps opening GitHub's
form, as in Phase 0.

### 9. Let Ryan read the ideas

Add @killjoy00 as a collaborator on gameon-ideas so his agents can run the pipeline on
private ideas.

## Sign-in and the allowlist

Grown-ups can sign in on the New Game page with Google or GitHub. It's optional: an idea
sent without signing in still goes through the robot check, exactly as before. Signing in
skips the robot check, and lets Jeremy or Ryan say once that someone's ideas count as known.

- **Google:** the page uses Google Identity Services and posts the ID token it gets to
  `POST /auth/google`. The Worker checks it against Google's public keys (cached as long as
  Google says), and that `aud` is `GOOGLE_CLIENT_ID`, `iss` is accounts.google.com, it
  hasn't expired and `email_verified` is true. No Google secret is involved.
- **GitHub:** "Sign in with GitHub" goes to `GET /auth/github/start`, which sends the browser
  to GitHub with a signed `state` (and a matching ten-minute cookie). GitHub sends it back to
  `GET /auth/github/callback`, which swaps the code for a user token with
  `GITHUB_CLIENT_SECRET`, reads the user's id, login and name, revokes the token, and sends
  the browser back to the New Game page with `#gameon_session=<token>`. The page removes it
  from the address straight away. This uses gameon-arcade-bot's own user authorization, so
  there's no second app.
- **The session token** is the Worker's own: provider, id, display name, and email (Google)
  or login (GitHub), HMAC-signed with `SESSION_SECRET` and good for 30 days. The page keeps
  it on the device and sends it as `session` with each idea. Changing `SESSION_SECRET` signs
  everyone out.
- **The allowlist.** The first idea from someone signed in opens one private issue in
  gameon-ideas, **"Allow <name> to send ideas?"**, labelled `allowlist` and
  `allowlist: pending`, with the provider, email or login, name and a link to the idea.
  Their later ideas are added to it as comments (KV remembers the issue as
  `allow:issue:<provider>:<id>`). To decide, Jeremy or Ryan adds `allowlist: allowed` or
  `allowlist: denied` (and removes `allowlist: pending`). Ideas from an allowed sender are
  `submitter: known`; everyone else's stay `submitter: unknown` and wait at
  `status: needs approval`. The Worker reads the issue's events and only trusts a label that
  jwildfire or killjoy00 added, and it remembers the answer for ten minutes.
- **Privacy.** Emails and logins go only into the allowlist issue in gameon-ideas. The idea
  issue says only which provider and which allowlist issue, and `GET /queue` never shows any
  of it: the idea line still shows only the nickname the kid typed. Allowlist issues have no
  `game-idea` label, so the idea line and the pipeline skip them.

### Switching sign-in on (Jeremy, about 20 minutes)

Nothing below is done yet. Run the commands from `intake/`, as above.

**1. Make a Google client ID** (for "Sign in with Google").

1. Open https://console.cloud.google.com/ and create a project called **GameOn** (or pick an
   existing one).
2. Go to **Google Auth Platform** (APIs & Services → OAuth consent screen). Under
   **Branding**, set the app name to **GameOn** and your email as the support and developer
   contact. Under **Audience**, pick **External**, then **Publish app** so it's "In
   production". GameOn asks only for the basic `openid`, `email` and `profile` scopes, which
   need no review; while it says "Testing", only listed test users can sign in.
3. Under **Clients**, click **Create client**:
   - Application type: **Web application**; name: **GameOn New Game page**.
   - **Authorized JavaScript origins:** `https://jwildfire.github.io`, and for testing on
     your machine `http://localhost` and `http://localhost:8080` (Google wants the bare
     `http://localhost` as well as the one with your port).
   - **Authorized redirect URIs:** leave empty. The Google button doesn't redirect.
4. Click **Create** and copy the **Client ID** (`<numbers>-<letters>.apps.googleusercontent.com`).
   It isn't a secret. Don't copy or download the client secret: GameOn doesn't use it.

**2. Set up GitHub sign-in on the app.**

1. Open https://github.com/settings/apps/gameon-arcade-bot (**General**).
2. Under **Identifying and authorizing users**:
   - **Callback URL:** add `https://gameon-intake.jwildfire.workers.dev/auth/github/callback`.
   - **Request user authorization (OAuth) during installation:** off.
   - **Enable Device Flow:** off. Leave **Expire user authorization tokens** as it is.
3. Click **Save changes**.
4. Under **Client secrets**, click **Generate a new client secret** and copy it now (GitHub
   shows it only once). The client ID, `Iv23liwSYtQ7ujJXX9Oy`, is already in
   `wrangler.toml`.

   The app needs no new permissions. When someone signs in, GitHub's page names
   gameon-arcade-bot and may say it can "act on your behalf"; that token can only reach repos
   where the app is installed and the person already has access, and the Worker revokes it
   as soon as it has read their name.

**3. Give the Worker its two new secrets.**

```sh
npx wrangler@4 secret put GITHUB_CLIENT_SECRET          # paste the client secret from step 2
openssl rand -base64 32 | npx wrangler@4 secret put SESSION_SECRET
```

The second line makes a random secret and hands it straight to the Worker, so it's never
on screen or in a file. Don't reuse it anywhere else.

**4. Put the Google client ID in `wrangler.toml` and deploy.**

Set `GOOGLE_CLIENT_ID = "<client id from step 1>"` in `wrangler.toml`, then:

```sh
npx wrangler@4 deploy
```

Check it:

```sh
INTAKE=https://gameon-intake.jwildfire.workers.dev
curl -s -H "Origin: https://jwildfire.github.io" -H "Content-Type: application/json" $INTAKE/auth/google -d '{"credential":"x"}'
                         # 401 signin_failed (503 signin_off means GOOGLE_CLIENT_ID or SESSION_SECRET is missing)
curl -s -o /dev/null -D - "$INTAKE/auth/github/start?return=https%3A%2F%2Fjwildfire.github.io%2Fgameon%2Fdev%2Fnew%2F" | grep -i '^location'
                         # Location: https://github.com/login/oauth/authorize?client_id=Iv23liwSYtQ7ujJXX9Oy&…
                         # (…/new/#gameon_signin_error=unavailable means GITHUB_CLIENT_SECRET or SESSION_SECRET is missing)
```

**5. Turn the buttons on in the New Game page.** In `new/intake-config.js`, set
`googleClientId` to the same client ID and `githubSignIn: true`, in a small task PR into dev
(it can carry the `wrangler.toml` change from step 4). Then on
https://jwildfire.github.io/gameon/dev/new/, sign in each way, send a test idea, and check
gameon-ideas has the idea and one "Allow … to send ideas?" issue. Label both `test`, try
`allowlist: allowed`, send another idea (within ten minutes it may still say unknown), and
close them when you're done.

To switch sign-in off again, empty `googleClientId` and set `githubSignIn: false` in the
page. Removing `SESSION_SECRET` from the Worker also refuses every session, and the page
falls back to the robot check.

## Limits and settings

All in `[vars]` in `wrangler.toml`; change one and run `npx wrangler@4 deploy`.

| Setting | Default | What it limits |
|---|---|---|
| `LIMIT_PER_CODE_PER_DAY` | 2 | Ideas per family code per day |
| `LIMIT_PER_IP_UNKNOWN_PER_DAY` | 1 | Ideas without a code, per device (IP address) per day |
| `LIMIT_UNKNOWN_PER_DAY` | 10 | Ideas without a code from everyone together, per day |
| `LIMIT_BAD_CODES_PER_IP_PER_DAY` | 5 | Wrong family codes per device per day, before even a right one is refused |
| `LIMIT_PER_SIGNIN_PER_DAY` | 3 | Ideas per signed-in sender per day. Ideas from a sender who isn't allowed yet also count toward `LIMIT_UNKNOWN_PER_DAY` |
| `GOOGLE_CLIENT_ID` | empty | The Google OAuth client ID. Empty keeps Google sign-in off |
| `GITHUB_CLIENT_ID` | `Iv23liwSYtQ7ujJXX9Oy` | gameon-arcade-bot's client ID, for GitHub sign-in |
| `SIGNIN_RETURN_URLS` | the New Game page on main and dev | The only pages a session token is sent back to (comma-separated). `localhost` pages too while `ALLOW_LOCALHOST` is on |
| `ALLOWLIST_DECIDERS` | `jwildfire,killjoy00` | Whose `allowlist:` labels count |
| `QUEUE_CACHE_SECONDS` | 60 | How long `GET /queue` is cached |
| `ALLOWED_ORIGINS` | `https://jwildfire.github.io` | Sites allowed to call it from a browser (comma-separated) |
| `ALLOW_LOCALHOST` | `true` | Also allow `http://localhost:*` and `http://127.0.0.1:*`, for testing. `false` to switch off |
| `IDEAS_REPO` | `jwildfire/gameon-ideas` | Where ideas are filed |
| `PUBLIC_IDEAS_REPO` | `jwildfire/gameon` | Older public ideas the idea line also shows; empty to leave them out |

Days are UTC. Counters live in KV, which can lag by a few seconds, so two ideas sent in
the same moment might both get through. IP addresses are stored only as hashes.

Secrets, all set with `npx wrangler@4 secret put <NAME>` and never written in a file:
`APP_PRIVATE_KEY` (PKCS#8), `TURNSTILE_SECRET`, `FAMILY_CODES`, and for sign-in
`GITHUB_CLIENT_SECRET` and `SESSION_SECRET`. `APP_ID` and
`INSTALLATION_ID` aren't secret, so they're in `[vars]`.

## `POST /ideas`

```json
{
  "idea": "a game where a penguin delivers pizza on a sled",
  "maker": "Rocket",
  "told_by": "talking",
  "game": "fancy-food-fight",
  "version": "jeremy.v1",
  "code": "<family code>",
  "session": "<session token, when someone signed in>",
  "turnstile": "<Turnstile token, when there's no code and no session>"
}
```

Only `idea` is required. `maker` is a nickname (letters, numbers, spaces, `'` and `-`, up to
20). `told_by` is `talking` or `typing`. `game` and `version` are for an update idea, as the
New Game page sends them. Without `code` or `session`, `turnstile` is required.

- **201** `{"ok":true,"number":12,"status":"status: submitted","submitter":"known"}`, plus
  `"signed_in":true` when it came with a session.
- **400** `too_short`, `too_long`, `need_check`, `bad_request`; **401** `signed_out` (the
  session is tampered with, expired, or sign-in is off: the page signs out and shows the
  robot check); **403** `bad_code`, `check_failed`, `bad_origin`; **413** `too_long`;
  **429** `limit_family`, `limit_device`, `limit_busy`, `limit_signin`, `too_many_codes`;
  **502** `server`. Every refusal is
  `{"ok":false,"error":"<code>","message":"<words for a kid>"}`.

The issue has the Game idea form's layout plus a `### Family` section, and the labels
`game-idea`, `status: submitted`, `submitter: known` or `submitter: unknown`, and `update`
for an update ([docs/ideas.md](../docs/ideas.md#the-issue)).

## `GET /queue`

```json
{"ok": true, "at": "2026-10-24T18:05:00.000Z", "ideas": [
  {"source": "private", "number": 3, "created": "2026-10-24T18:04:00Z", "status": "status: submitted",
   "maker": "Rocket", "update": false, "game": "", "title": null, "one_liner": null,
   "question": null, "reason": null, "version": null, "just_sent": true}
]}
```

Newest first, up to 30. Titles and one-liners come only from eval comments by people with
access to the repo or by a bot, and are hidden if the eval's safety gate failed. An unknown
submitter's nickname reads "Someone" until a grown-up has approved the idea. Ideas labelled
`test` are left out.

## Working on it

```sh
npm run test:intake                  # from the repo root: Node's built-in test runner, no installs
```

The tests fake GitHub, Turnstile, Google's keys, GitHub sign-in, KV and the cache, and cover
validation, rate limits, the known and unknown labels, the issue body, CORS, queue
redaction, the app's JWT, Google and GitHub sign-in, session tokens and the allowlist.

To run the Worker on your machine, copy `.dev.vars.example` to `.dev.vars` (git-ignored),
fill it in, and run `npx wrangler@4 dev`. The example uses Cloudflare's public Turnstile
test secret, which passes every token. For sign-in, add `GOOGLE_CLIENT_ID=<client id>` to
`.dev.vars` (it overrides the empty one in `wrangler.toml`) and a `SESSION_SECRET` of your
own.
