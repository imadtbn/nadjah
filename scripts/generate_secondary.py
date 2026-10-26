#!/usr/bin/env python3
"""Generator script for Secondary Level branches, year levels, subject pages, and semester archive pages."""

import os
import html
from pathlib import Path

ROOT = Path(".").resolve()
BRANCH_DIR = ROOT / "levels" / "branch"
SUBJECTS_DIR = BRANCH_DIR / "subjects"

BRANCHES = [
    {
        "id": "sc-experimentales",
        "name": "علوم تجريبية",
        "slug": "sc-experimentales",
        "module_dir": "modul-Scienc-exactes1",
        "years": [
            {"code": "sc-experimentales01", "name": "السنة الأولى", "num": "01"},
            {"code": "sc-experimentales02", "name": "السنة الثانية", "num": "02"},
            {"code": "sc-experimentales03", "name": "السنة الثالثة", "num": "03"},
            {"code": "Scienc-exactes1", "name": "إمتحان البكالوريا", "num": "bac"},
        ]
    },
    {
        "id": "Mathematiques",
        "name": "رياضيات",
        "slug": "Mathematiques",
        "module_dir": "modul-Mathematiques",
        "years": [
            {"code": "Mathematiques01", "name": "السنة الأولى", "num": "01"},
            {"code": "Mathematiques02", "name": "السنة الثانية", "num": "02"},
            {"code": "Mathematiques03", "name": "السنة الثالثة", "num": "03"},
            {"code": "Mathematiques-bac", "name": "إمتحان البكالوريا", "num": "bac"},
        ]
    },
    {
        "id": "tech-Mathematiques",
        "name": "تقني رياضي",
        "slug": "tech-Mathematiques",
        "module_dir": "modul-tech-Mathematiques",
        "years": [
            {"code": "tech-Mathematiques01", "name": "السنة الأولى", "num": "01"},
            {"code": "tech-Mathematiques02", "name": "السنة الثانية", "num": "02"},
            {"code": "tech-Mathematiques03", "name": "السنة الثالثة", "num": "03"},
            {"code": "tech-Mathematiques-bac", "name": "إمتحان البكالوريا", "num": "bac"},
        ]
    },
    {
        "id": "gest-econ",
        "name": "تسيير وإقتصاد",
        "slug": "gest-econ",
        "module_dir": "modul-gest-econ",
        "years": [
            {"code": "gest-econ01", "name": "السنة الأولى", "num": "01"},
            {"code": "gest-econ02", "name": "السنة الثانية", "num": "02"},
            {"code": "gest-econ03", "name": "السنة الثالثة", "num": "03"},
            {"code": "gest-econ-bac", "name": "إمتحان البكالوريا", "num": "bac"},
        ]
    },
    {
        "id": "Sc-technologies",
        "name": "علوم وتكنولوجيا",
        "slug": "Sc-technologies",
        "module_dir": "modul-Sc-technologies",
        "years": [
            {"code": "Sc-technologies01", "name": "السنة الأولى", "num": "01"},
            {"code": "Sc-technologies02", "name": "السنة الثانية", "num": "02"},
            {"code": "Sc-technologies03", "name": "السنة الثالثة", "num": "03"},
            {"code": "Sc-technologies-bac", "name": "إمتحان البكالوريا", "num": "bac"},
        ]
    },
    {
        "id": "Littérature-philosophie",
        "name": "أدب عربي وفلسفة",
        "slug": "Littérature-philosophie",
        "module_dir": "modul-Littérature-philosophie",
        "years": [
            {"code": "Littérature-philosophie01", "name": "السنة الأولى", "num": "01"},
            {"code": "Littérature-philosophie02", "name": "السنة الثانية", "num": "02"},
            {"code": "Littérature-philosophie03", "name": "السنة الثالثة", "num": "03"},
            {"code": "Littérature-philosophie-bac", "name": "إمتحان البكالوريا", "num": "bac"},
        ]
    },
    {
        "id": "Lang-etrang",
        "name": "لغات أجنبية",
        "slug": "Lang-etrang",
        "module_dir": "modul-Lang-etrang",
        "years": [
            {"code": "Lang-etrang01", "name": "السنة الأولى", "num": "01"},
            {"code": "Lang-etrang02", "name": "السنة الثانية", "num": "02"},
            {"code": "Lang-etrang03", "name": "السنة الثالثة", "num": "03"},
            {"code": "Lang-etrang-bac", "name": "إمتحان البكالوريا", "num": "bac"},
        ]
    }
]

SUBJECTS_DEFINITION = [
    {"key": "arabic", "name": "اللغة العربية", "icon": "fas fa-language", "desc": "قراءة، إملاء، قواعد، تعبير", "id": "subject-8080ee6f48"},
    {"key": "math", "name": "الرياضيات", "icon": "fas fa-square-root-alt", "desc": "أعداد، عمليات، هندسة، تحليلات", "id": "subject-825de89502"},
    {"key": "science", "name": "علوم الطبيعة والحياة", "icon": "fas fa-flask", "desc": "عالم النبات، الحيوان، علم الأحياء", "id": "subject-0be532c433"},
    {"key": "physics", "name": "العلوم الفيزيائية", "icon": "fas fa-atom", "desc": "فيزياء، كيمياء، ميكانيك", "id": "subject-9a1b2c3d4e"},
    {"key": "islamic", "name": "التربية الإسلامية", "icon": "fas fa-mosque", "desc": "تجويد، تفسير، فقه، أخلاق", "id": "subject-94425b17db"},
    {"key": "history", "name": "التاريخ والجغرافيا", "icon": "fas fa-landmark", "desc": "تاريخ، جغرافيا، مواطنة", "id": "subject-d390abb9df"},
    {"key": "french", "name": "اللغة الفرنسية", "icon": "fas fa-globe", "desc": "Français - Lecture, Écriture", "id": "subject-6c46ed74f7"},
    {"key": "english", "name": "اللغة الإنجليزية", "icon": "fas fa-language", "desc": "English - Grammar, Vocabulary", "id": "subject-5e6f7a8b9c"},
    {"key": "philosophy", "name": "الفلسفة", "icon": "fas fa-brain", "desc": "منطق، إبيستمولوجيا، أخلاق", "id": "subject-1a2b3c4d5e"},
    {"key": "accounting", "name": "التسيير المالي والمحاسبي", "icon": "fas fa-calculator", "desc": "محاسبة، اقتصاد، قانون", "id": "subject-2b3c4d5e6f"},
    {"key": "technology", "name": "التكنولوجيا", "icon": "fas fa-cogs", "desc": "هندسة ميكانيكية، كهربائية، مدنية", "id": "subject-3c4d5e6f7a"}
]

