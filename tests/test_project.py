from pathlib import Path
from html.parser import HTMLParser
import json
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
        self.assertTrue(self.named('Terrace grille upright'))
        self.assertTrue(self.named('Study door to service terrace'))
        self.assertTrue(self.named('Servant room door to terrace'))
        self.assertTrue(self.named('Courtyard back wall'))
        self.assertTrue(self.named('Ground courtyard large window glazing'))

    def test_no_lift_and_stairs_remain(self):
        self.assertFalse([p['name'] for p in self.parts if 'lift' in p['name'].lower()])
        self.assertFalse([label['text'] for labels in self.model['labels'].values()
                          for label in labels if 'lift' in label['text'].lower()])
        stairs = self.named('Main stair first flight')
        self.assertEqual(sum(p['level']=='ground' for p in stairs), 8)
        self.assertEqual(sum(p['level']=='first' for p in stairs), 8)
        self.assertEqual(len([p for p in self.parts if p['name'].startswith('Rear spiral tread')]), 18)

    def test_rooftop_room_and_tank(self):
        tank = self.named('Water tank')[0]
        platform = self.named('Water tank platform')[0]
        self.assertEqual(tank.get('shape'), 'cylinder')
        self.assertAlmostEqual(tank['p'][1], platform['p'][1] + platform['s'][1])
        room = self.named('Rooftop room roof')[0]
        self.assertAlmostEqual(room['s'][0], 3.2)
        self.assertAlmostEqual(room['s'][2], 1.6)
        self.assertGreater(room['p'][1], 6.46)

    def test_plot_and_materials(self):
        soil = self.named('Ground inside boundary - soil')
        self.assertEqual(len(soil), 32)
        self.assertAlmostEqual(max(p['p'][0]+p['s'][0] for p in soil)-min(p['p'][0] for p in soil), 14.5)
        self.assertAlmostEqual(max(p['p'][2]+p['s'][2] for p in soil)-min(p['p'][2] for p in soil), 29)
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
        self.assertEqual(sum('mesh' in node for node in document['nodes']), len(self.parts))
        self.assertTrue(any(mesh['name'].startswith('cylinder /') for mesh in document['meshes']))
        for image in document['images']:
            view = document['bufferViews'][image['bufferView']]
            self.assertEqual(binary[view['byteOffset']:view['byteOffset']+2], b'\xff\xd8')

if __name__ == '__main__':
    unittest.main()
