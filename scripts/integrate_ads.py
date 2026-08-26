from __future__ import annotations

import posixpath
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = {'google4e08a8803a39e9f9.html'}

IN_FEED = [
    ('7867079394', '-fr+56+4k-d4+74'),
    ('8546947691', '-h9-h+8-jr+r8'),
    ('6152718642', '-h6-l+d-jc+qd'),
]
DISPLAY = ['3143411927', '1760836049', '5508509362']
IN_ARTICLE = ['6118497380', '7319898418']
AUTORELAXED = '6528123169'
CLIENT = 'ca-pub-5656416032906373'


def relative_asset(page: Path, asset: str) -> str:
    return posixpath.relpath(asset, start=page.parent.relative_to(ROOT).as_posix())


def newline_for(text: str) -> str:
    return '\r\n' if text.count('\r\n') > text.count('\n') / 2 else '\n'


def ad_markup(kind: str, page_number: int) -> str:
    newline = '\n'
    if kind == 'in-feed':
        slot, layout_key = IN_FEED[page_number % len(IN_FEED)]
        ins = (
            f'<ins class="adsbygoogle" style="display:block" '
            f'data-ad-format="fluid" data-ad-layout-key="{layout_key}" '
            f'data-ad-client="{CLIENT}" data-ad-slot="{slot}" '
            'data-full-width-responsive="true"></ins>'
        )
        extra_class = 'ad-slot--in-feed'
    elif kind == 'in-article':
        slot = IN_ARTICLE[page_number % len(IN_ARTICLE)]
        ins = (
            f'<ins class="adsbygoogle" style="display:block;text-align:center" '
            f'data-ad-layout="in-article" data-ad-format="fluid" '
            f'data-ad-client="{CLIENT}" data-ad-slot="{slot}" '
            'data-full-width-responsive="true"></ins>'
        )
        extra_class = 'ad-slot--in-article'
    elif kind == 'autorelaxed':
        ins = (
            f'<ins class="adsbygoogle" style="display:block" '
            f'data-ad-format="autorelaxed" data-ad-client="{CLIENT}" '
            f'data-ad-slot="{AUTORELAXED}"></ins>'
        )
        extra_class = 'ad-slot--autorelaxed'
    else:
        slot = DISPLAY[page_number % len(DISPLAY)]
        ins = (
            f'<ins class="adsbygoogle" style="display:block" '
            f'data-ad-client="{CLIENT}" data-ad-slot="{slot}" '
            'data-ad-format="auto" data-full-width-responsive="true"></ins>'
        )
        extra_class = 'ad-banner--display'

    container_class = 'ad-banner' if kind == 'display' else 'ad-slot'
    return (
        f'    <!-- إعلان {kind} — تُدار التهيئة من site-tags.js -->{newline}'
        f'    <div class="{container_class} {extra_class}" data-site-ad="true" '
        f'data-ad-type="{kind}" aria-label="إعلان">{newline}'
        f'        <span class="ad-label">إعلان</span>{newline}'
        f'        {ins}{newline}'
        f'    </div>{newline}{newline}'
    )


def inject_head(text: str, page: Path, newline: str) -> str:
    css_src = relative_asset(page, 'assets/css/ads.css')
    css_link = f'    <link rel="stylesheet" href="{css_src}">{newline}'
    adsense_meta = f'    <meta name="google-adsense-account" content="{CLIENT}">{newline}'
    if 'assets/css/ads.css' not in text:
        text = re.sub(r'(?i)([ \t]*</head>)', f'{newline}{css_link}\\1', text, count=1)
    if 'google-adsense-account' not in text:
        text = re.sub(r'(?i)([ \t]*</head>)', f'{newline}{adsense_meta}\\1', text, count=1)
    head_end = re.search(r'(?i)</head>', text)
    if head_end:
        head = text[:head_end.start()].replace('<!-- End Google Tag Manager -->', '')
        text = head + text[head_end.start():]
    return text


def insert_before_marker(text: str, marker: str, markup: str) -> tuple[str, bool]:
    position = text.find(marker)
    if position == -1:
        return text, False
    line_start = text.rfind('\n', 0, position) + 1
    return text[:line_start] + markup + text[line_start:], True


def insert_before_footer(text: str, markup: str) -> tuple[str, bool]:
    return insert_before_marker(text, '<footer', markup)


def update_page(page: Path, page_number: int) -> bool:
    if page.name in EXCLUDED or page.name.startswith('google'):
        return False
    with page.open('r', encoding='utf-8', newline='') as handle:
        text = handle.read()
    if '<head' not in text.lower() or '</head>' not in text.lower():
        return False

    original = text
    newline = newline_for(text)
    text = inject_head(text, page, newline)

    # Place units between major sections, never inside cards or download controls.
    if 'data-site-ad="true"' not in text and 'documents-section' in text:
        text, _ = insert_before_marker(text, '<!-- Related Subjects -->', ad_markup('in-article', page_number))
        text, _ = insert_before_footer(text, ad_markup('display', page_number))
        documents_marker = '<!-- Documents Section -->'
        documents_start = text.find(documents_marker)
        if documents_start != -1:
            section_end = text.find('</section>', documents_start)
            if section_end != -1:
                feed_markup = ad_markup('in-feed', page_number)
                text = text[:section_end + len('</section>')] + newline + newline + feed_markup + text[section_end + len('</section>'):]
    elif 'data-site-ad="true"' not in text and page.name == 'index.html':
        text, _ = insert_before_marker(text, '<!-- Subjects Section -->', ad_markup('in-feed', page_number))
        text, _ = insert_before_marker(text, '<!-- Resources Section -->', ad_markup('display', page_number))
        text, _ = insert_before_footer(text, ad_markup('autorelaxed', page_number))
    elif 'data-site-ad="true"' not in text:
        text, _ = insert_before_footer(text, ad_markup('display', page_number))

    # Every content page should reference the same central loader.
    js_src = relative_asset(page, 'assets/js/site-tags.js')
    if 'assets/js/site-tags.js' not in text:
        loader = f'    <script src="{js_src}" defer></script>{newline}'
        text = re.sub(r'(?i)([ \t]*</head>)', f'{newline}{loader}\\1', text, count=1)

    if text == original:
        return False
    with page.open('w', encoding='utf-8', newline='') as handle:
        handle.write(text)
    return True


pages = [page for page in sorted(ROOT.rglob('*.html')) if page.name not in EXCLUDED and not page.name.startswith('google')]
changed = sum(update_page(page, index) for index, page in enumerate(pages))
print(f'Updated {changed} of {len(pages)} eligible HTML pages')
