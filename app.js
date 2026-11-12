"use strict";
const DEFAULT_PROXY = "https://go.openathens.net/redirector/usf.edu?url={url}";
let proxy = DEFAULT_PROXY;
try { proxy = localStorage.getItem("pd_proxy") || DEFAULT_PROXY; } catch (e) {}

const S = { issues: null, ff: null, pod: null, topic: "", q: "" };
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const doiUrl = d => "https://doi.org/" + d;
const proxied = d => proxy.replace("{url}", encodeURIComponent(doiUrl(d)));
const pubmed = p => "https://pubmed.ncbi.nlm.nih.gov/" + p + "/";
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDate = d => { if (!d) return ""; const [y,m,dd] = d.split("-"); return (MON[+m-1]||"") + (dd ? " " + (+dd) : "") + ", " + y; };
const ext = 'target="_blank" rel="noopener"';

async function load(name) {
  const r = await fetch("data/" + name + ".json", { cache: "no-cache" });
  if (!r.ok) throw new Error(name);
  return r.json();
}

/* ---------- paper cards ---------- */
function links(p) {
  return `<div class="links">
    ${p.doi ? `<a class="p" href="${esc(proxied(p.doi))}" ${ext}>Full paper</a>` : ""}
    <a href="${esc(pubmed(p.pmid))}" ${ext}>PubMed</a></div>`;
}
function card(p, label) {
  return `<article class="card ${p.featured ? "f" : ""}">
    <div class="tags"><span class="tag t">${esc(p.topic)}</span><span class="tag">${esc(p.design)}${p.n ? " · n=" + esc(p.n) : ""}</span><span class="tag ev-${esc(p.evidence)}">${esc(p.evidence)} evidence</span>${label ? `<span class="tag">${esc(label)}</span>` : ""}</div>
    <h3>${esc(p.title)}</h3>
    <div class="cite"><i>${esc(p.journal)}</i> · ${esc(fmtDate(p.date))} · ${esc(p.authors)}</div>
    <div class="bl"><b>Bottom line:</b> ${esc(p.bottom_line)}</div>
    <div class="more"><p>${esc(p.summary)}</p>${links(p)}</div>
    <button class="toggle" data-toggle>Summary &amp; links ▾</button>
  </article>`;
}
function bindToggles(root) {
  root.querySelectorAll("[data-toggle]").forEach(b => b.onclick = () => {
    const c = b.closest(".card"); c.classList.toggle("open");
    b.innerHTML = c.classList.contains("open") ? "Hide ▴" : "Summary &amp; links ▾";
  });
}
function topicsOf(issue) { return [...new Set(issue.papers.map(p => p.topic))].sort(); }

function renderIssue(issue, { showBack = false } = {}) {
  const t = S.topic;
  const ps = issue.papers.filter(p => !t || p.topic === t);
  const feat = ps.filter(p => p.featured), rest = ps.filter(p => !p.featured);
  const groups = {}; rest.forEach(p => (groups[p.topic] = groups[p.topic] || []).push(p));
  const also = (issue.also_noted || []).filter(p => !t || p.topic === t);
  let h = showBack ? `<button class="back" data-back>‹ All issues</button>` : installHint();
  h += `<div class="kicker">${esc(issue.label)}</div><h1 class="sec">Literature digest</h1>
    <div class="meta">${esc(issue.window)} · ${issue.screened} screened · ${issue.papers.length} summarized</div>
    <div class="note"><div class="kicker">Overview</div><p>${esc(issue.editor_note)}</p></div>
    <div class="chips">${["", ...topicsOf(issue)].map(x => `<button class="chip ${x === t ? "on" : ""}" data-topic="${esc(x)}">${x ? esc(x) : "All"}</button>`).join("")}</div>`;
  if (feat.length) h += `<h2 class="grp">Most practice-relevant <small>${feat.length}</small></h2>` + feat.map(p => card(p)).join("");
  Object.keys(groups).sort().forEach(k => h += `<h2 class="grp">${esc(k)} <small>${groups[k].length}</small></h2>` + groups[k].map(p => card(p)).join(""));
  if (also.length) h += `<h2 class="grp">Also noted <small>abstract not yet on PubMed</small></h2><div class="list">${also.map(p =>
    `<a class="item" href="${esc(p.doi ? proxied(p.doi) : pubmed(p.pmid))}" ${ext}><div class="tt">${esc(p.title)}</div><div class="sub"><i>${esc(p.journal)}</i> · ${esc(p.topic)}</div></a>`).join("")}</div>`;
  if (!ps.length) h += `<div class="empty">No papers in this topic this month.</div>`;
  const v = $("#view"); v.innerHTML = h; bindToggles(v);
  v.querySelectorAll("[data-topic]").forEach(b => b.onclick = () => { S.topic = b.dataset.topic; renderIssue(issue, { showBack }); });
  const bk = v.querySelector("[data-back]"); if (bk) bk.onclick = () => { location.hash = "archive"; };
}

