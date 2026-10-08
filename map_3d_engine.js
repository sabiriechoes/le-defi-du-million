/**
 * LE DÉFI DU MILLION - GOOGLE EARTH STYLE 3D INNOVATION MAP & HERITAGE ENGINE
 * Full WebGL Three.js & Leaflet GIS Integration
 */

// Global State
let threeScene, threeCamera, threeRenderer, current3DObject;
let is3DDragging = false, prevMouseX = 0, prevMouseY = 0;
let autoRotate3D = true;
let animFrameId = null;

// Map & Simulator State
let activeMap = null;
let currentActiveStop = null;
let currentHighlightedPolylines = [];
let currentMarkers = [];
let activeLayerType = 'satellite';
let satelliteTileLayer, streetTileLayer;

// Archetype Classifier for 3D Models
function getArchetypeForStop(stop) {
    if (!stop) return 'bab';
    const txt = (stop.name + " " + (stop.hist_site || "") + " " + (stop.craft_challenge || "")).toLowerCase();
    if (txt.includes('قصبة') || txt.includes('قصر') || txt.includes('طين') || txt.includes('آيت بن حدو') || txt.includes('تيزورڭان') || txt.includes('مڭداز')) {
        return 'kasbah';
    } else if (txt.includes('باب') || txt.includes('برج') || txt.includes('سور') || txt.includes('سقالة') || txt.includes('حصن') || txt.includes('قمرة') || txt.includes('مدينة عتيقة')) {
        return 'bab';
    } else if (txt.includes('زاوية') || txt.includes('مسجد') || txt.includes('ضريح') || txt.includes('مئذنة') || txt.includes('صومعة') || txt.includes('زرهون')) {
        return 'minaret';
    } else if (txt.includes('فخار') || txt.includes('خزف') || txt.includes('تامكروت') || txt.includes('آسفي') || txt.includes('زليج')) {
        return 'pottery';
    } else if (txt.includes('صحراء') || txt.includes('لاڭون') || txt.includes('خيمة') || txt.includes('نايلة') || txt.includes('طانطان') || txt.includes('كلميم') || txt.includes('داخلة') || txt.includes('عيون')) {
        return 'bivouac';
    }
    return 'bab';
}

// ==========================================
// 1. THREE.JS 3D HERITAGE MODEL GENERATOR
// ==========================================
function init3DCanvas(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (threeRenderer) {
        if (animFrameId) cancelAnimationFrame(animFrameId);
        container.innerHTML = '';
    }

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 240;

    threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color(0x0c0b0a);

    threeCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    threeCamera.position.set(0, 2.8, 5.8);
    threeCamera.lookAt(0, 0, 0);

    threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    threeRenderer.setSize(width, height);
    threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    threeRenderer.shadowMap.enabled = true;
    container.appendChild(threeRenderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffeedd, 0.95);
    threeScene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffdfa0, 1.3);
    dirLight1.position.set(5, 8, 4);
    threeScene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x7090ff, 0.6);
    dirLight2.position.set(-5, -2, -4);
    threeScene.add(dirLight2);

    // Subtle Grid Floor
    const grid = new THREE.GridHelper(8, 16, 0xC8A951, 0x222222);
    grid.position.y = -0.01;
    threeScene.add(grid);

    // Mouse / Touch Controls
    const el = threeRenderer.domElement;
    el.style.cursor = 'grab';

    el.onmousedown = (e) => {
        is3DDragging = true;
        autoRotate3D = false;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
        el.style.cursor = 'grabbing';
    };
    window.onmouseup = () => {
        is3DDragging = false;
        el.style.cursor = 'grab';
    };
    window.onmousemove = (e) => {
        if (!is3DDragging || !current3DObject) return;
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        current3DObject.rotation.y += deltaX * 0.012;
        current3DObject.rotation.x += deltaY * 0.008;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
    };

    // Touch support
    el.ontouchstart = (e) => {
        if (e.touches.length === 1) {
            is3DDragging = true;
            autoRotate3D = false;
            prevMouseX = e.touches[0].clientX;
            prevMouseY = e.touches[0].clientY;
        }
    };
    el.ontouchend = () => { is3DDragging = false; };
    el.ontouchmove = (e) => {
        if (!is3DDragging || !current3DObject || e.touches.length !== 1) return;
        const deltaX = e.touches[0].clientX - prevMouseX;
        const deltaY = e.touches[0].clientY - prevMouseY;
        current3DObject.rotation.y += deltaX * 0.012;
        current3DObject.rotation.x += deltaY * 0.008;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
    };

    function animate() {
        animFrameId = requestAnimationFrame(animate);
        if (current3DObject && autoRotate3D) {
            current3DObject.rotation.y += 0.009;
        }
        threeRenderer.render(threeScene, threeCamera);
    }
    animate();
}

