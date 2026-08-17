#!/usr/bin/env python3
"""Refresh SEO metadata for every complete HTML page without reformatting body markup."""

from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import quote

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
BASE_URL = "https://imadtbn.github.io/nadjah/"
BRAND = "منصة النجاح"
OG_IMAGE = BASE_URL + "assets/images/og-image.jpg"

PAGE_TITLES = {
    "index.html": "منصة النجاح | فروض واختبارات مصححة PDF في الجزائر",
    "about.html": "من نحن | منصة النجاح التعليمية",
    "branch.html": "الشعب الدراسية | منصة النجاح التعليمية",
    "contact.html": "اتصل بنا | منصة النجاح التعليمية",
    "disclaimer.html": "إخلاء المسؤولية | منصة النجاح التعليمية",
    "dmca.html": "DMCA | منصة النجاح التعليمية",
    "guide.html": "دليل المستخدم | منصة النجاح التعليمية",
    "levels.html": "الأطوار التعليمية في الجزائر | منصة النجاح",
    "subjects.html": "المواد الدراسية | منصة النجاح التعليمية",
    "privacy.html": "سياسة الخصوصية | منصة النجاح التعليمية",
    "terms.html": "شروط الاستخدام | منصة النجاح التعليمية",
}

PAGE_DESCRIPTIONS = {
    "index.html": "منصة النجاح التعليمية الجزائرية: فروض واختبارات مصححة PDF للابتدائي والمتوسط والثانوي، مع وصول مجاني ومنظم حسب المستوى والمادة.",
    "about.html": "تعرّف على منصة النجاح التعليمية ورسالتها في توفير نماذج الفروض والاختبارات المصححة مجانًا للطلاب والأساتذة في الجزائر.",
    "branch.html": "تصفح الشعب الدراسية في الطور الثانوي بالجزائر، واختر المسار للوصول إلى نماذج الفروض والاختبارات والموارد التعليمية.",
    "contact.html": "تواصل مع فريق منصة النجاح للاستفسارات والاقتراحات وبلاغات حقوق النشر المتعلقة بالمحتوى التعليمي.",
    "disclaimer.html": "إخلاء المسؤولية الخاص بمنصة النجاح، بما يوضح طبيعة المحتوى التعليمي وحدود استخدامه ومسؤولية المستخدم.",
    "dmca.html": "صفحة DMCA في منصة النجاح لاستقبال بلاغات حقوق النشر ومراجعة طلبات إزالة المحتوى وفق الإجراءات المعتمدة.",
    "guide.html": "دليل استخدام منصة النجاح للوصول إلى فروض واختبارات PDF، واختيار الطور والسنة والمادة وتحميل النماذج بسهولة.",
    "levels.html": "استكشف الأطوار التعليمية في الجزائر من التحضيري والابتدائي إلى المتوسط والثانوي، ثم انتقل إلى النماذج حسب السنة الدراسية.",
    "subjects.html": "تصفح المواد الدراسية المتاحة في منصة النجاح مثل العربية والرياضيات والفرنسية والإنجليزية والعلوم والتاريخ والجغرافيا.",
    "privacy.html": "سياسة الخصوصية في منصة النجاح، ومعلومات عامة حول البيانات والتقنيات المستخدمة أثناء زيارة الموقع.",
    "terms.html": "شروط استخدام منصة النجاح التعليمية، بما ينظم تصفح المحتوى التعليمي وتحميل النماذج واستخدام الموقع.",
}

REMOVABLE_META = {
    "description", "keywords", "author", "robots", "googlebot", "language", "application-name", "theme-color",
    "twitter:card", "twitter:site", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt",
    "og:locale", "og:type", "og:site_name", "og:title", "og:description", "og:url", "og:image", "og:image:secure_url",
    "og:image:type", "og:image:width", "og:image:height", "og:image:alt",
}
REMOVABLE_REL = {"canonical", "alternate", "manifest", "sitemap", "icon", "apple-touch-icon", "preload"}


def compact(text: str) -> str:
    return " ".join(text.split())


def canonical_for(path: Path) -> str:
    relative = path.relative_to(ROOT).as_posix()
    return BASE_URL if relative == "index.html" else BASE_URL + quote(relative)