/* ---------- tabs ---------- */
function home() { S.topic = ""; renderIssue(S.issues.issues[0]); }

function archive() {
  const v = $("#view");
  const draw = () => {
    const q = S.q.trim().toLowerCase();
    let h = `<h1 class="sec">Archive</h1><input class="search" id="q" type="search" placeholder="Search every issue: drug, topic, journal…" value="${esc(S.q)}">`;
    if (q) {
      const hits = [];
      S.issues.issues.forEach(i => i.papers.forEach(p => {
        if ([p.title, p.summary, p.bottom_line, p.journal, p.topic, p.design, p.authors].join(" ").toLowerCase().includes(q)) hits.push([p, i.label]);
      }));
      h += `<div class="meta" style="margin:4px 2px 10px">${hits.length} result${hits.length === 1 ? "" : "s"}</div>` + (hits.map(([p, l]) => card(p, l)).join("") || `<div class="empty">No matches.</div>`);
    } else {
      h += `<div class="list" style="margin-top:8px">${S.issues.issues.map((i, n) =>
        `<button class="item" data-issue="${esc(i.id)}"><div class="tt">${esc(i.label)}${n === 0 ? ' <span class="tag t">Current</span>' : ""}</div><div class="sub">${i.papers.length} papers · ${i.papers.filter(p => p.featured).length} featured</div></button>`).join("")}</div>`;
    }
    v.innerHTML = h; bindToggles(v);
    const inp = v.querySelector("#q");
    inp.oninput = () => { S.q = inp.value; const pos = inp.selectionStart; draw(); const n = v.querySelector("#q"); n.focus(); n.setSelectionRange(pos, pos); };
    v.querySelectorAll("[data-issue]").forEach(b => b.onclick = () => { location.hash = "issue-" + b.dataset.issue; });
  };
  draw();
}

function fastfact() {
  const picks = S.ff.picks, f = picks[0];
  let h = `<div class="kicker">${esc(f.label)} · Fast Fact of the month</div>
    <h1 class="sec"><span class="ff-num">#${f.number}</span> ${esc(f.title)}</h1>
    <div class="meta">${esc(f.authors)} · ${esc(f.published)}</div>
    <div class="card ff" style="margin-top:12px"><p>${esc(f.intro)}</p>
      ${f.points.map(x => `<h3>${esc(x.h)}</h3><p>${esc(x.t)}</p>`).join("")}
      ${f.pearl ? `<div class="pearl"><b>Pearl:</b> ${esc(f.pearl)}</div>` : ""}
      <div class="links"><a class="p" href="${esc(f.url)}" ${ext}>Read the full Fast Fact</a></div>
    </div>
    <div class="fine">This is a summary of Fast Fact #${f.number} from the Palliative Care Network of Wisconsin (mypcnow.org). Check the original for full content and references.</div>`;
  if (picks.length > 1) h += `<h2 class="grp">Previous months</h2><div class="list">${picks.slice(1).map(p =>
    `<a class="item" href="${esc(p.url)}" ${ext}><div class="tt">#${p.number} ${esc(p.title)}</div><div class="sub">${esc(p.label)}</div></a>`).join("")}</div>`;
  $("#view").innerHTML = h;
}

