"""Build the editable GLB from the single browser model; Python standard library only."""
from pathlib import Path
import json
import math
import struct

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / 'src' / 'model.js').read_text(encoding='utf-8')
prefix = 'window.RAJSEE_MODEL = '
if not source.startswith(prefix) or not source.rstrip().endswith(';'):
    raise ValueError('The canonical model.js has an unexpected format.')
model = json.loads(source[len(prefix):].rstrip()[:-1])
parts, colors, images = model['parts'], model['colors'], model['images']

buf = bytearray()
views = []
accessors = []

def segment(payload, target=None):
    while len(buf) % 4:
        buf.append(0)
    offset = len(buf)
    buf.extend(payload)
    view = {'buffer': 0, 'byteOffset': offset, 'byteLength': len(payload)}
    if target:
        view['target'] = target
    views.append(view)
    return len(views) - 1

def accessor(view, component, count, kind, **extra):
    value = {'bufferView': view, 'componentType': component, 'count': count, 'type': kind}
    value.update(extra)
    accessors.append(value)
    return len(accessors) - 1

def geometry(positions, normals, texcoords, indices):
    pos = segment(b''.join(struct.pack('<3f', *v) for v in positions), 34962)
    norm = segment(b''.join(struct.pack('<3f', *v) for v in normals), 34962)
    uv = segment(b''.join(struct.pack('<2f', *v) for v in texcoords), 34962)
    index = segment(struct.pack('<' + 'H' * len(indices), *indices), 34963)
    low = [min(v[i] for v in positions) for i in range(3)]
    high = [max(v[i] for v in positions) for i in range(3)]
    return {'POSITION': accessor(pos, 5126, len(positions), 'VEC3', min=low, max=high),
            'NORMAL': accessor(norm, 5126, len(normals), 'VEC3'),
            'TEXCOORD_0': accessor(uv, 5126, len(texcoords), 'VEC2'),
            'indices': accessor(index, 5123, len(indices), 'SCALAR')}

def cube_geometry(repeat=None):
    positions, normals, uv, indices = [], [], [], []
    faces = [([(-.5,-.5,-.5),(.5,-.5,-.5),(.5,.5,-.5),(-.5,.5,-.5)],(0,0,-1)),
             ([(.5,-.5,.5),(-.5,-.5,.5),(-.5,.5,.5),(.5,.5,.5)],(0,0,1)),
             ([(-.5,-.5,.5),(-.5,-.5,-.5),(-.5,.5,-.5),(-.5,.5,.5)],(-1,0,0)),
             ([(.5,-.5,-.5),(.5,-.5,.5),(.5,.5,.5),(.5,.5,-.5)],(1,0,0)),
             ([(-.5,.5,-.5),(.5,.5,-.5),(.5,.5,.5),(-.5,.5,.5)],(0,1,0)),
             ([(-.5,-.5,.5),(.5,-.5,.5),(.5,-.5,-.5),(-.5,-.5,-.5)],(0,-1,0))]
    for face_index, (vertices, normal) in enumerate(faces):
        start = len(positions)
        positions.extend(vertices); normals.extend([normal] * 4)
        if repeat and face_index == 4:
            x, z, width, depth, tile = repeat
            u0, v0, u1, v1 = x/tile, z/tile, (x+width)/tile, (z+depth)/tile
            uv.extend([(u0,v0),(u1,v0),(u1,v1),(u0,v1)])
        else:
            uv.extend([(0,1),(1,1),(1,0),(0,0)])
        indices.extend([start,start+2,start+1,start,start+3,start+2])
    return geometry(positions, normals, uv, indices)

def cylinder_geometry(count=24):
    positions, normals, uv, indices = [], [], [], []
    for i in range(count):
        a, b = i * 2 * math.pi / count, (i + 1) * 2 * math.pi / count
        p0, p1 = (.5*math.cos(a), .5*math.sin(a)), (.5*math.cos(b), .5*math.sin(b))
        n0, n1 = (math.cos(a),0,math.sin(a)), (math.cos(b),0,math.sin(b))
        start = len(positions)
        positions.extend([(p0[0],-.5,p0[1]),(p1[0],-.5,p1[1]),(p1[0],.5,p1[1]),(p0[0],.5,p0[1])])
        normals.extend([n0,n1,n1,n0]); uv.extend([(0,1),(1,1),(1,0),(0,0)])
        indices.extend([start,start+2,start+1,start,start+3,start+2])
    for y, normal, reverse in [(.5,(0,1,0),True),(-.5,(0,-1,0),False)]:
        center = len(positions)
        positions.append((0,y,0)); normals.append(normal); uv.append((.5,.5))
        for i in range(count):
            a=i*2*math.pi/count
            positions.append((.5*math.cos(a),y,.5*math.sin(a)))
            normals.append(normal);uv.append((.5+.5*math.cos(a),.5+.5*math.sin(a)))
        for i in range(count):
            first, second = center+1+i, center+1+(i+1)%count
            indices.extend([center,second,first] if reverse else [center,first,second])
    return geometry(positions, normals, uv, indices)

