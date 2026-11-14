const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { exportModel } = require("../tools/export-model.cjs");
const { parts, colors, labels } = RAJSEE_MODEL;
const { shapes, viewParts } = VillaGeometry;
const near = (a,b) => Math.abs(a-b) < 0.00001;
const end = (p,i) => p.p[i]+p.s[i];
const overlaps = (a,b) => [0,1,2].every(i => Math.min(end(a,i),end(b,i)) - Math.max(a.p[i],b.p[i]) > 0.00001);
const hasPoint = (p,x,y,z) => [x,y,z].every((v,i) => v >= p.p[i]-0.00001 && v <= end(p,i)+0.00001);

test("The whole villa and GLB contain every solid with its source transform and flat material", () => {
  assert.equal(viewParts(parts,"villa"),parts);
  assert.ok(parts.every(p => p.color in colors && p.p.every(Number.isFinite) && p.s.every(v => Number.isFinite(v) && v>0)));
  const unique = new Set(parts.map(p => [...p.p,...p.s,p.yaw || 0,p.tilt || 0].map(v=>v.toFixed(5)).join("/")));
  assert.equal(unique.size,parts.length,"duplicate solids");
  const bytes = fs.readFileSync(path.resolve(__dirname,"../assets/rajsee-villa.glb"));
  assert.deepEqual(exportModel(RAJSEE_MODEL),bytes,"regenerate the GLB after changing the model");
  assert.equal(bytes.readUInt32LE(8),bytes.length);
  const doc = JSON.parse(bytes.toString("utf8",20,20+bytes.readUInt32LE(12)));
  assert.equal(doc.nodes.filter(n => n.mesh !== undefined).length,parts.length);
  assert.ok(!doc.images && !doc.textures && !doc.samplers);
  for (const index of doc.scenes[0].nodes) {
    const group = doc.nodes[index], expected = parts.filter(p => p.level===group.name);
    assert.equal(group.children.length,expected.length);
    for (const [i,id] of group.children.entries()) {
      const node=doc.nodes[id], p=expected[i], primitive=doc.meshes[node.mesh].primitives[0];
      assert.equal(node.name,p.name);
      assert.deepEqual(Object.keys(primitive.attributes),["POSITION","NORMAL"]);
      assert.equal(doc.materials[primitive.material].name,p.color);
      assert.ok(node.scale.every((v,k)=>near(v,p.s[k])));
      assert.ok(node.translation.every((v,k)=>near(v,p.p[k]+p.s[k]/2)));
      assert.ok((node.rotation || [0,0,0,1]).every((v,k)=>near(v,VillaGeometry.rotation(p)[k])));
    }
  }
});

test("Every face is capped and points outwards", () => {
  for (const shape of Object.values(shapes)) {
    const edges = new Map();
    for (let i=0; i<shape.indices.length; i+=3) {
      const tri=shape.indices.slice(i,i+3).map(index=>shape.positions.slice(3*index,3*index+3));
      const [a,b,c]=tri, u=b.map((v,k)=>v-a[k]), v=c.map((n,k)=>n-a[k]);
      const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      assert.ok(normal.reduce((s,n,k)=>s+n*a[k],0)>0);
      for (let k=0;k<3;k++) {
        const key=[tri[k],tri[(k+1)%3]].map(p=>p.map(v=>v.toFixed(6)).join(",")).sort().join("/");
        edges.set(key,(edges.get(key)||0)+1);
      }
    }
    assert.ok([...edges.values()].every(n=>n===2),"an edge is open or duplicated");
  }
});

test("Floor and roof slabs meet without overlap and leave the planned voids", () => {
  const decks=parts.filter(p=>p.deck);
  for (const [i,a] of decks.entries()) for(const b of decks.slice(i+1)) {
    assert.ok(!overlaps(a,b),a.name+" overlaps "+b.name);
  }
  const deckAt=(x,y,z)=>decks.find(p=>hasPoint(p,x,y,z));
  for (const y of [3.23,6.4]) {
    assert.ok(deckAt(4.74,y,6.4),"court wall has an open roof edge");
    assert.ok(deckAt(8.8,y,14.4),"missing Bedroom 3 return");
    assert.ok(!deckAt(10.9,y,8.1) && !deckAt(10.1,y,9.8),"stair opening obstructed");
    assert.ok(!deckAt(2.8,y,8.1),"court capped");
  }
  assert.ok(deckAt(7.8,3.23,18.97),"uncovered ground-floor rear wall");
  assert.ok(!deckAt(5.65,3.23,8.8) && deckAt(5.65,6.4,8.8),"double-height lounge");
  assert.ok(deckAt(10.2,3.23,14.5) && !deckAt(10.2,6.4,14.5),"covered service terrace");
  assert.ok(deckAt(2.3,3.23,13.3) && !deckAt(2.3,6.4,13.3),"covered Terrace 02");
});

