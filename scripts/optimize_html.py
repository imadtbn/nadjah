#!/usr/bin/env python3
"""Apply safe performance optimizations to generated/static HTML."""

from __future__ import annotations

from pathlib import Path
import hashlib
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]

EXTERNAL_HEAVY = (
    "three.min.js",
    "gsap.min.js",
    "ScrollTrigger.min.js",
    "lenis.min.js",
)


ADSENSE_CLIENT = "ca-pub-5656416032906373"
AD_UNITS = (
    {"slot": "7319898418", "kind": "in-article"},
    {"slot": "3143411927", "kind": "display"},
)


def ensure_local_asset(soup: BeautifulSoup, tag_name: str, attr: str, value: str, **attrs) -> bool:
    if soup.find(tag_name, attrs={attr: lambda current: current and current.split("?", 1)[0] == value}):
        return False
    tag = soup.new_tag(tag_name)
    tag[attr] = value
    for key, attr_value in attrs.items():
        tag[key.replace("_", "-")] = attr_value
    if tag_name == "link":
        soup.head.append(tag)
    else:
        soup.body.append(tag)
    return True


def make_ad_unit(soup: BeautifulSoup, slot: str, kind: str):
    wrapper = soup.new_tag("div")
    wrapper["class"] = ["ad-slot", f"ad-slot--{kind}"]
    wrapper["data-site-ad"] = "true"
    wrapper["data-ad-type"] = kind
    wrapper["aria-label"] = "إعلان"

    label = soup.new_tag("span")
    label["class"] = ["ad-label"]
    label.string = "إعلان"
    wrapper.append(label)

    ins = soup.new_tag("ins")
    ins["class"] = ["adsbygoogle"]
    ins["style"] = "display:block"
    ins["data-ad-client"] = ADSENSE_CLIENT
    ins["data-ad-slot"] = slot
    ins["data-full-width-responsive"] = "true"
    if kind == "in-article":
        ins["data-ad-layout"] = "in-article"
        ins["data-ad-format"] = "fluid"
        ins["style"] = "display:block;text-align:center"
    else:
        ins["data-ad-format"] = "auto"
    wrapper.append(ins)
    return wrapper


def normalize_ads(path: Path, soup: BeautifulSoup, prefix: str) -> bool:
    if not soup.body or not soup.head:
        return False

    dirty = False

    for old in list(soup.select(".ad-slot[data-site-ad], .ad-banner[data-site-ad], .ad-slot:has(ins.adsbygoogle), .ad-banner:has(ins.adsbygoogle)")):
        old.decompose()
        dirty = True

    ads_css = prefix + "assets/css/ads.css"
    if not soup.find("link", href=lambda value: value and value.split("?", 1)[0] == ads_css):
        link = soup.new_tag("link", rel="stylesheet", href=ads_css)
        soup.head.append(link)
        dirty = True

    site_tags = prefix + "assets/js/site-tags.js"
    if not soup.find("script", src=lambda value: value and value.split("?", 1)[0] == site_tags):
        script = soup.new_tag("script", src=site_tags)
        script["defer"] = ""
        soup.body.append(script)
        dirty = True

    first_ad = make_ad_unit(soup, AD_UNITS[0]["slot"], AD_UNITS[0]["kind"])
    second_ad = make_ad_unit(soup, AD_UNITS[1]["slot"], AD_UNITS[1]["kind"])

    hero = soup.select_one(".hero-subject, .hero-year, .page-hero, .hero")
    main = soup.find("main")
    breadcrumb = soup.select_one(".breadcrumb")

    if path.relative_to(ROOT).as_posix() == "pages/search.html":
        first_anchor = soup.select_one(".search-page-head")
    else:
        first_anchor = hero or (main.find("section") if main else None) or main or breadcrumb or soup.find("header")

    if first_anchor:
        first_anchor.insert_after(first_ad)
    else:
        soup.body.insert(0, first_ad)

    footer = soup.find("footer")
    if footer:
        footer.insert_before(second_ad)
    else:
        soup.body.append(second_ad)

    return True


def asset_version(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:10]


def version_local_assets(page_path: Path, soup: BeautifulSoup) -> bool:
    dirty = False

    for tag, attr in [(tag, "href") for tag in soup.find_all("link", href=True)] + [
        (tag, "src") for tag in soup.find_all("script", src=True)
    ]:
        value = tag.get(attr, "")
        if not value or value.startswith(("http://", "https://", "//", "data:")):
            continue

        clean_value = value.split("?", 1)[0].split("#", 1)[0]
        if not clean_value.lower().endswith((".css", ".js")):
            continue

        target = (page_path.parent / clean_value).resolve()
        try:
            target.relative_to(ROOT)
        except ValueError:
            continue
        if not target.exists() or not target.is_file():
            continue

        desired = f"{clean_value}?v={asset_version(target)}"
        if value != desired:
            tag[attr] = desired
            dirty = True

    return dirty

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

    if normalize_ads(path, soup, prefix):
        dirty = True

    if version_local_assets(path, soup):
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
