/* =========================================================
   星GN · 游戏手札 — front-end
   Data: Supabase > localStorage cache > bundled snapshot (data.js)
   ========================================================= */
(function () {
  "use strict";

  const EMBEDDED = window.GN_DATA;
  if (!EMBEDDED) return;

  const dims = EMBEDDED.dims;

  /* ---------- supabase config (same as the classic index page) ---------- */
  const SUPABASE_URL = "https://vgdralqjppxshwbqqzum.supabase.co";
  const SUPABASE_KEY = "sb_publishable_f76ssYCjHRIlQ5TnP3VqKA_hjoX-NhS";
  const STORAGE_KEY = "starGN_games";
  const STORAGE_TIME = "starGN_synced_at";

  const TAG_COLORS = {
    "夯": "#f2c14e",
    "顶级": "#ff7a7a",
    "人上人": "#a78bfa",
    "NPC": "#60a5fa",
    "拉": "#34d399",
    "拉完了": "#c4a35a"
  };
  const TAG_ORDER = ["夯", "顶级", "人上人", "NPC", "拉", "拉完了"];

  const DIM_COLOR = {
    craft: "#f2c14e",
    content: "#f59e6b",
    gameplay: "#ff6f91",
    story: "#a78bfa",
    immersion: "#60a5fa",
    art: "#34d399",
    audio: "#22d3ee",
    love: "#fb7185"
  };

  const RADAR_LABEL = {
    craft: "制作水准",
    content: "内容饱满",
    gameplay: "游戏性",
    story: "故事性",
    immersion: "代入感",
    art: "美术",
    audio: "视听",
    love: "爱之力"
  };

  const STATUS = {
    live: { text: "数据库实时", tip: "已连接数据库，显示最新数据" },
    cache: { text: "本地缓存", tip: "数据库连接失败，显示上次同步的本地缓存" },
    static: { text: "静态快照", tip: "数据库连接失败，显示内置 data.js 快照" }
  };

  /* ---------- helpers ---------- */
  const fmt = (v, d = 2) => {
    if (v == null || Number.isNaN(Number(v))) return "—";
    const p = Math.pow(10, d);
    return (Math.round((Number(v) + 1e-9) * p) / p).toFixed(d);
  };
  const pad2 = (n) => String(n).padStart(2, "0");
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));

  function hashHue(str) {
    let h = 0;
    for (const ch of String(str)) h = (h * 31 + ch.codePointAt(0)) % 360;
    return h;
  }

  function placeholder(name) {
    const palettes = [
      ["#2c2452", "#100d1d"],
      ["#123441", "#0a1418"],
      ["#3a2a16", "#171008"],
      ["#2b1a3e", "#120d1a"],
      ["#1b2b4d", "#0b1220"]
    ];
    const p = palettes[hashHue(name) % palettes.length];
    return `radial-gradient(130% 130% at 18% 6%, ${p[0]} 0%, ${p[1]} 68%)`;
  }

  function initialOf(name) {
    const ch = String(name).trim()[0] || "?";
    return /[a-zA-Z]/.test(ch) ? ch.toUpperCase() : ch;
  }

  function tagPill(tag) {
    const c = TAG_COLORS[tag] || "#60a5fa";
    return `<span class="tag-pill" data-tag="${esc(tag)}" style="--tag-c:${c}">${esc(tag)}</span>`;
  }

  function coverImg(g, poster) {
    const src = poster ? g.thumb || g.cover : g.cover || g.thumb;
    if (!src) return "";
    const fallback = poster ? g.cover || "" : g.thumb || "";
    return `<img src="${esc(src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"
      data-alt="${esc(fallback)}"
      onerror="if(this.dataset.alt){this.src=this.dataset.alt;this.dataset.alt='';}else{this.remove();}">`;
  }

  function parseHours(str) {
    const m = String(str || "").match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : null;
  }

  const reduceMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function toNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function splitTags(v) {
    if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
    if (!v) return [];
    return String(v).split("/").map((s) => s.trim()).filter(Boolean);
  }

  /* ---------- data normalization (Supabase / cache / data.js) ---------- */
  function normalizeRows(rows) {
    return (rows || []).map((x, i) => {
      if (!x || !x.name) return null;
      const dimsRaw = Array.isArray(x.dims)
        ? x.dims
        : typeof x.dims === "string" ? safeJson(x.dims, []) : [];
      const subsRaw = x.sub_dims || x.subDims || x.subs || [];
      const d8 = Array.from({ length: 8 }, (_, k) => toNum(dimsRaw[k]));
      const subs = Array.from({ length: 8 }, (_, k) => {
        const group = Array.isArray(subsRaw[k]) ? subsRaw[k] : subsRaw[k] != null ? [subsRaw[k]] : [];
        return group.map(toNum).filter((v) => v != null);
      });
      return {
        id: toNum(x.id) != null ? toNum(x.id) : i + 1,
        name: String(x.name).trim(),
        score: toNum(x.score) != null ? toNum(x.score) : 0,
        tag: x.tag || "NPC",
        dims: d8.map((v) => (v == null ? 0 : v)),
        subs,
        cover: x.cover || "",
        thumb: x.cover_thumb || x.coverThumb || x.thumb || x.cover || "",
        desc: String(x.description || x.desc || "").trim(),
        genre: splitTags(x.genre),
        playtime: String(x.playtime || "").trim(),
        developer: String(x.developer || "").trim(),
        year: toNum(x.release_year) != null ? toNum(x.release_year) : toNum(x.year),
        platform: splitTags(x.platform)
      };
    }).filter(Boolean);
  }

  function safeJson(str, fallback) {
    try { return JSON.parse(str); } catch (e) { return fallback; }
  }

  function computeStats(list) {
    const scores = list.map((g) => g.score);
    const counts = {};
    TAG_ORDER.forEach((t) => { counts[t] = 0; });
    list.forEach((g) => { counts[g.tag] = (counts[g.tag] || 0) + 1; });
    const ranked = list.slice().sort((a, b) => b.score - a.score || a.id - b.id);
    return {
      count: list.length,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      max: Math.max.apply(null, scores),
      min: Math.min.apply(null, scores),
      top: ranked[0] ? ranked[0].name : "",
      tagCounts: counts
    };
  }

  function computeDimAvg(list) {
    const avg = {};
    dims.forEach((d, i) => {
      const vals = list.map((g) => g.dims[i]).filter((v) => v != null && !Number.isNaN(v));
      avg[d.key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    });
    return avg;
  }

  const DIM_KEYS = dims.map((d) => d.key);

  /* ---------- dom ---------- */
  const $ = (sel) => document.querySelector(sel);
  const board = $("#board");
  const emptyEl = $("#empty");
  const searchEl = $("#search");
  const sortSelect = $("#sortSelect");
  const countEl = $("#resultCount");
  const hdrCountEl = $("#hdrCount");
  const dataStatusEl = $("#dataStatus");
  const genDateEl = $("#genDate");
  const tierChips = $("#tierChips");
  const filterBanner = $("#filterBanner");
  const filterName = $("#filterName");
  const heroFeature = $("#heroFeature");
  const drawer = $("#drawer");
  const drawerScroll = $("#drawerScroll");
  const backdrop = $("#backdrop");
  const header = $("#siteHeader");

  const state = { q: "", tier: null, tag: null, sort: "id-asc", view: "list" };
  let games = [];
  let byId = new Map();
  let stats = { count: 0, avg: 0, max: 0, tagCounts: {}, top: "" };
  let dimAvg = {};
  let dataMode = "static";
  let observer = null;
  let lastFocus = null;
  let lastRandom = null;
  let deepLinkDone = false;

  /* ---------- header ---------- */
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 16);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- data status ---------- */
  function updateStatus(mode, time) {
    dataMode = mode;
    const cfg = STATUS[mode] || STATUS.static;
    if (dataStatusEl) {
      dataStatusEl.textContent = cfg.text;
      dataStatusEl.className = "data-status is-" + mode;
      dataStatusEl.title = cfg.tip;
    }
    if (genDateEl && time != null) genDateEl.textContent = formatTime(time);
    if (hdrCountEl) hdrCountEl.textContent = String(games.length);
  }

  function formatTime(v) {
    if (v == null || v === "") return "—";
    if (typeof v === "number") {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return String(v);
  }

  /* ---------- load pipeline ---------- */
  function applyData(rows, mode, time) {
    const list = normalizeRows(rows);
    if (!list.length) return false;
    games = list;
    const ranked = games.slice().sort((a, b) => b.score - a.score || a.id - b.id);
    ranked.forEach((g, i) => { g.rank = i + 1; });
    byId = new Map(games.map((g) => [g.id, g]));
    stats = computeStats(games);
    dimAvg = computeDimAvg(games);

    updateStatus(mode, time);
    renderHero();
    renderTierChips();
    updateFilterUI();
    renderBoard();

    if (!deepLinkDone) {
      const m = /#game-(\d+)/.exec(location.hash);
      if (m && byId.has(Number(m[1]))) {
        deepLinkDone = true;
        window.setTimeout(() => openGame(Number(m[1])), 120);
      }
    }
    return true;
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return Array.isArray(data) && data.length ? data : null;
    } catch (e) { return null; }
  }

  function readCacheTime() {
    try { return Number(localStorage.getItem(STORAGE_TIME) || 0) || null; } catch (e) { return null; }
  }

  function writeCache(rows) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
      localStorage.setItem(STORAGE_TIME, String(Date.now()));
    } catch (e) { /* ignore quota / file:// limits */ }
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("请求超时")), ms))
    ]);
  }

  function ensureSupabase() {
    if (window.supabase) return Promise.resolve(true);
    return new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      s.async = true;
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };
      s.onload = () => finish(!!window.supabase);
      s.onerror = () => finish(false);
      document.head.appendChild(s);
      setTimeout(() => finish(!!window.supabase), 6500);
    });
  }

  let supabaseClient = null;
  function getClient() {
    if (!window.supabase) return null;
    if (!supabaseClient) supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return supabaseClient;
  }

  async function fetchLiveGames() {
    const client = getClient();
    if (!client) return null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const { data, error } = await withTimeout(
          client.from("games").select("*").order("id", { ascending: true }),
          7000
        );
        if (error) throw error;
        return data || null;
      } catch (e) {
        if (attempt < 2) await new Promise((r) => setTimeout(r, 900));
      }
    }
    return null;
  }

  async function bootLive() {
    const ready = await ensureSupabase();
    if (!ready) return;
    const live = await fetchLiveGames();
    if (live && live.length) {
      if (applyData(live, "live", Date.now())) writeCache(live);
    }
  }

  /* ---------- hero ---------- */
  function renderHero() {
    if (!games.length) return;
    const g = games.slice().sort((a, b) => b.score - a.score || a.id - b.id)[0];
    const bars = dims
      .map((d, i) => {
        const v = g.dims[i];
        return `<div class="fbar" title="${esc(d.label)} ${fmt(v)}">
          <span>${esc(d.short)}</span>
          <i style="--w:${(v * 10).toFixed(1)}%;--c:${DIM_COLOR[d.key]}"></i>
        </div>`;
      })
      .join("");

    heroFeature.innerHTML = `
      <div class="feature-media" style="background:${placeholder(g.name)}">
        ${coverImg(g)}
      </div>
      <div class="feature-top">
        <span class="feature-badge">TOP 01 · 最高分</span>
        <span class="feature-year">${esc(g.tag)} · ${fmt(g.score)}</span>
      </div>
      <div class="feature-body">
        <div class="feature-score-row">
          <div>
            <p class="feature-sub" style="margin-bottom:6px">${esc(g.year)} · ${esc(g.developer)}</p>
            <h2 class="feature-name">${esc(g.name)}</h2>
          </div>
          <div class="feature-score">${fmt(g.score)}<small>/10</small></div>
        </div>
        <p class="feature-desc">${esc(g.desc)}</p>
        <div class="feature-bars">${bars}</div>
        <button class="feature-cta" type="button" data-open="${g.id}">
          查看完整评分
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h13M13 6l6 6-6 6"/></svg>
        </button>
      </div>`;

    heroFeature.querySelector("[data-open]").addEventListener("click", (e) => {
      openGame(Number(e.currentTarget.dataset.open));
    });
  }

  /* ---------- sort ---------- */
  function renderSort() {
    sortSelect.innerHTML = `
      <optgroup label="顺序">
        <option value="id-asc">默认顺序</option>
      </optgroup>
      <optgroup label="评分">
        <option value="score-desc">总分 · 高到低</option>
        <option value="score-asc">总分 · 低到高</option>
      </optgroup>
      <optgroup label="单个维度">
        ${dims.map((d) => `<option value="dim:${d.key}">${esc(d.label)}</option>`).join("")}
      </optgroup>
      <optgroup label="其他">
        <option value="playtime-asc">通关时长 · 短到长</option>
        <option value="year-desc">发售年份 · 新到旧</option>
        <option value="year-asc">发售年份 · 旧到新</option>
      </optgroup>`;
    sortSelect.value = state.sort;
  }

  sortSelect.addEventListener("change", () => {
    state.sort = sortSelect.value;
    renderBoard();
  });

  /* ---------- tier chips ---------- */
  function renderTierChips() {
    const counts = stats.tagCounts || {};
    const all = `<button type="button" class="tier-chip${!state.tier && !state.tag ? " is-active" : ""}" data-tier="">
        <span class="tier-dot" style="--c:#c7d5f3"></span>全部<b>${games.length}</b></button>`;
    const rest = TAG_ORDER.map((t) => {
      const c = TAG_COLORS[t];
      return `<button type="button" class="tier-chip${state.tier === t ? " is-active" : ""}" data-tier="${esc(t)}"
          style="--c:${c}"><span class="tier-dot"></span>${esc(t)}<b>${counts[t] || 0}</b></button>`;
    }).join("");
    tierChips.innerHTML = all + rest;
  }

  tierChips.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tier]");
    if (!btn) return;
    state.tier = btn.dataset.tier || null;
    state.tag = null;
    renderTierChips();
    updateFilterUI();
    renderBoard();
  });

  function updateFilterUI() {
    const active = state.tier || state.tag;
    filterBanner.classList.toggle("show", !!active);
    if (active) {
      filterName.textContent = state.tier ? `档位 · ${state.tier}` : state.tag;
    }
  }

  function clearFilters() {
    state.tier = null;
    state.tag = null;
    renderTierChips();
    updateFilterUI();
    renderBoard();
  }

  $("#clearFilter").addEventListener("click", clearFilters);

  function applyTagFilter(tag) {
    if (!tag) return;
    if (TAG_ORDER.indexOf(tag) >= 0) {
      state.tier = tag;
      state.tag = null;
    } else {
      state.tag = tag;
      state.tier = null;
    }
    renderTierChips();
    updateFilterUI();
    renderBoard();
    const el = document.getElementById("ranking");
    if (el) window.scrollTo({ top: el.offsetTop - 90, behavior: reduceMotion() ? "auto" : "smooth" });
  }

  /* ---------- filtering / sorting ---------- */
  function tokensOf(g) {
    return [
      g.tag,
      g.developer,
      String(g.year || ""),
      g.playtime,
      ...g.genre,
      ...g.platform
    ].filter(Boolean);
  }

  function currentList() {
    const q = state.q.trim().toLowerCase();
    let list = games.filter((g) => {
      if (state.tier && g.tag !== state.tier) return false;
      if (state.tag && !tokensOf(g).includes(state.tag)) return false;
      if (!q) return true;
      if (g.name.toLowerCase().includes(q)) return true;
      return tokensOf(g).some((t) => String(t).toLowerCase().includes(q));
    });

    const s = state.sort;
    const byScore = (a, b) => b.score - a.score || a.id - b.id;
    if (s === "score-asc") list.sort((a, b) => a.score - b.score || a.id - b.id);
    else if (s === "id-asc") list.sort((a, b) => a.id - b.id);
    else if (s === "playtime-asc") {
      list.sort((a, b) => {
        const ha = parseHours(a.playtime);
        const hb = parseHours(b.playtime);
        if (ha === null && hb === null) return byScore(a, b);
        if (ha === null) return 1;
        if (hb === null) return -1;
        return ha - hb || byScore(a, b);
      });
    } else if (s === "year-desc") {
      list.sort((a, b) => (b.year || 0) - (a.year || 0) || byScore(a, b));
    } else if (s === "year-asc") {
      list.sort((a, b) => (a.year || 9999) - (b.year || 9999) || byScore(a, b));
    } else if (s.startsWith("dim:")) {
      const key = s.slice(4);
      const idx = dims.findIndex((d) => d.key === key);
      if (idx >= 0) {
        list.sort((a, b) => (b.dims[idx] || 0) - (a.dims[idx] || 0) || byScore(a, b));
      } else {
        list.sort(byScore);
      }
    } else {
      list.sort(byScore);
    }
    return list;
  }

  /* ---------- rows ---------- */
  function rowHTML(g, i) {
    const scoreOrder = state.sort === "score-desc";
    const topClass = scoreOrder && i < 3 ? ` top top-${i + 1}` : "";
    const strip = dims
      .map((d, di) => {
        const v = g.dims[di] || 0;
        return `<i style="--h:${Math.max(10, v * 10).toFixed(1)}%;--c:${DIM_COLOR[d.key]}" title="${esc(d.label)} ${fmt(v)}"></i>`;
      })
      .join("");

    const meta = [
      g.year ? `<span class="meta-i">${g.year}</span>` : "",
      g.platform.length ? `<span class="meta-i">${esc(g.platform.join(" / "))}</span>` : "",
      g.playtime ? `<span class="meta-i">${esc(g.playtime)}</span>` : "",
      g.genre.length ? `<span class="meta-i meta-genre">${esc(g.genre.slice(0, 3).join(" / "))}</span>` : ""
    ].filter(Boolean).join("");

    return `
      <article class="rank-row${topClass}" data-id="${g.id}" data-tag="${esc(g.tag)}" tabindex="0" role="button"
        aria-label="查看 ${esc(g.name)} 的详情" style="transition-delay:${Math.min(i, 12) * 16}ms">
        <span class="rank-no" title="第 ${i + 1} 项 · 总榜第 ${g.rank} 名">${pad2(i + 1)}</span>
        <div class="thumb" style="--ph:${placeholder(g.name)}">
          <span class="ph">${esc(initialOf(g.name))}</span>
          ${coverImg(g, state.view === "grid")}
        </div>
        <div class="row-main">
          <div class="row-title">
            <span class="row-name">${esc(g.name)}</span>
            ${tagPill(g.tag)}
          </div>
          <div class="row-meta">${meta}</div>
        </div>
        <div class="dim-strip" title="八维评分">${strip}</div>
        <div class="total-cell" style="--tag-c:${TAG_COLORS[g.tag] || "#60a5fa"}" title="${esc(g.tag)} · 总分 ${fmt(g.score)}">
          <span class="total-num">${fmt(g.score)}</span>
          <span class="total-cap">TOTAL</span>
        </div>
      </article>`;
  }

  function renderBoard() {
    const list = currentList();
    board.classList.toggle("grid", state.view === "grid");
    board.innerHTML = list.map(rowHTML).join("");
    countEl.textContent = String(list.length);
    emptyEl.hidden = list.length !== 0;

    if (observer) observer.disconnect();
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.05, rootMargin: "0px 0px -40px 0px" }
      );
      board.querySelectorAll(".rank-row").forEach((el) => observer.observe(el));
    } else {
      board.querySelectorAll(".rank-row").forEach((el) => el.classList.add("is-in"));
    }
  }

  board.addEventListener("click", (e) => {
    const pill = e.target.closest(".tag-pill");
    if (pill) {
      e.stopPropagation();
      applyTagFilter(pill.dataset.tag);
      return;
    }
    const row = e.target.closest(".rank-row");
    if (row) openGame(Number(row.dataset.id));
  });

  board.addEventListener("keydown", (e) => {
    const row = e.target.closest(".rank-row");
    if (!row) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openGame(Number(row.dataset.id));
    }
  });

  /* ---------- search ---------- */
  let searchTimer = null;
  searchEl.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = searchEl.value;
      renderBoard();
    }, 110);
  });

  $("#clearSearch").addEventListener("click", () => {
    searchEl.value = "";
    state.q = "";
    renderBoard();
    searchEl.focus();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== searchEl) {
      const tag = (document.activeElement && document.activeElement.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      searchEl.focus();
      searchEl.select();
    }
    if (e.key === "Escape" && drawer.classList.contains("is-open")) closeGame();
  });

  /* ---------- view toggle ---------- */
  document.querySelectorAll(".view-toggle button").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.view = btn.dataset.view;
      document.querySelectorAll(".view-toggle button").forEach((b) => {
        const on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
      renderBoard();
    });
  });

  /* ---------- radar ---------- */
  function radarSVG(g) {
    const w = 480;
    const h = 440;
    const cx = 240;
    const cy = 214;
    const R = 136;
    const n = dims.length;
    const angle = (i) => ((-90 + i * (360 / n)) * Math.PI) / 180;
    const point = (i, v) => [
      cx + Math.cos(angle(i)) * R * (v / 10),
      cy + Math.sin(angle(i)) * R * (v / 10)
    ];
    const poly = (vals, extra = "") => {
      const pts = vals.map((v, i) => point(i, v).map((x) => x.toFixed(1)).join(",")).join(" ");
      return `<polygon points="${pts}" ${extra}/>`;
    };

    const ringVals = [2, 4, 6, 8, 10];
    const rings = ringVals
      .map((v) => `<polygon points="${dims.map((_, i) => point(i, v).map((x) => x.toFixed(1)).join(",")).join(" ")}" class="radar-grid"/>`)
      .join("");
    const axes = dims
      .map((_, i) => {
        const [x, y] = point(i, 10);
        return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="radar-axis"/>`;
      })
      .join("");
    const ticks = ringVals
      .map((v) => `<text x="${cx + 6}" y="${(cy - (R * v) / 10 + 3).toFixed(1)}" class="radar-tick">${v}</text>`)
      .join("");
    const labels = dims
      .map((d, i) => {
        const a = angle(i);
        const r = R + 32;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        const cos = Math.cos(a);
        const anchor = cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle";
        const dy = Math.sin(a) > 0.7 ? 12 : Math.sin(a) < -0.7 ? -3 : 5;
        return `<text x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${anchor}" class="radar-label">${esc(RADAR_LABEL[d.key])}</text>`;
      })
      .join("");
    const current = dims.map((d, i) => g.dims[i] || 0);
    const avg = dims.map((d) => dimAvg[d.key] || 0);
    const dots = dims
      .map((d, i) => {
        const [x, y] = point(i, g.dims[i] || 0);
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" class="radar-dot"/>`;
      })
      .join("");

    return `
      <svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(g.name)} 的八维评分雷达图">
        ${rings}${axes}${ticks}
        ${poly(avg, 'fill="rgba(96,165,250,.16)" stroke="#60a5fa" stroke-width="1.8" stroke-linejoin="round"')}
        ${poly(current, 'fill="rgba(242,193,78,.22)" stroke="#f2c14e" stroke-width="2.4" stroke-linejoin="round"')}
        ${dots}
        ${labels}
      </svg>`;
  }

  /* ---------- drawer ---------- */
  function ringSVG(total) {
    const pct = Math.max(0, Math.min(100, total * 10));
    return `
      <div class="ring" style="--accent:${total >= 9 ? "#f2c14e" : "#8b7dff"}">
        <svg viewBox="0 0 132 132">
          <circle class="track" cx="66" cy="66" r="56"/>
          <circle class="val" cx="66" cy="66" r="56" pathLength="100" stroke-dasharray="${pct.toFixed(2)} 100"/>
        </svg>
        <div class="ring-label"><b>${fmt(total)}</b><span>TOTAL</span></div>
      </div>`;
  }

  function drawerHTML(g) {
    const total = g.score;
    const diff = total - stats.avg;

    const genreChips = g.genre
      .map((t) => `<button type="button" class="genre-chip" data-tag="${esc(t)}">${esc(t)}</button>`)
      .join("");

    const breakdown = dims
      .map((d, i) => {
        const v = g.dims[i] || 0;
        const color = DIM_COLOR[d.key];
        const subs = d.subs.length
          ? `<p class="tile-sub">${d.subs
              .map(([k, label], si) => `${esc(label)} <b>${fmt(g.subs[i][si], 1)}</b>`)
              .join(" · ")}</p>`
          : "";
        return `
          <div class="dim-tile" style="--c:${color}">
            <div class="tile-head">
              <span class="tile-name">${esc(d.label)}</span>
              <span class="tile-score">${fmt(v)}</span>
            </div>
            <div class="tile-bar"><i style="--w:${(v * 10).toFixed(1)}%"></i></div>
            ${subs}
          </div>`;
      })
      .join("");

    return `
      <div class="dbanner" style="--ph:${placeholder(g.name)}">
        ${coverImg(g)}
        <div class="dbanner-body">
          <div class="dbanner-top">
            <span class="drank">总榜 NO.${pad2(g.rank)}</span>
            <span class="tag-pill" data-tag="${esc(g.tag)}" style="--tag-c:${TAG_COLORS[g.tag] || "#60a5fa"}">${esc(g.tag)}</span>
          </div>
          <h2 class="dname" id="drawerTitle">${esc(g.name)}</h2>
          <p class="dsub">
            <span>${esc(g.year || "—")}</span>
            <span>${esc(g.developer || "—")}</span>
            <span>${esc(g.playtime || "时长未记录")}</span>
          </p>
        </div>
      </div>
      <div class="dbody">
        <div class="dhero-stats">
          ${ringSVG(total)}
          <div class="dsummary">
            <span class="dsummary-head">SCORE SUMMARY</span>
            <p>总榜第 <b style="color:var(--gold)">${g.rank}</b> 名 / 共 ${games.length} 款。总分 ${fmt(total)}，比全站平均分 ${fmt(stats.avg)} ${diff >= 0 ? "高" : "低"} ${fmt(Math.abs(diff))} 分。</p>
          </div>
        </div>

        ${g.desc ? `<p class="ddesc">${esc(g.desc)}</p>` : ""}

        <div class="dmeta">
          <div class="dmeta-item">
            <span>类型</span>
            <div class="genre-chips">${genreChips}</div>
          </div>
          <div class="dmeta-item"><span>平台</span><p>${esc(g.platform.join(" / ") || "—")}</p></div>
          <div class="dmeta-item"><span>发售</span><p>${esc(g.year || "—")}</p></div>
          <div class="dmeta-item"><span>通关时长</span><p>${esc(g.playtime || "—")}</p></div>
          <div class="dmeta-item"><span>开发商</span><p>${esc(g.developer || "—")}</p></div>
        </div>

        <div class="dblocks">
          <div>
            <p class="dblock-title">八维雷达 · RADAR</p>
            <div class="radar-wrap">${radarSVG(g)}</div>
            <div class="radar-legend">
              <span><i class="lg-current"></i>本作</span>
              <span><i class="lg-avg"></i>全站均分</span>
            </div>
          </div>
          <div>
            <p class="dblock-title">评分明细 · BREAKDOWN</p>
            <div class="dim-tiles">${breakdown}</div>
          </div>
        </div>
      </div>`;
  }

  function openGame(id) {
    const g = byId.get(id);
    if (!g) return;
    lastFocus = document.activeElement;
    drawerScroll.innerHTML = drawerHTML(g);
    drawerScroll.scrollTop = 0;
    backdrop.hidden = false;
    drawer.inert = false;
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    void drawer.offsetWidth;
    void backdrop.offsetWidth;
    drawer.classList.add("is-open");
    backdrop.classList.add("is-open");
    const closeBtn = drawer.querySelector(".dclose");
    if (closeBtn) closeBtn.focus({ preventScroll: true });

    try { history.replaceState(null, "", "#game-" + id); } catch (err) { /* file:// may refuse */ }
  }

  function closeGame() {
    if (!drawer.classList.contains("is-open")) return;
    drawer.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    drawer.inert = true;
    document.body.classList.remove("is-locked");
    window.setTimeout(() => {
      if (!drawer.classList.contains("is-open")) backdrop.hidden = true;
    }, 400);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    try { history.replaceState(null, "", location.pathname + location.search); } catch (err) { /* ignore */ }
  }

  backdrop.addEventListener("click", closeGame);
  drawer.querySelector(".dclose").addEventListener("click", closeGame);

  drawerScroll.addEventListener("click", (e) => {
    const tagEl = e.target.closest("[data-tag]");
    if (tagEl) {
      const t = tagEl.dataset.tag;
      closeGame();
      applyTagFilter(t);
    }
  });

  /* ---------- random ---------- */
  const randomBtn = $("#randomBtn");

  function starBurst() {
    if (reduceMotion()) return;
    const wrap = document.createElement("div");
    wrap.className = "star-burst";
    wrap.setAttribute("aria-hidden", "true");
    const colors = ["#ffe9b0", "#f2c14e", "#a9c1ff", "#ffffff"];
    const ring = document.createElement("span");
    ring.className = "burst-ring";
    wrap.appendChild(ring);
    for (let i = 0; i < 34; i++) {
      const p = document.createElement("i");
      const ang = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 240;
      p.style.setProperty("--tx", (Math.cos(ang) * dist).toFixed(1) + "px");
      p.style.setProperty("--ty", (Math.sin(ang) * dist).toFixed(1) + "px");
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = (Math.random() * 140).toFixed(0) + "ms";
      const size = 2 + Math.random() * 4;
      p.style.width = size.toFixed(1) + "px";
      p.style.height = size.toFixed(1) + "px";
      wrap.appendChild(p);
    }
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 1500);
  }

  randomBtn.addEventListener("click", () => {
    if (!games.length) return;
    let g = games[Math.floor(Math.random() * games.length)];
    if (games.length > 1) {
      let guard = 0;
      while (g.id === lastRandom && guard++ < 12) {
        g = games[Math.floor(Math.random() * games.length)];
      }
    }
    lastRandom = g.id;
    starBurst();
    setTimeout(() => openGame(g.id), reduceMotion() ? 0 : 320);
  });

  /* ---------- starfield ---------- */
  (function starfield() {
    const canvas = document.getElementById("starfield");
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    const reduce = reduceMotion();
    const COLORS = ["#ffffff", "#dce8ff", "#ffe9b0", "#bcd4ff", "#e6d9ff"];
    let w = 0, h = 0, dpr = 1;
    let stars = [];
    let shoots = [];
    let raf = 0;
    let lastSpawn = 0;
    let nextSpawn = 3500;

    function build() {
      const count = Math.min(260, Math.max(90, Math.round((w * h) / 9000)));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.4 + Math.random() * 1.15,
        base: 0.16 + Math.random() * 0.55,
        speed: 0.00035 + Math.random() * 0.0011,
        phase: Math.random() * Math.PI * 2,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        cross: Math.random() < 0.06
      }));
      shoots = [];
    }

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      if (reduce) draw(0);
    }

    function spawnShoot() {
      shoots.push({
        x: w * (0.25 + Math.random() * 0.65),
        y: h * (0.02 + Math.random() * 0.3),
        vx: -(2.2 + Math.random() * 2.2),
        vy: 1.1 + Math.random() * 1.1,
        life: 0,
        max: 680 + Math.random() * 420,
        len: 70 + Math.random() * 90,
        last: 0
      });
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        const tw = 0.55 + 0.45 * Math.sin(t * s.speed + s.phase);
        ctx.globalAlpha = Math.min(1, s.base * tw);
        ctx.fillStyle = s.c;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.cross) {
          ctx.globalAlpha *= 0.45;
          ctx.fillRect(s.x - s.r * 4, s.y - 0.3, s.r * 8, 0.6);
          ctx.fillRect(s.x - 0.3, s.y - s.r * 4, 0.6, s.r * 8);
        }
      }

      for (let i = shoots.length - 1; i >= 0; i--) {
        const s = shoots[i];
        const dt = s.last ? Math.min(50, t - s.last) : 16;
        s.last = t;
        s.x += s.vx * (dt / 16);
        s.y += s.vy * (dt / 16);
        s.life += dt;
        const p = s.life / s.max;
        if (p >= 1 || s.x < -240 || s.y > h + 240) {
          shoots.splice(i, 1);
          continue;
        }
        const a = Math.sin(Math.PI * p) * 0.75;
        const tx = s.x - s.vx * (s.len / 4);
        const ty = s.y - s.vy * (s.len / 4);
        const grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
        grad.addColorStop(0, `rgba(255,246,222,${a.toFixed(3)})`);
        grad.addColorStop(1, "rgba(255,246,222,0)");
        ctx.globalAlpha = 1;
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }

    function loop(t) {
      if (!reduce && t - lastSpawn > nextSpawn) {
        lastSpawn = t;
        nextSpawn = 5000 + Math.random() * 7000;
        spawnShoot();
      }
      draw(t);
      raf = requestAnimationFrame(loop);
    }

    function start() {
      cancelAnimationFrame(raf);
      if (reduce) {
        draw(0);
        return;
      }
      lastSpawn = performance.now();
      raf = requestAnimationFrame(loop);
    }

    resize();
    start();

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 160);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else start();
    });
  })();

  /* ---------- init ---------- */
  renderSort();

  const cached = readCache();
  const applied = applyData(cached || EMBEDDED.games, cached ? "cache" : "static", cached ? readCacheTime() : EMBEDDED.generatedAt);
  if (!applied) applyData(EMBEDDED.games, "static", EMBEDDED.generatedAt);
  bootLive();
})();
