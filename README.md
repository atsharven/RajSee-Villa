# RajSee Villa

A single, photo-informed planning model of the existing Ansal A-60 villa in Ajmer. The project brings the whole villa, the exterior and garden, and the interior floor views together in one place.

Open **[index.html](index.html)** to start. Choose a view, drag the model to rotate it, and use the floor and viewpoint controls. The page works locally without a build step or internet connection.

The model is an approximation assembled from the supplied plan, photographs and owner corrections. It is intended for renovation discussions; measurements, structure, stair design, lift arrangement and site conditions must be checked on site before construction.

## Project contents

```text
index.html                 Landing page and model studio
styles.css                 Page and viewer styling
src/model.js               Single source of model geometry and photo materials
src/viewer.js              Interactive canvas viewer
assets/rajsee-villa.glb    Editable 3D export of the same model
assets/                    Selected photo and aerial references
docs/                      Floor plan, project notes and renovation research
tools/export_model.py      Regenerate the GLB from src/model.js
tests/                     Model and project checks
```

The complete original photo collection remains in the shared `Photos Ansal A 60` folder. The image files included here are selected references, not replacements for the originals.

## Working with the model

- **Whole villa** shows the building, site and roof together.
- **Exterior** starts at the front and can be rotated to the sides and rear; the boundary can be hidden.
- **Interior** offers ground, first and roof views. The rooftop tank, lift room and stair core are provisional.
- `assets/rajsee-villa.glb` can be opened in software that supports glTF 2.0. Its components are grouped by floor and site area.

If the model data changes, regenerate the 3D export and run the checks with Python 3:

```text
python tools/export_model.py
python -m unittest discover -s tests
```

No Python packages or JavaScript dependencies are required. The project can also be served by any static web server if preferred.

See [project notes](docs/project-reference.md) for sources, confirmed decisions and assumptions. The current page and model are local project files; this repository does not publish them automatically.
