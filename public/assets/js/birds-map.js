(() => {
  const mapNode = document.querySelector("[data-bird-map]");
  const statusNode = document.querySelector("[data-bird-map-status]");
  const scaleNode = document.querySelector("[data-bird-map-scale]");
  const scaleBarNode = document.querySelector("[data-bird-map-scale-bar]");
  const scaleMinNode = document.querySelector("[data-bird-map-scale-min]");
  const scaleMaxNode = document.querySelector("[data-bird-map-scale-max]");
  const scaleMetaNode = document.querySelector("[data-bird-map-scale-meta]");
  const timeNode = document.querySelector("[data-bird-map-time]");
  const timeInputNode = document.querySelector("[data-bird-map-time-input]");
  const timeValueNode = document.querySelector("[data-bird-map-time-value]");
  const insightsNode = document.querySelector("[data-bird-map-insights]");
  const insightsCountyNode = document.querySelector("[data-bird-map-insights-county]");
  const insightsSubtitleNode = document.querySelector("[data-bird-map-insights-subtitle]");
  const insightsFilteredNode = document.querySelector("[data-bird-map-insights-filtered]");
  const insightsSeenNode = document.querySelector("[data-bird-map-insights-seen]");
  const insightsPhotoNode = document.querySelector("[data-bird-map-insights-photo]");
  const insightsCoverageNode = document.querySelector("[data-bird-map-insights-coverage]");
  const insightsRankNode = document.querySelector("[data-bird-map-insights-rank]");
  const insightsMissingListNode = document.querySelector("[data-bird-map-insights-missing-list]");
  const filterButtons = Array.from(document.querySelectorAll("[data-bird-filter]"));
  const seedNode = document.querySelector("#bird-map-seed");
  const seenSeedNode = document.querySelector("#bird-map-seen-seed");

  if (!(mapNode instanceof HTMLElement) || !(seedNode instanceof HTMLScriptElement)) {
    return;
  }

  const maplibregl = window.maplibregl;
  const topojson = window.topojson;
  const shared = window.BirdAdminShared;

  if (!maplibregl || !topojson) {
    if (statusNode instanceof HTMLElement) {
      statusNode.textContent = "Map dependencies failed to load.";
      statusNode.hidden = false;
    }
    return;
  }

  let basePhotos = [];
  try {
    const parsed = JSON.parse(seedNode.textContent || "[]");
    basePhotos = Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    basePhotos = [];
  }

  let baseSeenLocations = [];
  if (seenSeedNode instanceof HTMLScriptElement) {
    try {
      const parsedSeen = JSON.parse(seenSeedNode.textContent || "[]");
      baseSeenLocations = Array.isArray(parsedSeen) ? parsedSeen : [];
    } catch (_error) {
      baseSeenLocations = [];
    }
  }

  const US_COUNTRY_NAME = "United States of America";
  const CANADA_COUNTRY_NAME = "Canada";

  const US_STATE_ALIASES = {
    alabama: "Alabama",
    al: "Alabama",
    alaska: "Alaska",
    ak: "Alaska",
    arizona: "Arizona",
    az: "Arizona",
    arkansas: "Arkansas",
    ar: "Arkansas",
    california: "California",
    ca: "California",
    colorado: "Colorado",
    co: "Colorado",
    connecticut: "Connecticut",
    ct: "Connecticut",
    delaware: "Delaware",
    de: "Delaware",
    florida: "Florida",
    fl: "Florida",
    georgia: "Georgia",
    ga: "Georgia",
    hawaii: "Hawaii",
    hi: "Hawaii",
    idaho: "Idaho",
    id: "Idaho",
    illinois: "Illinois",
    il: "Illinois",
    indiana: "Indiana",
    in: "Indiana",
    iowa: "Iowa",
    ia: "Iowa",
    kansas: "Kansas",
    ks: "Kansas",
    kentucky: "Kentucky",
    ky: "Kentucky",
    louisiana: "Louisiana",
    la: "Louisiana",
    maine: "Maine",
    me: "Maine",
    maryland: "Maryland",
    md: "Maryland",
    massachusetts: "Massachusetts",
    ma: "Massachusetts",
    michigan: "Michigan",
    mi: "Michigan",
    minnesota: "Minnesota",
    mn: "Minnesota",
    mississippi: "Mississippi",
    ms: "Mississippi",
    missouri: "Missouri",
    mo: "Missouri",
    montana: "Montana",
    mt: "Montana",
    nebraska: "Nebraska",
    ne: "Nebraska",
    nevada: "Nevada",
    nv: "Nevada",
    "new hampshire": "New Hampshire",
    nh: "New Hampshire",
    "new jersey": "New Jersey",
    nj: "New Jersey",
    "new mexico": "New Mexico",
    nm: "New Mexico",
    "new york": "New York",
    ny: "New York",
    "north carolina": "North Carolina",
    nc: "North Carolina",
    "north dakota": "North Dakota",
    nd: "North Dakota",
    ohio: "Ohio",
    oh: "Ohio",
    oklahoma: "Oklahoma",
    ok: "Oklahoma",
    oregon: "Oregon",
    or: "Oregon",
    pennsylvania: "Pennsylvania",
    pa: "Pennsylvania",
    "rhode island": "Rhode Island",
    ri: "Rhode Island",
    "south carolina": "South Carolina",
    sc: "South Carolina",
    "south dakota": "South Dakota",
    sd: "South Dakota",
    tennessee: "Tennessee",
    tn: "Tennessee",
    texas: "Texas",
    tx: "Texas",
    utah: "Utah",
    ut: "Utah",
    vermont: "Vermont",
    vt: "Vermont",
    virginia: "Virginia",
    va: "Virginia",
    washington: "Washington",
    wa: "Washington",
    "west virginia": "West Virginia",
    wv: "West Virginia",
    wisconsin: "Wisconsin",
    wi: "Wisconsin",
    wyoming: "Wyoming",
    wy: "Wyoming",
    "district of columbia": "District of Columbia",
    dc: "District of Columbia",
  };

  const CANADA_PROVINCE_ALIASES = {
    alberta: "Alberta",
    ab: "Alberta",
    "british columbia": "British Columbia",
    bc: "British Columbia",
    manitoba: "Manitoba",
    mb: "Manitoba",
    "new brunswick": "New Brunswick",
    nb: "New Brunswick",
    "newfoundland and labrador": "Newfoundland and Labrador",
    nl: "Newfoundland and Labrador",
    "nova scotia": "Nova Scotia",
    ns: "Nova Scotia",
    ontario: "Ontario",
    on: "Ontario",
    "prince edward island": "Prince Edward Island",
    pei: "Prince Edward Island",
    pe: "Prince Edward Island",
    quebec: "Quebec",
    qc: "Quebec",
    saskatchewan: "Saskatchewan",
    sk: "Saskatchewan",
    nunavut: "Nunavut",
    nu: "Nunavut",
    yukon: "Yukon",
    yt: "Yukon",
    "northwest territories": "Northwest Territories",
    nt: "Northwest Territories",
  };

  const COUNTRY_ALIASES = {
    us: US_COUNTRY_NAME,
    usa: US_COUNTRY_NAME,
    "united states": US_COUNTRY_NAME,
    "united states of america": US_COUNTRY_NAME,
    "u s a": US_COUNTRY_NAME,
    "u s": US_COUNTRY_NAME,
    "dominican rep": "Dominican Republic",
    "us virgin islands": "U.S. Virgin Islands",
    "u s virgin islands": "U.S. Virgin Islands",
    "united states virgin islands": "U.S. Virgin Islands",
    "virgin islands us": "U.S. Virgin Islands",
    canada: CANADA_COUNTRY_NAME,
    ca: CANADA_COUNTRY_NAME,
    "cote d ivoire": "Côte d'Ivoire",
    "ivory coast": "Côte d'Ivoire",
    uk: "United Kingdom",
    "u k": "United Kingdom",
    "united kingdom": "United Kingdom",
  };
  const COUNTRY_CODE_NAMES = {
    US: US_COUNTRY_NAME,
    CA: CANADA_COUNTRY_NAME,
  };
  const TERRITORY_COUNTRY_BY_SUBDIVISION = {
    "US-PR": "Puerto Rico",
    "US-VI": "U.S. Virgin Islands",
    "US-GU": "Guam",
    "US-AS": "American Samoa",
    "US-MP": "Northern Mariana Islands",
  };
  const TERRITORY_COUNTRY_BY_SUBDIVISION_NAME = {
    "puerto rico": "Puerto Rico",
    "us virgin islands": "U.S. Virgin Islands",
    "u s virgin islands": "U.S. Virgin Islands",
    "virgin islands": "U.S. Virgin Islands",
    guam: "Guam",
    "american samoa": "American Samoa",
    "northern mariana islands": "Northern Mariana Islands",
    "northern marianas": "Northern Mariana Islands",
  };

  const SOURCE_COUNTRIES = "bird-countries";
  const SOURCE_STATES = "bird-states";
  const SOURCE_COUNTIES = "bird-counties";
  const SOURCE_COUNTRY_MARKERS = "bird-country-markers";

  const LAYER_COUNTRY_FILL = "bird-country-fill";
  const LAYER_COUNTRY_LINE = "bird-country-line";
  const LAYER_COUNTRY_MARKER_CIRCLE = "bird-country-marker-circle";
  const LAYER_COUNTRY_MARKER_LABEL = "bird-country-marker-label";
  const LAYER_STATE_FILL = "bird-state-fill";
  const LAYER_STATE_LINE = "bird-state-line";
  const LAYER_COUNTY_FILL = "bird-county-fill";
  const LAYER_COUNTY_LINE = "bird-county-line";
  const COUNTRY_FILL_OPACITY_WIDE = ["case", ["get", "hasPhoto"], 0.25, 0.05];
  const COUNTRY_FILL_OPACITY_ZOOMED = [
    "case",
    ["get", "isUsOrCanada"],
    0,
    ["case", ["get", "hasPhoto"], 0.25, 0.05],
  ];
  const STATE_FILL_OPACITY = [
    "case",
    ["get", "isSelectionMuted"],
    0,
    ["interpolate", ["linear"], ["coalesce", ["get", "effectiveCoverageWeight"], 0], 0, 0.72, 1, 0.9],
  ];
  const COUNTY_FILL_OPACITY = 0.94;
  const FILL_COLOR_BY_FILTER = {
    all: "#7f6918",
    seen: "#7f6918",
    unseen: "#7f6918",
    photographed: "#c63f4a",
    "needs-photo": "#cb7b2f",
    rated: "#7f6918",
    unrated: "#7f6918",
  };
  const MAX_MISSING_SPECIES = 8;
  const COUNTRY_MARKER_COORDINATES = {
    Dominica: [-61.370976, 15.414999],
    "Dominican Republic": [-70.162651, 18.735693],
    "Saint Lucia": [-60.978893, 13.909444],
    "Saint Vincent and the Grenadines": [-61.287228, 12.984305],
    Grenada: [-61.679, 12.1165],
    Barbados: [-59.543198, 13.193887],
    "Antigua and Barbuda": [-61.796428, 17.060816],
    "Trinidad and Tobago": [-61.222503, 10.691803],
    "Puerto Rico": [-66.590149, 18.220833],
    Guadeloupe: [-61.551, 16.265],
    Martinique: [-61.0242, 14.6415],
    "U.S. Virgin Islands": [-64.896335, 17.724596],
    "British Virgin Islands": [-64.639968, 18.420695],
  };

  const map = createMap();
  window.__birdAtlasMap = map;

  const countryLayerData = {
    countriesWithPhotos: new Set(),
    countryBirds: new Map(),
    usStatesWithPhotos: new Set(),
    canadaProvincesWithPhotos: new Set(),
    usStateBirds: new Map(),
    canadaProvinceBirds: new Map(),
    usCountyBirdsByState: new Map(),
    timelineMinMonth: null,
    timelineMaxMonth: null,
    photoCount: 0,
    coverageLabel: "photo records",
  };

  let visibleBirdKeys = parseVisibleBirdKeys(window.__birdAtlasVisibleBirdKeys);
  let activeFilterMode = syncActiveFilterModeFromControls("all");
  let remoteDraft = null;
  let selectedCountry = null;
  let selectedState = null;
  let selectedCounty = null;
  let usCountyGeoJson = null;
  let worldCountryGeoJson = null;
  let combinedStateGeoJson = null;
  let countyFeatureCollection = { type: "FeatureCollection", features: [] };
  let countryMarkerGeoJson = { type: "FeatureCollection", features: [] };
  let areStatesShown = null;
  let activeTimelineMonthKey = null;
  let hoverPopup = null;

  const countyInsightData = {
    allSeenByState: new Map(),
    allPhotosByState: new Map(),
  };

  const domesticBirdKeys = buildDomesticBirdKeySet();
  const birdLookup = buildBirdLookup();
  let useDomesticChecklistScope = false;
  let effectiveVisibleBirdKeys = null;

  Promise.all([
    loadMapData(),
    new Promise((resolve) => map.on("load", resolve)),
  ])
    .then(([mapData]) => {
      worldCountryGeoJson = mapData.worldCountryGeoJson;
      combinedStateGeoJson = mapData.combinedStateGeoJson;
      usCountyGeoJson = mapData.usCountyGeoJson;

      addSources();
      addLayers();
      wireInteractions();
      rerenderCoverage();
    })
    .catch((_error) => {
      if (statusNode instanceof HTMLElement) {
        statusNode.textContent = "Unable to load map data files.";
        statusNode.hidden = false;
      }
    });

  window.addEventListener("bird-atlas:filters-changed", (event) => {
    visibleBirdKeys = parseVisibleBirdKeys(event?.detail?.visibleBirdKeys);
    const fromEvent = normalizeFilterMode(event?.detail?.filterMode, activeFilterMode);
    activeFilterMode = syncActiveFilterModeFromControls(fromEvent);
    syncChecklistScope();
    rerenderCoverage();
  });

  window.addEventListener("bird-atlas:reset-selection", () => {
    clearMapSelection();
  });

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      window.setTimeout(() => {
        activeFilterMode = syncActiveFilterModeFromControls(activeFilterMode);
        syncChecklistScope();
        rerenderCoverage();
      }, 0);
    });
  });

  window.addEventListener("storage", (event) => {
    if (!shared || event.key !== shared.STORAGE_KEY) {
      return;
    }

    rerenderCoverage();
  });

  if (shared && typeof shared.loadRemoteDraft === "function") {
    shared.loadRemoteDraft().then((draftFromRemote) => {
      if (!draftFromRemote) {
        return;
      }

      remoteDraft = draftFromRemote;
      rerenderCoverage();
    });
  }

  if (shared && typeof shared.subscribeRemoteDraft === "function") {
    shared.subscribeRemoteDraft((draftFromRemote) => {
      remoteDraft = draftFromRemote;
      rerenderCoverage();
    });
  }

  if (timeInputNode instanceof HTMLInputElement) {
    timeInputNode.addEventListener("input", () => {
      const monthKey = Number(timeInputNode.value);
      if (!Number.isFinite(monthKey)) {
        return;
      }
      activeTimelineMonthKey = Math.round(monthKey);
      updateTimeControl();
      rerenderCoverage();
    });
  }

  updateCountyInsights();

  function createMap() {
    try {
      const instance = new maplibregl.Map({
        container: mapNode,
        style: {
          version: 8,
          name: "Bird Atlas Base",
          sources: {},
          layers: [
            {
              id: "background",
              type: "background",
              paint: {
                "background-color": "#d8e1dc",
              },
            },
          ],
        },
        center: [-99.5, 39.5],
        zoom: 2.8,
        minZoom: 1.25,
        maxZoom: 9.5,
        attributionControl: false,
        renderWorldCopies: false,
        dragRotate: false,
        touchPitch: false,
      });

      instance.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-left");

      return instance;
    } catch (_error) {
      if (statusNode instanceof HTMLElement) {
        statusNode.textContent = "Map initialization failed in this browser.";
        statusNode.hidden = false;
      }
      throw _error;
    }
  }

  function loadMapData() {
    return Promise.all([
      fetchJson("/data/maps/world-countries-110m.topo.json"),
      fetchJson("/data/maps/us-states.geojson"),
      fetchJson("/data/maps/canada-provinces.geojson"),
      fetchJson("/data/maps/us-counties.geojson"),
    ]).then(([worldTopoJson, usStatesGeoJson, canadaProvincesGeoJson, usCountiesData]) => {
      return {
        worldCountryGeoJson: topojson.feature(worldTopoJson, worldTopoJson.objects.countries),
        combinedStateGeoJson: mergeStateAndProvinceGeoJson(usStatesGeoJson, canadaProvincesGeoJson),
        usCountyGeoJson: usCountiesData,
      };
    });
  }

  function fetchJson(path) {
    return fetch(path).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load ${path}`);
      }
      return response.json();
    });
  }

  function mergeStateAndProvinceGeoJson(usStatesGeoJson, canadaProvincesGeoJson) {
    const usFeatures = (usStatesGeoJson.features || [])
      .map((feature) => {
      const name = feature?.properties?.name || "";
      const canonicalStateName = canonicalUSState(name);
      if (!canonicalStateName) {
        return null;
      }
      const stateFips = String(feature.id || feature?.properties?.id || "").padStart(2, "0");

      return {
        type: "Feature",
        id: `US-${stateFips}`,
        geometry: feature.geometry,
        properties: {
          ...feature.properties,
          country: "US",
          name: canonicalStateName,
          stateName: canonicalStateName,
          stateFips,
          hasWrapArtifact: geometryHasWrapArtifact(feature.geometry),
          hasPhoto: false,
          isSelected: false,
        },
      };
      })
      .filter(Boolean);

    const canadaFeatures = (canadaProvincesGeoJson.features || []).map((feature, index) => {
      const name = feature?.properties?.name || "";
      const canonicalProvinceName = canonicalCanadaProvince(name) || name;

      return {
        type: "Feature",
        id: `CA-${index}`,
        geometry: feature.geometry,
        properties: {
          ...feature.properties,
          country: "CA",
          name: canonicalProvinceName,
          stateName: canonicalProvinceName,
          stateFips: null,
          hasWrapArtifact: geometryHasWrapArtifact(feature.geometry),
          hasPhoto: false,
          isSelected: false,
        },
      };
    });

    return {
      type: "FeatureCollection",
      features: [...usFeatures, ...canadaFeatures],
    };
  }

  function refreshPhotoAggregation() {
    countryLayerData.countriesWithPhotos = new Set();
    countryLayerData.countryBirds = new Map();
    countryLayerData.usStatesWithPhotos = new Set();
    countryLayerData.canadaProvincesWithPhotos = new Set();
    countryLayerData.usStateBirds = new Map();
    countryLayerData.canadaProvinceBirds = new Map();
    countryLayerData.usCountyBirdsByState = new Map();
    countyInsightData.allSeenByState = new Map();
    countyInsightData.allPhotosByState = new Map();

    const allPhotoRecords = getPhotoCoverageRecords();
    for (const record of allPhotoRecords) {
      if (!isCoverageRecordVisible(record, { includeAllBirds: true })) {
        continue;
      }

      const normalized = normalizePhotoRecord(record);
      const birdToken = normalizeBirdKey(record?.birdKey);
      if (birdToken && normalized.country === US_COUNTRY_NAME && normalized.state && normalized.county) {
        addBirdToCountyMap(countyInsightData.allPhotosByState, normalized.state, normalized.county, birdToken);
      }
    }

    const allSeenRecords = Array.isArray(baseSeenLocations) ? baseSeenLocations : [];
    for (const record of allSeenRecords) {
      if (!isCoverageRecordVisible(record, { includeAllBirds: true })) {
        continue;
      }

      const normalized = normalizeSeenLocationRecord(record);
      const birdToken = normalizeBirdKey(record?.birdKey);
      if (birdToken && normalized.country === US_COUNTRY_NAME && normalized.state && normalized.county) {
        addBirdToCountyMap(countyInsightData.allSeenByState, normalized.state, normalized.county, birdToken);
      }
    }

    const source = selectCoverageSource();
    const timelineRecords = [...getPhotoCoverageRecords(), ...getSeenCoverageRecords()];
    let minTimelineMonth = Infinity;
    let maxTimelineMonth = -Infinity;
    timelineRecords.forEach((record) => {
      if (!isCoverageRecordVisible(record, { includeAllBirds: true })) {
        return;
      }
      const recordMonthKey = extractRecordMonthKey(record);
      if (!Number.isFinite(recordMonthKey)) {
        return;
      }
      minTimelineMonth = Math.min(minTimelineMonth, recordMonthKey);
      maxTimelineMonth = Math.max(maxTimelineMonth, recordMonthKey);
    });

    countryLayerData.timelineMinMonth = Number.isFinite(minTimelineMonth) ? minTimelineMonth : null;
    countryLayerData.timelineMaxMonth = Number.isFinite(maxTimelineMonth) ? maxTimelineMonth : null;
    clampTimelineSelection();

    let mappedPhotoCount = 0;
    for (const record of source.records) {
      if (!isCoverageRecordVisible(record)) {
        continue;
      }
      if (!recordMatchesTimeline(record)) {
        continue;
      }

      const normalized = source.normalize(record);
      if (!normalized.country) {
        continue;
      }

      mappedPhotoCount += 1;
      countryLayerData.countriesWithPhotos.add(normalized.country);
      const birdToken =
        normalizeBirdKey(record?.birdKey) || `${normalized.country}:${normalized.state || ""}:${mappedPhotoCount}`;
      addBirdToMap(countryLayerData.countryBirds, normalized.country, birdToken);

      if (normalized.country === US_COUNTRY_NAME) {
        if (normalized.state) {
          countryLayerData.usStatesWithPhotos.add(normalized.state);
          addBirdToMap(countryLayerData.usStateBirds, normalized.state, birdToken);
        }

        if (normalized.state && normalized.county) {
          addBirdToCountyMap(countryLayerData.usCountyBirdsByState, normalized.state, normalized.county, birdToken);
        }
      }

      if (normalized.country === CANADA_COUNTRY_NAME && normalized.state) {
        countryLayerData.canadaProvincesWithPhotos.add(normalized.state);
        addBirdToMap(countryLayerData.canadaProvinceBirds, normalized.state, birdToken);
      }
    }

    countryLayerData.photoCount = mappedPhotoCount;
    countryLayerData.coverageLabel = source.label;
  }

  function selectCoverageSource() {
    const seenRecords = getSeenCoverageRecords();
    const shouldUseSeenRecords = activeFilterMode !== "photographed" && seenRecords.length > 0;

    if (shouldUseSeenRecords) {
      return {
        records: seenRecords,
        normalize: normalizeCoverageRecord,
        label: "filtered sightings",
      };
    }

    return {
      records: getPhotoCoverageRecords(),
      normalize: normalizeCoverageRecord,
      label: "filtered photo records",
    };
  }

  function getPhotoCoverageRecords() {
    const remotePhotos = Array.isArray(remoteDraft?.photos) ? remoteDraft.photos : null;
    const draftPhotos = Array.isArray(shared?.loadDraft?.()?.photos) ? shared.loadDraft().photos : null;
    const preferred = remotePhotos || draftPhotos || [];
    return mergePhotoRecordSets(preferred, basePhotos);
  }

  function getSeenCoverageRecords() {
    const baseRecords = Array.isArray(baseSeenLocations) ? baseSeenLocations : [];
    const draftStatus =
      remoteDraft?.status ||
      (typeof shared?.loadDraft === "function" ? shared.loadDraft()?.status : null) ||
      {};

    return baseRecords.map((record) => {
      if (!record || typeof record !== "object") {
        return record;
      }

      const birdKey = normalizeBirdKey(record.birdKey);
      const fromRecord = normalizeDateLike(record.capturedOn);
      const fromStatus = normalizeDateLike(birdKey ? draftStatus?.[birdKey]?.firstSeenDate : "");
      const capturedOn = fromRecord || fromStatus;
      if (!capturedOn) {
        return record;
      }

      return {
        ...record,
        capturedOn,
      };
    });
  }

  function mergePhotoRecordSets(preferred, baseline) {
    const merged = [];
    const seen = new Set();

    const pushUnique = (records, sourceToken) => {
      if (!Array.isArray(records)) {
        return;
      }

      records.forEach((record, index) => {
        if (!record || typeof record !== "object") {
          return;
        }

        const key = buildPhotoRecordMergeKey(record, sourceToken, index);
        if (seen.has(key)) {
          return;
        }

        seen.add(key);
        merged.push(record);
      });
    };

    pushUnique(preferred, "preferred");
    pushUnique(baseline, "baseline");
    return merged;
  }

  function buildPhotoRecordMergeKey(record, sourceToken, index) {
    const birdKey = normalizeBirdKey(record?.birdKey);
    const src = String(record?.src || "").trim();
    if (birdKey && src) {
      return `${birdKey}::${src}`;
    }
    if (src) {
      return `src::${src}`;
    }

    const capturedOn = String(record?.capturedOn || "").trim();
    const location = String(record?.location || "").trim();
    if (birdKey) {
      return `bird::${birdKey}::${capturedOn}::${location}`;
    }

    return `${sourceToken || "source"}::${index}`;
  }

  function addBirdToMap(mapOfSets, mapKey, birdToken) {
    if (!mapKey || !birdToken) {
      return;
    }
    if (!mapOfSets.has(mapKey)) {
      mapOfSets.set(mapKey, new Set());
    }
    mapOfSets.get(mapKey).add(birdToken);
  }

  function addBirdToCountyMap(mapOfStateCountySets, stateName, countyName, birdToken) {
    if (!stateName || !countyName || !birdToken) {
      return;
    }
    if (!mapOfStateCountySets.has(stateName)) {
      mapOfStateCountySets.set(stateName, new Map());
    }
    const countyMap = mapOfStateCountySets.get(stateName);
    if (!countyMap.has(countyName)) {
      countyMap.set(countyName, new Set());
    }
    countyMap.get(countyName).add(birdToken);
  }

  function shouldUseDomesticChecklistScope() {
    const zoom = map.getZoom();
    if (!Number.isFinite(zoom) || zoom <= 2.6) {
      return false;
    }

    const viewportCountryCode = countryCodeFromViewportCenter();
    return viewportCountryCode === "US" || viewportCountryCode === "CA";
  }

  function countryCodeFromViewportCenter() {
    if (!map || typeof map.project !== "function" || typeof map.queryRenderedFeatures !== "function") {
      return null;
    }

    const center = map.getCenter?.();
    if (!center || !Number.isFinite(center.lng) || !Number.isFinite(center.lat)) {
      return null;
    }

    const centerPoint = map.project(center);
    if (!centerPoint || !Number.isFinite(centerPoint.x) || !Number.isFinite(centerPoint.y)) {
      return null;
    }

    const radius = 40;
    const queryBox = [
      [centerPoint.x - radius, centerPoint.y - radius],
      [centerPoint.x + radius, centerPoint.y + radius],
    ];

    const stateHits = map.queryRenderedFeatures(queryBox, { layers: [LAYER_STATE_FILL] });
    for (const feature of stateHits) {
      const code = String(feature?.properties?.country || "").trim();
      if (code === "US" || code === "CA") {
        return code;
      }
    }

    const countryHits = map.queryRenderedFeatures(queryBox, { layers: [LAYER_COUNTRY_FILL] });
    for (const feature of countryHits) {
      const code = countryCodeFromCountryName(canonicalCountryNameForFeature(feature));
      if (code === "US" || code === "CA") {
        return code;
      }
    }

    return null;
  }

  function applyChecklistScopeToVisibleKeys(value) {
    if (!(value instanceof Set)) {
      return null;
    }
    if (!useDomesticChecklistScope || domesticBirdKeys.size === 0) {
      return value;
    }

    const scoped = new Set();
    value.forEach((key) => {
      if (domesticBirdKeys.has(key)) {
        scoped.add(key);
      }
    });
    return scoped;
  }

  function syncChecklistScope() {
    const nextScope = shouldUseDomesticChecklistScope();
    const changed = nextScope !== useDomesticChecklistScope;
    useDomesticChecklistScope = nextScope;
    effectiveVisibleBirdKeys = applyChecklistScopeToVisibleKeys(visibleBirdKeys);
    return changed;
  }

  function isCoverageRecordVisible(record, options) {
    const includeAllBirds = Boolean(options?.includeAllBirds);
    const birdKey = normalizeBirdKey(record?.birdKey);
    if (!includeAllBirds && effectiveVisibleBirdKeys && (!birdKey || !effectiveVisibleBirdKeys.has(birdKey))) {
      return false;
    }

    const src = String(record?.src || "").trim();
    if (src && (/^file:/i.test(src) || /^\/(Users|home|private)\//.test(src) || /^[A-Za-z]:[\\/]/.test(src))) {
      return false;
    }

    return true;
  }

  function recordMatchesTimeline(record) {
    if (!Number.isFinite(activeTimelineMonthKey)) {
      return true;
    }

    const recordMonthKey = extractRecordMonthKey(record);
    if (!Number.isFinite(recordMonthKey)) {
      return true;
    }

    return recordMonthKey <= activeTimelineMonthKey;
  }

  function extractRecordMonthKey(record) {
    const raw = normalizeDateLike(record?.capturedOn || record?.firstSeenDate || record?.observedOn || record?.date);
    if (!raw) {
      return null;
    }

    const isoMonthMatch = raw.match(/^(\d{4})[-/](\d{1,2})(?:[-/]\d{1,2})?$/);
    if (isoMonthMatch) {
      const year = Number(isoMonthMatch[1]);
      const month = Number(isoMonthMatch[2]);
      return toMonthKey(year, month);
    }

    const yearOnlyMatch = raw.match(/^(\d{4})$/);
    if (yearOnlyMatch) {
      const year = Number(yearOnlyMatch[1]);
      return toMonthKey(year, 12);
    }

    const exifMatch = raw.match(/^(\d{4}):(\d{1,2}):\d{1,2}/);
    if (exifMatch) {
      const year = Number(exifMatch[1]);
      const month = Number(exifMatch[2]);
      return toMonthKey(year, month);
    }

    const usMatch = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (usMatch) {
      const month = Number(usMatch[1]);
      const year = Number(usMatch[3]);
      return toMonthKey(year, month);
    }

    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) {
      const parsedDate = new Date(parsed);
      return toMonthKey(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth() + 1);
    }

    return null;
  }

  function clampTimelineSelection() {
    const minMonth = countryLayerData.timelineMinMonth;
    const maxMonth = countryLayerData.timelineMaxMonth;
    if (!Number.isFinite(minMonth) || !Number.isFinite(maxMonth)) {
      activeTimelineMonthKey = null;
      return;
    }

    if (!Number.isFinite(activeTimelineMonthKey)) {
      activeTimelineMonthKey = maxMonth;
      return;
    }

    if (activeTimelineMonthKey < minMonth) {
      activeTimelineMonthKey = minMonth;
    } else if (activeTimelineMonthKey > maxMonth) {
      activeTimelineMonthKey = maxMonth;
    }
  }

  function normalizeCoverageRecord(record) {
    if (record && typeof record === "object" && "src" in record) {
      return normalizePhotoRecord(record);
    }
    return normalizeSeenLocationRecord(record);
  }

  function applyCoverageToFeatures() {
    let countryMaxCount = 0;
    countryLayerData.countryBirds.forEach((birds) => {
      countryMaxCount = Math.max(countryMaxCount, birds?.size || 0);
    });

    if (worldCountryGeoJson?.features) {
      for (const feature of worldCountryGeoJson.features) {
        const canonical = canonicalCountry(feature?.properties?.name || "");
        const coverageCount = canonical ? countryLayerData.countryBirds.get(canonical)?.size || 0 : 0;
        const coverageWeight = countryMaxCount > 0 ? coverageCount / countryMaxCount : 0;
        feature.properties = {
          ...(feature.properties || {}),
          hasWrapArtifact:
            Boolean(feature?.properties?.hasWrapArtifact) || geometryHasWrapArtifact(feature?.geometry),
          hasPhoto: coverageCount > 0,
          coverageCount,
          coverageWeight,
          isUsOrCanada: canonical === US_COUNTRY_NAME || canonical === CANADA_COUNTRY_NAME,
          isSelected: Boolean(canonical && selectedCountry && canonical === selectedCountry),
        };
      }
    }

    buildCountryMarkerCollection(countryMaxCount);

    if (combinedStateGeoJson?.features) {
      let usMaxCount = 0;
      let caMaxCount = 0;
      countryLayerData.usStateBirds.forEach((birds) => {
        usMaxCount = Math.max(usMaxCount, birds?.size || 0);
      });
      countryLayerData.canadaProvinceBirds.forEach((birds) => {
        caMaxCount = Math.max(caMaxCount, birds?.size || 0);
      });

      for (const feature of combinedStateGeoJson.features) {
        const country = feature?.properties?.country;
        const stateName = feature?.properties?.stateName;
        const coverageCount =
          country === "US"
            ? countryLayerData.usStateBirds.get(stateName)?.size || 0
            : country === "CA"
              ? countryLayerData.canadaProvinceBirds.get(stateName)?.size || 0
              : 0;
        const maxCount = country === "US" ? usMaxCount : country === "CA" ? caMaxCount : 0;
        const coverageWeight = maxCount > 0 ? coverageCount / maxCount : 0;

        const hasPhoto = coverageCount > 0;

        const isSelected =
          Boolean(selectedState) &&
          selectedState.country === country &&
          selectedState.stateName === stateName;
        const isSelectionMuted = Boolean(selectedState) && !isSelected;
        const effectiveCoverageWeight = isSelectionMuted ? 0 : coverageWeight;

        feature.properties = {
          ...(feature.properties || {}),
          hasPhoto,
          coverageCount,
          coverageWeight,
          effectiveCoverageWeight,
          isSelectionMuted,
          isSelected,
        };
      }
    }
  }

  function buildCountryMarkerCollection(countryMaxCount) {
    const mappedCountries = new Set();
    (worldCountryGeoJson?.features || []).forEach((feature) => {
      const canonical = canonicalCountry(feature?.properties?.name || "");
      if (canonical) {
        mappedCountries.add(canonical);
      }
    });

    const markerFeatures = [];
    countryLayerData.countryBirds.forEach((birds, countryName) => {
      if (!countryName || mappedCountries.has(countryName)) {
        return;
      }

      const coordinates = getCountryMarkerCoordinates(countryName);
      if (!Array.isArray(coordinates) || coordinates.length !== 2) {
        return;
      }

      const coverageCount = Number(birds?.size || 0);
      const coverageWeight = countryMaxCount > 0 ? coverageCount / countryMaxCount : 0;
      markerFeatures.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates,
        },
        properties: {
          name: countryName,
          countryName,
          hasPhoto: coverageCount > 0,
          coverageCount,
          coverageWeight,
          isSelected: Boolean(selectedCountry && selectedCountry === countryName),
        },
      });
    });

    countryMarkerGeoJson = {
      type: "FeatureCollection",
      features: markerFeatures,
    };
  }

  function getCountryMarkerCoordinates(countryName) {
    const direct = COUNTRY_MARKER_COORDINATES[countryName];
    if (Array.isArray(direct)) {
      return direct;
    }

    const normalizedTarget = normalizeText(countryName);
    if (!normalizedTarget) {
      return null;
    }
    const entry = Object.entries(COUNTRY_MARKER_COORDINATES).find(
      ([name]) => normalizeText(name) === normalizedTarget,
    );
    return entry?.[1] || null;
  }

  function buildCountyCollection(stateFips, stateName) {
    if (!usCountyGeoJson || !Array.isArray(usCountyGeoJson.features)) {
      countyFeatureCollection = { type: "FeatureCollection", features: [] };
      return;
    }

    const observedCountyBirds = countryLayerData.usCountyBirdsByState.get(stateName) || new Map();
    let stateMaxCount = 0;
    observedCountyBirds.forEach((birds) => {
      stateMaxCount = Math.max(stateMaxCount, birds?.size || 0);
    });
    const countyFeatures = usCountyGeoJson.features
      .filter((feature) => String(feature?.properties?.STATE || "").padStart(2, "0") === stateFips)
      .map((feature) => {
        const countyKey = normalizeCounty(feature?.properties?.NAME || "");
        const birdSet = countyKey ? observedCountyBirds.get(countyKey) : null;
        const coverageCount = birdSet?.size || 0;
        const hasPhoto = coverageCount > 0;
        const coverageWeight = stateMaxCount > 0 ? coverageCount / stateMaxCount : 0;
        const isSelected =
          Boolean(selectedCounty) &&
          selectedCounty.stateName === stateName &&
          selectedCounty.countyKey === countyKey;

        return {
          type: "Feature",
          geometry: feature.geometry,
          properties: {
            ...(feature.properties || {}),
            countyName: toTitleCase(feature?.properties?.NAME || ""),
            hasPhoto,
            coverageCount,
            coverageWeight,
            isSelected,
          },
        };
      });

    countyFeatureCollection = {
      type: "FeatureCollection",
      features: countyFeatures,
    };
  }

  function addSources() {
    map.addSource(SOURCE_COUNTRIES, {
      type: "geojson",
      data: worldCountryGeoJson,
    });

    map.addSource(SOURCE_STATES, {
      type: "geojson",
      data: combinedStateGeoJson,
    });

    map.addSource(SOURCE_COUNTIES, {
      type: "geojson",
      data: countyFeatureCollection,
    });

    map.addSource(SOURCE_COUNTRY_MARKERS, {
      type: "geojson",
      data: countryMarkerGeoJson,
    });
  }

  function addLayers() {
    map.addLayer({
      id: LAYER_COUNTRY_FILL,
      type: "fill",
      source: SOURCE_COUNTRIES,
      paint: {
        "fill-color": ["case", ["get", "hasPhoto"], "#c63f4a", "#d6ddd8"],
        "fill-opacity": COUNTRY_FILL_OPACITY_WIDE,
      },
    });

    map.addLayer({
      id: LAYER_COUNTRY_LINE,
      type: "line",
      source: SOURCE_COUNTRIES,
      paint: {
        "line-color": ["case", ["get", "isSelected"], "rgba(34, 63, 56, 0.9)", "rgba(40, 52, 49, 0.42)"],
        "line-width": ["case", ["get", "isSelected"], 1.3, 0.8],
        "line-opacity": ["case", ["get", "hasWrapArtifact"], 0, 1],
      },
    });

    map.addLayer({
      id: LAYER_COUNTRY_MARKER_CIRCLE,
      type: "circle",
      source: SOURCE_COUNTRY_MARKERS,
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["coalesce", ["get", "coverageWeight"], 0],
          0,
          6,
          1,
          12,
        ],
        "circle-color": ["case", ["get", "hasPhoto"], "#c63f4a", "#d6ddd8"],
        "circle-stroke-color": ["case", ["get", "isSelected"], "rgba(35, 74, 64, 0.95)", "rgba(40, 52, 49, 0.58)"],
        "circle-stroke-width": ["case", ["get", "isSelected"], 2.5, 1.4],
        "circle-opacity": 0.95,
      },
    });

    map.addLayer({
      id: LAYER_COUNTRY_MARKER_LABEL,
      type: "symbol",
      source: SOURCE_COUNTRY_MARKERS,
      layout: {
        "text-field": ["get", "name"],
        "text-size": 10,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": "rgba(24, 42, 37, 0.95)",
        "text-halo-color": "rgba(255, 255, 255, 0.95)",
        "text-halo-width": 1.15,
      },
    });

    map.addLayer({
      id: LAYER_STATE_FILL,
      type: "fill",
      source: SOURCE_STATES,
      paint: {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["coalesce", ["get", "effectiveCoverageWeight"], 0],
          0,
          "#ffffff",
          1,
          "#c63f4a",
        ],
        "fill-opacity": STATE_FILL_OPACITY,
      },
    });

    map.addLayer({
      id: LAYER_STATE_LINE,
      type: "line",
      source: SOURCE_STATES,
      paint: {
        "line-color": ["case", ["get", "isSelected"], "rgba(35, 74, 64, 0.92)", "rgba(48, 64, 60, 0.45)"],
        "line-width": ["case", ["get", "isSelected"], 1.4, 0.8],
        "line-opacity": ["case", ["get", "hasWrapArtifact"], 0, 1],
      },
    });

    map.addLayer({
      id: LAYER_COUNTY_FILL,
      type: "fill",
      source: SOURCE_COUNTIES,
      paint: {
        "fill-color": ["interpolate", ["linear"], ["coalesce", ["get", "coverageWeight"], 0], 0, "#ffffff", 1, "#c63f4a"],
        "fill-opacity": COUNTY_FILL_OPACITY,
      },
    });

    map.addLayer({
      id: LAYER_COUNTY_LINE,
      type: "line",
      source: SOURCE_COUNTIES,
      paint: {
        "line-color": ["case", ["get", "isSelected"], "rgba(23, 68, 58, 0.98)", "rgba(44, 58, 54, 0.36)"],
        "line-width": ["case", ["get", "isSelected"], 1.65, 0.45],
      },
    });
  }

  function applyCoverageColors() {
    const activeColor = getCoverageColorForFilter(activeFilterMode);
    setCoverageLayerColors(LAYER_COUNTRY_FILL, activeColor, "#d6ddd8");
    setCoverageLayerColors(LAYER_STATE_FILL, activeColor, "#d9dfdc");
    setCoverageLayerColors(LAYER_COUNTY_FILL, activeColor, "#d7dfda");
    setCoverageMarkerColors(activeColor, "#d6ddd8");
    updateScaleBar(activeColor);
  }

  function setCoverageLayerColors(layerId, activeColor, inactiveColor) {
    if (!map.getLayer(layerId)) {
      return;
    }
    const useWeightedGradient = layerId === LAYER_STATE_FILL || layerId === LAYER_COUNTY_FILL;
    const weightProperty = layerId === LAYER_STATE_FILL ? "effectiveCoverageWeight" : "coverageWeight";
    if (useWeightedGradient) {
      map.setPaintProperty(layerId, "fill-color", [
        "interpolate",
        ["linear"],
        ["coalesce", ["get", weightProperty], 0],
        0,
        "#ffffff",
        1,
        activeColor,
      ]);
      return;
    }

    map.setPaintProperty(layerId, "fill-color", ["case", ["get", "hasPhoto"], activeColor, inactiveColor]);
  }

  function setCoverageMarkerColors(activeColor, inactiveColor) {
    if (!map.getLayer(LAYER_COUNTRY_MARKER_CIRCLE)) {
      return;
    }
    map.setPaintProperty(
      LAYER_COUNTRY_MARKER_CIRCLE,
      "circle-color",
      ["case", ["get", "hasPhoto"], activeColor, inactiveColor],
    );
  }

  function updateScaleBar(activeColor) {
    if (!(scaleNode instanceof HTMLElement) || !(scaleBarNode instanceof HTMLElement)) {
      return;
    }

    scaleNode.hidden = false;
    scaleBarNode.style.background = `linear-gradient(90deg, #ffffff 0%, ${activeColor} 100%)`;

    const stats = getScaleStatsForCurrentView();
    if (scaleMinNode instanceof HTMLElement) {
      scaleMinNode.textContent = String(stats.min);
    }
    if (scaleMaxNode instanceof HTMLElement) {
      scaleMaxNode.textContent = String(stats.max);
    }
    if (scaleMetaNode instanceof HTMLElement) {
      const checklistScopeLabel = useDomesticChecklistScope ? "domestic checklist scope" : "world checklist scope";
      scaleMetaNode.textContent = `${stats.contextLabel} • ${checklistScopeLabel} • ${countryLayerData.coverageLabel}`;
    }
  }

  function getScaleStatsForCurrentView() {
    const zoom = map.getZoom();
    const showStates = zoom > 2.6;
    const showCounties =
      showStates &&
      Boolean(selectedState) &&
      selectedState.country === "US" &&
      zoom >= 4.7 &&
      countyFeatureCollection.features.length > 0;

    let counts = [];
    let contextLabel = "Country scale";
    if (showCounties) {
      counts = countyFeatureCollection.features.map((feature) => Number(feature?.properties?.coverageCount || 0));
      contextLabel = `County scale${selectedState?.stateName ? ` (${selectedState.stateName})` : ""}`;
    } else if (showStates) {
      counts = (combinedStateGeoJson?.features || []).map((feature) => Number(feature?.properties?.coverageCount || 0));
      contextLabel = "State/province scale";
    } else {
      counts = (worldCountryGeoJson?.features || []).map((feature) => Number(feature?.properties?.coverageCount || 0));
      contextLabel = "Country scale";
    }

    const max = counts.reduce((currentMax, value) => Math.max(currentMax, Number.isFinite(value) ? value : 0), 0);
    return {
      min: 0,
      max: Math.max(0, Math.round(max)),
      contextLabel,
    };
  }

  function getCoverageColorForFilter(filterMode) {
    const normalized = normalizeFilterMode(filterMode, "all");
    if (normalized in FILL_COLOR_BY_FILTER) {
      return FILL_COLOR_BY_FILTER[normalized];
    }
    return FILL_COLOR_BY_FILTER.all;
  }

  function normalizeFilterMode(value, fallback = "all") {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return fallback;
    }

    if (Object.prototype.hasOwnProperty.call(FILL_COLOR_BY_FILTER, normalized)) {
      return normalized;
    }

    return fallback;
  }

  function syncActiveFilterModeFromControls(fallback = "all") {
    const activeNode = filterButtons.find((button) => button.classList.contains("is-active"));
    const mode = activeNode?.getAttribute("data-bird-filter");
    return normalizeFilterMode(mode, fallback);
  }

  function wireInteractions() {
    map.on("zoom", syncLayerVisibility);
    const syncChecklistScopeFromView = () => {
      if (syncChecklistScope()) {
        rerenderCoverage();
      } else {
        updateScaleBar(getCoverageColorForFilter(activeFilterMode));
      }
    };
    map.on("zoomend", syncChecklistScopeFromView);
    map.on("moveend", syncChecklistScopeFromView);

    map.on("click", LAYER_COUNTRY_FILL, (event) => {
      const feature = event.features?.[0];
      if (!feature) {
        return;
      }
      if (selectCountryFeature(feature)) {
        fitToFeature(feature, 4);
      }
    });

    map.on("click", LAYER_COUNTRY_MARKER_CIRCLE, (event) => {
      const feature = event.features?.[0];
      if (!feature) {
        return;
      }
      if (selectCountryFeature(feature)) {
        fitToFeature(feature, 4);
      }
    });

    map.on("click", LAYER_STATE_FILL, (event) => {
      const feature = event.features?.[0];
      if (!feature) {
        return;
      }
      selectStateFeature(feature);
      fitToFeature(feature, 6);
    });

    map.on("click", LAYER_COUNTY_FILL, (event) => {
      const feature = event.features?.[0];
      if (!feature) {
        return;
      }
      selectCountyFeature(feature);
    });

    map.on("click", (event) => {
      const clickedFeatures = map.queryRenderedFeatures(event.point, {
        layers: [LAYER_COUNTRY_FILL, LAYER_COUNTRY_MARKER_CIRCLE, LAYER_STATE_FILL, LAYER_COUNTY_FILL],
      });
      if (clickedFeatures.length > 0) {
        return;
      }
      clearMapSelection();
    });

    for (const layerId of [LAYER_COUNTRY_FILL, LAYER_COUNTRY_MARKER_CIRCLE, LAYER_STATE_FILL, LAYER_COUNTY_FILL]) {
      map.on("mouseenter", layerId, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", layerId, () => {
        map.getCanvas().style.cursor = "";
      });
    }

    hoverPopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: "bird-map-tooltip",
      offset: 12,
    });

    wireLayerTooltip(LAYER_COUNTRY_FILL, (feature) => {
      if (map.getZoom() > 2.6) {
        return null;
      }
      const countryName = canonicalCountryNameForFeature(feature) || toTitleCase(feature?.properties?.name || "Country");
      const birdCount = Number(feature?.properties?.coverageCount || 0);
      return buildTooltipMarkup(countryName, birdCount, "match current filters");
    });
    wireLayerTooltip(LAYER_COUNTRY_MARKER_CIRCLE, (feature) => {
      const countryName = canonicalCountryNameForFeature(feature) || toTitleCase(feature?.properties?.name || "Country");
      const birdCount = Number(feature?.properties?.coverageCount || 0);
      return buildTooltipMarkup(countryName, birdCount, "match current filters");
    });
    wireLayerTooltip(LAYER_STATE_FILL, (feature) => {
      const stateName = String(feature?.properties?.stateName || "").trim() || "State";
      const birdCount = Number(feature?.properties?.coverageCount || 0);
      return buildTooltipMarkup(stateName, birdCount, "match current filters");
    });
    wireLayerTooltip(LAYER_COUNTY_FILL, (feature) => {
      const countyName = String(feature?.properties?.countyName || feature?.properties?.NAME || "").trim() || "County";
      const birdCount = Number(feature?.properties?.coverageCount || 0);
      return buildTooltipMarkup(countyName, birdCount, "match current filters");
    });
  }

  function wireLayerTooltip(layerId, contentBuilder) {
    map.on("mousemove", layerId, (event) => {
      const feature = event.features?.[0];
      if (!feature || !hoverPopup) {
        hideHoverTooltip();
        return;
      }

      const html = contentBuilder(feature);
      if (!html) {
        hideHoverTooltip();
        return;
      }

      hoverPopup.setLngLat(event.lngLat).setHTML(html).addTo(map);
    });

    map.on("mouseleave", layerId, hideHoverTooltip);
    map.on("mousedown", layerId, hideHoverTooltip);
  }

  function hideHoverTooltip() {
    if (hoverPopup) {
      hoverPopup.remove();
    }
  }

  function buildTooltipMarkup(title, count, suffix) {
    const safeTitle = escapeHtml(title || "Location");
    const countValue = Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
    const noun = countValue === 1 ? "bird" : "birds";
    const detailText = suffix || "match current filters";
    return (
      `<div class="bird-map-tooltip-body"><strong>${safeTitle}</strong>` +
      `<span>${countValue} ${noun} ${escapeHtml(detailText)}</span></div>`
    );
  }

  function selectCountryFeature(feature) {
    hideHoverTooltip();
    const canonicalCountry = canonicalCountryNameForFeature(feature);
    if (!canonicalCountry) {
      return false;
    }

    // Keep state/province interaction priority for US/Canada at state zoom,
    // but still allow selecting all other countries (e.g. Peru, Puerto Rico).
    if (
      map.getZoom() > 2.6 &&
      feature?.geometry?.type !== "Point" &&
      (canonicalCountry === US_COUNTRY_NAME || canonicalCountry === CANADA_COUNTRY_NAME)
    ) {
      return false;
    }

    selectedCountry = canonicalCountry;
    selectedState = null;
    selectedCounty = null;
    countyFeatureCollection = { type: "FeatureCollection", features: [] };

    applyCoverageToFeatures();
    updateSourceData();
    syncLayerVisibility();
    updateStatusLine();
    updateCountyInsights();
    emitLocationSelection({
      country: canonicalCountry,
      state: null,
      county: null,
      countryTokens: buildCountryTokens(canonicalCountry),
      stateTokens: [],
      countyTokens: [],
    });
    return true;
  }

  function selectStateFeature(feature) {
    hideHoverTooltip();
    const country = feature?.properties?.country;
    const stateName = feature?.properties?.stateName;
    const stateFips = feature?.properties?.stateFips || null;
    if (!country || !stateName) {
      return;
    }

    selectedCountry = countryCodeToCountryName(country);
    selectedState = {
      country,
      stateName,
      stateFips,
    };
    selectedCounty = null;

    if (country === "US" && stateFips) {
      buildCountyCollection(stateFips, stateName);
    } else {
      countyFeatureCollection = { type: "FeatureCollection", features: [] };
    }

    applyCoverageToFeatures();
    updateSourceData();
    syncLayerVisibility();
    updateStatusLine();
    updateCountyInsights();
    emitLocationSelection({
      country: selectedCountry,
      state: stateName,
      county: null,
      countryTokens: buildCountryTokens(selectedCountry),
      stateTokens: buildStateTokens(country, stateName),
      countyTokens: [],
    });
  }

  function selectCountyFeature(feature) {
    hideHoverTooltip();
    if (!selectedState || selectedState.country !== "US" || !selectedState.stateFips) {
      return;
    }

    const countyKey = normalizeCounty(feature?.properties?.NAME || feature?.properties?.countyName || "");
    if (!countyKey) {
      return;
    }

    selectedCounty = {
      stateName: selectedState.stateName,
      stateFips: selectedState.stateFips,
      countyKey,
      countyName: toTitleCase(feature?.properties?.countyName || feature?.properties?.NAME || "County"),
    };

    buildCountyCollection(selectedState.stateFips, selectedState.stateName);
    updateSourceData();
    syncLayerVisibility();
    updateStatusLine();
    updateCountyInsights();
    emitLocationSelection({
      country: selectedCountry,
      state: selectedState.stateName,
      county: selectedCounty.countyName,
      countryTokens: buildCountryTokens(selectedCountry),
      stateTokens: buildStateTokens(selectedState.country, selectedState.stateName),
      countyTokens: buildCountyTokens(selectedCounty.countyName, selectedCounty.countyKey),
    });
  }

  function clearMapSelection() {
    hideHoverTooltip();
    if (!selectedCountry && !selectedState && !selectedCounty) {
      return;
    }

    selectedCountry = null;
    selectedState = null;
    selectedCounty = null;
    countyFeatureCollection = { type: "FeatureCollection", features: [] };

    applyCoverageToFeatures();
    updateSourceData();
    syncLayerVisibility();
    updateStatusLine();
    updateCountyInsights();
    emitLocationClear();
  }

  function updateSourceData() {
    const countrySource = map.getSource(SOURCE_COUNTRIES);
    if (countrySource?.setData) {
      countrySource.setData(worldCountryGeoJson);
    }

    const stateSource = map.getSource(SOURCE_STATES);
    if (stateSource?.setData) {
      stateSource.setData(combinedStateGeoJson);
    }

    const countySource = map.getSource(SOURCE_COUNTIES);
    if (countySource?.setData) {
      countySource.setData(countyFeatureCollection);
    }

    const markerSource = map.getSource(SOURCE_COUNTRY_MARKERS);
    if (markerSource?.setData) {
      markerSource.setData(countryMarkerGeoJson);
    }
  }

  function rerenderCoverage() {
    activeFilterMode = syncActiveFilterModeFromControls(activeFilterMode);
    syncChecklistScope();
    if (!worldCountryGeoJson || !combinedStateGeoJson) {
      return;
    }

    refreshPhotoAggregation();
    updateTimeControl();
    applyCoverageColors();
    applyCoverageToFeatures();

    if (selectedState && selectedState.country === "US" && selectedState.stateFips) {
      buildCountyCollection(selectedState.stateFips, selectedState.stateName);
      if (!countySelectionExistsInCollection()) {
        selectedCounty = null;
        buildCountyCollection(selectedState.stateFips, selectedState.stateName);
      }
    } else {
      selectedCounty = null;
      countyFeatureCollection = { type: "FeatureCollection", features: [] };
    }

    updateSourceData();
    syncLayerVisibility();
    updateStatusLine();
    updateCountyInsights();
  }

  function countySelectionExistsInCollection() {
    if (!selectedCounty || !Array.isArray(countyFeatureCollection.features)) {
      return false;
    }

    return countyFeatureCollection.features.some((feature) => {
      const countyKey = normalizeCounty(feature?.properties?.NAME || feature?.properties?.countyName || "");
      return countyKey && countyKey === selectedCounty.countyKey;
    });
  }

  function syncLayerVisibility() {
    const zoom = map.getZoom();
    const showStates = zoom > 2.6;
    const showCounties =
      showStates &&
      Boolean(selectedState) &&
      selectedState.country === "US" &&
      zoom >= 4.7 &&
      countyFeatureCollection.features.length > 0;

    setLayerVisibility(LAYER_COUNTRY_FILL, true);
    setLayerVisibility(LAYER_COUNTRY_LINE, true);
    setLayerVisibility(LAYER_COUNTRY_MARKER_CIRCLE, true);
    setLayerVisibility(LAYER_COUNTRY_MARKER_LABEL, true);
    setLayerVisibility(LAYER_STATE_FILL, showStates);
    setLayerVisibility(LAYER_STATE_LINE, showStates);

    setLayerVisibility(LAYER_COUNTY_FILL, showCounties);
    setLayerVisibility(LAYER_COUNTY_LINE, showCounties);

    if (map.getLayer(LAYER_STATE_FILL)) {
      // When counties are visible, suppress selected-state fill to avoid color bleed under county polygons.
      map.setPaintProperty(
        LAYER_STATE_FILL,
        "fill-opacity",
        showCounties ? ["case", ["get", "isSelected"], 0, STATE_FILL_OPACITY] : STATE_FILL_OPACITY,
      );
    }

    if (map.getLayer(LAYER_STATE_LINE)) {
      // Keep context lines, but hide the selected state's outline while county polygons are active.
      map.setPaintProperty(
        LAYER_STATE_LINE,
        "line-opacity",
        showCounties
          ? ["case", ["get", "hasWrapArtifact"], 0, ["get", "isSelected"], 0, 0.5]
          : ["case", ["get", "hasWrapArtifact"], 0, 1],
      );
    }

    if (map.getLayer(LAYER_COUNTRY_LINE)) {
      // At state/county zoom, keep global country context visible while suppressing US/Canada outlines.
      map.setPaintProperty(
        LAYER_COUNTRY_LINE,
        "line-opacity",
        showStates
          ? ["case", ["get", "hasWrapArtifact"], 0, ["get", "isUsOrCanada"], 0, 1]
          : ["case", ["get", "hasWrapArtifact"], 0, 1],
      );
    }

    if (areStatesShown !== showStates) {
      areStatesShown = showStates;
      if (map.getLayer(LAYER_COUNTRY_FILL)) {
        map.setPaintProperty(
          LAYER_COUNTRY_FILL,
          "fill-opacity",
          showStates ? COUNTRY_FILL_OPACITY_ZOOMED : COUNTRY_FILL_OPACITY_WIDE,
        );
      }
      if (map.getLayer(LAYER_COUNTY_FILL)) {
        map.setPaintProperty(LAYER_COUNTY_FILL, "fill-opacity", COUNTY_FILL_OPACITY);
      }
    }

    updateScaleBar(getCoverageColorForFilter(activeFilterMode));
  }

  function setLayerVisibility(layerId, visible) {
    if (!map.getLayer(layerId)) {
      return;
    }

    map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  }

  function updateTimeControl() {
    if (!(timeNode instanceof HTMLElement) || !(timeInputNode instanceof HTMLInputElement)) {
      return;
    }

    const minMonth = countryLayerData.timelineMinMonth;
    const maxMonth = countryLayerData.timelineMaxMonth;
    if (!Number.isFinite(minMonth) || !Number.isFinite(maxMonth)) {
      timeNode.hidden = false;
      timeInputNode.min = "0";
      timeInputNode.max = "1";
      timeInputNode.step = "1";
      timeInputNode.value = "1";
      timeInputNode.disabled = true;
      if (timeValueNode instanceof HTMLElement) {
        timeValueNode.textContent = "Add capture dates to enable timeline";
      }
      return;
    }

    timeNode.hidden = false;
    timeInputNode.min = String(minMonth);
    timeInputNode.max = String(maxMonth);
    timeInputNode.step = "1";
    timeInputNode.disabled = false;
    if (!Number.isFinite(activeTimelineMonthKey)) {
      activeTimelineMonthKey = maxMonth;
    }
    timeInputNode.value = String(activeTimelineMonthKey);

    if (timeValueNode instanceof HTMLElement) {
      if (minMonth === maxMonth) {
        timeValueNode.textContent = `Only ${formatMonthKey(maxMonth)} available`;
        return;
      }
      const isLatest = activeTimelineMonthKey === maxMonth;
      timeValueNode.textContent = isLatest
        ? `All records (through ${formatMonthKey(maxMonth)})`
        : `Through ${formatMonthKey(activeTimelineMonthKey)}`;
    }
  }

  function updateCountyInsights() {
    if (!(insightsNode instanceof HTMLElement)) {
      return;
    }

    if (!selectedCounty || !selectedState || selectedState.country !== "US") {
      setInsightsText(insightsCountyNode, "Click a county for insights");
      setInsightsText(insightsSubtitleNode, "County details update from your current filters and eBird history.");
      setInsightsText(insightsFilteredNode, "0");
      setInsightsText(insightsSeenNode, "0");
      setInsightsText(insightsPhotoNode, "0");
      setInsightsText(insightsCoverageNode, "0%");
      setInsightsText(insightsRankNode, "");
      renderMissingSpeciesList(null);
      return;
    }

    const stateName = selectedCounty.stateName;
    const countyKey = selectedCounty.countyKey;
    const countyName = selectedCounty.countyName || "Selected County";

    const filteredBirdCount = countryLayerData.usCountyBirdsByState.get(stateName)?.get(countyKey)?.size || 0;
    const allSeenBirds = countyInsightData.allSeenByState.get(stateName)?.get(countyKey) || new Set();
    const allPhotoBirds = countyInsightData.allPhotosByState.get(stateName)?.get(countyKey) || new Set();
    const seenCount = allSeenBirds.size;
    const photoCount = allPhotoBirds.size;
    const photoCoverage = seenCount > 0 ? Math.round((photoCount / seenCount) * 100) : 0;

    const missingBirdKeys = Array.from(allSeenBirds).filter((key) => !allPhotoBirds.has(key));
    missingBirdKeys.sort((left, right) => {
      const leftRank = birdLookup.rankByKey.get(left) ?? Number.MAX_SAFE_INTEGER;
      const rightRank = birdLookup.rankByKey.get(right) ?? Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      return birdLabelForKey(left).localeCompare(birdLabelForKey(right));
    });

    const rankLabel = getCountyRankLabel(stateName, countyKey, filteredBirdCount);

    setInsightsText(insightsCountyNode, `${countyName}, ${stateName}`);
    setInsightsText(insightsSubtitleNode, "Filtered count reflects your current checklist + map filters.");
    setInsightsText(insightsFilteredNode, String(filteredBirdCount));
    setInsightsText(insightsSeenNode, String(seenCount));
    setInsightsText(insightsPhotoNode, String(photoCount));
    setInsightsText(insightsCoverageNode, `${photoCoverage}%`);
    setInsightsText(insightsRankNode, rankLabel);
    renderMissingSpeciesList(missingBirdKeys.slice(0, MAX_MISSING_SPECIES));
  }

  function setInsightsText(node, value) {
    if (node instanceof HTMLElement) {
      node.textContent = value;
    }
  }

  function renderMissingSpeciesList(birdKeys) {
    if (!(insightsMissingListNode instanceof HTMLElement)) {
      return;
    }

    insightsMissingListNode.textContent = "";
    if (!Array.isArray(birdKeys)) {
      const item = document.createElement("li");
      item.textContent = "Select a county to see missing-photo species.";
      insightsMissingListNode.appendChild(item);
      return;
    }

    if (!birdKeys.length) {
      const item = document.createElement("li");
      item.textContent = "No missing county photos in eBird records.";
      insightsMissingListNode.appendChild(item);
      return;
    }

    birdKeys.forEach((birdKey) => {
      const item = document.createElement("li");
      item.textContent = birdLabelForKey(birdKey);
      insightsMissingListNode.appendChild(item);
    });
  }

  function getCountyRankLabel(stateName, countyKey, countyFilteredBirdCount) {
    const countyBirds = countryLayerData.usCountyBirdsByState.get(stateName);
    if (!(countyBirds instanceof Map) || countyBirds.size === 0) {
      return "";
    }

    const ranked = Array.from(countyBirds.entries())
      .map(([key, birds]) => ({ key, count: birds?.size || 0 }))
      .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
    const rank = ranked.findIndex((entry) => entry.key === countyKey);
    if (rank < 0) {
      return "";
    }

    return `County rank in ${stateName}: ${rank + 1}/${ranked.length} (${countyFilteredBirdCount} birds in current filter).`;
  }

  function birdLabelForKey(birdKey) {
    return birdLookup.nameByKey.get(birdKey) || toTitleCase(String(birdKey || ""));
  }

  function fitToFeature(feature, maxZoom) {
    const bounds = geometryToBounds(feature?.geometry);
    if (!bounds) {
      return;
    }

    map.fitBounds(bounds, {
      padding: 18,
      maxZoom,
      duration: 450,
    });
  }

  function geometryToBounds(geometry) {
    if (!geometry || !geometry.coordinates) {
      return null;
    }

    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    traverseCoordinates(geometry.coordinates, (lng, lat) => {
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        return;
      }
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    });

    if (![minLng, minLat, maxLng, maxLat].every(Number.isFinite)) {
      return null;
    }

    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ];
  }

  function geometryHasWrapArtifact(geometry) {
    if (!geometry || typeof geometry !== "object") {
      return false;
    }

    const type = String(geometry.type || "");
    if (type === "LineString") {
      return lineHasWrapArtifact(geometry.coordinates);
    }
    if (type === "MultiLineString") {
      return Array.isArray(geometry.coordinates) && geometry.coordinates.some((line) => lineHasWrapArtifact(line));
    }
    if (type === "Polygon") {
      return Array.isArray(geometry.coordinates) && geometry.coordinates.some((ring) => lineHasWrapArtifact(ring));
    }
    if (type === "MultiPolygon") {
      return (
        Array.isArray(geometry.coordinates) &&
        geometry.coordinates.some(
          (polygon) => Array.isArray(polygon) && polygon.some((ring) => lineHasWrapArtifact(ring)),
        )
      );
    }
    return false;
  }

  function lineHasWrapArtifact(coordinates) {
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return false;
    }

    for (let index = 1; index < coordinates.length; index += 1) {
      const previous = coordinates[index - 1];
      const current = coordinates[index];
      if (!Array.isArray(previous) || !Array.isArray(current)) {
        continue;
      }

      const previousLng = Number(previous[0]);
      const currentLng = Number(current[0]);
      if (!Number.isFinite(previousLng) || !Number.isFinite(currentLng)) {
        continue;
      }

      if (Math.abs(currentLng - previousLng) > 180) {
        return true;
      }
    }

    return false;
  }

  function traverseCoordinates(value, callback) {
    if (!Array.isArray(value) || value.length === 0) {
      return;
    }

    if (typeof value[0] === "number" && typeof value[1] === "number") {
      callback(value[0], value[1]);
      return;
    }

    for (const child of value) {
      traverseCoordinates(child, callback);
    }
  }

  function buildBirdLookup() {
    const nameByKey = new Map();
    const rankByKey = new Map();
    let sortIndex = 0;

    const rows = document.querySelectorAll("[data-bird-row]");
    rows.forEach((row) => {
      if (!(row instanceof HTMLElement)) {
        return;
      }

      const birdKey = normalizeBirdKey(row.getAttribute("data-bird-key"));
      if (!birdKey || nameByKey.has(birdKey)) {
        return;
      }

      const titleNode = row.querySelector(".bird-title-line span");
      const fallbackName = toTitleCase(row.getAttribute("data-common-name") || birdKey);
      const commonName = String(titleNode?.textContent || fallbackName).trim();
      nameByKey.set(birdKey, commonName || fallbackName);
      rankByKey.set(birdKey, sortIndex);
      sortIndex += 1;
    });

    return {
      nameByKey,
      rankByKey,
    };
  }

  function buildDomesticBirdKeySet() {
    const keys = new Set();
    const rows = document.querySelectorAll("[data-bird-row]");
    rows.forEach((row) => {
      if (!(row instanceof HTMLElement)) {
        return;
      }

      const rarity = String(row.getAttribute("data-rarity") || "");
      if (rarity === "world") {
        return;
      }

      const birdKey = normalizeBirdKey(row.getAttribute("data-bird-key"));
      if (birdKey) {
        keys.add(birdKey);
      }
    });
    return keys;
  }

  function normalizeSeenLocationRecord(record) {
    const rawCountry = String(record?.country || "").trim();
    const rawState = String(record?.state || "").trim();
    const rawCounty = String(record?.county || "").trim();

    let country = canonicalCountry(rawCountry);
    const subdivisionCountry = countryNameFromSubdivision(rawState);
    const inferredCountryCode = extractCountryCodeFromSubdivision(rawState);
    const usState = canonicalUSState(rawState);
    const canadaProvince = canonicalCanadaProvince(rawState);

    if (subdivisionCountry && (!country || country === US_COUNTRY_NAME)) {
      country = subdivisionCountry;
    }
    if (!country && inferredCountryCode) {
      const inferredName = countryNameFromIsoCode(inferredCountryCode);
      if (inferredName) {
        country = inferredName;
      }
    }
    if (!country && usState) {
      country = US_COUNTRY_NAME;
    }
    if (!country && canadaProvince) {
      country = CANADA_COUNTRY_NAME;
    }

    return {
      country,
      state: country === US_COUNTRY_NAME ? usState : country === CANADA_COUNTRY_NAME ? canadaProvince : null,
      county: country === US_COUNTRY_NAME ? normalizeCounty(rawCounty) : null,
    };
  }

  function normalizePhotoRecord(photo) {
    const rawCountry = String(photo.country || "").trim();
    const rawState = String(photo.state || "").trim();
    const rawCounty = String(photo.county || "").trim();

    let country = canonicalCountry(rawCountry);
    const subdivisionCountry = countryNameFromSubdivision(rawState);
    const inferredCountryCode = extractCountryCodeFromSubdivision(rawState);
    const usState = canonicalUSState(rawState);
    const canadaProvince = canonicalCanadaProvince(rawState);

    if (subdivisionCountry && (!country || country === US_COUNTRY_NAME)) {
      country = subdivisionCountry;
    }
    if (!country && inferredCountryCode) {
      const inferredName = countryNameFromIsoCode(inferredCountryCode);
      if (inferredName) {
        country = inferredName;
      }
    }
    if (!country && usState) {
      country = US_COUNTRY_NAME;
    }
    if (!country && canadaProvince) {
      country = CANADA_COUNTRY_NAME;
    }

    return {
      country,
      state: country === US_COUNTRY_NAME ? usState : country === CANADA_COUNTRY_NAME ? canadaProvince : null,
      county: country === US_COUNTRY_NAME ? normalizeCounty(rawCounty) : null,
    };
  }

  function canonicalCountry(raw) {
    const key = normalizeText(raw);
    if (!key) {
      return null;
    }

    if (/^[a-z]{2}$/.test(key)) {
      const byCode = countryNameFromIsoCode(key.toUpperCase());
      if (byCode) {
        return byCode;
      }
    }

    return COUNTRY_ALIASES[key] || toTitleCase(raw);
  }

  function countryCodeToCountryName(code) {
    if (code === "US") {
      return US_COUNTRY_NAME;
    }
    if (code === "CA") {
      return CANADA_COUNTRY_NAME;
    }
    return null;
  }

  function countryCodeFromCountryName(name) {
    const canonical = canonicalCountry(name);
    if (canonical === US_COUNTRY_NAME) {
      return "US";
    }
    if (canonical === CANADA_COUNTRY_NAME) {
      return "CA";
    }
    return null;
  }

  function canonicalCountryNameForFeature(feature) {
    const code = String(feature?.properties?.country || "").trim();
    const byCode = countryCodeToCountryName(code);
    if (byCode) {
      return byCode;
    }
    return canonicalCountry(feature?.properties?.name || "");
  }

  function buildCountryTokens(countryName) {
    const canonical = normalizeText(countryName);
    if (!canonical) {
      return [];
    }

    const tokens = new Set([canonical]);
    Object.entries(COUNTRY_ALIASES).forEach(([alias, mappedCountry]) => {
      if (normalizeText(mappedCountry) === canonical) {
        const normalizedAlias = normalizeText(alias);
        if (normalizedAlias) {
          tokens.add(normalizedAlias);
        }
      }
    });

    return Array.from(tokens);
  }

  function buildStateTokens(countryCode, stateName) {
    const canonical = normalizeText(stateName);
    if (!canonical) {
      return [];
    }

    const tokens = new Set([canonical]);
    const aliases =
      countryCode === "US"
        ? US_STATE_ALIASES
        : countryCode === "CA"
          ? CANADA_PROVINCE_ALIASES
          : null;

    if (!aliases) {
      return Array.from(tokens);
    }

    Object.entries(aliases).forEach(([alias, mappedState]) => {
      if (normalizeText(mappedState) === canonical) {
        const normalizedAlias = normalizeText(alias);
        if (normalizedAlias) {
          tokens.add(normalizedAlias);
        }
      }
    });

    return Array.from(tokens);
  }

  function buildCountyTokens(countyName, countyKey) {
    const tokens = new Set();
    const canonicalName = normalizeText(countyName);
    if (canonicalName) {
      tokens.add(canonicalName);
    }
    const canonicalKey = normalizeCounty(countyKey || countyName);
    if (canonicalKey) {
      tokens.add(canonicalKey);
    }
    return Array.from(tokens);
  }

  function canonicalUSState(raw) {
    const key = normalizeText(raw);
    if (!key) {
      return null;
    }

    const stripped = key.replace(/^us\s+/, "").trim();
    return US_STATE_ALIASES[key] || US_STATE_ALIASES[stripped] || null;
  }

  function canonicalCanadaProvince(raw) {
    const key = normalizeText(raw);
    if (!key) {
      return null;
    }

    const stripped = key.replace(/^ca\s+/, "").trim();
    return CANADA_PROVINCE_ALIASES[key] || CANADA_PROVINCE_ALIASES[stripped] || null;
  }

  function normalizeCounty(raw) {
    const value = normalizeText(raw)
      .replace(/\b(county|parish|borough|municipality|census area|city and borough|city)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return value || null;
  }

  function normalizeText(raw) {
    return String(raw || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .toLowerCase()
      .trim();
  }

  function normalizeBirdKey(raw) {
    if (shared?.normalizeKey) {
      return shared.normalizeKey(raw);
    }
    return normalizeText(raw);
  }

  function extractCountryCodeFromSubdivision(raw) {
    const match = String(raw || "").trim().match(/^([A-Za-z]{2})[-_\s][A-Za-z0-9]{2,3}$/);
    return match ? match[1].toUpperCase() : null;
  }

  function countryNameFromSubdivision(raw) {
    const token = String(raw || "")
      .trim()
      .toUpperCase()
      .replace(/[_\s]+/g, "-");
    if (token && TERRITORY_COUNTRY_BY_SUBDIVISION[token]) {
      return TERRITORY_COUNTRY_BY_SUBDIVISION[token];
    }

    const normalized = normalizeText(raw);
    if (!normalized) {
      return null;
    }

    return TERRITORY_COUNTRY_BY_SUBDIVISION_NAME[normalized] || null;
  }

  function countryNameFromIsoCode(code) {
    const normalized = String(code || "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(normalized)) {
      return null;
    }

    if (COUNTRY_CODE_NAMES[normalized]) {
      return COUNTRY_CODE_NAMES[normalized];
    }

    try {
      if (window.Intl && typeof window.Intl.DisplayNames === "function") {
        const formatter = new window.Intl.DisplayNames(["en"], { type: "region" });
        const name = formatter.of(normalized);
        if (name && name !== normalized) {
          COUNTRY_CODE_NAMES[normalized] = name;
          return name;
        }
      }
    } catch (_error) {}

    return null;
  }

  function parseVisibleBirdKeys(value) {
    if (!Array.isArray(value)) {
      return null;
    }

    const keys = value.map(normalizeBirdKey).filter(Boolean);
    return new Set(keys);
  }

  function emitLocationSelection(selection) {
    window.dispatchEvent(
      new window.CustomEvent("bird-atlas:location-selected", {
        detail: {
          country: selection?.country || "",
          state: selection?.state || "",
          county: selection?.county || "",
          countryTokens: Array.isArray(selection?.countryTokens) ? selection.countryTokens : [],
          stateTokens: Array.isArray(selection?.stateTokens) ? selection.stateTokens : [],
          countyTokens: Array.isArray(selection?.countyTokens) ? selection.countyTokens : [],
        },
      }),
    );
  }

  function emitLocationClear() {
    window.dispatchEvent(new window.CustomEvent("bird-atlas:location-cleared"));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toTitleCase(raw) {
    return String(raw || "")
      .trim()
      .split(/\s+/)
      .map((chunk) => chunk.slice(0, 1).toUpperCase() + chunk.slice(1).toLowerCase())
      .join(" ");
  }

  function normalizeDateLike(value) {
    return String(value || "").trim();
  }

  function toMonthKey(yearValue, monthValue) {
    const year = Number(yearValue);
    const month = Number(monthValue);
    if (!Number.isFinite(year) || !Number.isFinite(month) || year < 1800 || year > 2200 || month < 1 || month > 12) {
      return null;
    }
    return year * 12 + (month - 1);
  }

  function formatMonthKey(monthKey) {
    const numeric = Number(monthKey);
    if (!Number.isFinite(numeric)) {
      return "";
    }

    const year = Math.floor(numeric / 12);
    const month = (numeric % 12) + 1;
    const parsed = new Date(Date.UTC(year, month - 1, 1));
    return parsed.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  }

  function updateStatusLine() {
    if (!(statusNode instanceof HTMLElement)) {
      return;
    }

    if (selectedCounty && selectedState?.stateName) {
      statusNode.textContent = `Location selected: ${selectedCounty.countyName}, ${selectedState.stateName}. Applies to Seen / Photographed / Seen, Needs Photo.`;
      statusNode.hidden = false;
      return;
    }

    if (selectedState?.stateName) {
      statusNode.textContent = `Location selected: ${selectedState.stateName}. Applies to Seen / Photographed / Seen, Needs Photo.`;
      statusNode.hidden = false;
      return;
    }

    if (selectedCountry) {
      statusNode.textContent = `Location selected: ${selectedCountry}. Applies to Seen / Photographed / Seen, Needs Photo.`;
      statusNode.hidden = false;
      return;
    }

    statusNode.textContent = "";
    statusNode.hidden = true;
  }
})();