// Slice at the actual box edges. Each grid cell is either solid or air, even for a 1 mm slit.
function outsideAt(level,height) {
  const shell = parts.filter(p => p.level === level && ["wall","interior","door","glass","frame"].includes(p.color)
    && p.p[1] < height && end(p,1) > height);
  const axis = k => [...new Set([-4,25,...shell.flatMap(p=>[p.p[k],end(p,k)]).map(v=>Number(v.toFixed(6)))])].sort((a,b)=>a-b);
  const xs=axis(0), zs=axis(2), width=xs.length-1, heightCells=zs.length-1;
  const cells=new Uint8Array(width*heightCells);
  for(const p of shell) {
    const [left,right,front,rear]=[p.p[0],end(p,0),p.p[2],end(p,2)].map(v=>Number(v.toFixed(6)));
    const start=xs.indexOf(left), stop=xs.indexOf(right);
    for(let z=zs.indexOf(front);z<zs.indexOf(rear);z++) cells.fill(1,z*width+start,z*width+stop);
  }
  const queue=[0]; cells[0]=2;
  for(let i=0;i<queue.length;i++) {
    const k=queue[i], x=k%width, z=Math.floor(k/width);
    for(const [nx,nz] of [[x-1,z],[x+1,z],[x,z-1],[x,z+1]]) {
      const n=nz*width+nx;
      if(nx>=0 && nx<width && nz>=0 && nz<heightCells && !cells[n]) {cells[n]=2;queue.push(n);}
    }
  }
  return (x,z) => cells[(zs.findIndex(v=>v>z)-1)*width + xs.findIndex(v=>v>x)-1]===2;
}
test("Rooms are enclosed while the court and terraces remain open to the outside", () => {
  const exterior = new Set(["Court","Court below","Service terrace","Spiral stair","Terrace 02"]);
  for(const [level,heights] of [["ground",[0.03,0.8,1.4,2.31,2.73,3.10]],["first",[3.34,4.4,5.5,6.22]],["roof-head",[6.55,7.7,8.45]]]) {
    for(const y of heights) {
      const outside=outsideAt(level,y);
      if(level==="roof-head") assert.ok(!outside(10,8),"open stair head at "+y);
      else for(const [name,x,z] of labels[level]) {
        // Low parapets enclose the two terraces below guard height.
        if(level==="first" && exterior.has(name) && y<4.32) continue;
        assert.equal(outside(x,z),exterior.has(name),level+" / "+name+" at "+y+" m");
      }
    }
  }
});

test("Partitions reach the underside of the deck and intentional doors and stairs remain usable", () => {
  for(const name of ["Ground bedroom 1 partition","Ground toilet 1 partition","Ground guest WC front wall","Kitchen stair enclosure (approximate)","Upper stair enclosure by flight"]) {
    const pieces=parts.filter(p=>p.name===name), top=name.startsWith("Upper")?6.3:3.14;
    assert.ok(pieces.length && pieces.every(p=>near(end(p,1),top)),name);
  }
  const lobby=parts.filter(p=>p.name==="Hall to entry lobby wall");
  assert.ok(!lobby.some(p=>hasPoint(p,5.45,1.5,5.5) || hasPoint(p,7.2,1.5,5.5)));
  assert.ok(lobby.some(p=>hasPoint(p,6.3,1.5,5.5)),"missing dividing pier");
  for(const [level,top] of [["ground",3.3],["first",6.46]]) {
    const treads=parts.filter(p=>p.level===level && /Main stair (first|second) flight/.test(p.name));
    assert.equal(treads.length,17);
    assert.ok(near(Math.max(...treads.map(p=>end(p,1))),top));
  }
  const spiral=parts.filter(p=>p.name==="Rear spiral tread");
  assert.equal(spiral.length,18);
  assert.ok(near(end(spiral.at(-1),1),3.3));
  for(const view of ["ground","first"]) {
    const cut=viewParts(parts,view);
    assert.ok(cut.some(p=>p.cutFace));
    assert.ok(!cut.some(p=>p.overhead || p.level==="roof"));
  }
});
