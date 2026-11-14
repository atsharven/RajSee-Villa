// Unit meshes and rotations are shared by the local viewer and the GLB exporter.
globalThis.VillaGeometry = (() => {
  function mesh() {
    return { positions: [], normals: [], indices: [] };
  }
  function face(target, points, normal) {
    const start = target.positions.length / 3;
    for (const point of points) {
      target.positions.push(...point);
      target.normals.push(...normal);
    }
    for (let i = 1; i < points.length - 1; i++) target.indices.push(start, start + i, start + i + 1);
  }
  const box = mesh();
  const low = -0.5, high = 0.5;
  for (const [axis, direction] of [[0,1],[0,-1],[1,1],[1,-1],[2,1],[2,-1]]) {
    const normal = [0,0,0];
    normal[axis] = direction;
    const points = [[low,low],[high,low],[high,high],[low,high]].map(([a,b]) => {
      const point = [0,0,0];
      point[axis] = direction / 2;
      point[(axis + 1) % 3] = a;
      point[(axis + 2) % 3] = b;
      return point;
    });
    face(box, direction > 0 ? points : points.reverse(), normal);
  }

  const cylinder = mesh(), sides = 24;
  const circle = Array.from({ length: sides }, (_, i) => {
    const angle = i * 2 * Math.PI / sides;
    return [Math.cos(angle) / 2, Math.sin(angle) / 2];
  });
  for (let i = 0; i < sides; i++) {
    const [x,z] = circle[i], [x1,z1] = circle[(i + 1) % sides];
    const length = Math.hypot(x + x1, z + z1);
    face(cylinder, [[x,low,z],[x,high,z],[x1,high,z1],[x1,low,z1]], [(x+x1)/length,0,(z+z1)/length]);
  }
  face(cylinder, circle.map(([x,z]) => [x,low,z]), [0,-1,0]);
  face(cylinder, circle.map(([x,z]) => [x,high,z]).reverse(), [0,1,0]);

  // Apply local tilt about Z, then yaw about world Y. glTF uses the same order.
  function rotate(x, y, z, yaw, tilt) {
    const a = x*Math.cos(tilt) - y*Math.sin(tilt);
    const b = x*Math.sin(tilt) + y*Math.cos(tilt);
    return [a*Math.cos(yaw) + z*Math.sin(yaw), b, -a*Math.sin(yaw) + z*Math.cos(yaw)];
  }
  function rotation(part) {
    const yaw = (part.yaw || 0)/2, tilt = (part.tilt || 0)/2;
    return [Math.sin(yaw)*Math.sin(tilt), Math.sin(yaw)*Math.cos(tilt),
      Math.cos(yaw)*Math.sin(tilt), Math.cos(yaw)*Math.cos(tilt)];
  }
  function center(part) {
    return part.p.map((value, axis) => value + part.s[axis] / 2);
  }

  function viewParts(parts, view, showBoundary = true) {
    if (view === "villa") return showBoundary ? parts : parts.filter(part => part.level !== "boundary");
    if (view === "roof") return parts.filter(part => part.level === "roof" || part.level === "roof-head");
    const base = view === "ground" ? 0 : 3.3, cut = base + 1.22;
    const selected = [];
    for (const part of parts) {
      if (part.level === "spiral" || (part.level === view && part.name.startsWith("Main stair"))) {
        selected.push(part);
        continue;
      }
      if ((part.level !== view && part.level !== "facade") || part.overhead) continue;
      const bottom = part.level === "facade" ? Math.max(base, part.p[1]) : part.p[1];
      const top = Math.min(cut, part.p[1] + part.s[1]);
      if (top - bottom < 0.00001) continue;
      if (top >= part.p[1] + part.s[1] && bottom === part.p[1]) selected.push(part);
      else selected.push({ ...part, p: [part.p[0], bottom, part.p[2]], s: [part.s[0], top-bottom, part.s[2]],
        cutFace: top === cut && (part.color === "wall" || part.color === "interior") });
    }
    return selected;
  }
  return { shapes: { box, cylinder }, center, rotate, rotation, viewParts };
})();