def render_branch_landing(branch):
    title = f"منصة النجاح | شعبة {branch['name']}"
    desc = f"منصة النجاح | شعبة {branch['name']}. نماذج فروض واختبارات وموارد تعليمية مجانية للطلاب والأساتذة في الجزائر."
    canonical = f"https://imadtbn.github.io/nadjah/levels/branch/{branch['slug']}.html"

    years_html = ""
    for y in branch["years"]:
        years_html += f'<a class="year-btn" href="subjects/{y["code"]}.html">{y["name"]}</a>\n'

    return f"""<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>{html.escape(title)}</title>
    <meta name="description" content="{html.escape(desc)}">
    <meta name="author" content="منصة النجاح">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <meta name="googlebot" content="index, follow, max-image-preview:large">
    <meta name="language" content="Arabic">
    <meta name="application-name" content="منصة النجاح">
    <meta name="theme-color" content="#0f172a">
    <link rel="canonical" href="{canonical}">
    <link rel="alternate" hreflang="ar-DZ" href="{canonical}">
    <link rel="alternate" hreflang="x-default" href="{canonical}">
    <link rel="sitemap" type="application/xml" href="../../sitemap.xml">
    <link rel="manifest" href="../../site.webmanifest">
    <link rel="icon" type="image/png" sizes="32x32" href="../../assets/images/icon22.png">
    <link rel="apple-touch-icon" href="../../assets/images/icon22.png">
    <meta property="og:locale" content="ar_DZ">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="منصة النجاح">
    <meta property="og:title" content="{html.escape(title)}">
    <meta property="og:description" content="{html.escape(desc)}">
    <meta property="og:url" content="{canonical}">
    <meta property="og:image" content="https://imadtbn.github.io/nadjah/assets/images/og-image.jpg">
    <meta property="og:image:secure_url" content="https://imadtbn.github.io/nadjah/assets/images/og-image.jpg">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1920">
    <meta property="og:image:height" content="1920">
    <meta property="og:image:alt" content="منصة النجاح - موارد تعليمية وفروض واختبارات PDF">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{html.escape(title)}">
    <meta name="twitter:description" content="{html.escape(desc)}">
    <meta name="twitter:image" content="https://imadtbn.github.io/nadjah/assets/images/og-image.jpg">
    <meta name="twitter:image:alt" content="منصة النجاح - موارد تعليمية وفروض واختبارات PDF">

<meta content="f5Xi4oFx0v5dN6iPZd9qCw-7vnc3vIbAeYF9jr4vwVM" name="google-site-verification"/>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&amp;display=swap" rel="stylesheet"/>
<link href="https://cdnjs.cloudflare.com" rel="preconnect"/><script defer="" src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script defer="" src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<script defer="" src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>
<link href="https://unpkg.com" rel="preconnect"/><script defer="" src="https://unpkg.com/lenis@1.1.13/dist/lenis.min.js"></script>
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet"/>
<link href="../../assets/css/style-main.css?v=6af6f0b5d0" rel="stylesheet"/>
<link href="../../assets/css/style-main2.css?v=4876a3aa52" rel="stylesheet"/>
<link href="../../assets/css/legal.css?v=2228fa5e24" rel="stylesheet"/>
<script defer="" src="../../assets/js/site-tags.js?v=9d89044cef"></script>
<link href="../../assets/css/ads.css?v=f0167e6382" rel="stylesheet"/>
<meta content="ca-pub-5656416032906373" name="google-adsense-account"/>
<link data-nadjah-ux="true" href="../../assets/css/ux.css?v=1407457fe1" rel="stylesheet"/>
<script async="" src="https://www.googletagmanager.com/gtag/js?id=G-X3Z1DJT3RR"></script>
<script>
        window.dataLayer = window.dataLayer || [];
        function gtag() {{ dataLayer.push(arguments); }}
        gtag('js', new Date());
        gtag('config', 'G-X3Z1DJT3RR');
    </script>
</head>
<body>
<button aria-label="العودة للأعلى" class="scroll-top-btn" id="scrollTopBtn">
<i class="fas fa-chevron-up"></i>
</button>
<div class="cursor" id="cursor"></div>
<div class="cursor-dot" id="cursorDot"></div>
<canvas id="shader-canvas"></canvas>
<header class="header" id="header">
<div class="header-inner">
<a class="logo" href="../../index.html">
<img alt="أيقونة منصة النجاح" class="logo-img" decoding="async" height="70" loading="eager" src="../../assets/images/icon22.png" width="70"/>
<div class="logo-text">منصة <span>النجاح</span></div>
</a>
<div class="search-container">
<i class="fas fa-search search-icon"></i>
<input class="search-box" placeholder="ابحث عن نموذج، مادة، أو سنة دراسية..." type="text"/>
</div>
<nav class="nav-links">
<a href="../../index.html">الرئيسية</a>
<a href="../../pages/levels.html">الأطوار الدراسية</a>
<a href="../../pages/subjects.html">المواد التعليمية</a>
<a href="../../index.html#resources">النماذج</a>
<a href="../../pages/contact.html">تواصل</a>
</nav>
<button class="mobile-toggle"><i class="fas fa-bars"></i></button>
</div>
</header>
<section class="hero">
<canvas id="starfield"></canvas>
<div class="hero-content">
<div class="hero-badge">منصة تعليمية شاملة</div>
<h1 class="hero-title">
شعبة <span class="highlight">{branch['name']}</span>
</h1>
<p class="hero-desc">
                احصل على نماذج الفروض والاختبارات المصححة بصيغة PDF لجميع المواد الدراسية في شعبة {branch['name']}.
            </p>
<div class="hero-stats">
<div class="stat-item">
<span class="stat-number" data-stat-key="resources">0</span>
<span class="stat-label">نموذج متاح</span>
</div>
<div class="stat-item">
<span class="stat-number" data-stat-key="levels">0</span>
<span class="stat-label">مستوى دراسي</span>
</div>
<div class="stat-item">
<span class="stat-number" data-stat-key="subjects">0</span>
<span class="stat-label">مادة دراسية</span>
</div>
</div>
<a class="hero-cta" href="#levels">
<span>استكشف السنوات الدراسية</span>
<i class="fas fa-arrow-down"></i>
</a>
</div>
</section>
<div aria-label="إعلان" class="ad-slot ad-slot--in-article" data-ad-type="in-article" data-site-ad="true"><span class="ad-label">إعلان</span><ins class="adsbygoogle" data-ad-client="ca-pub-5656416032906373" data-ad-format="fluid" data-ad-layout="in-article" data-ad-slot="7319898418" data-full-width-responsive="true" style="display:block;text-align:center"></ins></div>
<section class="levels-section" id="levels">
<div class="section-header reveal">
<h2>السنوات الدراسية</h2>
<div class="section-line"></div>
<p>حدد السنة الدراسية للوصول إلى المواد والنماذج</p>
</div>
<div class="levels-grid">
<div class="level-card reveal">
<div class="level-icon"><i class="fas fa-university"></i></div>
<h3>شعبة {branch['name']}</h3>
<span class="years-count">{len(branch['years'])} مستويات تعليمية</span>
<div class="years-grid">
{years_html}
</div>
</div>
</div>
</section>
<footer class="footer" id="contact">
<div class="footer-grid">
<div class="footer-brand">
<a class="logo" href="../../index.html">
<div class="logo-icon">
<img alt="أيقونة منصة النجاح" class="footer-logo-img" decoding="async" height="70" loading="lazy" src="../../assets/images/icon22.png" width="70"/>
</div>
<div class="logo-text">منصة <span>النجاح</span></div>
</a>
<p>منصة تعليمية شاملة تقدم نماذج الفروض والاختبارات المصححة لجميع الأطوار التعليمية. هدفنا مساعدة الطلاب على التحصيل الدراسي المتميز.</p>
</div>
<div class="footer-section">
<h4>روابط سريعة</h4>
<ul class="footer-links">
<li><a href="../../index.html#starfield"><i class="fas fa-chevron-left"></i> الرئيسية</a></li>
<li><a href="../../pages/about.html"><i class="fas fa-chevron-left"></i> من نحن</a></li>
<li><a href="../../pages/guide.html"><i class="fas fa-chevron-left"></i> دليل المستخدم</a></li>
<li><a href="../../pages/contact.html"><i class="fas fa-chevron-left"></i> اتصل بنا</a></li>
<li><a href="../../pages/privacy.html"><i class="fas fa-chevron-left"></i> سياسة الخصوصية</a></li>
<li><a href="../../pages/terms.html"><i class="fas fa-chevron-left"></i> شروط الاستخدام</a></li>
<li><a href="../../pages/disclaimer.html"><i class="fas fa-chevron-left"></i> إخلاء المسؤولية</a></li>
<li><a href="../../pages/dmca.html"><i class="fas fa-chevron-left"></i> DMCA</a></li>
</ul>
</div>
<div class="footer-section">
<h4>معلومات التواصل</h4>
<div class="contact-item">
<i class="fas fa-map-marker-alt"></i>
<span>الجزائر العاصمة، الجزائر</span>
</div>
<div class="contact-item">
<i class="fas fa-envelope"></i>
<span>contact@manassat-taalem.dz</span>
</div>
</div>
</div>
<div class="footer-bottom">
<p>جميع الحقوق محفوظة © 2026 منصة النجاح</p>
</div>
</footer>
<script defer="" src="../../assets/js/main.js?v=993197bad6"></script>
<script data-nadjah-core="true" defer="" src="../../assets/js/core.js?v=36691a4c03"></script>
</body>
</html>
"""

