"use strict";

/*
  Add projects later using this structure:
  {
    id: "unique-id",
    title: "Project title",
    type: "vector", // vector or raster
    format: "GeoJSON",
    location: "Lahore, Pakistan",
    thumbnail: "../images/project.jpg",
    center: [31.5204, 74.3587],
    zoom: 11,
    layers: []
  }
*/
const QUALITY_CLASSES = [
  { label: "Excellent", aliases: ["excellent", "very good"], color: "#238b45" },
  { label: "Good", aliases: ["good", "suitable"], color: "#78c679" },
  { label: "Moderate", aliases: ["moderate", "fair", "marginal"], color: "#fed976" },
  { label: "Poor", aliases: ["poor", "unsuitable"], color: "#fd8d3c" },
  { label: "Very Poor", aliases: ["very poor", "critical", "hazardous"], color: "#bd0026" }
];

const projects = [
  {
    id: "wasa-tubewell-quality",
    title: "WASA Tube-well Water Quality",
    description: "Water-quality status of WASA Lahore tube-wells.",
    type: "vector",
    format: "GeoJSON",
    location: "Lahore, Pakistan",
    thumbnail: "",
    dataUrl: "../data/TW_Quality_data.geojson",
    center: [31.5204, 74.3587],
    zoom: 11,
    qualityField: "Quality",
    idField: "TW_ID"
  },
  {
    id: "groundwater-quality-raster",
    title: "Groundwater Quality Index",
    description: "Spatial groundwater-quality surface derived from water samples.",
    type: "raster",
    format: "GeoTIFF",
    location: "Lahore, Pakistan",
    thumbnail: "",
    dataUrl: "../data/FGQI_241.tif",
    center: [31.5204, 74.3587],
    zoom: 10,
    opacity: 0.78,
    rasterClasses: [
      { min: -Infinity, max: 50, label: "Excellent (≤ 50)", color: "#1a9850" },
      { min: 50, max: 100, label: "Good (51–100)", color: "#91cf60" },
      { min: 100, max: 200, label: "Poor (101–200)", color: "#fee08b" },
      { min: 200, max: 300, label: "Very poor (201–300)", color: "#fc8d59" },
      { min: 300, max: Infinity, label: "Unsuitable (> 300)", color: "#d73027" }
    ]
  }
];

const INITIAL_CENTER = [31.5204, 74.3587];
const INITIAL_ZOOM = 9;

