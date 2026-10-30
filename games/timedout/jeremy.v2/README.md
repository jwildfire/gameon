# Timed Out

## jeremy.v2: Play it with keys

Update idea from Jeremy (game idea #226), word for word:

> Make Timed Out comfortable on a phone and with a keyboard, so it meets the phone bar from the phone-friendly games task (jwildfire/gameon#187): every button at least 48 x 48 px at 375 px wide, 8 px clear of each other and the screen edges, and both WASD and the arrow keys working. Measured on jeremy.v1 on 2026-10-29:
>
> - No keys. WASD, the arrows, Space, Enter, P and Escape do nothing. A keyboard player can only press Tab through the buttons.
> - The menu X is 28 x 28, Read clue is 30 x 23, the drop zones are 44 px wide, and the topic buttons are 44 px tall.
> - The number-of-events slider is a 6 px track.
>
> Add keys: A/D or Left/Right move a highlighted drop zone, Enter or Space places the card, and Escape opens the menu. Make the X, Read clue, the topic buttons and the drop zones at least 48 px, and give the slider a bigger thumb. Keep everything else the same.
>
> This game also lives in jwildfire/timedout. Making the same fix there too means the next import from that repo won't bring the old controls back.

Started from jeremy.v1. A/D or the left and right arrows pick a drop zone, and Enter, Space, S or the down arrow places the card there; W or the up arrow reads the clue aloud. Escape, P or the X opens a pause menu (Keep playing or Main Menu), and on the title and game over screens the arrows and WASD move between the buttons. The X, Read clue, the topic buttons, the drop zones, Main Menu and the Dad Mode switch are at least 48 px to tap, the slider has a 32 px thumb and a 48 px tall hit box, and on a phone held sideways the drop zones fit above the bottom of the screen. Dad Mode still saves under `dadMode`, as jeremy.v1 does.
