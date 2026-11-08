# RajSee Villa

A single project for the Ansal A-60 villa in Ajmer, bringing the original floor plan, photographs, layout review and draft 3D views together in one place.

Open **[index.html](index.html)** to start. Review the ground, first and roof plans, then explore the draft model using the floor and viewpoint controls. The page works locally without a build step or internet connection.

**The 3D model is a working sketch and is under review.** Start with the [floor-plan and photo review](docs/layout-review.md), which separates the plan, owner observations and unresolved questions. The current model assumptions are collected on the project page under [Assumptions & measurements to check](index.html#assumptions). Do not use the model for quantities or construction.

## Project contents

```text
index.html                 Landing page and model studio
styles.css                 Page and viewer styling
src/model.js               Single source of geometry for all three views and the export
src/viewer.js              Interactive canvas viewer
assets/rajsee-villa.glb    Editable 3D export of the same model
assets/                    Selected photographs, aerial reference and plan views
docs/                      Floor plan, layout review, project notes and renovation research
tools/export_model.py      Regenerate the GLB from src/model.js
tests/                     Model and project checks
```

The complete original photo collection remains in the shared `Photos Ansal A 60` folder. The image files included here are selected references, not replacements for the originals.

The whole-villa, exterior and interior views all use `src/model.js`. Edit that one model, then rebuild the GLB with the command below; the checks compare every exported part's position and size with the source so an out-of-date download is caught.

## Working with the model

- **Whole villa** shows the building, site and roof together.
- **Exterior** starts at the front and can be rotated to the sides and rear; the boundary can be hidden.
- **Interior** offers ground, first and roof views. The tank is above the stair-head room as confirmed by the owner; dimensions and other unverified details are in the assumptions panel.
- `assets/rajsee-villa.glb` can be opened in software that supports glTF 2.0. Its components are grouped by floor and site area.

If the model data changes, regenerate the 3D export and run the checks with Python 3:

```text
python tools/export_model.py
python -m unittest discover -s tests
```

No Python packages or JavaScript dependencies are required. The project can also be served by any static web server if preferred.

See [project notes](docs/project-reference.md) for sources, confirmed decisions and assumptions. The current page and model are local project files; this repository does not publish them automatically.
