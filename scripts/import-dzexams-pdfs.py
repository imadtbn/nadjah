#!/usr/bin/env python3
"""Import individually authorized DZExams PDFs from a reviewed CSV manifest.

This program does not scrape listings and performs no download unless --execute
and --confirm-noncommercial are BOTH provided. Output is kept separate from
existing Nadjah resource records until links can be validated.
"""
import argparse
import csv
import hashlib
import json
import re
import sys
import time
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import requests

FIELDS = ("id", "cycleId", "level", "subject", "semester", "type", "corrected", "sourcePageUrl", "pdfUrl")
ALLOWED_CYCLES = {"primary", "middle", "secondary"}
ALLOWED_TYPES = {"homework", "exam", "revision", "exercise", "mixed"}
ALLOWED_HOSTS = {"www.dzexams.com", "dzexams.com"}
MAX_BYTES = 18 * 1024 * 1024
USER_AGENT = "NadjahEducationImporter/1.0 (noncommercial educational use)"


def allowed_url(value):
    url = urlparse(value)
    return url.scheme == "https" and url.hostname in ALLOWED_HOSTS and not url.username and not url.password


def read_csv(path):
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or any(field not in reader.fieldnames for field in FIELDS):
            raise ValueError("Required CSV fields: " + ", ".join(FIELDS))
        rows = list(reader)
    if not rows:
        raise ValueError("No individual resources supplied; never create placeholder PDFs")
    seen = set()
    counts = Counter()
    for index, row in enumerate(rows, 2):
        resource_id = row["id"]
        if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{5,90}", resource_id) or resource_id in seen:
            raise ValueError(f"Invalid or repeated id at row {index}")
        seen.add(resource_id)
        if row["cycleId"] not in ALLOWED_CYCLES or row["type"] not in ALLOWED_TYPES:
            raise ValueError(f"Invalid cycle or type at row {index}")
        if row["corrected"] not in {"true", "false"} or row["semester"] not in {"0", "1", "2", "3"}:
            raise ValueError(f"Invalid correction/semester at row {index}")
        if not row["level"] or not row["subject"]:
            raise ValueError(f"Missing level/subject at row {index}")
        if not allowed_url(row["sourcePageUrl"]) or not allowed_url(row["pdfUrl"]):
            raise ValueError(f"Only verified official HTTPS source links at row {index}")
        counts[row["cycleId"], row["level"], row["subject"], row["semester"]] += 1
    if any(n > 10 for n in counts.values()):
        raise ValueError("At most ten individual documents per subject/level/semester per batch")
    return rows


def source_allows(url, cache):
    parts = urlparse(url)
    domain = parts.scheme + "://" + parts.netloc
    if domain not in cache:
        robot = RobotFileParser(domain + "/robots.txt")
        robot.read()
        cache[domain] = robot
    return cache[domain].can_fetch(USER_AGENT, url)


def download(session, url, target, robots):
    if not source_allows(url, robots):
        raise ValueError("Robots rules deny the requested automated download")
    digest = hashlib.sha256()
    size = 0
    with session.get(url, timeout=(10, 45), stream=True) as response:
        response.raise_for_status()
        if not allowed_url(response.url):
            raise ValueError("Unexpected redirect away from source site")
        if int(response.headers.get("content-length") or 0) > MAX_BYTES:
            raise ValueError("PDF too large")
        target.parent.mkdir(parents=True, exist_ok=True)
        temp = target.with_suffix(".part")
        try:
            with temp.open("wb") as out:
                first = True
                for chunk in response.iter_content(65536):
                    if not chunk:
                        continue
                    if first and not chunk.startswith(b"%PDF-"):
                        raise ValueError("Download is not a PDF")
                    first = False
                    size += len(chunk)
                    if size > MAX_BYTES:
                        raise ValueError("PDF too large")
                    digest.update(chunk)
                    out.write(chunk)
            if size < 100:
                raise ValueError("PDF too small")
            temp.replace(target)
        except Exception:
            temp.unlink(missing_ok=True)
            raise
    return digest.hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--repo-root", type=Path, default=Path("."))
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--confirm-noncommercial", action="store_true")
    args = parser.parse_args()
    rows = read_csv(args.manifest)
    print(f"Manifest validated: {len(rows)} individual resources.")
    if not args.execute:
        print("Dry-run: downloaded 0 PDFs.")
        return
    if not args.confirm_noncommercial:
        parser.error("--confirm-noncommercial is required when --execute is used")
    catalog = args.repo_root / "assets/data/dzexams-imported.json"
    old = json.loads(catalog.read_text(encoding="utf-8")) if catalog.exists() else {"schemaVersion": 1, "resources": []}
    by_id = {r["id"]: r for r in old.get("resources", [])}
    hashes = {r.get("sha256") for r in by_id.values()}
    robots = {}
    session = requests.Session()
    session.headers["User-Agent"] = USER_AGENT
    for row in rows:
        if row["id"] in by_id:
            print("ALREADY IMPORTED", row["id"])
            continue
        subject_key = hashlib.sha256(row["subject"].encode("utf-8")).hexdigest()[:10]
        path = (args.repo_root / "resources/dzexams" / row["cycleId"] / row["level"] /
                subject_key / ("semester-" + row["semester"]) / (row["id"] + ".pdf"))
        try:
            sha = download(session, row["pdfUrl"], path, robots)
            if sha in hashes:
                path.unlink(missing_ok=True)
                print("DUPLICATE PDF", row["id"])
                continue
            hashes.add(sha)
            by_id[row["id"]] = {
                "id": row["id"], "cycleId": row["cycleId"], "level": row["level"],
                "subject": row["subject"], "semester": int(row["semester"]),
                "type": row["type"], "corrected": row["corrected"] == "true",
                "sourcePageUrl": row["sourcePageUrl"],
                "localPdfPath": path.relative_to(args.repo_root).as_posix(),
                "sha256": sha, "attribution": "DZExams — noncommercial educational use"
            }
            print("IMPORTED", row["id"])
        except (requests.RequestException, OSError, ValueError) as e:
            print("NOT IMPORTED", row["id"], str(e), file=sys.stderr)
        time.sleep(2)
    catalog.parent.mkdir(parents=True, exist_ok=True)
    catalog.write_text(json.dumps({
        "schemaVersion": 1, "resources": list(by_id.values())
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
