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

  const AWARDS = window.GN_AWARDS || null;
  const AWARD_COLORS = {
    goty: "#f2c14e",
    story: "#a78bfa",
    indie: "#34d399",
    jrpg: "#60a5fa",
    action: "#ff6f91",
    art: "#22d3ee"
  };

  function awardsForGame(gid) {
    if (!AWARDS || !Array.isArray(AWARDS.editions) || !Array.isArray(AWARDS.categories)) return [];
    const out = [];
    AWARDS.editions.forEach((ed) => {
      if (!ed || !ed.winners) return;
      Object.keys(ed.winners).forEach((key) => {
        if (Number(ed.winners[key]) !== Number(gid)) return;
        const cat = AWARDS.categories.find((c) => c.key === key);
        out.push({
          year: Number(ed.year),
          key,
          name: cat ? cat.name : key,
          original: cat ? cat.desc : key
        });
      });
    });
    return out;
  }

  function awardBadge(g, mode) {
    const awards = awardsForGame(g.id);
    if (!awards.length) return "";
    const years = Array.from(new Set(awards.map((a) => a.year)));
    const yearLabel = years.length === 1 ? String(years[0]) : years.join("/");
    const full = awards.map((a) => `${a.year} ${a.name}（${a.original}）`).join(" · ");
    if (mode === "ribbon") {
      const count = awards.length > 1 ? ` ×${awards.length}` : "";
      return `<span class="award-ribbon" title="${esc(full)}">★ ${esc(yearLabel)}${count}</span>`;
    }
    const label = awards.length === 1
      ? `${yearLabel} ${awards[0].name}`
      : `${yearLabel} ${awards.length === 2 ? "双奖" : `${awards.length} 项奖`}`;
    return `<span class="row-award" title="${esc(full)}"><span class="row-award-star">★</span>${esc(label)}</span>`;
  }

  function awardDrawerHTML(g) {
    const awards = awardsForGame(g.id);
    if (!awards.length) return "";
    return `<div class="dawards">${awards.map((a) => `
      <span class="daward">
        <span class="daward-star">★</span>
        <b>${esc(a.name)}</b>
        <em>${a.year} · ${esc(a.original)}</em>
      </span>`).join("")}</div>`;
  }

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

  function coverImg(g, poster, cls) {
    const src = poster ? g.thumb || g.cover : g.cover || g.thumb;
    if (!src) return "";
    const fallback = poster ? g.cover || "" : g.thumb || "";
    return `<img class="${cls || ""}" src="${esc(src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"
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
  const yearFilter = $("#yearFilter");
  const devFilter = $("#devFilter");
  const timeFilter = $("#timeFilter");
  const filterBanner = $("#filterBanner");
  const filterName = $("#filterName");
  const heroFeature = $("#heroFeature");
  const drawer = $("#drawer");
  const drawerScroll = $("#drawerScroll");
  const backdrop = $("#backdrop");
  const compareModal = $("#compareModal");
  const compareBackdrop = $("#compareBackdrop");
  const compareContent = $("#compareContent");
  const compareClose = $("#compareClose");
  const header = $("#siteHeader");

  const state = { q: "", tier: null, tag: null, year: null, dev: null, duration: null, sort: "id-asc", view: "list", awardYear: null, awardOnly: false };
  let games = [];
  let byId = new Map();
  let stats = { count: 0, avg: 0, max: 0, tagCounts: {}, top: "" };
  let dimAvg = {};
  let dataMode = "static";
  let voteCounts = new Map();
  let voteCountStatus = "loading";
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
    renderFilterSelects();
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

  async function loadVoteCounts() {
    const client = getClient();
    if (!client || !AWARDS) {
      voteCountStatus = "error";
      return;
    }
    try {
      const { data, error } = await withTimeout(
        client.from("vote_totals").select("*").eq("year", AWARDS.currentVoteYear),
        7000
      );
      if (error) throw error;
      const next = new Map();
      (data || []).forEach((row) => {
        next.set(`${row.category}|${Number(row.game_id)}`, Number(row.votes) || 0);
      });
      voteCounts = next;
      voteCountStatus = "ok";
    } catch (e) {
      voteCountStatus = "error";
    }
    renderHero();
  }

  async function bootLive() {
    const ready = await ensureSupabase();
    if (!ready) {
      voteCountStatus = "error";
      renderHero();
      return;
    }
    await loadVoteCounts();
    const live = await fetchLiveGames();
    if (live && live.length) {
      if (applyData(live, "live", Date.now())) writeCache(live);
    }
  }

  /* ---------- hero / awards carousel ---------- */
  function renderTopFeature() {
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

  function currentVoteTop(catKey) {
    let best = null;
    voteCounts.forEach((votes, key) => {
      const sep = key.indexOf("|");
      if (sep < 0) return;
      if (key.slice(0, sep) !== catKey) return;
      const g = byId.get(Number(key.slice(sep + 1)));
      if (!g) return;
      if (Number(g.year) !== Number(AWARDS.currentVoteYear)) return;
      if (!best || votes > best.votes || (votes === best.votes && g.score > best.g.score)) {
        best = { g, votes };
      }
    });
    return best;
  }

  function voteDeadline(year) {
    return new Date(`${year}-12-31T23:59:59+08:00`);
  }

  function voteIsOpen(year) {
    return Date.now() <= voteDeadline(year).getTime();
  }

  function renderHero() {
    if (!games.length) return;

    const editions = AWARDS && Array.isArray(AWARDS.editions)
      ? AWARDS.editions.slice().sort((a, b) => a.year - b.year)
      : [];

    if (!AWARDS || !Array.isArray(AWARDS.categories) || !editions.length) {
      renderTopFeature();
      return;
    }

    const latestEdition = editions[editions.length - 1];
    if (!state.awardYear || !editions.some((e) => e.year === state.awardYear)) {
      state.awardYear = Number(AWARDS.currentVoteYear) || latestEdition.year;
      if (!editions.some((e) => e.year === state.awardYear)) state.awardYear = latestEdition.year;
    }

    const edition = editions.find((e) => e.year === state.awardYear) || latestEdition;
    const isCurrent = Number(edition.year) === Number(AWARDS.currentVoteYear);
    const currentVoteOpen = isCurrent && voteIsOpen(edition.year);
    const label = isCurrent ? (currentVoteOpen ? "投票进行中" : "投票已结束") : "站内评选";
    const labelTitle = isCurrent
      ? currentVoteOpen
        ? `投票范围：站内已收录的 ${edition.year} 游戏；截止 ${edition.year}-12-31 23:59`
        : `投票已于 ${edition.year}-12-31 23:59 结束`
      : "评选范围：站内已评分作品";

    const slides = AWARDS.categories
      .map((cat) => {
        if (isCurrent) {
          const top = currentVoteTop(cat.key);
          return { cat, g: top ? top.g : null, votes: top ? top.votes : 0 };
        }
        const id = edition.winners ? Number(edition.winners[cat.key]) : NaN;
        const g = byId.get(id);
        return g ? { cat, g, votes: null } : null;
      })
      .filter(Boolean);

    if (!slides.length) {
      renderTopFeature();
      return;
    }

    const voteYear = AWARDS.currentVoteYear || latestEdition.year;
    const emptyTitle = voteCountStatus === "loading"
      ? "正在统计票数"
      : voteCountStatus === "error"
        ? "投票数据暂不可用"
        : "还没有人投票";
    const emptyText = voteCountStatus === "loading"
      ? "稍等一下，票数马上出来。"
      : voteCountStatus === "error"
        ? "可以先打开投票页看看。"
        : "为这个奖项投出第一票。";

    heroFeature.innerHTML = `
      <div class="awards-carousel">
        <div class="awards-track" tabindex="0" aria-label="${edition.year} 年度作品，可左右滑动">
          ${slides.map((s) => {
            const badge = isCurrent && s.votes > 0 ? `${s.cat.name} · 领先` : s.cat.name;
            if (!s.g) {
              return `
                <article class="awards-slide is-empty" style="--award-c:${AWARD_COLORS[s.cat.key] || "#f2c14e"}">
                  <div class="awards-shade" aria-hidden="true"></div>
                  <div class="awards-slide-top">
                    <span class="awards-badge"><i></i>${esc(badge)}</span>
                    <span class="awards-slide-year">${edition.year}</span>
                  </div>
                  <div class="awards-slide-body">
                    <p class="awards-desc">${esc(s.cat.desc || "年度奖项")}</p>
                    <h2 class="awards-game">${emptyTitle}</h2>
                    <p class="awards-empty-text">${emptyText}</p>
                    <a class="awards-cta" href="vote.html">
                      去投票
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h13M13 6l6 6-6 6"/></svg>
                    </a>
                  </div>
                </article>`;
            }
            return `
              <article class="awards-slide" style="--award-c:${AWARD_COLORS[s.cat.key] || "#f2c14e"}">
                <div class="awards-media" style="background:${placeholder(s.g.name)}">
                  ${coverImg(s.g, false, "awards-media-bg")}
                  ${coverImg(s.g, false, "awards-media-img")}
                </div>
                <div class="awards-shade" aria-hidden="true"></div>
                <div class="awards-slide-top">
                  <span class="awards-badge"><i></i>${esc(badge)}</span>
                  <span class="awards-slide-year">${edition.year}</span>
                </div>
                <div class="awards-slide-body">
                  <p class="awards-desc">${esc(s.cat.desc || "年度获奖作品")}</p>
                  <h2 class="awards-game">${esc(s.g.name)}</h2>
                  <div class="awards-meta">
                    <span class="tag-pill" style="--tag-c:${TAG_COLORS[s.g.tag] || "#60a5fa"}">${esc(s.g.tag)}</span>
                    <span class="awards-score">${fmt(s.g.score)}</span>
                    <span class="awards-dev">${esc(s.g.year)} · ${esc(s.g.developer)}</span>
                    ${isCurrent ? `<span class="awards-votes">当前 <b>${s.votes}</b> 票</span>` : ""}
                  </div>
                  <button class="awards-cta" type="button" data-award-open="${s.g.id}">
                    查看详情
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h13M13 6l6 6-6 6"/></svg>
                  </button>
                </div>
              </article>`;
          }).join("")}
        </div>

        <div class="awards-topbar">
          ${editions.length > 1
            ? `<div class="awards-tabs" role="tablist" aria-label="选择年份">
                 ${editions.map((e) => `<button type="button" role="tab" aria-selected="${e.year === edition.year}" class="awards-tab${e.year === edition.year ? " is-active" : ""}" data-award-year="${e.year}">${e.year}</button>`).join("")}
               </div>`
            : `<span class="awards-single-year">${edition.year}</span>`}
          <span class="awards-label" title="${labelTitle}">${label}</span>
        </div>

        <button class="awards-arrow is-prev" type="button" aria-label="上一个奖项" data-award-prev>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg>
        </button>
        <button class="awards-arrow is-next" type="button" aria-label="下一个奖项" data-award-next>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>
        </button>

        <div class="awards-footer">
          <div class="awards-dots" role="tablist" aria-label="奖项切换">
            ${slides.map((_, i) => `<button type="button" class="awards-dot${i === 0 ? " is-active" : ""}" data-award-dot="${i}" aria-label="第 ${i + 1} 个奖项"></button>`).join("")}
          </div>
          <a class="awards-vote" href="vote.html">
            ${isCurrent
              ? (currentVoteOpen ? `参与 ${voteYear} 投票` : `查看 ${voteYear} 投票结果`)
              : `查看 ${voteYear} 投票`}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h13M13 6l6 6-6 6"/></svg>
          </a>
        </div>
      </div>`;

    const track = heroFeature.querySelector(".awards-track");
    if (!track) return;
    const dots = Array.from(heroFeature.querySelectorAll("[data-award-dot]"));
    let current = 0;

    const setActive = (idx) => {
      current = idx;
      dots.forEach((d, i) => d.classList.toggle("is-active", i === idx));
    };
    const go = (idx) => {
      const clamped = Math.max(0, Math.min(slides.length - 1, idx));
      track.scrollTo({ left: clamped * track.clientWidth, behavior: reduceMotion() ? "auto" : "smooth" });
      setActive(clamped);
    };

    heroFeature.querySelector("[data-award-prev]").addEventListener("click", () => go(current - 1));
    heroFeature.querySelector("[data-award-next]").addEventListener("click", () => go(current + 1));

    dots.forEach((dot, i) => {
      dot.addEventListener("click", () => go(i));
    });

    heroFeature.querySelectorAll("[data-award-year]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const year = Number(btn.dataset.awardYear);
        if (year === state.awardYear) return;
        state.awardYear = year;
        renderHero();
      });
    });

    heroFeature.querySelectorAll("[data-award-open]").forEach((btn) => {
      btn.addEventListener("click", () => openGame(Number(btn.dataset.awardOpen)));
    });

    let ticking = false;
    track.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const idx = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        setActive(Math.max(0, Math.min(slides.length - 1, idx)));
      });
    }, { passive: true });

    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(current - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(current + 1);
      }
    });

    setActive(0);
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

  /* ---------- year / developer / duration filters ---------- */
  const DURATION_RANGES = [
    { key: "0-10", label: "10 小时以内", min: 0, max: 10 },
    { key: "10-30", label: "10–30 小时", min: 10, max: 30 },
    { key: "30-60", label: "30–60 小时", min: 30, max: 60 },
    { key: "60-100", label: "60–100 小时", min: 60, max: 100 },
    { key: "100+", label: "100 小时以上", min: 100, max: Infinity }
  ];

  function durationRange(key) {
    return DURATION_RANGES.find((d) => d.key === key) || null;
  }

  function renderFilterSelects() {
    if (!yearFilter || !devFilter || !timeFilter) return;
    const years = Array.from(new Set(games.map((g) => g.year).filter(Boolean)))
      .sort((a, b) => b - a);
    const devs = Array.from(new Set(games.map((g) => g.developer).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, "zh-CN"));

    if (state.year && !years.includes(Number(state.year))) state.year = null;
    if (state.dev && !devs.includes(state.dev)) state.dev = null;
    if (state.duration && !durationRange(state.duration)) state.duration = null;

    yearFilter.innerHTML = `<option value="">全部年份</option>` +
      years.map((y) => `<option value="${y}">${y} 年</option>`).join("");
    devFilter.innerHTML = `<option value="">全部厂商</option>` +
      devs.map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join("");
    timeFilter.innerHTML = `<option value="">全部时长</option>` +
      DURATION_RANGES.map((d) => `<option value="${d.key}">${d.label}</option>`).join("");

    yearFilter.value = state.year ? String(state.year) : "";
    devFilter.value = state.dev || "";
    timeFilter.value = state.duration || "";
  }

  yearFilter?.addEventListener("change", () => {
    state.year = yearFilter.value ? Number(yearFilter.value) : null;
    updateFilterUI();
    renderBoard();
  });

  devFilter?.addEventListener("change", () => {
    state.dev = devFilter.value || null;
    updateFilterUI();
    renderBoard();
  });

  timeFilter?.addEventListener("change", () => {
    state.duration = timeFilter.value || null;
    updateFilterUI();
    renderBoard();
  });

  /* ---------- tier chips ---------- */
  function renderTierChips() {
    const counts = stats.tagCounts || {};
    const all = `<button type="button" class="tier-chip${!state.tier && !state.tag && !state.awardOnly ? " is-active" : ""}" data-tier="">
        <span class="tier-dot" style="--c:#c7d5f3"></span>全部<b>${games.length}</b></button>`;
    const rest = TAG_ORDER.map((t) => {
      const c = TAG_COLORS[t];
      return `<button type="button" class="tier-chip${state.tier === t ? " is-active" : ""}" data-tier="${esc(t)}"
          style="--c:${c}"><span class="tier-dot"></span>${esc(t)}<b>${counts[t] || 0}</b></button>`;
    }).join("");
    const awardCount = games.filter((g) => awardsForGame(g.id).length > 0).length;
    const award = `<button type="button" class="tier-chip award-chip${state.awardOnly ? " is-active" : ""}" data-award-filter="1"
        style="--c:#f2c14e"><span class="tier-dot"></span>★ 2025 获奖<b>${awardCount}</b></button>`;
    tierChips.innerHTML = all + award + rest;
  }

  tierChips.addEventListener("click", (e) => {
    const award = e.target.closest("[data-award-filter]");
    if (award) {
      state.awardOnly = !state.awardOnly;
      renderTierChips();
      updateFilterUI();
      renderBoard();
      return;
    }
    const btn = e.target.closest("[data-tier]");
    if (!btn) return;
    if (!btn.dataset.tier) state.awardOnly = false;
    state.tier = btn.dataset.tier || null;
    state.tag = null;
    renderTierChips();
    updateFilterUI();
    renderBoard();
  });

  function updateFilterUI() {
    const parts = [];
    if (state.year) parts.push(`${state.year} 年`);
    if (state.dev) parts.push(`厂商 · ${state.dev}`);
    if (state.duration) {
      const d = durationRange(state.duration);
      if (d) parts.push(`时长 · ${d.label}`);
    }
    if (state.tier) parts.push(`档位 · ${state.tier}`);
    if (state.tag) parts.push(state.tag);
    if (state.awardOnly) parts.push("2025 获奖");
    filterBanner.classList.toggle("show", parts.length > 0);
    if (parts.length) filterName.textContent = parts.join(" · ");
  }

  function clearFilters() {
    state.tier = null;
    state.tag = null;
    state.year = null;
    state.dev = null;
    state.duration = null;
    state.awardOnly = false;
    renderFilterSelects();
    renderTierChips();
    updateFilterUI();
    renderBoard();
  }

  $("#clearFilter").addEventListener("click", clearFilters);

  function applyTagFilter(tag) {
    if (!tag) return;
    state.awardOnly = false;
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
      if (state.awardOnly && awardsForGame(g.id).length === 0) return false;
      if (state.year && Number(g.year) !== Number(state.year)) return false;
      if (state.dev && g.developer !== state.dev) return false;
      if (state.duration) {
        const h = parseHours(g.playtime);
        const d = durationRange(state.duration);
        if (h == null || !d || h < d.min || h >= d.max) return false;
      }
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
    const hasAward = awardsForGame(g.id).length > 0;
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
      <article class="rank-row${topClass}${hasAward ? " has-award" : ""}" data-id="${g.id}" data-tag="${esc(g.tag)}" tabindex="0" role="button"
        aria-label="查看 ${esc(g.name)} 的详情" style="transition-delay:${Math.min(i, 12) * 16}ms">
        <span class="rank-no" title="第 ${i + 1} 项 · 总榜第 ${g.rank} 名">${pad2(i + 1)}</span>
        <div class="thumb" style="--ph:${placeholder(g.name)}">
          <span class="ph">${esc(initialOf(g.name))}</span>
          ${coverImg(g, state.view === "grid")}
          ${awardBadge(g, "ribbon")}
        </div>
        <div class="row-main">
          <div class="row-title">
            <span class="row-name">${esc(g.name)}</span>
            ${tagPill(g.tag)}
          </div>
          <div class="row-meta">${meta}</div>
          ${awardBadge(g, "row")}
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
    clearFilters();
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
    if (e.key === "Escape" && compareModal && !compareModal.hidden) {
      closeCompare();
      return;
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
        ${awardDrawerHTML(g)}
        <div class="dhero-stats">
          ${ringSVG(total)}
          <div class="dsummary">
            <span class="dsummary-head">SCORE SUMMARY</span>
            <p>总榜第 <b style="color:var(--gold)">${g.rank}</b> 名 / 共 ${games.length} 款。总分 ${fmt(total)}，比全站平均分 ${fmt(stats.avg)} ${diff >= 0 ? "高" : "低"} ${fmt(Math.abs(diff))} 分。</p>
          </div>
        </div>

        ${g.desc ? `<p class="ddesc">${esc(g.desc)}</p>` : ""}
        <button class="d-compare" type="button" data-compare="${g.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h9M9 4l4 3-4 3M20 17h-9M15 14l-4 3 4 3"/></svg>
          对比其他游戏
        </button>

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
    const compareBtn = e.target.closest("[data-compare]");
    if (compareBtn) {
      e.preventDefault();
      openCompare(Number(compareBtn.dataset.compare));
      return;
    }
    const tagEl = e.target.closest("[data-tag]");
    if (tagEl) {
      const t = tagEl.dataset.tag;
      closeGame();
      applyTagFilter(t);
    }
  });

  /* ---------- compare ---------- */
  let compareBaseId = null;
  let compareOtherId = null;
  let compareReturnFocus = null;

  function compareRadarSVG(a, b) {
    const w = 520;
    const h = 430;
    const cx = 260;
    const cy = 208;
    const R = 138;
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
        const a2 = angle(i);
        const r = R + 30;
        const x = cx + Math.cos(a2) * r;
        const y = cy + Math.sin(a2) * r;
        const cos = Math.cos(a2);
        const anchor = cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle";
        const dy = Math.sin(a2) > 0.7 ? 12 : Math.sin(a2) < -0.7 ? -3 : 5;
        return `<text x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${anchor}" class="radar-label">${esc(RADAR_LABEL[d.key])}</text>`;
      })
      .join("");
    const aVals = dims.map((d, i) => a.dims[i] || 0);
    const bVals = dims.map((d, i) => b.dims[i] || 0);
    const dotsA = aVals
      .map((v, i) => {
        const [x, y] = point(i, v);
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.8" fill="#f2c14e"/>`;
      })
      .join("");
    const dotsB = bVals
      .map((v, i) => {
        const [x, y] = point(i, v);
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="#60a5fa"/>`;
      })
      .join("");

    return `
      <svg viewBox="0 0 ${w} ${h}" class="compare-radar" role="img" aria-label="${esc(a.name)} 与 ${esc(b.name)} 的八维评分雷达对比图">
        ${rings}${axes}${ticks}
        ${poly(bVals, 'fill="rgba(96,165,250,.14)" stroke="#60a5fa" stroke-width="2" stroke-linejoin="round"')}
        ${poly(aVals, 'fill="rgba(242,193,78,.16)" stroke="#f2c14e" stroke-width="2.4" stroke-linejoin="round"')}
        ${dotsB}${dotsA}${labels}
      </svg>`;
  }

  function compareGameCard(g, side, color) {
    return `
      <article class="compare-game is-${side}" style="--c:${color}">
        <div class="compare-cover" style="--ph:${placeholder(g.name)}">
          <span class="ph">${esc(initialOf(g.name))}</span>
          ${coverImg(g, true)}
        </div>
        <div class="compare-game-body">
          <h3 class="compare-game-name">${esc(g.name)}</h3>
          <p class="compare-game-meta">${esc(g.year || "")} · ${esc(g.developer || "")}</p>
          <div class="compare-game-bottom">
            ${tagPill(g.tag)}
            <span class="compare-score">${fmt(g.score)}</span>
          </div>
          <span class="compare-rank">总榜 NO.${pad2(g.rank)}</span>
        </div>
      </article>`;
  }

  function compareField(side) {
    const isLeft = side === "left";
    return `
      <div class="compare-field" data-side="${side}">
        <div class="compare-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>
          <input class="compare-input" data-side="${side}" type="search"
            placeholder="搜索${isLeft ? "左侧" : "右侧"}游戏…" autocomplete="off" spellcheck="false">
          <button class="compare-drop" type="button" data-side="${side}" aria-label="展开${isLeft ? "左侧" : "右侧"}游戏列表">⌄</button>
        </div>
        <div class="compare-results" data-results="${side}" hidden></div>
      </div>`;
  }

  function compareTable(a, b) {
    const rows = dims.map((d, i) => {
      const av = a.dims[i] || 0;
      const bv = b.dims[i] || 0;
      const aw = av > bv ? " is-win" : "";
      const bw = bv > av ? " is-win" : "";
      return `
        <div class="compare-table-row">
          <span class="compare-table-dim">${esc(RADAR_LABEL[d.key])}</span>
          <span class="compare-table-val is-left${aw}">${fmt(av)}</span>
          <span class="compare-table-val is-right${bw}">${fmt(bv)}</span>
        </div>`;
    }).join("");
    return `
      <div class="compare-table">
        <div class="compare-table-row is-head">
          <span>维度</span>
          <span class="compare-table-name is-left">${esc(a.name)}</span>
          <span class="compare-table-name is-right">${esc(b.name)}</span>
        </div>
        ${rows}
      </div>`;
  }

  function renderCompare() {
    if (!compareContent) return;
    const a = byId.get(Number(compareBaseId));
    const b = byId.get(Number(compareOtherId));
    if (!a || !b) return;
    const diff = a.score - b.score;
    const abs = Math.abs(diff);
    const aWins = dims.reduce((sum, d, i) => sum + ((a.dims[i] || 0) > (b.dims[i] || 0) ? 1 : 0), 0);
    const bWins = dims.reduce((sum, d, i) => sum + ((b.dims[i] || 0) > (a.dims[i] || 0) ? 1 : 0), 0);
    const leader = diff === 0
      ? "两作总分相同"
      : `${diff > 0 ? a.name : b.name} 总分高出 ${fmt(abs)} 分`;

    compareContent.innerHTML = `
      <div class="compare-selectors">
        ${compareField("left")}
        <span class="compare-select-vs">对比</span>
        ${compareField("right")}
      </div>
      <div class="compare-games">
        ${compareGameCard(a, "left", "#f2c14e")}
        <div class="compare-vs">VS</div>
        ${compareGameCard(b, "right", "#60a5fa")}
      </div>
      <div class="compare-radar-wrap">
        ${compareRadarSVG(a, b)}
        <div class="compare-legend">
          <span><i class="is-a"></i>${esc(a.name)}</span>
          <span><i class="is-b"></i>${esc(b.name)}</span>
        </div>
      </div>
      <p class="compare-summary">${esc(leader)}；维度领先 ${aWins} : ${bWins}。</p>
      ${compareTable(a, b)}
    `;
  }

  function hideCompareResults(side) {
    if (!compareContent) return;
    const selector = side ? `[data-results="${side}"]` : "[data-results]";
    compareContent.querySelectorAll(selector).forEach((el) => { el.hidden = true; });
  }

  function renderCompareResults(side, query) {
    if (!compareContent) return;
    const input = compareContent.querySelector(`.compare-input[data-side="${side}"]`);
    const results = compareContent.querySelector(`[data-results="${side}"]`);
    if (!input || !results) return;
    hideCompareResults(side === "left" ? "right" : "left");
    const otherId = side === "left" ? compareOtherId : compareBaseId;
    const q = String(query || "").trim().toLowerCase();
    const list = games
      .filter((g) => g.id !== otherId)
      .filter((g) => {
        if (!q) return true;
        const hay = [g.name, ...tokensOf(g)].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((x, y) => y.score - x.score || x.id - y.id);

    if (!list.length) {
      results.innerHTML = `<p class="compare-results-empty">没有找到匹配的游戏</p>`;
      results.hidden = false;
      return;
    }
    results.innerHTML = list.map((g) => `
      <button class="compare-result" type="button" data-compare-pick="${g.id}" data-side="${side}">
        <span class="compare-result-thumb" style="--ph:${placeholder(g.name)}">
          <span class="ph">${esc(initialOf(g.name))}</span>
          ${coverImg(g, true)}
        </span>
        <span class="compare-result-name">${esc(g.name)}</span>
        <span class="compare-result-score">${fmt(g.score)}</span>
      </button>`).join("");
    results.hidden = false;
  }

  function selectCompareGame(side, id) {
    const g = byId.get(Number(id));
    if (!g) return;
    if (side === "left") {
      if (g.id === compareOtherId) return;
      compareBaseId = g.id;
    } else {
      if (g.id === compareBaseId) return;
      compareOtherId = g.id;
    }
    renderCompare();
  }

  function openCompare(id) {
    const a = byId.get(Number(id));
    if (!a) return;
    compareBaseId = a.id;
    compareReturnFocus = document.activeElement;
    const others = games
      .filter((g) => g.id !== a.id)
      .sort((x, y) => y.score - x.score || x.id - y.id);
    if (!others.length) return;
    compareOtherId = others[0].id;
    renderCompare();
    compareModal.hidden = false;
    compareBackdrop.hidden = false;
    compareModal.setAttribute("aria-hidden", "false");
    drawer.inert = true;
    document.body.classList.add("is-locked");
  }

  function closeCompare() {
    if (!compareModal || compareModal.hidden) return;
    compareModal.hidden = true;
    compareBackdrop.hidden = true;
    compareModal.setAttribute("aria-hidden", "true");
    if (drawer.classList.contains("is-open")) drawer.inert = false;
    if (compareReturnFocus && compareReturnFocus.focus) compareReturnFocus.focus({ preventScroll: true });
    compareReturnFocus = null;
  }

  if (compareContent) {
    compareContent.addEventListener("input", (e) => {
      if (e.target && e.target.classList.contains("compare-input")) {
        renderCompareResults(e.target.dataset.side, e.target.value);
      }
    });
    compareContent.addEventListener("focusin", (e) => {
      if (e.target && e.target.classList.contains("compare-input")) {
        hideCompareResults();
        e.target.select();
      }
    });
    compareContent.addEventListener("click", (e) => {
      const drop = e.target.closest(".compare-drop");
      if (drop) {
        const side = drop.dataset.side;
        const results = compareContent.querySelector(`[data-results="${side}"]`);
        const input = compareContent.querySelector(`.compare-input[data-side="${side}"]`);
        if (results && !results.hidden) {
          hideCompareResults(side);
        } else {
          if (input) input.focus();
          renderCompareResults(side, input ? input.value : "");
        }
        return;
      }
      const pick = e.target.closest("[data-compare-pick]");
      if (pick) {
        selectCompareGame(pick.dataset.side, Number(pick.dataset.comparePick));
        return;
      }
      if (!e.target.closest(".compare-field")) hideCompareResults();
    });
  }

  if (compareClose) compareClose.addEventListener("click", closeCompare);
  if (compareBackdrop) compareBackdrop.addEventListener("click", closeCompare);
  if (compareModal) {
    compareModal.addEventListener("click", (e) => {
      if (e.target === compareModal) closeCompare();
      else if (!e.target.closest(".compare-field")) hideCompareResults();
    });
  }

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