def render_year_landing(branch, year):
    title = f"{branch['name']} - {year['name']} ثانوي | منصة النجاح"
    desc = f"{branch['name']} {year['name']} ثانوي | منصة النجاح. نماذج فروض واختبارات وموارد تعليمية مجانية للطلاب والأساتذة في الجزائر."
    canonical = f"https://imadtbn.github.io/nadjah/levels/branch/subjects/{year['code']}.html"

    cards_html = ""
    for subj in SUBJECTS_DEFINITION:
        sub_file = f"{branch['module_dir']}/{subj['key']}-{year['code']}.html"
        cards_html += f"""
<a class="subject-card reveal" data-subject-id="{subj['id']}" href="{sub_file}">
<div class="subject-icon"><i class="{subj['icon']}"></i></div>
<div class="subject-info">
<h4>{subj['name']}</h4>
<p>{subj['desc']}</p>
<span class="subject-count"><i class="fas fa-file-pdf"></i> نماذج متاحة</span>
</div>
<i class="fas fa-chevron-left subject-arrow"></i>
</a>
"""

    return f"""<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>{html.escape(title)}</title>
    <meta name="description" content="{html.escape(desc)}">
    <meta name="author" content="منصة النجاح">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <meta name="googlebot" content="index, follow, max-image-preview:large">
    <meta name="language" content="Arabic">
    <meta name="application-name" content="منصة النجاح">
    <meta name="theme-color" content="#0f172a">
    <link rel="canonical" href="{canonical}">
    <link rel="alternate" hreflang="ar-DZ" href="{canonical}">
    <link rel="alternate" hreflang="x-default" href="{canonical}">
    <link rel="sitemap" type="application/xml" href="../../../sitemap.xml">
    <link rel="manifest" href="../../../site.webmanifest">
    <link rel="icon" type="image/png" sizes="32x32" href="../../../assets/images/icon22.png">
    <link rel="apple-touch-icon" href="../../../assets/images/icon22.png">
    <meta property="og:locale" content="ar_DZ">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="منصة النجاح">
    <meta property="og:title" content="{html.escape(title)}">
    <meta property="og:description" content="{html.escape(desc)}">
    <meta property="og:url" content="{canonical}">
    <meta property="og:image" content="https://imadtbn.github.io/nadjah/assets/images/og-image.jpg">
    <meta property="og:image:secure_url" content="https://imadtbn.github.io/nadjah/assets/images/og-image.jpg">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1920">
    <meta property="og:image:height" content="1920">
    <meta property="og:image:alt" content="منصة النجاح - موارد تعليمية وفروض واختبارات PDF">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{html.escape(title)}">
    <meta name="twitter:description" content="{html.escape(desc)}">
    <meta name="twitter:image" content="https://imadtbn.github.io/nadjah/assets/images/og-image.jpg">
    <meta name="twitter:image:alt" content="منصة النجاح - موارد تعليمية وفروض واختبارات PDF">

<meta content="f5Xi4oFx0v5dN6iPZd9qCw-7vnc3vIbAeYF9jr4vwVM" name="google-site-verification"/>
<link href="https://fonts.googleapis.com" rel="preconnect"/><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&amp;display=swap" rel="stylesheet"/>
<link href="https://cdnjs.cloudflare.com" rel="preconnect"/><script defer="" src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<script defer="" src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet"/>
<link href="../../../assets/css/style-reveal.css?v=6714c759e5" rel="stylesheet"/>
<link href="../../../assets/css/style-global.css?v=6d9afb6a1f" rel="stylesheet"/>
<link href="../../../assets/css/style-main.css?v=6af6f0b5d0" rel="stylesheet"/>
<script defer="" src="../../../assets/js/site-tags.js?v=9d89044cef"></script>
<link href="../../../assets/css/ads.css?v=f0167e6382" rel="stylesheet"/>
<meta content="ca-pub-5656416032906373" name="google-adsense-account"/>
<link data-nadjah-ux="true" href="../../../assets/css/ux.css?v=1407457fe1" rel="stylesheet"/>
<script async="" src="https://www.googletagmanager.com/gtag/js?id=G-X3Z1DJT3RR"></script>
<script>
        window.dataLayer = window.dataLayer || [];
        function gtag() {{ dataLayer.push(arguments); }}
        gtag('js', new Date());
        gtag('config', 'G-X3Z1DJT3RR');
    </script>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/></head>
<body>
<button aria-label="العودة للأعلى" class="scroll-top-btn" id="scrollTopBtn">
<i class="fas fa-chevron-up"></i>
</button>
<div class="cursor" id="cursor"></div>
<div class="cursor-dot" id="cursorDot"></div>
<header class="header" id="header">
<div class="header-inner">
<a class="logo" href="../../../index.html">
<img alt="أيقونة منصة النجاح" class="logo-img" decoding="async" height="70" loading="eager" src="../../../assets/images/icon22.png" width="70"/>
<div class="logo-text">منصة <span>النجاح</span></div>
</a>
<div class="search-container">
<i class="fas fa-search search-icon"></i>
<input class="search-box" placeholder="ابحث عن مادة أو نموذج..." type="text"/>
</div>
<nav class="nav-links">
<a href="../../../index.html#starfield">الرئيسية</a>
<a href="../../../pages/levels.html">الأطوار الدراسية</a>
<a href="../../../pages/subjects.html#subjects">المواد التعليمية</a>
<a href="../../../index.html#resources">النماذج</a>
<a href="../../../pages/contact.html">تواصل</a>
</nav>
<button class="mobile-toggle"><i class="fas fa-bars"></i></button>
</div>
</header>
<div class="breadcrumb">
<a href="../../../index.html"><i class="fas fa-home"></i> الرئيسية</a>
<i class="fas fa-chevron-left"></i>
<a href="../../../pages/branch.html">الطور الثانوي</a>
<i class="fas fa-chevron-left"></i>
<a href="../{branch['slug']}.html">{branch['name']}</a>
<i class="fas fa-chevron-left"></i>
<span class="breadcrumb-current">{year['name']}</span>
</div>
<section class="hero-year">
<canvas id="starfield"></canvas>
<div class="hero-year-content">
<div class="year-badge">
<i class="fas fa-university"></i>
<span>الطور الثانوي</span>
</div>
<h1 class="hero-year-title">
{year['name']} ثانوي - شعبة <span class="highlight">{branch['name']}</span>
</h1>
<p class="hero-year-desc">
                استكشف جميع المواد الدراسية والنماذج المتاحة لـ {year['name']} ثانوي - شعبة {branch['name']}.
            </p>
<div class="year-info-bar">
<div class="year-info-item">
<i class="fas fa-book"></i>
<span>{len(SUBJECTS_DEFINITION)} <small>مواد</small></span>
</div>
<div class="year-info-item">
<i class="fas fa-file-alt"></i>
<span data-subject-stat="resources">0 <small>نموذج</small></span>
</div>
<div class="year-info-item">
<i class="fas fa-calendar"></i>
<span>3 <small>فصول</small></span>
</div>
</div>
</div>
</section>
<div aria-label="إعلان" class="ad-slot ad-slot--in-article" data-ad-type="in-article" data-site-ad="true"><span class="ad-label">إعلان</span><ins class="adsbygoogle" data-ad-client="ca-pub-5656416032906373" data-ad-format="fluid" data-ad-layout="in-article" data-ad-slot="7319898418" data-full-width-responsive="true" style="display:block;text-align:center"></ins></div>
<section class="subjects-section" id="subjects">
<div class="section-header reveal">
<h2>المواد التعليمية</h2>
<div class="section-line"></div>
<p>حدد المادة التعليمية لاستعراض النماذج المتاحة</p>
</div>
<div class="subjects-content active" id="subjects">
<div class="subjects-grid">
{cards_html}
</div>
</div>
</section>
<footer class="footer">
<div class="footer-grid">
<div class="footer-brand">
<a class="logo" href="../../../index.html">
<div class="logo-icon">
<img alt="أيقونة منصة النجاح" class="footer-logo-img" decoding="async" height="70" loading="lazy" src="../../../assets/images/icon22.png" width="70"/>
</div>
<div class="logo-text">منصة <span>النجاح</span></div>
</a>
<p>منصة تعليمية شاملة تقدم نماذج الفروض والاختبارات المصححة لجميع الأطوار التعليمية.</p>
</div>
<div class="footer-section">
<h4>روابط سريعة</h4>
<ul class="footer-links">
<li><a href="../../../index.html"><i class="fas fa-chevron-left"></i> الرئيسية</a></li>
<li><a href="../../../pages/levels.html"><i class="fas fa-chevron-left"></i> الأطوار التعليمية</a></li>
<li><a href="../../../pages/contact.html"><i class="fas fa-chevron-left"></i> اتصل بنا</a></li>
</ul>
</div>
</div>
<div class="footer-bottom">
<p>جميع الحقوق محفوظة © 2026 منصة النجاح</p>
</div>
</footer>
<script defer="" src="../../../assets/js/reveal.js?v=bbdf3cb8cf"></script>
<script data-nadjah-core="true" defer="" src="../../../assets/js/core.js?v=36691a4c03"></script>
</body>
</html>
"""