geometries = {'box': cube_geometry(), 'cylinder': cylinder_geometry()}
materials, image_defs, texture_defs = [], [], []
names = list(colors)
for name in names:
    value = colors[name]
    rgb = [int(value[i:i+2],16)/255 for i in (1,3,5)]
    pbr = {'baseColorFactor': rgb+[1], 'metallicFactor': .03, 'roughnessFactor': .86}
    if name in images:
        raw = (ROOT / images[name]).read_bytes()
        image_defs.append({'name': 'Photo material ' + name, 'bufferView': segment(raw), 'mimeType': 'image/jpeg'})
        texture_defs.append({'source': len(image_defs)-1, 'sampler': 0})
        pbr['baseColorTexture'] = {'index': len(texture_defs)-1}
        pbr['baseColorFactor'] = [1,1,1,1]
    materials.append({'name': name, 'pbrMetallicRoughness': pbr, 'doubleSided': True})

meshes, mesh_lookup = [], {}
for shape, geo in geometries.items():
    for i, name in enumerate(names):
        mesh_lookup[(shape,name)] = len(meshes)
        meshes.append({'name': f'{shape} / {name}', 'primitives': [{'attributes': {k:v for k,v in geo.items() if k!='indices'},
                                                                    'indices': geo['indices'], 'material': i}]})

group_names = {'ground':'Ground floor','first':'First floor','roof':'Roof terrace',
               'roof-detail':'Rooftop tank and provisional room','site':'Garden and paths',
               'boundary':'Boundary and gate','decoration':'Facade and courtyard details','spiral':'Rear spiral stair'}
nodes = [{'name': value, 'children': []} for value in group_names.values()]
group_index = {key:i for i,key in enumerate(group_names)}
for part in parts:
    shape = part.get('shape','box')
    if (shape, part['color']) not in mesh_lookup:
        raise ValueError(f"Unknown shape/material: {part['name']}")
    mesh_index = mesh_lookup[(shape,part['color'])]
    if part.get('textureRepeatMeters') and shape == 'box':
        repeated = cube_geometry((part['p'][0], part['p'][2], part['s'][0], part['s'][2],
                                  part['textureRepeatMeters']))
        mesh_index = len(meshes)
        attributes = {k:v for k,v in repeated.items() if k!='indices'}
        if part.get('topTextureOnly'):
            def face_indices(face_numbers):
                values = []
                for face in face_numbers:
                    start = face * 4
                    values.extend([start,start+2,start+1,start,start+3,start+2])
                view = segment(struct.pack('<' + 'H' * len(values), *values), 34963)
                return accessor(view, 5123, len(values), 'SCALAR')
            primitives = [{'attributes': attributes, 'indices': face_indices([4]), 'material': names.index(part['color'])},
                          {'attributes': attributes, 'indices': face_indices([0,1,2,3,5]), 'material': names.index('roof')}]
        else:
            primitives = [{'attributes': attributes, 'indices': repeated['indices'], 'material': names.index(part['color'])}]
        meshes.append({'name': f"{shape} / {part['color']}", 'primitives': primitives})
    node = {'name': part['name'], 'mesh': mesh_index,
            'translation': [part['p'][i]+part['s'][i]/2 for i in range(3)], 'scale': part['s'],
            'extras': {'level': part['level'], 'status': 'Photo-informed estimate; verify on site'}}
    if 'yaw' in part:
        node['rotation'] = [0,math.sin(part['yaw']/2),0,math.cos(part['yaw']/2)]
    nodes.append(node)
    nodes[group_index.get(part['level'], group_index['decoration'])]['children'].append(len(nodes)-1)

document = {'asset': {'version':'2.0','generator':'RajSee Villa project'}, 'scene':0,
            'scenes':[{'nodes':list(range(len(group_names)))}], 'nodes':nodes, 'meshes':meshes,
            'materials':materials, 'images':image_defs, 'textures':texture_defs,
            'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}],
            'buffers':[{'byteLength':len(buf)}], 'bufferViews':views, 'accessors':accessors}
encoded = json.dumps(document,separators=(',',':')).encode('utf-8')
encoded += b' ' * ((-len(encoded)) % 4)
binary = bytes(buf) + b'\0' * ((-len(buf)) % 4)
length = 12 + 8 + len(encoded) + 8 + len(binary)
glb = (struct.pack('<4sII',b'glTF',2,length) + struct.pack('<I4s',len(encoded),b'JSON') + encoded +
       struct.pack('<I4s',len(binary),b'BIN\0') + binary)
output = ROOT / 'assets' / 'rajsee-villa.glb'
output.write_bytes(glb)
print(f'Exported {len(parts)} model parts to {output.name}.')
