<!-- glassbox:start -->
<!-- Generated from glassbox.json by the Glassbox hub (npm run readme -- gpsclear). Edit glassbox.json, not this block. -->

<h1 align="center">GPSClear</h1>

<p align="center"><b>How does GPS know where you are?</b><br>Your phone never sends a word to GPS. It just listens to about thirty clocks 20,200 km up, times how late each signal is, and solves for where you stand and what time it is. Play with the satellites, the spheres, relativity and a city street.</p>

<p align="center"><a href="https://glassbox.how/gpsclear/"><b>▶ Play with it</b></a> &nbsp;·&nbsp; <a href="https://glassbox.how/e/gpsclear/">Read the 60-second explainer</a></p>

<p align="center">
  <a href="https://glassbox.how/e/gpsclear/"><img alt="Glassbox No. 221" src="https://img.shields.io/badge/Glassbox-No.%20221-8ef0ff"></a>
  <a href="https://glassbox.how/e/gpsclear/"><img alt="Space" src="https://img.shields.io/badge/field-Space-c49bff"></a>
  <a href="LICENSE"><img alt="Code: MIT" src="https://img.shields.io/badge/code-MIT-3fb950"></a>
  <a href="LICENSE-CONTENT.md"><img alt="Content: CC BY 4.0" src="https://img.shields.io/badge/content-CC%20BY%204.0-ef9421"></a>
  <a href="#privacy"><img alt="Privacy: explained" src="https://img.shields.io/badge/privacy-explained-555"></a>
</p>

## In 60 seconds

1. **A net of clocks, not cameras.** About 31 working GPS satellites circle 20,200 km up, in six orbital planes tilted 55 degrees. Each takes just under 12 hours to go round, so from almost anywhere at least four are above the horizon, and usually eight or more. They only broadcast: their name, their position and the exact time. Your phone listens and never transmits.
2. **Time is distance.** Radio travels at the speed of light, about 299,792 kilometres a second. A signal from a satellite overhead takes about 67 milliseconds to arrive, one near the horizon about 86. Each satellite sends a repeating 1,023-chip code, and the receiver slides its own copy until the two match. That delay, times the speed of light, is the range. One nanosecond of error is 30 centimetres.
3. **Spheres that meet.** One range puts you on a sphere around a satellite. Two spheres meet in a circle, and three in two points, one of which is out in space and is thrown away. But the clock in a phone is cheap, and an error of one millisecond makes every range about 300 km too long. So the receiver treats its clock error as a fourth unknown, and four satellites solve for x, y, z and time.
4. **Einstein is in the loop.** Satellite clocks tick differently from clocks on the ground. Their speed makes them lose about 7 microseconds a day, and being higher in Earth's gravity makes them gain about 46. The net is about 38 microseconds a day fast, which would add up to more than 11 km of error a day. GPS fixes it at the source by tuning the satellite clock slightly slow before launch.
5. **Where it goes wrong.** In the open a phone is good to about 5 metres. The ionosphere slows radio by a few metres to tens of metres, and receivers using two frequencies can cancel it. In a street between tall buildings, satellites are blocked and signals bounce, which corrections cannot fix. Satellites bunched in one part of the sky give a poor fix, measured by dilution of precision. WAAS-type corrections give 1 to 3 metres, and RTK gives centimetres.
6. **Four systems, one phone.** GPS is the American system. GLONASS (Russia), Galileo (Europe) and BeiDou (China) also cover the whole planet, and India and Japan run regional ones. A modern phone chip listens to all of them, which means more satellites in view. A-GPS gives the phone satellite orbit data over the internet, so a first fix takes seconds instead of half a minute or more.

## Words worth knowing

| Term | Meaning |
|---|---|
| **GNSS** | Global navigation satellite system: the general name for GPS, GLONASS, Galileo, BeiDou and similar systems. |
| **Pseudorange** | A distance worked out from signal delay. It is 'pseudo' because it still includes the receiver's clock error. |
| **C/A code** | The open GPS code: 1,023 chips that repeat every millisecond, different for every satellite. |
| **Chip** | One bit of the code. At 1.023 million a second, a chip lasts about 0.98 microseconds, which is about 293 metres of travel. |
| **Trilateration** | Finding a position from distances to known points. Triangulation uses angles; GPS uses distances. |
| **Clock bias** | How far the receiver's clock is from GPS time. It is solved together with the position. |
| **Ephemeris** | The precise orbit data a satellite broadcasts about itself, at 50 bits a second. |
| **Multipath** | A signal that reaches the receiver after bouncing, so its path is longer than the direct one. |
| **DOP** | Dilution of precision: how much the layout of the satellites multiplies the range errors. Lower is better. |
| **A-GPS** | Assisted GPS: the phone fetches orbit data and an approximate time and place from the network, so it starts faster. |

