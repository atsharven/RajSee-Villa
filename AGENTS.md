# Villa model maintenance

- `src/model.js` is the single source of model geometry and materials. The whole-villa, exterior and interior views use the same parts; change geometry there once rather than maintaining separate models.
- After changing geometry, regenerate `assets/rajsee-villa.glb` with `python tools/export_model.py`, then run `python -m unittest discover -s tests`. The checks compare the exported parts with the source.
- Maintain model assumptions in the `#assumptions` section of `index.html`. Keep the drawing review as source evidence and preserve the supplied original plan and photographs.
