# Rewilding Map Prototype

This prototype lives at `/blog/rewilding-map-prototype` and combines:

- Global Pasture Watch (GPW) v2 map layers (2000-2024) rendered via TiTiler
- A local summary JSON derived from GPW + Hayek et al. rasters

## Files

- Page: `src/pages/blog/rewilding-map-prototype/index.astro`
- Styles: `public/assets/css/site.css`
- Summary JSON: `public/data/rewilding-summary-2024.json`
- GPW catalog CSV: `public/data/gpw-ggc-30m-v2.csv`
- Build script: `scripts/compute_rewilding_summary.py`

## Recompute summary data

Run:

```bash
python scripts/compute_rewilding_summary.py
curl -sL 'https://zenodo.org/records/15646181/files/ggc-30m_v2.csv?download=1' -o public/data/gpw-ggc-30m-v2.csv
```

Optional flags:

```bash
python scripts/compute_rewilding_summary.py --force
python scripts/compute_rewilding_summary.py --workdir .cache/rewilding --output public/data/rewilding-summary-2024.json
```

## Current method

1. Aggregate GPW 2024 cultivated grassland probability from 30 m to 5 arcminute using mean resampling.
2. Multiply this fractional probability by Hayek `animal_hectares.tif` to estimate weighted rewildable area.
3. Multiply weighted area by Hayek `animal_COC.tif` to estimate weighted carbon opportunity (stock).
4. Report median, low, and high uncertainty bands and scale results by a user-selected rewilded-share slider.

## Assumptions and caveats

- The output is a communication-oriented global estimate, not a policy prescription.
- Aggregating GPW to 5 arcminute smooths local extremes.
- Carbon numbers are opportunity stock values (GtCO2e), not annual sequestration rates.
- The interactive map currently uses GPW tile rendering and global summary metrics; it does not yet compute country-level totals in the browser.
