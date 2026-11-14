// One opaque, depth-tested mesh per view. Orbiting changes only the camera uniforms.
globalThis.createVillaRenderer = (canvas, model) => {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: true });
  if (!gl) return null;
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, `
      attribute vec3 position, color;
      uniform vec3 rightAxis, upAxis, eyeAxis;
      uniform vec2 origin, scale;
      varying lowp vec3 paint;
      void main() {
        vec2 plane = vec2(dot(position,rightAxis), dot(position,upAxis));
        gl_Position = vec4((plane-origin)*scale, -dot(position,eyeAxis)/80.0, 1.0);
        paint = color;
      }`],
    [gl.FRAGMENT_SHADER, `
      precision mediump float;
      varying lowp vec3 paint;
      void main() { gl_FragColor = vec4(paint, 1.0); }`]
  ]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  // In plan, +Z points up the page and +X right. This projection reverses winding.
  gl.frontFace(gl.CW);
  const uniforms = Object.fromEntries(["rightAxis","upAxis","eyeAxis","origin","scale"]
    .map(name => [name, gl.getUniformLocation(program, name)]));
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  for (const [name, offset] of [["position",0],["color",12]]) {
    const attribute = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, 3, gl.FLOAT, false, 24, offset);
  }

  const { shapes, rotate, center, viewParts } = VillaGeometry;
  const rgb = hex => [1,3,5].map(i => parseInt(hex.slice(i,i+2), 16) / 255);
  const palette = Object.fromEntries(Object.entries(model.colors).map(([id,color]) => [id,rgb(color)]));
  const cutColor = rgb("#887f6e");
  let count = 0, corners = [];
  function setView(view, showBoundary) {
    const data = [];
    corners = [];
    for (const part of viewParts(model.parts, view, showBoundary)) {
      const shape = shapes[part.shape || "box"], mid = center(part);
      const yaw = part.yaw || 0, tilt = part.tilt || 0;
      const vertices = [];
      for (let i = 0; i < shape.positions.length; i += 3) {
        const rotated = rotate(...part.s.map((size,k) => size * shape.positions[i+k]), yaw, tilt);
        const point = rotated.map((v,k) => v + mid[k]);
        const n = rotate(...shape.normals.slice(i,i+3), yaw, tilt);
        const light = Math.max(0, -0.53*n[0] + 0.8*n[1] - 0.28*n[2]);
        const shade = 0.72 + 0.32*light;
        const color = part.cutFace && n[1] > 0.99 ? cutColor : palette[part.color];
        vertices.push([...point, ...color.map(v => Math.min(1,v*shade))]);
      }
      for (const index of shape.indices) data.push(...vertices[index]);
      for (const x of [0,1]) for (const y of [0,1]) for (const z of [0,1]) {
        corners.push([part.p[0]+x*part.s[0],part.p[1]+y*part.s[1],part.p[2]+z*part.s[2]]);
      }
    }
    count = data.length / 6;
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  }

  const dot = (v, axis) => v[0]*axis[0] + v[1]*axis[1] + v[2]*axis[2];
  function draw(yaw, pitch, zoom) {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width*dpr), pixelHeight = Math.round(height*dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const c = Math.cos(yaw), s = Math.sin(yaw), h = Math.cos(pitch), v = Math.sin(pitch);
    const right = [c,0,-s], up = [s*v,h,c*v], eye = [-s*h,v,-c*h];
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of corners) {
      const x = dot(p,right), y = dot(p,up);
      x0 = Math.min(x0,x); x1 = Math.max(x1,x); y0 = Math.min(y0,y); y1 = Math.max(y1,y);
    }
    const scale = Math.min((width-32)/(x1-x0), (height-34)/(y1-y0)) * 0.91 * zoom;
    const cx = (x0+x1)/2, cy = (y0+y1)/2;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform3fv(uniforms.rightAxis,right); gl.uniform3fv(uniforms.upAxis,up); gl.uniform3fv(uniforms.eyeAxis,eye);
    gl.uniform2f(uniforms.origin,cx,cy); gl.uniform2f(uniforms.scale, 2*scale/width, 2*scale/height);
    gl.drawArrays(gl.TRIANGLES,0,count);
    return {
      scale,
      project(p) { return [width/2 + (dot(p,right)-cx)*scale, height/2 - (dot(p,up)-cy)*scale]; }
    };
  }
  return { setView, draw };
};