def render_subject_page(branch, year, subj):
    title = f"{subj['name']} - {year['name']} ثانوي - {branch['name']} | منصة النجاح"
    desc = f"{subj['name']} - {year['name']} ثانوي - {branch['name']} | منصة النجاح. نماذج فروض واختبارات وموارد تعليمية مجانية."
    filename = f"{subj['key']}-{year['code']}.html"
    rel_path = f"levels/branch/subjects/{branch['module_dir']}/{filename}"
    canonical = f"https://imadtbn.github.io/nadjah/{rel_path}"

    related_html = ""
    for other in SUBJECTS_DEFINITION:
        if other["key"] == subj["key"]:
            continue
        other_file = f"{other['key']}-{year['code']}.html"
        related_html += f"""
<a class="related-card reveal" href="{other_file}">
<div class="related-icon"><i class="{other['icon']}"></i></div>
<div class="related-info">
<h4>{other['name']}</h4>
<p>{other['desc']}</p>
</div>
<i class="fas fa-chevron-left related-arrow"></i>
</a>
"""

    return f"""<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>{html.escape(title)}</title>
    <meta name="description" content="{html.escape(desc)}">
    <meta name="author" content="منصة النجاح">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <meta name="googlebot" content="index, follow, max-image-preview:large">
    <meta name="language" content="Arabic">
    <meta name="application-name" content="منصة النجاح">
    <meta name="theme-color" content="#0f172a">
    <link rel="canonical" href="{canonical}">
    <link rel="alternate" hreflang="ar-DZ" href="{canonical}">
    <link rel="alternate" hreflang="x-default" href="{canonical}">
    <link rel="sitemap" type="application/xml" href="../../../../sitemap.xml">
    <link rel="manifest" href="../../../../site.webmanifest">
    <link rel="icon" type="image/png" sizes="32x32" href="../../../../assets/images/icon22.png">
    <link rel="apple-touch-icon" href="../../../../assets/images/icon22.png">
    <meta property="og:locale" content="ar_DZ">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="منصة النجاح">
    <meta property="og:title" content="{html.escape(title)}">
    <meta property="og:description" content="{html.escape(desc)}">
    <meta property="og:url" content="{canonical}">
    <meta property="og:image" content="https://imadtbn.github.io/nadjah/assets/images/og-image.jpg">
    <meta property="og:image:secure_url" content="https://imadtbn.github.io/nadjah/assets/images/og-image.jpg">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1920">
    <meta property="og:image:height" content="1920">
    <meta property="og:image:alt" content="منصة النجاح - موارد تعليمية وفروض واختبارات PDF">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{html.escape(title)}">
    <meta name="twitter:description" content="{html.escape(desc)}">
    <meta name="twitter:image" content="https://imadtbn.github.io/nadjah/assets/images/og-image.jpg">
    <meta name="twitter:image:alt" content="منصة النجاح - موارد تعليمية وفروض واختبارات PDF">

<meta content="f5Xi4oFx0v5dN6iPZd9qCw-7vnc3vIbAeYF9jr4vwVM" name="google-site-verification"/>
<link href="https://fonts.googleapis.com" rel="preconnect"/><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&amp;display=swap" rel="stylesheet"/>
<link href="https://cdnjs.cloudflare.com" rel="preconnect"/><script defer="" src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<script defer="" src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet"/>
<link href="../../../../assets/css/style-modul.css?v=49dc1059b6" rel="stylesheet"/>
<link href="../../../../assets/css/style-global.css?v=6d9afb6a1f" rel="stylesheet"/>
<script defer="" src="../../../../assets/js/site-tags.js?v=9d89044cef"></script>
<link href="../../../../assets/css/ads.css?v=f0167e6382" rel="stylesheet"/>
<meta content="ca-pub-5656416032906373" name="google-adsense-account"/>
<link data-nadjah-ux="true" href="../../../../assets/css/ux.css?v=1407457fe1" rel="stylesheet"/>
<script async="" src="https://www.googletagmanager.com/gtag/js?id=G-X3Z1DJT3RR"></script>
<script>
        window.dataLayer = window.dataLayer || [];
        function gtag() {{ dataLayer.push(arguments); }}
        gtag('js', new Date());
        gtag('config', 'G-X3Z1DJT3RR');
    </script>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/></head>
<body>
<button aria-label="العودة للأعلى" class="scroll-top-btn" id="scrollTopBtn">
<i class="fas fa-chevron-up"></i>
</button>
<div class="cursor" id="cursor"></div>
<div class="cursor-dot" id="cursorDot"></div>
<header class="header" id="header">
<div class="header-inner">
<a class="logo" href="../../../../index.html">
<img alt="أيقونة منصة النجاح" class="logo-img" decoding="async" height="70" loading="eager" src="../../../../assets/images/icon22.png" width="70"/>
<div class="logo-text">منصة <span>النجاح</span></div>
</a>
<div class="search-container">
<i class="fas fa-search search-icon"></i>
<input class="search-box" placeholder="ابحث عن نموذج أو وثيقة..." type="text"/>
</div>
<nav class="nav-links">
<a href="../../../../index.html#starfield">الرئيسية</a>
<a href="../../../../pages/levels.html">الأطوار</a>
<a href="../../../../pages/subjects.html#subjects">المواد</a>
<a href="../../../../pages/contact.html">تواصل</a>
</nav>
<button class="mobile-toggle"><i class="fas fa-bars"></i></button>
</div>
</header>
<div class="breadcrumb">
<a href="../../../../index.html"><i class="fas fa-home"></i> الرئيسية</a>
<i class="fas fa-chevron-left"></i>
<a href="../../../../pages/levels.html">الطور الثانوي</a>
<i class="fas fa-chevron-left"></i>
<a href="../../{branch['slug']}.html">{branch['name']}</a>
<i class="fas fa-chevron-left"></i>
<a href="../{year['code']}.html">{year['name']}</a>
<i class="fas fa-chevron-left"></i>
<span class="breadcrumb-current">{subj['name']}</span>
</div>
<section class="hero-subject" data-subject-id="{subj['id']}">
<canvas id="starfield"></canvas>
<div class="hero-subject-content">
<div class="subject-badge">
<i class="{subj['icon']}"></i>
<span>{subj['name']}</span>
</div>
<h1 class="hero-subject-title">
                نماذج <span class="highlight">{subj['name']}</span><br/> {year['name']} ثانوي - {branch['name']}
            </h1>
<p class="hero-subject-desc">مجموعة من الفروض والاختبارات والتمارين والمراجعات في مادة {subj['name']}، مرتبة ومنظمة مع روابط المعاينة والتحميل المتاحة.</p>
<div class="subject-stats-bar">
<div class="subject-stat-item">
<i class="fas fa-file-pdf"></i>
<span data-subject-stat="resources">0 <small>نموذج</small></span>
</div>
<div class="subject-stat-item">
<i class="fas fa-check-circle"></i>
<span data-subject-stat="correctionRate">0% <small>مصحح</small></span>
</div>
<div class="subject-stat-item">
<i class="fas fa-download"></i>
<span>PDF <small>قابل للتحميل</small></span>
</div>
</div>
</div>
</section>
<div aria-label="إعلان" class="ad-slot ad-slot--in-article" data-ad-type="in-article" data-site-ad="true"><span class="ad-label">إعلان</span><ins class="adsbygoogle" data-ad-client="ca-pub-5656416032906373" data-ad-format="fluid" data-ad-layout="in-article" data-ad-slot="7319898418" data-full-width-responsive="true" style="display:block;text-align:center"></ins></div>
<section class="documents-section" id="documents">
<div class="section-header reveal">
<h2>حدد الفصل الدراسي</h2>
<div class="section-line"></div>
<p>جميع النماذج متاحة للتحميل بصيغة PDF مع التصحيح</p>
</div>
<div class="semester-tabs reveal">
<button class="semester-tab active" data-semester="1" onclick="switchSemester(1)">
<span class="tab-icon">📚</span>
                الفصل الأول
</button>
<button class="semester-tab" data-semester="2" onclick="switchSemester(2)">
<span class="tab-icon">📝</span>
                الفصل الثاني
</button>
<button class="semester-tab" data-semester="3" onclick="switchSemester(3)">
<span class="tab-icon">🎯</span>
                الفصل الثالث
</button>
</div>
<div class="doc-filters reveal">
<button class="doc-filter active" onclick="filterDocs('all')">الكل</button>
<button class="doc-filter" onclick="filterDocs('exam')">اختبارات</button>
<button class="doc-filter" onclick="filterDocs('homework')">فروض</button>
<button class="doc-filter" onclick="filterDocs('exercise')">تمارين</button>
<button class="doc-filter" onclick="filterDocs('revision')">مراجعة</button>
</div>
<div class="semester-content" id="semester-1">
<div class="documents-grid" id="latest-documents-1">
<div class="loading-docs">جاري تحميل المواضيع...</div>
</div>
<div class="more-container">
<a class="btn-more" href="smst1/{subj['key']}-{year['code']}-sem01-more.html">استكشف المزيد من المواضيع</a>
</div>
</div>
<div class="semester-content" id="semester-2">
<div class="documents-grid" id="latest-documents-2">
<div class="loading-docs">جاري تحميل المواضيع...</div>
</div>
<div class="more-container">
<a class="btn-more" href="smst2/{subj['key']}-{year['code']}-sem02-more.html">استكشف المزيد من المواضيع</a>
</div>
</div>
<div class="semester-content" id="semester-3">
<div class="documents-grid" id="latest-documents-3">
<div class="loading-docs">جاري تحميل المواضيع...</div>
</div>
<div class="more-container">
<a class="btn-more" href="smst3/{subj['key']}-{year['code']}-sem03-more.html">استكشف المزيد من المواضيع</a>
</div>
</div>
</section>
<section class="related-section">
<div class="section-header reveal">
<h2>مواد ذات صلة</h2>
<div class="section-line"></div>
<p>استكشف المواد الأخرى لـ {year['name']} ثانوي</p>
</div>
<div class="related-grid">
{related_html}
</div>
</section>
<footer class="footer">
<div class="footer-grid">
<div class="footer-brand">
<a class="logo" href="../../../../index.html">
<div class="logo-icon">
<img alt="أيقونة منصة النجاح" class="footer-logo-img" decoding="async" height="70" loading="lazy" src="../../../../assets/images/icon22.png" width="70"/>
</div>
<div class="logo-text">منصة <span>النجاح</span></div>
</a>
<p>منصة تعليمية شاملة تقدم نماذج الفروض والاختبارات المصححة لجميع الأطوار التعليمية.</p>
</div>
<div class="footer-section">
<h4>روابط سريعة</h4>
<ul class="footer-links">
<li><a href="../../../../index.html"><i class="fas fa-chevron-left"></i> الرئيسية</a></li>
<li><a href="../../../../pages/levels.html"><i class="fas fa-chevron-left"></i> الأطوار التعليمية</a></li>
<li><a href="../../../../pages/contact.html"><i class="fas fa-chevron-left"></i> اتصل بنا</a></li>
</ul>
</div>
</div>
<div class="footer-bottom">
<p>جميع الحقوق محفوظة © 2026 منصة النجاح</p>
</div>
</footer>
<div class="pdf-modal" id="pdfModal">
<div class="pdf-modal-content">
<button class="pdf-close" onclick="closePDFPreview()"><i class="fas fa-times"></i></button>
<iframe id="pdfViewer" loading="lazy"></iframe>
</div>
</div>
<script defer="" src="../../../../assets/js/modul.js"></script>
<script defer="" src="../../../../assets/js/subject-drive-library.js?v=342e438138"></script>
<script data-nadjah-core="true" defer="" src="../../../../assets/js/core.js?v=36691a4c03"></script>
</body>
</html>
"""

