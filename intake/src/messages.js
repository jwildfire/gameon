// Every refusal the New Game page can show a kid, in one place. The page shows `message`
// as it is, so keep these short, kind and readable by a seven-year-old.
export const MESSAGES = {
  too_short: "Tell us a bit more! What happens in your game?",
  too_long: "Wow, that's a big idea! Can you make it shorter? 1,000 words at most.",
  bad_code: "That family code doesn't look right. Ask your grown-up to check it.",
  too_many_codes: "That's a lot of tries! Ask your grown-up for the family code, then try again tomorrow.",
  need_check: "Tap the \"I'm not a robot\" box first.",
  check_failed: "The robot check didn't work. Try it once more.",
  limit_family: "That's all the ideas for today! Save your next one for tomorrow.",
  limit_device: "That's all the ideas for today! Save your next one for tomorrow.",
  limit_signin: "That's all the ideas for today! Save your next one for tomorrow.",
  signed_out: "You've been signed out. Sign in again, or just send it.",
  signin_failed: "That sign-in didn't work. Try again, or just send your idea.",
  signin_off: "Signing in isn't switched on yet. Just send your idea!",
  limit_busy: "Lots of ideas came in today! Try again tomorrow.",
  bad_request: "Something got mixed up. Try sending it again.",
  bad_origin: "This idea has to come from the GameOn arcade.",
  not_found: "Nothing here. Ideas go to POST /ideas.",
  server: "The idea machine is taking a nap. Try again in a little while.",
  queue_down: "Can't load the idea line right now. Try again in a little while."
};

export function refusal(error, status) {
  return { status, body: { ok: false, error, message: MESSAGES[error] || MESSAGES.server } };
}
