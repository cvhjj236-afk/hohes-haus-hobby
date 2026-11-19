
(() => {
  const ROM = { I: 1, V: 5, X: 10, L: 50 };
  const rom = (s) => { let n = 0; for (let i = 0; i < s.length; i++) { const a = ROM[s[i]], b = ROM[s[i + 1]] || 0; n += a < b ? -a : a; } return n; };
  // Klubfarben, wie sie das Parlament in seinen Open-Data-Abstimmungsdaten (content/vote) verwendet.
  // Vorgängerparteien in der Farbe der Nachfolgepartei.
  const KLUBFARBE = { 'ÖVP': '#62C3D0', 'SPÖ': '#FF0000', 'FPÖ': '#0052FB', 'GRÜNE': '#69B12E', 'NEOS': '#E3257B',
    'BZÖ': '#FF8D04', 'LIF': '#B0D8F3', 'Team Stronach': '#F8E924', 'JETZT': '#C8C8C8',
    'CSP': '#62C3D0', 'SDAP': '#FF0000', 'WdU': '#0052FB' };
  const farbe = (k) => KLUBFARBE[k] || 'var(--cds-chart-muted)';
  const fmt = d3.format(',');
  const fmtDe = (n) => fmt(n).replace(/,/g, '.');
  const pct = (x) => (x * 100).toFixed(1).replace('.', ',') + ' %';
  const DAY = 86400000;

  window.JA = { rom, farbe, fmtDe, pct, KLUBFARBE };
  const typ = () => { const t = dash.params().typ; return t === 'A' || t === 'P' ? t : 'J'; };
  const LABELS = {
    J: { titel: 'Schriftliche Anfragen im Nationalrat', einheit: 'Anfragen', einheit1: 'Anfrage', datum: 'Datum (Einlangen)',
      d3: 'Ressort', d3p: 'Ressorts', d3f: 'Ressort (Adressat)', d3alle: 'Alle Ressorts', d4: 'Minister:in', d4p: 'Minister:innen', d4f: 'Minister:in (Adressat)', d4alle: 'Alle Minister:innen',
      kB: 'Beantwortet', kD: 'Beantwortungsdauer (Median)', kDsub: 'Einlangen bis Beantwortung', kO: 'Noch offen', kOsub: 'ohne schriftliche Beantwortung',
      quote: 'beantwortet', adrTitel: 'Adressaten', adrName: 'Adressat', elTitel: 'Einzelne Anfragen', elAdr: 'Adressat',
      elNote: 'Alle Anfragen der aktuellen Auswahl, neueste zuerst. Nummer und Beantwortung verlinken auf parlament.gv.at.',
      klubNote: 'Gemeinsame Anfragen zählen bei jedem beteiligten Klub. Klick filtert.', themaNote: 'Eine Anfrage kann mehreren Themen zugeordnet sein. Klick filtert.',
      fuss: 'Quelle: Parlament Österreich, Open Data (Filter-API Liste 101 und Detailseiten ?json=true), Lizenz CC BY 4.0. Für die V. bis XVIII. GP sind in den Quelldaten weder Klub noch Adressat erfasst (nur gescanntes Original); diese Anfragen erscheinen in Klub- und Adressaten-Auswertungen als „ohne Angabe“ bzw. gar nicht. Mehrfachzuordnungen (Klubs, Themen) werden je Kategorie gezählt.' },
    A: { titel: 'Selbständige Gesetzesanträge im Nationalrat', einheit: 'Anträge', einheit1: 'Antrag', datum: 'Datum (Einbringung)',
      d3: 'Ausschuss', d3p: 'Ausschüsse', d3f: 'Ausschuss', d3alle: 'Alle Ausschüsse', d4: 'Ergebnis', d4p: 'Ergebnisse', d4f: 'Ergebnis', d4alle: 'Alle Ergebnisse',
      kB: 'Beschlossen im NR', kD: 'Dauer bis Beschluss (Median)', kDsub: 'Einbringung bis Beschluss im Nationalrat', kO: 'In Behandlung', kOsub: 'noch nicht erledigt (laufende GP)',
      quote: 'beschlossen', adrTitel: 'Ausschüsse und Ergebnis', adrName: 'Ausschuss', elTitel: 'Einzelne Anträge', elAdr: 'Ausschuss',
      elNote: 'Alle Anträge der aktuellen Auswahl, neueste zuerst. Nummer und Beschluss verlinken auf parlament.gv.at.',
      klubNote: 'Gemeinsame Anträge zählen bei jedem beteiligten Klub. Klick filtert.', themaNote: 'Ein Antrag kann mehreren Themen zugeordnet sein. Klick filtert.',
      fuss: 'Quelle: Parlament Österreich, Open Data (Filter-API Liste 101, DOKTYP A, und Detailseiten ?json=true), Lizenz CC BY 4.0. Selbständige Gesetzesanträge von Abgeordneten ab der XX. GP; für frühere Perioden enthalten die Quelldaten weder Status noch Klub. „Beschlossen“: Beschluss im Nationalrat bzw. Kundmachung im BGBl. „Verfallen“: mit Ende der GP unerledigt, unterschieden danach, ob der Antrag im Ausschuss auf der Tagesordnung stand. Ausschüsse nach damaliger Bezeichnung. Mehrfachzuordnungen (Klubs, Themen) werden je Kategorie gezählt.' }
  };
  LABELS.P = { ...LABELS.J, titel: 'Abgeordnete zum Nationalrat', einheit: 'Abgeordnete', einheit1: 'Abgeordnete:r',
    d3: 'Bundesland', d3p: 'Bundesländer', d3f: 'Bundesland (Wahlkreis)', d3alle: 'Alle Bundesländer', d4: 'Geschlecht', d4p: 'Geschlechter', d4f: 'Geschlecht', d4alle: 'Alle',
    klubNote: '', themaNote: '',
    fuss: 'Quelle: Parlament Österreich, Open Data (Parlamentarier:innen ab 1918, Filter-API Liste 409, und Personenseiten ?json=true), Lizenz CC BY 4.0. Nur Mandate im Nationalrat (ohne Provisorische und Konstituierende Nationalversammlung). Zusammensetzung „zu Beginn“ zum zweiten Tag der GP. Klubs nach Klubbezeichnung im Mandat; Klubfarben wie in den Abstimmungsdaten des Parlaments; Vorgängerparteien (CSP, SDAP, WdU) in der Farbe der Nachfolgepartei, sonstige Klubs grau. Geschlecht wie in der Quelle (männlich/weiblich). Aktivität: Anfragen und Gesetzesanträge, bei denen die Person zum Zeitpunkt der Einbringung ein aktives NR-Mandat hatte (befragte Regierungsmitglieder sind so ausgeschlossen); Anfragen ab der XIX., Anträge ab der XX. GP. Bildung und Beruf halbautomatisch aus Bildungsweg und beruflichem Werdegang der Personenseiten kategorisiert (Schlagwortregeln); höchster Abschluss: Hochschule, Matura, Lehre/Fachschule, Pflichtschule. Ist als Tätigkeit nur ein politisches Amt angegeben, zählt der zuletzt genannte andere Beruf im Werdegang.' };
  window.JA.typ = typ;
  window.JA.T = () => LABELS[typ()];

  dash.onData(() => {
    const f = dash.data('fortschritt'), box = document.getElementById('fortschritt');
    const r = f.status === 'ok' && f.data && f.data[0];
    if (!r) { box.hidden = true; return; }
    const g = Number(r.geladen), t = Number(r.gesamt);
    box.hidden = !(t > 0 && g < t);
    if (box.hidden) return;
    const st = new Date(r.stand);
    document.getElementById('prog-text').textContent = 'Detaildaten: ' + fmtDe(g) + ' von ' + fmtDe(t) + ' Anfragen geladen · Stand ' + st.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' }) + ' Uhr';
    document.getElementById('prog-pct').textContent = pct(g / t);
    const fl = document.getElementById('prog-fl'); fl.style.width = (g / t * 100) + '%'; fl.style.background = dash.colors[0];
  });

  let prepared = null;
  const prepare = () => {
    const t = typ();
    if (t === 'P') return null;
    const a = dash.data(t === 'A' ? 'antraege' : 'anfragen'), s = t === 'A' ? { status: 'ok', data: null } : dash.data('schluessel');
    if (a.status !== 'ok' || s.status !== 'ok') return null;
    if (prepared && prepared.typ === t && prepared.src === a.data && prepared.ssrc === s.data) return prepared;
    const lk = { thema: new Map(), ressort: new Map(), minister: new Map() };
    if (t === 'J') for (const r of s.data) lk[r.typ] && lk[r.typ].set(String(r.code), r.name);
    const rows = a.data;
    const n = rows.length;
    const tag = new Int32Array(n), gp = new Uint8Array(n), beant = new Uint8Array(n), dauer = new Int32Array(n);
    const klubs = new Array(n), themen = new Array(n), ressort = new Array(n), minister = new Array(n);
    const inr = new Array(n), ab = new Array(n), frist = new Array(n), gpCode = new Array(n), offen = new Uint8Array(n), pads = new Array(n);
    const gps = new Map();
    for (let i = 0; i < n; i++) {
      const r = rows[i];
      tag[i] = Math.floor(Date.parse(r.datum) / DAY);
      const g = rom(r.gp); gp[i] = g; if (!gps.has(g)) gps.set(g, { code: r.gp, min: tag[i], max: tag[i] });
      const gg = gps.get(g); if (tag[i] < gg.min) gg.min = tag[i]; if (tag[i] > gg.max) gg.max = tag[i];
      klubs[i] = r.klubs ? r.klubs.split('|') : ['ohne Angabe'];
      themen[i] = r.themen ? String(r.themen).split('|') : [];
      const v3 = t === 'A' ? r.ausschuss : r.ressort, v4 = t === 'A' ? r.ergebnis : r.minister;
      ressort[i] = v3 === '' || v3 == null ? '' : String(v3);
      minister[i] = v4 === '' || v4 == null ? '' : String(v4);
      beant[i] = Number(t === 'A' ? r.beschlossen : r.beantwortet) === 1 ? 1 : 0;
      dauer[i] = r.dauer === '' || r.dauer == null ? -1 : Number(r.dauer);
      inr[i] = String(r.inr ?? ''); ab[i] = String((t === 'A' ? r.bnr : r.ab) ?? ''); frist[i] = t === 'A' ? '' : String(r.frist ?? ''); gpCode[i] = r.gp;
      pads[i] = r.pads ? String(r.pads).split('|') : [];
      offen[i] = t === 'A' ? (minister[i] === 'In Behandlung' ? 1 : 0) : (beant[i] ? 0 : 1);
      if (t === 'A') { for (const x of themen[i]) lk.thema.set(x, x); if (ressort[i]) lk.ressort.set(ressort[i], ressort[i]); if (minister[i]) lk.minister.set(minister[i], minister[i]); }
    }
    const gpList = [...gps.entries()].sort((x, y) => x[0] - y[0]).map(([num, v]) => ({ num, ...v }));
    const klubList = [...d3.rollup(klubs.flat(), (v) => v.length, (d) => d)].sort((x, y) => y[1] - x[1]).map((d) => d[0]);
    prepared = { typ: t, src: a.data, ssrc: s.data, n, tag, gp, beant, dauer, klubs, themen, ressort, minister, lk, inr, ab, frist, gpCode, offen, pads, gpList, klubList, maxTag: d3.max(tag), minTag: d3.min(tag) };
    return prepared;
  };
  window.JA.prepare = prepare;
  // Werte einer Anfrage in einer Dimension (mehrere möglich bei Klubs und Themen)
  window.JA.werte = (P, i, dim) => dim === 'klub' ? P.klubs[i] : dim === 'thema' ? P.themen[i] : (P[dim][i] ? [P[dim][i]] : []);
  window.JA.name = (P, dim, k) => dim === 'klub' ? k : (P.lk[dim].get(k) || k);
  // Auswahl je Dimension als Liste (Mehrfachauswahl)
  window.JA.liste = (p, dim) => { const v = dim === 'klub' ? p.klubs : p[dim]; return v == null || v === '' ? [] : (Array.isArray(v) ? v : [v]).map(String); };
  window.JA.toggle = (dim, k) => {
    const c = new Set(window.JA.liste(dash.params(), dim)); c.has(k) ? c.delete(k) : c.add(k);
    dash.setParams({ [dim === 'klub' ? 'klubs' : dim]: [...c] });
  };
  Object.defineProperty(window.JA, 'DIMNAME', { get: () => { const T = window.JA.T(); return { klub: 'Klub', thema: 'Thema', ressort: T.d3, minister: T.d4 }; } });

  window.JA.filtered = (P, p, skip = {}) => {
    const gv = p.gpVon ? rom(p.gpVon) : 0, gb = p.gpBis ? rom(p.gpBis) : 99;
    const tv = p.von ? Math.floor(Date.parse(p.von) / DAY) : -1e9, tb = p.bis ? Math.floor(Date.parse(p.bis) / DAY) : 1e9;
    const ks = !skip.klub && p.klubs && p.klubs.length ? new Set(p.klubs) : null;
    const L = (d) => { const a = window.JA.liste(p, d); return !skip[d] && a.length ? new Set(a) : null; };
    const th = L('thema'), rs = L('ressort'), mi = L('minister');
    const gpf = !skip.gp;
    const pers = p.person && p.person.length ? new Set(p.person.map(String)) : null;
    const idx = [];
    for (let i = 0; i < P.n; i++) {
      if (gpf && (P.gp[i] < gv || P.gp[i] > gb)) continue;
      if (P.tag[i] < tv || P.tag[i] > tb) continue;
      if (ks && !P.klubs[i].some((k) => ks.has(k))) continue;
      if (th && !P.themen[i].some((t) => th.has(t))) continue;
      if (rs && !rs.has(P.ressort[i])) continue;
      if (mi && !mi.has(P.minister[i])) continue;
      if (pers && !P.pads[i].some((x) => pers.has(x))) continue;
      idx.push(i);
    }
    return idx;
  };
})();


