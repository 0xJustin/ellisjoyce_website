#!/usr/bin/env python3
"""Build a local bird catalog by combining ABA checklist data with eBird taxonomy."""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
import urllib.request
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import unicodedata

ABA_ZIP_URL = "https://www.aba.org/wp-content/uploads/2026/01/ABA_Checklist-8.19.csv.zip"
EBIRD_TAXONOMY_URL = (
    "https://www.birds.cornell.edu/clementschecklist/wp-content/uploads/2025/10/eBird_taxonomy_v2025.csv"
)
DEFAULT_CODES = {1, 2, 3, 4, 5}

# Known naming mismatches between ABA and eBird common names.
MANUAL_COMMON_TO_EBIRD = {
    "Graylag Goose": "Greylag Goose",
}


@dataclass
class AbaSpeciesRow:
    aba_sort: int
    aba_code: int
    common_name: str
    scientific_name: str
    alpha_code: str
    family_group: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--aba-url", default=ABA_ZIP_URL)
    parser.add_argument("--ebird-url", default=EBIRD_TAXONOMY_URL)
    parser.add_argument(
        "--out",
        default="src/data/birds/birdCatalog.json",
        help="Output JSON file path",
    )
    parser.add_argument(
        "--cache-dir",
        default=".cache/birds",
        help="Cache directory for downloaded source files",
    )
    parser.add_argument(
        "--include-codes",
        default="1,2,3,4,5",
        help="Comma-separated ABA codes to include",
    )
    return parser.parse_args()


def fetch_bytes(url: str, cache_path: Path) -> bytes:
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    if cache_path.exists():
        return cache_path.read_bytes()

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "*/*",
        },
    )
    with urllib.request.urlopen(request) as response:
        payload = response.read()

    cache_path.write_bytes(payload)
    return payload


def extract_aba_csv(zip_bytes: bytes) -> bytes:
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as archive:
        candidates = [name for name in archive.namelist() if name.lower().endswith(".csv")]
        if not candidates:
            raise RuntimeError("ABA zip did not include a CSV file")

        target_name = sorted(candidates, key=lambda value: (value.startswith("__MACOSX/"), value))[0]
        return archive.read(target_name)


def parse_aba_rows(csv_bytes: bytes, include_codes: set[int]) -> tuple[list[AbaSpeciesRow], str]:
    text = csv_bytes.decode("utf-8-sig")
    rows = list(csv.reader(io.StringIO(text)))
    if not rows:
        raise RuntimeError("ABA CSV file was empty")

    header_text = ""
    if rows[0] and len(rows[0]) > 1:
        header_text = rows[0][1].strip()

    parsed_rows: list[AbaSpeciesRow] = []
    current_family_group = "Unknown Family"
    aba_sort = 0

    for row in rows[1:]:
        if not row:
            continue

        padded = (row + ["", "", "", "", "", ""])[:6]
        col1, col2, _col3, col4, col5, col6 = [value.strip() for value in padded]

        if col1 and not col2 and not col4 and not col5 and not col6:
            current_family_group = col1
            continue

        if not col1 and col2 and col4:
            try:
                aba_code = int(col6)
            except ValueError:
                continue

            if aba_code not in include_codes:
                continue

            aba_sort += 1
            parsed_rows.append(
                AbaSpeciesRow(
                    aba_sort=aba_sort,
                    aba_code=aba_code,
                    common_name=clean_aba_common_name(col2),
                    scientific_name=clean_scientific_name(col4),
                    alpha_code=col5,
                    family_group=current_family_group,
                )
            )

    if not parsed_rows:
        raise RuntimeError("No ABA species rows were parsed for requested codes")

    return parsed_rows, header_text


def parse_ebird_rows(csv_bytes: bytes) -> list[dict[str, str]]:
    text = csv_bytes.decode("utf-8-sig")
    rows = list(csv.DictReader(io.StringIO(text)))
    species_rows = [row for row in rows if row.get("CATEGORY") == "species"]
    if not species_rows:
        raise RuntimeError("No CATEGORY=species rows found in eBird taxonomy CSV")
    return species_rows


def build_index(rows: list[dict[str, str]], key_field: str) -> dict[str, list[dict[str, str]]]:
    index: dict[str, list[dict[str, str]]] = {}
    for row in rows:
        key = normalize_key(row.get(key_field, ""))
        if not key:
            continue
        index.setdefault(key, []).append(row)
    return index


def map_species(
    aba_rows: list[AbaSpeciesRow],
    ebird_rows: list[dict[str, str]],
) -> tuple[list[dict[str, Any]], list[AbaSpeciesRow]]:
    ebird_by_sci = build_index(ebird_rows, "SCI_NAME")
    ebird_by_common = build_index(ebird_rows, "PRIMARY_COM_NAME")

    catalog_rows: list[dict[str, Any]] = []
    unmatched: list[AbaSpeciesRow] = []

    for aba in aba_rows:
        match = find_ebird_match(aba, ebird_by_sci, ebird_by_common)

        if not match:
            unmatched.append(aba)

        taxon_order = int(match["TAXON_ORDER"]) if match and match.get("TAXON_ORDER") else (900000 + aba.aba_sort)
        order_name = match["ORDER"] if match else "Unresolved"
        family_name = match["FAMILY"] if match else extract_family_name(aba.family_group)

        catalog_rows.append(
            {
                "abaSort": aba.aba_sort,
                "abaCode": aba.aba_code,
                "alphaCode": aba.alpha_code,
                "commonName": aba.common_name,
                "scientificName": aba.scientific_name,
                "abaFamilyGroup": aba.family_group,
                "taxonOrder": taxon_order,
                "order": order_name,
                "family": family_name,
                "speciesCode": match.get("SPECIES_CODE") if match else None,
                "taxonConceptId": match.get("TAXON_CONCEPT_ID") if match else None,
                "ebirdCommonName": match.get("PRIMARY_COM_NAME") if match else None,
                "matchedToEbird": bool(match),
            }
        )

    catalog_rows.sort(key=lambda item: (item["taxonOrder"], item["abaSort"]))
    return catalog_rows, unmatched


