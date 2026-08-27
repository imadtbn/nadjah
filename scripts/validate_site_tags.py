from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = {'google4e08a8803a39e9f9.html'}
EXPECTED_CLIENT = 'ca-pub-5656416032906373'
EXPECTED_GTM = 'GTM-5FW5WZZ4'
EXPECTED_GA4 = 'G-67JEETTJD7'
PLACEHOLDER = 'xxxxxxxx'


def fail(message: str) -> None:
    print(f'FAIL: {message}')
    sys.exit(1)


pages = [
    page for page in sorted(ROOT.rglob('*.html'))
    if page.name not in EXCLUDED and not page.name.startswith('google')
    and '<head' in page.read_text(encoding='utf-8').lower()
    and '<title' in page.read_text(encoding='utf-8').lower()
]

if len(pages) != 135:
    fail(f'expected 135 content pages, found {len(pages)}')

loader_path_pattern = re.compile(r'assets/js/site-tags\.js')
css_path_pattern = re.compile(r'assets/css/ads\.css')
direct_patterns = {
    'gtm.js': re.compile(r'googletagmanager\.com/gtm\.js'),
    'gtag.js': re.compile(r'googletagmanager\.com/gtag/js'),
    'adsbygoogle.js': re.compile(r'googlesyndication\.com/pagead/js/adsbygoogle\.js'),
    'clarity.ms': re.compile(r'clarity\.ms/tag/'),
}

for page in pages:
    text = page.read_text(encoding='utf-8')
    if len(loader_path_pattern.findall(text)) != 1:
        fail(f'{page}: expected exactly one site-tags.js reference')
    if len(css_path_pattern.findall(text)) != 1:
        fail(f'{page}: expected exactly one ads.css reference')
    for name, pattern in direct_patterns.items():
        if pattern.search(text):
            fail(f'{page}: direct {name} loading remains in HTML')
    if 'gtag(' in text or 'gtag.js' in text:
        fail(f'{page}: direct Google Analytics code remains in HTML')

loader = (ROOT / 'assets/js/site-tags.js').read_text(encoding='utf-8')
for value in (EXPECTED_GTM, EXPECTED_GA4, EXPECTED_CLIENT, PLACEHOLDER):
    if value not in loader:
        fail(f'site-tags.js is missing expected identifier or placeholder: {value}')
if 'isConfigured' not in loader or '!/^x+$/i.test(value)' not in loader:
    fail('site-tags.js does not guard missing placeholder identifiers')

ad_units = []
for page in pages:
    text = page.read_text(encoding='utf-8')
    ad_units.extend(re.findall(r'<ins\b[^>]*class="adsbygoogle"[^>]*>', text, flags=re.IGNORECASE))

if not ad_units:
    fail('no AdSense units found')
for unit in ad_units:
    if f'data-ad-client="{EXPECTED_CLIENT}"' not in unit or 'data-ad-slot=' not in unit:
        fail('an AdSense unit is missing data-ad-client or data-ad-slot')

print(f'Tag validation passed: {len(pages)} pages, {len(ad_units)} AdSense units, one central loader per page')
