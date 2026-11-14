# Villa model maintenance

- Keep the supplied plan and photographs in `assets/Photos Ansal A 60/` intact. Record evidence and dimensional assumptions in `docs/existing-condition-review.md`.
- Edit the building in `src/model.js`. Use metres and the existing wall, floor and repetition helpers. Preserve the actual courtyard, terrace and stair openings.
- The whole-villa view includes the complete model in solid colours. Floor cuts are derived in `src/geometry.js`. Keep the viewer usable directly from `index.html` without a build or network.
- After editing the model, run `node tools/export-model.cjs` and `node --test tests/model.test.cjs`. Refresh the planning sheets if the layout changes.
