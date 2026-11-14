# RajSee Villa

A local workspace for the Ansal A-60 villa: one shared 3D model, the original plans, photographs and renovation notes. Open [index.html](index.html) in a browser; it works from this folder without installation or internet access.

The model is an approximate planning reference, not a measured survey. The page's **Assumptions & measurements to check** records what still needs verification.

## Planning images

Open the [ground and first-floor cutaways](assets/existing-floor-cutaways.png) to trace the rooms, stairs and terraces. The [exterior sheet](assets/existing-villa.png) pairs the reconstruction with three original photographs and shows both rear entrances. Use the [November photo review](docs/existing-condition-review.md) to check which parts of the building are established and which dimensions were inferred.

## Using the model

- Choose **Whole villa**, **Exterior** or **Interior**. In Interior, choose Ground, First or Roof & tank. Drag to rotate and use the zoom slider or mouse wheel.
- The model opens in a plain, solid-colour view. Turn on **Show textures** to see the photo materials; the switch applies across views until the page is reloaded. It changes the viewer only: the downloadable 3D model retains its materials.
- Turn **Boundary** on or off in outside views; **Neighbour side** looks toward the adjacent wall. Room labels can be hidden in the interior views.
- Open **Compare with a photo** to select a reference angle or a photo from your device. Angles are approximate and selected local photos are not uploaded.
- The page also contains the original floor plans, notes, photo references and the downloadable `assets/rajsee-villa.glb`.

## Project layout

```text
index.html              Page, floor-plan notes and the central assumptions list
styles.css              Page and viewer presentation
src/model.js            Single source for geometry, colours, labels and texture paths
src/viewer-config.js    Camera angles and photo comparison choices
src/renderer.js         Model drawing and material display
src/viewer.js           Controls, interactions and view state
assets/textures/        Image materials used by the viewer and 3D export
assets/                 Plans, original reference photos and 3D export
docs/                   Layout review, project notes and renovation research
tools/export_model.py   Rebuild the 3D file from the shared model
tests/                  Project and model checks
```

For future changes, update the model once in `src/model.js`; all browser views use it. Each part has a position (`p`) and size (`s`) in metres: x runs toward the neighbour, y is height, and z runs from the front toward the rear. Photo choices and their approximate angles live in `src/viewer-config.js`. The image files in `assets/textures/` can be replaced when a different finish is needed; keep the source photos and the existing plan intact.

After changing model data or texture files, regenerate the downloadable 3D file and run the checks using Python 3:

```text
python tools/export_model.py
python -m unittest discover -s tests
```

The project requires no Python packages or JavaScript dependencies. The checks compare the exported parts and textures with the source model. GitHub Actions runs these checks on pushes and pull requests and verifies that the committed 3D export is current; this project does not publish itself.
