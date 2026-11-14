// Dimensions are metres. X runs from the side road to the neighbour, Z from front to rear.
// A box starts at its minimum corner. Window and door openings are spans along a wall.
globalThis.RAJSEE_MODEL = (() => {
  const parts = [];
  function floor(level) {
    function box(name, color, p, s, options = {}) {
      parts.push({ name, level, color, p, s, ...options });
    }
    function copies(name, color, origins, size) {
      for (const origin of origins) box(name, color, origin, size);
    }
    function row(name, color, origin, size, step, count) {
      for (let i = 0; i < count; i++) {
        box(name, color, origin.map((v, axis) => v + i * step[axis]), size);
      }
    }
    // span is the wall's lengthwise range. An opening is [start, end, sill, head].
    function wall(name, color, axis, centre, span, height, thickness, openings = []) {
      function section(start, end, bottom, top) {
        if (end - start < 0.00001 || top - bottom < 0.00001) return;
        const edge = centre - thickness / 2;
        if (axis === "x") box(name, color, [start, bottom, edge], [end - start, top - bottom, thickness]);
        else box(name, color, [edge, bottom, start], [thickness, top - bottom, end - start]);
      }
      let cursor = span[0];
      const [base, top] = height;
      for (const [start, end, sill, head] of openings) {
        section(cursor, start, base, top);
        section(start, end, base, sill);
        section(start, end, head, top);
        cursor = end;
      }
      section(cursor, span[1], base, top);
    }
    return { box, copies, row, wall };
  }

  const ground = floor("ground"), first = floor("first"), roof = floor("roof");
  const site = floor("site"), boundary = floor("boundary"), facade = floor("facade");
  const roofHead = floor("roof-head"), spiral = floor("spiral");

  // Plan rectangles use [left, front, right, rear]. Bands include the exterior wall thickness.
  const groundPlan = [
    [6.245, -0.08, 11.825, 1.17], [1.175, 1.17, 11.825, 5.575],
    [4.67, 5.575, 11.825, 10.3], [-0.02, 10.3, 11.825, 14.955],
    [1.945, 14.955, 11.825, 16.95], [1.945, 16.95, 8.45, 19.08]
  ];
  const upperPlan = [
    [8.42, -0.08, 11.825, 1.05], [1.175, 1.05, 11.825, 5.455],
    [4.67, 5.455, 11.825, 10.375], [4.8, 10.375, 11.825, 13.655],
    [4.8, 13.655, 9.195, 14.795], [1.945, 14.795, 9.195, 15.955],
    [1.945, 15.955, 8.58, 18.85], [1.945, 18.85, 4.955, 19.08]
  ];
  // These rectangles are the clear headroom for the two turning stair flights.
  const stairWell = [[10.55, 7.41, 11.53, 9.25], [9.5, 9.25, 11.53, 10.23]];
  const loungeVoid = [4.83, 7.24, 6.385, 10.375];

  // Trim a deck at a stairwell, an open edge or a previously laid slab.
  function subtract(rect, cut) {
    const [x, z, right, rear] = rect;
    const left = Math.max(x, cut[0]), front = Math.max(z, cut[1]);
    const end = Math.min(right, cut[2]), back = Math.min(rear, cut[3]);
    if (end - left < 0.00001 || back - front < 0.00001) return [rect];
    return [[x,z,right,front], [x,back,right,rear], [x,front,left,back], [end,front,right,back]]
      .filter(([x0,z0,x1,z1]) => x1 - x0 > 0.00001 && z1 - z0 > 0.00001);
  }
  function deckBuilder(level, top, holes = []) {
    const occupied = [...holes];
    return (name, color, rectangles, thickness = 0.16) => {
      for (const rect of rectangles) {
        const tiles = occupied.reduce((tiles, cut) => tiles.flatMap(tile => subtract(tile, cut)), [rect]);
        for (const [x,z,right,rear] of tiles) {
          level.box(name, color, [x, top - thickness, z], [right - x, thickness, rear - z], { deck: true });
        }
        occupied.push(rect);
      }
    };
  }
  const groundDeck = deckBuilder(ground, 0);
  groundDeck("Ground floor slab", "floor", groundPlan);
  groundDeck("Court inner walkway", "paving", [[3.81,5.5,4.75,10.375]], 0.33);
  groundDeck("Court dining-side walkway", "paving", [[1.18,5.5,3.81,6.69]], 0.33);
  groundDeck("Court bedroom threshold", "paving", [[1.12,10.29,3.81,10.375]], 0.33);
  const upperDeck = deckBuilder(first, 3.3, [...stairWell, loungeVoid]);
  upperDeck("First floor slab", "floor", upperPlan);
  upperDeck("Terrace 02", "terrace", [[-0.08,10.125,4.875,14.955]]);
  upperDeck("Service terrace", "terrace", [[8.5,13.575,11.825,16.95]]);
  upperDeck("Rear stair landing", "terrace", [[9.875,16.95,11.325,17.375]]);
  upperDeck("Front balcony slab", "terrace", [[4.625,-0.2,8.5,1.125]]);
  upperDeck("Roof over ground-floor setbacks", "terrace", groundPlan);
  deckBuilder(roof, 6.46, stairWell)("Roof slab", "roof", upperPlan);

  function mainStair(level, base, top) {
    const rise = (top - base) / 17;
    for (let i = 0; i < 17; i++) {
      const tread = base + rise * (i + 1);
      const depth = Math.min(tread - base, i < 9 ? 0.29 : 0.25);
      if (i < 9) level.box("Main stair first flight", "stair", [8.48 + i * 0.23, tread - depth, 9.26], [0.23, depth, 0.92]);
      else level.box("Main stair second flight", "stair", [10.57, tread - depth, 9.02 - (i - 9) * 0.23], [0.93, depth, 0.23]);
    }
    level.box("Main stair landing", "stair", [10.55, base + 9 * rise - 0.29, 9.26], [1, 0.29, 0.92]);
  }
  mainStair(ground, 0, 3.3);
  mainStair(first, 3.3, 6.46);

  function rearSpiral() {
    const cx = 10.825, cz = 17.875, steps = 18;
    spiral.box("Rear spiral centre pole", "metal", [cx - 0.055, 0, cz - 0.055], [0.11, 4, 0.11]);
    let previous;
    for (let i = 0; i < steps; i++) {
      const angle = 0.65 - i * 1.75 * Math.PI / (steps - 1);
      const y = i * (3.3 - 0.055) / (steps - 1);
      const x = Math.cos(angle), z = -Math.sin(angle);
      spiral.box("Rear spiral tread", "stair", [cx + 0.405*x - 0.415, y, cz + 0.405*z - 0.105],
        [0.83, 0.055, 0.21], { yaw: angle });
      const rail = [cx + 0.747*x, y + 0.95, cz + 0.747*z];
      if (i % 2 === 0 || i === steps - 1) {
        spiral.box("Rear spiral railing post", "metal", [rail[0] - 0.023, y, rail[2] - 0.023], [0.046, 0.95, 0.046]);
      }
      if (previous) {
        const [dx,dy,dz] = rail.map((v,k) => v - previous[k]);
        const length = Math.hypot(dx,dy,dz);
        const mid = rail.map((v,k) => (v + previous[k]) / 2);
        spiral.box("Rear spiral handrail", "metal", [mid[0]-length/2, mid[1]-0.024, mid[2]-0.024],
          [length,0.048,0.048], { yaw: Math.atan2(-dz,dx), tilt: Math.asin(dy/length) });
      }
      previous = rail;
    }
  }
  rearSpiral();

  // Ground floor, court and kitchen.
  ground.wall("Front hall wall", "wall", "x", 1.25, [1.25, 6.325], [0, 3.14], 0.16, [[1.475, 5.5898, 0, 2.5908]]);
  ground.wall("Front drawing wall", "wall", "x", 0, [6.325, 11.75], [0, 3.14], 0.16, [[9.3, 11.05, 0, 2.35]]);
  ground.wall("Front step in wall", "wall", "z", 6.325, [0, 1.25], [0, 3.14], 0.16);
  ground.wall("Bedroom garden wall", "wall", "z", 0.61, [10.375, 14.875], [0, 3.14], 0.16, [[12.875, 14.25, 0.75, 2.35]]);
  ground.wall("Bedroom side return", "wall", "x", 14.875, [0.61, 2.025], [0, 3.14], 0.16);
  ground.wall("Bathroom outer wall", "wall", "z", 2.025, [14.875, 19], [0, 3.14], 0.16, [[15.8, 16.55, 1.5, 2.25], [17.675, 18.425, 1.5, 2.25]]);
  ground.box("Bedroom side window glass", "glass", [0.575, 0.75, 12.875], [0.07, 1.6, 1.375]);
  ground.row("Bedroom side window frame", "frame", [0.555, 0.75, 12.85], [0.11, 1.6, 0.05], [0, 0, 0.6875], 3);
  ground.copies("Bedroom side window horizontal frame", "frame", [[0.555, 0.728, 12.875], [0.555, 2.328, 12.875], [0.555, 1.928, 12.875]], [0.11, 0.044, 1.375]);
  ground.box("Rear bathroom light 1 glass", "glass", [1.99, 1.5, 17.675], [0.07, 0.75, 0.75]);
  ground.row("Rear bathroom light 1 frame", "frame", [1.97, 1.5, 17.65], [0.11, 0.75, 0.05], [0, 0, 0.375], 3);
  ground.copies("Rear bathroom light 1 horizontal frame", "frame", [[1.97, 1.478, 17.675], [1.97, 2.228, 17.675], [1.97, 1.828, 17.675]], [0.11, 0.044, 0.75]);
  ground.box("Rear bathroom light 2 glass", "glass", [1.99, 1.5, 15.8], [0.07, 0.75, 0.75]);
  ground.row("Rear bathroom light 2 frame", "frame", [1.97, 1.5, 15.775], [0.11, 0.75, 0.05], [0, 0, 0.375], 3);
  ground.copies("Rear bathroom light 2 horizontal frame", "frame", [[1.97, 1.478, 15.8], [1.97, 2.228, 15.8], [1.97, 1.828, 15.8]], [0.11, 0.044, 0.75]);
  ground.box("Existing front glazing", "glass", [1.475, 0, 1.115], [3.0226, 2.1336, 0.06]);
  ground.box("Existing front door", "door", [4.4976, 0, 1.115], [1.0922, 2.1336, 0.06]);
  ground.box("Existing front transom", "glass", [1.475, 2.1336, 1.115], [4.1148, 0.4572, 0.06]);
  ground.copies("Existing front upright", "frame", [[1.45875, 0, 1.1], [2.38375, 0, 1.1], [3.55875, 0, 1.1], [4.48135, 0, 1.1], [5.57355, 0, 1.1]], [0.0325, 2.5908, 0.09]);
  ground.copies("Existing front rail", "frame", [[1.475, -0.025, 1.1], [1.475, 0.745, 1.1], [1.475, 2.1086, 1.1], [1.475, 2.5658, 1.1]], [4.1148, 0.05, 0.09]);
  ground.box("Existing right door", "door", [10, 0, -0.135], [1.05, 1.95, 0.06]);
  ground.box("Existing right sidelight", "glass", [9.3, 0, -0.135], [0.7, 1.95, 0.06]);
  ground.box("Existing right transom", "glass", [9.3, 1.95, -0.135], [1.75, 0.4, 0.06]);
  ground.copies("Right opening frame", "frame", [[9.2825, 0, -0.15], [9.9825, 0, -0.15], [11.0325, 0, -0.15]], [0.035, 2.35, 0.09]);
  ground.copies("Right opening frame rail", "frame", [[9.3, 1.925, -0.15], [9.3, 2.325, -0.15]], [1.75, 0.05, 0.09]);
  ground.wall("Ground bedroom 1 partition", "interior", "z", 4.75, [10.375, 14.875], [0, 3.14], 0.11, [[10.95, 11.875, 0, 2.15]]);
  ground.wall("Ground toilet 1 partition", "interior", "x", 14.875, [2.025, 4.75], [0, 3.14], 0.11, [[3, 3.875, 0, 2.15]]);
  ground.wall("Ground guest WC front wall", "interior", "x", 5.5, [8.375, 11.75], [0, 3.14], 0.11);
  ground.wall("Courtyard back wall", "wall", "z", 4.75, [5.5, 10.375], [0, 3.14], 0.16, [[6, 6.925, 0, 2.35], [7.675, 9.875, 0.15, 2.45]]);
  ground.box("Ground courtyard large window glazing", "glass", [4.715, 0.15, 7.675], [0.07, 2.3, 2.2]);
  ground.copies("Ground courtyard large window frame", "frame", [[4.69, 0.15, 7.652], [4.69, 0.15, 8.202], [4.69, 0.15, 9.302], [4.69, 0.15, 9.852]], [0.12, 2.3, 0.046]);
  ground.copies("Ground courtyard large window frame", "frame", [[4.69, 0.125, 7.675], [4.69, 0.815, 7.675], [4.69, 2.025, 7.675], [4.69, 2.425, 7.675]], [0.12, 0.05, 2.2]);
  ground.box("Ground courtyard side door", "door", [4.69, 0, 6], [0.12, 2.1, 0.925]);
  ground.box("Courtyard door upper glass glazing", "glass", [4.715, 2.1, 6], [0.07, 0.25, 0.925]);
  ground.wall("Kitchen stair enclosure (approximate)", "interior", "x", 10.375, [8.375, 11.75], [0, 3.14], 0.11);
  ground.wall("Rear service side wall", "wall", "z", 8.37, [16.95, 19], [0, 3.14], 0.16, [[17.32, 18.3, 0.8, 2.35]]);
  ground.box("Rear service side window", "glass", [8.33, 0.8, 17.32], [0.07, 1.55, 0.98]);
  ground.copies("Rear service side window upright", "frame", [[8.31, 0.8, 17.3], [8.31, 0.8, 17.77], [8.31, 0.8, 18.28]], [0.11, 1.55, 0.045]);
  ground.copies("Rear service side window rail", "frame", [[8.31, 0.78, 17.32], [8.31, 2.33, 17.32]], [0.11, 0.045, 0.98]);
  ground.wall("Dining side wall", "wall", "z", 1.25, [1.25, 5.5], [0, 3.14], 0.15, [[1.34, 1.72, 0, 2.54]]);
  ground.box("Dining narrow corner light glazing", "glass", [1.228, 0, 1.34], [0.044, 2.54, 0.38]);
  ground.copies("Dining narrow corner light jamb or mullion", "frame", [[1.1985, 0, 1.314], [1.1985, 0, 1.694]], [0.103, 2.54, 0.052]);
  ground.copies("Dining narrow corner light crossbar", "frame", [[1.1985, 0.001, 1.34], [1.1985, 2.078, 1.34], [1.1985, 2.495, 1.34]], [0.103, 0.044, 0.38]);
  ground.wall("Neighbour side wall", "wall", "z", 11.75, [0, 16.95], [0, 3.14], 0.15);
  ground.wall("Hall to entry lobby wall", "interior", "x", 5.5, [4.75, 8.375], [0, 3.14], 0.15, [[4.93, 5.95, 0, 2.19], [6.77, 7.7, 0, 2.19]]);
  ground.box("Dining soffit", "ceiling", [1.325, 3.048, 1.33], [5, 0.092, 4.095], { overhead: true });
  ground.box("Drawing soffit", "ceiling", [6.405, 2.8956, 0.08], [5.27, 0.2444, 1.25], { overhead: true });
  ground.box("Drawing soffit", "ceiling", [6.325, 2.8956, 1.33], [5.35, 0.2444, 4.095], { overhead: true });
  ground.wall("Court facing dining", "wall", "x", 5.5, [1.25, 4.75], [0, 3.14], 0.15, [[1.58, 4.56, 0.025, 2.64]]);
  ground.box("Dining glazed court opening glazing", "glass", [1.58, 0.025, 5.478], [2.98, 2.615, 0.044]);
  ground.copies("Dining glazed court opening jamb or mullion", "frame", [[1.554, 0.025, 5.4485], [2.034, 0.025, 5.4485], [4.094, 0.025, 5.4485], [4.534, 0.025, 5.4485]], [0.052, 2.615, 0.103]);
  ground.copies("Dining glazed court opening crossbar", "frame", [[1.58, 0.026, 5.4485], [1.58, 2.078, 5.4485], [1.58, 2.595, 5.4485]], [2.98, 0.044, 0.103]);
  ground.wall("Bedroom court wall", "wall", "x", 10.375, [0, 4.75], [0, 3.14], 0.15, [[2.94, 4.6, 0, 2.54]]);
  ground.box("Bedroom 1 court entry glazing", "glass", [2.94, 0, 10.353], [0.7, 2.54, 0.044]);
  ground.box("Bedroom 1 court entry door", "door", [3.64, 0, 10.35], [0.96, 2.03, 0.05]);
  ground.box("Bedroom 1 court entry transom", "glass", [3.64, 2.03, 10.353], [0.96, 0.51, 0.044]);
  ground.copies("Bedroom 1 court entry jamb or mullion", "frame", [[2.914, 0, 10.3235], [3.614, 0, 10.3235], [4.574, 0, 10.3235]], [0.052, 2.54, 0.103]);
  ground.copies("Bedroom 1 court entry crossbar", "frame", [[2.94, 0.001, 10.3235], [2.94, 2.008, 10.3235], [2.94, 2.495, 10.3235]], [1.66, 0.044, 0.103]);
  ground.box("Bedroom 1 court entry crossbar", "frame", [2.94, 0.528, 10.3235], [0.7, 0.044, 0.103]);
  ground.box("Courtyard sunken bed", "court", [1.12, -0.37, 6.69], [2.69, 0.055, 3.6]);
  ground.box("Court approach step", "trim", [0.55, -0.4, 5.5], [0.31, 0.13, 1.19]);
  ground.box("Court approach step", "trim", [0.86, -0.4, 5.5], [0.32, 0.26, 1.19]);
  ground.wall("Lobby wall by WC, small room, stair and kitchen", "interior", "z", 8.375, [5.5, 15.375], [0, 3.14], 0.15, [[5.97, 6.83, 0, 2.12], [7.56, 8.43, 0, 2.12], [9.23, 10.21, 0, 2.7], [10.53, 11.48, 0, 2.14], [11.82, 12.66, 0.84, 2.03]]);
  ground.wall("Small room front wall", "interior", "x", 7.17, [8.375, 10.36], [0, 3.14], 0.15);
  ground.wall("WC wall and under-stair store door", "interior", "x", 7.17, [10.36, 11.75], [0, 3.14], 0.15, [[10.71, 11.46, 0, 1.91]]);
  ground.wall("Small room rear and inner stair enclosure", "interior", "x", 9.14, [8.375, 10.54], [0, 3.14], 0.15);
  ground.wall("Small room end wall", "interior", "z", 10.36, [7.17, 9.14], [0, 3.14], 0.15);
  ground.box("Kitchen serving sill", "counter", [8.24, 0.8, 11.79], [0.27, 0.06, 0.9]);
  ground.box("Kitchen base cabinets", "cabinet", [11.13, 0, 10.55], [0.52, 0.785, 4.72]);
  ground.box("Kitchen base cabinets", "cabinet", [8.46, 0, 12.8], [0.49, 0.785, 2.47]);
  ground.box("Kitchen worktop", "counter", [11.105, 0.785, 10.55], [0.57, 0.065, 4.72]);
  ground.box("Kitchen worktop", "counter", [8.435, 0.785, 12.8], [0.54, 0.065, 2.47]);
  ground.box("Kitchen sink rim", "steel", [11.15, 0.85, 14.23], [0.44, 0.018, 0.75]);
  ground.box("Kitchen sink bowl", "counter", [11.19, 0.868, 14.3], [0.36, 0.01, 0.61]);
  ground.wall("Kitchen rear access", "interior", "x", 15.375, [8.375, 11.75], [0, 3.14], 0.15, [[8.9, 9.52, 0.78, 2.4], [9.54, 10.46, 0, 2.4], [10.47, 11.15, 0.78, 2.4]]);
  ground.box("Kitchen rear light left glazing", "glass", [8.9, 0.78, 15.353], [0.62, 1.62, 0.044]);
  ground.copies("Kitchen rear light left jamb or mullion", "frame", [[8.874, 0.78, 15.3235], [9.494, 0.78, 15.3235]], [0.052, 1.62, 0.103]);
  ground.copies("Kitchen rear light left crossbar", "frame", [[8.9, 0.781, 15.3235], [8.9, 1.998, 15.3235], [8.9, 2.355, 15.3235]], [0.62, 0.044, 0.103]);
  ground.box("Kitchen door toward service bay door", "door", [9.54, 0, 15.35], [0.92, 2.02, 0.05]);
  ground.box("Kitchen door toward service bay transom", "glass", [9.54, 2.02, 15.353], [0.92, 0.38, 0.044]);
  ground.copies("Kitchen door toward service bay jamb or mullion", "frame", [[9.514, 0, 15.3235], [10.434, 0, 15.3235]], [0.052, 2.4, 0.103]);
  ground.copies("Kitchen door toward service bay crossbar", "frame", [[9.54, 0.001, 15.3235], [9.54, 1.998, 15.3235], [9.54, 2.355, 15.3235]], [0.92, 0.044, 0.103]);
  ground.box("Kitchen rear light right glazing", "glass", [10.47, 0.78, 15.353], [0.68, 1.62, 0.044]);
  ground.copies("Kitchen rear light right jamb or mullion", "frame", [[10.444, 0.78, 15.3235], [11.124, 0.78, 15.3235]], [0.052, 1.62, 0.103]);
  ground.copies("Kitchen rear light right crossbar", "frame", [[10.47, 0.781, 15.3235], [10.47, 1.998, 15.3235], [10.47, 2.355, 15.3235]], [0.68, 0.044, 0.103]);
  ground.wall("Bedroom 2 utility-side wall", "wall", "z", 8.375, [15.375, 16.95], [0, 3.14], 0.15);
  ground.wall("Bedroom 2 lobby wall", "interior", "x", 13.17, [4.75, 8.375], [0, 3.14], 0.15, [[4.86, 5.71, 0, 2.14]]);
  ground.wall("Ground bathroom dividing wall", "interior", "x", 16.86, [2.025, 4.75], [0, 3.14], 0.15);
  ground.wall("Bedroom 2 bathroom wall", "interior", "z", 4.75, [14.875, 19], [0, 3.14], 0.15, [[17.34, 18.13, 0, 2.1]]);
  ground.wall("Rear solid exterior wall", "wall", "x", 19, [2.025, 8.375], [0, 3.14], 0.16, [[7.12, 8.375, 0, 2.66]]);
  ground.wall("Rear entry recess wall", "wall", "x", 18.56, [7.12, 8.375], [0, 2.7], 0.15, [[7.3, 8.19, 0, 2.4]]);
  ground.wall("Rear entry recess cheek", "wall", "z", 7.12, [18.56, 19], [0, 2.66], 0.13);
  ground.box("Rear entry recess hood", "wall", [7.1, 2.64, 18.48], [1.33, 0.18, 0.64]);
  ground.box("Rear screened bedroom entrance door", "door", [7.3, 0, 18.535], [0.89, 2.02, 0.05]);
  ground.box("Rear screened bedroom entrance transom", "glass", [7.3, 2.02, 18.538], [0.89, 0.38, 0.044]);
  ground.copies("Rear screened bedroom entrance jamb or mullion", "frame", [[7.274, 0, 18.5085], [8.164, 0, 18.5085]], [0.052, 2.4, 0.103]);
  ground.copies("Rear screened bedroom entrance crossbar", "frame", [[7.3, 0.001, 18.5085], [7.3, 1.998, 18.5085], [7.3, 2.355, 18.5085]], [0.89, 0.044, 0.103]);
  ground.row("Rear bamboo screen slat", "bamboo", [7.33, 0.07, 18.612], [0.055, 1.89, 0.034], [0.081, 0, 0], 11);
  ground.copies("Rear screen crosspiece", "bamboo", [[7.33, 0.16, 18.647], [7.33, 0.91, 18.647], [7.33, 1.78, 18.647]], [0.87, 0.048, 0.04]);
  ground.box("Bedroom 1 projecting court-side pier", "wall", [-0.02, 0, 10.36], [0.63, 3.14, 1.54]);
  ground.box("Bedroom 1 road-side overhang", "wall", [0.02, 2.81, 11.9], [0.51, 0.33, 2.97]);
  ground.copies("Courtyard door transom jamb", "frame", [[4.69,2.1,5.977], [4.69,2.1,6.902]], [0.12,0.25,0.046]);
  ground.row("Courtyard door transom rail", "frame", [4.69,2.08,6], [0.12,0.04,0.925], [0,0.25,0], 2);

  // First floor, landing and terraces.
  first.wall("First floor front bathroom wall", "wall", "x", 0, [8.5, 11.75], [3.3, 6.3], 0.16, [[9.25, 11, 4.15, 5.65]]);
  first.wall("First floor front step wall", "wall", "z", 8.5, [0, 1.125], [3.3, 6.3], 0.16);
  first.wall("First floor rear bathroom wall", "wall", "z", 2.025, [14.875, 19], [3.3, 6.3], 0.16, [[15.75, 16.5, 4.8, 5.6], [17.75, 18.5, 4.8, 5.6]]);
  first.row("Front balcony railing post", "metal", [4.707, 3.3, -0.27], [0.036, 0.92, 0.04], [0.625, 0, 0], 7);
  first.copies("Front balcony railing", "metal", [[4.625, 3.332, -0.27], [4.625, 3.632, -0.27], [4.625, 3.932, -0.27], [4.625, 4.202, -0.27]], [3.875, 0.036, 0.04]);
  first.copies("Balcony side railing", "metal", [[4.605, 3.332, -0.25], [4.605, 3.632, -0.25], [4.605, 3.932, -0.25], [4.605, 4.202, -0.25]], [0.04, 0.036, 1.375]);
  first.box("Front balcony fascia", "red", [4.625, 3.08, -0.33], [3.875, 0.22, 0.13]);
  first.box("Upper front right window glass", "glass", [9.25, 4.15, -0.035], [1.75, 1.5, 0.07]);
  first.row("Upper front right window frame", "frame", [9.225, 4.15, -0.055], [0.05, 1.5, 0.11], [0.875, 0, 0], 3);
  first.copies("Upper front right window horizontal frame", "frame", [[9.25, 4.128, -0.055], [9.25, 5.628, -0.055], [9.25, 5.178, -0.055]], [1.75, 0.044, 0.11]);
  first.box("Upper rear bathroom light 1 glass", "glass", [1.99, 4.8, 17.75], [0.07, 0.8, 0.75]);
  first.row("Upper rear bathroom light 1 frame", "frame", [1.97, 4.8, 17.725], [0.11, 0.8, 0.05], [0, 0, 0.375], 3);
  first.copies("Upper rear bathroom light 1 horizontal frame", "frame", [[1.97, 4.778, 17.75], [1.97, 5.578, 17.75], [1.97, 5.178, 17.75]], [0.11, 0.044, 0.75]);
  first.box("Upper rear bathroom light 2 glass", "glass", [1.99, 4.8, 15.75], [0.07, 0.8, 0.75]);
  first.row("Upper rear bathroom light 2 frame", "frame", [1.97, 4.8, 15.725], [0.11, 0.8, 0.05], [0, 0, 0.375], 3);
  first.copies("Upper rear bathroom light 2 horizontal frame", "frame", [[1.97, 4.778, 15.75], [1.97, 5.578, 15.75], [1.97, 5.178, 15.75]], [0.11, 0.044, 0.75]);
  first.box("Upper front accent frame left", "red", [9, 3.78, -0.43], [0.2, 1.57, 0.57]);
  first.box("Upper front accent frame right", "red", [10.95, 3.78, -0.43], [0.2, 1.57, 0.57]);
  first.box("Upper front accent sill", "red", [9, 3.55, -0.43], [2.15, 0.23, 0.57]);
  first.box("Upper front accent canopy", "red", [9, 5.35, -0.43], [2.15, 0.2, 0.57]);
  first.wall("Master dressing partition", "interior", "z", 8.5, [1.125, 5.375], [3.3, 6.3], 0.11, [[4, 5, 3.3, 5.45]]);
  first.wall("Dressing bathroom partition", "interior", "x", 3.25, [8.5, 11.75], [3.3, 6.3], 0.11, [[9.625, 10.55, 3.3, 5.45]]);
  first.wall("First bathroom inner partition", "interior", "z", 4.875, [14.955, 18.69], [3.3, 6.3], 0.11, [[15.25, 16.075, 3.3, 5.45], [17.3, 18.125, 3.3, 5.45]]);
  first.wall("Upper courtyard back wall", "wall", "z", 4.75, [5.375, 10.375], [3.3, 6.3], 0.16, [[6.125, 6.875, 4.42, 5.95], [7.75, 9.875, 4.1, 5.95]]);
  first.box("Upper courtyard large window glazing", "glass", [4.715, 4.1, 7.75], [0.07, 1.85, 2.125]);
  first.copies("Upper courtyard large window frame", "frame", [[4.69, 4.1, 7.727], [4.69, 4.1, 8.25825], [4.69, 4.1, 9.32075], [4.69, 4.1, 9.852]], [0.12, 1.85, 0.046]);
  first.copies("Upper courtyard large window frame", "frame", [[4.69, 4.075, 7.75], [4.69, 4.63, 7.75], [4.69, 5.525, 7.75], [4.69, 5.925, 7.75]], [0.12, 0.05, 2.125]);
  first.box("Upper courtyard small window glazing", "glass", [4.715, 4.42, 6.125], [0.07, 1.53, 0.75]);
  first.copies("Upper courtyard small window frame", "frame", [[4.69, 4.42, 6.102], [4.69, 4.42, 6.2895], [4.69, 4.42, 6.6645], [4.69, 4.42, 6.852]], [0.12, 1.53, 0.046]);
  first.copies("Upper courtyard small window frame", "frame", [[4.69, 4.395, 6.125], [4.69, 4.854, 6.125], [4.69, 5.525, 6.125], [4.69, 5.925, 6.125]], [0.12, 0.05, 0.75]);
  first.wall("Rear bathroom stacked outer wall", "wall", "x", 14.875, [2.025, 4.875], [3.3, 6.3], 0.16);
  first.wall("Small terrace end parapet", "wall", "x", 14.875, [0, 2.025], [3.3, 4.2], 0.16);
  first.wall("Study wall with terrace door", "wall", "x", 13.575, [8.5, 11.75], [3.3, 6.3], 0.16, [[9.675, 10.575, 3.3, 5.45]]);
  first.box("Study door to service terrace", "door", [9.675, 3.3, 13.52], [0.9, 2.15, 0.11]);
  first.copies("Study terrace door frame", "frame", [[9.65, 3.3, 13.5], [10.55, 3.3, 13.5]], [0.05, 2.18, 0.15]);
  first.box("Study terrace door lintel", "frame", [9.675, 5.43, 13.5], [0.9, 0.05, 0.15]);
  first.wall("Servant room terrace wall", "wall", "z", 8.5, [15.875, 18.77], [3.3, 6.3], 0.16, [[16, 16.875, 3.3, 5.45], [17.15, 18.45, 4.1, 5.75]]);
  first.box("Servant room door to terrace", "door", [8.445, 3.3, 16], [0.11, 2.15, 0.875]);
  first.wall("Servant room south wall", "interior", "x", 15.875, [4.875, 8.5], [3.3, 6.3], 0.16);
  first.copies("Lounge railing along opening (approximate)", "rail", [[6.36, 3.61, 7.24], [6.36, 3.91, 7.24], [6.36, 4.2, 7.24]], [0.05, 0.04, 3.135]);
  first.copies("Lounge railing return (approximate)", "rail", [[4.83, 3.61, 10.35], [4.83, 3.91, 10.35], [4.83, 4.2, 10.35]], [1.555, 0.04, 0.05]);
  first.copies("Lounge railing post (approximate)", "rail", [[6.35, 3.3, 7.24], [6.35, 3.3, 8.02], [6.35, 3.3, 8.8], [6.35, 3.3, 9.58], [6.35, 3.3, 10.335]], [0.07, 0.94, 0.07]);
  first.copies("Lounge railing return post (approximate)", "rail", [[4.875, 3.3, 10.34], [5.625, 3.3, 10.34]], [0.07, 0.94, 0.07]);
  first.wall("Rear solid exterior wall", "wall", "x", 19, [2.025, 4.875], [3.3, 6.3], 0.16);
  first.box("Servant terrace window", "glass", [8.465, 4.1, 17.15], [0.07, 1.65, 1.3]);
  first.row("Servant terrace window upright", "frame", [8.44, 4.1, 17.13], [0.11, 1.65, 0.045], [0, 0, 0.65], 3);
  first.copies("Servant terrace window rail", "frame", [[8.44, 4.08, 17.15], [8.44, 5.73, 17.15]], [0.11, 0.045, 1.3]);
  first.box("First terrace projecting planter", "cream", [-0.4, 3.86, 10.125], [0.32, 0.38, 1.66]);
  first.wall("First floor neighbour wall", "wall", "z", 11.75, [0, 13.575], [3.3, 6.3], 0.15);
  first.wall("First floor front master wall", "wall", "x", 1.125, [1.25, 8.5], [3.3, 6.3], 0.15, [[4.65, 5.78, 3.35, 5.74], [6.04, 8.07, 3.3, 5.74]]);
  first.box("Master front window group glazing", "glass", [4.65, 3.35, 1.103], [1.13, 2.39, 0.044]);
  first.copies("Master front window group jamb or mullion", "frame", [[4.624, 3.35, 1.0735], [5.204, 3.35, 1.0735], [5.754, 3.35, 1.0735]], [0.052, 2.39, 0.103]);
  first.copies("Master front window group crossbar", "frame", [[4.65, 3.351, 1.0735], [4.65, 3.878, 1.0735], [4.65, 5.198, 1.0735], [4.65, 5.695, 1.0735]], [1.13, 0.044, 0.103]);
  first.box("Master balcony access glazing", "glass", [6.04, 3.3, 1.103], [1.14, 2.44, 0.044]);
  first.box("Master balcony access door", "door", [7.18, 3.3, 1.1], [0.89, 1.92, 0.05]);
  first.box("Master balcony access transom", "glass", [7.18, 5.22, 1.103], [0.89, 0.52, 0.044]);
  first.copies("Master balcony access jamb or mullion", "frame", [[6.014, 3.3, 1.0735], [6.574, 3.3, 1.0735], [7.154, 3.3, 1.0735], [8.044, 3.3, 1.0735]], [0.052, 2.44, 0.103]);
  first.copies("Master balcony access crossbar", "frame", [[6.04, 3.301, 1.0735], [6.04, 5.198, 1.0735], [6.04, 5.695, 1.0735]], [2.03, 0.044, 0.103]);
  first.box("Master balcony access crossbar", "frame", [6.04, 3.878, 1.0735], [1.14, 0.044, 0.103]);
  first.wall("First floor master side wall", "wall", "z", 1.25, [1.125, 5.375], [3.3, 6.3], 0.15, [[1.34, 1.72, 3.36, 5.81], [2.76, 4.84, 4, 5.68]]);
  first.box("Master side corner light glazing", "glass", [1.228, 3.36, 1.34], [0.044, 2.45, 0.38]);
  first.copies("Master side corner light jamb or mullion", "frame", [[1.1985, 3.36, 1.314], [1.1985, 3.36, 1.694]], [0.103, 2.45, 0.052]);
  first.copies("Master side corner light crossbar", "frame", [[1.1985, 3.361, 1.34], [1.1985, 5.238, 1.34], [1.1985, 5.765, 1.34]], [0.103, 0.044, 0.38]);
  first.box("Master side ribbon window glazing", "glass", [1.228, 4, 2.76], [0.044, 1.68, 2.08]);
  first.copies("Master side ribbon window jamb or mullion", "frame", [[1.1985, 4, 2.734], [1.1985, 4, 4.814]], [0.103, 1.68, 0.052]);
  first.copies("Master side ribbon window crossbar", "frame", [[1.1985, 4.001, 2.76], [1.1985, 4.418, 2.76], [1.1985, 4.888, 2.76], [1.1985, 5.278, 2.76], [1.1985, 5.635, 2.76]], [0.103, 0.044, 2.08]);
  first.box("Master staggered casement bars", "frame", [1.1975, 4, 3.917], [0.105, 0.45, 0.066]);
  first.box("Master staggered casement bars", "frame", [1.1975, 4.45, 3.327], [0.105, 0.46, 0.066]);
  first.box("Master staggered casement bars", "frame", [1.1975, 4.91, 4.077], [0.105, 0.39, 0.066]);
  first.box("Master staggered casement bars", "frame", [1.1975, 5.3, 3.527], [0.105, 0.38, 0.066]);
  first.wall("Master wall toward court", "wall", "x", 5.375, [1.25, 4.75], [3.3, 6.3], 0.16);
  first.wall("Master bedroom inner wall", "interior", "x", 5.375, [4.75, 8.5], [3.3, 6.3], 0.15, [[7.22, 8.14, 3.3, 5.46]]);
  first.wall("Bedroom 3 and landing terrace wall", "wall", "z", 4.875, [10.375, 14.875], [3.3, 6.3], 0.15, [[11.98, 14.74, 3.3, 5.76]]);
  first.box("Bedroom 3 terrace opening glazing", "glass", [4.853, 3.3, 11.98], [0.044, 2.46, 1.85]);
  first.box("Bedroom 3 terrace opening door", "door", [4.85, 3.3, 13.83], [0.05, 1.93, 0.91]);
  first.box("Bedroom 3 terrace opening transom", "glass", [4.853, 5.23, 13.83], [0.044, 0.53, 0.91]);
  first.copies("Bedroom 3 terrace opening jamb or mullion", "frame", [[4.8235, 3.3, 11.954], [4.8235, 3.3, 12.864], [4.8235, 3.3, 13.804], [4.8235, 3.3, 14.714]], [0.103, 2.46, 0.052]);
  first.copies("Bedroom 3 terrace opening crossbar", "frame", [[4.8235, 3.301, 11.98], [4.8235, 5.208, 11.98], [4.8235, 5.715, 11.98]], [0.103, 0.044, 2.76]);
  first.box("Bedroom 3 terrace opening crossbar", "frame", [4.8235, 3.888, 11.98], [0.103, 0.044, 1.85]);
  first.wall("Bedroom 3 landing wall", "interior", "x", 11.375, [4.875, 8.5], [3.3, 6.3], 0.15, [[7.37, 8.35, 3.3, 5.46]]);
  first.wall("Study and bedroom partition", "interior", "z", 8.5, [10.375, 13.575], [3.3, 6.3], 0.15, [[10.43, 11.32, 3.3, 5.46]]);
  first.wall("Study wall along stair", "interior", "x", 10.375, [8.5, 11.75], [3.3, 6.3], 0.15);
  first.wall("Bedroom 3 service terrace return", "wall", "z", 9.12, [13.575, 15.875], [3.3, 6.3], 0.15);
  first.wall("Recess return at service room", "wall", "x", 15.875, [8.5, 9.12], [3.3, 6.3], 0.16);
  first.wall("First bathroom dividing wall", "interior", "x", 17.125, [2.025, 4.875], [3.3, 6.3], 0.15);
  first.wall("Service terrace rear parapet", "wall", "x", 16.96, [8.5, 10.79], [3.3, 4.27], 0.14);
  first.wall("Puja reveal beside lounge opening", "interior", "x", 7.24, [4.82, 6.37], [3.3, 6.3], 0.13);
  first.wall("Terrace parapet", "wall", "z", 0, [10.125, 14.875], [3.3, 4.3], 0.16);
  first.row("Terrace grille upright", "rail", [1.17, 3.32, 10.1005], [0.037, 1.02, 0.049], [0.45, 0, 0], 9);
  first.copies("Terrace grille horizontal", "rail", [[1.16, 3.53, 10.1005], [1.16, 3.73, 10.1005], [1.16, 3.93, 10.1005], [1.16, 4.13, 10.1005], [1.16, 4.31, 10.1005]], [3.68, 0.027, 0.049]);
  first.wall("Upper stair enclosure by flight", "interior", "x", 9.15, [8.46, 10.52], [3.3, 6.3], 0.15);
  first.box("Upper rear window drip hood", "wall", [8.47, 5.8, 16.02], [0.5, 0.17, 2.61]);
  first.wall("Upper bathroom and dressing rear wall", "interior", "x", 5.375, [8.5, 11.75], [3.3, 6.3], 0.15);
  first.wall("Rear upper bedroom face", "wall", "x", 18.77, [4.875, 8.5], [3.3, 6.3], 0.16);
  first.wall("Rear upper wall return", "wall", "z", 4.875, [18.77, 19], [3.3, 6.3], 0.16);
  first.wall("Rear courtyard corner return", "wall", "x", 10.375, [4.75,4.875], [3.3,6.3], 0.16);

  // Stair head and water tank.
  roofHead.wall("Rooftop room back wall", "wall", "x", 10.29, [8.45, 11.65], [6.46, 8.5], 0.12);
  roofHead.copies("Rooftop room side wall", "wall", [[8.45, 6.46, 6.69], [11.53, 6.46, 6.69]], [0.12, 2.04, 3.66]);
  roofHead.box("Rooftop room roof", "roof", [8.45, 8.5, 6.69], [3.2, 0.14, 3.66]);
  roofHead.box("Water tank platform", "terrace", [9.3, 8.64, 7.525], [1.45, 0.18, 1.45]);
  roofHead.box("Water tank", "tank", [9.425, 8.82, 7.65], [1.2, 1.27, 1.2], { shape: "cylinder" });
  roofHead.box("Water tank lid", "tank", [9.805, 10.09, 8.03], [0.44, 0.07, 0.44], { shape: "cylinder" });
  roofHead.wall("Rooftop room front jamb", "wall", "x", 6.75, [8.45, 11.65], [6.46, 8.5], 0.15, [[10.48, 11.42, 6.46, 8.4]]);
  roofHead.box("Rooftop room door", "door", [10.48, 6.46, 6.7175], [0.94, 1.94, 0.065]);
  // Parapet follows each turn of the roof. The metal guard fills the opening at the front.
  roofHead.wall("Roof parapet", "parapet", "z", 8.5, [0, 1.125], [6.46, 7.21], 0.14);
  roofHead.wall("Roof parapet", "parapet", "x", 0, [8.5, 9.75], [6.46, 7.21], 0.14);
  roofHead.wall("Roof parapet", "parapet", "x", 0, [11.125, 11.15], [6.46, 7.21], 0.14);
  roofHead.wall("Roof parapet", "parapet", "z", 11.75, [1.25, 13.575], [6.46, 7.32], 0.14);
  roofHead.wall("Roof parapet", "parapet", "x", 13.575, [9.12, 11.75], [6.46, 7.32], 0.14);
  roofHead.wall("Roof parapet", "parapet", "z", 9.12, [13.575, 15.875], [6.46, 7.32], 0.14);
  roofHead.wall("Roof parapet", "parapet", "x", 15.875, [8.5, 9.12], [6.46, 7.32], 0.14);
  roofHead.wall("Roof parapet", "parapet", "z", 8.5, [15.875, 18.77], [6.46, 7.32], 0.14);
  roofHead.wall("Roof parapet", "parapet", "x", 18.77, [4.875, 8.5], [6.46, 7.32], 0.14);
  roofHead.wall("Roof parapet", "parapet", "z", 4.875, [18.77, 19], [6.46, 7.32], 0.14);
  roofHead.wall("Roof parapet", "parapet", "x", 19, [2.025, 4.875], [6.46, 7.32], 0.14);
  roofHead.wall("Roof parapet", "parapet", "z", 2.025, [14.875, 19], [6.46, 7.32], 0.14);
  roofHead.wall("Roof parapet", "parapet", "x", 14.875, [2.025, 4.875], [6.46, 7.32], 0.14);
  roofHead.wall("Roof parapet", "parapet", "z", 4.875, [10.375, 14.875], [6.46, 7.32], 0.14);
  roofHead.wall("Roof parapet", "parapet", "x", 10.375, [4.75, 4.875], [6.46, 7.32], 0.14);
  roofHead.wall("Roof parapet", "parapet", "z", 4.75, [5.375, 10.375], [6.46, 7.32], 0.14);
  roofHead.wall("Roof parapet", "parapet", "x", 5.375, [1.25, 4.75], [6.46, 7.32], 0.14);
  roofHead.wall("Roof parapet", "parapet", "z", 1.25, [1.125, 5.375], [6.46, 7.32], 0.14);
  roofHead.row("Front roof guard rail", "metal", [9.75,6.55,-0.02], [1.375,0.035,0.04], [0,0.27,0], 3);
  roofHead.row("Front roof guard post", "metal", [9.75,6.46,-0.025], [0.035,0.74,0.05], [0.335,0,0], 5);

  // Exterior projections and grilles.
  facade.box("Front stone surround upright", "cream", [1.125, 0, 0.66], [0.65, 5.95, 0.64]);
  facade.box("Front stone surround top", "cream", [1.125, 5.95, 0.66], [7.375, 0.85, 0.64]);
  facade.box("Front tower red accent", "red", [11.5, 0, -0.14], [0.25, 7.4, 0.06]);
  facade.box("Front tower above roof", "wall", [11.15, 6.46, -0.08], [0.67, 0.94, 1.33]);
  facade.box("Court pergola side beam", "wall", [1.225, 6.23, 5.5], [0.175, 0.22, 4.75]);
  facade.box("Court pergola support", "wall", [1.275, 3.3, 10.075], [0.2, 2.93, 0.175]);
  facade.box("Master side red window sill", "red", [0.83, 3.84, 2.58], [0.47, 0.2, 2.34]);
  facade.box("Master side red window canopy", "red", [0.83, 5.72, 2.58], [0.47, 0.18, 2.34]);
  facade.box("Master side red window return", "red", [0.83, 3.84, 4.75], [0.47, 2.06, 0.17]);
  facade.box("Courtyard canopy red fascia", "red", [1.1, 6.2, 5.5], [0.125, 0.18, 4.75]);
  facade.copies("Rear side window canopy", "red", [[1.77, 2.68, 15.5], [1.77, 5.98, 15.5]], [0.27, 0.16, 3.22]);
  facade.copies("Terrace opening grille frame", "wall", [[0.05, 6.18, 10.125], [0.05, 6.18, 11.56]], [4.78, 0.2, 0.18]);
  facade.copies("Terrace opening grille frame", "wall", [[0.05, 6.18, 10.305], [4.65, 6.18, 10.305]], [0.18, 0.2, 1.255]);
  facade.box("Stepped stone relief base", "stone", [5.88, 5.97, 0.632], [1.4, 0.14, 0.028]);
  facade.box("Stepped stone relief upper panel", "stone", [6.03, 6.11, 0.634], [1.1, 0.15, 0.026]);
  facade.row("Pale inset in relief", "cream", [6.11, 6.15, 0.614], [0.105, 0.083, 0.024], [0.255, 0, 0], 4);
  facade.row("Court pergola slat", "rail", [1.24, 6.25, 6.15], [3.48, 0.13, 0.077], [0, 0, 0.57], 7);
  facade.copies("Terrace opening grille post", "wall", [[-0.01, 3.32, 10.12], [-0.01, 3.32, 11.54]], [0.28, 3.11, 0.24]);
  facade.box("Terrace frame above planter", "wall", [-0.01, 6.43, 10.12], [0.32, 0.27, 1.66]);
  facade.row("Terrace opening grille bar", "rail", [0.42, 6.24, 10.31], [0.065, 0.11, 1.24], [0.54, 0, 0], 8);
  facade.box("Rear vent shaft face", "wall", [1.42, 0, 14.88], [0.14, 2.3, 0.8]);
  facade.box("Rear vent shaft face", "wall", [1.42, 2.86, 14.88], [0.14, 3.25, 0.8]);
  facade.box("Rear vent shaft face", "wall", [1.42, 6.71, 14.88], [0.14, 0.94, 0.8]);
  facade.copies("Vent shaft jamb", "wall", [[1.42, 2.3, 14.88], [1.42, 2.3, 15.55]], [0.14, 0.56, 0.13]);
  facade.copies("Vent shaft jamb", "wall", [[1.42, 6.11, 14.88], [1.42, 6.11, 15.55]], [0.14, 0.6, 0.13]);
  facade.box("Vent shaft recess", "shaft-dark", [1.66, 2.3, 15.01], [0.06, 0.56, 0.54]);
  facade.box("Vent shaft recess", "shaft-dark", [1.66, 6.11, 15.01], [0.06, 0.6, 0.54]);
  facade.copies("Vent stack side return", "wall", [[1.55, 0, 14.88], [1.55, 0, 15.57]], [0.48, 7.65, 0.11]);
  facade.box("Vent stack cap", "wall", [1.42, 7.62, 14.88], [0.64, 0.09, 0.81]);

  // Site, approaches and raised garden.
  site.box("Paved side driveway", "paving", [-2.1, -0.45, -4.9725], [2.25, 0.08, 25.7725]);
  site.box("Garden boundary path", "paving", [0.9, -0.13, -5.00437], [10.95, 0.06, 0.41437]);
  site.box("Garden right side path", "paving", [11.35, -0.13, -4.59], [0.65, 0.06, 4.19]);
  site.box("Garden side retaining curb", "trim", [1.13, -0.39, -4.63], [0.16, 0.36, 3.13]);
  site.box("Front garden apron curb", "trim", [2.31, -0.37, -0.46], [9.2, 0.38, 0.13]);
  site.box("Front entrance steps", "trim", [0.25, -0.4, -0.42], [0.31, 0.13, 1.77]);
  site.box("Front entrance steps", "trim", [0.56, -0.4, -0.42], [0.31, 0.26, 1.77]);
  site.box("Front entrance steps", "trim", [0.87, -0.4, -0.42], [0.31, 0.39, 1.77]);
  site.box("Rear path", "paving", [2.03, -0.25, 19.16], [9.89, 0.18, 1.21]);
  site.box("Side road approach paving", "paving", [-0.02, -0.43, 1.35], [1.16, 0.07, 9.02]);
  site.box("Rear side paving", "paving", [0.05, -0.43, 14.9], [1.96, 0.08, 5.49]);
  site.box("Site soil", "earth", [-2.25,-0.6,-5.1], [14.5,0.14,26.1]);
  const paving = deckBuilder(site, 0, groundPlan);
  paving("Front paved apron", "paving", [[1.18,-0.4,11.74,1.25]], 0.38);
  paving("Rear service paving", "paving", [[8.38,15.38,11.88,19.16]], 0.19);
  // The raised bed turns into the apron on a quarter circle.
  const garden = deckBuilder(site, -0.09);
  garden("Garden soil", "earth", [[1.19,-4.58,11.35,-1.53]] ,0.34);
  for (let i = 0; i < 13; i++) {
    const a = (i + 0.5) * Math.PI / 26;
    const x = 2.31 - 1.12 * Math.cos(a), z = -1.53 + 1.12 * Math.sin(a);
    site.box("Curved garden edging", "trim", [x-0.07,-0.38,z-0.075], [0.14,0.39,0.15], { yaw: a });
    const front = -1.53 + 1.12*Math.sin(i*Math.PI/26), rear = -1.53 + 1.12*Math.sin((i+1)*Math.PI/26);
    garden("Garden soil", "earth", [[x,front,11.35,rear]], 0.34);
  }

  // Compound walls and gates.
  boundary.box("Front utility wall", "cream", [1.25, -0.5, -5.1], [1.9, 1.75, 0.11475]);
  boundary.box("Front unfinished wall base", "boundary", [3.15, -0.5, -5.1], [9.1, 0.95, 0.11475]);
  boundary.box("Front unfinished brickwork", "brick", [3.15, 0.45, -5.1], [9.1, 0.75, 0.11475]);
  for (const [front, rear] of [[-4.94063,-4.4625], [-4.284,-1.275], [-1.0965,3], [3.28,8], [8.28,13], [13.28,18], [18.28,20.75]]) {
    boundary.box("Side compound wall", "boundary", [-2.25,-0.5,front], [0.18,1.6,rear-front]);
  }
  boundary.box("Rear compound wall", "boundary", [0.5, -0.5, 20.82], [11.57, 1.55, 0.18]);
  boundary.copies("Side boundary pier", "brick", [[-2.25, -0.5, -4.4625], [-2.25, -0.5, -1.275]], [0.28, 1.86, 0.1785]);
  boundary.row("Side boundary pier", "brick", [-2.25, -0.5, 3], [0.28, 1.86, 0.28], [0, 0, 5], 4);
  boundary.copies("Front gate pillar", "boundary", [[-2.25, -0.5, -5.1], [1, -0.5, -5.1]], [0.25, 1.95, 0.15937]);
  boundary.row("Front gate horizontal rail", "red", [-2.05, 0.04, -5.0745], [3.1, 0.035, 0.051], [0, 0.38, 0], 4);
  boundary.row("Front gate upright", "red", [-2.05, 0, -5.0745], [0.028, 1.2, 0.051], [0.27727, 0, 0], 12);
  boundary.box("Neighbour boundary wall", "boundary", [12.07, -0.5, -4.98525], [0.18, 2.3, 3.86796]);
  boundary.box("Neighbour boundary wall", "boundary", [12.07, -0.5, -1.1173], [0.18, 3.1, 0.96699]);
  boundary.box("Neighbour boundary wall", "boundary", [12.07, -0.5, -0.15032], [0.18, 8.4, 10.53241]);
  boundary.box("Neighbour boundary wall", "boundary", [12.07, -0.5, 10.38211], [0.18, 8.4, 6.06736]);
  boundary.box("Neighbour boundary wall", "boundary", [12.07, -0.5, 16.44947], [0.18, 7.35, 1.51684]);
  boundary.box("Neighbour boundary wall", "boundary", [12.07, -0.5, 17.96632], [0.18, 5.6, 1.51684]);
  boundary.box("Neighbour boundary wall", "boundary", [12.07, -0.5, 19.48316], [0.18, 4, 1.51684]);
  boundary.copies("Rear entrance brick pillar", "brick", [[-2.25, -0.5, 20.75], [0.18, -0.5, 20.75]], [0.32, 1.85, 0.32]);
  boundary.row("Rear boundary rail post", "rail", [0.42, 1.04, 20.86], [0.033, 0.63, 0.04], [1.15, 0, 0], 9);
  boundary.row("Rear boundary rail", "rail", [0.42, 1.19, 20.86], [9.24, 0.023, 0.04], [0, 0.19, 0], 3);

  const colors = {
    "wall": "#a6b5ba",
    "interior": "#e4dbca",
    "floor": "#e8dfcc",
    "cream": "#e0ccb0",
    "red": "#aa6d5e",
    "frame": "#f3ebdd",
    "glass": "#557b85",
    "door": "#b99977",
    "metal": "#535d59",
    "terrace": "#d5ccba",
    "roof": "#e1d8c5",
    "paving": "#c0b7a5",
    "earth": "#a5997c",
    "stair": "#aa9d87",
    "boundary": "#b7b3a5",
    "brick": "#ac785f",
    "tank": "#4c5958",
    "parapet": "#acbabd",
    "court": "#baae97",
    "cabinet": "#c4af8d",
    "counter": "#707670",
    "bamboo": "#aa8b67",
    "rail": "#865d55",
    "shaft-dark": "#616866",
    "stone": "#bba98f",
    "ceiling": "#f3ebdb",
    "steel": "#8d9998",
    "trim": "#c3ae8f",
  };
  const labels = {
    ground: [
      ["Dining", 2.875, 3.375],
      ["Drawing / hall", 9.125, 2.875],
      ["Bedroom 1", 2.375, 12.625],
      ["Bedroom 2", 6.375, 15.625],
      ["Kitchen", 9.875, 13],
      ["Court", 2.5, 8.125],
      ["Entry", 7.15, 6.4],
      ["Lounge", 5.75, 8.7],
      ["Toilet 01", 3.35, 15.85],
      ["Toilet 02", 3.35, 17.85],
      ["Toilet 06", 10, 6.25],
      ["Main stair", 10.55, 9.7],
      ["Small room", 9.35, 8.12],
    ],
    first: [
      ["Master bedroom", 4.875, 3.25],
      ["Bedroom 3", 6.625, 13.625],
      ["Study", 10.125, 12],
      ["Terrace 02", 2.375, 13.5],
      ["Service terrace", 10.125, 15.125],
      ["Servant room", 6.625, 17.875],
      ["Spiral stair", 10.825, 17.875],
      ["Puja", 5.625, 6.3],
      ["Lounge below", 5.63, 8.8],
      ["Toilet 03", 3.4, 15.9],
      ["Toilet 04", 3.4, 18],
      ["Toilet 05", 10, 1.8],
      ["Dress", 10, 4.25],
      ["Stair opening", 10.9, 8.2],
      ["Court below", 2.6, 7.9],
    ],
    roof: [
      ["Tank above stair head", 10.025, 8.25],
    ],
  };
  return { parts, colors, labels };
})();
