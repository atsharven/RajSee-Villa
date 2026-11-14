# RajSee Villa

Open [the viewer](index.html) directly in a browser. It runs offline. The starting view contains the house, both staircases, the court, terraces, roof structures, garden and compound walls in plain colours. Choose a floor to see a cut at 1.22 m above it. **Top plan** looks straight down. Drag or use the arrow keys to orbit, and use the wheel, pinch or zoom buttons to move closer.

The original plan, photographs and the owner's observations describe the existing house. The screened rear door probably opens into Bedroom 2. The boundary offsets, wall and slab thicknesses, stair geometry and floor heights are approximate. Check site dimensions before setting out work. [Photo evidence and open measurements](docs/existing-condition-review.md) · [Original drawing](assets/Photos%20Ansal%20A%2060/Map%20Ansal%20A-60.pdf)

## Planning files

- [Editable 3D model](assets/rajsee-villa.glb)
- [Exterior and rear access](assets/existing-villa.png)
- [Ground and first-floor cutaways](assets/existing-floor-cutaways.png)

## Editing the model

`src/model.js` describes the villa in metres. X increases from the side road toward the neighbour, Y is height and Z increases from front to rear. Add a wall with its openings, lay a deck around a void or repeat a group of parts there. The viewer and export both use those solids.

`src/geometry.js` supplies the closed meshes and floor sections. `src/renderer.js` draws them, and `src/viewer.js` connects the controls, labels and reference images. The browser loads these scripts locally.

Use Node.js 22 or later to regenerate the GLB and check a change. No package installation is needed.

```sh
node tools/export-model.cjs
node --test tests/model.test.cjs
```

The checks compare the committed GLB with the source, inspect mesh closure, trace the room envelopes and verify the floor joints and planned openings. The supplied source files live in `assets/Photos Ansal A 60/`.
