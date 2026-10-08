#!/usr/bin/env python3
"""Synchronize static HTML markup and generated statistics from central JSON data."""

from __future__ import annotations

import json
import re
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "assets" / "data"


def load_json(name: str) -> dict:
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


def clean(text: str) -> str:
    return " ".join((text or "").split())


def save_soup(path: Path, soup: BeautifulSoup) -> None:
    path.write_text(str(soup), encoding="utf-8")


def normalize_subject_name(value: str) -> str:
    value = clean(value)
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


def semester_label(value: object) -> str:
    labels = {1: "الأول", 2: "الثاني", 3: "الثالث", "1": "الأول", "2": "الثاني", "3": "الثالث"}
    return labels.get(value, str(value or ""))


def canonical_resource_title(item: dict, type_index: int = 1) -> str:
    subject = normalize_subject_name(item.get("subject", "")) or "المادة"
    semester = semester_label(item.get("semester"))
    resource_type = item.get("type")

    if resource_type == "homework":
        suffix = f" {type_index}" if type_index > 1 else ""
        return f"فرض{suffix} الفصل {semester} - {subject}"
    if resource_type == "exam":
        suffix = f" {type_index}" if type_index > 1 else ""
        return f"اختبار{suffix} الفصل {semester} - {subject}"
    if resource_type == "exercise":
        suffix = f" {type_index}" if type_index > 1 else ""
        return f"سلسلة تمارين{suffix} - {subject}"
    if resource_type == "revision":
        suffix = f" {type_index}" if type_index > 1 else ""
        return f"مراجعة شاملة{suffix} - الفصل {semester}"
    return clean(item.get("title", "")) or f"نموذج - {subject}"