def render_semester_archive(branch, year, subj, sem):
    title = f"{subj['name']} - {year['name']} ثانوي - الفصل {sem} | منصة النجاح"
    desc = f"أرشيف نماذج {subj['name']} لـ {year['name']} ثانوي - الفصل {sem} - {branch['name']}."
    filename = f"{subj['key']}-{year['code']}-sem0{sem}-more.html"
    rel_path = f"levels/branch/subjects/{branch['module_dir']}/smst{sem}/{filename}"
    canonical = f"https://imadtbn.github.io/nadjah/{rel_path}"

    return f"""<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>{html.escape(title)}</title>
    <meta name="description" content="{html.escape(desc)}">
    <meta name="author" content="منصة النجاح">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <meta name="googlebot" content="index, follow, max-image-preview:large">
    <meta name="language" content="Arabic">
    <meta name="application-name" content="منصة النجاح">
    <meta name="theme-color" content="#0f172a">
    <link rel="canonical" href="{canonical}">
    <link rel="alternate" hreflang="ar-DZ" href="{canonical}">
    <link rel="alternate" hreflang="x-default" href="{canonical}">
    <link rel="sitemap" type="application/xml" href="../../../../../sitemap.xml">
    <link rel="manifest" href="../../../../../site.webmanifest">
    <link rel="icon" type="image/png" sizes="32x32" href="../../../../../assets/images/icon22.png">
    <link rel="apple-touch-icon" href="../../../../../assets/images/icon22.png">
    <meta property="og:locale" content="ar_DZ">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="منصة النجاح">
    <meta property="og:title" content="{html.escape(title)}">
    <meta property="og:description" content="{html.escape(desc)}">
    <meta property="og:url" content="{canonical}">
    <meta property="og:image" content="https://imadtbn.github.io/nadjah/assets/images/og-image.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{html.escape(title)}">
    <meta name="twitter:description" content="{html.escape(desc)}">
    <meta name="twitter:image" content="https://imadtbn.github.io/nadjah/assets/images/og-image.jpg">

<meta content="f5Xi4oFx0v5dN6iPZd9qCw-7vnc3vIbAeYF9jr4vwVM" name="google-site-verification"/>
<link href="https://fonts.googleapis.com" rel="preconnect"/><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&amp;display=swap" rel="stylesheet"/>
<link href="https://cdnjs.cloudflare.com" rel="preconnect"/><script defer="" src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<script defer="" src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet"/>
<link href="../../../../../assets/css/style-modul.css?v=49dc1059b6" rel="stylesheet"/>
<link href="../../../../../assets/css/style-global.css?v=6d9afb6a1f" rel="stylesheet"/>
<script defer="" src="../../../../../assets/js/site-tags.js?v=9d89044cef"></script>
<link href="../../../../../assets/css/ads.css?v=f0167e6382" rel="stylesheet"/>
<meta content="ca-pub-5656416032906373" name="google-adsense-account"/>
<link data-nadjah-ux="true" href="../../../../../assets/css/ux.css?v=1407457fe1" rel="stylesheet"/>
<script async="" src="https://www.googletagmanager.com/gtag/js?id=G-X3Z1DJT3RR"></script>
<script>
        window.dataLayer = window.dataLayer || [];
        function gtag() {{ dataLayer.push(arguments); }}
        gtag('js', new Date());
        gtag('config', 'G-X3Z1DJT3RR');
    </script>
</head>
<body>
<button aria-label="العودة للأعلى" class="scroll-top-btn" id="scrollTopBtn">
<i class="fas fa-chevron-up"></i>
</button>
<div class="cursor" id="cursor"></div>
<div class="cursor-dot" id="cursorDot"></div>
<header class="header" id="header">
<div class="header-inner">
<a class="logo" href="../../../../../index.html">
<img alt="أيقونة منصة النجاح" class="logo-img" decoding="async" height="70" loading="eager" src="../../../../../assets/images/icon22.png" width="70"/>
<div class="logo-text">منصة <span>النجاح</span></div>
</a>
<div class="search-container">
<i class="fas fa-search search-icon"></i>
<input class="search-box" placeholder="ابحث عن نموذج أو وثيقة..." type="text"/>
</div>
<nav class="nav-links">
<a href="../../../../../index.html#starfield">الرئيسية</a>
<a href="../../../../../pages/levels.html">الأطوار</a>
<a href="../../../../../pages/subjects.html#subjects">المواد</a>
<a href="../../../../../pages/contact.html">تواصل</a>
</nav>
<button class="mobile-toggle"><i class="fas fa-bars"></i></button>
</div>
</header>
<div class="breadcrumb">
<a href="../../../../../index.html"><i class="fas fa-home"></i> الرئيسية</a>
<i class="fas fa-chevron-left"></i>
<a href="../../../../../pages/levels.html">الطور الثانوي</a>
<i class="fas fa-chevron-left"></i>
<a href="../../../{branch['slug']}.html">{branch['name']}</a>
<i class="fas fa-chevron-left"></i>
<a href="../../{year['code']}.html">{year['name']}</a>
<i class="fas fa-chevron-left"></i>
<a href="../{subj['key']}-{year['code']}.html">{subj['name']}</a>
<i class="fas fa-chevron-left"></i>
<span class="breadcrumb-current">أرشيف الفصل {sem}</span>
</div>
<section class="hero-subject" data-subject-id="{subj['id']}">
<canvas id="starfield"></canvas>
<div class="hero-subject-content">
<div class="subject-badge">
<i class="{subj['icon']}"></i>
<span>{subj['name']} - الفصل {sem}</span>
</div>
<h1 class="hero-subject-title">
أرشيف نماذج <span class="highlight">{subj['name']}</span><br/> {year['name']} ثانوي - الفصل {sem}
</h1>
<p class="hero-subject-desc">جميع النماذج والأوراق المتاحة للفصل الدراسي {sem} في مادة {subj['name']}.</p>
</div>
</section>
<section class="documents-section" id="documents">
<div class="documents-grid" id="latest-documents-{sem}">
<div class="loading-docs">جاري تحميل المواضيع...</div>
</div>
</section>
<footer class="footer">
<div class="footer-grid">
<div class="footer-brand">
<a class="logo" href="../../../../../index.html">
<div class="logo-icon">
<img alt="أيقونة منصة النجاح" class="footer-logo-img" decoding="async" height="70" loading="lazy" src="../../../../../assets/images/icon22.png" width="70"/>
</div>
<div class="logo-text">منصة <span>النجاح</span></div>
</a>
<p>منصة تعليمية شاملة تقدم نماذج الفروض والاختبارات المصححة لجميع الأطوار التعليمية.</p>
</div>
<div class="footer-section">
<h4>روابط سريعة</h4>
<ul class="footer-links">
<li><a href="../../../../../index.html"><i class="fas fa-chevron-left"></i> الرئيسية</a></li>
<li><a href="../../../../../pages/levels.html"><i class="fas fa-chevron-left"></i> الأطوار التعليمية</a></li>
<li><a href="../../../../../pages/contact.html"><i class="fas fa-chevron-left"></i> اتصل بنا</a></li>
</ul>
</div>
</div>
<div class="footer-bottom">
<p>جميع الحقوق محفوظة © 2026 منصة النجاح</p>
</div>
</footer>
<div class="pdf-modal" id="pdfModal">
<div class="pdf-modal-content">
<button class="pdf-close" onclick="closePDFPreview()"><i class="fas fa-times"></i></button>
<iframe id="pdfViewer" loading="lazy"></iframe>
</div>
</div>
<script defer="" src="../../../../../assets/js/modul.js"></script>
<script defer="" src="../../../../../assets/js/subject-drive-library.js?v=342e438138"></script>
<script data-nadjah-core="true" defer="" src="../../../../../assets/js/core.js?v=36691a4c03"></script>
</body>
</html>
"""

