# Fancy Food Fight

> Fancy people foodfight! Messiest wins

That's the whole idea, word for word, from Jeremy on the GameOn New Game page (game idea #103). Built by Claude Opus 5.5 from the [eval's build brief](https://github.com/jwildfire/gameon/issues/103).

**Play:** https://jwildfire.github.io/gameon/#fancy-food-fight, or open `index.html` straight from this folder. It's one file, with no internet needed.

## How to play

- You've crashed the fanciest dinner party in town. **Tap or click** where you want your food to land. Hold and slide to aim, then let go.
- **Pick a food** from the tray (keys 1 to 4): cream pie, spaghetti, wobbly jelly (it bounces) or layer cake (it breaks into chunks).
- The Duchess, the Butler, the Top-Hat Gentleman and the Opera Singer **throw back**. When a guest's hand goes up with a **!**, hold **Duck!** (or Shift or Z) and their food flies over you. Get hit and it's a face full of pie.
- **Big messes:** hit the chandelier three times to bring it down on the table, or splat the waiter's tray as he walks by.
- **Messiest wins:** every splat you make scores, and the Mess Meter shows how messy the room is. After each one-minute round, whoever made the most mess gets the crown. Three rounds; most crowns wins the night. The mess stays on the walls all night.
- **Keyboard:** arrows or WASD move the aim, Space throws, P pauses.

## Notes for builders

- Everything is in `index.html`: canvas drawing, sound made in the browser, no images or fonts to load.
- Saves (your best night and sound on or off) live under `gameon.fancy-food-fight.` in the browser.
- `window.__fff` is a small read-only window for the evidence tests.

## jeremy.v2: Buttons that stay big on a phone

Update idea from Jeremy (game idea #219), word for word:

> Make Fancy Food Fight comfortable on a phone and with a keyboard, so it meets the phone bar from the phone-friendly games task (jwildfire/gameon#187): every button at least 48 x 48 px at 375 px wide, 8 px clear of each other and the screen edges, and both WASD and the arrow keys working. Measured on jeremy.v1 on 2026-10-29:
>
> - Everything scales with the 16:9 stage, so the buttons shrink on a phone. On a phone held sideways (812 x 375), Pause and Sound are 25 x 25, the food tray buttons are 43 x 43, and Duck! is 67 x 43. Upright they're even smaller (Pause is 14 x 14).
> - The tray buttons are 5-6 px apart, Sound and Pause are 7 px apart, and they're 6-7 px from the screen edges.
> - The title and overlay buttons are 35 px tall when sideways.
> - Sound and How to play have no key.
>
> Give the HUD buttons, the tray, Duck! and the overlay buttons a 48 px minimum that doesn't shrink with the stage, with 8 px gaps, placed 8 px in from the screen edge. Add keys for Sound and How to play. Aiming with WASD or the arrows already passes. Keep everything else the same.

Started from jeremy.v1. Sound, Pause, the food tray and Duck! now sit on the screen instead of shrinking with the stage: each is at least 48 x 48 px (its jeremy.v1 size when that is bigger), 8 px apart and at least 8 px in from the screen edges. With the phone held upright they sit just above and below the party. The title, pause, round and help buttons are at least 48 px too. New keys: **M** turns the sound on or off and **H** shows How to play. The HUD pills and Mess meter are never narrower than in jeremy.v1.