(() => {
  const { rom, farbe, fmtDe, pct } = window.JA;
  const $ = (s) => document.querySelector(s);
  const P_ = () => dash.params();
  const set = (o) => dash.setParams(o);

  const gpVon = $('.ja-gpvon'), gpBis = $('.ja-gpbis'), von = $('.ja-von'), bis = $('.ja-bis');
  const selT = $('.ja-thema'), selR = $('.ja-ressort'), selM = $('.ja-minister');

  gpVon.addEventListener('change', () => set({ gpVon: gpVon.value || null }));
  gpBis.addEventListener('change', () => set({ gpBis: gpBis.value || null }));
  for (const [el, k] of [[selT, 'thema'], [selR, 'ressort'], [selM, 'minister']])
    el.addEventListener('change', () => { if (el.value !== '__multi') set({ [k]: el.value ? [el.value] : [] }); });
  for (const [el, k] of [[von, 'von'], [bis, 'bis']]) {
    el.addEventListener('change', () => { if (!el.value) set({ [k]: null }); else if (el.validity.valid) set({ [k]: el.value }); });
    el.addEventListener('blur', () => { el.value = P_()[k] ?? ''; });
  }
  $('.ja-reset').addEventListener('click', () => dash.resetParams());
  const seg = (id, key) => {
    $(id).addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) set({ [key]: b.dataset.v }); });
  };
  $('#seg-typ').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]'); if (!b || b.dataset.v === window.JA.typ()) return;
    set({ typ: b.dataset.v, ressort: [], minister: [] });
  });
  seg('#seg-aufl', 'aufl'); seg('#seg-modus', 'modus'); seg('#seg-adr', 'adr'); seg('#seg-hm', 'hm'); seg('#seg-stapel', 'stapel');
  $('#klubchips').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-k]'); if (!b) return;
    const cur = new Set(P_().klubs || []);
    cur.has(b.dataset.k) ? cur.delete(b.dataset.k) : cur.add(b.dataset.k);
    set({ klubs: [...cur] });
  });

  const fillSel = (sel, opts, allLabel, vals) => {
    if (sel === document.activeElement) return;
    const extra = vals.length > 1 ? [new Option(vals.length + ' ausgewählt', '__multi')] : [];
    sel.replaceChildren(new Option(allLabel, ''), ...extra, ...opts.map(([v, l]) => new Option(l, v)));
    sel.value = vals.length > 1 ? '__multi' : (vals[0] ?? '');
  };

  $('#personchips').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-pad]'); if (!b) return;
    set({ person: (P_().person || []).filter((x) => String(x) !== b.dataset.pad) });
  });
  dash.onData(() => {
    const MODE = window.JA.typ();
    const P = MODE === 'P' ? (window.JA.prepareP ? window.JA.prepareP() : null) : window.JA.prepare();
    const p = P_();
    $('#f-datum').hidden = MODE === 'P'; $('#f-thema').hidden = MODE === 'P';
    for (const id of ['#kennzahlen', '#einzelne']) $(id).hidden = MODE === 'P';
    document.querySelector('.ja > .ja-grid').hidden = MODE === 'P';
    $('#personen-ansicht').hidden = MODE !== 'P';
    const pl = p.person || [];
    $('#f-person').hidden = !pl.length || MODE === 'P';
    const pd = dash.data('personen');
    const nm = new Map(pd.status === 'ok' ? pd.data.map((r) => [String(r.pad), r.name]) : []);
    $('#personchips').replaceChildren(...pl.map((x) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ja-chip'; b.dataset.pad = String(x); b.setAttribute('aria-pressed', 'true'); b.textContent = (nm.get(String(x)) || 'Person ' + x) + ' ×'; b.title = 'Personenfilter entfernen'; return b; }));
    const T = window.JA.T();
    $('#seg-typ').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === window.JA.typ())));
    $('#titel').textContent = T.titel; $('#lbl-datum').textContent = T.datum; $('#lbl-d3').textContent = T.d3f; $('#lbl-d4').textContent = T.d4f;
    selR.setAttribute('aria-label', T.d3); selM.setAttribute('aria-label', T.d4);
    $('#k-n-lbl').textContent = T.einheit; $('#k-b-lbl').textContent = T.kB; $('#k-d-lbl').textContent = T.kD; $('#k-d-sub').textContent = T.kDsub; $('#k-o-lbl').textContent = T.kO; $('#k-o-sub').textContent = T.kOsub;
    document.querySelectorAll('.t-d3p').forEach((e) => { e.textContent = T.d3p; }); document.querySelectorAll('.t-d4p').forEach((e) => { e.textContent = T.d4p; });
    document.querySelectorAll('.t-d3').forEach((e) => { e.textContent = T.d3; }); document.querySelectorAll('.t-d4').forEach((e) => { e.textContent = T.d4; });
    document.querySelectorAll('.t-einheit').forEach((e) => { e.textContent = T.einheit; });
    $('#klub-note').textContent = T.klubNote; $('#thema-note').textContent = T.themaNote;
    $('#adr-titel').textContent = T.adrTitel; $('#adr-th-quote').textContent = T.quote;
    $('#el-titel').textContent = T.elTitel; $('#el-note').textContent = T.elNote; $('#el-th-adr').textContent = T.elAdr;
    $('#fusszeile').textContent = T.fuss;
    for (const [id, key] of [['#seg-aufl', 'aufl'], ['#seg-modus', 'modus'], ['#seg-adr', 'adr'], ['#seg-hm', 'hm'], ['#seg-stapel', 'stapel']])
      $(id).querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === p[key])));
    if (!P) return;
    const gpOpts = P.gpList.map((g) => [g.code, g.code + '. GP']);
    fillSel(gpVon, gpOpts, 'ab Beginn', p.gpVon ? [p.gpVon] : []);
    fillSel(gpBis, gpOpts, 'bis heute', p.gpBis ? [p.gpBis] : []);
    if (von !== document.activeElement) von.value = p.von ?? '';
    if (bis !== document.activeElement) bis.value = p.bis ?? '';
    const byName = (m) => [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], 'de'));
    fillSel(selT, byName(P.lk.thema), 'Alle Themen', window.JA.liste(p, 'thema'));
    fillSel(selR, byName(P.lk.ressort), T.d3alle, window.JA.liste(p, 'ressort'));
    fillSel(selM, byName(P.lk.minister), T.d4alle, window.JA.liste(p, 'minister'));
    const chips = $('#klubchips');
    const sel = new Set(p.klubs || []);
    chips.replaceChildren(...P.klubList.map((k) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ja-chip'; b.dataset.k = k; b.setAttribute('aria-pressed', String(sel.has(k)));
      const sw = document.createElement('span'); sw.className = 'ja-sw'; sw.style.background = farbe(k);
      b.append(sw, document.createTextNode(k));
      return b;
    }));
  });
})();


