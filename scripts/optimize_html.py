#!/usr/bin/env python3
"""Apply safe performance optimizations to generated/static HTML."""

from __future__ import annotations

from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]

EXTERNAL_HEAVY = (
    "three.min.js",
    "gsap.min.js",
    "ScrollTrigger.min.js",
    "lenis.min.js",
)

def optimize(path: Path) -> bool:
    raw = path.read_text(encoding="utf-8", errors="ignore")
    if "<html" not in raw.lower():
        return False

    soup = BeautifulSoup(raw, "html.parser")
    dirty = False

    depth = len(path.relative_to(ROOT).parent.parts)
    prefix = "../" * depth

    if soup.head and not soup.find("link", href=lambda value: value and value.rstrip().endswith("assets/css/ux.css")):
        link = soup.new_tag("link", rel="stylesheet", href=prefix + "assets/css/ux.css")
        soup.head.append(link)
        dirty = True

    if soup.body and not soup.find("script", src=lambda value: value and value.rstrip().endswith("assets/js/core.js")):
        script = soup.new_tag("script", src=prefix + "assets/js/core.js")
        script["defer"] = ""
        soup.body.append(script)
        dirty = True

    has_shader = soup.select_one("#shader-canvas") is not None

    for script in list(soup.find_all("script", src=True)):
        src = script.get("src", "")
        if "three.min.js" in src and not has_shader:
            script.decompose()
            dirty = True
            continue
        if any(name in src for name in EXTERNAL_HEAVY):
            if script.get("defer") is None:
                script["defer"] = ""
                dirty = True

    for img in soup.find_all("img"):
        if not img.get("decoding"):
            img["decoding"] = "async"
            dirty = True

        classes = set(img.get("class", []))
        is_logo = bool(classes & {"logo-img", "footer-logo-img"})
        if is_logo:
            if img.get("width") is None:
                img["width"] = "70"
                dirty = True
            if img.get("height") is None:
                img["height"] = "70"
                dirty = True

        if not is_logo and img.get("loading") is None:
            img["loading"] = "lazy"
            dirty = True

    hero_img = soup.select_one(".hero img, .hero-year img, .hero-subject img")
    if hero_img:
        if hero_img.get("fetchpriority") != "high":
            hero_img["fetchpriority"] = "high"
            dirty = True
        if hero_img.get("loading") == "lazy":
            hero_img["loading"] = "eager"
            dirty = True

    for iframe in soup.find_all("iframe"):
        if iframe.get("loading") is None and "googletagmanager.com" not in iframe.get("src", ""):
            iframe["loading"] = "lazy"
            dirty = True

    if dirty:
        path.write_text(str(soup), encoding="utf-8")
    return dirty


def main() -> None:
    pages = [p for p in ROOT.rglob("*.html") if ".git" not in p.parts]
    changed = sum(optimize(path) for path in pages)
    print(f"Optimized {changed} HTML pages")


if __name__ == "__main__":
    main()
