#!/usr/bin/env python3
"""Generate sitemap.xml, robots.txt and the web manifest for the static site."""

from __future__ import annotations

import json
from pathlib import Path
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

ROOT = Path(__file__).resolve().parents[1]
BASE_URL = "https://imadtbn.github.io/nadjah/"


def indexable_pages() -> list[Path]:
    pages = []
    for path in sorted(ROOT.rglob("*.html")):
        if ".git" in path.parts:
            continue
        content = path.read_bytes().decode("utf-8", errors="ignore")
        if "<head" in content.lower() and "<title" in content.lower():
            pages.append(path)
    return pages


def url_for(path: Path) -> str:
    relative = path.relative_to(ROOT).as_posix()
    return BASE_URL if relative == "index.html" else BASE_URL + relative


def write_sitemap(pages: list[Path]) -> None:
    root = Element("urlset", {"xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9"})
    for page in pages:
        url = SubElement(root, "url")
        SubElement(url, "loc").text = url_for(page)
    pretty = minidom.parseString(tostring(root, encoding="utf-8")).toprettyxml(indent="  ", encoding="utf-8").decode("utf-8")
    (ROOT / "sitemap.xml").write_text(pretty, encoding="utf-8")


def write_robots() -> None:
    (ROOT / "robots.txt").write_text(
        "User-agent: *\nAllow: /\nDisallow: /scripts/\n\nSitemap: " + BASE_URL + "sitemap.xml\n",
        encoding="utf-8",
    )


def write_manifest() -> None:
    manifest = {
        "name": "منصة النجاح التعليمية",
        "short_name": "النجاح",
        "description": "فروض واختبارات مصححة PDF لجميع الأطوار التعليمية في الجزائر.",
        "lang": "ar-DZ",
        "dir": "rtl",
        "start_url": "./",
        "scope": "./",
        "display": "standalone",
        "theme_color": "#0f172a",
        "background_color": "#0f172a",
        "icons": [{"src": "assets/images/icon22.png", "type": "image/png", "sizes": "any"}],
    }
    (ROOT / "site.webmanifest").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    pages = indexable_pages()
    write_sitemap(pages)
    write_robots()
    write_manifest()
    print(f"Generated indexing files for {len(pages)} indexable HTML pages")


if __name__ == "__main__":
    main()
