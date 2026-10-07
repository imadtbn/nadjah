#!/usr/bin/env python3
"""One-time migration of the existing static Nadjah content into central JSON catalogs.

After the JSON files exist, they become the canonical content source. Re-run with
--force only when intentionally importing legacy HTML again.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "assets" / "data"


def clean(text: str) -> str:
    return " ".join((text or "").split())


def stable_id(prefix: str, *parts: str) -> str:
    raw = "|".join(clean(part).lower() for part in parts if part)
    return f"{prefix}-{hashlib.sha1(raw.encode('utf-8')).hexdigest()[:10]}"


def relative_href(path: Path, href: str) -> str:
    if not href or href.startswith(("http://", "https://", "#", "mailto:", "tel:")):
        return href
    return (path.parent / href.split("#", 1)[0]).resolve().relative_to(ROOT).as_posix()


def load(path: Path) -> BeautifulSoup:
    return BeautifulSoup(path.read_text(encoding="utf-8", errors="ignore"), "html.parser")


def migrate_levels() -> dict:
    path = ROOT / "pages" / "levels.html"
    soup = load(path)
    cycles = []

    cycle_aliases = [
        ("primary", "ابتدائي"),
        ("middle", "متوسط"),
        ("secondary", "ثانوي"),
    ]

    for index, card in enumerate(soup.select(".level-card")):
        name = clean(card.select_one("h3").get_text(" ", strip=True) if card.select_one("h3") else "")
        cycle_id = next((cid for cid, keyword in cycle_aliases if keyword in name), f"cycle-{index + 1}")
        icon = ""
        icon_el = card.select_one(".level-icon i")
        if icon_el:
            icon = " ".join(icon_el.get("class", []))

        levels = []
        seen = set()
        for link in card.select("a.year-btn[href]"):
            href = relative_href(path, link.get("href", ""))
            label = clean(link.get_text(" ", strip=True))
            key = (href, label)
            if key in seen:
                continue
            seen.add(key)
            levels.append({
                "id": stable_id("level", cycle_id, href, label),
                "cycleId": cycle_id,
                "name": label,
                "href": href,
            })

        cycles.append({
            "id": cycle_id,
            "name": name,
            "icon": icon,
            "levels": levels,
        })

    return {"schemaVersion": 1, "cycles": cycles}


def migrate_branches() -> dict:
    path = ROOT / "pages" / "branch.html"
    soup = load(path)
    branches = []

    for link in soup.select(".level-card a.year-btn[href]"):
        name = clean(link.get_text(" ", strip=True))
        href = relative_href(path, link.get("href", ""))
        branches.append({
            "id": stable_id("branch", href, name),
            "name": name,
            "href": href,
        })

    unique = {item["href"]: item for item in branches}
    return {"schemaVersion": 1, "branches": list(unique.values())}


def migrate_subjects() -> dict:
    subjects: dict[str, dict] = {}

    for path in sorted(ROOT.rglob("*.html")):
        if ".git" in path.parts:
            continue
        soup = load(path)
        for card in soup.select("a.subject-card[href]"):
            title_el = card.select_one("h4")
            if not title_el:
                continue
            name = clean(title_el.get_text(" ", strip=True))
            href = relative_href(path, card.get("href", ""))
            desc_el = card.select_one(".subject-info p")
            icon_el = card.select_one(".subject-icon i")
            entry = {
                "id": stable_id("subject", name),
                "name": name,
                "description": clean(desc_el.get_text(" ", strip=True) if desc_el else ""),
                "icon": " ".join(icon_el.get("class", [])) if icon_el else "",
                "destinations": [],
            }
            current = subjects.setdefault(name, entry)
            if href and href not in current["destinations"]:
                current["destinations"].append(href)

    return {"schemaVersion": 1, "subjects": sorted(subjects.values(), key=lambda item: item["name"])}


def infer_cycle(path: Path) -> str | None:
    parts = set(path.parts)
    if "primary" in parts:
        return "primary"
    if "middle" in parts:
        return "middle"
    if "branch" in parts:
        return "secondary"
    return None


def infer_semester(path: Path, soup: BeautifulSoup) -> int | None:
    for part in path.parts:
        match = re.fullmatch(r"smst([123])", part)
        if match:
            return int(match.group(1))
    active = soup.select_one(".semester-content.active[id^='semester-']")
    if active:
        match = re.search(r"(\d+)$", active.get("id", ""))
        if match:
            return int(match.group(1))
    return None


def extract_onclick_url(value: str, fn_name: str) -> str | None:
    match = re.search(rf"{re.escape(fn_name)}\(['\"]([^'\"]+)['\"]", value or "")
    return match.group(1) if match else None


def migrate_resources() -> dict:
    resources = []

    for path in sorted(ROOT.rglob("*.html")):
        if ".git" in path.parts:
            continue

        soup = load(path)
        cards = soup.select(".doc-card")
        if not cards:
            continue

        subject_el = soup.select_one(".subject-badge span")
        subject = clean(subject_el.get_text(" ", strip=True) if subject_el else "")
        page_title = clean(soup.title.get_text(" ", strip=True) if soup.title else path.stem)
        breadcrumb = [clean(el.get_text(" ", strip=True)) for el in soup.select(".breadcrumb a, .breadcrumb-current")]
        semester = infer_semester(path.relative_to(ROOT), soup)
        cycle = infer_cycle(path.relative_to(ROOT))

        for index, card in enumerate(cards, start=1):
            title_el = card.select_one(".doc-title")
            title = clean(title_el.get_text(" ", strip=True) if title_el else f"نموذج {index}")
            resource_type = card.get("data-type", "")
            corrected = bool(card.select_one(".solution-badge.with-solution"))

            preview_el = card.select_one("[onclick*='previewPDF']")
            preview_url = extract_onclick_url(preview_el.get("onclick", ""), "previewPDF") if preview_el else None

            download_el = card.select_one("a.doc-download-btn[href]")
            download_url = download_el.get("href") if download_el else None

            meta = [clean(el.get_text(" ", strip=True)) for el in card.select(".doc-meta > span")]
            rel_page = path.relative_to(ROOT).as_posix()

            resources.append({
                "id": stable_id("resource", rel_page, str(index), title),
                "title": title,
                "type": resource_type or None,
                "cycleId": cycle,
                "subject": subject or None,
                "semester": semester,
                "corrected": corrected,
                "previewUrl": preview_url,
                "downloadUrl": download_url,
                "meta": meta,
                "page": rel_page,
                "pageTitle": page_title,
                "breadcrumb": breadcrumb,
                "position": index,
            })

    return {"schemaVersion": 1, "resources": resources}


def write_if_needed(name: str, payload: dict, force: bool) -> bool:
    path = DATA_DIR / name
    if path.exists() and not force:
        print(f"keep {path.relative_to(ROOT)} (already exists)")
        return False

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {path.relative_to(ROOT)}")
    return True


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Overwrite existing central JSON files")
    args = parser.parse_args()

    write_if_needed("levels.json", migrate_levels(), args.force)
    write_if_needed("branches.json", migrate_branches(), args.force)
    write_if_needed("subjects.json", migrate_subjects(), args.force)
    write_if_needed("resources.json", migrate_resources(), args.force)


if __name__ == "__main__":
    main()
