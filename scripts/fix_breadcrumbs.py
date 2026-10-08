#!/usr/bin/env python3
"""Repair broken local breadcrumb links conservatively across all HTML pages."""

from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import unquote, urlsplit

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
BASE_URL = "https://imadtbn.github.io/nadjah/"


def clean_text(value: str) -> str:
    return " ".join((value or "").split())


def html_pages() -> list[Path]:
    return [p for p in sorted(ROOT.rglob("*.html")) if ".git" not in p.parts]


def split_href(href: str) -> tuple[str, str, str]:
    parts = urlsplit(href.strip())
    return unquote(parts.path), parts.query, parts.fragment


def existing_target(page: Path, href: str) -> Path | None:
    href = href.strip()
    if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
        return None

    parts = urlsplit(href)
    if parts.scheme in {"http", "https"}:
        if not href.startswith(BASE_URL):
            return None
        raw_path = unquote(parts.path)
        prefix = "/nadjah/"
        if raw_path.startswith(prefix):
            rel = raw_path[len(prefix):]
        elif raw_path == "/nadjah":
            rel = "index.html"
        else:
            return None
        target = (ROOT / rel).resolve()
    else:
        raw_path = unquote(parts.path).strip()
        if raw_path.startswith("/nadjah/"):
            target = (ROOT / raw_path[len("/nadjah/"):]).resolve()
        elif raw_path.startswith("/"):
            target = (ROOT / raw_path.lstrip("/")).resolve()
        else:
            target = (page.parent / raw_path).resolve()

    try:
        target.relative_to(ROOT)
    except ValueError:
        return None

    if target.is_dir():
        target = target / "index.html"
    return target if target.exists() else None


def relative_href(page: Path, target: Path, query: str = "", fragment: str = "") -> str:
    rel = os.path.relpath(target, page.parent).replace(os.sep, "/")
    if query:
        rel += "?" + query
    if fragment:
        rel += "#" + fragment
    return rel


def semantic_target(label: str) -> Path | None:
    label = clean_text(label)
    if "الرئيسية" in label:
        return ROOT / "index.html"
    if "الأطوار" in label or label.startswith("الطور "):
        return ROOT / "pages" / "levels.html"
    if label in {"المواد", "المواد الدراسية", "المواد التعليمية"}:
        return ROOT / "pages" / "subjects.html"
    if "الشعب" in label:
        return ROOT / "pages" / "branch.html"
    if "تواصل" in label or "اتصل" in label:
        return ROOT / "pages" / "contact.html"
    return None


def build_basename_index(pages: list[Path]) -> dict[str, list[Path]]:
    index: dict[str, list[Path]] = {}
    for path in pages:
        index.setdefault(path.name.casefold(), []).append(path)
    return index


def normalize_semester_breadcrumb(page: Path, soup: BeautifulSoup) -> bool:
    crumb = soup.select_one(".breadcrumb")
    if not crumb or not page.name.endswith("-more.html"):
        return False

    semester_match = None
    for value, label in (("smst1", "الفصل الأول"), ("smst2", "الفصل الثاني"), ("smst3", "الفصل الثالث")):
        if value in page.parts:
            semester_match = (value, label)
            break
    if not semester_match:
        return False

    subject_page_name = page.name
    subject_page_name = subject_page_name.replace("-sem01-more.html", ".html")
    subject_page_name = subject_page_name.replace("-sem02-more.html", ".html")
    subject_page_name = subject_page_name.replace("-sem03-more.html", ".html")
    subject_page = page.parent.parent / subject_page_name
    if not subject_page.exists():
        return False

    links = list(crumb.select("a[href]"))
    if len(links) < 3:
        return False

    home = links[0]
    cycle = links[1]
    year = links[2]

    subject_badge = soup.select_one(".subject-badge span")
    current = crumb.select_one(".breadcrumb-current")
    subject_label = clean_text(subject_badge.get_text(" ", strip=True) if subject_badge else "")
    if not subject_label and current:
        subject_label = clean_text(current.get_text(" ", strip=True))
    if not subject_label:
        return False

    def clone_link(source):
        return BeautifulSoup(str(source), "html.parser").find("a")

    crumb.clear()
    for index, link in enumerate((home, cycle, year)):
        crumb.append(clone_link(link))
        sep = soup.new_tag("i")
        sep["class"] = ["fas", "fa-chevron-left"]
        crumb.append(sep)

    subject_link = soup.new_tag("a", href=relative_href(page, subject_page))
    subject_link.string = subject_label
    crumb.append(subject_link)

    sep = soup.new_tag("i")
    sep["class"] = ["fas", "fa-chevron-left"]
    crumb.append(sep)

    span = soup.new_tag("span")
    span["class"] = ["breadcrumb-current"]
    span.string = semester_match[1]
    crumb.append(span)
    return True


def repair_page(page: Path, basename_index: dict[str, list[Path]]) -> tuple[bool, list[str]]:
    raw = page.read_text(encoding="utf-8", errors="ignore")
    if "breadcrumb" not in raw:
        return False, []

    soup = BeautifulSoup(raw, "html.parser")
    crumb = soup.select_one(".breadcrumb")
    if not crumb:
        return False, []

    dirty = normalize_semester_breadcrumb(page, soup)
    crumb = soup.select_one(".breadcrumb")
    unresolved: list[str] = []

    for link in crumb.select("a[href]"):
        original = link.get("href", "")
        href = original.strip()
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue

        # External links are not breadcrumb navigation targets for this site.
        parts = urlsplit(href)
        if parts.scheme in {"http", "https"} and not href.startswith(BASE_URL):
            continue

        if existing_target(page, href):
            # Remove accidental whitespace that can itself break GitHub Pages URLs.
            if original != href:
                link["href"] = href
                dirty = True
            continue

        path_part, query, fragment = split_href(href)
        candidate: Path | None = None

        semantic = semantic_target(link.get_text(" ", strip=True))
        if semantic and semantic.exists():
            candidate = semantic

        if candidate is None:
            basename = Path(path_part.rstrip("/")).name
            matches = basename_index.get(basename.casefold(), []) if basename else []
            if len(matches) == 1:
                candidate = matches[0]

        if candidate is not None:
            link["href"] = relative_href(page, candidate, query=query, fragment=fragment)
            dirty = True
        else:
            unresolved.append(f"{page.relative_to(ROOT).as_posix()}: {href}")

    if dirty:
        page.write_text(str(soup), encoding="utf-8")

    return dirty, unresolved


def main() -> None:
    pages = html_pages()
    basename_index = build_basename_index(pages)
    changed = 0
    unresolved: list[str] = []

    for page in pages:
        dirty, missing = repair_page(page, basename_index)
        changed += int(dirty)
        unresolved.extend(missing)

    print(f"Breadcrumb repair: {changed} pages updated")
    if unresolved:
        print(f"Unresolved breadcrumb links: {len(unresolved)}")
        for item in unresolved[:80]:
            print(" -", item)


if __name__ == "__main__":
    main()