def main():
    created_count = 0
    BRANCH_DIR.mkdir(parents=True, exist_ok=True)
    SUBJECTS_DIR.mkdir(parents=True, exist_ok=True)

    for branch in BRANCHES:
        branch_file = BRANCH_DIR / f"{branch['slug']}.html"
        if not branch_file.exists():
            branch_file.write_text(render_branch_landing(branch), encoding="utf-8")
            created_count += 1
            print(f"Created: {branch_file.relative_to(ROOT).as_posix()}")

        mod_dir = SUBJECTS_DIR / branch["module_dir"]
        mod_dir.mkdir(parents=True, exist_ok=True)
        (mod_dir / "smst1").mkdir(exist_ok=True)
        (mod_dir / "smst2").mkdir(exist_ok=True)
        (mod_dir / "smst3").mkdir(exist_ok=True)

        for year in branch["years"]:
            year_file = SUBJECTS_DIR / f"{year['code']}.html"
            if not year_file.exists():
                year_file.write_text(render_year_landing(branch, year), encoding="utf-8")
                created_count += 1
                print(f"Created: {year_file.relative_to(ROOT).as_posix()}")

            for subj in SUBJECTS_DEFINITION:
                subject_file = mod_dir / f"{subj['key']}-{year['code']}.html"
                if not subject_file.exists():
                    subject_file.write_text(render_subject_page(branch, year, subj), encoding="utf-8")
                    created_count += 1
                    print(f"Created: {subject_file.relative_to(ROOT).as_posix()}")

                for sem in (1, 2, 3):
                    sem_file = mod_dir / f"smst{sem}" / f"{subj['key']}-{year['code']}-sem0{sem}-more.html"
                    if not sem_file.exists():
                        sem_file.write_text(render_semester_archive(branch, year, subj, sem), encoding="utf-8")
                        created_count += 1
                        print(f"Created: {sem_file.relative_to(ROOT).as_posix()}")

    print(f"\nTotal new secondary level pages generated: {created_count}")

if __name__ == "__main__":
    main()
