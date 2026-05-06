#!/usr/bin/env python3
"""Re-run the canonical TC1 worked example against the policy math.

Mirrors the JS in customLogicBlock.calculate_report_fields. Exit 0 if the
result matches evidence/CANONICAL_TC1.md (10.00 tCO2e -> 1000 base units).
"""
import json
import math
import sys
from pathlib import Path

EXPECTED_PATH = Path(__file__).resolve().parent.parent / "tests" / "tc1_expected.json"


def calc_vmr0015(inp: dict) -> dict:
    BE_total = inp["BE_woody"] + inp["BE_fossil"]
    PE_total = (inp["PE_electricity"] + inp["PE_transport"]
                + inp["PE_manufacturing"] + inp["PE_aux"])
    LE_total = (inp["LE_woody"] if inp["f_woody"] > 0 else 0.0) + inp["LE_fossil"]
    ER_raw = BE_total - PE_total - LE_total
    ER_gross = max(0.0, ER_raw)
    # Hard wq gate (matches policy customLogicBlock).
    if inp.get("wq_pass_rate", 1.0) < 0.95:
        ER_gross = 0.0
    # VMR0015 §B.7 / AMS-III.AV uncertainty discount.
    u_def = 0.89
    ER_net = ER_gross * u_def
    mint_units = math.floor(ER_net * 100)
    return {
        "BE_total": round(BE_total, 2),
        "PE_total": round(PE_total, 2),
        "LE_total": round(LE_total, 2),
        "ER_gross": round(ER_gross, 2),
        "u_def": u_def,
        "ER_total": round(ER_net, 2),
        "mint_base_units": mint_units,
    }


def main() -> int:
    with EXPECTED_PATH.open() as fh:
        spec = json.load(fh)
    got = calc_vmr0015(spec["inputs"])
    exp = spec["expected"]
    keys = ["BE_total", "PE_total", "LE_total", "ER_gross", "u_def", "ER_total", "mint_base_units"]
    ok = all(got[k] == exp[k] for k in keys)
    print("Inputs :", json.dumps(spec["inputs"], indent=2))
    print("Got    :", json.dumps(got, indent=2))
    print("Expect :", json.dumps({k: exp[k] for k in keys}, indent=2))
    print("Result :", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