function podcast() {
  const P = S.pod, e = P.episodes[0];
  const spot = t => "https://open.spotify.com/search/" + encodeURIComponent("GeriPal " + t.split(":")[0]);
  const ep = (x, big) => `
    ${big ? `<div class="kicker">Latest episode · ${esc(fmtDate(x.date))}</div><h1 class="sec">${esc(x.title)}</h1>` : `<h3 style="font:650 15.5px/1.35 'Source Serif 4',Georgia,serif;margin:0">${esc(x.title)}</h3><div class="meta">${esc(fmtDate(x.date))}</div>`}
    <iframe class="player" src="${esc(x.embed)}" loading="lazy" title="Play ${esc(x.title)}" allow="autoplay; encrypted-media" scrolling="no"></iframe>
    ${x.synopsis ? `<p>${esc(x.synopsis)}</p>` : ""}
    ${x.listen_for ? `<div class="pearl"><b>Listen for:</b><ul class="lf">${x.listen_for.map(l => `<li>${esc(l)}</li>`).join("")}</ul></div>` : ""}
    ${x.note ? `<div class="fine">${esc(x.note)}</div>` : ""}
    <div class="links"><a href="${esc(spot(x.title))}" ${ext}>Spotify</a><a href="${esc(P.show.apple)}" ${ext}>Apple Podcasts</a><a href="${esc(x.page)}" ${ext}>Show notes</a></div>`;
  let h = `<div class="card f">${ep(e, true)}</div><h2 class="grp">Recent episodes</h2>` +
    P.episodes.slice(1).map(x => `<div class="card">${ep(x, false)}</div>`).join("") +
    `<div class="fine">${esc(P.show.name)}, hosted by ${esc(P.show.hosts)}. ${esc(P.show.cme)}</div>`;
  $("#view").innerHTML = h;
}

/* ---------- install hint ---------- */
function installHint() {
  let dismissed = false; try { dismissed = localStorage.getItem("pd_hint") === "1"; } catch (e) {}
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (dismissed || standalone) return "";
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return `<div class="install" id="hint"><div>📲 ${ios ? "Add to your home screen: tap <b>Share</b>, then <b>Add to Home Screen</b>." : "Add to your home screen: open the browser menu and tap <b>Install app</b> or <b>Add to Home screen</b>."}</div><button onclick="try{localStorage.setItem('pd_hint','1')}catch(e){};this.parentNode.remove()">✕</button></div>`;
}

/* ---------- routing ---------- */
const TABS = { home, archive, fastfact, podcast };
function route() {
  const h = location.hash.replace("#", "") || "home";
  let tab = h;
  if (h.startsWith("issue-")) {
    tab = "archive";
    const iss = S.issues.issues.find(i => i.id === h.slice(6));
    if (iss) { S.topic = ""; renderIssue(iss, { showBack: true }); }
    else archive();
  } else (TABS[h] || home)();
  document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === (TABS[tab] ? tab : "home")));
  window.scrollTo(0, 0);
}
document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => {
  if (location.hash === "#" + b.dataset.tab) route(); else location.hash = b.dataset.tab;
});
window.addEventListener("hashchange", route);

/* ---------- settings ---------- */
const sheet = $("#settings"), pin = $("#proxy");
$("#openSettings").onclick = () => { pin.value = proxy; sheet.hidden = false; };
$("#closeSettings").onclick = () => sheet.hidden = true;
sheet.onclick = e => { if (e.target === sheet) sheet.hidden = true; };
$("#saveProxy").onclick = () => { proxy = pin.value.includes("{url}") ? pin.value.trim() : DEFAULT_PROXY; try { localStorage.setItem("pd_proxy", proxy); } catch (e) {} sheet.hidden = true; route(); };
$("#resetProxy").onclick = () => { proxy = DEFAULT_PROXY; pin.value = proxy; try { localStorage.removeItem("pd_proxy"); } catch (e) {} };

/* ---------- boot ---------- */
Promise.all([load("issues"), load("fastfacts"), load("podcast")]).then(([i, f, p]) => {
  i.issues.sort((a, b) => b.id.localeCompare(a.id));
  f.picks.sort((a, b) => b.month.localeCompare(a.month));
  p.episodes.sort((a, b) => b.date.localeCompare(a.date));
  S.issues = i; S.ff = f; S.pod = p;
  route();
}).catch(() => { $("#view").innerHTML = `<div class="empty">Couldn't load the digest. Check your connection and try again.</div>`; });

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
