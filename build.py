"""Build the site from src/ into self-contained HTML files in the repository root.

    src/template.html               -> index.html
    src/pages/<name>.html           -> <name>.html   (legal pages)

Template syntax (processed in this order):
    {{> file}}                      include src/partials/<file> (may itself contain includes)
    {{#if path}}…{{else}}…{{/if}}   keep the first part if the value at <path> in src/site.json is filled in
    {{v:path|Label}}                value from src/site.json (HTML-escaped), or a highlighted
                                    "[DOPLNIT: Label]" placeholder when it is empty
    {{json:path}}                   value from src/site.json as JSON (for scripts)
    {{name}}                        src/img/<name>.webp inlined as a base64 data URI

Usage:  python3 build.py
Prints every placeholder that still needs real data.
"""
import base64
import html
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
SITE = json.loads((SRC / "site.json").read_text(encoding="utf-8"))
missing = {}


def lookup(path):
    value = SITE
    for key in path.split("."):
        if not isinstance(value, dict) or key not in value:
            raise KeyError(f"site.json has no '{path}'")
        value = value[key]
    return value


def filled(value):
    return value not in (None, "", [], {})


def include(text, depth=0):
    if depth > 10:
        raise RecursionError("include nesting too deep")
    return re.sub(r"\{\{>\s*([\w.\-/]+)\s*\}\}",
                  lambda m: include((SRC / "partials" / m.group(1)).read_text(encoding="utf-8"), depth + 1),
                  text)


IF_RE = re.compile(r"\{\{#if ([\w.]+)\}\}(.*?)(?:\{\{else\}\}(.*?))?\{\{/if\}\}", re.S)


def render(text, page):
    text = include(text)
    text = IF_RE.sub(lambda m: m.group(2) if filled(lookup(m.group(1))) else (m.group(3) or ""), text)

    def value(m):
        path, label = m.group(1), m.group(2)
        v = lookup(path)
        if filled(v):
            return html.escape(str(v))
        missing.setdefault(path, (label, set()))[1].add(page)
        return f'<mark class="todo">[DOPLNIT: {html.escape(label)}]</mark>'

    text = re.sub(r"\{\{v:([\w.]+)\|([^}]+)\}\}", value, text)
    text = re.sub(r"\{\{json:([\w.]+)\}\}", lambda m: json.dumps(lookup(m.group(1)), ensure_ascii=False), text)

    def image(m):
        data = (SRC / "img" / f"{m.group(1)}.webp").read_bytes()
        return "data:image/webp;base64," + base64.b64encode(data).decode()

    text = re.sub(r"\{\{([a-z0-9_]+)\}\}", image, text)
    left = re.findall(r"\{\{[^}]*\}\}", text)
    if left:
        raise ValueError(f"{page}: unprocessed template tags {left[:5]}")
    return text


def build(src, out):
    result = render(src.read_text(encoding="utf-8"), out.name)
    out.write_text(result, encoding="utf-8")
    print(f"{out.name:32} {len(result) // 1024:5} KB")


build(SRC / "template.html", ROOT / "index.html")
for page in sorted((SRC / "pages").glob("*.html")):
    build(page, ROOT / page.name)

if missing:
    print("\nStill to fill in (src/site.json):")
    for path, (label, pages) in sorted(missing.items()):
        print(f"  {path:28} {label}  [{', '.join(sorted(pages))}]")
