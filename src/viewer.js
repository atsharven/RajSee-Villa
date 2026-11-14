(() => {
  'use strict';

  const model = window.RAJSEE_MODEL;
  const views = window.RAJSEE_VIEWS;
  const canvas = document.querySelector('#villa-canvas');
  const detail = document.querySelector('#model-detail');
  if (!model || !views || !canvas || !window.createVillaRenderer) {
    if (detail) detail.textContent = 'The model could not be loaded. Check that the project files are together.';
    return;
  }

  const {cameras, photoMatches} = views;
  const modeButtons = [...document.querySelectorAll('[data-mode]')];
  const floorButtons = [...document.querySelectorAll('[data-floor]')];
  const cameraButtons = [...document.querySelectorAll('[data-camera]')];
  const floorControls = document.querySelector('.floor-controls');
  const boundaryControl = document.querySelector('#boundary-control');
  const boundary = document.querySelector('#boundary-toggle');
  const labelControl = document.querySelector('#label-control');
  const labels = document.querySelector('#label-toggle');
  const textures = document.querySelector('#texture-toggle');
  textures.checked = false; // Start in the owner's preferred plain view on each load.
  const zoomInput = document.querySelector('#zoom-range');
  const zoomValue = document.querySelector('#zoom-value');
  const title = document.querySelector('#model-title');
  const tag = document.querySelector('#canvas-tag-text');
  const stage = document.querySelector('#studio-stage');
  const photoPane = document.querySelector('#comparison-photo');
  const photoImage = document.querySelector('#comparison-photo-image');
  const photoTitle = document.querySelector('#comparison-photo-title');
  const photoSelect = document.querySelector('#photo-preset');
  const photoUpload = document.querySelector('#photo-upload');
  let selectedPhotoUrl = null;

  const state = {
    mode: 'base', floor: 'ground', camera: 'front', yaw: .63, pitch: .47,
    zoom: 1, drag: null, focus: null,
    showBoundary: boundary.checked, showLabels: labels.checked, showTextures: textures.checked
  };
  const draw = window.createVillaRenderer(model, canvas, state);
  if (!draw) {
    detail.textContent = 'This browser could not display the model.';
    return;
  }

  for (const [key, preset] of Object.entries(photoMatches)) {
    photoSelect.add(new Option(preset.label, key));
  }

  const assumptions = document.querySelector('#assumptions');
  if (window.location.hash === '#assumptions') assumptions.open = true;
  for (const link of document.querySelectorAll('a[href="#assumptions"]')) {
    link.addEventListener('click', () => { assumptions.open = true; });
  }

  function setPressed(buttons, key, value) {
    for (const button of buttons) {
      const active = button.dataset[key] === value;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }

  function updateControls() {
    setPressed(modeButtons, 'mode', state.mode);
    setPressed(floorButtons, 'floor', state.floor);
    setPressed(cameraButtons, 'camera', state.camera);
    floorControls.hidden = state.mode !== 'interior';
    boundaryControl.hidden = state.mode === 'interior';
    labelControl.hidden = state.mode !== 'interior';
    zoomInput.value = String(Math.round(state.zoom * 100));
    zoomValue.textContent = `${Math.round(state.zoom * 100)}%`;
    if (state.mode === 'base') {
      title.textContent = 'The whole villa';
      tag.textContent = 'SITE & ROOFTOP';
      detail.textContent = 'A working view of the villa, garden and rooftop.';
    } else if (state.mode === 'exterior') {
      title.textContent = 'Outside & garden';
      tag.textContent = 'EXTERIOR REFERENCE';
      detail.textContent = 'Explore the front, sides, rear, garden and boundary.';
    } else {
      const names = {ground: 'Ground floor', first: 'First floor', roof: 'Roof & tank'};
      title.textContent = names[state.floor];
      tag.textContent = names[state.floor].toUpperCase();
      detail.textContent = state.floor === 'roof'
        ? 'The tank is above the stair-head room; its dimensions are estimated.'
        : state.floor === 'first'
          ? 'Cutaway through the upper rooms, puja recess and landing. The two terraces are open.'
          : 'Cutaway through the hall, bedrooms, kitchen and stair lobby. Door widths and stair dimensions are approximate.';
    }
  }

  function chooseMode(mode) {
    state.mode = mode;
    state.focus = null;
    state.camera = mode === 'interior' ? 'above' : 'front';
    [state.yaw, state.pitch] = cameras[state.camera];
    if (mode === 'interior') { state.yaw = .10; state.pitch = 1.18; }
    state.zoom = 1;
    updateControls();
    draw();
  }

  function showPhoto(src, label) {
    photoTitle.textContent = label;
    photoImage.src = src;
    photoImage.alt = label;
    photoPane.hidden = false;
    stage.classList.add('is-comparing');
  }

  function clearSelectedPhoto() {
    if (selectedPhotoUrl) URL.revokeObjectURL(selectedPhotoUrl);
    selectedPhotoUrl = null;
  }

  function closePhoto() {
    clearSelectedPhoto();
    photoPane.hidden = true;
    photoImage.removeAttribute('src');
    photoUpload.value = '';
    photoSelect.value = '';
    stage.classList.remove('is-comparing');
    state.focus = null;
    state.zoom = 1;
    updateControls();
    draw();
  }

  photoSelect.addEventListener('change', () => {
    const preset = photoMatches[photoSelect.value];
    if (!preset) { closePhoto(); return; }
    clearSelectedPhoto();
    photoUpload.value = '';
    state.mode = preset.mode || 'exterior';
    state.floor = preset.floor || 'ground';
    state.camera = preset.camera;
    state.yaw = preset.yaw;
    state.pitch = preset.pitch;
    state.zoom = preset.zoom;
    state.focus = preset.focus;
    showPhoto(preset.src, preset.title);
    updateControls();
    draw();
  });

  photoUpload.addEventListener('change', () => {
    const file = photoUpload.files && photoUpload.files[0];
    if (!file) return;
    clearSelectedPhoto();
    selectedPhotoUrl = URL.createObjectURL(file);
    photoSelect.value = '';
    showPhoto(selectedPhotoUrl, file.name);
    draw();
  });
  document.querySelector('#comparison-close').addEventListener('click', closePhoto);

  for (const button of modeButtons) button.addEventListener('click', () => chooseMode(button.dataset.mode));
  for (const button of floorButtons) button.addEventListener('click', () => {
    state.floor = button.dataset.floor;
    state.camera = 'above';
    state.focus = null;
    [state.yaw, state.pitch] = cameras.above;
    state.yaw = .10;
    state.pitch = 1.18;
    state.zoom = 1;
    updateControls();
    draw();
  });
  for (const button of cameraButtons) button.addEventListener('click', () => {
    state.camera = button.dataset.camera;
    state.focus = null;
    [state.yaw, state.pitch] = cameras[state.camera];
    updateControls();
    draw();
  });
  for (const [input, property] of [[boundary, 'showBoundary'], [labels, 'showLabels'], [textures, 'showTextures']]) {
    input.addEventListener('change', () => { state[property] = input.checked; draw(); });
  }
  zoomInput.addEventListener('input', () => {
    state.zoom = Number(zoomInput.value) / 100;
    updateControls();
    draw();
  });
  canvas.addEventListener('pointerdown', event => {
    state.drag = {x: event.clientX, y: event.clientY};
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!state.drag) return;
    state.yaw += (event.clientX - state.drag.x) * .008;
    state.pitch = Math.max(-.15, Math.min(1.35, state.pitch + (event.clientY - state.drag.y) * .006));
    state.drag = {x: event.clientX, y: event.clientY};
    draw();
  });
  canvas.addEventListener('pointerup', () => { state.drag = null; });
  canvas.addEventListener('pointercancel', () => { state.drag = null; });
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    state.zoom = Math.max(.6, Math.min(2.2, state.zoom * Math.exp(-event.deltaY * .001)));
    updateControls();
    draw();
  }, {passive: false});
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') state.yaw -= .1;
    if (event.key === 'ArrowRight') state.yaw += .1;
    if (event.key === 'ArrowUp') state.pitch = Math.min(1.35, state.pitch + .1);
    if (event.key === 'ArrowDown') state.pitch = Math.max(-.15, state.pitch - .1);
    draw();
  });
  new ResizeObserver(draw).observe(canvas.parentElement);
  updateControls();
  draw();
})();