function load3DHeritageModel(type) {
    if (!threeScene) return;

    if (current3DObject) {
        threeScene.remove(current3DObject);
    }

    const group = new THREE.Group();

    const piseMat = new THREE.MeshStandardMaterial({ color: 0xB8632E, roughness: 0.8, metalness: 0.1 });
    const piseDarkMat = new THREE.MeshStandardMaterial({ color: 0x8C421E, roughness: 0.9 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4A2E18, roughness: 0.7 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xC8A951, roughness: 0.3, metalness: 0.8 });
    const greenTileMat = new THREE.MeshStandardMaterial({ color: 0x1B6B4A, roughness: 0.2, metalness: 0.4 });
    const whitePlasterMat = new THREE.MeshStandardMaterial({ color: 0xE8E0D5, roughness: 0.8 });
    const desertSandMat = new THREE.MeshStandardMaterial({ color: 0xD4A373, roughness: 0.9 });

    if (type === 'kasbah') {
        // High Atlas Pisé Kasbah Fortress
        const mainBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 2.0), piseMat);
        mainBase.position.y = 0.7;
        group.add(mainBase);

        const tier2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.4), piseMat);
        tier2.position.y = 1.85;
        group.add(tier2);

        const towerGeo = new THREE.BoxGeometry(0.55, 2.2, 0.55);
        const towerPositions = [
            [-1.15, 1.1, -0.95],
            [1.15, 1.1, -0.95],
            [-1.15, 1.1, 0.95],
            [1.15, 1.1, 0.95]
        ];
        towerPositions.forEach(pos => {
            const tower = new THREE.Mesh(towerGeo, piseDarkMat);
            tower.position.set(...pos);
            group.add(tower);

            const cap = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.5, 4), piseDarkMat);
            cap.position.set(pos[0], 2.45, pos[2]);
            cap.rotation.y = Math.PI / 4;
            group.add(cap);
        });

        const gate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.05), woodMat);
        gate.position.set(0, 0.45, 1.02);
        group.add(gate);

        const frieze = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.15, 2.05), goldMat);
        frieze.position.y = 1.35;
        group.add(frieze);

    } else if (type === 'bab') {
        // Imperial City Gate & Ramparts
        const wall = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.2, 0.7), piseMat);
        wall.position.y = 1.1;
        group.add(wall);

        const archInner = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.72, 16, 1, false, 0, Math.PI), whitePlasterMat);
        archInner.rotation.z = Math.PI / 2;
        archInner.rotation.y = Math.PI / 2;
        archInner.position.set(0, 0.95, 0);
        group.add(archInner);

        const archDoor = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.95, 0.74), woodMat);
        archDoor.position.set(0, 0.47, 0);
        group.add(archDoor);

        const bastionGeo = new THREE.BoxGeometry(0.7, 2.6, 1.1);
        const bLeft = new THREE.Mesh(bastionGeo, piseDarkMat);
        bLeft.position.set(-1.6, 1.3, 0);
        const bRight = new THREE.Mesh(bastionGeo, piseDarkMat);
        bRight.position.set(1.6, 1.3, 0);
        group.add(bLeft, bRight);

        const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.45, 4), greenTileMat);
        canopy.position.set(0, 2.4, 0);
        canopy.rotation.y = Math.PI / 4;
        group.add(canopy);

    } else if (type === 'minaret') {
        // Almohad Minaret & Shrine
        const shaft = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.2, 1.1), whitePlasterMat);
        shaft.position.y = 1.6;
        group.add(shaft);

        const panelMat = new THREE.MeshStandardMaterial({ color: 0xC8A951, metalness: 0.7 });
        const panelF = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.8), panelMat);
        panelF.position.set(0, 1.8, 0.56);
        group.add(panelF);

        const balcony = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.2, 1.3), greenTileMat);
        balcony.position.y = 3.3;
        group.add(balcony);

        const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.8, 0.65), whitePlasterMat);
        lantern.position.y = 3.8;
        group.add(lantern);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.5, 4), greenTileMat);
        roof.position.y = 4.4;
        roof.rotation.y = Math.PI / 4;
        group.add(roof);

        const sphereGeo = new THREE.SphereGeometry(0.1, 16, 16);
        const s1 = new THREE.Mesh(sphereGeo, goldMat);
        s1.position.y = 4.75;
        const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), goldMat);
        s2.position.y = 4.95;
        group.add(s1, s2);

    } else if (type === 'pottery') {
        // Moroccan Ceramics & Amphora
        const emeraldCeramicMat = new THREE.MeshStandardMaterial({ color: 0x1B6B4A, roughness: 0.15, metalness: 0.35 });

        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.25, 32), piseDarkMat);
        ped.position.y = 0.12;
        group.add(ped);

        const belly = new THREE.Mesh(new THREE.SphereGeometry(0.9, 32, 32), emeraldCeramicMat);
        belly.scale.set(1, 1.3, 1);
        belly.position.y = 1.3;
        group.add(belly);

        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.0, 32), emeraldCeramicMat);
        neck.position.y = 2.4;
        group.add(neck);

        const lip = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.08, 16, 32), goldMat);
        lip.rotation.x = Math.PI / 2;
        lip.position.y = 2.9;
        group.add(lip);

    } else if (type === 'bivouac') {
        // Desert Nomadic Bivouac
        const dune = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 0.3, 32), desertSandMat);
        dune.position.y = 0.15;
        group.add(dune);

        const tentMat = new THREE.MeshStandardMaterial({ color: 0x33261D, roughness: 0.9 });
        const tent = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.2, 5), tentMat);
        tent.position.set(0, 0.85, -0.3);
        tent.rotation.y = Math.PI / 5;
        group.add(tent);

        const fireMat = new THREE.MeshStandardMaterial({ color: 0xff4500, emissive: 0xff2200 });
        const fire = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2), fireMat);
        fire.position.set(0, 0.4, 0.8);
        group.add(fire);
    }

    current3DObject = group;
    threeScene.add(current3DObject);
}

