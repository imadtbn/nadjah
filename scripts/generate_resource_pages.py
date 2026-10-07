#!/usr/bin/env python3
"""Generate one indexable, independent HTML page for every central resource."""

from __future__ import annotations

import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "assets" / "data" / "resources.json"
OUTPUT = ROOT / "resources"
BASE_URL = "https://imadtbn.github.io/nadjah/"

TYPE_LABELS = {
    "homework": "فرض",
    "exam": "اختبار",
    "exercise": "تمرين",
    "revision": "مراجعة",
}

CYCLE_LABELS = {
    "primary": "الطور الابتدائي",
    "middle": "الطور المتوسط",
    "secondary": "الطور الثانوي",
}


def esc(value: object) -> str:
    return html.escape(str(value or ""), quote=True)


def resource_url(resource_id: str) -> str:
    return f"{BASE_URL}resources/{resource_id}.html"


def related_items(resource: dict, resources: list[dict]) -> list[dict]:
    scored = []
    for other in resources:
        if other["id"] == resource["id"]:
            continue
        score = 0
        if other.get("subject") and other.get("subject") == resource.get("subject"):
            score += 5
        if other.get("cycleId") == resource.get("cycleId"):
            score += 2
        if other.get("semester") == resource.get("semester"):
            score += 2
        if other.get("type") == resource.get("type"):
            score += 1
        if score:
            scored.append((score, other))
    scored.sort(key=lambda pair: (-pair[0], pair[1].get("title", "")))
    return [item for _, item in scored[:6]]


def make_meta_chips(resource: dict) -> str:
    values = []
    if resource.get("subject"):
        values.append(resource["subject"])
    if resource.get("cycleId"):
        values.append(CYCLE_LABELS.get(resource["cycleId"], resource["cycleId"]))
    if resource.get("levelLabel"):
        values.append(resource["levelLabel"])
    if resource.get("branch"):
        values.append(resource["branch"])
    if resource.get("semester"):
        values.append(f"الفصل {resource['semester']}")
    values.append(TYPE_LABELS.get(resource.get("type"), "نموذج"))
    values.append("مع التصحيح" if resource.get("corrected") else "بدون تصحيح")
    for item in resource.get("meta", []):
        if item and item not in values and len(values) < 9:
            values.append(item)
    return "\n".join(
        f'<span class="resource-meta-chip">{esc(value)}</span>' for value in values
    )


def make_breadcrumb(resource: dict) -> str:
    parts = ['<a href="../index.html">الرئيسية</a><span>←</span>']
    for item in (resource.get("breadcrumb") or [])[1:]:
        parts.append(f"<span>{esc(item)}</span><span>←</span>")
    parts.append(f"<strong>{esc(resource['title'])}</strong>")
    return "\n".join(parts)


def make_actions(resource: dict) -> str:
    buttons = []
    preview = resource.get("previewUrl")
    download = resource.get("downloadUrl")
    source_page = "../" + resource.get("page", "")

    if preview:
        buttons.append(
            f'<a class="resource-action" href="{esc(preview)}" target="_blank" rel="noopener">'
            '<i class="fas fa-eye"></i> معاينة PDF</a>'
        )
    else:
        buttons.append(
            '<span class="resource-action disabled"><i class="fas fa-eye-slash"></i> المعاينة غير متاحة</span>'
        )

    if download:
        buttons.append(
            f'<a class="resource-action primary" href="{esc(download)}" target="_blank" rel="noopener">'
            '<i class="fas fa-download"></i> تحميل PDF</a>'
        )
    else:
        buttons.append(
            '<span class="resource-action disabled"><i class="fas fa-download"></i> التحميل غير متاح</span>'
        )

    buttons.append(
        f'<a class="resource-action" href="{esc(source_page)}">'
        '<i class="fas fa-layer-group"></i> صفحة المادة والفصل</a>'
    )
    return "\n".join(buttons)


def make_preview(resource: dict) -> str:
    preview = resource.get("previewUrl")
    if not preview:
        return ""
    return f"""
    <section class="resource-preview-section">
        <h2>معاينة النموذج</h2>
        <div class="resource-preview-frame">
            <iframe src="{esc(preview)}" title="معاينة {esc(resource['title'])}" loading="lazy" allow="autoplay"></iframe>
        </div>
    </section>
    """


def make_related(resource: dict, resources: list[dict]) -> str:
    related = related_items(resource, resources)
    if not related:
        return ""
    cards = []
    for item in related:
        meta = " • ".join(
            part
            for part in [
                item.get("subject"),
                TYPE_LABELS.get(item.get("type"), "نموذج"),
                f"الفصل {item['semester']}" if item.get("semester") else None,
            ]
            if part
        )
        cards.append(
            f'<a class="related-resource" href="{esc(item["id"])}.html">'
            f'<strong>{esc(item["title"])}</strong>'
            f'<small>{esc(meta)}</small></a>'
        )
    return (
        '<section class="related-resources"><h2>نماذج مشابهة</h2>'
        f'<div class="related-resource-list">{"".join(cards)}</div></section>'
    )


