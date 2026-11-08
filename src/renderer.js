(() => {
  'use strict';

  // The renderer reads shared model data and view state; it does not own controls.
  window.createVillaRenderer = (model, canvas, state) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const faces = [
    {i: [0, 1, 2, 3], shade: .82}, {i: [4, 5, 6, 7], shade: 1.02},
    {i: [0, 1, 5, 4], shade: .73}, {i: [3, 2, 6, 7], shade: 1.08},
    {i: [0, 3, 7, 4], shade: .88}, {i: [1, 2, 6, 5], shade: .94}
  ];
  const textures = {};
  // The camera fits the same shared geometry used by every view and by the GLB export.
  const roofTop = Math.max(8.7, ...model.parts
    .filter(part => part.level === 'roof' || part.level === 'roof-detail')
    .map(part => part.p[1] + part.s[1]));
  for (const [name, url] of Object.entries(model.images)) {
    const image = new Image();
    textures[name] = image;
    image.onload = () => { if (state.showTextures) draw(); };
    image.src = url;
  }

  function visible(part) {
    if (state.mode !== 'interior') return !part.interiorOnly && (state.showBoundary || part.level !== 'boundary');
    const grille = part.name.startsWith('Court pergola') ||
      (part.name.startsWith('Terrace opening grille') && part.name !== 'Terrace opening grille post');
    if (state.floor === 'roof') return part.level === 'roof' || part.level === 'roof-detail' || grille;
    if (state.floor === 'first' && grille) return true;
    if (part.level === state.floor) return true;
    if (part.level === 'spiral') return state.floor === 'ground' || (state.floor === 'first' && part.p[1] >= 2.55);
    return false;
  }

  function colorShade(hex, factor) {
    const value = parseInt(hex.slice(1), 16);
    return `rgb(${Math.min(255, Math.round((value >> 16) * factor))},${Math.min(255, Math.round(((value >> 8) & 255) * factor))},${Math.min(255, Math.round((value & 255) * factor))})`;
  }

  function textureFace(image, vertices, poly) {
    const width = image.naturalWidth, height = image.naturalHeight;
    if (!width || !height) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(vertices[0][0], vertices[0][1]);
    for (let i = 1; i < vertices.length; i++) ctx.lineTo(vertices[i][0], vertices[i][1]);
    ctx.closePath();
    ctx.clip();
    if (poly.textureRepeatMeters && poly.faceIndex === 3) {
      const [sizeX, sizeZ] = poly.textureSize;
      const repeat = poly.textureRepeatMeters;
      ctx.transform((vertices[1][0] - vertices[0][0]) / sizeX, (vertices[1][1] - vertices[0][1]) / sizeX,
        (vertices[3][0] - vertices[0][0]) / sizeZ, (vertices[3][1] - vertices[0][1]) / sizeZ,
        vertices[0][0], vertices[0][1]);
      const pattern = ctx.createPattern(image, 'repeat');
      pattern.setTransform(new DOMMatrix([repeat / width, 0, 0, repeat / height,
        -(poly.textureOrigin[0] % repeat), -(poly.textureOrigin[1] % repeat)]));
      ctx.globalAlpha = .84;
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, sizeX, sizeZ);
      ctx.restore();
      return;
    }
    ctx.transform((vertices[1][0] - vertices[0][0]) / width, (vertices[1][1] - vertices[0][1]) / width,
      (vertices[3][0] - vertices[0][0]) / height, (vertices[3][1] - vertices[0][1]) / height,
      vertices[0][0], vertices[0][1]);
    ctx.globalAlpha = .84;
    ctx.drawImage(image, 0, 0);
    ctx.restore();
  }

  function partLayer(part) {
    if (part.name === 'Ground inside boundary - soil') return 0;
    if (part.level === 'site') return part.name === 'Curved garden edging' || part.name === 'Front entrance steps' ? 2 : 1;
    if (part.name === 'Courtyard paving' || part.name === 'Courtyard sunken bed') return 1;
    // The neighbour-side boundary is consistently in front of or behind the
    // house when viewed from that side; long wall faces need this ordering.
    if (part.name === 'Neighbour boundary wall') {
      const side = Math.sin(state.yaw);
      if (side < -.35) return 4;
      if (side > .35) return 2.5;
    }
    return 3;
  }

  function draw() {
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, box.width, box.height);

    const isExterior = state.mode !== 'interior';
    const co = Math.cos(state.yaw), si = Math.sin(state.yaw), cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
    let bounds;
    if (isExterior) bounds = {x: [-2.25, 12.25], y: [-.3, roofTop + .2], z: [-8, 21]};
    else if (state.floor === 'ground') bounds = {x: [0, 11.9], y: [-.2, 4], z: [0, 19.5]};
    else if (state.floor === 'first') bounds = {x: [0, 11.9], y: [2.55, 6.7], z: [0, 19.5]};
    else bounds = {x: [0, 11.9], y: [6.15, roofTop + .3], z: [0, 19.5]};

    function raw(x, y, z) {
      const side = co * x - si * z, depth = si * x + co * z;
      return [side, -y * cp - depth * sp, depth * cp - y * sp];
    }
    const corners = [];
    for (const x of bounds.x) for (const y of bounds.y) for (const z of bounds.z) corners.push(raw(x, y, z));
    const xs = corners.map(c => c[0]), ys = corners.map(c => c[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const scale = Math.min((box.width - 45) / (maxX - minX), (box.height - 45) / (maxY - minY)) * state.zoom;
    let midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;
    if (state.focus) {
      const target = raw(...state.focus);
      midX = target[0]; midY = target[1];
    }
    function project(x, y, z) {
      const point = raw(x, y, z);
      return [box.width / 2 + (point[0] - midX) * scale, box.height / 2 + (point[1] - midY) * scale, point[2]];
    }
    const polygons = [];
    function polygon(vertices, part, shade, textured = true, faceIndex = -1) {
      if (vertices.length < 3) return;
      const a = vertices[0], b = vertices[1], c = vertices[vertices.length - 1];
      const area = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
      if (area < .25) return;
      polygons.push({vertices, area, depth: vertices.reduce((sum, v) => sum + v[2], 0) / vertices.length,
        color: part.color, shade, layer: partLayer(part), name: part.name, textured,
        seamlessSegments: part.seamlessSegments, faceIndex,
        textureRepeatMeters: part.textureRepeatMeters,
        textureOrigin: [part.p[0], part.p[2]], textureSize: [part.s[0], part.s[2]]});
    }

    for (const part of model.parts) {
      if (!visible(part)) continue;
      const [x, y, z] = part.p, [width, height, depth] = part.s;
      if (part.shape === 'cylinder') {
        const bottom = [], top = [], count = 20;
        for (let i = 0; i < count; i++) {
          const a = i * Math.PI * 2 / count, px = x + width / 2 + Math.cos(a) * width / 2, pz = z + depth / 2 + Math.sin(a) * depth / 2;
          bottom.push(project(px, y, pz));
          top.push(project(px, y + height, pz));
        }
        for (let i = 0; i < count; i++) polygon([bottom[i], bottom[(i + 1) % count], top[(i + 1) % count], top[i]], part, .82 + .15 * Math.cos(i * Math.PI * 2 / count), false);
        polygon(top, part, 1.13, false);
        continue;
      }
      const mx = x + width / 2, mz = z + depth / 2, rc = Math.cos(part.yaw || 0), rs = Math.sin(part.yaw || 0);
      const points = [[x, y, z], [x + width, y, z], [x + width, y + height, z], [x, y + height, z],
        [x, y, z + depth], [x + width, y, z + depth], [x + width, y + height, z + depth], [x, y + height, z + depth]]
        .map(q => { const dx = q[0] - mx, dz = q[2] - mz; return project(mx + rc * dx + rs * dz, q[1], mz - rs * dx + rc * dz); });
      for (const [faceIndex, face] of faces.entries()) {
        // Segment long walls for correct depth ordering without drawing joint caps.
        if (part.seamlessSegments &&
            ((width > depth && (faceIndex === 4 || faceIndex === 5)) ||
             (depth > width && (faceIndex === 0 || faceIndex === 1)))) continue;
        polygon(face.i.map(i => points[i]), part, face.shade,
          !part.topTextureOnly || faceIndex === 3, faceIndex);
      }
    }

    polygons.sort((a, b) => a.layer - b.layer || b.depth - a.depth);
    for (const poly of polygons) {
      ctx.beginPath();
      ctx.moveTo(poly.vertices[0][0], poly.vertices[0][1]);
      for (let i = 1; i < poly.vertices.length; i++) ctx.lineTo(poly.vertices[i][0], poly.vertices[i][1]);
      ctx.closePath();
      ctx.fillStyle = colorShade(model.colors[poly.color] || '#b9b9b0', poly.shade);
      ctx.fill();
      const texture = textures[poly.color];
      if (state.showTextures && poly.textured && texture && texture.complete && poly.area > 80) textureFace(texture, poly.vertices, poly);
      if (poly.name !== 'Ground inside boundary - soil' && !poly.seamlessSegments) {
        ctx.strokeStyle = 'rgba(50,55,53,.22)';
        ctx.lineWidth = .55;
        ctx.stroke();
      }
    }

    if (!isExterior && state.showLabels) {
      const labelHeight = {ground: .12, first: 3.42, roof: roofTop + .12}[state.floor];
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const label of model.labels[state.floor] || []) {
        const point = project(label.x, labelHeight, label.z), width = ctx.measureText(label.text).width;
        ctx.globalAlpha = .92;
        ctx.fillStyle = '#fff';
        ctx.fillRect(point[0] - width / 2 - 5, point[1] - 10, width + 10, 20);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#2d423a';
        ctx.fillText(label.text, point[0], point[1]);
      }
    }
  }

  return draw;
  };
})();
