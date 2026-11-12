"use strict";

// Game library: games the user adds themselves, stored as ArrayBuffers in
// IndexedDB on this device. The library ships empty and never downloads games.

const DB_NAME = "ejs-game-library";
const DB_STORE = "games";

// System ids are the values EmulatorJS accepts for EJS_core.
const SYSTEMS = {
    "psx": "PlayStation",
    "nes": "Nintendo Entertainment System",
    "snes": "Super Nintendo",
    "n64": "Nintendo 64",
    "gb": "Game Boy",
    "gba": "Game Boy Advance",
    "nds": "Nintendo DS",
    "3ds": "Nintendo 3DS",
    "vb": "Virtual Boy",
    "segaMD": "Sega Mega Drive / Genesis",
    "segaMS": "Sega Master System",
    "segaGG": "Sega Game Gear",
    "segaCD": "Sega CD",
    "sega32x": "Sega 32X",
    "segaSaturn": "Sega Saturn",
    "pce": "TurboGrafx-16 / PC Engine",
    "pcfx": "PC-FX",
    "ngp": "Neo Geo Pocket",
    "ws": "WonderSwan",
    "coleco": "ColecoVision",
    "vice_x64sc": "Commodore 64",
    "vice_x128": "Commodore 128",
    "vice_xvic": "Commodore VIC-20",
    "vice_xplus4": "Commodore Plus/4",
    "vice_xpet": "Commodore PET",
    "lynx": "Atari Lynx",
    "jaguar": "Atari Jaguar",
    "atari7800": "Atari 7800",
    "atari2600": "Atari 2600",
    "arcade": "Arcade",
    "puae": "Amiga",
    "ppsspp": "PlayStation Portable",
    "dosbox_pure": "DOS"
};