(() => {
  const { farbe, fmtDe, pct, rom } = window.JA;
  const $ = (s) => document.querySelector(s);
  const DAY = 86400000;
  const tageText = (d) => d == null ? '–' : fmtDe(Math.round(d)) + ' Tage';

  const tip = document.createElement('div'); tip.className = 'ja-tip';
  const showTip = (box, e, head, lines) => {
    if (tip.parentNode !== box) box.appendChild(tip);
    tip.replaceChildren();
    const h = document.createElement('div'); h.className = 'h'; h.textContent = head; tip.appendChild(h);
    for (const [c, l, v] of lines) {
      const r = document.createElement('div'); r.className = 'r';
      if (c) { const s = document.createElement('span'); s.className = 'ja-sw'; s.style.background = c; r.appendChild(s); }
      const t = document.createElement('span'); t.textContent = (l ? l + ': ' : '') + v; r.appendChild(t);
      tip.appendChild(r);
    }
    tip.style.display = 'block';
    const bb = box.getBoundingClientRect();
    let x = e.clientX - bb.left + 12, y = e.clientY - bb.top + 12;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    if (x + tw > bb.width) x = Math.max(0, e.clientX - bb.left - tw - 12);
    if (y + th > bb.height) y = Math.max(0, e.clientY - bb.top - th - 12);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  };
  const hideTip = () => { tip.style.display = 'none'; };

  const balken = (box, items, opts) => {
    box.replaceChildren();
    if (!items.length) { const p = document.createElement('p'); p.className = 'ja-note'; p.textContent = 'Keine ' + window.JA.T().einheit + ' für diese Auswahl.'; box.appendChild(p); return; }
    const max = d3.max(items, (d) => d.n);
    for (const d of items) {
      const row = document.createElement('div'); row.className = 'ja-bar' + (d.sel ? ' sel' : ''); row.tabIndex = 0; row.setAttribute('aria-pressed', String(!!d.sel)); if (d.dim) row.style.opacity = '0.45';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = d.label; nm.title = d.label;
      const tr = document.createElement('span'); tr.className = 'tr';
      const fl = document.createElement('span'); fl.className = 'fl'; fl.style.display = 'block'; fl.style.width = (d.n / max * 100) + '%'; fl.style.background = d.color || 'var(--cds-chart-muted)';
      if (!d.color) fl.style.background = 'var(--color-fg-muted)';
      tr.appendChild(fl);
      const v = document.createElement('span'); v.className = 'v'; v.textContent = fmtDe(d.n) + ' · ' + pct(d.share);
      row.append(nm, tr, v);
      row.addEventListener('click', () => opts.onClick(d));
      row.addEventListener('keydown', (e) => { if (e.key === 'Enter') opts.onClick(d); });
      box.appendChild(row);
    }
  };

  const median = (arr) => arr.length ? d3.median(arr) : null;

  const zeitachse = (P, idx, p, box, legend, note) => {
    box.replaceChildren(); legend.replaceChildren(); hideTip();
    const W = Math.max(280, box.clientWidth), H = 300;
    const aufl = p.aufl || 'jahr', modus = p.modus || 'gesamt';
    const keyOf = aufl === 'jahr' ? (i) => new Date(P.tag[i] * DAY).getUTCFullYear()
      : aufl === 'monat' ? (i) => { const d = new Date(P.tag[i] * DAY); return d.getUTCFullYear() * 12 + d.getUTCMonth(); }
      : (i) => P.gp[i];
    const labelOf = aufl === 'jahr' ? (k) => String(k) : aufl === 'monat' ? (k) => d3.utcFormat('%m/%Y')(new Date(Date.UTC(Math.floor(k / 12), k % 12, 1))) : (k) => P.gpList.find((g) => g.num === k).code + '. GP';
    const T = window.JA.T();
    const per = T.einheit + ' pro ' + (aufl === 'jahr' ? 'Jahr' : aufl === 'monat' ? 'Monat' : 'Gesetzgebungsperiode');
    note.textContent = modus === 'gesamt' ? per + ' nach ' + (T.einheit1 === 'Antrag' ? 'Datum der Einbringung' : 'Datum des Einlangens')
      : modus === 'klub' ? per + ', je Klub als eigene Linie; gemeinsame ' + T.einheit + ' zählen bei jedem beteiligten Klub'
      : per + ', die 8 häufigsten ' + { thema: 'Themen', ressort: T.d3p, minister: T.d4p }[modus] + ' der Auswahl als eigene Linien' + (modus === 'thema' ? '; ' + T.einheit + ' mit mehreren Themen zählen bei jedem' : '');
    if (!idx.length) { const pp = document.createElement('p'); pp.className = 'ja-note'; pp.textContent = 'Keine ' + T.einheit + ' für diese Auswahl.'; box.appendChild(pp); return; }
    let keys = [...new Set(idx.map(keyOf))].sort((a, b) => a - b);
    if (aufl !== 'gp') { const lo = keys[0], hi = keys[keys.length - 1]; keys = d3.range(lo, hi + 1); }
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).style('display', 'block');
    const totals = new Map(keys.map((k) => [k, 0]));
    for (const i of idx) totals.set(keyOf(i), totals.get(keyOf(i)) + 1);
    let series = [], kandidaten = [], legendeEintraege = [];
    const stapel = modus !== 'gesamt' && p.stapel === 'gestapelt';
    if (modus !== 'gesamt') {
      const W_ = window.JA.werte;
      const gew = window.JA.liste(p, modus);
      // Kandidaten ohne den eigenen Filter, damit alle wählbar bleiben
      const basis = window.JA.filtered(P, p, { [modus]: true });
      const cnt = d3.rollup(basis.flatMap((i) => W_(P, i, modus)), (v) => v.length, (d) => d);
      kandidaten = [...cnt.entries()].sort((a, b) => b[1] - a[1]).map((d) => d[0]).filter((k) => k !== 'ohne Angabe');
      if (modus !== 'klub') kandidaten = [...new Set([...kandidaten.slice(0, 8), ...gew.filter((k) => cnt.has(k))])];
      let show = gew.length ? kandidaten.filter((k) => gew.includes(k)) : kandidaten.slice(0, modus === 'klub' ? 10 : 8);
      const m = new Map(show.map((k) => [k, new Map(keys.map((x) => [x, 0]))]));
      const rest = new Map(keys.map((x) => [x, 0])); let hatRest = false;
      for (const i of idx) for (const k of W_(P, i, modus)) {
        if (m.has(k)) m.get(k).set(keyOf(i), m.get(k).get(keyOf(i)) + 1);
        else { rest.set(keyOf(i), rest.get(keyOf(i)) + 1); hatRest = true; }
      }
      const farbeVon = (k) => modus === 'klub' ? farbe(k) : (kandidaten.indexOf(k) < 8 ? dash.colors[kandidaten.indexOf(k)] : 'var(--cds-chart-muted)');
      series = show.map((k) => ({ key: k, name: window.JA.name(P, modus, k), color: farbeVon(k), vals: m.get(k) }));
      legendeEintraege = kandidaten.map((k) => ({ key: k, name: window.JA.name(P, modus, k), color: farbeVon(k) }));
      if (stapel && hatRest && !gew.length) series.push({ key: null, name: 'Sonstige', color: 'var(--cds-chart-muted)', vals: rest });
    }
    const summe = (k) => d3.sum(series, (s) => s.vals.get(k));
    const maxY = modus === 'gesamt' ? d3.max(totals.values()) : stapel ? d3.max(keys, summe) : d3.max(series, (s) => d3.max(s.vals.values()));
    const y = d3.scaleLinear([0, maxY || 1], [H - 24, 10]).nice();
    const tickFmt = (v) => fmtDe(v);
    const probe = svg.append('text').attr('font-size', 11).text(tickFmt(y.ticks(5).slice(-1)[0]));
    const ml = Math.ceil(probe.node().getComputedTextLength()) + 10; probe.remove();
    const mr = modus === 'klub' && !stapel ? 70 : 8;
    const x = d3.scaleBand(keys, [ml, W - mr]).paddingInner(keys.length > 60 ? 0.1 : 0.2);
    svg.append('g').selectAll('line').data(y.ticks(5)).join('line').attr('x1', ml).attr('x2', W - mr).attr('y1', (d) => y(d)).attr('y2', (d) => y(d)).attr('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(y.ticks(5)).join('text').attr('x', ml - 6).attr('y', (d) => y(d)).attr('dy', '0.32em').attr('text-anchor', 'end').attr('font-size', 11).attr('fill', 'var(--color-fg-muted)').text(tickFmt);
    const maxLab = Math.max(1, Math.floor((W - ml - mr) / (aufl === 'gp' ? 52 : aufl === 'monat' ? 56 : 40)));
    const step = Math.ceil(keys.length / maxLab);
    svg.append('g').selectAll('text').data(keys.filter((k, j) => j % step === 0)).join('text')
      .attr('x', (k) => x(k) + x.bandwidth() / 2).attr('y', H - 6).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', 'var(--color-fg-muted)')
      .text((k) => aufl === 'gp' ? P.gpList.find((g) => g.num === k).code : labelOf(k));
    const hl = svg.append('g');
    // Legende: anklickbar, schaltet den Filter für diesen Eintrag
    const aktiv = new Set(window.JA.liste(p, modus));
    legend.dataset.dim = modus;
    const sonst = series.filter((s) => s.key == null);
    for (const s of [...legendeEintraege, ...sonst]) {
      const el = document.createElement(s.key == null ? 'span' : 'button');
      if (s.key != null) { el.type = 'button'; el.className = 'ja-chip'; el.dataset.k = s.key; el.setAttribute('aria-pressed', String(aktiv.has(s.key))); el.title = 'Klick: nach „' + s.name + '“ filtern bzw. Filter aufheben'; }
      else el.className = 'ja-chip ja-chip-static';
      const sw = document.createElement('span'); sw.className = 'ja-sw'; sw.style.background = s.color;
      el.append(sw, document.createTextNode(s.name)); legend.appendChild(el);
    }
    if (modus === 'gesamt') {
      svg.append('g').selectAll('rect').data(keys).join('rect')
        .attr('x', (k) => x(k)).attr('width', x.bandwidth()).attr('y', (k) => y(totals.get(k))).attr('height', (k) => y(0) - y(totals.get(k)))
        .attr('rx', Math.min(4, x.bandwidth() / 2)).style('fill', dash.colors[0]);
    } else if (stapel) {
      const g = svg.append('g');
      for (const k of keys) {
        let acc = 0; const segs = series.map((s) => { const v = s.vals.get(k); const o = { s, y0: acc, y1: acc + v }; acc += v; return o; }).filter((o) => o.y1 > o.y0);
        segs.forEach((o, j) => {
          const top = j === segs.length - 1;
          const yy = y(o.y1), hh = Math.max(0, y(o.y0) - y(o.y1) - (j > 0 ? 1 : 0));
          g.append('path').attr('fill', o.s.color).attr('d', () => {
            const x0 = x(k), w = x.bandwidth(), r = top ? Math.min(4, w / 2, hh) : 0;
            return `M${x0},${yy + hh}V${yy + r}${r ? `Q${x0},${yy} ${x0 + r},${yy}` : ''}H${x0 + w - r}${r ? `Q${x0 + w},${yy} ${x0 + w},${yy + r}` : ''}V${yy + hh}Z`;
          });
        });
      }
    } else {
      const line = d3.line().x((k) => x(k) + x.bandwidth() / 2);
      const ends = [];
      for (const s of series) {
        svg.append('path').attr('fill', 'none').attr('stroke', s.color).attr('stroke-width', 2).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round')
          .attr('d', line.y((k) => y(s.vals.get(k)))(keys));
        ends.push({ s, y: y(s.vals.get(keys[keys.length - 1])) });
      }
      ends.sort((a, b) => a.y - b.y);
      for (let j = 1; j < ends.length; j++) if (ends[j].y - ends[j - 1].y < 12) ends[j].y = ends[j - 1].y + 12;
      if (modus === 'klub' && ends.length <= 6) for (const e of ends) svg.append('text').attr('x', W - mr + 6).attr('y', e.y).attr('dy', '0.32em').attr('font-size', 11).attr('fill', 'var(--color-fg)').text(e.s.name);
    }
    svg.append('line').attr('x1', ml).attr('x2', W - mr).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', 'var(--cds-chart-axis)');
    svg.append('rect').attr('x', ml).attr('y', 0).attr('width', W - ml - mr).attr('height', H - 20).attr('fill', 'transparent')
      .on('mousemove', (e) => {
        const [mx] = d3.pointer(e); const j = Math.max(0, Math.min(keys.length - 1, Math.floor((mx - ml) / x.step()))); const k = keys[j];
        hl.selectAll('*').remove();
        hl.append('rect').attr('x', x(k) - x.step() * x.paddingInner() / 2).attr('width', x.step()).attr('y', 10).attr('height', y(0) - 10).attr('fill', 'var(--cds-chart-grid)').attr('opacity', 0.6);
        let lines;
        if (modus === 'gesamt') lines = [[null, '', fmtDe(totals.get(k)) + ' ' + T.einheit]];
        else {
          lines = (stapel ? [...series].reverse() : [...series].sort((a, b) => b.vals.get(k) - a.vals.get(k))).map((s) => [s.color, s.name, fmtDe(s.vals.get(k))]);
          lines.push([null, T.einheit + ' gesamt', fmtDe(totals.get(k))]);
        }
        showTip(box, e, labelOf(k), lines);
      })
      .on('mouseleave', () => { hl.selectAll('*').remove(); hideTip(); });
  };
  document.getElementById('zv-legend').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-k]'); if (!b) return;
    window.JA.toggle(e.currentTarget.dataset.dim, b.dataset.k);
  });

  dash.onData(() => {
    const P = window.JA.prepare();
    const p = dash.params();
    if (window.JA.typ() === 'P') return;
    const boxes = ['#takeaway', '#zv-chart', '#klub-bars', '#thema-bars', '#kennzahlen'];
    const a = dash.data('anfragen'), s = dash.data('schluessel');
    if (!P) {
      const failed = a.status === 'error' || s.status === 'error';
      for (const b of boxes) { const el = $(b); el.classList.toggle('dash-skeleton', !failed); }
      if (failed) for (const b of ['#zv-chart', '#klub-bars', '#thema-bars']) { const el = $(b); el.replaceChildren(); const d = document.createElement('div'); d.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;min-height:120px;color:var(--color-fg-muted);font-size:var(--cds-font-size-caption)'; const dot = document.createElement('span'); dot.style.cssText = 'width:.375rem;height:.375rem;border-radius:50%;background:var(--color-bad)'; d.append(dot, document.createTextNode('Failed to load')); el.appendChild(d); }
      return;
    }
    for (const b of boxes) $(b).classList.remove('dash-skeleton');
    const idx = window.JA.filtered(P, p);
    const N = idx.length;

    // Kennzahlen
    let nb = 0; const dur = [];
    for (const i of idx) { if (P.beant[i]) { nb++; if (P.dauer[i] >= 0) dur.push(P.dauer[i]); } }
    $('#k-n').textContent = fmtDe(N);
    let tmin = Infinity, tmax = -Infinity; for (const i of idx) { if (P.tag[i] < tmin) tmin = P.tag[i]; if (P.tag[i] > tmax) tmax = P.tag[i]; }
    const df = d3.utcFormat('%d.%m.%Y');
    $('#k-n-sub').textContent = N ? df(new Date(tmin * DAY)) + ' bis ' + df(new Date(tmax * DAY)) : 'keine Treffer';
    $('#k-b').textContent = N ? pct(nb / N) : '–';
    const T = window.JA.T();
    $('#k-b-sub').textContent = fmtDe(nb) + ' ' + T.einheit;
    const md = median(dur);
    $('#k-d').textContent = tageText(md);
    let no = 0; for (const i of idx) no += P.offen[i];
    $('#k-o').textContent = fmtDe(no);

    // Klubs
    const kc = d3.rollup(idx.flatMap((i) => P.klubs[i]), (v) => v.length, (d) => d);
    const idxK = window.JA.filtered(P, p, { klub: true }), NK = idxK.length;
    const kcAlle = d3.rollup(idxK.flatMap((i) => P.klubs[i]), (v) => v.length, (d) => d);
    const selK = new Set(window.JA.liste(p, 'klub'));
    balken($('#klub-bars'), [...kcAlle].sort((x, y) => y[1] - x[1]).map(([k, n]) => ({ key: k, label: k, n, share: n / NK, color: window.JA.KLUBFARBE[k] != null ? farbe(k) : null, sel: selK.has(k), dim: selK.size && !selK.has(k) })),
      { onClick: (d) => window.JA.toggle('klub', d.key) });

    // Themen
    const idxT = window.JA.filtered(P, p, { thema: true }), NT = idxT.length;
    const tc = d3.rollup(idxT.flatMap((i) => P.themen[i]), (v) => v.length, (d) => d);
    const selTh = new Set(window.JA.liste(p, 'thema'));
    balken($('#thema-bars'), [...tc].sort((x, y) => y[1] - x[1]).map(([k, n]) => ({ key: k, label: P.lk.thema.get(k) || k, n, share: n / NT, color: dash.colors[0], sel: selTh.has(k), dim: selTh.size && !selTh.has(k) })),
      { onClick: (d) => window.JA.toggle('thema', d.key) });

    // Zeitverlauf
    zeitachse(P, idx, p, $('#zv-chart'), $('#zv-legend'), $('#zv-note'));

    // Takeaway
    if (N) {
      const topK = [...kc].filter(([k]) => k !== 'ohne Angabe').sort((x, y) => y[1] - x[1])[0];
      const rc = d3.rollup(idx.filter((i) => P.ressort[i]), (v) => v.length, (i) => P.ressort[i]);
      const topR = [...rc].sort((x, y) => y[1] - x[1])[0];
      let t = fmtDe(N) + ' ' + T.einheit + ' in der Auswahl';
      if (topK) t += '; die meisten kamen von ' + topK[0] + ' (' + pct(topK[1] / N) + ')';
      if (P.typ === 'A') {
        t += '; ' + pct(nb / N) + ' davon wurden im Nationalrat beschlossen';
        if (topR) t += ', am häufigsten zugewiesen an den ' + topR[0] + ' (' + pct(topR[1] / N) + ')';
      } else if (topR) t += ', am häufigsten gingen sie an das Ressort „' + (P.lk.ressort.get(topR[0]) || topR[0]) + '“ (' + pct(topR[1] / N) + ')';
      $('#takeaway').textContent = t + '.';
    } else $('#takeaway').textContent = 'Keine ' + T.einheit + ' für diese Filterkombination.';
  });
})();


