#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""Extract YouTube @handles from a saved "Subscriptions → Channels" HTML page.

Input:
  A HTML file saved from https://www.youtube.com/feed/channels
  (after you log into your own YouTube account).

Output:
  A text file containing unique @handles, one per line.

Why this works:
  The saved HTML contains many channel links like:
    https://www.youtube.com/@joeyblog
  We extract the /@handle part and deduplicate.

Usage:
  python3 tools/extract_handles_from_channels_html.py \
    "/path/to/所有订阅频道 - YouTube (...).html" \
    -o handles.txt
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path


HANDLE_RE = re.compile(r"/@([A-Za-z0-9._-]+)")


def extract_handles(text: str) -> list[str]:
    handles = HANDLE_RE.findall(text)
    seen: set[str] = set()
    out: list[str] = []
    for h in handles:
        handle = f"@{h}"
        if handle not in seen:
            seen.add(handle)
            out.append(handle)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("html", help="Path to saved YouTube channels feed HTML")
    ap.add_argument("-o", "--out", default="handles.txt", help="Output text file path")
    args = ap.parse_args()

    html_path = Path(args.html).expanduser()
    if not html_path.exists():
        raise SystemExit(f"File not found: {html_path}")

    text = html_path.read_text("utf-8", errors="ignore")
    handles = extract_handles(text)

    out_path = Path(args.out).expanduser()
    out_path.write_text("\n".join(handles) + ("\n" if handles else ""), "utf-8")

    print(f"Extracted {len(handles)} handles")
    print(f"Wrote: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
