// Node's standard library is sufficient. Each named part stays editable in a 3D application.
const fs = require("node:fs");
const path = require("node:path");
require("../src/geometry.js");
require("../src/model.js");

function exportModel(model) {
  const chunks = [], bufferViews = [], accessors = [], meshes = [], nodes = [];
  let offset = 0;
  function data(array, type, target, extra = {}) {
    const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    const bufferView = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target });
    const padding = (4 - bytes.length % 4) % 4;
    chunks.push(bytes, Buffer.alloc(padding));
    offset += bytes.length + padding;
    const componentType = array instanceof Float32Array ? 5126 : 5123;
    accessors.push({ bufferView, componentType, count: array.length / (type === "VEC3" ? 3 : 1), type, ...extra });
    return accessors.length - 1;
  }
  const geometry = {};
  for (const [name, shape] of Object.entries(VillaGeometry.shapes)) {
    geometry[name] = {
      attributes: {
        POSITION: data(Float32Array.from(shape.positions), "VEC3", 34962, { min: [-0.5,-0.5,-0.5], max: [0.5,0.5,0.5] }),
        NORMAL: data(Float32Array.from(shape.normals), "VEC3", 34962)
      },
      indices: data(Uint16Array.from(shape.indices), "SCALAR", 34963)
    };
  }
  const colors = Object.keys(model.colors);
  const materials = colors.map(name => {
    const hex = model.colors[name];
    const linear = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255)
      .map(v => v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4);
    return { name, pbrMetallicRoughness: { baseColorFactor: [...linear,1], metallicFactor: 0, roughnessFactor: 0.92 } };
  });
  const roots = new Map(), meshIndex = new Map();
  const round = values => values.map(value => Number(value.toFixed(7)));
  for (const part of model.parts) {
    if (!roots.has(part.level)) {
      roots.set(part.level, nodes.length);
      nodes.push({ name: part.level, children: [] });
    }
    const shape = part.shape || "box", key = shape + "/" + part.color;
    if (!meshIndex.has(key)) {
      meshIndex.set(key, meshes.length);
      meshes.push({ name: key, primitives: [{ ...geometry[shape], material: colors.indexOf(part.color) }] });
    }
    const node = { name: part.name, mesh: meshIndex.get(key), translation: round(VillaGeometry.center(part)), scale: round(part.s) };
    if (part.yaw || part.tilt) node.rotation = round(VillaGeometry.rotation(part));
    nodes[roots.get(part.level)].children.push(nodes.length);
    nodes.push(node);
  }
  const binary = Buffer.concat(chunks);
  const document = {
    asset: { version: "2.0", generator: "RajSee Villa" }, scene: 0,
    scenes: [{ name: "Ansal A-60 / existing villa", nodes: [...roots.values()] }],
    nodes, meshes, materials, accessors, bufferViews, buffers: [{ byteLength: binary.length }]
  };
  const json = Buffer.from(JSON.stringify(document));
  const jsonLength = Math.ceil(json.length/4)*4;
  const total = 12 + 8 + jsonLength + 8 + binary.length;
  const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
  header.write("glTF"); header.writeUInt32LE(2,4); header.writeUInt32LE(total,8);
  header.writeUInt32LE(jsonLength,12); header.write("JSON",16);
  binHeader.writeUInt32LE(binary.length); binHeader.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([header,json,Buffer.alloc(jsonLength-json.length,0x20),binHeader,binary]);
}
if (require.main === module) {
  const dest = path.join(__dirname,"../assets/rajsee-villa.glb");
  const file = exportModel(RAJSEE_MODEL);
  fs.writeFileSync(dest,file);
  console.log(RAJSEE_MODEL.parts.length + " parts, " + file.length + " bytes");
}
module.exports = { exportModel };
