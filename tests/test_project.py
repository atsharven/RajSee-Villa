"""Run the shared geometry checks through the original unittest command."""
from pathlib import Path
import subprocess
import unittest


class VillaModelTest(unittest.TestCase):
    def test_shared_model(self):
        root = Path(__file__).resolve().parents[1]
        subprocess.run(["node", "--test", "tests/model.test.cjs"], cwd=root, check=True)