// File extension -> system id, for guessing the system when a game is added.
const EXT_TO_SYSTEM = {
    "bin": "psx", "cue": "psx", "img": "psx", "iso": "psx", "pbp": "psx", "chd": "psx", "mdf": "psx", "m3u": "psx",
    "nes": "nes", "fds": "nes", "unif": "nes", "unf": "nes",
    "smc": "snes", "sfc": "snes", "fig": "snes", "gd3": "snes", "gd7": "snes", "dx2": "snes", "bsx": "snes", "swc": "snes",
    "z64": "n64", "n64": "n64", "v64": "n64",
    "gb": "gb", "gbc": "gb",
    "gba": "gba",
    "nds": "nds",
    "3ds": "3ds", "cci": "3ds", "cia": "3ds", "cxi": "3ds", "app": "3ds",
    "vb": "vb", "vboy": "vb",
    "md": "segaMD", "smd": "segaMD", "gen": "segaMD", "sg": "segaMD",
    "sms": "segaMS",
    "gg": "segaGG",
    "pce": "pce",
    "ngp": "ngp", "ngc": "ngp",
    "ws": "ws", "wsc": "ws",
    "col": "coleco", "cv": "coleco",
    "d64": "vice_x64sc",
    "lnx": "lynx",
    "jag": "jaguar", "j64": "jaguar",
    "a26": "atari2600",
    "a78": "atari7800",
    "psp": "ppsspp"
};

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains(DB_STORE)) {
                req.result.createObjectStore(DB_STORE, { keyPath: "id", autoIncrement: true });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function dbAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

async function dbAdd(record) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(DB_STORE, "readwrite").objectStore(DB_STORE).add(record);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function dbDelete(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(DB_STORE, "readwrite").objectStore(DB_STORE).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const els = {
    list: document.getElementById("gameList"),
    empty: document.getElementById("emptyState"),
    addBtn: document.getElementById("addGameBtn"),
    addPanel: document.getElementById("addPanel"),
    file: document.getElementById("gameFile"),
    title: document.getElementById("gameTitle"),
    system: document.getElementById("gameSystem"),
    save: document.getElementById("saveGameBtn"),
    cancel: document.getElementById("cancelAddBtn"),
    error: document.getElementById("addError")
};

for (const [id, label] of Object.entries(SYSTEMS).sort((a, b) => a[1].localeCompare(b[1]))) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = label;
    els.system.appendChild(option);
}

function systemLabel(id) {
    return SYSTEMS[id] || id;
}

async function renderLibrary() {
    const games = await dbAll();
    games.sort((a, b) => systemLabel(a.system).localeCompare(systemLabel(b.system)) || a.title.localeCompare(b.title));
    els.list.innerHTML = "";
    els.empty.hidden = games.length > 0;
    for (const game of games) {
        const li = document.createElement("li");
        li.className = "lib-item";

        const main = document.createElement("button");
        main.type = "button";
        main.className = "lib-item-main";
        const title = document.createElement("span");
        title.className = "lib-item-title";
        title.textContent = game.title;
        const meta = document.createElement("span");
        meta.className = "lib-item-meta";
        meta.textContent = game.fileName + " · " + formatSize(game.size);
        main.appendChild(title);
        main.appendChild(meta);
        main.addEventListener("click", () => launch(game));

        const badge = document.createElement("span");
        badge.className = "lib-badge";
        badge.textContent = systemLabel(game.system);

        const play = document.createElement("button");
        play.type = "button";
        play.className = "lib-play";
        play.textContent = "Play";
        play.addEventListener("click", () => launch(game));

        const del = document.createElement("button");
        del.type = "button";
        del.className = "lib-delete";
        del.textContent = "Delete";
        del.addEventListener("click", async () => {
            if (!confirm("Remove \"" + game.title + "\" from the library?")) return;
            await dbDelete(game.id);
            renderLibrary();
        });

        li.appendChild(main);
        li.appendChild(badge);
        li.appendChild(play);
        li.appendChild(del);
        els.list.appendChild(li);
    }
}

function launch(game) {
    const blob = new Blob([game.data], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);

    document.getElementById("library").hidden = true;
    document.getElementById("player").hidden = false;

    window.EJS_player = "#game";
    window.EJS_gameName = game.title;
    window.EJS_gameUrl = url;
    window.EJS_core = game.system;
    // Emulator data (frontend + cores) is served from this same site, pinned
    // to the version in this repository - no CDN is involved.
    window.EJS_pathtodata = "data/";
    window.EJS_startOnLoaded = true;
    window.EJS_askBeforeExit = false;
    if (game.system === "psx") {
        // PlayStation Mouse on controller port 1: RetroArch libretro device 2.
        // Applies as a default; per-core settings saved later take precedence.
        window.EJS_defaultOptions = { "input_libretro_device_p1": "2" };
    }
    window.EJS_onExit = () => {
        window.location.reload();
    };

    const script = document.createElement("script");
    script.src = "data/loader.js";
    document.body.appendChild(script);
}

els.addBtn.addEventListener("click", () => {
    els.addPanel.hidden = false;
    els.addBtn.hidden = true;
});

els.cancel.addEventListener("click", () => {
    els.addPanel.hidden = true;
    els.addBtn.hidden = false;
    els.error.hidden = true;
    els.file.value = "";
    els.title.value = "";
});

els.file.addEventListener("change", () => {
    const file = els.file.files[0];
    if (!file) return;
    const parts = file.name.split(".");
    const ext = parts.length > 1 ? parts.pop().toLowerCase() : "";
    if (!els.title.value) {
        els.title.value = parts.join(".");
    }
    if (EXT_TO_SYSTEM[ext]) {
        els.system.value = EXT_TO_SYSTEM[ext];
    }
});

els.save.addEventListener("click", async () => {
    const file = els.file.files[0];
    els.error.hidden = true;
    if (!file) {
        els.error.textContent = "Pick a game file first.";
        els.error.hidden = false;
        return;
    }
    const title = els.title.value.trim() || file.name.replace(/\.[^.]*$/, "");
    els.save.disabled = true;
    try {
        const data = await file.arrayBuffer();
        await dbAdd({
            title: title,
            system: els.system.value,
            fileName: file.name,
            size: file.size,
            addedAt: Date.now(),
            data: data
        });
        els.file.value = "";
        els.title.value = "";
        els.addPanel.hidden = true;
        els.addBtn.hidden = false;
        await renderLibrary();
    } catch (e) {
        console.error(e);
        els.error.textContent = "Could not save the game: " + (e && e.message ? e.message : e);
        els.error.hidden = false;
    } finally {
        els.save.disabled = false;
    }
});

// Ask the browser to keep the library (and its games) from being evicted.
if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
}

renderLibrary().catch((e) => {
    console.error(e);
    els.empty.hidden = false;
    els.empty.textContent = "The library could not be opened: " + (e && e.message ? e.message : e);
});
