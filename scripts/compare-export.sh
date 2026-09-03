#!/usr/bin/env python3
"""Compare two static exports for meaningful difference.

    scripts/compare-export.sh /tmp/out-base out

A raw `diff -r` between two builds of the SAME source is never empty, for four
reasons that say nothing about the site. Learned the hard way, 2026-09-03:

  1. Turbopack names its chunk files per build, so `/_next/static/...` and every
     script tag referencing one differ between any two builds.
  2. Next.js stamps a random 21-character build id into every page's payload.
  3. The React payload numbers its rows, so adding one prop to one client
     component renumbers rows on every page that uses it and shifts the payload
     by ~1KB, with the visible page byte-identical.
  4. `out/course-images/` mirrors what is on disk, so a build taken while
     untracked images are present carries files another build lacks.

So this compares what a READER can see: the HTML with every `<script>` removed,
chunk paths and the build id normalised. It also compares the page inventory by
name, because a missing or extra page is a real difference.

Exit 0 means the two exports are the same site.
"""
import os, re, sys

SCRIPT = re.compile(r'<script\b[^>]*>.*?</script>', re.S)
CHUNK = re.compile(r'/_next/static/[A-Za-z0-9_/.-]+')
BUILD_ID = re.compile(r'\\?"b\\?":\\?"([A-Za-z0-9_-]{21})\\?"')


def visible(path):
    with open(path, encoding='utf-8', errors='replace') as handle:
        text = SCRIPT.sub('', handle.read())
    text = CHUNK.sub('CHUNK', text)
    found = BUILD_ID.search(text)
    return text.replace(found.group(1), 'BUILDID') if found else text


def pages(root):
    out = []
    for dirpath, _, files in os.walk(root):
        if f'{os.sep}_next' in dirpath:
            continue
        out += [os.path.relpath(os.path.join(dirpath, f), root)
                for f in files if f.endswith('.html')]
    return sorted(out)


def main(base, curr):
    left, right = pages(base), pages(curr)
    problems = []

    only_base = sorted(set(left) - set(right))
    only_curr = sorted(set(right) - set(left))
    for page in only_base:
        problems.append(f'page disappeared: {page}')
    for page in only_curr:
        problems.append(f'page appeared: {page}')

    changed = [p for p in left if p in set(right)
               and visible(os.path.join(base, p)) != visible(os.path.join(curr, p))]
    for page in changed:
        problems.append(f'visible html changed: {page}')

    print(f'{len(left)} pages in {base}, {len(right)} in {curr}')
    if not problems:
        print('identical: every page a reader can see is byte-for-byte the same')
        return 0
    print(f'{len(problems)} difference(s):')
    for line in problems:
        print(f'  {line}')
    return 1


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    sys.exit(main(sys.argv[1], sys.argv[2]))
