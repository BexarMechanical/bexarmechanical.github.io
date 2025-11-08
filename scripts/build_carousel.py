#!/usr/bin/env python3
"""
Build carousel.json from images.

Usage examples (run from your site root next to index.html):
  python build_carousel.py
  python build_carousel.py --images-root images/carousel
  python build_carousel.py --images-root images --output carousel.json
  python build_carousel.py --url-prefix / --sort mtime
  python build_carousel.py --dry-run

Notes:
- By default, scans ./images/carousel (recursively) for image files.
- Produces entries: {"src","alt","caption","link"}.
- "src" uses POSIX-style paths and is prefixed with --url-prefix (default "/").
- "caption" and "alt" are derived from file names; common HVAC acronyms are preserved.
"""

import argparse
import json
import os
from pathlib import Path, PurePosixPath
import re
from typing import Iterable, List, Dict

SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

ACRONYM_MAP = {
    "ac": "AC",
    "hvac": "HVAC",
    "iaq": "IAQ",
    "uv": "UV",
    "hepa": "HEPA",
    "rtu": "RTU",
    "ahu": "AHU",
    "mini": "Mini",
    "split": "Split",  # handled with "mini split" -> "Mini Split"
}

def humanize_filename(stem: str) -> str:
    """
    Convert a filename stem into a nice caption, preserving common HVAC acronyms.
    Example: 'furnace-tuneup_2025' -> 'Furnace Tune-Up'
    """
    # Normalize separators and trim numeric-only tokens at ends
    name = stem.replace("%20", " ")
    tokens = re.split(r"[_\-\s]+", name)
    tokens = [t for t in tokens if t]  # drop empties

    # Remove leading/trailing tokens that are only digits (common export suffixes)
    while tokens and tokens[0].isdigit():
        tokens.pop(0)
    while tokens and tokens[-1].isdigit():
        tokens.pop()

    if not tokens:
        return "Photo"

    # fix common words and acronyms
    fixed: List[str] = []
    for t in tokens:
        low = t.lower()
        if low in ACRONYM_MAP:
            fixed.append(ACRONYM_MAP[low])
        else:
            # Capitalize first letter, rest lower
            fixed.append(t[:1].upper() + t[1:].lower())

    caption = " ".join(fixed)

    # Cleanups
    caption = caption.replace("Tuneup", "Tune-Up")
    caption = caption.replace("Mini Split", "Mini-Split")
    caption = re.sub(r"\bHepa\b", "HEPA", caption)

    # Collapse spaces
    caption = re.sub(r"\s{2,}", " ", caption).strip()
    return caption or "Photo"

def discover_images(images_root: Path, recursive: bool) -> Iterable[Path]:
    if recursive:
        yield from (p for p in images_root.rglob("*") if p.suffix.lower() in SUPPORTED_EXTS and p.is_file())
    else:
        yield from (p for p in images_root.iterdir() if p.suffix.lower() in SUPPORTED_EXTS and p.is_file())

def to_url(prefix: str, path_from_root: Path) -> str:
    # Ensure POSIX-style URL regardless of OS, and prefix with url-prefix (default "/")
    url = PurePosixPath(*path_from_root.parts)
    prefix = prefix or ""
    if prefix.endswith("/"):
        return f"{prefix}{url}"
    elif prefix:
        return f"{prefix}/{url}"
    return f"/{url}"

def build_entries(
    files: Iterable[Path],
    site_root: Path,
    url_prefix: str,
    default_link: str,
) -> List[Dict]:
    entries: List[Dict] = []
    for f in files:
        try:
            rel = f.relative_to(site_root)
        except ValueError:
            # If images_root is outside site_root, fall back to relative to images_root parent
            rel = f.name
        src = to_url(url_prefix, rel if isinstance(rel, Path) else Path(rel))
        caption = humanize_filename(f.stem)
        entry = {
            "src": src,
            "alt": caption,
            "caption": caption,
            "link": default_link,
        }
        entries.append(entry)
    return entries

def sort_files(files: List[Path], mode: str) -> List[Path]:
    if mode == "name":
        return sorted(files, key=lambda p: p.name.lower())
    if mode == "mtime":
        return sorted(files, key=lambda p: p.stat().st_mtime, reverse=True)
    if mode == "path":
        return sorted(files, key=lambda p: str(p).lower())
    return files

def main():
    parser = argparse.ArgumentParser(description="Generate carousel.json from images.")
    parser.add_argument("--images-root", default="images/carousel", help="Folder to scan (default: images/carousel)")
    parser.add_argument("--site-root", default=".", help="Site root for making URL paths relative (default: .)")
    parser.add_argument("--output", default="carousel.json", help="Output JSON path (default: carousel.json)")
    parser.add_argument("--url-prefix", default="/", help="URL prefix for src paths, e.g. '/' or 'https://example.com'")
    parser.add_argument("--default-link", default="#services", help="Default link for each slide (default: #services)")
    parser.add_argument("--sort", choices=["name", "path", "mtime"], default="name", help="Sort order (default: name)")
    parser.add_argument("--no-recursive", action="store_true", help="Do not scan subfolders")
    parser.add_argument("--dry-run", action="store_true", help="Print JSON to stdout but don't write file")
    args = parser.parse_args()

    images_root = Path(args.images_root).resolve()
    site_root = Path(args.site_root).resolve()

    if not images_root.exists() or not images_root.is_dir():
        parser.error(f"images-root does not exist or is not a directory: {images_root}")

    files = list(discover_images(images_root, recursive=not args.no_recursive))
    files = sort_files(files, args.sort)

    entries = build_entries(files, site_root=site_root, url_prefix=args.url_prefix, default_link=args.default_link)

    # Write or print
    if args.dry_run:
        print(json.dumps(entries, indent=2, ensure_ascii=False))
    else:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(entries, f, indent=2, ensure_ascii=False)
        rel = os.path.relpath(out_path.resolve(), Path.cwd())
        print(f"Wrote {len(entries)} slide(s) to {rel}")

if __name__ == "__main__":
    main()