(() => {
  const { farbe, fmtDe, pct } = window.JA;
  const $ = (s) => document.querySelector(s);
  const DAY = 86400000;
  let sortKey = 'n', sortDir = -1, q = '';
  const search = $('#adr-q');
  search.addEventListener('input', () => { q = search.value.trim().toLowerCase(); draw(); });
  $('#adr-table thead').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-s]'); if (!b) return;
    if (sortKey === b.dataset.s) sortDir = -sortDir; else { sortKey = b.dataset.s; sortDir = b.dataset.s === 'name' ? 1 : -1; }
    draw();
  });
  $('#adr-table tbody').addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-key]'); if (!tr) return;
    const p = dash.params(); window.JA.toggle((p.adr || 'ressort') === 'minister' ? 'minister' : 'ressort', tr.dataset.key);
  });
  $('#hm-table tbody').addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-key]'); if (!tr) return;
    const p = dash.params(); const g = tr.dataset.key;
    if (p.gpVon === g && p.gpBis === g) dash.setParams({ gpVon: null, gpBis: null }); else dash.setParams({ gpVon: g, gpBis: g });
  });

  const draw = () => {
    const P = window.JA.prepare(); const tbody = $('#adr-table tbody');
    const ths = $('#adr-table thead').querySelectorAll('th');
    ths.forEach((th) => { const b = th.querySelector('button'); th.setAttribute('aria-sort', b.dataset.s === sortKey ? (sortDir > 0 ? 'ascending' : 'descending') : 'none'); });
    if (!P) { tbody.replaceChildren(); return; }
    const p = dash.params(); const modus = (p.adr || 'ressort') === 'minister' ? 'minister' : 'ressort';
    const T = window.JA.T();
    $('#adr-th-name').textContent = modus === 'ressort' ? T.adrName : T.d4;
    $('#adr-note').textContent = P.typ === 'A'
      ? (modus === 'ressort' ? 'Welchem Ausschuss die Anträge zugewiesen wurden (Bezeichnung zum Zeitpunkt der Zuweisung). Klick auf eine Zeile filtert.' : 'Wie die Anträge ausgegangen sind. „Median Tage“ = Dauer bis zum Beschluss im Nationalrat. Klick auf eine Zeile filtert.')
      : (modus === 'ressort' ? 'An welches Ressort die Anfragen gingen (Bezeichnung zum Zeitpunkt der Anfrage). Klick auf eine Zeile filtert.' : 'An welche Ministerin bzw. welchen Minister die Anfragen gingen. Klick auf eine Zeile filtert.');
    const idx = window.JA.filtered(P, p, { [modus]: true });
    const N = idx.length; const arr = P[modus]; const lk = P.lk[modus];
    const g = new Map();
    for (const i of idx) {
      const k = arr[i]; if (!k) continue;
      let o = g.get(k); if (!o) { o = { key: k, name: lk.get(k) || k, n: 0, b: 0, dur: [], erste: P.tag[i], letzte: P.tag[i] }; g.set(k, o); }
      o.n++; if (P.beant[i]) { o.b++; if (P.dauer[i] >= 0) o.dur.push(P.dauer[i]); }
      if (P.tag[i] < o.erste) o.erste = P.tag[i]; if (P.tag[i] > o.letzte) o.letzte = P.tag[i];
    }
    let rows = [...g.values()].map((o) => ({ ...o, anteil: o.n / N, quote: o.b / o.n, median: o.dur.length ? d3.median(o.dur) : null }));
    if (q) rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    rows.sort((a, b) => { const x = a[sortKey], y = b[sortKey]; if (typeof x === 'string') return sortDir * x.localeCompare(y, 'de'); return sortDir * ((x ?? -1) - (y ?? -1)); });
    const max = d3.max(rows, (r) => r.n) || 1;
    const selA = new Set(window.JA.liste(p, modus));
    const yf = (t) => new Date(t * DAY).getUTCFullYear();
    tbody.replaceChildren(...rows.map((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = r.key;
      const td = (t) => { const c = document.createElement('td'); c.textContent = t; return c; };
      const c0 = td(r.name); if (selA.has(r.key)) c0.style.fontWeight = '700'; if (selA.size && !selA.has(r.key)) tr.style.opacity = '0.55';
      const cn = document.createElement('td');
      const wrap = document.createElement('span'); wrap.style.cssText = 'display:inline-flex;align-items:center;gap:6px;justify-content:flex-end;width:100%';
      const bar = document.createElement('span'); bar.style.cssText = `display:inline-block;height:8px;border-radius:0 4px 4px 0;background:${dash.colors[0]};width:${Math.max(2, r.n / max * 80)}px`;
      wrap.append(bar, document.createTextNode(fmtDe(r.n))); cn.appendChild(wrap);
      const ys = yf(r.erste), ye = yf(r.letzte);
      tr.append(c0, cn, td(pct(r.anteil)), td(pct(r.quote)), td(r.median == null ? '–' : fmtDe(Math.round(r.median))), td(ys === ye ? String(ys) : ys + '–' + ye));
      return tr;
    }));
  };

  const heat = () => {
    const P = window.JA.prepare(); const thead = $('#hm-table thead'), tbody = $('#hm-table tbody');
    if (!P) { thead.replaceChildren(); tbody.replaceChildren(); return; }
    const p = dash.params();
    const dim = p.hm || 'klub';
    const W_ = window.JA.werte;
    const idx = window.JA.filtered(P, p, { gp: true });
    const kc = d3.rollup(idx.flatMap((i) => W_(P, i, dim)), (v) => v.length, (d) => d);
    const alle = [...kc].sort((a, b) => b[1] - a[1]).map((d) => d[0]);
    const lim = dim === 'klub' ? 20 : dim === 'thema' ? 20 : 12;
    const ks = alle.slice(0, lim);
    $('#hm-titel').textContent = 'Gesetzgebungsperiode × ' + window.JA.DIMNAME[dim];
    $('#hm-note').textContent = window.JA.T().einheit + ' je GP' + (alle.length > lim ? ', die ' + lim + ' häufigsten von ' + alle.length + ' Spalten' : '') + (dim === 'klub' || dim === 'thema' ? '; Mehrfachzuordnungen zählen in jeder Spalte, „Gesamt“ zählt jede ' + (window.JA.typ() === 'A' ? 'Antrag' : 'Anfrage') + ' einmal' : '') + '. Farbintensität relativ zum größten Wert; Klick auf eine Zeile wählt die GP.';
    const m = new Map();
    for (const i of idx) { const gg = P.gp[i]; if (!m.has(gg)) m.set(gg, new Map()); const mm = m.get(gg); for (const k of W_(P, i, dim)) mm.set(k, (mm.get(k) || 0) + 1); }
    const gtot = new Map(); for (const i of idx) gtot.set(P.gp[i], (gtot.get(P.gp[i]) || 0) + 1);
    let max = 1; for (const mm of m.values()) for (const v of mm.values()) if (v > max) max = v;
    const hr = document.createElement('tr');
    const th = (t) => { const c = document.createElement('th'); c.textContent = t; return c; };
    hr.append(th('GP'), th('Gesamt'), ...ks.map((k) => { const c = th(window.JA.name(P, dim, k)); if (dim !== 'klub') { c.style.whiteSpace = 'normal'; c.style.minWidth = '7rem'; c.style.verticalAlign = 'bottom'; } return c; }));
    thead.replaceChildren(hr);
    const gv = p.gpVon ? window.JA.rom(p.gpVon) : 0, gb = p.gpBis ? window.JA.rom(p.gpBis) : 99;
    tbody.replaceChildren(...P.gpList.filter((g) => m.has(g.num)).reverse().map((g) => {
      const tr = document.createElement('tr'); tr.dataset.key = g.code;
      const inRange = g.num >= gv && g.num <= gb;
      if (!inRange) tr.style.opacity = '0.45';
      const c0 = document.createElement('td'); c0.textContent = g.code + '. GP'; c0.title = d3.utcFormat('%Y')(new Date(g.min * DAY)) + '–' + d3.utcFormat('%Y')(new Date(g.max * DAY));
      const ct = document.createElement('td'); ct.textContent = fmtDe(gtot.get(g.num) || 0); ct.style.fontWeight = '600';
      tr.append(c0, ct, ...ks.map((k) => {
        const v = m.get(g.num).get(k) || 0; const c = document.createElement('td');
        c.textContent = v ? fmtDe(v) : '';
        if (v) { const a = 0.08 + 0.6 * Math.sqrt(v / max); const col = dim === 'klub' ? (window.JA.KLUBFARBE[k] != null ? farbe(k) : '#8a8a8a') : dash.colors[0]; c.style.background = `color-mix(in srgb, ${col} ${Math.round(a * 100)}%, transparent)`; }
        return c;
      }));
      return tr;
    }));
  };

  dash.onData(() => { draw(); heat(); });
})();