def page_title(path: Path, soup: BeautifulSoup) -> str:
    relative = path.relative_to(ROOT).as_posix()
    if relative == "index.html":
        return PAGE_TITLES["index.html"]
    if path.parent == ROOT / "pages":
        return PAGE_TITLES.get(path.name, compact(soup.title.get_text(" ", strip=True)) if soup.title else BRAND)
    existing = compact(soup.title.get_text(" ", strip=True)) if soup.title else ""
    return existing.replace("منصة النجاح التعليمية", BRAND) if existing else BRAND


def page_description(path: Path, soup: BeautifulSoup, title: str) -> str:
    if path.parent == ROOT / "pages" and path.name in PAGE_DESCRIPTIONS:
        return PAGE_DESCRIPTIONS[path.name]
    heading = soup.find("h1")
    if heading:
        return f"{compact(heading.get_text(' ', strip=True))} في منصة النجاح: نماذج فروض واختبارات وتمارين تعليمية بصيغة PDF مع تنظيم حسب المستوى والمادة."
    return f"{title}. نماذج فروض واختبارات وموارد تعليمية مجانية للطلاب والأساتذة في الجزائر."


def breadcrumbs(path: Path, title: str, canonical: str) -> list[dict[str, object]]:
    relative = path.relative_to(ROOT).parts
    items: list[dict[str, object]] = [{"@type": "ListItem", "position": 1, "name": "الرئيسية", "item": BASE_URL}]
    if relative[0] == "pages":
        if path.name not in {"about.html", "contact.html", "privacy.html", "terms.html", "dmca.html", "disclaimer.html"}:
            items.append({"@type": "ListItem", "position": 2, "name": "التصفح التعليمي", "item": BASE_URL + "pages/levels.html"})
    elif relative[0] == "levels":
        section_names = {"primary": "الطور الابتدائي", "middle": "الطور المتوسط", "branch": "الطور الثانوي"}
        section = section_names.get(relative[1] if len(relative) > 1 else "", "الأطوار التعليمية")
        items.append({"@type": "ListItem", "position": 2, "name": section, "item": BASE_URL + "pages/levels.html"})
        if path.name.endswith("-more.html"):
            items.append({"@type": "ListItem", "position": 3, "name": title.split(" | ", 1)[0], "item": canonical})
    return items


def json_ld(path: Path, title: str, description: str, canonical: str) -> str:
    deep = path.name.endswith("-more.html")
    graph: list[dict[str, object]] = [
        {"@type": "Organization", "@id": BASE_URL + "#organization", "name": BRAND, "url": BASE_URL, "logo": {"@type": "ImageObject", "url": BASE_URL + "assets/images/icon22.png"}, "sameAs": [BASE_URL]},
        {"@type": "WebSite", "@id": BASE_URL + "#website", "name": BRAND, "url": BASE_URL, "inLanguage": "ar-DZ", "publisher": {"@id": BASE_URL + "#organization"}},
        {"@type": ["WebPage", "LearningResource"] if deep else ["WebPage"], "@id": canonical + "#webpage", "url": canonical, "name": title, "description": description, "inLanguage": "ar-DZ", "isPartOf": {"@id": BASE_URL + "#website"}, "breadcrumb": {"@id": canonical + "#breadcrumb"}},
        {"@type": "BreadcrumbList", "@id": canonical + "#breadcrumb", "itemListElement": breadcrumbs(path, title, canonical)},
    ]
    if deep:
        graph[2].update({"learningResourceType": "نماذج فروض واختبارات", "isAccessibleForFree": True})
    return json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, separators=(",", ":"))


