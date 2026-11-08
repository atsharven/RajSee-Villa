from pathlib import Path
from html.parser import HTMLParser
import json
import math
import struct
import unittest

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'window.RAJSEE_MODEL = '

def load_model():
    source = (ROOT / 'src' / 'model.js').read_text(encoding='utf-8').strip()
    assert source.startswith(PREFIX) and source.endswith(';')
    return json.loads(source[len(PREFIX):-1])

class LocalLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        for key in ('src','href'):
            if key in values and values[key] and not values[key].startswith(('#','http:','https:','mailto:','data:')):
                self.links.append(values[key])

class ProjectTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model = load_model()
        cls.parts = cls.model['parts']

    def named(self, name):
        return [part for part in self.parts if part['name'] == name]

    def test_all_page_assets_exist(self):
        parser = LocalLinks()
        parser.feed((ROOT/'index.html').read_text(encoding='utf-8'))
        for link in parser.links:
            self.assertTrue((ROOT/link).is_file(), link)

    def test_courtyard_terrace_and_service_connections(self):
        terrace = self.named('First floor terrace over ground bedroom')[0]
        self.assertGreater(terrace['s'][2], 0)
        self.assertFalse(terrace.get('interiorOnly', False))
        self.assertFalse(self.named('First floor service terrace')[0].get('interiorOnly', False))
        self.assertTrue(self.named('Terrace grille upright'))
        self.assertTrue(self.named('Terrace pergola slat'))
        self.assertTrue(self.named('Study door to service terrace'))
        self.assertTrue(self.named('Servant room door to terrace'))
        self.assertTrue(self.named('Courtyard back wall'))
        self.assertTrue(self.named('Ground courtyard large window glazing'))

    def test_no_lift_and_stairs_remain(self):
        self.assertFalse([p['name'] for p in self.parts if 'lift' in p['name'].lower()])
        self.assertFalse([label['text'] for labels in self.model['labels'].values()
                          for label in labels if 'lift' in label['text'].lower()])
        stairs = self.named('Main stair first flight')
        self.assertEqual(sum(p['level']=='ground' for p in stairs), 9)
        self.assertEqual(sum(p['level']=='first' for p in stairs), 9)
        second = self.named('Main stair second flight')
        for level, floor_top in [('ground', 3.3), ('first', 6.46)]:
            self.assertAlmostEqual(max(p['p'][1] + p['s'][1] for p in second if p['level'] == level), floor_top)
        self.assertEqual(len([p for p in self.parts if p['name'].startswith('Rear spiral tread')]), 18)

    def test_first_floor_has_separate_lounge_opening(self):
        x, z = 5.63, 8.8
        slabs = [p for p in self.parts if p['level'] == 'first' and p['name'].startswith('First floor slab')]
        self.assertTrue(slabs)
        self.assertFalse(any(p['p'][0] < x < p['p'][0] + p['s'][0] and
                             p['p'][2] < z < p['p'][2] + p['s'][2] for p in slabs))
        labels = {label['text'] for label in self.model['labels']['first']}
        self.assertIn('Lounge below', labels)
        self.assertIn('Puja (approx.)', labels)

    def test_rooftop_room_and_tank(self):
        tank = self.named('Water tank')[0]
        platform = self.named('Water tank platform')[0]
        self.assertEqual(tank.get('shape'), 'cylinder')
        self.assertAlmostEqual(tank['p'][1], platform['p'][1] + platform['s'][1])
        room = self.named('Rooftop room roof')[0]
        self.assertAlmostEqual(room['s'][0], 3.2)
        self.assertAlmostEqual(room['s'][2], 1.6)
        self.assertGreater(room['p'][1], 6.46)
        self.assertAlmostEqual(platform['p'][1], room['p'][1] + room['s'][1])
        for axis in (0, 2):
            self.assertGreaterEqual(platform['p'][axis], room['p'][axis])
            self.assertLessEqual(platform['p'][axis] + platform['s'][axis], room['p'][axis] + room['s'][axis])
        self.assertTrue(self.named('Roof terrace parapet (approximate)'))

    def test_roof_open_above_service_terrace_and_stair(self):
        slabs = [p for p in self.parts if p['level'] == 'roof' and p['name'].startswith('Roof slab')]
        for x, z in ((10, 14.5), (11, 8.2)):
            self.assertFalse(any(p['p'][0] < x < p['p'][0] + p['s'][0] and
                                 p['p'][2] < z < p['p'][2] + p['s'][2] for p in slabs), (x, z))

    def test_plot_and_materials(self):
        soil = self.named('Ground inside boundary - soil')
        self.assertEqual(len(soil), 32)
        self.assertAlmostEqual(max(p['p'][0]+p['s'][0] for p in soil)-min(p['p'][0] for p in soil), 14.5)
        self.assertAlmostEqual(max(p['p'][2]+p['s'][2] for p in soil)-min(p['p'][2] for p in soil), 29)
        neighbour = self.named('Neighbour boundary wall')
        self.assertGreater(len(neighbour), 1)
        self.assertAlmostEqual(max(p['p'][1] + p['s'][1] for p in neighbour), .95)
        self.assertAlmostEqual(sum(p['s'][2] for p in neighbour), 28.82)
        for part in self.parts:
            self.assertIn(part['color'], self.model['colors'], part['name'])
            self.assertTrue(all(value > 0 for value in part['s']), part['name'])

    def test_glb_matches_model_and_embeds_materials(self):
        data = (ROOT/'assets'/'rajsee-villa.glb').read_bytes()
        magic, version, total = struct.unpack_from('<4sII', data)
        size, kind = struct.unpack_from('<I4s', data, 12)
        document = json.loads(data[20:20+size])
        binary_size, binary_kind = struct.unpack_from('<I4s', data, 20+size)
        binary = data[28+size:]
        self.assertEqual((magic,version,total,kind,binary_kind,binary_size),
                         (b'glTF',2,len(data),b'JSON',b'BIN\0',len(binary)))
        mesh_nodes = [node for node in document['nodes'] if 'mesh' in node]
        self.assertEqual(len(mesh_nodes), len(self.parts))
        for part, node in zip(self.parts, mesh_nodes):
            self.assertEqual(node['name'], part['name'])
            mesh = document['meshes'][node['mesh']]
            self.assertEqual(mesh['name'], f"{part.get('shape', 'box')} / {part['color']}")
            self.assertEqual(document['materials'][mesh['primitives'][0]['material']]['name'], part['color'])
            for axis in range(3):
                self.assertAlmostEqual(node['scale'][axis], part['s'][axis])
                self.assertAlmostEqual(node['translation'][axis], part['p'][axis] + part['s'][axis] / 2)
            if 'yaw' in part:
                self.assertAlmostEqual(node['rotation'][1], math.sin(part['yaw'] / 2))
                self.assertAlmostEqual(node['rotation'][3], math.cos(part['yaw'] / 2))
        self.assertFalse([node['name'] for node in document['nodes'] if 'lift' in node['name'].lower()])
        self.assertTrue(any(mesh['name'].startswith('cylinder /') for mesh in document['meshes']))
        for image in document['images']:
            view = document['bufferViews'][image['bufferView']]
            self.assertEqual(binary[view['byteOffset']:view['byteOffset']+2], b'\xff\xd8')

if __name__ == '__main__':
    unittest.main()
