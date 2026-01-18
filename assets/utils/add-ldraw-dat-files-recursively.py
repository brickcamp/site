import os
import re
import shutil
import argparse

# This script can be used like so:
# python add-ldraw-dat-files-recursively.py [path to ldraw library] [partnumber].dat ../../static/ldraw

PART_REF_RE = re.compile(r'^[1-5]\s.*?\s(\S+\.dat)', re.IGNORECASE | re.MULTILINE)

def normalize_part_name(part_name):
    """
    Remove any folder prefixes like s\ or p/ so we just get the filename
    """
    return os.path.basename(part_name).lower()

def find_part_file(src_folder, part_name):
    """
    Recursively search for part_name (case-insensitive) inside src_folder.
    Returns full path or None if not found.
    """
    normalized_name = normalize_part_name(part_name)
    for root, _, files in os.walk(src_folder):
        for f in files:
            if f.lower() == normalized_name:
                return os.path.join(root, f)
    return None

def copy_dependencies(src_folder, main_part, dst_folder, copied=None):
    """
    Recursively copy main_part and all its dependencies from src_folder to dst_folder,
    preserving relative subfolder paths in dst_folder
    """
    if copied is None:
        copied = set()

    part_key = normalize_part_name(main_part)
    if part_key in copied:
        return
    copied.add(part_key)

    src_path = find_part_file(src_folder, main_part)
    if src_path is None:
        print(f"[WARNING] Could not find {main_part} in {src_folder}")
        return

    # Preserve subfolder structure relative to src_folder
    rel_path = os.path.relpath(src_path, src_folder)
    dst_path = os.path.join(dst_folder, rel_path)
    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    shutil.copy2(src_path, dst_path)
    print(f"Copied {main_part} -> {dst_path}")

    # Parse file for sub-part references
    with open(src_path, "r") as f:
        content = f.read()

    for match in PART_REF_RE.finditer(content):
        sub_part = match.group(1).replace("\\", "/")
        copy_dependencies(src_folder, sub_part, dst_folder, copied)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Copy LDraw DAT file and dependencies (ignore folder prefixes)")
    parser.add_argument("src_folder", help="Path to LDraw parts library")
    parser.add_argument("main_part", help="DAT file to start with, e.g., 3004.dat or s\\3004s01.dat")
    parser.add_argument("dst_folder", help="Target folder to copy files into")
    args = parser.parse_args()

    copy_dependencies(args.src_folder, args.main_part, args.dst_folder)
