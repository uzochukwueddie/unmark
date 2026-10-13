#!/usr/bin/env python3
"""
Restore files from VS Code's local History store, restricted to one
target project folder.

Usage:
    python3 restore_vscode_history.py            # dry run — shows what would happen
    python3 restore_vscode_history.py --apply     # actually restores files

By default this only prints what it WOULD do. Review the output first,
then rerun with --apply to actually write the files.

Only files whose original path falls under TARGET_ROOT are considered —
everything else found in History is ignored.
"""

import json
import os
import shutil
import sys
import urllib.parse
from pathlib import Path

HISTORY_DIR = Path.home() / "Library/Application Support/Code/User/History"
TARGET_ROOT = Path("/Users/uzochukwuodozi/Documents/udemy/unmarkapp/unmark").resolve()


def resource_to_path(resource_uri: str) -> Path:
    # resource looks like: file:///Users/you/project/src/App.tsx
    parsed = urllib.parse.urlparse(resource_uri)
    return Path(urllib.parse.unquote(parsed.path))


def main():
    apply_changes = "--apply" in sys.argv

    if not HISTORY_DIR.exists():
        print(f"History directory not found: {HISTORY_DIR}")
        sys.exit(1)

    print(f"Restricting to project folder: {TARGET_ROOT}\n")

    restored = 0
    skipped = 0

    for folder in sorted(HISTORY_DIR.iterdir()):
        entries_file = folder / "entries.json"
        if not entries_file.is_file():
            continue

        try:
            data = json.loads(entries_file.read_text())
        except Exception as e:
            print(f"  [skip] Could not parse {entries_file}: {e}")
            skipped += 1
            continue

        resource = data.get("resource")
        entries = data.get("entries", [])
        if not resource or not entries:
            continue

        target_path = resource_to_path(resource)

        # Skip anything outside the target project folder.
        try:
            target_path.resolve().relative_to(TARGET_ROOT)
        except ValueError:
            continue

        # Most recent snapshot = last entry (entries.json is append-ordered)
        latest = max(entries, key=lambda e: e.get("timestamp", 0))
        snapshot_file = folder / latest["id"]

        if not snapshot_file.is_file():
            print(f"  [skip] Snapshot missing on disk: {snapshot_file}")
            skipped += 1
            continue

        exists_note = "EXISTS — will overwrite" if target_path.exists() else "missing — will create"
        print(f"{folder.name}: {target_path}  [{exists_note}]")
        print(f"    from snapshot: {snapshot_file.name}")

        if apply_changes:
            target_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(snapshot_file, target_path)
            restored += 1

    print()
    if apply_changes:
        print(f"Done. Restored {restored} file(s), skipped {skipped}.")
    else:
        print(f"Dry run complete. Would restore files above. Skipped {skipped}.")
        print("Rerun with --apply to actually write these files.")


if __name__ == "__main__":
    main()