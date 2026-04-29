#!/usr/bin/env python3
"""Generate en/index.html from index.html by pre-rendering EN i18n content.

Run after every change to index.html so the English version stays in sync.
A GitHub Action runs this automatically; can also be invoked manually:

    python3 build_en.py
"""
import os
import re
import sys
from html.parser import HTMLParser

SRC = "index.html"
DST = "en/index.html"


class I18NRewriter(HTMLParser):
    """Rewrites the inner content of every [data-i18n-en] element to its EN value.

    For elements whose data-i18n-en value contains HTML markup (<br>, <em>, ...),
    the value is treated as innerHTML. Otherwise it is treated as plain text.
    """

    VOID_TAGS = {
        "area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "param", "source", "track", "wbr",
    }

    # Roles in the open-tag stack:
    NORMAL = "normal"      # outside any i18n element — pass through
    I18N_ROOT = "root"     # the element with data-i18n-en — emit open & close, swap inner
    I18N_CHILD = "child"   # nested inside an i18n root — drop open & close

    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.out = []
        self.stack = []  # list[(tag, role)]

    @property
    def suppressing(self):
        # True while inside any i18n root element (its content is replaced).
        return any(role == self.I18N_ROOT for _, role in self.stack)

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        en_val = attrs_dict.get("data-i18n-en")
        is_void = tag in self.VOID_TAGS

        if self.suppressing:
            # Inside an i18n element: drop opening, but still track non-void
            # children on the stack so we can drop their close tags too.
            if not is_void:
                self.stack.append((tag, self.I18N_CHILD))
            return

        self.out.append(self._format_open(tag, attrs))

        if en_val is not None and not is_void:
            self.out.append(en_val)
            self.stack.append((tag, self.I18N_ROOT))
        elif not is_void:
            self.stack.append((tag, self.NORMAL))

    def handle_startendtag(self, tag, attrs):
        if self.suppressing:
            return
        self.out.append(self._format_open(tag, attrs, self_close=True))

    def handle_endtag(self, tag):
        if not self.stack:
            self.out.append(f"</{tag}>")
            return
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                _, role = self.stack[i]
                self.stack.pop(i)
                if role == self.I18N_CHILD:
                    return  # drop close tag
                self.out.append(f"</{tag}>")
                return
        self.out.append(f"</{tag}>")

    def handle_data(self, data):
        if not self.suppressing:
            self.out.append(data)

    def handle_comment(self, data):
        if not self.suppressing:
            self.out.append(f"<!--{data}-->")

    def handle_entityref(self, name):
        if not self.suppressing:
            self.out.append(f"&{name};")

    def handle_charref(self, name):
        if not self.suppressing:
            self.out.append(f"&#{name};")

    def handle_decl(self, decl):
        self.out.append(f"<!{decl}>")

    def unknown_decl(self, data):
        self.out.append(f"<![{data}]>")

    @staticmethod
    def _format_open(tag, attrs, self_close=False):
        parts = [f"<{tag}"]
        for name, value in attrs:
            if value is None:
                parts.append(f" {name}")
            else:
                # Use double quotes; escape any embedded double quotes.
                escaped = value.replace('"', "&quot;")
                parts.append(f' {name}="{escaped}"')
        parts.append(" />" if self_close else ">")
        return "".join(parts)

    def result(self):
        return "".join(self.out)