## A short history

**From a radio beep from Sputnik to a sky of more than a hundred navigation satellites that tells your phone where it is.**

- **1957** · Finding a satellite from its pitch (William Guier and George Weiffenbach, Applied Physics Laboratory, Maryland, USA)
- **1958** · Turn the idea around (Frank McClure, William Guier and George Weiffenbach, Applied Physics Laboratory, Maryland, USA)
- **1967** · Timation puts a clock in orbit (Roger Easton and the Naval Research Laboratory, United States)
- **1977** · Cesium clocks, and Einstein checked (Naval Research Laboratory, United States)
- **1978** · The first Navstar satellite launches (US Air Force, Vandenberg Air Force Base, California, USA)
- **1983** · Reagan promises GPS for civil use (President Ronald Reagan, United States)
- **1986** · Gladys West shapes the Earth for GPS (Gladys West, Naval Proving Ground, Dahlgren, Virginia, USA)
- **1995** · Full operational capability (US Air Force, United States)

The full story, with 38 moments, charts, people and 48 sources: [glassbox.how/e/gpsclear/history](https://glassbox.how/e/gpsclear/history/). The data lives in [`history.json`](history.json).

## Privacy

This box has no accounts and no ads, and it ships its own fonts and libraries. When you run it yourself it sends nothing anywhere. On glassbox.how, the site's `/bar.js` also loads Glassbox's analytics: **Google Analytics** to count visits (it asks first in the EU, UK and Switzerland, and stays off when your browser sends Global Privacy Control or Do Not Track) and **ClickTrust** to detect bots.

It remembers a few things **in your own browser only**, and never sends them anywhere:

| Browser storage key | What it holds |
|---|---|
| `gpsclear.v1` | Which chapters you have opened, your best quiz scores, and sound on or off. |

Exactly what each one sees is at [glassbox.how/privacy](https://glassbox.how/privacy/).

## Licences

- **Code:** [MIT](LICENSE). Use it, change it, ship it.
- **Explanations, text, images and videos** (`glassbox.json`, `glassbox/`): [CC BY 4.0](LICENSE-CONTENT.md). Credit “Glassbox, glassbox.how/e/gpsclear”.
- **Third-party parts** keep their own licences: [three.js](https://threejs.org) (MIT), [Geist, Instrument Serif](https://openfontlicense.org) (SIL OFL 1.1).
- The Glassbox name and logo aren't covered by either licence. See the [terms](https://glassbox.how/terms/).

Found a mistake? [Open an issue](https://github.com/bdeeps/gpsclear/issues). Corrections happen in public.
<!-- glassbox:end -->

## Run it

It's plain HTML, CSS and JavaScript. No build step and no dependencies. Run locally, it contacts no other website.

```bash
python3 -m http.server 8000
```

Three.js and the fonts ship in `vendor/` and `fonts/`, so it also works offline.

Then open http://localhost:8000.

## How it's built

| File | What |
|---|---|
| `index.html`, `css/app.css` | The page and its styles |
| `js/app.js`, `js/stage.js`, `js/ui.js`, `js/kit.js` | The shared Glassbox 3D engine: chapters, 3D stage, controls, quiz, video director |
| `js/chapters/*.js` | One file per chapter: the 3D model, controls, text, key terms, quiz and video scenes |
| `glassbox.json` | Title, question, explainer beats, key terms, browser storage and credits shown on glassbox.how |
| `reel` in each chapter | The storyboard the Glassbox studio records into short videos |
| `glassbox/` | The published video, slides, thumbnail and post copy |
| `fonts/`, `vendor/three/` | Self-hosted Geist and Instrument Serif (SIL OFL 1.1) and three.js (MIT) |