(() => {
  const { fmtDe, farbe } = window.JA;
  const $ = (s) => document.querySelector(s);
  const DAY = 86400000, PRO_SEITE = 50, BASIS = 'https://www.parlament.gv.at';
  const RE_GP = /^[IVXL]+$/, RE_NR = /^\d+$/;
  let seite = 0, q = '', letzteAuswahl = '', betrMap = null, betrSrc = null, infoMap = null, infoSrc = null;
  const qEl = $('#el-q');
  qEl.addEventListener('input', () => { q = qEl.value.trim().toLowerCase(); seite = 0; draw(); });
  $('#el-pager').addEventListener('click', (e) => { const b = e.target.closest('button[data-p]'); if (!b || b.disabled) return; seite = Number(b.dataset.p); draw(); $('#einzelne').scrollIntoView({ block: 'start' }); });
  const link = (href, text) => { const a = document.createElement('a'); a.href = href; a.target = '_blank'; a.rel = 'noopener'; a.textContent = text; return a; };
  const df = d3.utcFormat('%d.%m.%Y');
  const draw = () => {
    const P = window.JA.prepare(); const tbody = $('#el-table tbody'), pager = $('#el-pager');
    if (!P) { tbody.replaceChildren(); pager.replaceChildren(); return; }
    const A = P.typ === 'A', T = window.JA.T();
    if (A) {
      const b = dash.data('antraege_info');
      if (b.status === 'ok' && infoSrc !== b.data) { infoSrc = b.data; infoMap = new Map(b.data.map((r) => [r.gp + '/' + r.inr, r])); }
    } else {
      const b = window.__elSicht ? dash.data('betreffe') : { status: 'loading' };
      if (b.status === 'ok' && betrSrc !== b.data) { betrSrc = b.data; betrMap = new Map(b.data.map((r) => [r.gp + '/' + r.inr, r.betreff])); }
    }
    const betrVon = (i) => { const k = P.gpCode[i] + '/' + P.inr[i]; return A ? (infoMap ? (infoMap.get(k) || {}).betreff : null) : (betrMap ? betrMap.get(k) : null); };
    const hatBetr = A ? !!infoMap : !!betrMap;
    const kz = A ? 'A' : 'J';
    const p = dash.params();
    const sig = JSON.stringify(p);
    if (sig !== letzteAuswahl) { letzteAuswahl = sig; seite = 0; }
    let idx = window.JA.filtered(P, p);
    if (q && hatBetr) idx = idx.filter((i) => (betrVon(i) || '').toLowerCase().includes(q) || (P.inr[i] + '/' + kz.toLowerCase()) === q.replace(/\s/g, ''));
    idx.sort((x, y) => P.tag[y] - P.tag[x] || Number(P.inr[y]) - Number(P.inr[x]));
    const N = idx.length, seiten = Math.max(1, Math.ceil(N / PRO_SEITE));
    if (seite >= seiten) seite = seiten - 1;
    const teil = idx.slice(seite * PRO_SEITE, (seite + 1) * PRO_SEITE);
    tbody.replaceChildren(...teil.map((i) => {
      const tr = document.createElement('tr');
      const td = (...k) => { const c = document.createElement('td'); c.append(...k); return c; };
      const gpOk = RE_GP.test(P.gpCode[i]), nrOk = RE_NR.test(P.inr[i]);
      const nr = P.inr[i] + '/' + kz + ' (' + P.gpCode[i] + '. GP)';
      const cNr = td(gpOk && nrOk ? link(BASIS + '/gegenstand/' + P.gpCode[i] + '/' + kz + '/' + P.inr[i], nr) : nr);
      const betr = hatBetr ? (betrVon(i) || '–') : '…';
      const info = A && infoMap ? (infoMap.get(P.gpCode[i] + '/' + P.inr[i]) || {}) : {};
      const cK = td(); P.klubs[i].forEach((k, j) => { if (j) cK.append(', '); const s = document.createElement('span'); s.textContent = k; if (k === 'ohne Angabe') s.className = 'mut'; cK.append(s); });
      const adr = A ? [P.ressort[i], info.einbringer ? 'eingebracht von ' + info.einbringer : ''].filter(Boolean) : [P.lk.ressort.get(P.ressort[i]), P.lk.minister.get(P.minister[i])].filter(Boolean);
      const cA = td(); cA.className = 'ja-hide-n';
      if (adr.length) { const r1 = document.createElement('div'); r1.textContent = adr[0]; cA.append(r1); if (adr[1]) { const r2 = document.createElement('div'); r2.className = 'mut'; r2.textContent = adr[1]; cA.append(r2); } }
      else { const s = document.createElement('span'); s.className = 'mut'; s.textContent = 'nicht erfasst'; cA.append(s); }
      const cS = td();
      const mutZeile = (txt) => { const s = document.createElement('div'); s.className = 'mut'; s.textContent = txt; cS.append(s); };
      if (A) {
        if (P.beant[i]) {
          const bnr = P.ab[i];
          cS.append(bnr && RE_NR.test(bnr) && gpOk ? link(BASIS + '/gegenstand/' + P.gpCode[i] + '/BNR/' + bnr, 'beschlossen (' + bnr + '/BNR)') : document.createTextNode('beschlossen'));
          if (P.dauer[i] >= 0) mutZeile('nach ' + fmtDe(P.dauer[i]) + ' Tagen');
          if (info.abstimmung) mutZeile(info.abstimmung);
          if (info.bgbl) mutZeile(info.bgbl.replace('Bundesgesetzblatt', 'BGBl.'));
        } else cS.append(P.minister[i] || '–');
      } else if (P.beant[i]) {
        const abNr = P.ab[i];
        cS.append(abNr && RE_NR.test(abNr) && gpOk ? link(BASIS + '/gegenstand/' + P.gpCode[i] + '/AB/' + abNr, 'beantwortet (' + abNr + '/AB)') : document.createTextNode('beantwortet'));
        if (P.dauer[i] >= 0) { const s = document.createElement('div'); s.className = 'mut'; s.textContent = 'nach ' + fmtDe(P.dauer[i]) + ' Tagen'; cS.append(s); }
      } else {
        cS.append('offen');
        if (P.frist[i]) { const s = document.createElement('div'); s.className = 'mut'; const f = new Date(P.frist[i]); s.textContent = 'Frist ' + (isNaN(f) ? P.frist[i] : df(f)); cS.append(s); }
      }
      tr.append(td(df(new Date(P.tag[i] * DAY))), cNr, td(betr), cK, cA, cS);
      return tr;
    }));
    const info = document.createElement('span');
    info.textContent = N ? fmtDe(seite * PRO_SEITE + 1) + '–' + fmtDe(seite * PRO_SEITE + teil.length) + ' von ' + fmtDe(N) + ' ' + T.einheit : 'Keine ' + T.einheit + ' für diese Auswahl.';
    const nav = document.createElement('span'); nav.className = 'ja-pair';
    const btn = (label, ziel, aus) => { const x = document.createElement('button'); x.type = 'button'; x.className = 'ja-btn'; x.textContent = label; x.dataset.p = String(ziel); x.disabled = aus; return x; };
    const st = document.createElement('span'); st.textContent = 'Seite ' + fmtDe(seite + 1) + ' von ' + fmtDe(seiten);
    nav.append(btn('« Erste', 0, seite === 0), btn('‹ Zurück', seite - 1, seite === 0), st, btn('Weiter ›', seite + 1, seite >= seiten - 1), btn('Letzte »', seiten - 1, seite >= seiten - 1));
    pager.replaceChildren(info, nav);
  };
  dash.onData(draw);
})();


