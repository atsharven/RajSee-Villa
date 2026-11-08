# Villa model maintenance

- `src/model.js` is the single source of model geometry, colours, labels and texture paths. The whole-villa, exterior and interior views use the same parts; change geometry there once rather than maintaining separate models.
- Keep photo-view presets in `src/viewer-config.js`, drawing and materials in `src/renderer.js`, and controls in `src/viewer.js`. Preserve direct local-file use without a build step.
- The viewer starts plain; its texture switch affects display only. Image materials in `assets/textures/` are embedded in the GLB export.
- After changing geometry or textures, regenerate `assets/rajsee-villa.glb` with `python tools/export_model.py`, then run `python -m unittest discover -s tests`. The checks compare the export with the source.
- Maintain model assumptions in the `#assumptions` section of `index.html`. Keep the drawing review as source evidence and preserve the supplied original plan and photographs.
