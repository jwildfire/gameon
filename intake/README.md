# GameOn idea intake

A small Cloudflare Worker that lets kids send game ideas from the New Game page with no
GitHub sign-in. It's the only thing holding a GitHub key. It files each idea as an issue
in the private [jwildfire/gameon-ideas](https://github.com/jwildfire/gameon-ideas) repo,
signed in as the GameOn GitHub App (gameon-arcade-bot), and serves the idea line without anyone's
raw words. Background: the hardened front door objective (#55), the intake task (#80), and
[docs/ideas.md](../docs/ideas.md).

| Route | What it does |
|---|---|
| `POST /ideas` | Checks the idea (5 to 1,000 words), the family code or the Turnstile check, and the daily limits, then files the issue. Returns its number |
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

## Limits and settings

All in `[vars]` in `wrangler.toml`; change one and run `npx wrangler@4 deploy`.

| Setting | Default | What it limits |
|---|---|---|
| `LIMIT_PER_CODE_PER_DAY` | 2 | Ideas per family code per day |
| `LIMIT_PER_IP_UNKNOWN_PER_DAY` | 1 | Ideas without a code, per device (IP address) per day |
| `LIMIT_UNKNOWN_PER_DAY` | 10 | Ideas without a code from everyone together, per day |
| `LIMIT_BAD_CODES_PER_IP_PER_DAY` | 5 | Wrong family codes per device per day, before even a right one is refused |
| `QUEUE_CACHE_SECONDS` | 60 | How long `GET /queue` is cached |
| `ALLOWED_ORIGINS` | `https://jwildfire.github.io` | Sites allowed to call it from a browser (comma-separated) |
| `ALLOW_LOCALHOST` | `true` | Also allow `http://localhost:*` and `http://127.0.0.1:*`, for testing. `false` to switch off |
| `IDEAS_REPO` | `jwildfire/gameon-ideas` | Where ideas are filed |
| `PUBLIC_IDEAS_REPO` | `jwildfire/gameon` | Older public ideas the idea line also shows; empty to leave them out |

Days are UTC. Counters live in KV, which can lag by a few seconds, so two ideas sent in
the same moment might both get through. IP addresses are stored only as hashes.

Secrets, all set with `npx wrangler@4 secret put <NAME>` and never written in a file:
`APP_PRIVATE_KEY` (PKCS#8), `TURNSTILE_SECRET`, `FAMILY_CODES`. `APP_ID` and
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
  "turnstile": "<Turnstile token, when there's no code>"
}
```

Only `idea` is required. `maker` is a nickname (letters, numbers, spaces, `'` and `-`, up to
20). `told_by` is `talking` or `typing`. `game` and `version` are for an update idea, as the
New Game page sends them. Without `code`, `turnstile` is required.

- **201** `{"ok":true,"number":12,"status":"status: submitted","submitter":"known"}`
- **400** `too_short`, `too_long`, `need_check`, `bad_request`; **403** `bad_code`,
  `check_failed`, `bad_origin`; **413** `too_long`; **429** `limit_family`,
  `limit_device`, `limit_busy`, `too_many_codes`; **502** `server`. Every refusal is
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

The tests fake GitHub, Turnstile, KV and the cache, and cover validation, rate limits, the
known and unknown labels, the issue body, CORS, queue redaction and the app's JWT.

To run the Worker on your machine, copy `.dev.vars.example` to `.dev.vars` (git-ignored),
fill it in, and run `npx wrangler@4 dev`. The example uses Cloudflare's public Turnstile
test secret, which passes every token.
