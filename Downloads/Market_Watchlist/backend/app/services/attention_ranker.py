from typing import List, Dict, Tuple

SEVERITY_ORDER = {"HIGH": 0, "MEDIUM": 1, "LOW": 2, "NONE": 3}

def rank(changes: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
    """Returns (meaningful_changes, quiet_stocks) sorted by severity."""
    meaningful = [c for c in changes if c["severity"] != "NONE"]
    quiet = [c for c in changes if c["severity"] == "NONE"]

    meaningful.sort(key=lambda c: (SEVERITY_ORDER.get(c["severity"], 4), -abs(c["stock_change_pct"])))

    return meaningful, quiet
