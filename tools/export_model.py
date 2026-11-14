"""Compatibility entry point for rebuilding the villa GLB."""
from pathlib import Path
import subprocess

if __name__ == "__main__":
    subprocess.run(["node", str(Path(__file__).with_name("export-model.cjs"))], check=True)
