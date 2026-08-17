#!/usr/bin/env python3
"""Mark static statistic elements so JavaScript can populate them from site data."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_global_stat(match: re.Match[str]) -> str:
    prefix, classes, old_count, middle, label, suffix = match.groups()
    normalized_label = " ".join(label.split())
    if "نموذج" in normalized_label:
        key = "resources"
    elif "مادة" in normalized_label:
        key = "subjects"
    elif "زائر" in normalized_label:
        key = "correctionRate"
        label = "نسبة النماذج المصححة"
    elif "سنة" in normalized_label or "مستوى" in normalized_label:
        key = "levels"
        label = "مستوى دراسي"
    else:
        return match.group(0)
    if "stat-value" in classes and key == "correctionRate":
        prefix = prefix.replace('<i class="fas fa-users"></i>', '<i class="fas fa-check-circle"></i>')
    return f'{prefix}<span class="{classes}" data-stat-key="{key}">0</span>{middle}{label}{suffix}'


def main() -> None:
    html_files = sorted(ROOT.rglob("*.html"))
    html_files = [path for path in html_files if ".git" not in path.parts]
    global_pattern = re.compile(
        r'(<div class="(?:stat-item|stat-box)"[^>]*>.*?)(?:<span class="(stat-number|stat-value)" data-count="([^"]+)">0</span>)(.*?<span class="stat-label">)(.*?)(</span>.*?</div>)',
        re.DOTALL,
    )
    resource_pattern = re.compile(
        r'<span>([0-9]+)\s*<small>نموذج</small></span>'
    )
    corrected_pattern = re.compile(
        r'<span>([0-9]+)%\s*<small>مصحح</small></span>'
    )

    for path in html_files:
        text = path.read_bytes().decode("utf-8", errors="ignore")
        text = global_pattern.sub(replace_global_stat, text)
        text = resource_pattern.sub('<span data-subject-stat="resources">0 <small>نموذج</small></span>', text)
        text = corrected_pattern.sub('<span data-subject-stat="correctionRate">0% <small>مصحح</small></span>', text)
        path.write_bytes(text.encode("utf-8"))
    print(f"Updated statistic markup in {len(html_files)} HTML pages")


if __name__ == "__main__":
    main()
