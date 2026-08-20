from __future__ import annotations

import posixpath
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML_FILES = sorted(ROOT.rglob('*.html'))

ADSENSE_SCRIPT_RE = re.compile(
    r'[ \t]*<script\b[^>]*src=["\'][^"\']*pagead2?\.googlesyndication\.com/pagead/js/adsbygoogle\.js[^"\']*["\'][^>]*>[ \t]*</script>[ \t]*(?:\r?\n)?',
    re.IGNORECASE,
)
ADSENSE_INLINE_RE = re.compile(
    r'[ \t]*<script>[ \t]*\(adsbygoogle\s*=\s*window\.adsbygoogle\s*\|\|\s*\[\]\)\.push\(\{\}\);?[ \t]*</script>[ \t]*(?:\r?\n)?',
    re.IGNORECASE,
)
ADSENSE_META_RE = re.compile(
    r'[ \t]*<meta\s+name=["\']google-adsense-account["\'][^>]*>[ \t]*(?:\r?\n)?',
    re.IGNORECASE,
)


def relative_asset(page: Path, asset: str) -> str:
    return posixpath.relpath(asset, start=page.parent.relative_to(ROOT).as_posix())


def update_page(page: Path) -> bool:
    with page.open('r', encoding='utf-8', newline='') as handle:
        text = handle.read()
    original = text
    newline = '\r\n' if text.count('\r\n') > text.count('\n') / 2 else '\n'

    text = ADSENSE_SCRIPT_RE.sub('', text)
    text = ADSENSE_INLINE_RE.sub('', text)
    text = ADSENSE_META_RE.sub('', text)

    css_href = relative_asset(page, 'assets/css/ads.css')
    js_src = relative_asset(page, 'assets/js/ads.js')
    meta = f'    <meta name="google-adsense-account" content="ca-pub-5656416032906373">{newline}'
    css_link = f'    <link rel="stylesheet" href="{css_href}">{newline}'
    ads_script = f'    <script defer src="{js_src}"></script>{newline}'

    if 'name="google-adsense-account"' not in text:
        text = re.sub(r'(?i)([ \t]*</head>)', f'{newline}{meta}\\1', text, count=1)
    if 'assets/css/ads.css' not in text:
        text = re.sub(r'(?i)([ \t]*</head>)', f'{newline}{css_link}\\1', text, count=1)
    if 'assets/js/ads.js' not in text and re.search(r'(?i)</body>', text):
        text = re.sub(r'(?i)([ \t]*</body>)', f'{newline}{ads_script}\\1', text, count=1)

    if text == original:
        return False
    with page.open('w', encoding='utf-8', newline='') as handle:
        handle.write(text)
    return True


changed = sum(update_page(page) for page in HTML_FILES)
print(f'Updated {changed} of {len(HTML_FILES)} HTML files')