// ==========================================
// 2. GOOGLE EARTH 3D LANDMARK ON MAP ZOOM
// ==========================================
function show3DLandmarkAt(stop) {
    if (!stop) return;
    currentActiveStop = stop;

    // Show floating 3D Google Earth HUD overlay
    const overlay = document.getElementById('google-earth-3d-box');
    if (overlay) {
        overlay.classList.remove('hidden');

        document.getElementById('ge3d-stop-name').textContent = stop.full_name || stop.name;
        document.getElementById('ge3d-stop-img').src = stop.image;
        document.getElementById('ge3d-craft-name').textContent = stop.craft_challenge;
        document.getElementById('ge3d-hist-name').textContent = stop.hist_challenge;
        document.getElementById('ge3d-hist-site').textContent = stop.hist_site;

        // Initialize 3D canvas
        init3DCanvas('ge3d-canvas-container');
        const arch = getArchetypeForStop(stop);
        load3DHeritageModel(arch);
    }
}

function close3DLandmarkBox() {
    const overlay = document.getElementById('google-earth-3d-box');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}
window.close3DLandmarkBox = close3DLandmarkBox;

function close3DInspector() {
    const drawer = document.getElementById('innovation-3d-drawer');
    if (drawer) {
        drawer.classList.add('-translate-x-full');
    }
}
window.close3DInspector = close3DInspector;

function zoomToStopAnd3D(stopId) {
    const stopsData = window.STOPS_DATA || [];
    const stop = stopsData.find(s => s.id === stopId);
    if (!stop || !activeMap) return;

    // Smooth Google Earth flight zoom
    activeMap.flyTo(stop.coords, 13, {
        animate: true,
        duration: 1.5
    });

    // Show 3D landmark box after flight
    setTimeout(() => {
        show3DLandmarkAt(stop);
    }, 1200);
}
window.zoomToStopAnd3D = zoomToStopAnd3D;

