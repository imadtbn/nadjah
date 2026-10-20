#!/usr/bin/env python3
"""Validate SEO, central JSON catalogs, generated statistics and indexing files."""

from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import unquote, urlsplit

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


def breadcrumb_target_exists(page: Path, href: str) -> bool:
    href = (href or "").strip()
    if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
        return True

    parts = urlsplit(href)
    if parts.scheme in {"http", "https"}:
        if not href.startswith(BASE_URL):
            return True
        raw_path = unquote(parts.path)
        prefix = "/nadjah/"
        if raw_path == "/nadjah":
            target = ROOT / "index.html"
        elif raw_path.startswith(prefix):
            target = ROOT / raw_path[len(prefix):]
        else:
            return False
    else:
        raw_path = unquote(parts.path).strip()
        if raw_path.startswith("/nadjah/"):
            target = ROOT / raw_path[len("/nadjah/"):]
        elif raw_path.startswith("/"):
            target = ROOT / raw_path.lstrip("/")
        else:
            target = page.parent / raw_path

    target = target.resolve()
    try:
        target.relative_to(ROOT)
    except ValueError:
        return False
    if target.is_dir():
        target = target / "index.html"
    return target.exists()


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
        robots_meta = soup.find("meta", attrs={"name": "robots"})
        googlebot_meta = soup.find("meta", attrs={"name": "googlebot"})
        robots_content = (robots_meta.get("content", "") if robots_meta else "").lower()
        googlebot_content = (googlebot_meta.get("content", "") if googlebot_meta else "").lower()
        if "noindex" in robots_content:
            assert "noindex" in googlebot_content, (
                "Googlebot directive must not contradict the page noindex policy",
                path,
                robots_content,
                googlebot_content,
            )

        shared_core = [
            tag for tag in soup.find_all("script", src=True)
            if tag["src"].split("?", 1)[0].split("#", 1)[0].rstrip("/").endswith("assets/js/core.js")
        ]
        shared_ux = [
            tag for tag in soup.find_all("link", href=True)
            if "stylesheet" in tag.get("rel", [])
            and tag["href"].split("?", 1)[0].split("#", 1)[0].rstrip("/").endswith("assets/css/ux.css")
        ]
        assert len(shared_core) == 1, ("expected exactly one core.js reference", path, len(shared_core))
        assert len(shared_ux) == 1, ("expected exactly one ux.css reference", path, len(shared_ux))
        assert shared_core[0].get("data-nadjah-core") == "true", (
            "expected core.js runtime-loader marker",
            path,
        )
        assert shared_ux[0].get("data-nadjah-ux") == "true", (
            "expected ux.css runtime-loader marker",
            path,
        )

        external_scripts = [
            tag.get("src", "") for tag in soup.find_all("script", src=True)
        ]
        has_shader = soup.select_one("#shader-canvas") is not None
        inline_scripts = "\n".join(
            tag.get_text(" ", strip=False)
            for tag in soup.find_all("script")
            if not tag.get("src")
        )
        needs_gsap = bool(soup.select_one(
            "#shader-canvas, .reveal, [data-stat-key], .hero-content, .semester-tab"
        )) or any(token in inline_scripts for token in ("gsap", "ScrollTrigger"))
        needs_lenis = has_shader or "Lenis" in inline_scripts

        if not has_shader:
            assert not any("three.min.js" in src for src in external_scripts), (
                "Three.js should only load on pages with a shader canvas",
                path,
            )
        if not needs_gsap:
            assert not any(
                name in src for src in external_scripts
                for name in ("gsap.min.js", "ScrollTrigger.min.js")
            ), ("unneeded GSAP libraries found", path)
        if not needs_lenis:
            assert not any("lenis.min.js" in src for src in external_scripts), (
                "Lenis should only load where smooth-scroll animation is needed",
                path,
            )

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

        for crumb_link in soup.select(".breadcrumb a[href]"):
            href = crumb_link.get("href", "")
            assert breadcrumb_target_exists(path, href), (
                "broken breadcrumb link",
                path,
                href,
                crumb_link.get_text(" ", strip=True),
            )

        ads = soup.select(".ad-slot[data-site-ad] ins.adsbygoogle, .ad-banner[data-site-ad] ins.adsbygoogle")
        if path.relative_to(ROOT).as_posix() == "offline.html":
            assert not ads, ("offline fallback should not load ad units", path)
            assert not any(
                tag.get("src", "").split("?", 1)[0].endswith("assets/js/site-tags.js")
                for tag in soup.find_all("script", src=True)
            ), ("offline fallback should not load ad scripts", path)
        else:
            assert len(ads) == 2, ("expected exactly two ads", path, len(ads))
            for ad in ads:
                assert ad.get("data-ad-client") == "ca-pub-5656416032906373", (path, ad)
                assert ad.get("data-ad-slot"), (path, ad)
                assert ad.get("data-full-width-responsive") == "true", (path, ad)

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
    app_shell = sw.split("const APP_SHELL = [", 1)[1].split("];", 1)[0]
    assert "./assets/data/resources.json" not in app_shell, (
        "large resources catalog must load on demand, not during service-worker install"
    )
    shell_paths = [
        entry.strip().rstrip(",").strip().strip("'\\\"")
        for entry in app_shell.splitlines()
        if entry.strip().startswith(("'", '"')) and entry.strip().rstrip(",").strip("'\\\"") != "./"
    ]
    missing_shell_assets = [
        item for item in shell_paths
        if not (ROOT / item.removeprefix("./")).exists()
    ]
    assert not missing_shell_assets, ("PWA app shell references missing assets", missing_shell_assets)
    for required_asset in (
        "./assets/css/style-main2.css",
        "./assets/css/ads.css",
        "./assets/css/ux.css",
        "./assets/js/core.js",
        "./offline.html",
    ):
        assert required_asset in app_shell, ("required offline shell asset missing", required_asset)

    core_js = (ROOT / "assets" / "js" / "core.js").read_text(encoding="utf-8")
    assert "function loadResources()" in core_js, "missing on-demand resource loader"
    assert "function loadStatistics()" in core_js, "missing deferred statistics loader"
    assert "['levels', 'subjects', 'branches'].map(loadJson)" in core_js, (
        "initial data load should exclude the large resources catalog"
    )

    search_js = (ROOT / "assets" / "js" / "search-page.js").read_text(encoding="utf-8")
    ux_css = (ROOT / "assets" / "css" / "ux.css").read_text(encoding="utf-8")
    optimizer = (ROOT / "scripts" / "optimize_html.py").read_text(encoding="utf-8")
    assert "def ensure_resource_hints" in optimizer, "missing targeted third-party preconnect optimization"
    assert "aria-activedescendant" in core_js and "const setActive" in core_js, (
        "shared search must support accessible keyboard navigation"
    )
    assert "title.textContent = item.title" in core_js, (
        "shared search results must render data as text rather than HTML"
    )
    assert "إعادة المحاولة" in core_js and "تعذر تحميل نتائج البحث" in core_js, (
        "shared search must provide a recoverable data-load error state"
    )
    assert "aria-modal" in core_js and "aria-labelledby" in core_js, (
        "mobile navigation sheet must expose dialog semantics"
    )
    assert "function resetAllFilters()" in search_js, (
        "search page must offer a reset action for empty results"
    )
    assert "إعادة تحميل النماذج" in search_js, (
        "search page must provide a data-load retry action"
    )
    assert ".nadjah-search-item[data-active]" in ux_css, (
        "keyboard-selected search suggestions need a visible focus state"
    )
    assert ".search-retry-btn:focus-visible" in ux_css, (
        "search recovery actions need a visible keyboard focus state"
    )

    # Phase 5: local user features, safe storage and share fallback.
    user_state_js = (ROOT / "assets" / "js" / "user-state.js").read_text(encoding="utf-8")
    my_page_js = (ROOT / "assets" / "js" / "my-page.js").read_text(encoding="utf-8")
    my_page = BeautifulSoup((ROOT / "pages" / "my.html").read_text(encoding="utf-8"), "html.parser")
    assert "function normalizeState(value)" in user_state_js, "local user data must be normalized before use"
    assert "function clearRecent()" in user_state_js and "function clearMetrics()" in user_state_js, (
        "users must be able to clear recent history and usage statistics separately"
    )
    assert "function isPersistent()" in user_state_js, "user hub must disclose temporary in-session storage"
    assert "document.execCommand('copy')" in user_state_js, "sharing needs a clipboard fallback"
    assert "user-card-remove" in my_page_js and "toggleFavorite(item.id)" in my_page_js, (
        "users must be able to remove saved items directly from the favorites list"
    )
    assert "مسح سجل المشاهدة" in my_page_js and "مسح إحصاءات الاستخدام" in my_page_js, (
        "user hub must expose independent history and metrics controls"
    )
    assert "title.textContent = item.title" in my_page_js, (
        "user library cards must render resource titles as text rather than HTML"
    )
    for required_id in (
        "clearUserData",
        "prefCycle",
        "prefLevel",
        "prefSubject",
        "prefSemester",
        "favoritesGrid",
        "recentGrid",
        "viewsGrid",
        "downloadsGrid",
        "recommendationsGrid",
    ):
        assert my_page.find(id=required_id), ("user hub is missing a required control or section", required_id)

    resource_pages = sorted((ROOT / "resources").glob("*.html"))
    assert resource_pages, "resource detail pages must exist"
    for resource_page in resource_pages:
        soup = BeautifulSoup(resource_page.read_text(encoding="utf-8", errors="ignore"), "html.parser")
        assert soup.select_one("main[data-resource-id]"), ("resource page must expose its resource id", resource_page)
        assert soup.select_one(".related-resources .related-resource-list"), (
            "resource page must preserve related resources",
            resource_page,
        )
        assert any("user-state.js" in script.get("src", "") for script in soup.find_all("script", src=True)), (
            "resource page must load local favorites/history/sharing features",
            resource_page,
        )

    print(
        f"Validation passed: {len(pages)} pages, "
        f"{len(resource_ids)} resources, {len(subject_ids)} subjects, "
        f"{len(level_ids)} levels; phase 5 user features checked"
    )


if __name__ == "__main__":
    main()