def metadata_html(path: Path, title: str, description: str, canonical: str) -> str:
    depth = len(path.relative_to(ROOT).parent.parts)
    asset_prefix = "../" * depth
    icon = asset_prefix + "assets/images/icon22.png"
    manifest = asset_prefix + "site.webmanifest"
    sitemap = asset_prefix + "sitemap.xml"
    og_type = "article" if path.name.endswith("-more.html") else "website"
    return f'''    <title>{title}</title>
    <meta name="description" content="{description}">
    <meta name="author" content="{BRAND}">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <meta name="googlebot" content="index, follow, max-image-preview:large">
    <meta name="language" content="Arabic">
    <meta name="application-name" content="{BRAND}">
    <meta name="theme-color" content="#0f172a">
    <link rel="canonical" href="{canonical}">
    <link rel="alternate" hreflang="ar-DZ" href="{canonical}">
    <link rel="alternate" hreflang="x-default" href="{canonical}">
    <link rel="sitemap" type="application/xml" href="{sitemap}">
    <link rel="manifest" href="{manifest}">
    <link rel="icon" type="image/png" sizes="32x32" href="{icon}">
    <link rel="apple-touch-icon" href="{icon}">
    <meta property="og:locale" content="ar_DZ">
    <meta property="og:type" content="{og_type}">
    <meta property="og:site_name" content="{BRAND}">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{description}">
    <meta property="og:url" content="{canonical}">
    <meta property="og:image" content="{OG_IMAGE}">
    <meta property="og:image:secure_url" content="{OG_IMAGE}">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1920">
    <meta property="og:image:height" content="1920">
    <meta property="og:image:alt" content="{BRAND} - موارد تعليمية وفروض واختبارات PDF">
    <meta name="twitter:card" content="summary_large_image">

    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{description}">
    <meta name="twitter:image" content="{OG_IMAGE}">
    <meta name="twitter:image:alt" content="{BRAND} - موارد تعليمية وفروض واختبارات PDF">
    <script type="application/ld+json">{json_ld(path, title, description, canonical)}</script>'''


def tag_name_and_attrs(tag: str) -> tuple[str, dict[str, str]]:
    fragment = BeautifulSoup(tag, "html.parser").find()
    if not fragment:
        return "", {}
    attrs = {str(key).lower(): " ".join(value) if isinstance(value, list) else str(value).lower() for key, value in fragment.attrs.items()}
    return fragment.name.lower(), attrs


def remove_old_metadata(head: str) -> str:
    head = re.sub(r"\s*<title\b[^>]*>.*?</title\s*>", "", head, flags=re.IGNORECASE | re.DOTALL)
    pattern = re.compile(r"<meta\b[^>]*>|<link\b[^>]*>|<script\s+type=[\"']application/ld\+json[\"'][^>]*>.*?</script\s*>", re.IGNORECASE | re.DOTALL)

    def keep_or_remove(match: re.Match[str]) -> str:
        tag = match.group(0)
        name, attrs = tag_name_and_attrs(tag)
        if name == "meta":
            key = attrs.get("name", attrs.get("property", ""))
            return "" if key in REMOVABLE_META else tag
        if name == "link":
            rels = set(attrs.get("rel", "").split())
            return "" if rels & REMOVABLE_REL else tag
        return ""

    cleaned = pattern.sub(keep_or_remove, head)
    return re.sub(
        r"(?:[ \t]*\r?\n){3,}",
        lambda match: "\r\n\r\n" if "\r\n" in match.group(0) else "\n\n",
        cleaned,
    )


def refresh(path: Path) -> bool:
    raw = path.read_bytes().decode("utf-8", errors="ignore")
    match = re.search(r"<head\b[^>]*>.*?</head\s*>", raw, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return False
    old_head = BeautifulSoup(match.group(0), "html.parser")
    title = page_title(path, old_head)
    description = page_description(path, old_head, title)
    canonical = canonical_for(path)
    clean_head = remove_old_metadata(match.group(0))
    viewport = re.search(r"<meta\b[^>]*name=[\"']viewport[\"'][^>]*>", clean_head, flags=re.IGNORECASE)
    insert_at = viewport.end() if viewport else clean_head.lower().find(">") + 1
    newline = "\r\n" if "\r\n" in raw else "\n"
    metadata = metadata_html(path, title, description, canonical).replace("\n", newline)
    new_head = clean_head[:insert_at] + newline + metadata + clean_head[insert_at:]
    path.write_bytes((raw[:match.start()] + new_head + raw[match.end():]).encode("utf-8"))
    return True


def main() -> None:
    html_files = [p for p in sorted(ROOT.rglob("*.html")) if ".git" not in p.parts]
    updated = sum(refresh(path) for path in html_files)
    print(f"Refreshed SEO metadata in {updated} HTML pages")


if __name__ == "__main__":
    main()
