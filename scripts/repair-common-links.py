#!/usr/bin/env python3
"""Repair high-confidence stale subject/archive links without fabricating content."""
from pathlib import Path
from urllib.parse import urlparse, unquote
import re, html, os
ROOT=Path(".").resolve()
SITE="https://imadtbn.github.io/nadjah/"
ATTR=re.compile(r'''(?is)\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')''')
SUBJECTS={"science","french","math","islamic"}
def rel_url(src, target):
    return os.path.relpath(target, src.parent).replace(os.sep,"/")
def replacement(src, raw, existing):
    value=html.unescape(raw.strip())
    if not value or value.startswith(("#","//")) or re.match(r"^(https?:|mailto:|tel:|javascript:|data:)",value,re.I):
        return None
    if value.startswith(SITE): value="/"+value[len(SITE):]
    u=urlparse(value); path=unquote(u.path)
    if not path: return None
    if path.startswith("/nadjah/"): target=(ROOT/path[len("/nadjah/"):]).resolve()
    elif path.startswith("/"): target=(ROOT/path.lstrip("/")).resolve()
    else: target=(src.parent/path).resolve()
    try: target_rel=target.relative_to(ROOT).as_posix()
    except ValueError: return None
    # Repair stale "Primary01_subject.html" links to the matching actual subject page for that grade.
    m=re.fullmatch(r"Primary01_(science|french|math|islamic)\.html",Path(path).name,re.I)
    if m:
        subject=m.group(1).lower()
        parts=src.relative_to(ROOT).parts
        folder=None; suffix=None
        for i,p in enumerate(parts):
            if p == "modul-preparation":
                suffix="preparation"; folder=Path(*parts[:i+1]); break
            if p.startswith("modul-primry"):
                suffix=p.replace("modul-",""); folder=Path(*parts[:i+1]); break
            if p == "modul-secondary01":
                suffix="secondary01"; folder=Path(*parts[:i+1]); break
            if p == "modul-Scienc-exactes1":
                # Older templates inside this secondary branch used Primary01_* and
                # middle01_* names. Map them to the equivalent first-year branch subject.
                suffix="sc-experimentales01"; folder=Path(*parts[:i+1]); break
            if p.startswith("modul-middle"):
                suffix=p.replace("modul-",""); folder=Path(*parts[:i+1]); break
        if folder and suffix:
            candidate=(folder/f"{subject}-{suffix}.html").as_posix()
            if candidate in existing: return rel_url(src,ROOT/candidate)
    # Repair legacy first-year names found in copied secondary-branch templates.
    legacy_subject = re.fullmatch(r"(?:Primary01_(science|french|math|islamic)|(?:arabic|math|islamic|science|french|history|art|sport|english|physics|technology|accounting|philosophy)-middle01)\.html", Path(path).name, re.I)
    if legacy_subject:
        raw_subject = (legacy_subject.group(1) or Path(path).stem.replace("Primary01_", "").replace("-middle01", "")).lower()
        parts = src.relative_to(ROOT).parts
        if "modul-Scienc-exactes1" in parts:
            folder = Path(*parts[:parts.index("modul-Scienc-exactes1") + 1])
            aliases = {"science": "science", "math": "math", "islamic": "islamic", "french": "french", "arabic": "arabic", "history": "history", "art": "art", "sport": "sport", "english": "english", "physics": "physics", "technology": "technology", "accounting": "accounting", "philosophy": "philosophy"}
            candidate = (folder / f"{aliases.get(raw_subject, raw_subject)}-sc-experimentales01.html").as_posix()
            if candidate in existing:
                return rel_url(src, ROOT / candidate)
    # Older guide routes point to primary indexes now stored under levels/primary.
    if target_rel in {"pages/levels/primary/pri01.html", "pages/primary/primry01.html", "pages/reveal/primary/primry01.html"}:
        candidate = "levels/primary/primry01.html"
        if candidate in existing:
            return rel_url(src, ROOT / candidate)
    # If an archive link is stale, route to the existing subject landing page rather than a dead page.
    if path.endswith("-more.html") and target_rel not in existing:
        name=Path(path).name
        m=re.match(r"(arabic|math|islamic|science|history|art|sport|french)-([a-z0-9-]+)-sem0[123]-more\.html$",name,re.I)
        if m:
            candidate=(target.parent.parent/f"{m.group(1)}-{m.group(2)}.html").resolve()
            try: candidate_rel=candidate.relative_to(ROOT).as_posix()
            except ValueError: candidate_rel=""
            if candidate_rel in existing: return rel_url(src,candidate)
    # Repair obsolete BEM links only when the project has a dedicated exams index.
    if Path(path).name.lower() == "middle-bem.html" and "pages/dzexams.html" in existing:
        return rel_url(src, ROOT/"pages/dzexams.html")
    # A common old root/section route should point to the current levels index.
    if Path(path).name == "levels.html" and "pages/levels.html" in existing:
        return rel_url(src,ROOT/"pages/levels.html")
    return None
existing={p.relative_to(ROOT).as_posix() for p in ROOT.rglob("*") if p.is_file() and ".git" not in p.parts}
changed=[]
for src in ROOT.rglob("*.html"):
    if ".git" in src.parts: continue
    original=src.read_text(encoding="utf-8",errors="replace")
    def sub(m):
        raw=m.group(1) if m.group(1) is not None else m.group(2)
        new=replacement(src,raw,existing)
        if not new or new==raw: return m.group(0)
        quote='"' if m.group(1) is not None else "'"
        return "href="+quote+html.escape(new,quote=True)+quote
    updated=ATTR.sub(sub,original)
    if updated!=original:
        src.write_text(updated,encoding="utf-8")
        changed.append(src.relative_to(ROOT).as_posix())
print("Files repaired: {}".format(len(changed)))
for p in changed: print("- "+p)