def sync_resource_copy(resources: dict) -> int:
    changed = 0
    by_page: dict[str, list[dict]] = {}
    for item in resources.get("resources", []):
        by_page.setdefault(item.get("page", ""), []).append(item)

    contaminated_terms = (
        "القراءة والإملاء",
        "القواعد النحوية",
        "التعبير الكتابي",
        "القراءة، الإملاء، القواعد، والتعبير",
    )

    for rel_page, items in by_page.items():
        if not rel_page:
            continue
        items.sort(key=lambda item: item.get("position", 0))
        counters: dict[str, int] = {}
        for item in items:
            subject = normalize_subject_name(item.get("subject", ""))
            title = clean(item.get("title", ""))
            is_arabic = subject == "اللغة العربية"
            contaminated = (not is_arabic and any(term in title for term in contaminated_terms))
            if contaminated:
                resource_type = item.get("type", "")
                counters[resource_type] = counters.get(resource_type, 0) + 1
                item["title"] = canonical_resource_title(item, counters[resource_type])
                changed += 1
            else:
                resource_type = item.get("type", "")
                counters[resource_type] = counters.get(resource_type, 0) + 1

    if changed:
        (DATA_DIR / "resources.json").write_text(
            json.dumps(resources, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    return changed


def sync_subject_page_stats_and_copy(resources: dict) -> int:
    items = resources.get("resources", [])
    changed_pages = 0

    for path in sorted((ROOT / "levels").rglob("*.html")):
        raw = path.read_text(encoding="utf-8", errors="ignore")
        soup = BeautifulSoup(raw, "html.parser")
        hero = soup.select_one(".hero-subject")
        if not hero:
            continue

        badge = hero.select_one(".subject-badge span")
        if not badge:
            continue

        subject = normalize_subject_name(badge.get_text(" ", strip=True))
        rel_dir = path.parent.relative_to(ROOT).as_posix() + "/"

        matching = [
            item for item in items
            if normalize_subject_name(item.get("subject", "")) == subject
            and item.get("page", "").startswith(rel_dir)
        ]

        # For semester detail pages, restrict statistics to that semester/page.
        page_name = path.name
        semester_match = re.search(r"sem0?([123])", page_name)
        if semester_match:
            semester = int(semester_match.group(1))
            matching = [
                item for item in matching
                if int(item.get("semester") or 0) == semester
                and item.get("page") == path.relative_to(ROOT).as_posix()
            ]

        dirty = False
        total = len(matching)
        corrected = sum(1 for item in matching if item.get("corrected"))
        rate = round(corrected / total * 100) if total else 0

        resources_el = soup.select_one('[data-subject-stat="resources"]')
        if resources_el:
            desired = f'{total} <small>نموذج</small>'
            if str(resources_el.decode_contents()).strip() != desired:
                resources_el.clear()
                resources_el.append(str(total) + " ")
                small = soup.new_tag("small")
                small.string = "نموذج"
                resources_el.append(small)
                dirty = True

        correction_el = soup.select_one('[data-subject-stat="correctionRate"]')
        if correction_el:
            desired = f'{rate}% <small>مصحح</small>'
            if str(correction_el.decode_contents()).strip() != desired:
                correction_el.clear()
                correction_el.append(f"{rate}% ")
                small = soup.new_tag("small")
                small.string = "مصحح"
                correction_el.append(small)
                dirty = True

        desc = soup.select_one(".hero-subject-desc")
        if desc:
            semester_text = ""
            if semester_match:
                semester_text = f" للفصل {semester_label(int(semester_match.group(1)))}"
            new_desc = (
                f"مجموعة من الفروض والاختبارات والتمارين والمراجعات في مادة {subject}"
                f"{semester_text}، مرتبة ومنظمة مع روابط المعاينة والتحميل المتاحة."
            )
            if clean(desc.get_text(" ", strip=True)) != new_desc:
                desc.string = new_desc
                dirty = True

        # Keep visible card titles synchronized with central JSON.
        by_id = {item.get("id"): item for item in matching}
        for card in soup.select(".doc-card[data-resource-id]"):
            item = by_id.get(card.get("data-resource-id"))
            title_el = card.select_one(".doc-title")
            if item and title_el and clean(title_el.get_text(" ", strip=True)) != clean(item.get("title", "")):
                title_el.string = item["title"]
                dirty = True

        if dirty:
            save_soup(path, soup)
            changed_pages += 1

    return changed_pages


def enrich_resources(resources: dict, branches: dict) -> None:
    branch_names = {clean(item.get("name", "")) for item in branches.get("branches", [])}

    for item in resources.get("resources", []):
        trail = [clean(value) for value in item.get("breadcrumb", []) if clean(value)]

        branch = next((value for value in trail if value in branch_names), None)
        if branch:
            item["branch"] = branch

        level = next(
            (
                value for value in trail
                if value.startswith("السنة ")
                or "تحضيري" in value
                or "بكالوريا" in value
                or "المتوسط" in value
            ),
            None,
        )
        if level:
            item["levelLabel"] = level

    (DATA_DIR / "resources.json").write_text(
        json.dumps(resources, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def sync_level_ids(levels: dict) -> int:
    mapping = {}
    for cycle in levels.get("cycles", []):
        for level in cycle.get("levels", []):
            mapping[(level.get("href"), clean(level.get("name", "")))] = level

    changed = 0
    for path in sorted(ROOT.rglob("*.html")):
        if ".git" in path.parts:
            continue
        soup = BeautifulSoup(path.read_text(encoding="utf-8", errors="ignore"), "html.parser")
        dirty = False
        for link in soup.select("a.year-btn[href]"):
            href = link.get("href", "").split("#", 1)[0]
            try:
                target = (path.parent / href).resolve().relative_to(ROOT).as_posix()
            except ValueError:
                continue
            label = clean(link.get_text(" ", strip=True))
            level = mapping.get((target, label))
            if level and link.get("data-level-id") != level["id"]:
                link["data-level-id"] = level["id"]
                link["data-cycle-id"] = level["cycleId"]
                dirty = True
        if dirty:
            save_soup(path, soup)
            changed += 1
    return changed


def sync_branch_ids(branches: dict) -> int:
    mapping = {item.get("href"): item for item in branches.get("branches", [])}
    path = ROOT / "pages" / "branch.html"
    if not path.exists():
        return 0

    soup = BeautifulSoup(path.read_text(encoding="utf-8", errors="ignore"), "html.parser")
    dirty = False
    for link in soup.select(".level-card a.year-btn[href]"):
        href = link.get("href", "").split("#", 1)[0]
        target = (path.parent / href).resolve().relative_to(ROOT).as_posix()
        item = mapping.get(target)
        if item and link.get("data-branch-id") != item["id"]:
            link["data-branch-id"] = item["id"]
            dirty = True
    if dirty:
        save_soup(path, soup)
        return 1
    return 0


def sync_subject_ids(subjects: dict) -> int:
    by_name = {item["name"]: item for item in subjects.get("subjects", [])}
    changed = 0

    for path in sorted(ROOT.rglob("*.html")):
        if ".git" in path.parts:
            continue
        soup = BeautifulSoup(path.read_text(encoding="utf-8", errors="ignore"), "html.parser")
        dirty = False

        for card in soup.select("a.subject-card"):
            title = card.select_one("h4")
            if not title:
                continue
            item = by_name.get(clean(title.get_text(" ", strip=True)))
            if item and card.get("data-subject-id") != item["id"]:
                card["data-subject-id"] = item["id"]
                dirty = True

        subject_badge = soup.select_one(".subject-badge span")
        if subject_badge:
            item = by_name.get(clean(subject_badge.get_text(" ", strip=True)))
            if item:
                root = soup.select_one(".hero-subject") or soup.body
                if root and root.get("data-subject-id") != item["id"]:
                    root["data-subject-id"] = item["id"]
                    dirty = True

        if dirty:
            save_soup(path, soup)
            changed += 1

    return changed


def sync_resource_ids(resources: dict) -> int:
    by_page: dict[str, list[dict]] = {}
    for item in resources.get("resources", []):
        by_page.setdefault(item["page"], []).append(item)

    changed = 0
    for rel_page, items in by_page.items():
        path = ROOT / rel_page
        if not path.exists():
            continue
        soup = BeautifulSoup(path.read_text(encoding="utf-8", errors="ignore"), "html.parser")
        cards = soup.select(".doc-card")
        dirty = False

        items = sorted(items, key=lambda item: item.get("position", 0))
        for card, item in zip(cards, items):
            if card.get("data-resource-id") != item["id"]:
                card["data-resource-id"] = item["id"]
                dirty = True

            # JSON is authoritative for resource classification/correction state and links.
            if item.get("type") and card.get("data-type") != item["type"]:
                card["data-type"] = item["type"]
                dirty = True

            preview = card.select_one("[onclick*='previewPDF']")
            if preview and item.get("previewUrl"):
                desired = f"previewPDF('{item['previewUrl']}')"
                if preview.get("onclick") != desired:
                    preview["onclick"] = desired
                    dirty = True

            download = card.select_one("a.doc-download-btn")
            if download and item.get("downloadUrl") and download.get("href") != item["downloadUrl"]:
                download["href"] = item["downloadUrl"]
                dirty = True

            buttons = card.select_one(".doc-buttons")
            if buttons and not buttons.select_one("a.resource-detail-link"):
                depth = len(path.parent.relative_to(ROOT).parts)
                prefix = "../" * depth
                detail = soup.new_tag(
                    "a",
                    href=f"{prefix}resources/{item['id']}.html",
                )
                detail["class"] = ["doc-download-btn", "resource-detail-link"]
                icon = soup.new_tag("i")
                icon["class"] = ["fas", "fa-arrow-up-right-from-square"]
                detail.append(icon)
                detail.append(" صفحة النموذج")
                buttons.append(detail)
                dirty = True

        if dirty:
            save_soup(path, soup)
            changed += 1

    return changed


def sync_subject_counts(resources: dict) -> int:
    # Counts on year pages are calculated from actual resource page destinations.
    resource_count_by_subject_page: dict[str, int] = {}
    for item in resources.get("resources", []):
        page = item.get("page", "")
        # /smstX/...-more.html -> parent subject page lives one directory above smstX.
        match = re.search(r"^(.*?/)(smst[123]/)[^/]+-more\.html$", page)
        if match:
            subject_dir = match.group(1)
            # aggregate later via subject links; exact subject root inferred from sibling name prefix
            resource_count_by_subject_page[subject_dir] = resource_count_by_subject_page.get(subject_dir, 0) + 1

    changed = 0
    for path in sorted((ROOT / "levels").rglob("*.html")):
        soup = BeautifulSoup(path.read_text(encoding="utf-8", errors="ignore"), "html.parser")
        dirty = False
        for card in soup.select("a.subject-card[href]"):
            count_el = card.select_one(".subject-count")
            if not count_el:
                continue
            href = card.get("href", "").split("#", 1)[0]
            try:
                target = (path.parent / href).resolve().relative_to(ROOT).as_posix()
            except ValueError:
                continue

            # Count resources whose breadcrumb/subject page path shares the target stem directory.
            target_path = Path(target)
            stem_key = target_path.parent.as_posix() + "/"
            count = resource_count_by_subject_page.get(stem_key)
            if count is None:
                continue

            label = "نموذج" if count == 1 else "نماذج"
            desired = f'<i class="fas fa-file-pdf"></i> {count} {label}'
            if str(count_el.decode_contents()).strip() != desired:
                count_el.clear()
                icon = soup.new_tag("i")
                icon["class"] = ["fas", "fa-file-pdf"]
                count_el.append(icon)
                count_el.append(f" {count} {label}")
                dirty = True

        if dirty:
            save_soup(path, soup)
            changed += 1

    return changed


def write_stats(levels: dict, subjects: dict, resources: dict) -> None:
    items = resources.get("resources", [])
    corrected = sum(1 for item in items if item.get("corrected"))
    level_count = sum(len(cycle.get("levels", [])) for cycle in levels.get("cycles", []))

    stats = {
        "resources": len(items),
        "correctedResources": corrected,
        "correctionRate": round(corrected / len(items) * 100) if items else 0,
        "levels": level_count,
        "subjects": len(subjects.get("subjects", [])),
        "pages": len([p for p in ROOT.rglob("*.html") if ".git" not in p.parts]),
        "generatedFrom": "central JSON catalogs",
    }
    (DATA_DIR / "site-stats.json").write_text(
        json.dumps(stats, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    levels = load_json("levels.json")
    branches = load_json("branches.json")
    subjects = load_json("subjects.json")
    resources = load_json("resources.json")

    enrich_resources(resources, branches)
    copy_fixes = sync_resource_copy(resources)

    results = {
        "levelPages": sync_level_ids(levels),
        "branchPages": sync_branch_ids(branches),
        "subjectPages": sync_subject_ids(subjects),
        "resourcePages": sync_resource_ids(resources),
        "countPages": sync_subject_counts(resources),
        "subjectStatCopyPages": sync_subject_page_stats_and_copy(resources),
        "resourceCopyFixes": copy_fixes,
    }
    write_stats(levels, subjects, resources)
    print(json.dumps(results, ensure_ascii=False))


if __name__ == "__main__":
    main()
