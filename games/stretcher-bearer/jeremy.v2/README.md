# Stretcher Bearer

A WWI medic game, designed with my kids. You are a stretcher bearer at an aid station in the Flanders town of Saint-Lucas. Over 15 days from August 1914 to 11 November 1918, you bring the wounded in from the trenches and no man's land while the war wears down the land around you.

**Play:** open `index.html` in any browser. It's one self-contained file. On a desktop you play with the keyboard, and touch devices get an on-screen stick and buttons.

## Features

- Find wounded soldiers, treat them, and carry them back to the aid tent. You can also drive them in the jeep.
- Cooper, your assistant, follows you and helps out.
- Trench rules: climb in and out only at ladders, and cross only on bridges.
- Each day brings main orders and side missions: rescue officers, find Rags the messenger dog, collect identity discs, recover medical crates, and stop snipers.
- The war escalates year by year with gas attacks, bunkers, flooded trenches, trench foot and influenza. Woods turn to splinters and the town crumbles.
- At night, raiders come for the aid tent, and the men you saved during the day help defend it.

## How it was made

Built with Claude (Opus 5.5) in one evening session on 2026-10-21. The kids dictated prompts and I steered. Originally published as a Claude artifact.

## jeremy.v2: Roomier buttons on a phone

Update idea from Jeremy (game idea #223), word for word:

> Make Stretcher Bearer comfortable on a phone and with a keyboard, so it meets the phone bar from the phone-friendly games task (jwildfire/gameon#187): every button at least 48 x 48 px at 375 px wide, 8 px clear of each other and the screen edges, and both WASD and the arrow keys working. Measured on jeremy.v1 on 2026-10-29:
>
> - Orders, Sound and Pause are 62 x 30, 74 x 30 and 55 x 30, only 6 px apart.
> - The action buttons (Mask, Meds, Load, Cooper, Run, Fire) are 52 x 52, but only 7 px apart.
> - The screen buttons (Report for duty, Move out, Next day and the rest) are 42 px tall.
> - On a phone, Report for duty is below the bottom of the screen, so you have to scroll the title card to find it.
>
> Make Orders, Sound and Pause 48 px tall with 8 px gaps, space the action buttons 8 px apart, make the screen buttons 48 px tall, and keep the start button on screen on a phone. Keys already pass. Keep everything else the same.
>
> This game also lives in jwildfire/stretcher-bearer. Making the same fix there too means the next import from that repo won't bring the old controls back.

Started from jeremy.v1. Orders, Sound and Pause are 48 px tall and 8 px apart, the action buttons are 8 px apart, and the screen buttons (Report for duty, Move out, Next day and the rest) are 48 px tall. On a phone, Report for duty stays at the bottom of the screen while you scroll the title card, so it's on screen straight away; the title card gives up a little white space so everything it showed before is still in view above it. The other screens' buttons stay where they were. On a sideways phone, where jeremy.v1's buttons sat on top of each other, the map and the score, the action buttons and the stick take their upright-phone sizes (52 px and 116 px) so they fit under the map and the status card, Orders, Sound and Pause sit next to the action buttons, and the score sits above them, so nothing overlaps. The keys, the missions, the look and the sound are the same, and best scores carry over.
