/* =========================================================
   星GN · 2026 年度评选 / 玩家投票
   每个奖项可投可不投；对 2026 全年所有游戏开放。
   ========================================================= */
(function () {
  "use strict";

  const DATA = window.GN_DATA;
  const AWARDS = window.GN_AWARDS;

  const SUPABASE_URL = "https://vgdralqjppxshwbqqzum.supabase.co";
  const SUPABASE_KEY = "sb_publishable_f76ssYCjHRIlQ5TnP3VqKA_hjoX-NhS";
  const STORAGE_VOTER = "starGN_voter_id";
  const STORAGE_VOTED = "starGN_voted_";

  const $ = (sel) => document.querySelector(sel);
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

  function splitTags(v) {
    if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
    if (!v) return [];
    return String(v).split("/").map((s) => s.trim()).filter(Boolean);
  }

  function coverImg(g) {
    const src = g.cover || g.thumb;
    if (!src) return "";
    const fallback = g.thumb || g.cover || "";
    return `<img src="${esc(src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"
      data-alt="${esc(fallback)}"
      onerror="if(this.dataset.alt){this.src=this.dataset.alt;this.dataset.alt='';}else{this.remove();}">`;
  }

  const reduceMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function uuid() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getVoterId() {
    try {
      let id = localStorage.getItem(STORAGE_VOTER);
      if (!id) {
        id = uuid();
        localStorage.setItem(STORAGE_VOTER, id);
      }
      return id;
    } catch (e) {
      return uuid();
    }
  }

  /* ---------- guards ---------- */
  const voteForm = $("#voteForm");
  const voteBar = $("#voteBar");
  const submitBtn = $("#submitVote");
  const voteCountEl = $("#voteCount");
  const barCountEl = $("#barCount");
  const voteTotalEl = $("#voteTotal");
  const barTotalEl = $("#barTotal");
  const statusEl = $("#voteStatus");
  const statusText = statusEl ? statusEl.querySelector("span") : null;
  const retryBtn = $("#voteRetry");
  const deadlineEl = $("#voteDeadline");
  const voteResults = $("#voteResults");
  const resultList = $("#resultList");
  const resultMeta = $("#resultMeta");
  const voteDone = $("#voteDone");
  const toastEl = $("#voteToast");

  const pickBackdrop = $("#pickBackdrop");
  const pickModal = $("#pickModal");
  const pickPanel = pickModal ? pickModal.querySelector(".pick-panel") : null;
  const pickTitle = $("#pickTitle");
  const pickKicker = $("#pickKicker");
  const pickSearch = $("#pickSearch");
  const pickGrid = $("#pickGrid");
  const pickClose = $("#pickClose");
  const pickCancel = $("#pickCancel");
  const pickClear = $("#pickClear");
  const pickReturn = { el: null };

  if (!DATA || !AWARDS || !Array.isArray(AWARDS.categories) || !voteForm) {
    if (voteForm) voteForm.innerHTML = `<p class="result-empty">投票数据未加载，请刷新页面。</p>`;
    return;
  }

  const year = Number(AWARDS.currentVoteYear);
  const categories = AWARDS.categories;
  const DEADLINE = new Date(`${year}-12-31T23:59:59+08:00`);
  const DEADLINE_LABEL = `${year}-12-31 23:59`;

  function isVotingOpen() {
    return !serverClosed && Date.now() <= DEADLINE.getTime();
  }

  function updateDeadlineUI() {
    if (!deadlineEl) return;
    const open = isVotingOpen();
    deadlineEl.textContent = open
      ? `投票截止：${DEADLINE_LABEL}（北京时间）`
      : `投票已于 ${DEADLINE_LABEL} 结束`;
    deadlineEl.classList.toggle("is-closed", !open);
  }

  const staticGames = (DATA.games || []).map(normalizeGame).filter((g) => g.name);
  let games = staticGames.slice();
  let byId = new Map(games.map((g) => [g.id, g]));
  let yearGames = [];

  function normalizeGame(x) {
    return {
      id: Number(x.id),
      name: String(x.name || "").trim(),
      score: Number(x.score) || 0,
      tag: x.tag || "NPC",
      cover: x.cover || "",
      thumb: x.cover_thumb || x.coverThumb || x.thumb || x.cover || "",
      year: Number(x.release_year || x.year || 0),
      developer: String(x.developer || "").trim(),
      genre: splitTags(x.genre)
    };
  }

  function setGames(list) {
    const next = list.map(normalizeGame).filter((g) => g.name && g.id);
    if (!next.length) return false;
    games = next;
    byId = new Map(games.map((g) => [g.id, g]));
    yearGames = games
      .filter((g) => Number(g.year) === year)
      .sort((a, b) => b.score - a.score || a.id - b.id);
    return true;
  }

  setGames(staticGames);

  function readVoted() {
    try {
      const raw = localStorage.getItem(STORAGE_VOTED + year);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : true;
    } catch (e) {
      return null;
    }
  }

  const storedVoted = readVoted();
  let selected = {};
  let hasVoted = storedVoted != null;
  let liveCounts = new Map();
  let liveState = "loading";
  if (storedVoted && typeof storedVoted === "object") selected = storedVoted;

  let client = null;
  let serviceReady = false;
  let submitting = false;
  let serverClosed = false;
  let pickCat = null;
  let toastTimer = null;

  [voteTotalEl, barTotalEl].forEach((el) => { if (el) el.textContent = String(categories.length); });
  ["voteYearTop", "voteYearKicker", "doneYear"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(year);
  });
  if (pickKicker) pickKicker.textContent = `选择游戏 · ${year}`;
  document.title = `${year} 星GN 玩家投票 · 游戏手札`;

  /* ---------- status / toast ---------- */
  function setStatus(kind, text) {
    if (!statusEl) return;
    const cls = kind === "ready" ? " is-ready" : kind === "error" ? " is-error" : kind === "closed" ? " is-closed" : "";
    statusEl.className = "vote-status" + cls;
    if (statusText) statusText.textContent = text;
    if (retryBtn) retryBtn.hidden = kind !== "error";
  }

  function toast(message) {
    if (!toastEl) return;
    toastEl.hidden = false;
    toastEl.textContent = message;
    requestAnimationFrame(() => toastEl.classList.add("is-show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("is-show");
      setTimeout(() => { toastEl.hidden = true; }, 280);
    }, 2800);
  }

  /* ---------- form ---------- */
  function findLiveLeader(catKey) {
    let best = null;
    liveCounts.forEach((votes, key) => {
      const sep = key.indexOf("|");
      if (sep < 0 || key.slice(0, sep) !== catKey) return;
      const g = byId.get(Number(key.slice(sep + 1)));
      if (!g || Number(g.year) !== year) return;
      if (!best || votes > best.votes || (votes === best.votes && g.score > best.g.score)) {
        best = { g, votes };
      }
    });
    return best;
  }

  function liveLineText(catKey) {
    if (liveState === "loading") return "领先：正在统计…";
    if (liveState === "error") return "领先：票数暂不可用";
    const top = findLiveLeader(catKey);
    if (!top) return "领先：暂无票数";
    return `领先：${esc(top.g.name)} · ${top.votes} 票`;
  }

  function renderForm() {
    voteForm.innerHTML = categories.map((cat, ci) => {
      const gid = selected[cat.key];
      const g = gid != null ? byId.get(Number(gid)) : null;
      const chosen = g
        ? `<div class="vote-chosen">
             <span class="vote-thumb" style="--ph:${placeholder(g.name)}">
               <span class="ph">${esc(initialOf(g.name))}</span>
               ${coverImg(g)}
             </span>
             <span class="vote-chosen-info">
               <b>${esc(g.name)}</b>
               <em>${esc(g.year)} · ${esc(g.developer)} · ${esc(g.tag)}</em>
             </span>
             <span class="vote-chosen-score">${fmt(g.score)}</span>
             <span class="vote-choice-actions">
               <button class="vote-mini-btn" type="button" data-pick>更换</button>
               <button class="vote-mini-btn is-ghost" type="button" data-clear>清除</button>
             </span>
           </div>`
        : `<div class="vote-choice-empty">
             <span>未选择 · 可跳过</span>
             <button class="vote-pick-btn" type="button" data-pick>选择游戏</button>
           </div>`;
      return `
        <section class="vote-category" data-cat="${esc(cat.key)}">
          <header class="vote-cat-head">
            <div>
              <span class="vote-cat-index">${pad2(ci + 1)}</span>
              <h2>${esc(cat.name)}</h2>
              <p class="vote-cat-desc">${esc(cat.desc || "")}</p>
              <span class="vote-cat-live">${liveLineText(cat.key)}</span>
            </div>
            <span class="vote-cat-check${g ? " is-done" : ""}">${g ? "已选" : "未选择"}</span>
          </header>
          <div class="vote-choice">${chosen}</div>
        </section>`;
    }).join("");
    const closed = !isVotingOpen();
    voteForm.classList.toggle("is-closed", closed);
    voteForm.inert = closed;
  }

  function updateSubmitLabel() {
    if (!submitBtn || submitting) return;
    if (!isVotingOpen()) {
      submitBtn.textContent = "投票已结束";
      return;
    }
    submitBtn.textContent = hasVoted ? "更新投票" : "提交投票";
  }

  function updateProgress() {
    const count = categories.filter((c) => selected[c.key] != null).length;
    if (voteCountEl) voteCountEl.textContent = String(count);
    if (barCountEl) barCountEl.textContent = String(count);
    if (submitBtn) submitBtn.disabled = count === 0 || submitting || !serviceReady || !isVotingOpen();
    updateSubmitLabel();
  }

  voteForm.addEventListener("click", (e) => {
    if (!isVotingOpen()) {
      toast("投票已结束");
      return;
    }
    const pick = e.target.closest("[data-pick]");
    if (pick) {
      const section = pick.closest(".vote-category");
      if (section) openPicker(section.dataset.cat);
      return;
    }
    const clear = e.target.closest("[data-clear]");
    if (clear) {
      const section = clear.closest(".vote-category");
      if (section) {
        delete selected[section.dataset.cat];
        renderForm();
        updateProgress();
      }
    }
  });

  /* ---------- picker ---------- */
  function openPicker(catKey) {
    if (!isVotingOpen()) {
      toast("投票已结束");
      return;
    }
    const cat = categories.find((c) => c.key === catKey);
    if (!cat) return;
    pickCat = catKey;
    pickReturn.el = document.activeElement;
    if (pickTitle) pickTitle.textContent = cat.name;
    if (pickKicker) pickKicker.textContent = `${cat.desc || "年度奖项"} · ${year}`;
    if (pickSearch) pickSearch.value = "";
    renderPicker();
    if (pickModal) pickModal.hidden = false;
    if (pickBackdrop) pickBackdrop.hidden = false;
    document.body.classList.add("is-locked");
    if (pickSearch) setTimeout(() => pickSearch.focus(), 30);
  }

  function closePicker() {
    if (pickModal) pickModal.hidden = true;
    if (pickBackdrop) pickBackdrop.hidden = true;
    document.body.classList.remove("is-locked");
    pickCat = null;
    if (pickReturn.el && pickReturn.el.focus) pickReturn.el.focus({ preventScroll: true });
    pickReturn.el = null;
  }

  function renderPicker() {
    if (!pickGrid) return;
    const q = pickSearch ? pickSearch.value.trim().toLowerCase() : "";
    const list = yearGames.filter((g) => {
      if (!q) return true;
      const hay = [g.name, g.developer, g.tag, String(g.year), ...g.genre].join(" ").toLowerCase();
      return hay.includes(q);
    });

    if (!list.length) {
      pickGrid.innerHTML = `<p class="pick-empty">没有找到匹配的 ${year} 年游戏</p>`;
      return;
    }

    pickGrid.innerHTML = list.map((g) => {
      const mine = selected[pickCat] != null && Number(selected[pickCat]) === g.id;
      return `
        <button class="pick-game${mine ? " is-selected" : ""}" type="button" data-pick-game="${g.id}">
          <span class="pick-cover" style="--ph:${placeholder(g.name)}">
            <span class="ph">${esc(initialOf(g.name))}</span>
            ${coverImg(g)}
          </span>
          <span class="pick-name">${esc(g.name)}</span>
          <span class="pick-meta">${fmt(g.score)} · ${esc(g.tag)}</span>
        </button>`;
    }).join("");
  }

  if (pickGrid) {
    pickGrid.addEventListener("click", (e) => {
      if (!isVotingOpen()) {
        toast("投票已结束");
        return;
      }
      const btn = e.target.closest("[data-pick-game]");
      if (!btn || !pickCat) return;
      selected[pickCat] = Number(btn.dataset.pickGame);
      closePicker();
      renderForm();
      updateProgress();
    });
  }

  if (pickSearch) pickSearch.addEventListener("input", renderPicker);
  if (pickClose) pickClose.addEventListener("click", closePicker);
  if (pickCancel) pickCancel.addEventListener("click", closePicker);
  if (pickBackdrop) pickBackdrop.addEventListener("click", closePicker);
  if (pickModal) {
    pickModal.addEventListener("click", (e) => {
      if (e.target === pickModal) closePicker();
    });
  }
  if (pickClear) {
    pickClear.addEventListener("click", () => {
      if (pickCat) delete selected[pickCat];
      closePicker();
      renderForm();
      updateProgress();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && pickModal && !pickModal.hidden) closePicker();
  });

  /* ---------- supabase ---------- */
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

  async function loadLiveGames() {
    if (!client) return;
    try {
      const { data, error } = await withTimeout(
        client.from("games").select("*").order("id", { ascending: true }),
        7000
      );
      if (error) throw error;
      if (data && data.length) {
        setGames(data);
        renderForm();
        updateProgress();
      }
    } catch (e) { /* keep static data */ }
  }

  async function votesTableReachable() {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/votes?select=id&limit=1`, {
        method: "HEAD",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      });
      return res.status !== 404;
    } catch (e) {
      return true;
    }
  }

  /* ---------- results ---------- */
  function showResults() {
    if (voteDone) voteDone.hidden = !hasVoted;
    if (voteResults) voteResults.hidden = false;
    if (isVotingOpen()) {
      setStatus("ready", hasVoted ? "你已投过票，可随时修改" : "投票已开启 · 可只投玩过的奖项");
    } else {
      setStatus("closed", "投票已结束");
    }
    loadResults();
  }

  async function loadResults() {
    if (!resultMeta || !resultList) return;
    if (!client) {
      liveState = "error";
      resultMeta.textContent = "结果暂不可用";
      renderForm();
      updateProgress();
      return;
    }
    resultMeta.textContent = "正在加载结果…";
    const { data, error } = await client
      .from("vote_totals")
      .select("*")
      .eq("year", year);
    if (error) {
      liveState = "error";
      resultMeta.textContent = "结果暂不可用";
      setStatus("error", "结果加载失败，请重试");
      resultList.innerHTML = `<p class="result-empty">读取结果失败：${esc(error.message || "请稍后再试")}</p>`;
      renderForm();
      updateProgress();
      return;
    }
    const next = new Map();
    (data || []).forEach((row) => {
      next.set(`${row.category}|${Number(row.game_id)}`, Number(row.votes) || 0);
    });
    liveCounts = next;
    liveState = "ok";
    if (isVotingOpen()) {
      setStatus("ready", hasVoted ? "你已投过票，可随时修改" : "投票已开启 · 可只投玩过的奖项");
    } else {
      setStatus("closed", "投票已结束");
    }
    renderForm();
    updateProgress();
    renderResults(data || []);
  }

  function renderResults(rows) {
    const byCategory = new Map();
    rows.forEach((row) => {
      const g = byId.get(Number(row.game_id));
      if (!g) return;
      const list = byCategory.get(row.category) || [];
      list.push({ g, votes: Number(row.votes) || 0 });
      byCategory.set(row.category, list);
    });

    let totalVotes = 0;
    byCategory.forEach((list) => list.forEach((x) => { totalVotes += x.votes; }));

    resultMeta.textContent = totalVotes
      ? `共 ${totalVotes} 票 · ${new Date().toLocaleString("zh-CN", { hour12: false })} 更新`
      : "还没有人投票";

    resultList.innerHTML = categories.map((cat) => {
      const items = (byCategory.get(cat.key) || []).slice().sort((a, b) => b.votes - a.votes || b.g.score - a.g.score);
      const total = items.reduce((s, x) => s + x.votes, 0);
      const max = Math.max(1, ...items.map((x) => x.votes));

      const body = items.length
        ? items.map((x) => {
            const mine = Number(selected[cat.key]) === Number(x.g.id);
            const pct = total ? Math.round((x.votes / total) * 100) : 0;
            return `
              <div class="result-row${mine ? " is-mine" : ""}">
                <div class="result-top">
                  <b>${esc(x.g.name)}${mine ? " · 你的选择" : ""}</b>
                  <span class="result-stat">${x.votes} 票 · ${pct}%</span>
                </div>
                <div class="result-bar"><i style="--w:${Math.round((x.votes / max) * 100)}%"></i></div>
              </div>`;
          }).join("")
        : `<p class="result-empty">还没有人投票</p>`;

      return `
        <div class="result-category">
          <div class="result-head"><h3>${esc(cat.name)}</h3><span>${total} 票</span></div>
          <div class="result-rows">${body}</div>
        </div>`;
    }).join("");
  }

  /* ---------- submit ---------- */
  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      if (submitting) return;
      if (!isVotingOpen()) {
        setStatus("closed", "投票已结束");
        updateProgress();
        toast("投票已结束");
        return;
      }
      if (!client || !serviceReady) {
        toast("投票服务未连接，请稍后再试");
        return;
      }
      const picked = categories.filter((c) => selected[c.key] != null);
      if (!picked.length) {
        toast("至少选择一个奖项再提交");
        return;
      }

      submitting = true;
      submitBtn.disabled = true;
      submitBtn.textContent = "提交中…";

      const voterId = getVoterId();
      const votes = picked.map((c) => ({
        category: c.key,
        game_id: Number(selected[c.key])
      }));

      const { error } = await client.rpc("submit_votes", {
        p_voter_id: voterId,
        p_year: year,
        p_votes: votes
      });
      submitting = false;
      updateSubmitLabel();

      if (error) {
        const msg = error.message || "";
        if (/VOTING_CLOSED|voting.*closed|投票已结束/i.test(msg)) {
          serverClosed = true;
          setStatus("closed", "投票已结束");
          updateDeadlineUI();
          renderForm();
          updateProgress();
          toast("投票已结束");
        } else if (/RATE_LIMITED|rate limit|提交太频繁/i.test(msg)) {
          updateProgress();
          toast("提交太频繁，请稍后再试");
        } else if (
          error.code === "PGRST202" ||
          /submit_votes/i.test(msg)
        ) {
          serviceReady = false;
          setStatus("error", "投票服务未配置");
          updateProgress();
          toast("投票服务需要更新：请在 Supabase 重新执行 v2/supabase-votes.sql");
        } else if (
          error.code === "PGRST205" ||
          /Could not find the table ['"]?public\.votes/i.test(msg) ||
          /relation ['"]?public\.votes['"]? does not exist/i.test(msg)
        ) {
          serviceReady = false;
          setStatus("error", "投票服务未配置");
          updateProgress();
          toast("投票数据表还没建好：请先在 Supabase 执行 v2/supabase-votes.sql");
        } else if (error.code === "23505") {
          markVoted();
          toast("这个浏览器已经投过票了");
          showResults();
        } else {
          updateProgress();
          toast("提交失败：" + (msg || "请稍后再试"));
        }
        return;
      }

      const wasVoted = hasVoted;
      markVoted();
      toast(wasVoted ? "投票已更新" : "投票成功，可随时修改");
      showResults();
      const results = document.getElementById("voteResults");
      if (results) results.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
    });
  }

  function markVoted() {
    hasVoted = Object.assign({}, selected);
    try { localStorage.setItem(STORAGE_VOTED + year, JSON.stringify(selected)); } catch (e) { /* ignore */ }
    updateSubmitLabel();
  }

  /* ---------- boot ---------- */
  updateDeadlineUI();
  renderForm();
  updateProgress();

  if (voteDone) voteDone.hidden = !hasVoted;
  if (voteResults) voteResults.hidden = false;
  if (resultMeta) resultMeta.textContent = "正在加载结果…";

  async function initVoteService() {
    updateDeadlineUI();
    serviceReady = false;
    liveState = "loading";
    if (retryBtn) retryBtn.disabled = true;
    setStatus("loading", "正在连接投票服务…");
    if (resultMeta) resultMeta.textContent = "正在加载结果…";
    try {
      const ready = await ensureSupabase();
      if (!ready) {
        liveState = "error";
        renderForm();
        updateProgress();
        setStatus("error", "投票服务暂不可用");
        if (resultMeta) resultMeta.textContent = "结果暂不可用";
        return;
      }

      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      const probe = await client
        .from("vote_totals")
        .select("*", { count: "exact", head: true })
        .eq("year", year);
      if (probe.error) {
        liveState = "error";
        renderForm();
        updateProgress();
        setStatus("error", "投票服务未配置");
        if (resultMeta) resultMeta.textContent = "结果暂不可用";
        return;
      }

      const tableOk = await votesTableReachable();
      if (!tableOk) {
        liveState = "error";
        renderForm();
        updateProgress();
        setStatus("error", "投票服务未配置");
        if (resultMeta) resultMeta.textContent = "结果暂不可用";
        return;
      }

      serviceReady = true;
      if (isVotingOpen()) {
        setStatus("ready", hasVoted ? "你已投过票，可随时修改" : "投票已开启 · 可只投玩过的奖项");
      } else {
        setStatus("closed", "投票已结束");
      }
      updateProgress();

      await loadLiveGames();
      loadResults();
    } finally {
      if (retryBtn) retryBtn.disabled = false;
    }
  }

  if (retryBtn) {
    retryBtn.addEventListener("click", async () => {
      if (retryBtn.disabled) return;
      serviceReady = false;
      liveState = "loading";
      updateProgress();
      setStatus("loading", "正在重新连接投票服务…");
      await initVoteService();
    });
  }

  initVoteService();

  setInterval(() => {
    updateDeadlineUI();
    if (isVotingOpen()) return;
    renderForm();
    updateProgress();
    if (pickModal && !pickModal.hidden) closePicker();
    if (statusEl && !statusEl.classList.contains("is-error")) setStatus("closed", "投票已结束");
  }, 30000);

  /* ---------- starfield ---------- */
  (function starfield() {
    const canvas = document.getElementById("starfield");
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    const reduce = reduceMotion();
    const COLORS = ["#ffffff", "#dce8ff", "#ffe9b0", "#bcd4ff", "#e6d9ff"];
    let w = 0, h = 0, dpr = 1;
    let stars = [];
    let raf = 0;

    function build() {
      const count = Math.min(200, Math.max(70, Math.round((w * h) / 11000)));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.4 + Math.random() * 1.1,
        base: 0.16 + Math.random() * 0.5,
        speed: 0.00035 + Math.random() * 0.001,
        phase: Math.random() * Math.PI * 2,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        cross: Math.random() < 0.06
      }));
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
      ctx.globalAlpha = 1;
    }

    function loop(t) {
      draw(t);
      raf = requestAnimationFrame(loop);
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

    resize();
    if (reduce) draw(0);
    else raf = requestAnimationFrame(loop);

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 160);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (!reduce) raf = requestAnimationFrame(loop);
    });
  })();

  /* ---------- header ---------- */
  const header = document.getElementById("siteHeader");
  if (header) {
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
})();