def transform(src: str) -> str:
    # 1) Inner content: replace each i18n element's inner content with its EN value.
    rewriter = I18NRewriter()
    rewriter.feed(src)
    out = rewriter.result()

    # 2) Metadata replacements (string-level, exact matches in head).
    out = out.replace('<html lang="it">', '<html lang="en">', 1)
    out = out.replace(
        "Trentino Gravel — Pioneer Edition · 26 Settembre 2026",
        "Trentino Gravel — Pioneer Edition · September 26, 2026",
        1,
    )
    out = re.sub(
        r'(<meta name="description" content=")[^"]*(">)',
        r"\1Trentino Gravel — Pioneer Edition. A gravel and bikepacking adventure through the Dolomites. September 26, 2026, starting from Rovereto. Two routes, 400km and 220km, 70% unpaved. Limited spots — join the waiting list.\2",
        out,
        count=1,
    )
    out = re.sub(
        r'(<meta property="og:description" content=")[^"]*(">)',
        r"\1A 400km gravel adventure through the Dolomites. September 26, 2026 · Rovereto · Trentino. Organised by the Tuscany Trail team.\2",
        out,
        count=1,
    )
    out = re.sub(
        r'(<meta name="twitter:description" content=")[^"]*(">)',
        r"\1A 400km gravel adventure through the Dolomites. September 26, 2026.\2",
        out,
        count=1,
    )
    out = out.replace(
        '<meta property="og:url" content="https://trentinogravel.it/">',
        '<meta property="og:url" content="https://trentinogravel.it/en/">',
        1,
    )
    out = out.replace(
        '<meta property="og:locale" content="it_IT">\n  <meta property="og:locale:alternate" content="en_US">',
        '<meta property="og:locale" content="en_US">\n  <meta property="og:locale:alternate" content="it_IT">',
        1,
    )
    out = out.replace(
        '<link rel="canonical" href="https://trentinogravel.it/">',
        '<link rel="canonical" href="https://trentinogravel.it/en/">',
        1,
    )

    # 3) JS config: lock language to EN and use absolute path for content.json.
    out = out.replace("const DEFAULT_LANG = 'it';", "const DEFAULT_LANG = 'en';", 1)
    out = out.replace("fetch('content.json')", "fetch('/content.json')", 1)
    # Number formatting locale (used for the days-to-go counter, etc.)
    out = out.replace("'it-IT'", "'en-US'")

    # Make all asset paths absolute. The EN page lives at /en/, so any relative
    # reference like `photos/foo.jpg` would resolve to `/en/photos/foo.jpg` and
    # 404. Rewrite the few prefixes the site uses.
    for prefix in ("photos/", "extracted/"):
        # Attribute values: src="photos/..", href="photos/..", content="photos/.."
        out = re.sub(
            rf'((?:src|href|content)=)(["\']){prefix}',
            rf'\1\2/{prefix}',
            out,
        )
        # JS string literals: 'photos/..', "photos/..", `photos/..`
        out = re.sub(rf"(['\"`]){prefix}", rf"\1/{prefix}", out)

    # JSON-LD schema description (the head schema.org block).
    out = out.replace(
        '"description": "Un\'avventura gravel e bikepacking attraverso le Dolomiti, con due percorsi (400km e 220km) e il 70% su strade sterrate.",',
        '"description": "A gravel and bikepacking adventure through the Dolomites, with two routes (400km and 220km) and 70% on unpaved roads.",',
        1,
    )
    out = out.replace(
        '"url": "https://trentinogravel.it/"\n  }',
        '"url": "https://trentinogravel.it/en/"\n  }',
        1,
    )

    # 4) Active class on lang toggle: EN active, IT not.
    # Mobile lang toggle (with class attribute):
    out = out.replace(
        '<button type="button" data-lang-btn="it" class="active">IT</button>',
        '<button type="button" data-lang-btn="it">IT</button>',
        1,
    )
    out = re.sub(
        r'(<button type="button" data-lang-btn="en")(>EN</button>\s*</div>)',
        r'\1 class="active"\2',
        out,
        count=1,
    )
    # Desktop lang toggle (no static active in source; set on EN button):
    out = re.sub(
        r'(<button type="button" data-lang-btn="en")(>EN</button>\s*</li>)',
        r'\1 class="active"\2',
        out,
        count=1,
    )

    return out


def main():
    if not os.path.exists(SRC):
        print(f"error: {SRC} not found", file=sys.stderr)
        sys.exit(1)

    with open(SRC, encoding="utf-8") as f:
        html = f.read()

    if 'data-i18n-en' not in html:
        print("error: no data-i18n-en attributes found in index.html", file=sys.stderr)
        sys.exit(1)

    out = transform(html)

    os.makedirs("en", exist_ok=True)
    with open(DST, "w", encoding="utf-8") as f:
        f.write(out)

    print(f"generated {DST} ({len(out):,} bytes)")


if __name__ == "__main__":
    main()
