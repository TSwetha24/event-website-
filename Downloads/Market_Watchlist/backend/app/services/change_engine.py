from typing import List, Dict, Any
from app.utils.freshness import classify_freshness
from app.utils.market_hours import is_market_open

def compute_changes(
    db,
    user_watchlist_stocks: list,
    current_benchmark_val: float,
    baseline_benchmark_val: float,
    settings
) -> List[Dict[str, Any]]:
    
    bench_change_pct = 0.0
    if baseline_benchmark_val and baseline_benchmark_val > 0:
        bench_change_pct = ((float(current_benchmark_val) - float(baseline_benchmark_val)) / float(baseline_benchmark_val)) * 100

    results = []
    market_active = is_market_open()
    
    for stock, current_snapshot, baseline_price in user_watchlist_stocks:
        if not baseline_price or baseline_price == 0 or not current_snapshot:
            continue
            
        curr_price = float(current_snapshot.price)
        base_price = float(baseline_price)
        
        stock_change_pct = ((curr_price - base_price) / base_price) * 100
        relative_change_pct = stock_change_pct - bench_change_pct
        
        abs_stock = abs(stock_change_pct)
        abs_rel = abs(relative_change_pct)
        
        # Determine Event Type & Severity based on alpha and raw move
        if relative_change_pct >= settings.RELATIVE_MOVE_MEDIUM_THRESHOLD:
            event_type = "outperform"
            severity = "HIGH" if abs_rel >= settings.RELATIVE_MOVE_HIGH_THRESHOLD or abs_stock >= settings.PRICE_MOVE_HIGH_THRESHOLD else "MEDIUM"
        elif relative_change_pct <= -settings.RELATIVE_MOVE_MEDIUM_THRESHOLD:
            event_type = "underperform"
            severity = "HIGH" if abs_rel >= settings.RELATIVE_MOVE_HIGH_THRESHOLD or abs_stock >= settings.PRICE_MOVE_HIGH_THRESHOLD else "MEDIUM"
        elif abs_stock >= settings.PRICE_MOVE_HIGH_THRESHOLD:
            event_type = "price_move"
            severity = "HIGH"
        elif abs_stock >= settings.PRICE_MOVE_MEDIUM_THRESHOLD:
            event_type = "price_move"
            severity = "MEDIUM"
        else:
            event_type = "price_move"
            severity = "NONE"
                
        # Generate clean, precise, evidence-backed explanation
        if event_type == "outperform":
            if stock_change_pct >= 0:
                explanation = (
                    f"{stock.symbol} surged {stock_change_pct:+.2f}% from your baseline, "
                    f"outperforming NIFTY 50 by {relative_change_pct:.2f} percentage points."
                )
            else:
                explanation = (
                    f"{stock.symbol} fell {abs(stock_change_pct):.2f}%, but held up better than NIFTY 50 ({bench_change_pct:+.2f}%), "
                    f"outperforming by {relative_change_pct:.2f} percentage points."
                )
        elif event_type == "underperform":
            explanation = (
                f"{stock.symbol} fell {abs(stock_change_pct):.2f}% from your baseline, "
                f"underperforming NIFTY 50 by {abs(relative_change_pct):.2f} percentage points."
            )
        else:
            if severity != "NONE":
                explanation = (
                    f"{stock.symbol} moved {stock_change_pct:+.2f}% from baseline (₹{base_price:,.2f} → ₹{curr_price:,.2f}), "
                    f"largely in line with broader market momentum ({bench_change_pct:+.2f}%)."
                )
            else:
                explanation = (
                    f"{stock.symbol} moved {stock_change_pct:+.2f}%, remaining within typical market variance."
                )

        freshness_label, age = classify_freshness(current_snapshot.recorded_at)
        if not market_active:
            freshness_label = "market_closed"
        
        results.append({
            "stock_id": stock.id,
            "symbol": stock.symbol,
            "name": stock.name,
            "severity": severity,
            "event_type": event_type,
            "price_baseline": base_price,
            "price_current": curr_price,
            "stock_change_pct": stock_change_pct,
            "benchmark_change_pct": bench_change_pct,
            "relative_change_pct": relative_change_pct,
            "explanation": explanation,
            "freshness": freshness_label,
            "data_age_seconds": age
        })
        
    return results