def render(resource: dict, resources: list[dict]) -> str:
    title = f"{resource['title']} | منصة النجاح"
    subject = resource.get("subject") or "مورد تعليمي"
    description = (
        f"{resource['title']} - {subject}. "
        f"{TYPE_LABELS.get(resource.get('type'), 'نموذج تعليمي')} "
        f"{'مع التصحيح' if resource.get('corrected') else 'بدون تصحيح'} "
        "ضمن منصة النجاح للموارد التعليمية في الجزائر."
    )
    canonical = resource_url(resource["id"])

    schema = {
        "@context": "https://schema.org",
        "@type": "LearningResource",
        "name": resource["title"],
        "description": description,
        "url": canonical,
        "inLanguage": "ar-DZ",
        "learningResourceType": TYPE_LABELS.get(resource.get("type"), "نموذج تعليمي"),
        "isAccessibleForFree": True,
        "educationalLevel": " - ".join(
            value for value in [
                CYCLE_LABELS.get(resource.get("cycleId"), ""),
                resource.get("levelLabel"),
                resource.get("branch"),
            ] if value
        ),
        "about": subject,
    }

    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{esc(title)}</title>
    <meta name="description" content="{esc(description)}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="canonical" href="{esc(canonical)}">
    <meta property="og:locale" content="ar_DZ">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="منصة النجاح">
    <meta property="og:title" content="{esc(title)}">
    <meta property="og:description" content="{esc(description)}">
    <meta property="og:url" content="{esc(canonical)}">
    <meta property="og:image" content="{BASE_URL}assets/images/og-image.jpg">
    <link rel="icon" type="image/png" sizes="32x32" href="../assets/images/icon22.png">
    <link rel="apple-touch-icon" href="../assets/images/icon22.png">
    <link rel="manifest" href="../site.webmanifest">
    <script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../assets/css/style-main.css">
    <link rel="stylesheet" href="../assets/css/style-global.css">
    <link rel="stylesheet" href="../assets/css/ux.css">
</head>
<body>
    <button id="scrollTopBtn" class="scroll-top-btn" aria-label="العودة للأعلى"><i class="fas fa-chevron-up"></i></button>
    <div class="cursor" id="cursor"></div>
    <div class="cursor-dot" id="cursorDot"></div>

    <header class="header" id="header">
        <div class="header-inner">
            <a href="../index.html" class="logo">
                <img src="../assets/images/icon22.png" alt="منصة النجاح" class="logo-img" width="70" height="70">
                <div class="logo-text">منصة <span>النجاح</span></div>
            </a>
            <div class="search-container">
                <i class="fas fa-search search-icon"></i>
                <input type="search" class="search-box" placeholder="ابحث عن نموذج، مادة أو مستوى..." aria-label="البحث">
            </div>
            <nav class="nav-links">
                <a href="../index.html">الرئيسية</a>
                <a href="../pages/levels.html">الأطوار</a>
                <a href="../pages/subjects.html">المواد</a>
                <a href="../pages/branch.html">الشعب</a>
                <a href="../pages/contact.html">تواصل</a>
            </nav>
            <button class="mobile-toggle" aria-label="فتح القائمة"><i class="fas fa-bars"></i></button>
        </div>
    </header>

    <main class="resource-page-main" data-resource-id="{esc(resource['id'])}">
        <div class="resource-shell">
            <nav class="resource-breadcrumb" aria-label="مسار التنقل">
                {make_breadcrumb(resource)}
            </nav>

            <article class="resource-detail-card">
                <div class="resource-kicker">{esc(subject)} · {esc(TYPE_LABELS.get(resource.get('type'), 'نموذج'))}</div>
                <h1>{esc(resource['title'])}</h1>
                <div class="resource-meta-grid">
                    {make_meta_chips(resource)}
                </div>
                <div class="resource-actions">
                    {make_actions(resource)}
                </div>
            </article>

            {make_preview(resource)}
            {make_related(resource, resources)}
        </div>
    </main>

    <footer class="footer">
        <div class="footer-bottom">
            <p>جميع الحقوق محفوظة &copy; 2026 منصة النجاح</p>
            <p><a href="../pages/search.html" style="color:var(--gold);text-decoration:none">البحث في جميع النماذج</a></p>
        </div>
    </footer>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>
    <script src="https://unpkg.com/lenis@1.1.13/dist/lenis.min.js"></script>
    <script defer src="../assets/js/main.js"></script>
</body>
</html>
"""


def main() -> None:
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    resources = payload.get("resources", [])
    OUTPUT.mkdir(parents=True, exist_ok=True)

    expected = set()
    for resource in resources:
        filename = f"{resource['id']}.html"
        expected.add(filename)
        (OUTPUT / filename).write_text(render(resource, resources), encoding="utf-8")

    for path in OUTPUT.glob("resource-*.html"):
        if path.name not in expected:
            path.unlink()

    print(f"Generated {len(resources)} independent resource pages")


if __name__ == "__main__":
    main()
