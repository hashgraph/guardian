#!/usr/bin/env python3
"""Originality scan for VMR0015.policy.

Usage: python3 tools/verify_originality.py path/to/VMR0015.policy
Exit 0 if clean, 1 if any forbidden marker is present.
"""
import re
import sys
import zipfile

FORBIDDEN = [
    "0.0.3969810",          # CDM token
    "0.0.3969809",          # CDM topic
    "00ad3636",             # Official PP IRI prefix
    "7c6e3bfe",             # Official VVB IRI prefix
    "a76cb53c",             # Official PD IRI prefix
    "8f48da39",             # Official MR IRI prefix
    "approve_PP",
    "approve_VVB",
    "TrustChain",
    "Choose_Roles",
    "project_Pipeline",
    "Monitoring_Reports_sr",
]


def main(path: str) -> int:
    with zipfile.ZipFile(path) as zf:
        with zf.open("policy.json") as fh:
            text = fh.read().decode("utf-8", errors="replace")
    hits = [m for m in FORBIDDEN if re.search(re.escape(m), text)]
    print(f"Originality scan: {len(hits)}/{len(FORBIDDEN)} forbidden markers present")
    if hits:
        for h in hits:
            print(f"  HIT: {h}")
        return 1
    print("OK — clean")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
