(() => {
  const get = id => document.getElementById(id);
  const model = RAJSEE_MODEL, canvas = get("model");
  const photoDir = "assets/Photos Ansal A 60/";
  const floors = {
    villa: { title: "Whole villa", area: "House & grounds", datum: "0 / 3.30 / 6.46 m",
      copy: "The front garden faces the road. The sunken court runs along the left of the house, and the spiral stair serves the yard at the rear.",
      ref: "Front elevation", image: "reference-front.webp", original: photoDir+"IMG20261103114234.jpg",
      alt: "The villa and front garden photographed from the road in November." },
    ground: { title: "Ground floor", area: "Rooms around the court", datum: "0.00 m",
      copy: "Two openings lead from the front hall into the lobby. The dining area, lounge and Bedroom 1 each face the court. The kitchen opens onto the rear service bay.",
      ref: "Sunken courtyard", image: "reference-court.webp", original: photoDir+"Iphone Wide Side Porch.jpeg",
      alt: "Three sides of the sunken court, with doors and glazing below the open pergola.", plan: "ground" },
    first: { title: "First floor", area: "Landing & terraces", datum: "+3.30 m",
      copy: "The puja recess sits beside the opening over the lounge. Bedroom 3 faces Terrace 02. The study and service room open onto the terrace by the spiral stair.",
      ref: "Upper landing and puja", image: "reference-landing.webp", original: photoDir+"IMG20261103114754.jpg",
      alt: "The puja recess and the guard along the opening above the lounge.", plan: "first" },
    roof: { title: "Roof", area: "Stair head & tank", datum: "+6.46 m",
      copy: "The main stair reaches the roof inside the stair head. The tank sits above it. The parapet follows the stepped outline around the court and terraces.",
      ref: "Roof plan", image: "plan-roof.png", original: photoDir+"Map Ansal A-60.pdf",
      alt: "The roof outline and stair head on the original villa drawing." }
  };
  const angle = get("angle"), boundary = get("boundary"), labels = get("labels");
  let view = "villa", yaw, pitch, zoom, frame = 0, renderer;
  let labelNodes = [];
  function render() {
    frame = 0;
    if (!renderer) return;
    const projection = renderer.draw(yaw,pitch,zoom);
    if (!projection) return;
    get("scale-line").style.width = (2 * projection.scale) + "px";
    const placed = [];
    for (const { element, point } of labelNodes) {
      const [x,y] = projection.project(point);
      element.style.left = x+"px"; element.style.top = y+"px";
      const w = element.offsetWidth/2, h = element.offsetHeight/2;
      const fits = x-w >= 0 && x+w < canvas.clientWidth && y-h >= 0 && y+h < canvas.clientHeight;
      const clear = placed.every(b => Math.abs(x-b.x) > w+b.w+2 || Math.abs(y-b.y) > h+b.h+2);
      element.style.visibility = fits && clear ? "visible" : "hidden";
      if (fits && clear) placed.push({ x, y, w, h });
    }
  }
  function redraw() { if (!frame) frame = requestAnimationFrame(render); }
  function setLabels() {
    const layer = get("room-labels");
    layer.replaceChildren();
    labelNodes = [];
    if (!renderer || !labels.checked || !model.labels[view]) return;
    const height = view === "ground" ? 0.18 : view === "first" ? 3.48 : 10.12;
    for (const [name,x,z] of model.labels[view]) {
      const element = document.createElement("span");
      element.className = "room"; element.textContent = name;
      layer.append(element);
      labelNodes.push({ element, point: [x,height,z] });
    }
  }
  function preset(name) {
    const floorCut = view === "ground" || view === "first";
    const angles = { axon: floorCut ? (canvas.clientWidth < 560 ? [0.22,1.13] : [1.11,0.99]) : [0.79,0.50], plan: [0,Math.PI/2],
      front: [0,0.10], court: [Math.PI/2,0.14], rear: [Math.PI,0.14], neighbour: [-Math.PI/2,0.14] };
    [yaw,pitch] = angles[name];
    angle.value = name; zoom = 1; redraw();
  }
  function setView(next) {
    view = next;
    const info = floors[view], whole = view === "villa";
    for (const b of document.querySelectorAll("[data-view]")) b.setAttribute("aria-pressed", String(b.dataset.view === view));
    get("drawing-title").textContent = info.title; get("area-title").textContent = info.area;
    get("area-copy").textContent = info.copy; get("datum").textContent = info.datum;
    get("datum-label").textContent = whole ? "Floor levels" : "Model level";
    get("ref-kind").textContent = view === "roof" ? "Original drawing" : "Site photograph";
    get("reference-image").src = "assets/"+info.image; get("reference-image").alt = info.alt;
    get("reference-image").classList.toggle("plan-image",view === "roof");
    get("reference-title").textContent = info.ref+" ↗";
    get("photo-link").href = get("reference-title").href = info.original;
    get("plan-link").hidden = view === "roof";
    get("plan-link").href = info.plan ? "assets/plan-"+info.plan+".png" : photoDir+"Map Ansal A-60.pdf";
    get("plan-link").textContent = info.plan ? info.title+" drawing ↗" : "Original plan ↗";
    get("boundary-option").hidden = !renderer || !whole;
    get("labels-option").hidden = !renderer || whole;
    get("fallback").hidden = Boolean(renderer);
    if (!renderer) {
      const fallback = get("fallback").querySelector("img");
      fallback.src = whole ? "assets/existing-villa.png" : "assets/plan-"+view+".png";
      fallback.alt = whole ? "Existing villa reference sheet" : info.title+" drawing";
    }
    renderer?.setView(view,boundary.checked);
    setLabels(); preset("axon");
  }

  function orbit(dx,dy) {
    yaw += dx;
    pitch = Math.min(Math.PI/2, Math.max(0.035,pitch+dy));
    angle.value = "custom"; redraw();
  }
  function magnify(factor) { zoom = Math.max(0.62, Math.min(4, zoom*factor)); redraw(); }
  const pointers = new Map();
  const distance = () => { const [a,b] = pointers.values(); return Math.hypot(a.x-b.x,a.y-b.y); };
  canvas.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId,{ x:event.clientX,y:event.clientY });
  });
  canvas.addEventListener("pointermove", event => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const before = pointers.size === 2 ? distance() : 0;
    pointers.set(event.pointerId,{ x:event.clientX,y:event.clientY });
    if (before > 1) magnify(distance()/before);
    else if (pointers.size === 1) orbit((event.clientX-previous.x)*0.009,(event.clientY-previous.y)*0.007);
  });
  canvas.addEventListener("lostpointercapture", e => pointers.delete(e.pointerId));
  canvas.addEventListener("wheel", e => { e.preventDefault(); magnify(Math.exp(-Math.sign(e.deltaY)*0.1)); },{ passive:false });
  canvas.addEventListener("keydown", e => {
    const actions = { ArrowLeft:()=>orbit(-0.12,0), ArrowRight:()=>orbit(0.12,0),
      ArrowUp:()=>orbit(0,0.09), ArrowDown:()=>orbit(0,-0.09), "+":()=>magnify(1.2), "=":()=>magnify(1.2),
      "-":()=>magnify(1/1.2), Home:()=>preset("axon") };
    if (actions[e.key]) { e.preventDefault(); actions[e.key](); }
  });
  document.querySelector(".views").addEventListener("click", e => { if (e.target.dataset.view) setView(e.target.dataset.view); });
  get("in").onclick = () => magnify(1.2); get("out").onclick = () => magnify(1/1.2);
  get("reset").onclick = () => preset("axon"); angle.onchange = () => preset(angle.value);
  boundary.onchange = () => { renderer?.setView(view,boundary.checked); redraw(); };
  labels.onchange = () => { setLabels(); redraw(); };
  function initialize() {
    try { renderer = createVillaRenderer(canvas,model); } catch (error) { console.error(error); renderer = null; }
    updateRenderer();
  }
  function updateRenderer() {
    canvas.hidden = !renderer;
    for (const el of document.querySelectorAll(".angle,.scale,.tools,.orbit-help")) el.hidden = !renderer;
    setView(view);
  }
  canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); renderer = null; updateRenderer(); });
  canvas.addEventListener("webglcontextrestored", initialize);
  new ResizeObserver(redraw).observe(canvas);
  initialize();
})();
