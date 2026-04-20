"""
Parse JoSAA Round 6 HTML files for multiple years.
Outputs:
  - josaa_data.txt         → NITs + IIITs + GFTIs (all years combined, with Year column)
  - josaa_iit_data.txt     → IITs only (all years combined, with Year column)

Usage:
  python parse_josaa.py

Place HTML files as:
  josaa_2025_r6.html, josaa_2024_r6.html, josaa_2023_r6.html, josaa_2022_r6.html
"""

import csv
import os
import re
from bs4 import BeautifulSoup

YEARS = [2025, 2024, 2023, 2022]
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def is_iit(institute: str) -> bool:
    # Normalize multiple spaces before checking
    normalized = " ".join(institute.lower().split())
    return "indian institute of technology" in normalized


def parse_html(path: str) -> list[list[str]]:
    """Parse a JoSAA HTML file and return list of data rows (no header)."""
    with open(path, encoding="utf-8") as f:
        soup = BeautifulSoup(f, "html.parser")

    # Try known table id first
    table = soup.find("table", id="ctl00_ContentPlaceHolder1_GridView1")
    if not table:
        tables = soup.find_all("table")
        if not tables:
            print(f"  WARNING: No tables found in {path}")
            return []
        table = max(tables, key=lambda t: len(t.find_all("tr")))
        print(f"  Fallback: using largest table with {len(table.find_all('tr'))} rows")

    rows = table.find_all("tr")
    data = []
    for row in rows:
        cells = row.find_all(["th", "td"])
        values = [c.get_text(strip=True) for c in cells]
        if values:
            data.append(values)
    return data


def is_header_row(row: list[str]) -> bool:
    return row[0].lower() in ("institute", "institution", "academic program name", "s.no.")


HEADER = ["Institute", "Branch", "Quota", "SeatType", "Gender", "OpeningRank", "ClosingRank", "Year"]

nit_rows = []
iit_rows = []

for year in YEARS:
    html_path = os.path.join(SCRIPT_DIR, f"josaa_{year}_r6.html")
    if not os.path.exists(html_path):
        print(f"Skipping {year} — file not found: {html_path}")
        continue
    if os.path.getsize(html_path) == 0:
        print(f"Skipping {year} — file is empty")
        continue

    print(f"\nParsing {year}...")
    raw = parse_html(html_path)

    # Find header row to know column order
    header_idx = next((i for i, r in enumerate(raw) if is_header_row(r)), None)
    data_rows = raw[header_idx + 1:] if header_idx is not None else raw

    added_nit = added_iit = 0
    for row in data_rows:
        if len(row) < 7:
            continue
        institute = row[0].strip()
        if not institute:
            continue
        entry = row[:7] + [str(year)]
        if is_iit(institute):
            iit_rows.append(entry)
            added_iit += 1
        else:
            nit_rows.append(entry)
            added_nit += 1

    print(f"  NITs/IIITs/GFTIs: {added_nit}  |  IITs: {added_iit}")


def write_tsv(path: str, header: list[str], rows: list[list[str]]):
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, delimiter="\t")
        writer.writerow(header)
        writer.writerows(rows)
    print(f"\nSaved {len(rows)} rows → {path}")


nit_out = os.path.join(SCRIPT_DIR, "josaa_data.txt")
iit_out = os.path.join(SCRIPT_DIR, "josaa_iit_data.txt")

write_tsv(nit_out, HEADER, nit_rows)
write_tsv(iit_out, HEADER, iit_rows)

# Quick preview
print("\n--- Preview josaa_data.txt (first 3 data rows) ---")
for row in nit_rows[:3]:
    print("\t".join(row))

print("\n--- Preview josaa_iit_data.txt (first 3 data rows) ---")
for row in iit_rows[:3]:
    print("\t".join(row))
