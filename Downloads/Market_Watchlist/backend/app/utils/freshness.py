from datetime import datetime, timezone

def classify_freshness(recorded_at: datetime) -> tuple[str, int]:
    """Returns (freshness_label, age_in_seconds)"""
    now = datetime.now(timezone.utc)
    age_seconds = int((now - recorded_at).total_seconds())
    if age_seconds < 120:
        label = "fresh"
    elif age_seconds < 900:
        label = "delayed"
    else:
        label = "unavailable"
    return label, age_seconds