// ==========================================
// 3. MASTER MAP CONTROLLER & HIGHLIGHTED ROUTES
// ==========================================
window.initMasterMap = function() {
    const mapEl = document.getElementById('morocco-satellite-map');
    if (!mapEl) return;

    // Safety check: if container already initialized in Leaflet, destroy it cleanly first!
    if (mapEl._leaflet_id) {
        mapEl._leaflet_id = null;
    }
    if (activeMap) {
        try { activeMap.remove(); } catch(e){}
        activeMap = null;
    }

    activeMap = L.map('morocco-satellite-map', {
        center: [31.7917, -7.0926],
        zoom: 6,
        zoomControl: true,
        scrollWheelZoom: true
    });
    window.map = activeMap;

    // 1. Google Earth Hybrid Satellite (Fast, rock-solid, ultra-crisp Moroccan place names & roads)
    satelliteTileLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        attribution: '&copy; Google Earth / Satellite'
    });

    // 2. OpenStreetMap Standard Roads
    streetTileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
    });

    satelliteTileLayer.addTo(activeMap);

    // Ensure map tiles render properly without grey screen
    setTimeout(() => { if (activeMap) activeMap.invalidateSize(); }, 200);
    setTimeout(() => { if (activeMap) activeMap.invalidateSize(); }, 800);
    window.addEventListener('resize', () => { if (activeMap) activeMap.invalidateSize(); });

    // Listen to Zoom changes: When zooming in deep (>= 11), auto-open closest 3D model!
    activeMap.on('zoomend', () => {
        const currentZoom = activeMap.getZoom();
        if (currentZoom >= 11) {
            const center = activeMap.getCenter();
            const stopsData = window.STOPS_DATA || [];
            // Find closest stop to center
            let closest = null, minDist = Infinity;
            stopsData.forEach(s => {
                const dist = Math.hypot(s.coords[0] - center.lat, s.coords[1] - center.lng);
                if (dist < minDist) {
                    minDist = dist;
                    closest = s;
                }
            });
            if (closest && minDist < 0.8) {
                show3DLandmarkAt(closest);
            }
        } else {
            close3DLandmarkBox();
        }
    });

    // Draw default Episode 1 route
    window.selectEpisode(1);
};

// Switch Satellite vs Roads
window.selectLayer = function(type) {
    activeLayerType = type;
    const satBtn = document.getElementById('layer-btn-sat');
    const strBtn = document.getElementById('layer-btn-str');

    if (!activeMap) return;

    if (type === 'satellite') {
        if (activeMap.hasLayer(streetTileLayer)) activeMap.removeLayer(streetTileLayer);
        if (!activeMap.hasLayer(satelliteTileLayer)) satelliteTileLayer.addTo(activeMap);
        if (satBtn) satBtn.className = "px-3 py-1.5 rounded-xl bg-brand-gold text-dark-950 font-bold border border-brand-gold";
        if (strBtn) strBtn.className = "px-3 py-1.5 rounded-xl glass text-gray-300 font-bold hover:text-white";
    } else {
        if (activeMap.hasLayer(satelliteTileLayer)) activeMap.removeLayer(satelliteTileLayer);
        if (!activeMap.hasLayer(streetTileLayer)) streetTileLayer.addTo(activeMap);
        if (strBtn) strBtn.className = "px-3 py-1.5 rounded-xl bg-brand-gold text-dark-950 font-bold border border-brand-gold";
        if (satBtn) satBtn.className = "px-3 py-1.5 rounded-xl glass text-gray-300 font-bold hover:text-white";
    }
};

