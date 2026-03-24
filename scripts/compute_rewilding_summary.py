#!/usr/bin/env python
"""Compute a global rewilding-opportunity summary for the website prototype.

Method overview:
1. Aggregate GPW cultivated grassland probability (30 m) to 5 arcminute cells.
2. Combine with Hayek et al. animal land-use and carbon opportunity rasters.
3. Emit a compact JSON summary used by the web UI.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import shutil
import subprocess
import urllib.request
import zipfile
from pathlib import Path

import numpy as np
from osgeo import gdal

GPW_CULTIV_2024_URL = (
    "https://s3.eu-central-1.wasabisys.com/arco/"
    "gpw_cultiv.grassland_rf.med.filt_p_30m_20240101_20241231_go_epsg.4326_v2.tif"
)
HAYEK_COC_ZIP_URL = "https://archive.nyu.edu/bitstream/2451/60073/1/nyu_2451_60073.zip"
HAYEK_HECTARES_ZIP_URL = "https://archive.nyu.edu/bitstream/2451/60073/2/nyu_2451_60074.zip"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compute rewilding summary JSON for the map prototype.")
    parser.add_argument(
        "--workdir",
        default=".cache/rewilding",
        help="Directory for temporary downloads and intermediate rasters.",
    )
    parser.add_argument(
        "--output",
        default="public/data/rewilding-summary-2024.json",
        help="Output JSON path.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Recompute intermediate files even if they exist.",
    )
    return parser.parse_args()


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def download_if_missing(url: str, dest: Path, force: bool = False) -> None:
    if dest.exists() and not force:
        return
    ensure_dir(dest.parent)
    with urllib.request.urlopen(url) as response, dest.open("wb") as output:
        shutil.copyfileobj(response, output)


def extract_member(zip_path: Path, expected_suffix: str, dest: Path) -> None:
    if dest.exists():
        return
    with zipfile.ZipFile(zip_path) as archive:
        member_name = next((name for name in archive.namelist() if name.endswith(expected_suffix)), None)
        if member_name is None:
            raise FileNotFoundError(f"{expected_suffix} not found in {zip_path}")
        with archive.open(member_name) as src, dest.open("wb") as out:
            shutil.copyfileobj(src, out)


def run_gdalwarp(src_url: str, dst: Path, force: bool = False) -> None:
    if dst.exists() and not force:
        return
    cmd = [
        "gdalwarp",
        "-overwrite",
        "-of",
        "GTiff",
        "-ot",
        "Float32",
        "-co",
        "COMPRESS=DEFLATE",
        "-co",
        "PREDICTOR=3",
        "-co",
        "TILED=YES",
        "-srcnodata",
        "255",
        "-dstnodata",
        "-9999",
        "-r",
        "average",
        "-tr",
        "0.083333333333333",
        "0.083333333333333",
        "-te",
        "-180",
        "-90",
        "180",
        "90",
        "-t_srs",
        "EPSG:4326",
        f"/vsicurl/{src_url}",
        str(dst),
    ]
    subprocess.run(cmd, check=True)


def read_band(ds: gdal.Dataset, index: int) -> tuple[np.ndarray, float | None]:
    band = ds.GetRasterBand(index)
    values = band.ReadAsArray().astype(np.float64)
    return values, band.GetNoDataValue()


def valid_mask(*pairs: tuple[np.ndarray, float | None]) -> np.ndarray:
    mask = np.ones_like(pairs[0][0], dtype=bool)
    for values, nodata in pairs:
        if nodata is None:
            mask &= np.isfinite(values)
        else:
            mask &= values != nodata
    return mask


def round_or_none(value: float | None, digits: int = 6) -> float | None:
    if value is None:
        return None
    return round(float(value), digits)


def compute_summary(ha_ds: gdal.Dataset, coc_ds: gdal.Dataset, gpw_ds: gdal.Dataset) -> dict:
    gpw_values, gpw_nodata = read_band(gpw_ds, 1)
    gpw_prob = np.clip(gpw_values, 0, 100) / 100.0

    results = {}
    labels = {1: "median", 2: "low", 3: "high"}

    for band_idx, label in labels.items():
        ha_values, ha_nodata = read_band(ha_ds, band_idx)
        coc_values, coc_nodata = read_band(coc_ds, band_idx)

        mask = valid_mask((ha_values, ha_nodata), (coc_values, coc_nodata), (gpw_values, gpw_nodata))
        ha_valid = ha_values[ha_values != ha_nodata] if ha_nodata is not None else ha_values[np.isfinite(ha_values)]

        total_ha = float(np.sum(ha_valid))
        weighted_ha = float(np.sum(ha_values[mask] * gpw_prob[mask]))
        weighted_coc_tC = float(np.sum(ha_values[mask] * coc_values[mask] * gpw_prob[mask]))
        weighted_coc_gtco2 = weighted_coc_tC * 44.0 / 12.0 / 1e9

        adoption = []
        for share in (25, 50, 75, 100):
            factor = share / 100.0
            adoption.append(
                {
                    "share_percent": share,
                    "rewilded_area_mha": round_or_none(weighted_ha * factor / 1e6, 3),
                    "carbon_opportunity_gtco2": round_or_none(weighted_coc_gtco2 * factor, 3),
                }
            )

        results[label] = {
            "global_animal_land_mha": round_or_none(total_ha / 1e6, 3),
            "weighted_rewildable_area_mha": round_or_none(weighted_ha / 1e6, 3),
            "weighted_rewildable_share_of_animal_land": round_or_none(weighted_ha / total_ha, 5),
            "weighted_carbon_opportunity_gtco2": round_or_none(weighted_coc_gtco2, 3),
            "adoption_scenarios": adoption,
        }

    return {
        "metadata": {
            "generated_at_utc": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
            "method": (
                "GPW cultivated-grassland probability (2024) aggregated to 5 arcminute grid via mean "
                "and multiplied by Hayek et al. animal-land hectares and COC rasters."
            ),
            "notes": [
                "Values are global opportunity-style estimates for communication, not a policy prescription.",
                "GPW aggregation to 5 arcminute cells smooths local probability extremes.",
                "COC values represent suppressed potential vegetation carbon (stock opportunity).",
            ],
            "inputs": {
                "gpw_cultiv_2024_url": GPW_CULTIV_2024_URL,
                "hayek_animal_hectares_zip_url": HAYEK_HECTARES_ZIP_URL,
                "hayek_animal_coc_zip_url": HAYEK_COC_ZIP_URL,
            },
        },
        "summary": {
            "median": results["median"],
            "low": results["low"],
            "high": results["high"],
        },
    }


def main() -> None:
    args = parse_args()
    gdal.UseExceptions()

    workdir = Path(args.workdir)
    output_path = Path(args.output)
    ensure_dir(workdir)
    ensure_dir(output_path.parent)

    hayek_coc_zip = workdir / "nyu_2451_60073.zip"
    hayek_hectares_zip = workdir / "nyu_2451_60074.zip"
    hayek_coc_tif = workdir / "animal_COC.tif"
    hayek_hectares_tif = workdir / "animal_hectares.tif"
    gpw_agg_tif = workdir / "gpw_cultiv_2024_5arcmin_f32.tif"

    download_if_missing(HAYEK_COC_ZIP_URL, hayek_coc_zip, force=args.force)
    download_if_missing(HAYEK_HECTARES_ZIP_URL, hayek_hectares_zip, force=args.force)

    extract_member(hayek_coc_zip, "animal_COC.tif", hayek_coc_tif)
    extract_member(hayek_hectares_zip, "animal_hectares.tif", hayek_hectares_tif)

    run_gdalwarp(GPW_CULTIV_2024_URL, gpw_agg_tif, force=args.force)

    ha_ds = gdal.Open(str(hayek_hectares_tif))
    coc_ds = gdal.Open(str(hayek_coc_tif))
    gpw_ds = gdal.Open(str(gpw_agg_tif))

    if ha_ds is None or coc_ds is None or gpw_ds is None:
        raise RuntimeError("Failed to open one or more required raster datasets.")

    summary = compute_summary(ha_ds, coc_ds, gpw_ds)

    output_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote summary to {output_path}")
    print(f"Median weighted rewildable area (Mha): {summary['summary']['median']['weighted_rewildable_area_mha']}")
    print(
        "Median weighted carbon opportunity (GtCO2): "
        f"{summary['summary']['median']['weighted_carbon_opportunity_gtco2']}"
    )


if __name__ == "__main__":
    main()
