#!/usr/bin/env python3
"""Originality scan for VMR0015.policy.

Usage: python3 tools/verify_originality.py path/to/VMR0015.policy
Exit 0 if clean, 1 if any forbidden marker is present, 2 on read error.
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
    "e0013904",             # VMR0015 MR IRI (verified)
    "approve_PP",
    "approve_VVB",
    "TrustChain",
    "Choose_Roles",
    "project_Pipeline",
    "Monitoring_Reports_sr",
]

MAINNET_MSGID = re.compile(r"\b170[6-7]\d{6}\.\d{9}\b")


def main(path: str) -> int:
    try:
        with zipfile.ZipFile(path) as zf:
            with zf.open("policy.json") as fh:
                text = fh.read().decode("utf-8", errors="replace")
    except (FileNotFoundError, KeyError, zipfile.BadZipFile) as e:
        print(f"ERROR reading {path}: {e}", file=sys.stderr)
        return 2

    hits = [m for m in FORBIDDEN if re.search(re.escape(m), text)]
    msgid_hits = MAINNET_MSGID.findall(text)

    print(f"Forbidden markers: {len(hits)}/{len(FORBIDDEN)} present")
    for m in hits:
        print(f"  - {m}")
    print(f"Mainnet messageId pattern: {len(msgid_hits)} hits")
    for m in msgid_hits[:5]:
        print(f"  - {m}")

    clean = (len(hits) == 0 and len(msgid_hits) == 0)
    print(f"\nResult: {'PASS (clean)' if clean else 'FAIL (forensic markers present)'}")
    return 0 if clean else 1


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
