#!/usr/bin/env python3
"""Generate site-wide statistics from the actual static HTML content."""

from __future__ import annotations

import json
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "data" / "site-stats.json"


def read_soup(path: Path) -> BeautifulSoup:
    return BeautifulSoup(path.read_text(encoding="utf-8", errors="ignore"), "html.parser")


def main() -> None:
    html_files = sorted(ROOT.rglob("*.html"))
    html_files = [path for path in html_files if ".git" not in path.parts]

    document_cards = 0
    corrected_documents = 0
    subjects: set[str] = set()

    for path in html_files:
        soup = read_soup(path)
        cards = soup.select(".doc-card")
        document_cards += len(cards)
        corrected_documents += sum(
            1 for card in cards if card.select_one(".solution-badge.with-solution")
        )

        for badge in soup.select(".subject-badge span"):
            name = " ".join(badge.get_text(" ", strip=True).split())
            if name:
                subjects.add(name)

    levels_page = ROOT / "pages" / "levels.html"
    level_links: set[str] = set()
    if levels_page.exists():
        for link in read_soup(levels_page).select("a.year-btn[href]"):
            href = link.get("href", "").split("#", 1)[0]
            if href:
                level_links.add(href)

    stats = {
        "resources": document_cards,
        "correctedResources": corrected_documents,
        "correctionRate": round((corrected_documents / document_cards) * 100)
        if document_cards
        else 0,
        "levels": len(level_links),
        "subjects": len(subjects),
        "pages": len(html_files),
        "generatedFrom": "HTML .doc-card, .solution-badge.with-solution, .subject-badge and pages/levels.html",
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(stats, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(stats, ensure_ascii=False))


if __name__ == "__main__":
    main()
