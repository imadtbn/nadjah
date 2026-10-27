#!/usr/bin/env python3
from pathlib import Path
from urllib.parse import urlparse, unquote
import re, json, html, os
ROOT=Path(".").resolve()
SITE="https://imadtbn.github.io/nadjah/"
IGNORE=("http:","https:","mailto:","tel:","javascript:","data:","blob:","sms:")
ATTR=re.compile(r'''(?is)\b(?:href|src|poster|action|data-src|data-href)\s*=\s*(?:"([^"]*)"|'([^']*)')''')
CSS=re.compile(r'''(?is)url\(\s*["']?([^)"']+)''')
IMPORT=re.compile(r'''(?m)(?:import\s+(?:[^;]*?\s+from\s+)?|import\()\s*["']([^"']+\.(?:js|mjs|css))["']''')
results={"scanned_files":0,"broken_internal_links":[],"missing_expected_pages":[],"sitemap_missing_pages":[],"stale_archive_links":[]}
files=[p for p in ROOT.rglob("*") if p.is_file() and ".git" not in p.parts and p.suffix.lower() in {".html",".htm",".js",".mjs",".css",".xml"}]
existing={p.relative_to(ROOT).as_posix() for p in ROOT.rglob("*") if p.is_file() and ".git" not in p.parts}
pages=[p for p in files if p.suffix.lower() in {".html",".htm"}]
def dec(v): return html.unescape(v.strip())
def resolve(src, raw):
 raw=dec(raw)
 if not raw or raw.startswith("#") or raw.lower().startswith(IGNORE) or raw.startswith("//"): return None
 u=urlparse(raw); path=unquote(u.path)
 if not path: return None
 if path.startswith("/nadjah/"): path=path[len("/nadjah/"):]
 elif path.startswith("/"): path=path.lstrip("/")
 else: path=(src.relative_to(ROOT).parent/path).as_posix()
 return Path(os.path.normpath(path)).as_posix()
for src in files:
 try: text=src.read_text(encoding="utf-8",errors="replace")
 except Exception: continue
 results["scanned_files"]+=1
 vals=[]
 if src.suffix.lower() in {".html",".htm",".xml"}:
  vals += [(a or b,"attribute") for a,b in ATTR.findall(text)]
  vals += [(x,"xml-loc") for x in re.findall(r"(?is)<loc>\s*(.*?)\s*</loc>",text)]
 if src.suffix.lower()==".css": vals += [(x,"css-url") for x in CSS.findall(text)]
 if src.suffix.lower() in {".js",".mjs"}:
  # Inspect only literal ES-module imports; generated/template URLs are not filesystem paths.
  vals += [(x,"js-import") for x in IMPORT.findall(text)]
 for raw,kind in vals:
  raw=dec(raw)
  if raw.startswith("#") or raw.lower().startswith(IGNORE) or raw.startswith("//"): continue
  if raw.startswith(SITE): raw="/"+raw[len(SITE):]
  elif re.match(r"^https?://",raw): continue
  target=resolve(src,raw)
  if target is None: continue
  if target not in existing:
   item={"from":src.relative_to(ROOT).as_posix(),"to":target,"raw":raw,"kind":kind}
   results["broken_internal_links"].append(item)
   if "-more.html" in target or "/smst" in target: results["stale_archive_links"].append(item)
subjects=["arabic","math","islamic","science","history","art","sport","french"]
levels=[(f"levels/primary/modul-primry{i:02d}",f"primry{i:02d}") for i in range(1,6)]
levels += [(f"levels/middle/modul-middle{i:02d}",f"middle{i:02d}") for i in range(1,5)]
for folder,suffix in levels:
 for subject in subjects:
  path=f"{folder}/{subject}-{suffix}.html"
  if not (ROOT/path).is_file(): results["missing_expected_pages"].append(path)
sm_path=ROOT/"sitemap.xml"
if sm_path.exists():
 sm=sm_path.read_text(encoding="utf-8",errors="replace")
 # Compare decoded URLs so accented filenames are equivalent whether encoded or literal.
 listed={unquote(html.unescape(value.strip())) for value in re.findall(r"(?is)<loc>\s*(.*?)\s*</loc>",sm)}
 for page in pages:
  rel=page.relative_to(ROOT).as_posix()
  if rel.startswith(("assets/","tools/","partials/")): continue
  # Only report pages that are complete and intended for indexing.
  try: page_text=page.read_text(encoding="utf-8",errors="replace")
  except Exception: continue
  lowered=page_text.lower()
  if "<head" not in lowered or "<title" not in lowered: continue
  if re.search(r"<meta\b(?=[^>]*name=['\"]robots['\"])(?=[^>]*content=['\"][^'\"]*noindex)[^>]*>", page_text, re.I): continue
  # index.html is the same public homepage represented by SITE/ in the sitemap.
  sitemap_url = SITE if rel == "index.html" else SITE+rel
  if sitemap_url not in listed: results["sitemap_missing_pages"].append(rel)
for key in ("broken_internal_links","stale_archive_links"):
 seen=set(); out=[]
 for x in results[key]:
  k=(x["from"],x["to"],x["raw"])
  if k not in seen: seen.add(k); out.append(x)
 results[key]=out
for key in ("missing_expected_pages","sitemap_missing_pages"): results[key]=sorted(set(results[key]))
(ROOT/"link-audit-report.json").write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding="utf-8")
summary=("# Automated internal-link audit\n\n"
 f"- Files scanned: **{results['scanned_files']}**\n"
 f"- Broken internal references: **{len(results['broken_internal_links'])}**\n"
 f"- Missing archive references: **{len(results['stale_archive_links'])}**\n"
 f"- Expected subject pages missing: **{len(results['missing_expected_pages'])}**\n"
 f"- HTML pages absent from sitemap: **{len(results['sitemap_missing_pages'])}**\n\n"
 "Detailed findings are in link-audit-report.json.\n")
(ROOT/"link-audit-summary.md").write_text(summary,encoding="utf-8")
print(summary)
from collections import Counter
target_counts=Counter(x["to"] for x in results["broken_internal_links"])
print("Unique missing targets: {}".format(len(target_counts)))
print("Most referenced missing targets:")
for target,count in target_counts.most_common(100): print("- {} ({} references)".format(target,count))
print("Unique missing archive targets:")
archive_counts=Counter(x["to"] for x in results["stale_archive_links"])
for target,count in archive_counts.most_common(100): print("- {} ({} references)".format(target,count))
print("First 100 broken references:")
for x in results["broken_internal_links"][:100]: print("- {} -> {} (resolved {})".format(x["from"],x["raw"],x["to"]))
print("Missing expected pages:")
for x in results["missing_expected_pages"]: print("- "+x)
print("HTML pages absent from sitemap:")
for x in results["sitemap_missing_pages"]: print("- "+x)
