"""Parse every generated illustration as XML.

The regex-based checks in verify-lifecycle-illustrations.mjs cannot catch an
opening/ending tag mismatch, which is exactly the bug that produced a file that
passed all 36 structural checks yet would not render at all.
"""
import glob
import sys
import xml.etree.ElementTree as ET

files = sorted(glob.glob("public/lifecycle-stages/*.svg"))
bad = []

for path in files:
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as exc:
        bad.append((path, str(exc)))
        continue

    tag = root.tag.split("}")[-1]
    if tag != "svg":
        bad.append((path, "root element is <%s>, expected <svg>" % tag))

print("parsed: %d" % (len(files) - len(bad)))
print("failed: %d" % len(bad))
for path, msg in bad:
    print("\n  %s\n    %s" % (path, msg))

sys.exit(1 if bad else 0)