def find_ebird_match(
    aba: AbaSpeciesRow,
    ebird_by_sci: dict[str, list[dict[str, str]]],
    ebird_by_common: dict[str, list[dict[str, str]]],
) -> dict[str, str] | None:
    common_variants = build_common_variants(aba.common_name)
    sci_variants = build_scientific_variants(aba.scientific_name)

    for scientific_name in sci_variants:
        key = normalize_key(scientific_name)
        if not key:
            continue
        candidates = ebird_by_sci.get(key, [])
        if candidates:
            return pick_best_candidate(candidates, common_variants)

    for common_name in common_variants:
        key = normalize_key(common_name)
        if not key:
            continue
        candidates = ebird_by_common.get(key, [])
        if candidates:
            return pick_best_candidate(candidates, common_variants)

    return None


def pick_best_candidate(candidates: list[dict[str, str]], common_variants: list[str]) -> dict[str, str]:
    if len(candidates) == 1:
        return candidates[0]

    normalized_variants = {normalize_key(value) for value in common_variants}
    for candidate in candidates:
        candidate_common = normalize_key(candidate.get("PRIMARY_COM_NAME", ""))
        if candidate_common in normalized_variants:
            return candidate

    return candidates[0]


def build_common_variants(common_name: str) -> list[str]:
    values = {
        common_name.strip(),
        remove_trailing_star(common_name.strip()),
        strip_parenthetical(common_name.strip()),
    }

    replacement = MANUAL_COMMON_TO_EBIRD.get(common_name.strip())
    if replacement:
        values.add(replacement)

    cleaned = {value for value in values if value}
    return sorted(cleaned)


def build_scientific_variants(scientific_name: str) -> list[str]:
    values = {scientific_name.strip()}
    prefix = re.sub(r"\s*\([^)]*\)", "", scientific_name).strip()
    if prefix:
        values.add(prefix)

    parenthetical = re.findall(r"\(([^)]*)\)", scientific_name)
    for candidate in parenthetical:
        cleaned = candidate.strip()
        if cleaned:
            values.add(cleaned)

    return sorted(value for value in values if value)


def clean_aba_common_name(value: str) -> str:
    cleaned = remove_trailing_star(value.strip())
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def clean_scientific_name(value: str) -> str:
    cleaned = value.strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def remove_trailing_star(value: str) -> str:
    return value[:-1].strip() if value.endswith("*") else value


def strip_parenthetical(value: str) -> str:
    stripped = re.sub(r"\s*\([^)]*\)", "", value)
    return re.sub(r"\s+", " ", stripped).strip()


def normalize_key(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    ascii_text = ascii_text.lower()
    ascii_text = ascii_text.replace("&", " and ")
    ascii_text = re.sub(r"[^a-z0-9]+", " ", ascii_text)
    return re.sub(r"\s+", " ", ascii_text).strip()


def extract_family_name(family_group: str) -> str:
    match = re.search(r"\(([^()]+)\)\s*$", family_group)
    if match:
        return match.group(1)
    return family_group


def parse_aba_version(header_text: str) -> str | None:
    match = re.search(r"Version\s+([\d.]+)", header_text, flags=re.IGNORECASE)
    return match.group(1) if match else None


def parse_aba_date(header_text: str) -> str | None:
    match = re.search(r"-\s*(\d{2}/\d{4})\s*-", header_text)
    return match.group(1) if match else None


def parse_ebird_version(url: str) -> str | None:
    match = re.search(r"eBird_taxonomy_v(\d{4})", url, flags=re.IGNORECASE)
    return match.group(1) if match else None


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    args = parse_args()
    include_codes = {int(code.strip()) for code in args.include_codes.split(",") if code.strip()}

    cache_dir = Path(args.cache_dir)
    aba_zip_bytes = fetch_bytes(args.aba_url, cache_dir / "aba-checklist.zip")
    ebird_csv_bytes = fetch_bytes(args.ebird_url, cache_dir / "ebird-taxonomy.csv")

    aba_rows, aba_header = parse_aba_rows(extract_aba_csv(aba_zip_bytes), include_codes)
    ebird_rows = parse_ebird_rows(ebird_csv_bytes)

    catalog_rows, unmatched = map_species(aba_rows, ebird_rows)

    output_payload = {
        "metadata": {
            "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
            "abaSourceUrl": args.aba_url,
            "abaVersion": parse_aba_version(aba_header),
            "abaDate": parse_aba_date(aba_header),
            "ebirdSourceUrl": args.ebird_url,
            "ebirdTaxonomyVersion": parse_ebird_version(args.ebird_url),
            "includeCodes": sorted(include_codes),
            "speciesCount": len(catalog_rows),
            "unmatchedCount": len(unmatched),
        },
        "species": catalog_rows,
    }

    write_json(Path(args.out), output_payload)

    print(f"Wrote {len(catalog_rows)} species to {args.out}")
    if unmatched:
        print(f"Unmatched species: {len(unmatched)}")
        for row in unmatched[:30]:
            print(f"  - {row.common_name} ({row.scientific_name})")


if __name__ == "__main__":
    main()
