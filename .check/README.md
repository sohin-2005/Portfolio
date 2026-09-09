# .check — headless smoke tests

Two small Node scripts that boot the real pages and tell you whether they
still work. Neither is a rendering test; between them they catch the class
of mistake that actually breaks a static site — a renamed selector, a
global that moved, a script that throws before it finishes wiring itself
up.

## Setup

```sh
npm install jsdom          # anywhere; the scripts resolve it normally
python3 -m http.server 8899   # from the repo root, in another terminal
```

Both scripts read `FOLIO_ORIGIN` if the server is somewhere else
(default `http://127.0.0.1:8899`).

## harness.mjs

```sh
node .check/harness.mjs                    # every page
node .check/harness.mjs index.html         # one page
FOLIO_DEBUG=1 node .check/harness.mjs      # print globals as well
```

Boots each page in jsdom with the APIs jsdom lacks filled in — canvas, the
observers, `requestAnimationFrame`, and real SVG path geometry from
`svg-geom.mjs` — then asserts the page assembled itself, watches the whole
opening sequence through to its hand-off, and drives the case-study panel
open and closed. Exits non-zero on any failure.

The opening sequence check runs first on purpose: a click or a keypress
anywhere skips the intro by design, which is exactly what the interaction
checks would otherwise do to it.

## preview.mjs

```sh
node .check/preview.mjs > /tmp/ink.svg
convert -density 144 /tmp/ink.svg /tmp/ink.png    # or open the SVG directly
```

Draws one of every ink mark onto a contact sheet, with the CSS flattened
into presentation attributes so a plain rasteriser can render it. Useful
when changing `js/ink.js` — it shows immediately whether the strokes still
flow or have started to kink.

## svg-geom.mjs

`getTotalLength` and `getPointAtLength`, implemented by flattening the
path into a polyline. Stubbing these with constants makes the checks pass
for the wrong reason and makes the contact sheet meaningless, so they are
done properly. Understands `M`, `L`, `C` and `A`, which is everything the
site emits.
