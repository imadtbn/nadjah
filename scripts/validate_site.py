#!/usr/bin/env python3
"""Validate SEO, central JSON catalogs, generated statistics and indexing files."""

from __future__ import annotations

import json
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "assets" / "data"
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


def load(name: str) -> dict:
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


def normalize_subject_name(value: str) -> str:
    value = " ".join((value or "").split())
    aliases = {
        "رياضيات": "الرياضيات",
        "الرياضيات": "الرياضيات",
        "العربية": "اللغة العربية",
        "فرنسية": "اللغة الفرنسية",
        "انجليزية": "اللغة الإنجليزية",
        "الإنجليزية": "اللغة الإنجليزية",
        "اسلامية": "التربية الإسلامية",
    }
    return aliases.get(value, value)


def main() -> None:
    pages = complete_pages()
    assert pages, "no complete HTML pages found"

    levels = load("levels.json")
    subjects = load("subjects.json")
    branches = load("branches.json")
    resources = load("resources.json")
    stats = load("site-stats.json")

    for catalog_name, catalog in [
        ("levels", levels),
        ("subjects", subjects),
        ("branches", branches),
        ("resources", resources),
    ]:
        assert catalog.get("schemaVersion") == 1, catalog_name

    level_ids = [
        item["id"]
        for cycle in levels.get("cycles", [])
        for item in cycle.get("levels", [])
    ]
    subject_ids = [item["id"] for item in subjects.get("subjects", [])]
    branch_ids = [item["id"] for item in branches.get("branches", [])]
    resource_ids = [item["id"] for item in resources.get("resources", [])]

    assert len(level_ids) == len(set(level_ids)), "duplicate level ids"
    assert len(subject_ids) == len(set(subject_ids)), "duplicate subject ids"
    assert len(branch_ids) == len(set(branch_ids)), "duplicate branch ids"
    assert len(resource_ids) == len(set(resource_ids)), "duplicate resource ids"

    total_cards = 0
    corrected_cards = 0

    forbidden_template_terms = (
        "القراءة والإملاء",
        "القواعد النحوية",
        "التعبير الكتابي",
    )
    for item in resources.get("resources", []):
        subject = normalize_subject_name(item.get("subject", ""))
        if subject != "اللغة العربية":
            title = item.get("title", "")
            assert not any(term in title for term in forbidden_template_terms), (
                "template copy leaked into non-Arabic subject",
                item.get("id"),
                subject,
                title,
            )

    for path in pages:
        soup = BeautifulSoup(path.read_bytes().decode("utf-8", errors="ignore"), "html.parser")
        assert len(soup.find_all("title")) == 1, path
        assert len(soup.find_all("meta", attrs={"name": "description"})) == 1, path

        canonical = soup.find("link", rel="canonical")
        assert canonical and canonical.get("href") == expected_url(path), (path, canonical)
        assert len(soup.find_all("meta", attrs={"property": "og:url"})) == 1, path
        assert len(soup.find_all("script", attrs={"type": "application/ld+json"})) == 1, path

        for link in soup.find_all("link", rel=True):
            rel = set(link.get("rel", []))
            if rel & {"manifest", "sitemap", "icon", "apple-touch-icon"}:
                target = link.get("href", "")
                if target and not target.startswith("http"):
                    assert (path.parent / target).resolve().exists(), (path, target)

        cards = soup.select(".doc-card")
        total_cards += len(cards)
        corrected_cards += sum(
            1 for card in cards if card.select_one(".solution-badge.with-solution")
        )

        hero = soup.select_one(".hero-subject")
        badge = hero.select_one(".subject-badge span") if hero else None
        resources_stat = soup.select_one('[data-subject-stat="resources"]')
        if hero and badge and resources_stat:
            subject = normalize_subject_name(badge.get_text(" ", strip=True))
            rel_dir = path.parent.relative_to(ROOT).as_posix() + "/"
            matching = [
                item for item in resources.get("resources", [])
                if normalize_subject_name(item.get("subject", "")) == subject
                and item.get("page", "").startswith(rel_dir)
            ]
            if matching:
                displayed = resources_stat.get_text(" ", strip=True)
                assert not displayed.startswith("0"), (
                    "subject page shows zero resources despite central data",
                    path,
                    subject,
                    len(matching),
                )

    assert stats["resources"] == len(resource_ids), stats
    assert stats["correctedResources"] == sum(
        1 for item in resources.get("resources", []) if item.get("corrected")
    ), stats
    assert stats["levels"] == len(level_ids), stats
    assert stats["subjects"] == len(subject_ids), stats

    # During migration the structured resources must still match the rendered cards.
    assert len(resource_ids) == total_cards, (len(resource_ids), total_cards)
    assert stats["correctedResources"] == corrected_cards, (
        stats["correctedResources"],
        corrected_cards,
    )

    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    locs = [
        line.strip()[len("<loc>"):-len("</loc>")]
        for line in sitemap.splitlines()
        if "<loc>" in line
    ]
    indexable_pages = []
    for path in pages:
        soup = BeautifulSoup(path.read_text(encoding="utf-8", errors="ignore"), "html.parser")
        robots_meta = soup.find("meta", attrs={"name": "robots"})
        robots_value = (robots_meta.get("content", "") if robots_meta else "").lower()
        if "noindex" not in robots_value:
            indexable_pages.append(path)

    assert len(locs) == len(set(locs)) == len(indexable_pages), (
        len(locs),
        len(indexable_pages),
    )
    assert all(loc.startswith(BASE_URL) for loc in locs)

    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    assert "Allow: /" in robots
    assert "Sitemap: " + BASE_URL + "sitemap.xml" in robots

    manifest = json.loads((ROOT / "site.webmanifest").read_text(encoding="utf-8"))
    assert manifest["lang"] == "ar-DZ" and manifest["dir"] == "rtl"
    assert manifest.get("display") == "standalone"
    assert len(manifest.get("shortcuts", [])) >= 3
    assert (ROOT / "service-worker.js").exists()
    assert (ROOT / "offline.html").exists()
    sw = (ROOT / "service-worker.js").read_text(encoding="utf-8")
    assert "offline.html" in sw and "APP_SHELL" in sw

    print(
        f"Validation passed: {len(pages)} pages, "
        f"{len(resource_ids)} resources, {len(subject_ids)} subjects, "
        f"{len(level_ids)} levels"
    )


if __name__ == "__main__":
    main()