// Select Episode & Highlighted Colored Trajet
window.selectEpisode = function(epId) {
    if (!activeMap) return;

    close3DLandmarkBox();

    // Update Tab Buttons UI
    document.querySelectorAll('.map-filter-btn').forEach((btn) => {
        btn.classList.remove('bg-brand-gold', 'text-dark-950');
        btn.classList.add('glass', 'text-gray-300');
    });
    const activeBtn = document.getElementById('map-btn-ep-' + epId);
    if (activeBtn) {
        activeBtn.classList.remove('glass', 'text-gray-300');
        activeBtn.classList.add('bg-brand-gold', 'text-dark-950');
    }

    // Clear existing paths & markers
    currentHighlightedPolylines.forEach(p => activeMap.removeLayer(p));
    currentMarkers.forEach(m => activeMap.removeLayer(m));
    currentHighlightedPolylines = [];
    currentMarkers = [];

    const activeRoutes = window.EPISODES_ROUTES || [];
    const activeStops = window.STOPS_DATA || [];
    let bounds = [];

    // Colors for distinct trajets
    const routeColors = {
        1: '#00D2FF', // North: Vibrant Turquoise
        2: '#FFB800', // East: Gold / Amber
        3: '#FF6B35', // Atlas: Sunset Terracotta
        4: '#00F5D4', // Atlantic: Coastal Emerald
        5: '#A259FF', // Souss: Amethyst Purple
        6: '#FFD166'  // Sahara: Warm Desert Gold
    };

    activeRoutes.forEach(ep => {
        if (epId === 'all' || ep.id === epId) {
            const epStops = activeStops.filter(s => s.episode === ep.id);
            const coords = epStops.map(s => s.coords);
            const color = routeColors[ep.id] || ep.color;

            // 1. GLOWING UNDERLAY PATH (HIGHLIGHT EFFECT)
            const underlayPath = L.polyline(coords, {
                color: color,
                weight: epId === 'all' ? 7 : 9,
                opacity: 0.45,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(activeMap);

            // 2. SHARP HIGHLIGHTED TOP PATH (THE ACTUAL ROAD)
            const highlightedPath = L.polyline(coords, {
                color: '#ffffff',
                weight: epId === 'all' ? 3 : 4,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(activeMap);

            // 3. COLOR CORE LINE
            const coreColorPath = L.polyline(coords, {
                color: color,
                weight: epId === 'all' ? 2 : 3,
                opacity: 1.0,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(activeMap);

            currentHighlightedPolylines.push(underlayPath, highlightedPath, coreColorPath);

            // MARKERS FOR EACH STOP
            epStops.forEach((stop, idx) => {
                bounds.push(stop.coords);

                // Distinct Pin Badge with number
                const markerHtml = `
                    <div class="custom-map-marker" style="
                        background-color: ${color};
                        color: #0c0b0a;
                        font-weight: 900;
                        font-size: 11px;
                        width: 28px;
                        height: 28px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border: 2px solid #ffffff;
                        box-shadow: 0 0 12px ${color}, 0 4px 10px rgba(0,0,0,0.9);
                        cursor: pointer;
                        transition: transform 0.2s;
                    ">
                        ${idx + 1}
                    </div>
                `;

                const customIcon = L.divIcon({
                    className: 'custom-icon-wrapper',
                    html: markerHtml,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                });

                const marker = L.marker(stop.coords, { icon: customIcon }).addTo(activeMap);

                // Information Popup on Click with Real Photo & 3D Zoom button
                const popupHtml = `
                    <div style="min-width: 230px; text-align: right; direction: rtl; padding: 6px; font-family: 'Tajawal', sans-serif;">
                        <div style="position: relative; height: 110px; border-radius: 8px; overflow: hidden; margin-bottom: 6px;">
                            <img src="${stop.image}" style="width: 100%; height: 100%; object-fit: cover;">
                            <span style="position: absolute; top: 4px; right: 4px; background: rgba(12,11,10,0.85); color: ${color}; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 5px; border: 1px solid ${color};">
                                الحلقة ${ep.id} • ${stop.name}
                            </span>
                        </div>
                        <h4 style="font-size: 16px; font-weight: 900; margin: 2px 0 4px 0; color: #fff;">${stop.full_name || stop.name}</h4>
                        <div style="font-size: 11px; color: #D4A373; margin-bottom: 3px;"><strong>تحدي الحرفة:</strong> «${stop.craft_challenge}»</div>
                        <div style="font-size: 11px; color: #52c41a; margin-bottom: 6px;"><strong>تحدي المعلم:</strong> «${stop.hist_challenge}»</div>
                        <button type="button" onclick="zoomToStopAnd3D(${stop.id})" style="width: 100%; padding: 7px; background: linear-gradient(to left, #D4A373, #C8A951); color: #0c0b0a; border: none; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
                            <span>استكشاف الموقع والمجسم 3D</span>
                        </button>
                    </div>
                `;

                marker.bindPopup(popupHtml);

                // Direct click zooms in and opens 3D
                marker.on('click', () => {
                    zoomToStopAnd3D(stop.id);
                });

                currentMarkers.push(marker);
            });
        }
    });

    // Fit map bounds
    if (bounds.length > 0) {
        activeMap.fitBounds(bounds, { padding: [45, 45], maxZoom: epId === 'all' ? 6 : 9 });
    }

    // Update banner text
    const bannerTitle = document.getElementById('route-banner-title');
    const bannerRoads = document.getElementById('route-banner-roads');

    if (epId === 'all') {
        if (bannerTitle) bannerTitle.textContent = 'المسار الإجمالي: 35 نقطة ربط عبر المغرب';
        if (bannerRoads) bannerRoads.textContent = 'الطرق الوطنية N1, N2, N6, N9, N10, N13 والطرق الجهوية R307, R106 (0 أوطوروت)';
    } else {
        const ep = activeRoutes.find(e => e.id === epId);
        if (bannerTitle && ep) bannerTitle.textContent = ep.title;
        if (bannerRoads && ep) bannerRoads.textContent = `المسارات المعتمدة: ${ep.roads}`;
    }
};

window.resetMapZoom = function() {
    window.selectEpisode(1);
};
