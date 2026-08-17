#!/usr/bin/env python3
"""Validate SEO metadata, generated statistics, and indexing files."""

from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlparse

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
BASE_URL = "https://imadtbn.github.io/nadjah/"


def complete_pages() -> list[Path]:
    result = []
    for path in sorted(ROOT.rglob("*.html")):
        text = path.read_bytes().decode("utf-8", errors="ignore")
        if "<head" in text.lower() and "<title" in text.lower():
            result.append(path)
    return result


def expected_url(path: Path) -> str:
    relative = path.relative_to(ROOT).as_posix()
    return BASE_URL if relative == "index.html" else BASE_URL + relative


def main() -> None:
    pages = complete_pages()
    assert len(pages) == 135, f"unexpected complete page count: {len(pages)}"
    total_cards = 0
    corrected_cards = 0
    subjects: set[str] = set()
    for path in pages:
        soup = BeautifulSoup(path.read_bytes().decode("utf-8", errors="ignore"), "html.parser")
        assert len(soup.find_all("title")) == 1, path
        assert len(soup.find_all("meta", attrs={"name": "description"})) == 1, path
        canonical = soup.find("link", rel="canonical")
        assert canonical and canonical.get("href") == expected_url(path), (path, canonical)
        assert len(soup.find_all("meta", attrs={"property": "og:url"})) == 1, path
        assert len(soup.find_all("script", attrs={"type": "application/ld+json"})) == 1, path
        assert not soup.find(attrs={"data-count": True}), path
        for link in soup.find_all("link", rel=True):
            rel = set(link.get("rel", []))
            if rel & {"manifest", "sitemap", "icon", "apple-touch-icon"}:
                target = link.get("href", "")
                if target and not target.startswith("http"):
                    assert (path.parent / target).resolve().exists(), (path, target)
        cards = soup.select(".doc-card")
        total_cards += len(cards)
        corrected_cards += sum(1 for card in cards if card.select_one(".solution-badge.with-solution"))
        for badge in soup.select(".subject-badge span"):
            name = " ".join(badge.get_text(" ", strip=True).split())
            if name:
                subjects.add(name)

    stats = json.loads((ROOT / "assets/data/site-stats.json").read_text(encoding="utf-8"))
    assert stats["resources"] == total_cards, (stats, total_cards)
    assert stats["correctedResources"] == corrected_cards, (stats, corrected_cards)
    assert stats["correctionRate"] == round(corrected_cards / total_cards * 100), stats
    assert stats["subjects"] == len(subjects), (stats, len(subjects))

    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    locs = [line.strip()[len("<loc>"):-len("</loc>")] for line in sitemap.splitlines() if "<loc>" in line]
    assert len(locs) == len(set(locs)) == len(pages), (len(locs), len(pages))
    assert all(loc.startswith(BASE_URL) for loc in locs)
    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    assert "Allow: /" in robots and "Sitemap: " + BASE_URL + "sitemap.xml" in robots
    manifest = json.loads((ROOT / "site.webmanifest").read_text(encoding="utf-8"))
    assert manifest["lang"] == "ar-DZ" and manifest["dir"] == "rtl"
    print(f"Validation passed: {len(pages)} pages, {total_cards} document cards, {len(locs)} sitemap URLs")


if __name__ == "__main__":
    main()
