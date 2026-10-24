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