(() => {
  const { rom, farbe, fmtDe, pct, KLUBFARBE } = window.JA;
  const $ = (s) => document.querySelector(s);
  const BASIS = 'https://www.parlament.gv.at';
  const GESCHL = new Map([['w', 'weiblich'], ['m', 'männlich']]);
  // In Vergleichen je Klub nur Parteien der jüngeren Vergangenheit; Klubs der Ersten Republik, WdU, KPÖ usw. zählen nur in „Alle“
  const MODERN = new Set(['ÖVP', 'SPÖ', 'FPÖ', 'GRÜNE', 'NEOS', 'BZÖ', 'LIF', 'Team Stronach', 'JETZT']);
  const dec = (x, n = 1) => x.toFixed(n).replace('.', ',');

  // ---------- Daten ----------
  let cache = null;
  window.JA.prepareP = () => {
    const a = dash.data('person_gp'), b = dash.data('personen');
    if (a.status !== 'ok' || b.status !== 'ok') return null;
    if (cache && cache.src === a.data && cache.bsrc === b.data) return cache;
    const pers = new Map(b.data.map((r) => [String(r.pad), r]));
    const rows = a.data.map((r) => ({
      pad: String(r.pad), gpc: r.gp, gp: rom(r.gp), klub: r.klub, klubs: String(r.klubs || r.klub).split('|'), g: r.geschlecht,
      bl: r.bundesland, tage: Number(r.tage), beginn: Number(r.beginn) === 1, neu: Number(r.neu) === 1,
      nach: Number(r.nachgerueckt) === 1, aus: Number(r.ausgeschieden) === 1, anf: Number(r.anfragen), ant: Number(r.antraege)
    }));
    const gps = new Map(); for (const r of rows) if (!gps.has(r.gp)) gps.set(r.gp, r.gpc);
    const gpList = [...gps.entries()].sort((x, y) => x[0] - y[0]).map(([num, code]) => ({ num, code }));
    const kc = d3.rollup(rows, (v) => v.length, (r) => r.klub);
    const klubList = [...kc].sort((x, y) => y[1] - x[1]).map((d) => d[0]);
    const lk = { thema: new Map(), ressort: new Map([...new Set(rows.map((r) => r.bl))].map((x) => [x, x])), minister: GESCHL };
    cache = { typ: 'P', src: a.data, bsrc: b.data, rows, pers, gpList, klubList, lk };
    return cache;
  };
  const auswahl = (P, p, skip = {}) => {
    const gv = p.gpVon ? rom(p.gpVon) : 0, gb = p.gpBis ? rom(p.gpBis) : 99;
    const L = (d) => { const a = window.JA.liste(p, d); return !skip[d] && a.length ? new Set(a) : null; };
    const ks = L('klub'), bl = L('ressort'), ge = L('minister'), be = L('beruf'), bi = L('bildung');
    const pp = (r) => P.pers.get(r.pad) || {};
    return P.rows.filter((r) => (skip.gp || (r.gp >= gv && r.gp <= gb)) && (!ks || r.klubs.some((k) => ks.has(k))) && (!bl || bl.has(r.bl)) && (!ge || ge.has(r.g))
      && (!be || be.has(pp(r).beruf)) && (!bi || bi.has(pp(r).bildung)));
  };

  // ---------- Tooltip ----------
  const tip = document.createElement('div'); tip.className = 'ja-tip';
  const showTip = (box, e, head, lines) => {
    if (tip.parentNode !== box) box.appendChild(tip);
    tip.replaceChildren();
    const hh = document.createElement('div'); hh.className = 'h'; hh.textContent = head; tip.appendChild(hh);
    for (const [c, l, v] of lines) {
      const r = document.createElement('div'); r.className = 'r';
      if (c) { const s = document.createElement('span'); s.className = 'ja-sw'; s.style.background = c; r.appendChild(s); }
      const t = document.createElement('span'); t.textContent = (l ? l + ': ' : '') + v; r.appendChild(t); tip.appendChild(r);
    }
    tip.style.display = 'block';
    const bb = box.getBoundingClientRect();
    let x = e.clientX - bb.left + 12, y = e.clientY - bb.top + 12;
    if (x + tip.offsetWidth > bb.width) x = Math.max(0, e.clientX - bb.left - tip.offsetWidth - 12);
    if (y + tip.offsetHeight > bb.height) y = Math.max(0, e.clientY - bb.top - tip.offsetHeight - 12);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  };
  const hideTip = () => { tip.style.display = 'none'; };

  // ---------- GP-Chart (Balken gestapelt / Linien) ----------
  const gpChart = (box, keys, labelOf, series, opt) => {
    box.replaceChildren(); hideTip();
    if (!keys.length || !series.length) { const pp = document.createElement('p'); pp.className = 'ja-note'; pp.textContent = 'Keine Abgeordneten für diese Auswahl.'; box.appendChild(pp); return; }
    const W = Math.max(280, box.clientWidth), H = opt.h || 280;
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).style('display', 'block');
    const sum = (k) => d3.sum(series, (s) => s.vals.get(k) || 0);
    const maxY = opt.max != null ? opt.max : opt.stacked ? d3.max(keys, sum) : d3.max(series, (s) => d3.max(keys, (k) => s.vals.get(k) ?? 0));
    const y = d3.scaleLinear([0, maxY || 1], [H - 24, 10]); if (opt.max == null) y.nice();
    const fy = opt.pct ? (v) => Math.round(v * 100) + ' %' : (v) => fmtDe(v);
    const ticks = y.ticks(5);
    const probe = svg.append('text').attr('font-size', 11).text(fy(ticks[ticks.length - 1]));
    const ml = Math.ceil(probe.node().getComputedTextLength()) + 10; probe.remove();
    const mr = 8;
    const x = d3.scaleBand(keys, [ml, W - mr]).paddingInner(0.2);
    svg.append('g').selectAll('line').data(ticks).join('line').attr('x1', ml).attr('x2', W - mr).attr('y1', y).attr('y2', y).attr('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(ticks).join('text').attr('x', ml - 6).attr('y', y).attr('dy', '0.32em').attr('text-anchor', 'end').attr('font-size', 11).attr('fill', 'var(--color-fg-muted)').text(fy);
    const step = Math.ceil(keys.length / Math.max(1, Math.floor((W - ml - mr) / 34)));
    svg.append('g').selectAll('text').data(keys.filter((k, j) => j % step === 0)).join('text').attr('x', (k) => x(k) + x.bandwidth() / 2).attr('y', H - 6)
      .attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', 'var(--color-fg-muted)').text(labelOf);
    const hl = svg.append('g');
    if (opt.stacked) {
      const g = svg.append('g');
      for (const k of keys) {
        let acc = 0;
        const segs = series.map((s) => { const v = s.vals.get(k) || 0; const o = { s, y0: acc, y1: acc + v }; acc += v; return o; }).filter((o) => o.y1 > o.y0);
        segs.forEach((o, j) => {
          const top = j === segs.length - 1, yy = y(o.y1), hh = Math.max(0, y(o.y0) - y(o.y1) - (j > 0 ? 1 : 0)), x0 = x(k), w = x.bandwidth(), r = top ? Math.min(4, w / 2, hh) : 0;
          g.append('path').attr('fill', o.s.color).attr('d', `M${x0},${yy + hh}V${yy + r}${r ? `Q${x0},${yy} ${x0 + r},${yy}` : ''}H${x0 + w - r}${r ? `Q${x0 + w},${yy} ${x0 + w},${yy + r}` : ''}V${yy + hh}Z`);
        });
      }
    } else if (opt.bars) {
      const s = series[0];
      svg.append('g').selectAll('rect').data(keys.filter((k) => s.vals.has(k))).join('rect').attr('x', (k) => x(k)).attr('width', x.bandwidth())
        .attr('y', (k) => y(s.vals.get(k))).attr('height', (k) => y(0) - y(s.vals.get(k))).attr('rx', Math.min(4, x.bandwidth() / 2)).style('fill', s.color);
    } else {
      for (const s of series) {
        const pts = keys.filter((k) => s.vals.has(k));
        svg.append('path').attr('fill', 'none').attr('stroke', s.color).attr('stroke-width', s.dick ? 3 : 2).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round')
          .attr('d', d3.line().defined((k) => s.vals.has(k)).x((k) => x(k) + x.bandwidth() / 2).y((k) => y(s.vals.get(k)))(keys));
        if (pts.length < 2) svg.append('g').selectAll('circle').data(pts).join('circle').attr('cx', (k) => x(k) + x.bandwidth() / 2).attr('cy', (k) => y(s.vals.get(k))).attr('r', 4).attr('fill', s.color);
      }
    }
    svg.append('line').attr('x1', ml).attr('x2', W - mr).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', 'var(--cds-chart-axis)');
    svg.append('rect').attr('x', ml).attr('y', 0).attr('width', W - ml - mr).attr('height', H - 20).attr('fill', 'transparent')
      .on('mousemove', (e) => {
        const [mx] = d3.pointer(e); const k = keys[Math.max(0, Math.min(keys.length - 1, Math.floor((mx - ml) / x.step())))];
        hl.selectAll('*').remove();
        hl.append('rect').attr('x', x(k) - x.step() * 0.1).attr('width', x.step()).attr('y', 10).attr('height', y(0) - 10).attr('fill', 'var(--cds-chart-grid)').attr('opacity', 0.6);
        const lines = opt.tip ? opt.tip(k) : (opt.stacked ? [...series].reverse() : [...series].sort((a, b) => (b.vals.get(k) ?? -1) - (a.vals.get(k) ?? -1)))
          .filter((s) => s.vals.has(k) && (s.vals.get(k) || !opt.stacked)).map((s) => [series.length > 1 ? s.color : null, series.length > 1 ? s.name : '', fy(s.vals.get(k))]);
        if (opt.stacked && !opt.pct) lines.push([null, 'Gesamt', fmtDe(sum(k))]);
        showTip(box, e, labelOf(k), lines);
      })
      .on('mouseleave', () => { hl.selectAll('*').remove(); hideTip(); });
  };
  const legende = (el, items, aktiv, dim) => {
    el.replaceChildren(); el.dataset.dim = dim || '';
    for (const it of items) {
      const b = document.createElement(dim ? 'button' : 'span');
      b.className = 'ja-chip' + (dim ? '' : ' ja-chip-static');
      if (dim) { b.type = 'button'; b.dataset.k = it.key; b.setAttribute('aria-pressed', String(aktiv.has(it.key))); }
      const sw = document.createElement('span'); sw.className = 'ja-sw'; sw.style.background = it.color;
      b.append(sw, document.createTextNode(it.name)); el.appendChild(b);
    }
  };
  for (const id of ['#pz-legend', '#pf-legend', '#pb-legend']) $(id).addEventListener('click', (e) => { const b = e.target.closest('button[data-k]'); if (b) window.JA.toggle(e.currentTarget.dataset.dim || 'klub', b.dataset.k); });
  const balken = (box, items, onClick) => {
    box.replaceChildren();
    if (!items.length) { const p = document.createElement('p'); p.className = 'ja-note'; p.textContent = 'Keine Abgeordneten für diese Auswahl.'; box.appendChild(p); return; }
    const max = d3.max(items, (d) => d.w);
    for (const d of items) {
      const row = document.createElement('div'); row.className = 'ja-bar' + (d.sel ? ' sel' : ''); if (d.dim) row.style.opacity = '0.45';
      if (!onClick) row.style.cursor = 'default';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = d.label; nm.title = d.label;
      const tr = document.createElement('span'); tr.className = 'tr';
      const fl = document.createElement('span'); fl.className = 'fl'; fl.style.display = 'block'; fl.style.width = (d.w / max * 100) + '%'; fl.style.background = d.color || dash.colors[0];
      tr.appendChild(fl);
      const v = document.createElement('span'); v.className = 'v'; v.textContent = d.text;
      row.append(nm, tr, v);
      if (onClick) { row.tabIndex = 0; row.addEventListener('click', () => onClick(d)); row.addEventListener('keydown', (e) => { if (e.key === 'Enter') onClick(d); }); }
      box.appendChild(row);
    }
  };
  const seg = (id, key) => $(id).addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) dash.setParams({ [key]: b.dataset.v }); });
  seg('#seg-pzahl', 'pzahl'); seg('#seg-pstapel', 'stapel');

  // ---------- Personenliste ----------
  let sortKey = 'anf', sortDir = -1, seite = 0, q = '', sig = '';
  const PRO_SEITE = 50;
  $('#pl-q').addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); seite = 0; zeichne(); });
  $('#pl-table thead').addEventListener('click', (e) => { const b = e.target.closest('button[data-s]'); if (!b) return; if (sortKey === b.dataset.s) sortDir = -sortDir; else { sortKey = b.dataset.s; sortDir = ['name', 'klubs', 'bl', 'gps', 'beruf'].includes(sortKey) ? 1 : -1; } seite = 0; zeichne(); });
  $('#pl-pager').addEventListener('click', (e) => { const b = e.target.closest('button[data-p]'); if (!b || b.disabled) return; seite = Number(b.dataset.p); zeichne(); $('#p-liste').scrollIntoView({ block: 'start' }); });
  $('#pl-table tbody').addEventListener('click', (e) => { const b = e.target.closest('button[data-pad]'); if (!b) return; dash.setParams({ person: [b.dataset.pad], typ: 'J', ressort: [], minister: [], klubs: [] }); window.scrollTo({ top: 0 }); });
  const link = (href, text) => { const a = document.createElement('a'); a.href = href; a.target = '_blank'; a.rel = 'noopener'; a.textContent = text; return a; };

  const zeichne = () => {
    if (window.JA.typ() !== 'P') return;
    const P = window.JA.prepareP();
    const busy = !P;
    for (const id of ['#pk-n', '#pk-w', '#pk-d', '#pk-neu']) $(id).classList.toggle('dash-skeleton', busy);
    if (!P) return;
    const p = dash.params();
    const R = auswahl(P, p);
    const gew = new Set(window.JA.liste(p, 'klub'));
    const nur = p.pzahl === 'alle' ? R : R.filter((r) => r.beginn);

    // Kennzahlen
    const pads = [...new Set(R.map((r) => r.pad))];
    const persAus = pads.map((x) => P.pers.get(x)).filter(Boolean);
    const nw = persAus.filter((x) => x.geschlecht === 'w').length;
    const gpsIn = [...new Set(R.map((r) => r.gp))].sort((a, b) => a - b);
    const neu = new Set(R.filter((r) => r.neu).map((r) => r.pad)).size;
    $('#pk-n').textContent = fmtDe(pads.length);
    $('#pk-n-sub').textContent = gpsIn.length ? 'mit Mandat in der ' + (gpsIn.length === 1 ? P.gpList.find((g) => g.num === gpsIn[0]).code + '. GP' : P.gpList.find((g) => g.num === gpsIn[0]).code + '. bis ' + P.gpList.find((g) => g.num === gpsIn[gpsIn.length - 1]).code + '. GP') : 'keine Treffer';
    $('#pk-w').textContent = pads.length ? pct(nw / pads.length) : '–';
    $('#pk-w-sub').textContent = fmtDe(nw) + ' Frauen, ' + fmtDe(pads.length - nw) + ' Männer';
    $('#pk-d').textContent = persAus.length ? dec(d3.median(persAus, (x) => Number(x.jahre))) + ' Jahre' : '–';
    $('#pk-neu').textContent = pads.length ? pct(neu / pads.length) : '–';
    $('#pk-neu-sub').textContent = fmtDe(neu) + ' zum ersten Mal im NR';
    // Takeaway
    const T = $('#takeaway');
    if (pads.length) {
      const top = [...d3.rollup(nur, (v) => new Set(v.map((r) => r.pad)).size, (r) => r.klub)].sort((a, b) => b[1] - a[1])[0];
      T.textContent = fmtDe(pads.length) + ' Abgeordnete in der Auswahl, davon ' + pct(nw / pads.length) + ' Frauen; Median der Zeit im Nationalrat: ' + dec(d3.median(persAus, (x) => Number(x.jahre))) + ' Jahre' + (top ? '; größter Klub: ' + top[0] : '') + '.';
    } else T.textContent = 'Keine Abgeordneten für diese Filterkombination.';
    T.classList.remove('dash-skeleton');

    // Zusammensetzung
    const keys = gpsIn;
    const lab = (k) => P.gpList.find((g) => g.num === k).code;
    const kcAll = d3.rollup(auswahl(P, p, { klub: true }).filter((r) => p.pzahl === 'alle' || r.beginn), (v) => v.length, (r) => r.klub);
    const kand = [...kcAll].sort((a, b) => b[1] - a[1]).map((d) => d[0]);
    const show = gew.size ? kand.filter((k) => gew.has(k)) : kand;
    const stapel = p.stapel === 'gestapelt';
    const ser = show.map((k) => ({ key: k, name: k, color: farbe(k), vals: new Map() }));
    const sm = new Map(ser.map((s) => [s.key, s]));
    for (const r of nur) { const s = sm.get(r.klub); if (s) s.vals.set(r.gp, (s.vals.get(r.gp) || 0) + 1); }
    if (!stapel) for (const s of ser) for (const k of keys) if (!s.vals.has(k)) { /* nur GPs mit Klub */ }
    $('#pz-note').textContent = (p.pzahl === 'alle' ? 'Alle Personen mit Mandat in der GP, inklusive Nachrücker:innen.' : 'Sitzverteilung zum Beginn der GP (Stichtag: zweiter Tag der GP).') + ' Klub laut überwiegender Zugehörigkeit in der GP. Klick auf die Legende filtert.';
    legende($('#pz-legend'), kand.map((k) => ({ key: k, name: k, color: farbe(k) })), gew, 'klub');
    for (const [id, key] of [['#seg-pzahl', 'pzahl'], ['#seg-pstapel', 'stapel']]) $(id).querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === (p[key] || (key === 'pzahl' ? 'beginn' : 'einzeln')))));
    gpChart($('#pz-chart'), keys, lab, ser, { stacked: stapel });

    // Frauenanteil
    const basis = nur;
    const grp = (rows) => { const m = new Map(); for (const r of rows) { const o = m.get(r.gp) || { w: 0, n: 0 }; o.n++; if (r.g === 'w') o.w++; m.set(r.gp, o); } return new Map([...m].map(([k, o]) => [k, o.w / o.n])); };
    const fser = [{ key: '_', name: 'Gesamt', color: 'var(--color-fg)', vals: grp(basis), dick: true }];
    const fk = (gew.size ? [...gew] : ['ÖVP', 'SPÖ', 'FPÖ', 'GRÜNE', 'NEOS']).filter((k) => basis.some((r) => r.klub === k));
    for (const k of fk) fser.push({ key: k, name: k, color: farbe(k), vals: grp(basis.filter((r) => r.klub === k)) });
    legende($('#pf-legend'), fser.map((s) => ({ key: s.key, name: s.name, color: s.color })), new Set(), null);
    $('#pf-note').textContent = 'Anteil der Frauen je GP' + (p.pzahl === 'alle' ? ' (alle Mandatar:innen)' : ' (zu Beginn der GP)') + ', gesamt und ' + (gew.size ? 'für die gewählten Klubs' : 'für die heutigen Parlamentsparteien') + '.';
    gpChart($('#pf-chart'), keys, lab, fser, { pct: true });

    // Erneuerung
    const beg = R.filter((r) => r.beginn);
    const em = new Map(); for (const r of beg) { const o = em.get(r.gp) || { n: 0, neu: 0 }; o.n++; if (r.neu) o.neu++; em.set(r.gp, o); }
    const nach = d3.rollup(R.filter((r) => r.nach), (v) => v.length, (r) => r.gp), aus = d3.rollup(R.filter((r) => r.aus), (v) => v.length, (r) => r.gp);
    gpChart($('#pe-chart'), keys, lab, [{ key: 'neu', name: 'Neu', color: dash.colors[0], vals: new Map([...em].map(([k, o]) => [k, o.neu / o.n])) }], {
      bars: true, pct: true,
      tip: (k) => { const o = em.get(k) || { n: 0, neu: 0 }; return [[null, 'Neu zu Beginn', o.n ? pct(o.neu / o.n) + ' (' + fmtDe(o.neu) + ' von ' + fmtDe(o.n) + ')' : '–'], [null, 'Nachgerückt', fmtDe(nach.get(k) || 0)], [null, 'Vorzeitig ausgeschieden', fmtDe(aus.get(k) || 0)]]; }
    });

    // Mandatsdauer
    const bins = [[0, 1], [1, 2], [2, 4], [4, 6], [6, 8], [8, 10], [10, 15], [15, 20], [20, 30], [30, 99]];
    const bl = (b) => b[1] === 99 ? 'über ' + b[0] : b[0] + '–' + b[1];
    const hc = bins.map(() => 0); for (const x of persAus) { const j = Math.max(0, bins.findIndex((b) => Number(x.jahre) >= b[0] && Number(x.jahre) < b[1])); hc[j]++; }
    gpChart($('#pd-chart'), bins.map((b, j) => j), (j) => bl(bins[j]), [{ key: 'd', name: 'Abgeordnete', color: dash.colors[0], vals: new Map(hc.map((v, j) => [j, v])) }], {
      bars: true, h: 240, tip: (j) => [[null, '', fmtDe(hc[j]) + ' Abgeordnete (' + (persAus.length ? pct(hc[j] / persAus.length) : '–') + ')']]
    });

    // Herkunft
    const selBl = new Set(window.JA.liste(p, 'ressort'));
    const Rb = auswahl(P, p, { ressort: true });
    const bm = new Map(); for (const r of Rb) { if (!bm.has(r.bl)) bm.set(r.bl, new Set()); bm.get(r.bl).add(r.pad); }
    const nB = new Set(Rb.map((r) => r.pad)).size;
    balken($('#ph-bars'), [...bm].map(([k, s]) => ({ key: k, label: k, w: s.size, text: fmtDe(s.size) + ' · ' + pct(s.size / nB), sel: selBl.has(k), dim: selBl.size && !selBl.has(k) })).sort((a, b) => b.w - a.w), (d) => window.JA.toggle('ressort', d.key));

    // Akademischer Grad je Klub
    const ak = new Map();
    for (const r of R) { const k = r.klub; if (!ak.has(k)) ak.set(k, new Set()); ak.get(k).add(r.pad); }
    balken($('#pa-bars'), [...ak].map(([k, s]) => { const ps = [...s].map((x) => P.pers.get(x)).filter(Boolean); const a = ps.filter((x) => Number(x.akad) === 1).length; return { key: k, label: k, w: ps.length ? a / ps.length : 0, n: ps.length, text: (ps.length ? pct(a / ps.length) : '–') + ' von ' + fmtDe(ps.length), color: KLUBFARBE[k] != null ? farbe(k) : 'var(--color-fg-muted)' }; })
      .filter((d) => d.n >= 3 && MODERN.has(d.key)).sort((a, b) => b.w - a.w), null);

    // Bildung je GP (Anteile, gestapelt)
    const STUFEN = [['Hochschule', '#363f8a'], ['Matura', '#6874b8'], ['Lehre/Fachschule', '#9ea6d6'], ['Pflichtschule', '#cfd3ea'], ['unbekannt', 'var(--cds-chart-muted)']];
    const selBi = new Set(window.JA.liste(p, 'bildung'));
    const Rbi = auswahl(P, p, { bildung: true }).filter((r) => p.pzahl === 'alle' || r.beginn);
    const bsum = new Map(); for (const r of Rbi) bsum.set(r.gp, (bsum.get(r.gp) || 0) + 1);
    const bser = STUFEN.filter(([k]) => !selBi.size || selBi.has(k)).map(([k, c]) => ({ key: k, name: k, color: c, vals: new Map() }));
    const bmap = new Map(bser.map((s) => [s.key, s]));
    for (const r of Rbi) { const s = bmap.get((P.pers.get(r.pad) || {}).bildung || 'unbekannt'); if (s) s.vals.set(r.gp, (s.vals.get(r.gp) || 0) + 1); }
    for (const s of bser) for (const [k, v] of s.vals) s.vals.set(k, v / bsum.get(k));
    legende($('#pb-legend'), STUFEN.map(([k, c]) => ({ key: k, name: k, color: c })), selBi, 'bildung');
    $('#pb-note').textContent = 'Anteil je GP nach höchstem Abschluss laut Bildungsweg' + (p.pzahl === 'alle' ? ' (alle Mandatar:innen)' : ' (zu Beginn der GP)') + '. Klick auf die Legende filtert alle Ansichten.';
    gpChart($('#pb-chart'), [...new Set(Rbi.map((r) => r.gp))].sort((a, b) => a - b), lab, bser, { stacked: true, pct: true, max: selBi.size ? null : 1 });

    // Berufsgruppen
    const selBe = new Set(window.JA.liste(p, 'beruf'));
    const Rbe = auswahl(P, p, { beruf: true });
    const bp = new Map(); for (const r of Rbe) { const k = (P.pers.get(r.pad) || {}).beruf || 'Sonstige/unbekannt'; if (!bp.has(k)) bp.set(k, new Set()); bp.get(k).add(r.pad); }
    const nBe = new Set(Rbe.map((r) => r.pad)).size;
    balken($('#pbe-bars'), [...bp].map(([k, s]) => ({ key: k, label: k, w: s.size, text: fmtDe(s.size) + ' · ' + pct(s.size / nBe), sel: selBe.has(k), dim: selBe.size && !selBe.has(k), color: k === 'Sonstige/unbekannt' ? 'var(--cds-chart-muted)' : null }))
      .sort((a, b) => (a.key === 'Sonstige/unbekannt') - (b.key === 'Sonstige/unbekannt') || b.w - a.w), (d) => window.JA.toggle('beruf', d.key));

    // Studienrichtungen
    const hs = persAus.filter((x) => x.bildung === 'Hochschule');
    const stu = new Map(); let ohne = 0;
    for (const x of hs) { const l = String(x.studium || '').split('|').filter(Boolean); if (!l.length) ohne++; for (const k of l) stu.set(k, (stu.get(k) || 0) + 1); }
    if (ohne) stu.set('ohne Angabe der Richtung', ohne);
    $('#pst-note').textContent = fmtDe(hs.length) + ' Abgeordnete der Auswahl mit Hochschulabschluss (' + (persAus.length ? pct(hs.length / persAus.length) : '–') + '), nach Studienrichtung; Mehrfachstudien zählen je Richtung.';
    balken($('#pst-bars'), [...stu].map(([k, v]) => ({ key: k, label: k, w: v, text: fmtDe(v) + ' · ' + pct(v / Math.max(1, hs.length)), color: k === 'ohne Angabe der Richtung' ? 'var(--cds-chart-muted)' : '#363f8a' }))
      .sort((a, b) => (a.key === 'ohne Angabe der Richtung') - (b.key === 'ohne Angabe der Richtung') || b.w - a.w), null);

    // Berufsgruppen je Klub
    {
      const tk = new Map();
      for (const r of R) { if (!tk.has(r.klub)) tk.set(r.klub, new Set()); tk.get(r.klub).add(r.pad); }
      const spalten = [...tk].filter(([k, s]) => MODERN.has(k) && s.size >= 10).sort((a, b) => b[1].size - a[1].size).slice(0, 8).map(([k]) => k);
      const gruppen = [...new Set(persAus.map((x) => x.beruf || 'Sonstige/unbekannt'))];
      const anteil = (pads, g) => { const ps = [...pads].map((x) => P.pers.get(x)).filter(Boolean); return ps.length ? ps.filter((x) => (x.beruf || 'Sonstige/unbekannt') === g).length / ps.length : 0; };
      const alle = new Set(pads);
      gruppen.sort((a, b) => (a === 'Sonstige/unbekannt') - (b === 'Sonstige/unbekannt') || anteil(alle, b) - anteil(alle, a));
      const th = (t) => { const c = document.createElement('th'); c.textContent = t; return c; };
      const hr = document.createElement('tr'); hr.append(th('Berufsgruppe'), th('Alle'), ...spalten.map((k) => th(k)));
      $('#pbk-table thead').replaceChildren(hr);
      const maxSp = new Map(spalten.map((k) => [k, Math.max(...gruppen.map((g) => anteil(tk.get(k), g)), 0.0001)]));
      $('#pbk-table tbody').replaceChildren(...gruppen.map((g) => {
        const tr = document.createElement('tr');
        const c0 = document.createElement('td'); c0.textContent = g;
        const ca = document.createElement('td'); ca.textContent = pct(anteil(alle, g)); ca.style.fontWeight = '600';
        tr.append(c0, ca, ...spalten.map((k) => {
          const v = anteil(tk.get(k), g); const c = document.createElement('td'); c.textContent = v ? pct(v) : '';
          if (v) c.style.background = `color-mix(in srgb, ${KLUBFARBE[k] || '#8a8a8a'} ${Math.round((0.08 + 0.55 * v / maxSp.get(k)) * 100)}%, transparent)`;
          return c;
        }));
        return tr;
      }));
    }

    // Aktivität nach Geschlecht
    const tb = $('#pg-table tbody');
    const ag = new Map();
    for (const r of R) {
      const o = ag.get(r.klub) || { tw: 0, t: 0, aw: 0, a: 0, nw: 0, n: 0, tw19: 0, tm19: 0, aw19: 0, am19: 0 };
      o.t += r.tage; o.a += r.anf; o.n += r.ant;
      if (r.g === 'w') { o.tw += r.tage; o.aw += r.anf; o.nw += r.ant; }
      if (r.gp >= 19) { if (r.g === 'w') { o.tw19 += r.tage; o.aw19 += r.anf; } else { o.tm19 += r.tage; o.am19 += r.anf; } }
      ag.set(r.klub, o);
    }
    const zeilen = [...ag].filter(([, o]) => o.a + o.n > 0).sort((a, b) => b[1].a - a[1].a);
    tb.replaceChildren(...zeilen.map(([k, o]) => {
      const tr = document.createElement('tr');
      const td = (t) => { const c = document.createElement('td'); c.textContent = t; return c; };
      const rw = o.tw19 ? o.aw19 / (o.tw19 / 365.25) : null, rm = o.tm19 ? o.am19 / (o.tm19 / 365.25) : null;
      tr.append(td(k), td(o.t ? pct(o.tw / o.t) : '–'), td(o.a ? pct(o.aw / o.a) : '–'), td(o.n ? pct(o.nw / o.n) : '–'), td((rw == null ? '–' : dec(rw)) + ' / ' + (rm == null ? '–' : dec(rm))));
      return tr;
    }));
    if (!zeilen.length) { const tr = document.createElement('tr'); const c = document.createElement('td'); c.colSpan = 5; c.textContent = 'Keine Anfragen oder Anträge in der Auswahl (verknüpfbar ab der XIX. GP).'; tr.append(c); tb.replaceChildren(tr); }

    // Klubwechsel
    const wd = dash.data('wechsel'); const wt = $('#pw-table tbody');
    if (wd.status === 'ok') {
      const gv = p.gpVon ? rom(p.gpVon) : 0, gb = p.gpBis ? rom(p.gpBis) : 99;
      const selPads = new Set(pads);
      const W = wd.data.filter((w) => { const g = rom(w.gp); return g >= gv && g <= gb && (!gew.size || gew.has(w.von) || gew.has(w.nach)) && selPads.has(String(w.pad)); })
        .sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
      $('#pw-note').textContent = fmtDe(W.length) + ' Wechsel der Klubzugehörigkeit während des Mandats in der Auswahl, inklusive Austritten („ohne Klub“).';
      wt.replaceChildren(...W.map((w) => {
        const tr = document.createElement('tr'); const td = (...k) => { const c = document.createElement('td'); c.append(...k); return c; };
        const pr = P.pers.get(String(w.pad));
        const d = new Date(w.datum);
        tr.append(td(isNaN(d) ? String(w.datum) : d3.utcFormat('%d.%m.%Y')(d)), td(link(BASIS + '/person/' + w.pad, pr ? pr.name : 'Person ' + w.pad)), td(String(w.von)), td(String(w.nach)), td(String(w.gp) + '. GP'));
        return tr;
      }));
    }

    // Personenliste
    const s = JSON.stringify([p.gpVon, p.gpBis, p.klubs, p.ressort, p.minister]);
    if (s !== sig) { sig = s; seite = 0; }
    const agg = new Map();
    for (const r of R) {
      const o = agg.get(r.pad) || { pad: r.pad, tage: 0, anf: 0, ant: 0, tage19: 0, gps: [], klubs: new Set(), bl: new Map() };
      o.tage += r.tage; o.anf += r.anf; o.ant += r.ant; if (r.gp >= 19) o.tage19 += r.tage; o.gps.push(r.gp); r.klubs.forEach((k) => o.klubs.add(k)); o.bl.set(r.bl, (o.bl.get(r.bl) || 0) + r.tage);
      agg.set(r.pad, o);
    }
    let L = [...agg.values()].map((o) => {
      const pr = P.pers.get(o.pad) || {};
      const g = o.gps.sort((a, b) => a - b), c = (n) => P.gpList.find((x) => x.num === n).code;
      return { ...o, beruf: pr.beruf_text || pr.beruf || '', name: pr.name || o.pad, klubs: [...o.klubs].join(', '), bl: [...o.bl].sort((a, b) => b[1] - a[1])[0][0], gps: g.length > 1 ? c(g[0]) + '–' + c(g[g.length - 1]) : c(g[0]), gpn: g[0],
        jahre: Number(pr.jahre || 0), rate: o.tage19 > 30 ? o.anf / (o.tage19 / 365.25) : null, quote: Number(pr.antraege) ? Number(pr.antraege_beschl) / Number(pr.antraege) : null, beschl: Number(pr.antraege_beschl || 0), antGes: Number(pr.antraege || 0) };
    });
    if (q) L = L.filter((x) => x.name.toLowerCase().includes(q));
    L.sort((a, b) => {
      const k = sortKey === 'gps' ? 'gpn' : sortKey;
      const x = a[k], y = b[k];
      if (typeof x === 'string') return sortDir * x.localeCompare(y, 'de');
      return sortDir * ((x ?? -1) - (y ?? -1)) || a.name.localeCompare(b.name, 'de');
    });
    $('#pl-table thead').querySelectorAll('th').forEach((th) => { const b = th.querySelector('button'); if (b) th.setAttribute('aria-sort', b.dataset.s === sortKey ? (sortDir > 0 ? 'ascending' : 'descending') : 'none'); });
    const N = L.length, seiten = Math.max(1, Math.ceil(N / PRO_SEITE)); if (seite >= seiten) seite = seiten - 1;
    const teil = L.slice(seite * PRO_SEITE, (seite + 1) * PRO_SEITE);
    $('#pl-table tbody').replaceChildren(...teil.map((x) => {
      const tr = document.createElement('tr'); const td = (...k) => { const c = document.createElement('td'); c.append(...k); return c; };
      const cb = document.createElement('td');
      if (x.anf + x.ant > 0) { const b = document.createElement('button'); b.type = 'button'; b.className = 'ja-mini'; b.dataset.pad = x.pad; b.textContent = 'Anfragen →'; b.title = 'Anfragen dieser Person anzeigen'; cb.append(b); }
      const cbl = td(x.bl); cbl.className = 'ja-hide-n';
      const cbe = td(x.beruf); cbe.className = 'ja-hide-n'; cbe.style.maxWidth = '16rem';
      tr.append(td(link(BASIS + '/person/' + x.pad, x.name)), td(x.klubs), cbl, cbe, td(x.gps), td(dec(x.jahre)), td(fmtDe(x.anf)), td(x.rate == null ? '–' : dec(x.rate)), td(fmtDe(x.ant)),
        td(x.antGes ? fmtDe(x.beschl) + ' (' + pct(x.quote) + ')' : '–'), cb);
      return tr;
    }));
    const info = document.createElement('span');
    info.textContent = N ? fmtDe(seite * PRO_SEITE + 1) + '–' + fmtDe(seite * PRO_SEITE + teil.length) + ' von ' + fmtDe(N) + ' Abgeordneten' : 'Keine Abgeordneten für diese Auswahl.';
    const nav = document.createElement('span'); nav.className = 'ja-pair';
    const btn = (label, ziel, aus) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ja-btn'; b.textContent = label; b.dataset.p = String(ziel); b.disabled = aus; return b; };
    const st = document.createElement('span'); st.textContent = 'Seite ' + fmtDe(seite + 1) + ' von ' + fmtDe(seiten);
    nav.append(btn('« Erste', 0, seite === 0), btn('‹ Zurück', seite - 1, seite === 0), st, btn('Weiter ›', seite + 1, seite >= seiten - 1), btn('Letzte »', seiten - 1, seite >= seiten - 1));
    $('#pl-pager').replaceChildren(info, nav);
  };
  dash.onData(zeichne);
})();
