#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""Convert a @handle list into formats convenient for the YT-Tracker extension.

The YT-Tracker popup input only supports adding ONE channel per click.
So for bulk import, the recommended workflow is:
  1) Convert handles into a JSON array string
  2) Paste that string into Chrome DevTools Console (extension popup Inspect)
  3) Run the bulk-add snippet (see README)

This script reads a handles file (one @handle per line) and outputs:
  - a JSON array (one line) suitable to paste into Console
  - optionally a comma-separated one-liner

Usage:
  python3 tools/handles_to_console_json.py handles.txt -o handles.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def read_handles(path: Path) -> list[str]:
    lines = path.read_text("utf-8", errors="ignore").splitlines()
    handles = [ln.strip() for ln in lines if ln.strip()]
    # preserve order + unique
    seen = set()
    out = []
    for h in handles:
        if h not in seen:
            seen.add(h)
            out.append(h)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("handles_file", help="Text file with one @handle per line")
    ap.add_argument("-o", "--out", default="handles.json", help="Output file (JSON array string)")
    ap.add_argument("--comma-out", default="", help="Optional output file for comma-separated one-liner")
    args = ap.parse_args()

    in_path = Path(args.handles_file).expanduser()
    if not in_path.exists():
        raise SystemExit(f"File not found: {in_path}")

    handles = read_handles(in_path)

    json_str = json.dumps(handles, ensure_ascii=False)
    out_path = Path(args.out).expanduser()
    out_path.write_text(json_str, "utf-8")

    if args.comma_out:
        comma_path = Path(args.comma_out).expanduser()
        comma_path.write_text(",".join(handles), "utf-8")

    print(f"Handles: {len(handles)}")
    print(f"Wrote JSON array string: {out_path}")
    if args.comma_out:
        print(f"Wrote comma one-liner: {args.comma_out}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
