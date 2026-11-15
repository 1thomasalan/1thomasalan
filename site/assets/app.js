/* 1thomasalan.com — small, dependency-free single-page app.
   Content lives in /data/site.json (generated from the Google Sheet CMS). */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad = n => String(n).padStart(2, '0');
  const mmss = s => isFinite(s) ? `${Math.floor(s/60)}:${pad(Math.floor(s%60))}` : '0:00';
  const wave = m => m.peaks ? `<div class="wv" data-wave="${m.slug}" role="slider" tabindex="0" aria-label="Seek ${esc(m.title)}" aria-valuemin="0" aria-valuemax="${m.duration||0}" aria-valuenow="0"><canvas aria-hidden="true"></canvas><span class="wv-t"><b>0:00</b> / ${mmss(m.duration)}</span></div>` : '';
  const paras = t => String(t||'').split(/\n\s*\n/).map(p => `<p>${esc(p.trim()).replace(/\n/g,'<br>')}</p>`).join('');
  const main = $('#main');
  let D = null;

  const icon = {
    play: '<svg viewBox="0 0 24 24"><path class="fill" d="M8 5.5v13l10.5-6.5z"/></svg>',
    pause:'<svg viewBox="0 0 24 24"><path class="fill" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
    out:  '<svg viewBox="0 0 24 24"><path d="M9 6h9v9M18 6 7 17"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M15 5l-7 7 7 7"/></svg>',
    spotify:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M7.5 9.5c3-1 6.5-.7 9 .8M8 12.6c2.5-.7 5.2-.4 7.3.8M8.6 15.4c2-.5 4-.3 5.6.6"/></svg>',
    apple:'<svg viewBox="0 0 24 24"><path d="M9 18V6.5l10-2V16"/><circle cx="6.8" cy="18" r="2.2"/><circle cx="16.8" cy="16" r="2.2"/></svg>',
    linkedin:'<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M8 10.5V16M8 7.8v.01M11.5 16v-5.5M11.5 13c0-1.6 1-2.6 2.3-2.6s2.2.9 2.2 2.6V16"/></svg>'
  };
  const img = (im, alt = '', cls = '', eager = false) => im
    ? `<div class="ph ${cls}"><img src="${im.thumb}" srcset="${im.thumb} 800w, ${im.src} 2000w" sizes="(max-width:860px) 100vw, 50vw" alt="${esc(alt)}" ${eager?'':'loading="lazy"'} decoding="async" onload="this.classList.add('ok')"></div>`
    : `<div class="ph ${cls}"></div>`;
  const cap = (n, t, s) => `<div class="cap"><span class="num">${pad(n)}</span><span class="t">${esc(t)}</span>${s?`<span class="s">${esc(s)}</span>`:''}</div>`;
  const ncols = () => innerWidth <= 860 ? 2 : 3;
  const masonry = (items, fn) => { const n = ncols(), cols = Array.from({length:n}, () => []); items.forEach((x,i) => cols[i % n].push(fn(x,i))); return `<div class="masonry" data-cols="${n}">${cols.map(c => `<div class="col">${c.join('')}</div>`).join('')}</div>`; };
  const camBySlug = s => D.cameras.find(c => c.slug === s);
  const camByName = n => D.cameras.find(c => c.name === n);
  const photoById = id => D.photos.find(p => p.id === id);
  const prettyTitle = t => t.replace(/[-_]/g,' ').replace(/\s+/g,' ').trim();

  /* ---------- views ---------- */
  const views = {
    home() {
      const feat = D.photos.filter(p => p.featured).concat(D.photos.filter(p => !p.featured)).slice(0, 3);
      const t = D.music.find(m => m.featured) || D.music[0];
      return `
      <section class="intro">
        <p class="lede">${esc(D.tagline)} Made with cameras, code, and a little help from AI.</p>
        <div class="meta">Okinawa, Japan<br>Creative technologist</div>
      </section>
      <section class="hero">
        <a href="/photos#${feat[0].id}" data-link><figure>${img(feat[0].image, feat[0].alt, '', true)}${cap(1, prettyTitle(feat[0].title), feat[0].location)}</figure></a>
        <div class="side">${feat.slice(1).map((p,i)=>`<a href="/photos#${p.id}" data-link><figure>${img(p.image,p.alt,'',true)}${cap(i+2, prettyTitle(p.title), p.location)}</figure></a>`).join('')}</div>
      </section>

      <section class="sec">
        <div class="sec-head"><span class="eyebrow">Projects</span><a class="more" href="/projects" data-link>All projects</a></div>
        <div class="row3">${D.projects.map((p,i)=>`<a class="card" href="/projects/${p.slug}" data-link>${img(p.image,p.title)}${cap(i+1,p.type,p.year)}<h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p></a>`).join('')}</div>
      </section>

      <section class="sec">
        <div class="sec-head"><span class="eyebrow">Listening</span><a class="more" href="/music" data-link>All ${D.music.length} songs</a></div>
        <div class="track-feature">
          <a href="/music/${t.slug}" data-link>${img(t.cover, t.title)}</a>
          <div><span class="eyebrow">${t.new?'New · ':''}${esc(t.genre)} · ${esc(t.year)}</span><h3>${esc(t.title)}</h3>
          <p class="sub" style="margin:0;color:var(--muted)">Songs written from journal entries, produced with AI.</p>
          <div class="acts"><button class="btn solid" data-play="${t.slug}">${icon.play} Play</button>${t.spotify?`<a class="btn" href="${esc(t.spotify)}" target="_blank" rel="noopener">${icon.spotify} Spotify</a>`:''}${t.apple?`<a class="btn" href="${esc(t.apple)}" target="_blank" rel="noopener">${icon.apple} Apple Music</a>`:''}</div>${wave(t)}</div>
        </div>
      </section>

      <section class="sec">
        <div class="sec-head"><span class="eyebrow">Art</span><a class="more" href="/art" data-link>All art</a></div>
        <div class="row3">${D.art.map((a,i)=>`<a class="card" href="/art/${a.slug}" data-link>${img(a.image,a.title)}${cap(i+1,a.title,a.year)}</a>`).join('')}</div>
      </section>

      <section class="sec">
        <div class="sec-head"><span class="eyebrow">Gear</span><a class="more" href="/gear" data-link>All ${D.cameras.length} cameras</a></div>
        <div class="row3">${D.cameras.slice(0,3).map((c,i)=>gearCard(c,i)).join('')}</div>
      </section>`;
    },

    photos(params) {
      const cat = params.get('c') || '', loc = params.get('l') || '', cam = params.get('cam') || '';
      const list = D.photos.filter(p => (!cat || p.category === cat) && (!loc || p.location === loc) && (!cam || p.camera === cam));
      PHOTO_SET = list;
      const locs = [...new Set(D.photos.map(p=>p.location).filter(Boolean))];
      const cams = [...new Set(D.photos.map(p=>p.camera).filter(Boolean))].sort();
      const q = (k,v) => { const n = new URLSearchParams(params); v ? n.set(k,v) : n.delete(k); const s = n.toString(); return '/photos' + (s?'?'+s:''); };
      const catObj = D.categories.find(c => c.name === cat);
      return `
      <header class="page-head"><span class="eyebrow">Photographs</span><h1 class="h1">${esc(cat || 'Every frame, by hand.')}</h1>
        <p class="lede">${esc(catObj ? catObj.description : 'Street, scenic, and portrait work from Okinawa, Tokyo, and New York. Shot on my own cameras, never generated.')}</p></header>
      <div class="filters">
        <div class="pills" role="tablist">
          <a class="pill ${!cat?'on':''}" href="${q('c','')}" data-link data-keep>All</a>
          ${D.categories.map(c=>`<a class="pill ${cat===c.name?'on':''}" href="${q('c',c.name)}" data-link data-keep>${esc(c.name)}</a>`).join('')}
        </div>
        <div class="selects">
          <select class="select" aria-label="Location" data-filter="l"><option value="">Any place</option>${locs.map(l=>`<option ${loc===l?'selected':''}>${esc(l)}</option>`).join('')}</select>
          <select class="select" aria-label="Camera" data-filter="cam"><option value="">Any camera</option>${cams.map(c=>`<option ${cam===c?'selected':''} value="${esc(c)}">${esc(c)}</option>`).join('')}</select>
        </div>
        <span class="count">${list.length} of ${D.photos.length}</span>
      </div>
      ${list.length ? `${masonry(list,(p,i)=>`
        <button class="tile" data-lb="${i}" aria-label="Open ${esc(p.title)}">
          <div class="ph" style="aspect-ratio:${p.image.ratio}"><img src="${p.image.thumb}" alt="${esc(p.alt)}" loading="lazy" decoding="async" onload="this.classList.add('ok')"></div>
          ${cap(i+1, prettyTitle(p.title), p.location)}
        </button>`)}` : `<p class="lede">Nothing matches those filters yet. <a href="/photos" data-link style="border-bottom:1px solid">Show all</a></p>`}`;
    },

    projects() {
      return `
      <header class="page-head"><span class="eyebrow">Projects</span><h1 class="h1">Things I've built.</h1>
        <p class="lede">Sites and experiments, built with AI as a tool and my own judgment as the guide.</p></header>
      <div class="plist">${D.projects.map((p,i)=>`
        <a class="prow" href="/projects/${p.slug}" data-link>
          <span class="num">${pad(i+1)}</span>${img(p.image,p.title)}
          <div><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p><div class="chips">${(p.tags.length?p.tags:p.category.split(/,\s*/)).map(t=>`<span class="chip">${esc(t)}</span>`).join('')}</div></div>
          <div class="yr">${esc(p.year)}<br>${esc(p.type)}</div>
        </a>`).join('')}</div>`;
    },

    project(slug) {
      const p = D.projects.find(x => x.slug === slug); if (!p) return notFound();
      const host = (p.url||'').replace(/^https?:\/\//,'').replace(/\/$/,'');
      return `
      <a class="back" href="/projects" data-link>${icon.back} Projects</a>
      <header class="page-head" style="padding-top:24px"><span class="eyebrow">${esc(p.type)} · ${esc(p.year)}</span><h1 class="h1">${esc(p.title)}</h1><p class="lede">${esc(p.summary)}</p></header>
      <div class="frame"><div class="bar"><i></i><i></i><i></i><span>${esc(host)}</span></div>${p.image?`<img src="${p.image.src}" alt="${esc(p.title)}">`:''}</div>
      <div class="detail">
        <div class="prose">${paras(p.description)}</div>
        <aside class="facts"><dl>
          <div><dt>Year</dt><dd>${esc(p.year)}</dd></div>
          <div><dt>Type</dt><dd>${esc(p.type)}</dd></div>
          <div><dt>Category</dt><dd>${esc(p.category)}</dd></div>
          ${p.tags.length?`<div><dt>Built with</dt><dd>${p.tags.map(esc).join(', ')}</dd></div>`:''}
        </dl>${p.url?`<a class="btn solid" href="${esc(p.url)}" target="_blank" rel="noopener">Visit ${esc(host)} ${icon.out}</a>`:''}</aside>
      </div>`;
    },

    music() {
      const t = NOW || D.music.find(m => m.featured) || D.music[0];
      return `
      <header class="page-head"><span class="eyebrow">Music</span><h1 class="h1">Journal entries, turned into songs.</h1>
        <p class="lede">I write from my own notes and life, then use AI to produce the tracks. Listen here, or find the releases on Spotify and Apple Music.</p></header>
      <section class="np" id="np">
        ${img(t.cover, t.title, '', true)}
        <div><span class="eyebrow">Now playing · ${esc(t.genre)}</span><h2>${esc(t.title)}</h2><div class="sub">${esc(t.year)}${t.tools.length?' · '+t.tools.map(esc).join(', '):''}</div>
          ${wave(t)}
          <div class="acts"><button class="btn solid" data-play="${t.slug}" id="npBtn">${icon.play} Play</button>
          ${t.spotify?`<a class="btn" href="${esc(t.spotify)}" target="_blank" rel="noopener">${icon.spotify} Spotify</a>`:''}
          ${t.apple?`<a class="btn" href="${esc(t.apple)}" target="_blank" rel="noopener">${icon.apple} Apple Music</a>`:''}
          <a class="btn" href="/music/${t.slug}" data-link>About the song</a></div></div>
      </section>
      <section class="tracks">${D.music.map((m,i)=>`
        <div class="tr ${NOW&&NOW.slug===m.slug?'on':''}" data-track="${m.slug}">
          <span class="num">${pad(i+1)}</span>
          <a href="/music/${m.slug}" data-link>${img(m.cover, m.title)}</a>
          <a class="ti" href="/music/${m.slug}" data-link>${esc(m.title)}<small>${esc(m.genre)} · ${esc(m.year)}</small></a>
          <span class="links">${m.spotify?`<a href="${esc(m.spotify)}" target="_blank" rel="noopener">Spotify</a>`:''}${m.apple?`<a href="${esc(m.apple)}" target="_blank" rel="noopener">Apple</a>`:''}</span>
          <span class="du">${mmss(m.duration)}</span>
          <button class="play" data-play="${m.slug}" aria-label="Play ${esc(m.title)}">${icon.play}</button>
        </div>`).join('')}</section>`;
    },

    song(slug) {
      const m = D.music.find(x => x.slug === slug); if (!m) return notFound();
      return `
      <a class="back" href="/music" data-link>${icon.back} Music</a>
      <section class="np" style="margin-top:24px">${img(m.cover, m.title, '', true)}
        <div><span class="eyebrow">${esc(m.genre)} · ${esc(m.year)}</span><h2>${esc(m.title)}</h2>
          <div class="acts"><button class="btn solid" data-play="${m.slug}">${icon.play} Play</button>
          ${m.spotify?`<a class="btn" href="${esc(m.spotify)}" target="_blank" rel="noopener">${icon.spotify} Spotify</a>`:''}
          ${m.apple?`<a class="btn" href="${esc(m.apple)}" target="_blank" rel="noopener">${icon.apple} Apple Music</a>`:''}</div>${wave(m)}</div>
      </section>
      <div class="detail">
        <div class="prose">${paras(m.description)}${m.inspiration?`<h3 class="h2" style="margin:1.6em 0 .6em">Inspiration</h3>${paras(m.inspiration)}`:''}${m.lyrics?`<h3 class="h2" style="margin:1.6em 0 .6em">Lyrics</h3><div class="lyrics">${esc(m.lyrics)}</div>`:''}</div>
        <aside class="facts"><dl>
          <div><dt>Genre</dt><dd>${esc(m.genre)}</dd></div><div><dt>Year</dt><dd>${esc(m.year)}</dd></div>
          ${m.tools.length?`<div><dt>Made with</dt><dd>${m.tools.map(esc).join(', ')}</dd></div>`:''}
          <div><dt>Words and direction</dt><dd>Thomas Alan</dd></div>
        </dl></aside>
      </div>`;
    },

    art() {
      return `
      <header class="page-head"><span class="eyebrow">Art</span><h1 class="h1">Digital art, made with AI.</h1>
        <p class="lede">Generative and AI-assisted pieces. The ideas, direction, and edits are mine; the tools render them.</p></header>
      ${masonry(D.art,(a,i)=>`<a class="tile" href="/art/${a.slug}" data-link><div class="ph" style="aspect-ratio:${a.image.ratio}"><img src="${a.image.thumb}" alt="${esc(a.title)}" loading="lazy" onload="this.classList.add('ok')"></div>${cap(i+1,a.title,a.year)}</a>`)}`;
    },

    artwork(slug) {
      const a = D.art.find(x => x.slug === slug); if (!a) return notFound();
      return `<a class="back" href="/art" data-link>${icon.back} Art</a>
      <header class="page-head" style="padding-top:24px"><span class="eyebrow">Art · ${esc(a.year)}</span><h1 class="h1">${esc(a.title)}</h1></header>
      <img src="${a.image.src}" alt="${esc(a.title)}" style="max-height:80vh;margin:0 auto">
      <div class="detail"><div class="prose">${paras(a.description)}${a.prompt?`<p style="color:var(--muted)"><i>Prompt:</i> ${esc(a.prompt)}</p>`:''}</div>
        <aside class="facts"><dl>${a.tools.length?`<div><dt>Made with</dt><dd>${a.tools.map(esc).join(', ')}</dd></div>`:''}
        ${a.tags.length?`<div><dt>Tags</dt><dd>${a.tags.map(esc).join(', ')}</dd></div>`:''}<div><dt>Direction</dt><dd>Thomas Alan</dd></div></dl></aside></div>`;
    },

    gear() {
      return `
      <header class="page-head"><span class="eyebrow">Gear</span><h1 class="h1">The cameras behind the photographs.</h1>
        <p class="lede">A collection built over the years, from a Nikon D2x to the Sony RX1R III. Tap one to see what I've made with it.</p></header>
      <div class="gear">${D.cameras.map((c,i)=>gearCard(c,i)).join('')}</div>`;
    },

    camera(slug) {
      const c = camBySlug(slug); if (!c) return notFound();
      const ps = c.photos.map(photoById), g = c.gear_image;
      return `<a class="back" href="/gear" data-link>${icon.back} Gear</a>
      <section class="cam-top">
        ${g ? `<figure>${img(g, `The ${c.body}`, 'prod', true)}<figcaption>Camera photo: ${esc(g.credit)}, <a href="${esc(g.source)}" target="_blank" rel="noopener">${esc(g.license)}</a>, via Wikimedia Commons</figcaption></figure>` : `<div class="type">${esc(c.body)}</div>`}
        <header class="page-head"><span class="eyebrow">Camera</span><h1 class="h1">${esc(c.body)}</h1>${c.lens?`<p class="lede">${esc(c.lens)}</p>`:''}
        <p class="meta">${ps.length ? `${ps.length} photograph${ps.length>1?'s':''} on the site` : 'In the collection'}</p>
        <div class="links-row">${c.amazon?`<a class="btn solid" href="${esc(c.amazon)}" target="_blank" rel="sponsored noopener">View on Amazon ${icon.out}</a>`:''}
        ${ps.length?`<a class="btn" href="/photos?cam=${encodeURIComponent(c.name)}" data-link>Filter photographs</a>`:''}</div></header>
      </section>
      ${ps.length?`<section class="sec"><div class="sec-head"><span class="eyebrow">Shot on this camera</span></div><div class="strip">${ps.map((p,i)=>`<a href="/photos?cam=${encodeURIComponent(c.name)}#${p.id}" data-link>${img(p.image,p.alt)}${cap(i+1,prettyTitle(p.title),p.location)}</a>`).join('')}</div></section>`
      : `<p class="lede">No photographs from this one on the site yet.</p>`}`;
    },

    about() {
      const a = D.about;
      return `
      <section class="about-top">
        ${img(a.portrait, a.name, '', true)}
        <div><span class="eyebrow">About</span><h1 class="h1">${esc(a.name)}</h1><p class="lede">${esc(a.subtitle)}</p>
          <div class="prose" style="margin-top:28px">${paras(a.content)}</div>
          <div class="links-row"><a class="btn solid" href="${esc(a.linkedin)}" target="_blank" rel="noopener">${icon.linkedin} LinkedIn</a>
          <a class="btn" href="${esc(a.writing)}" target="_blank" rel="noopener">Writing ${icon.out}</a></div></div>
      </section>
      <section class="sec">
        <div class="sec-head" style="border:0;padding:0"><span class="eyebrow">How I use AI</span></div>
        <p class="lede" style="color:var(--fg);margin:0 0 30px">I use AI as the tool, but not everything on my website is made with AI.</p>
        <div class="ai">
          <div><span class="tag hand">Made by hand</span><h3>Photography</h3><p>Every photograph here was taken by me, on my own cameras. Nothing is generated.</p></div>
          <div><span class="tag">Made with AI</span><h3>Music and digital art</h3><p>The words, ideas, and direction come from me. AI renders the sound and image, and I edit until it feels honest.</p></div>
          <div><span class="tag">Built with AI</span><h3>Apps and sites</h3><p>I design and direct the builds, using AI as a coding partner. This site included.</p></div>
        </div>
      </section>`;
    }
  };
  function gearCard(c, i) {
    const g = c.gear_image;
    return `<a class="gcard" href="/gear/${c.slug}" data-link>
      <span class="num">${pad(i+1)}</span><h3>${esc(c.body)}</h3><div class="lens">${esc(c.lens || '\u00a0')}</div>
      ${g ? img(g, `The ${c.body}`, 'prod') : `<div class="type">${esc(c.body)}</div>`}
      <div class="foot2"><span>${c.photos.length ? `${c.photos.length} photograph${c.photos.length>1?'s':''}` : 'In the collection'}</span>${c.amazon?'<span>Amazon ↗</span>':''}</div></a>`;
  }
  const notFound = () => `<header class="page-head"><span class="eyebrow">404</span><h1 class="h1">That page wandered off.</h1><p class="lede"><a href="/" data-link style="border-bottom:1px solid">Back home</a></p></header>`;

  /* ---------- router ---------- */
  let PHOTO_SET = [];
  const titles = {home:'Thomas Alan',photos:'Photographs',projects:'Projects',music:'Music',art:'Art',gear:'Gear',about:'About'};
  function route(scroll = true) {
    const u = new URL(location.href), parts = u.pathname.split('/').filter(Boolean);
    const [a, b] = parts; let html, tab = a || 'home', title;
    if (!a) html = views.home();
    else if (a === 'photos' || a === 'photography') { html = views.photos(u.searchParams); tab='photos'; }
    else if (a === 'projects') { html = b ? views.project(b) : views.projects(); title = b && D.projects.find(x=>x.slug===b)?.title; }
    else if (a === 'music') { html = b ? views.song(b) : views.music(); title = b && D.music.find(x=>x.slug===b)?.title; }
    else if (a === 'art' || a === 'genart') { html = b ? views.artwork(b) : views.art(); tab='art'; title = b && D.art.find(x=>x.slug===b)?.title; }
    else if (a === 'gear') { html = b ? views.camera(b) : views.gear(); title = b && camBySlug(b)?.name; }
    else if (a === 'about') html = views.about();
    else html = notFound();
    main.innerHTML = html; $$('img',main).forEach(i=>{ if(i.complete&&i.naturalWidth) i.classList.add('ok'); }); main.classList.remove('enter'); void main.offsetWidth; main.classList.add('enter'); if (window.VIZ_READY) VIZ.draw();
    document.title = (title ? title + ' · ' : (titles[tab] && tab!=='home' ? titles[tab] + ' · ' : '')) + 'Thomas Alan';
    $$('.nav a, .tabs a').forEach(l => { const p = new URL(l.href).pathname.split('/')[1] || 'home'; l.classList.toggle('on', p === tab); });
    $('#menuSheet').hidden = true; $('#menuBtn').setAttribute('aria-expanded','false');
    if (scroll) window.scrollTo(0, 0);
    syncPlayerUI();
    if (tab === 'photos' && u.hash) { const i = PHOTO_SET.findIndex(p => p.id === u.hash.slice(1)); if (i > -1) openLB(i); }
    if (window.fathom) fathom.trackPageview();
  }
  function go(href, keepScroll) { history.pushState({}, '', href); route(!keepScroll); }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-link]');
    if (a && !e.metaKey && !e.ctrlKey && a.origin === location.origin) { e.preventDefault(); go(a.getAttribute('href'), a.hasAttribute('data-keep')); return; }
    const pl = e.target.closest('[data-play]'); if (pl) { playSlug(pl.dataset.play); return; }
    const lb = e.target.closest('[data-lb]'); if (lb) { openLB(+lb.dataset.lb); }
  });
  document.addEventListener('change', e => {
    const s = e.target.closest('[data-filter]'); if (!s) return;
    const u = new URL(location.href); s.value ? u.searchParams.set(s.dataset.filter, s.value) : u.searchParams.delete(s.dataset.filter); u.hash='';
    go(u.pathname + u.search, true);
  });
  let lastCols = ncols(); addEventListener('resize', () => { const n = ncols(); if (n !== lastCols && $('.masonry')) { lastCols = n; const y = scrollY; route(false); scrollTo(0, y); } lastCols = n; });
  addEventListener('popstate', () => { if (!$('#lb').hidden) closeLB(true); route(false); });

  /* ---------- theme & menu ---------- */
  $('#themeBtn').onclick = () => {
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    const cur = document.documentElement.dataset.theme; const isDark = cur === 'dark' || (cur === 'auto' && dark);
    const next = isDark ? 'light' : 'dark'; document.documentElement.dataset.theme = next; localStorage.setItem('theme', next);
  };
  $('#menuBtn').onclick = () => { const s = $('#menuSheet'); s.hidden = !s.hidden; $('#menuBtn').setAttribute('aria-expanded', String(!s.hidden)); };

  /* ---------- lightbox ---------- */
  const lb = $('#lb'), lbImg = $('#lbImg'); let li = 0;
  function showLB() {
    const p = PHOTO_SET[li]; if (!p) return;
    lbImg.style.opacity = 0; lbImg.onload = () => lbImg.style.opacity = 1; lbImg.src = p.image.src; lbImg.alt = p.alt;
    const cam = camByName(p.camera);
    $('#lbInfo').innerHTML = `<span class="t">${esc(prettyTitle(p.title))}</span>
      ${p.camera?`<span><span class="k">Camera</span>${cam?`<a href="/gear/${cam.slug}" data-link>${esc(p.camera)}</a>`:esc(p.camera)}</span>`:''}
      ${p.location?`<span><span class="k">Place</span>${esc(p.location)}</span>`:''}
      ${p.category?`<span><span class="k">Series</span>${esc(p.category)}</span>`:''}
      <span class="n">${pad(li+1)} / ${pad(PHOTO_SET.length)}</span>
      ${p.caption && p.caption !== p.title ? `<p class="c">${esc(p.caption)}</p>`:''}`;
    [PHOTO_SET[li+1], PHOTO_SET[li-1]].forEach(n => { if (n) new Image().src = n.image.src; });
  }
  function openLB(i) { li = i; lb.hidden = false; document.body.style.overflow = 'hidden'; showLB(); history.replaceState({}, '', location.pathname + location.search + '#' + PHOTO_SET[i].id); }
  function closeLB(silent) { lb.hidden = true; document.body.style.overflow = ''; if (!silent) history.replaceState({}, '', location.pathname + location.search); }
  const step = d => { li = (li + d + PHOTO_SET.length) % PHOTO_SET.length; showLB(); history.replaceState({}, '', location.pathname + location.search + '#' + PHOTO_SET[li].id); };
  $('#lbClose').onclick = () => closeLB(); $('#lbPrev').onclick = () => step(-1); $('#lbNext').onclick = () => step(1);
  lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lb-fig')) closeLB(); if (e.target.closest('#lbInfo a')) closeLB(true); });
  addEventListener('keydown', e => { if (lb.hidden) return; if (e.key === 'Escape') closeLB(); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });
  let sx = 0, sy = 0;
  lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, {passive:true});
  lb.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1); else if (dy > 90) closeLB(); }, {passive:true});

  /* ---------- persistent player ---------- */
  const audio = $('#audio'), player = $('#player'); let NOW = null;
  function playSlug(slug) {
    const m = D.music.find(x => x.slug === slug); if (!m || !m.audio) return;
    if (NOW && NOW.slug === slug) { audio.paused ? audio.play() : audio.pause(); return; }
    NOW = m; audio.src = m.audio; audio.play().catch(()=>{});
    $('#plImg').src = m.cover ? m.cover.thumb : ''; $('#plTitle').textContent = m.title; $('#plSub').textContent = m.genre + ' · Thomas Alan';
    player.hidden = false;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: m.title, artist: 'Thomas Alan', album: 'Parametra Music', artwork: m.cover ? [{src: m.cover.src, sizes: '1200x1200', type: 'image/jpeg'}] : [] });
      navigator.mediaSession.setActionHandler('nexttrack', next); navigator.mediaSession.setActionHandler('previoustrack', () => nextBy(-1));
    }
    if (location.pathname === '/music') { const y = scrollY; main.innerHTML = views.music(); scrollTo(0, y); }
    VIZ.kick();
    syncPlayerUI();
  }
  const nextBy = d => { const i = D.music.indexOf(NOW); playSlug(D.music[(i + d + D.music.length) % D.music.length].slug); };
  const next = () => nextBy(1);
  function syncPlayerUI() {
    const playing = NOW && !audio.paused;
    player.classList.toggle('playing', !!playing);
    $('#plToggle').setAttribute('aria-label', playing ? 'Pause' : 'Play');
    $$('[data-play]').forEach(b => { const on = NOW && b.dataset.play === NOW.slug && playing;
      b.innerHTML = b.classList.contains('play') ? (on ? '<span class="eq"><i></i><i></i><i></i></span>' : icon.play)
        : (on ? `${icon.pause} Pause` : `${icon.play} Play`); });
    $$('.tr').forEach(r => r.classList.toggle('on', !!NOW && r.dataset.track === NOW.slug));
  }
  $('#plToggle').onclick = () => { if (!NOW) return; audio.paused ? audio.play() : audio.pause(); };
  $('#plNext').onclick = next;
  $('#plOpen').onclick = () => NOW && go('/music/' + NOW.slug);
  audio.addEventListener('play', syncPlayerUI); audio.addEventListener('pause', syncPlayerUI); audio.addEventListener('ended', next);
  audio.addEventListener('timeupdate', () => {
    const p = audio.duration ? audio.currentTime / audio.duration : 0; $('#plProg').style.width = (p * 100) + '%';
    if (!VIZ.raf) VIZ.draw();
  });

  /* ---------- visualizer: song waveform scrubber + mini-player bars ----------
     Driven by a precomputed beat envelope (/media/audio/<slug>.viz.txt: 4 bands x 20 fps),
     so the audio element is never routed through Web Audio (keeps iOS lock-screen playback intact). */
  const VIZ = (() => {
    const B36 = '0123456789abcdefghijklmnopqrstuvwxyz', env = {}, lvl = [0,0,0,0];
    const still = matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;
    const load = slug => { if (env[slug] !== undefined) return; env[slug] = null;
      fetch(`/media/audio/${slug}.viz.txt`).then(r => r.ok ? r.text() : '').then(t => { env[slug] = t || ''; }).catch(() => {}); };
    const sample = () => { const e = NOW && env[NOW.slug]; if (!e) return [0,0,0,0];
      const i = Math.min(Math.floor(audio.currentTime * 20), e.length / 4 - 1) * 4;
      return [0,1,2,3].map(k => B36.indexOf(e[i + k]) / 35); };
    const size = c => { const r = devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
      if (c.width !== Math.round(w * r) || c.height !== Math.round(h * r)) { c.width = Math.round(w * r); c.height = Math.round(h * r); }
      const x = c.getContext('2d'); x.setTransform(r, 0, 0, r, 0, 0); x.clearRect(0, 0, w, h); return [x, w, h]; };
    function drawWave(el, fg, playing) {
      const m = D.music.find(x => x.slug === el.dataset.wave); if (!m || !m.peaks) return;
      const on = NOW && NOW.slug === m.slug, p = on && audio.duration ? audio.currentTime / audio.duration : 0;
      const [x, w, h] = size(el.querySelector('canvas')), n = m.peaks.length, bw = w / n, ph = p * n;
      x.fillStyle = fg;
      for (let i = 0; i < n; i++) {
        let v = .1 + m.peaks[i] / 99 * .9;
        if (on && playing && !still.matches && i < ph) { const d = ph - i; v *= 1 + (lvl[0] * .55 + lvl[1] * .25) * Math.exp(-d / 5); }
        const bh = Math.max(2, Math.min(h, v * h * .82));
        x.globalAlpha = i < ph ? 1 : .24; x.fillRect(i * bw + bw * .22, (h - bh) / 2, Math.max(1, bw * .56), bh);
      }
      x.globalAlpha = 1;
      if (on) { el.querySelector('.wv-t b').textContent = mmss(audio.currentTime); el.setAttribute('aria-valuenow', Math.round(audio.currentTime)); }
      else el.querySelector('.wv-t b').textContent = '0:00';
    }
    function drawBars(fg, playing) {
      const c = $('#plViz'); if (!c || player.hidden) return; const [x, w, h] = size(c);
      const v = [lvl[1], lvl[0], (lvl[1] + lvl[2]) / 2, lvl[2], lvl[3]], bw = w / 5; x.fillStyle = fg;
      v.forEach((a, i) => { const bh = playing && !still.matches ? 3 + a * (h - 3) : 3 + [.3,.6,.45,.5,.25][i] * (h - 3) * (playing ? 1 : .5);
        x.fillRect(i * bw + bw * .2, h - bh, bw * .6, bh); });
    }
    function draw() {
      const playing = NOW && !audio.paused, s = sample();
      for (let k = 0; k < 4; k++) lvl[k] = s[k] > lvl[k] ? lvl[k] + (s[k] - lvl[k]) * .6 : lvl[k] * .86 + s[k] * .14;
      const fg = getComputedStyle(document.documentElement).getPropertyValue('--fg').trim() || '#1b1b1a';
      $$('.wv').forEach(el => drawWave(el, fg, playing)); drawBars(fg, playing);
    }
    function loop() { draw(); raf = (NOW && !audio.paused && !document.hidden) ? requestAnimationFrame(loop) : 0; }
    const kick = () => { if (NOW) load(NOW.slug); if (!raf) loop(); };
    // seek by tap/drag on any waveform; starts that song if it isn't playing
    let dragEl = null, pending = null;
    const applyPending = () => { if (pending !== null && isFinite(audio.duration) && audio.duration > 0) { audio.currentTime = pending * audio.duration; pending = null; } };
    ['loadedmetadata','canplay','playing','durationchange'].forEach(ev => audio.addEventListener(ev, applyPending));
    const seekTo = (el, clientX) => { const r = el.getBoundingClientRect(), f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      const slug = el.dataset.wave;
      if (!NOW || NOW.slug !== slug) { pending = f; playSlug(slug); }
      else if (audio.duration) { audio.currentTime = f * audio.duration; if (audio.paused) audio.play().catch(()=>{}); }
      draw(); };
    document.addEventListener('pointerdown', e => { const el = e.target.closest('.wv'); if (!el) return; dragEl = el; seekTo(el, e.clientX); });
    document.addEventListener('pointermove', e => { if (dragEl && e.buttons) { e.preventDefault(); seekTo(dragEl, e.clientX); } });
    document.addEventListener('pointerup', () => { dragEl = null; });
    document.addEventListener('keydown', e => { const el = e.target.closest && e.target.closest('.wv'); if (!el || !NOW || NOW.slug !== el.dataset.wave) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); audio.currentTime = Math.max(0, audio.currentTime + (e.key === 'ArrowRight' ? 5 : -5)); draw(); } });
    ['play','seeked','loadedmetadata'].forEach(ev => audio.addEventListener(ev, kick));
    audio.addEventListener('pause', draw);
    document.addEventListener('visibilitychange', kick);
    addEventListener('resize', draw);
    return { draw, get raf() { return raf; }, kick };
  })();

  /* ---------- boot ---------- */
  $('#yr').textContent = new Date().getFullYear();
  fetch('/data/site.json').then(r => r.json()).then(d => {
    D = d;
    if (D.cameras.some(c => c.amazon)) $('#disclosure').hidden = false;
    window.VIZ_READY = true; route(false);
  });
  if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(()=>{}));
})();