const mapElement = document.getElementById("portfolioMap");
if (mapElement && window.L) {
  const map = L.map("portfolioMap", {
    zoomControl: true,
    preferCanvas: true,
    attributionControl: true
  }).setView(INITIAL_CENTER, INITIAL_ZOOM);

  const basemaps = {
    osm: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }),
    satellite: L.tileLayer("https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
      maxZoom: 21,
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      attribution: "Imagery &copy; Google"
    }),
    googleMaps: L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      maxZoom: 21,
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      attribution: "Map data &copy; Google"
    }),
    hybrid: L.tileLayer("https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
      maxZoom: 21,
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      attribution: "Imagery & map data &copy; Google"
    })
  };

  let activeBasemap = basemaps.osm.addTo(map);
  const activeProjectLayers = [];

  const basemapToggle = document.getElementById("basemapToggle");
  const basemapPanel = document.getElementById("basemapPanel");
  const basemapOptions = document.querySelectorAll(".basemap-option");
  const projectSearch = document.getElementById("projectSearch");
  const filterButtons = document.querySelectorAll(".filter-button");
  const projectList = document.getElementById("projectList");
  const projectCount = document.getElementById("projectCount");
  const mapEmptyCard = document.getElementById("mapEmptyCard");
  const mapStateText = document.getElementById("mapStateText");
  const mapCoordinate = document.getElementById("mapCoordinate");
  const mapLegend = document.getElementById("mapLegend");
  const attributePanel = document.getElementById("attributePanel");
  const attributeTable = document.getElementById("attributeTable");
  const attributeTitle = document.getElementById("attributeTitle");
  const attributeCount = document.getElementById("attributeCount");
  const attributeClose = document.getElementById("attributeClose");

  let activeFilter = "all";
  let searchQuery = "";

  function toggleBasemapPanel(force) {
    const open = typeof force === "boolean" ? force : !basemapPanel.classList.contains("open");
    basemapPanel.classList.toggle("open", open);
    basemapToggle.setAttribute("aria-expanded", String(open));
  }

  basemapToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleBasemapPanel();
  });

  basemapPanel.addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("click", () => toggleBasemapPanel(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") toggleBasemapPanel(false);
    if (event.key === "/" && document.activeElement !== projectSearch) {
      event.preventDefault();
      projectSearch.focus();
    }
  });

  basemapOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const key = option.dataset.basemap;
      if (!basemaps[key] || activeBasemap === basemaps[key]) return;
      map.removeLayer(activeBasemap);
      activeBasemap = basemaps[key].addTo(map);
      basemapOptions.forEach((item) => item.classList.toggle("active", item === option));
      mapStateText.textContent = `${option.querySelector("strong").textContent} active`;
      toggleBasemapPanel(false);
    });
  });

  function clearProjectLayers() {
    activeProjectLayers.forEach((layer) => map.removeLayer(layer));
    activeProjectLayers.length = 0;
    mapLegend.hidden = true;
    attributePanel.hidden = true;
  }

  function escapeHtml(value) {
    return String(value ?? "—").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function findField(properties, requested, candidates) {
    const keys = Object.keys(properties || {});
    if (requested && keys.includes(requested)) return requested;
    return keys.find((key) => candidates.includes(key.toLowerCase())) || keys.find((key) => candidates.some((name) => key.toLowerCase().includes(name)));
  }

  function qualityClass(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return QUALITY_CLASSES.find((item) => item.label.toLowerCase() === normalized || item.aliases.includes(normalized)) ||
      { label: value || "Not classified", color: "#6b7280" };
  }

  function showLegend(title, items, opacityLayer) {
    mapLegend.innerHTML = `<div class="legend-title">${escapeHtml(title)}</div>${items.map((item) => `
      <div class="legend-item"><span style="background:${item.color}"></span>${escapeHtml(item.label)}</div>`).join("")}
      ${opacityLayer ? `<label class="opacity-control">Opacity <input id="rasterOpacity" type="range" min="0" max="1" step="0.05" value="${opacityLayer.options.opacity || .78}"></label>` : ""}`;
    mapLegend.hidden = false;
    if (opacityLayer) document.getElementById("rasterOpacity").addEventListener("input", (event) => opacityLayer.setOpacity(Number(event.target.value)));
  }

  function showAttributes(project, features, geoJsonLayer) {
    const properties = features.map((feature) => feature.properties || {});
    const columns = [...new Set(properties.flatMap(Object.keys))];
    attributeTitle.textContent = `${project.title} — Attributes`;
    attributeCount.textContent = `${features.length} records`;
    attributeTable.innerHTML = `<thead><tr><th>#</th>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${properties.map((row, index) => `
      <tr data-row="${index}"><td>${index + 1}</td>${columns.map((column) => `<td>${escapeHtml(row[column])}</td>`).join("")}</tr>`).join("")}</tbody>`;
    attributePanel.hidden = false;
    attributeTable.querySelectorAll("tbody tr").forEach((row) => row.addEventListener("click", () => {
      const featureLayer = geoJsonLayer.getLayers()[Number(row.dataset.row)];
      if (!featureLayer) return;
      const target = featureLayer.getLatLng ? featureLayer.getLatLng() : featureLayer.getBounds().getCenter();
      map.flyTo(target, Math.max(map.getZoom(), 15));
      featureLayer.openPopup();
    }));
  }

  async function loadVector(project) {
    const response = await fetch(project.dataUrl);
    if (!response.ok) throw new Error(`Could not load ${project.dataUrl}`);
    const data = await response.json();
    const features = data.features || [];
    const firstProps = features[0]?.properties || {};
    const qualityField = findField(firstProps, project.qualityField, ["quality", "status", "class", "wqi", "gwqi", "fgqi"]);
    const idField = findField(firstProps, project.idField, ["tw_id", "id", "name", "tubewell", "tube_well"]);
    const usedClasses = new Map();
    const layer = L.geoJSON(data, {
      pointToLayer: (feature, latlng) => {
        const item = qualityClass(feature.properties?.[qualityField]);
        usedClasses.set(item.label, item);
        return L.circleMarker(latlng, { radius: 8, fillColor: item.color, color: "#fff", weight: 2, fillOpacity: .92 });
      },
      style: (feature) => {
        const item = qualityClass(feature.properties?.[qualityField]);
        usedClasses.set(item.label, item);
        return { color: item.color, fillColor: item.color, weight: 2, fillOpacity: .7 };
      },
      onEachFeature: (feature, featureLayer) => {
        const props = feature.properties || {};
        featureLayer.bindPopup(`<div class="feature-popup"><strong>${escapeHtml(props[idField] || project.title)}</strong>${Object.entries(props).map(([key, value]) => `<div><span>${escapeHtml(key)}</span><b>${escapeHtml(value)}</b></div>`).join("")}</div>`);
      }
    }).addTo(map);
    activeProjectLayers.push(layer);
    if (layer.getBounds().isValid()) map.fitBounds(layer.getBounds(), { padding: [45, 45] });
    showLegend(qualityField || "Water quality", [...usedClasses.values()]);
    showAttributes(project, features, layer);
  }

  async function loadRaster(project) {
    const response = await fetch(project.dataUrl);
    if (!response.ok) throw new Error(`Could not load ${project.dataUrl}`);
    const georaster = await parseGeoraster(await response.arrayBuffer());
    const colorForValue = (value) => project.rasterClasses.find((item) => value > item.min && value <= item.max)?.color || null;
    const layer = new GeoRasterLayer({ georaster, opacity: project.opacity || .78, resolution: 256, pixelValuesToColorFn: (values) => {
      const value = values[0];
      return value === georaster.noDataValue || value == null || Number.isNaN(value) ? null : colorForValue(value);
    }}).addTo(map);
    activeProjectLayers.push(layer);
    map.fitBounds(layer.getBounds(), { padding: [35, 35] });
    showLegend("Groundwater Quality Index", project.rasterClasses, layer);
  }

  async function selectProject(project) {
    clearProjectLayers();
    if (mapEmptyCard) mapEmptyCard.classList.add("hidden");
    mapStateText.textContent = `Flying to ${project.title}`;
    map.flyTo(project.center, project.zoom || 11, { duration: 1.0 });

    document.querySelectorAll(".project-card").forEach((card) => {
      card.classList.toggle("active", card.dataset.id === project.id);
    });

    try {
      if (project.type === "vector") await loadVector(project);
      else await loadRaster(project);
      mapStateText.textContent = project.title;
    } catch (error) {
      console.error(error);
      mapStateText.textContent = "Dataset could not be loaded";
      if (mapEmptyCard) {
        mapEmptyCard.classList.remove("hidden");
        const errorTitle = mapEmptyCard.querySelector("h3");
        const errorText = mapEmptyCard.querySelector("p");
        if (errorTitle) errorTitle.textContent = "Project file not found";
        if (errorText) errorText.textContent = `Place the dataset at ${project.dataUrl}. Open this page through a web server, not by double-clicking the HTML file.`;
      }
    }
  }

  function renderProjects() {
    const visible = projects.filter((project) => {
      const matchesType = activeFilter === "all" || project.type === activeFilter;
      const searchable = `${project.title} ${project.location} ${project.format}`.toLowerCase();
      return matchesType && searchable.includes(searchQuery);
    });

    projectCount.textContent = String(visible.length);
    projectList.innerHTML = "";

    if (!visible.length) {
      projectList.innerHTML = `
        <div class="project-empty">
          <i class="fa-regular fa-folder-open"></i>
          <div>
            <strong>${projects.length ? "No matching projects" : "Projects coming soon"}</strong>
            <p>${projects.length ? "Try another search or filter." : "Your vector and raster projects will appear in this sidebar."}</p>
          </div>
        </div>`;
      return;
    }

    visible.forEach((project) => {
      const card = document.createElement("article");
      card.className = "project-card";
      card.dataset.id = project.id;
      card.tabIndex = 0;
      card.innerHTML = `
        ${project.thumbnail
          ? `<img class="project-thumbnail" src="${project.thumbnail}" alt="" onerror="this.outerHTML='<div class=&quot;project-thumbnail thumbnail-placeholder&quot;><i class=&quot;fa-solid fa-map-location-dot&quot;></i></div>'">`
          : `<div class="project-thumbnail thumbnail-placeholder"><i class="fa-solid ${project.type === "vector" ? "fa-location-dot" : "fa-layer-group"}"></i></div>`}
        <div>
          <h3>${project.title}</h3>
          <div class="project-meta">
            <span class="data-badge">${project.type}</span>
            <span class="data-badge">${project.format}</span>
          </div>
        </div>`;
      card.addEventListener("click", () => selectProject(project));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") selectProject(project);
      });
      projectList.appendChild(card);
    });
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      filterButtons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      renderProjects();
    });
  });

  projectSearch.addEventListener("input", () => {
    searchQuery = projectSearch.value.trim().toLowerCase();
    renderProjects();
  });

  attributeClose.addEventListener("click", () => { attributePanel.hidden = true; });

  map.on("mousemove", ({ latlng }) => {
    mapCoordinate.innerHTML = `${Math.abs(latlng.lat).toFixed(4)}° ${latlng.lat >= 0 ? "N" : "S"}&nbsp;&nbsp;${Math.abs(latlng.lng).toFixed(4)}° ${latlng.lng >= 0 ? "E" : "W"}`;
  });

  renderProjects();
  setTimeout(() => map.invalidateSize(), 150);
}
