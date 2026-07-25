# KSPS Wave Prototype

Browser demo of a Kelly Slater's Pro Surfer–inspired wave:

1. **Building** — wave grows in from the open end  
2. **Stable + tube** — lip curls into a tube (Tongue/Surge-style perturb)  
3. **Collapse** — break pulse travels along the face  
4. **Subsiding** — wave fades and loops  

## Run locally

Open `index.html` in a modern browser (needs network once for the Three.js CDN), or:

```bash
cd wave-demo
python3 -m http.server 8080
```

Then visit http://localhost:8080

## What matches the source

| Source (`wave.cpp` / `spline.cpp`) | This demo |
|------------------------------------|-----------|
| Natural cubic splines | Same coefficient algorithm |
| Stages Building → Stable → Subsiding | Same state machine |
| Perturb Do → Hold → Collapse → Wait → Undo | Same stages, Tongue-like timings |
| Height grow during Building along X | Approximates `WAVE_HeightPerturb` |
| `.wave` control grid | Synthetic tube grid (no game assets) |

Visuals are intentional stand-ins — not original textures or beach meshes.
