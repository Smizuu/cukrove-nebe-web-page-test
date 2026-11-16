"""Build index.html from src/template.html by inlining every image from src/img/.

Each {{name}} placeholder in the template is replaced with src/img/name.webp as a
base64 data URI, so the finished site is one self-contained HTML file.

Usage:  python3 build.py
"""
import base64
import pathlib
import re

root = pathlib.Path(__file__).resolve().parent
html = (root / "src" / "template.html").read_text(encoding="utf-8")


def inline(match):
    name = match.group(1)
    data = (root / "src" / "img" / f"{name}.webp").read_bytes()
    return "data:image/webp;base64," + base64.b64encode(data).decode()


out = re.sub(r"\{\{([a-z0-9_]+)\}\}", inline, html)
(root / "index.html").write_text(out, encoding="utf-8")
print(f"index.html written ({len(out) // 1024} KB)")
