// Analyse: Fragen Ausschussmitglieder zu ihren Ausschussthemen?
(() => {
  const $ = (s) => document.querySelector(s);
  const BASIS = 'https://www.parlament.gv.at';
  const KLUBFARBE = { 'ÖVP': '#62C3D0', 'SPÖ': '#FF0000', 'FPÖ': '#0052FB', 'GRÜNE': '#69B12E', 'NEOS': '#E3257B',
    'BZÖ': '#FF8D04', 'LIF': '#B0D8F3', 'Team Stronach': '#F8E924', 'JETZT': '#C8C8C8' };
  const MODERN = Object.keys(KLUBFARBE);
  const farbe = (k) => KLUBFARBE[k] || '#9aa1ad';
  const ROMV = { I: 1, V: 5, X: 10, L: 50 };
  const rom = (s) => { let n = 0; for (let i = 0; i < s.length; i++) { const a = ROMV[s[i]], b = ROMV[s[i + 1]] || 0; n += a < b ? -a : a; } return n; };
  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const pct = (x) => (x * 100).toFixed(0) + ' %';
  const fak = (x) => '×' + x.toFixed(1).replace('.', ',');
  const nm = (n) => {
    const b = String(n).split('(')[0].split(',')[0].trim().split(/\s+/);
    if (/^(von|van|de|di)$/i.test(b[0])) return b.slice(-1).concat(b.slice(0, -1)).join(' ');
    return b.slice(1).concat(b.slice(0, 1)).join(' ');
  };
  const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v); } e.append(...kids); return e; };

  const z = { von: 'XX', bis: 'XXVIII', klubs: new Set(), ohneSerien: false, feld: null, sort: 'anteil', dir: -1, seite: 0, bfeld: 'Landwirtschaft' };
  let D = null;
  const laden = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + ': HTTP ' + r.status); return r.text(); }).then((t) => d3.csvParse(t));
  Promise.all(['data/feld_agg.csv', 'data/person_fokus.csv', 'data/zuordnung.csv', 'data/personen.csv', 'data/kombi.csv', 'data/beruf_ausschuss.csv', 'data/beruf_zuordnung.csv'].map(laden)).then(([F, PF, ZU, P, K, BA, BZ]) => {
    for (const r of K) { r.n = +r.n; r.treffer = +r.treffer; r.g = rom(r.gp); r.beruf = +r.beruf; r.ausschuss = +r.ausschuss; r.serie = +r.serie; }
    for (const r of BA) { r.personen = +r.personen; r.im_ausschuss = +r.im_ausschuss; r.g = rom(r.gp); r.beruf = +r.beruf; }
    const feldBerufe = new Map();
    for (const r of BZ) for (const f of r.felder.split(' | ')) { if (!feldBerufe.has(f)) feldBerufe.set(f, []); feldBerufe.get(f).push(r.beruf); }
    for (const r of F) { r.n = +r.n; r.treffer = +r.treffer; r.g = rom(r.gp); r.mitglied = +r.mitglied; r.serie = +r.serie; }
    for (const r of PF) { r.g = rom(r.gp); for (const k of ['n', 'treffer', 'erwartet', 'n_ns', 'treffer_ns', 'erwartet_ns']) r[k] = +r[k]; }
    D = { F, PF, ZU, K, BA, feldBerufe, pers: new Map(P.map((p) => [p.pad, p])), gps: [...new Set(F.map((r) => r.gp))].sort((a, b) => rom(a) - rom(b)) };
    init(); zeichne();
  }).catch((e) => { $('#an-status').textContent = 'Die Daten konnten nicht geladen werden (' + e.message + ').'; });

  const init = () => {
    for (const [id, key] of [['#an-von', 'von'], ['#an-bis', 'bis']]) {
      const s = $(id); s.replaceChildren(...D.gps.map((g) => new Option(g + '. GP', g))); s.value = z[key];
      s.addEventListener('change', () => { z[key] = s.value; if (rom(z.von) > rom(z.bis)) { if (key === 'von') z.bis = z.von; else z.von = z.bis; } z.seite = 0; zeichne(); });
    }
    $('#an-serien').addEventListener('change', (e) => { z.ohneSerien = e.target.checked; zeichne(); });
    $('#an-klubs').addEventListener('click', (e) => { const b = e.target.closest('button[data-k]'); if (!b) return; z.klubs.has(b.dataset.k) ? z.klubs.delete(b.dataset.k) : z.klubs.add(b.dataset.k); z.seite = 0; zeichne(); });
    $('#an-reset').addEventListener('click', () => { Object.assign(z, { von: 'XX', bis: 'XXVIII', ohneSerien: false, feld: null, seite: 0 }); z.klubs.clear(); $('#an-von').value = 'XX'; $('#an-bis').value = 'XXVIII'; $('#an-serien').checked = false; zeichne(); });
    $('#an-felder').addEventListener('click', (e) => { const r = e.target.closest('[data-feld]'); if (!r) return; z.feld = z.feld === r.dataset.feld ? null : r.dataset.feld; z.seite = 0; zeichne(); });
    $('#an-tab thead').addEventListener('click', (e) => { const b = e.target.closest('button[data-s]'); if (!b) return; if (z.sort === b.dataset.s) z.dir = -z.dir; else { z.sort = b.dataset.s; z.dir = b.dataset.s === 'name' ? 1 : -1; } z.seite = 0; zeichne(); });
    $('#an-pager').addEventListener('click', (e) => { const b = e.target.closest('button[data-p]'); if (!b || b.disabled) return; z.seite = +b.dataset.p; zeichne(); });
    $('#an-tab tbody').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-anfragen]'); if (!b) return;
      try { localStorage.setItem('nrz-uebergabe', JSON.stringify({ typ: 'J', person: [b.dataset.anfragen], gpVon: z.von, gpBis: z.bis })); } catch (err) { /* ohne Speicher */ }
      location.href = 'anfragen.html';
    });
    $('#be-anf').addEventListener('click', (e) => { const r = e.target.closest('[data-feld]'); if (!r) return; z.bfeld = r.dataset.feld; $('#be-feld').value = z.bfeld; zeichne(); });
    $('#be-feld').addEventListener('change', (e) => { z.bfeld = e.target.value; zeichne(); });
    $('#be-feld').replaceChildren(...[...D.feldBerufe.keys()].sort((a, b) => a.localeCompare(b, 'de')).map((f) => new Option(f, f))); $('#be-feld').value = z.bfeld;
    $('#be-zuordnung tbody').replaceChildren(...[...D.feldBerufe].map(([f, bs]) => el('tr', {}, el('td', { text: bs.join(', ') }), el('td', { text: f }))));
    // Zuordnungstabelle
    $('#an-zuordnung tbody').replaceChildren(...D.ZU.filter((r) => r.ausschuesse && r.ressorts).map((r) => el('tr', {}, el('td', { text: r.feld }), el('td', { text: r.ausschuesse.split(' | ').join(', ') }), el('td', { text: r.ressorts.split(' | ').join(', ') }))));
  };

  const imRahmen = (r) => r.g >= rom(z.von) && r.g <= rom(z.bis) && (!z.klubs.size || z.klubs.has(r.klub));
  const N = (r) => z.ohneSerien ? r.n_ns : r.n, T = (r) => z.ohneSerien ? r.treffer_ns : r.treffer, E = (r) => z.ohneSerien ? r.erwartet_ns : r.erwartet;
  const kennz = (rows) => { const n = d3.sum(rows, N), t = d3.sum(rows, T), e = d3.sum(rows, (r) => N(r) * E(r)); return { n, t, e, anteil: n ? t / n : 0, erw: n ? e / n : 0, lift: e ? t / e : 0 }; };

  const balken = (box, items, opts = {}) => {
    box.replaceChildren();
    if (!items.length) { box.append(el('p', { class: 'mut', text: 'Keine Daten für diese Auswahl.' })); return; }
    const max = opts.max || d3.max(items, (d) => d.w);
    for (const d of items) {
      const row = el('div', { class: 'ja-bar' + (d.sel ? ' sel' : '') }, el('span', { class: 'nm', text: d.label, title: d.label }), el('span', { class: 'tr' }), el('span', { class: 'v', text: d.text }));
      const fl = el('span', { class: 'fl' }); fl.style.display = 'block'; fl.style.width = Math.max(0.5, d.w / max * 100) + '%'; fl.style.background = d.color || 'var(--akzent)';
      row.children[1].append(fl); row.style.cursor = 'default';
      if (opts.marke != null) { const m = el('span', { class: 'an-marke' }); m.style.left = (opts.marke / max * 100) + '%'; row.children[1].style.position = 'relative'; row.children[1].append(m); }
      box.append(row);
    }
  };

  const paare = (box, items, selKey, labelL, titleFn) => {
    box.replaceChildren();
    if (!items.length) { box.append(el('p', { class: 'mut', text: 'Zu wenige Daten für diese Auswahl.' })); return; }
    const maxA = d3.max(items, (d) => Math.max(d.m, d.a)) || 1;
    for (const d of items) {
      const zeile = el('div', { class: 'an-feld' + (selKey === d.f ? ' sel' : ''), 'data-feld': d.f, tabindex: '0', role: 'button', 'aria-pressed': String(selKey === d.f) },
        el('span', { class: 'an-fn', text: labelL(d), title: labelL(d) }),
        el('span', { class: 'an-paar' }, el('span', { class: 'an-b an-m' }), el('span', { class: 'an-b an-a' })),
        el('span', { class: 'an-wert', text: pct(d.m) + ' / ' + pct(d.a) }),
        el('span', { class: 'an-x', text: d.a ? fak(d.m / d.a) : '–' }));
      zeile.querySelector('.an-m').style.width = (d.m / maxA * 100) + '%';
      zeile.querySelector('.an-a').style.width = (d.a / maxA * 100) + '%';
      zeile.title = titleFn(d); box.append(zeile);
    }
  };
  const berufLabel = (d) => d.f + ' ← ' + (D.feldBerufe.get(d.f) || []).join(', ');
  const zeichneBeruf = () => {
    const imR = (r) => r.g >= rom(z.von) && r.g <= rom(z.bis) && (!z.klubs.size || z.klubs.has(r.klub));
    const K = D.K.filter((r) => imR(r) && (!z.ohneSerien || r.serie === 0) && D.feldBerufe.has(r.feld));
    // Beruf -> Anfragen
    const ka = d3.rollup(K, (v) => { const b = v.filter((r) => r.beruf), o = v.filter((r) => !r.beruf); const bn = d3.sum(b, (r) => r.n), on = d3.sum(o, (r) => r.n); return { m: bn ? d3.sum(b, (r) => r.treffer) / bn : 0, a: on ? d3.sum(o, (r) => r.treffer) / on : 0, mn: bn }; }, (r) => r.feld);
    const anf = [...ka].map(([f, o]) => ({ f, ...o })).filter((d) => d.mn >= 50 && d.a > 0).sort((x, y) => y.m / y.a - x.m / x.a);
    paare($('#be-anf'), anf, z.bfeld, berufLabel, (d) => berufLabel(d) + ': Abgeordnete mit passendem Beruf ' + pct(d.m) + ' ihrer Anfragen an Ressorts des Felds (' + fmt(d.mn) + ' Anfragen), andere ' + pct(d.a));
    // Beruf -> Ausschuss
    const BA = D.BA.filter(imR);
    const kb = d3.rollup(BA, (v) => { const b = v.filter((r) => r.beruf), o = v.filter((r) => !r.beruf); const bp = d3.sum(b, (r) => r.personen), op = d3.sum(o, (r) => r.personen); return { m: bp ? d3.sum(b, (r) => r.im_ausschuss) / bp : 0, a: op ? d3.sum(o, (r) => r.im_ausschuss) / op : 0, mn: bp }; }, (r) => r.feld);
    const aus = [...kb].filter(([f]) => D.feldBerufe.has(f)).map(([f, o]) => ({ f, ...o })).filter((d) => d.mn >= 5 && d.a > 0).sort((x, y) => y.m / y.a - x.m / x.a);
    paare($('#be-aus'), aus, z.bfeld, berufLabel, (d) => berufLabel(d) + ': ' + pct(d.m) + ' der Abgeordneten mit passendem Beruf sitzen im Ausschuss (' + fmt(d.mn) + ' Personen je Periode), andere ' + pct(d.a));
    // Kombination für ein Feld
    const kf = K.filter((r) => r.feld === z.bfeld);
    const grp = (b, a) => { const v = kf.filter((r) => r.beruf === b && r.ausschuss === a); const n = d3.sum(v, (r) => r.n); return { n, s: n ? d3.sum(v, (r) => r.treffer) / n : 0 }; };
    const g4 = [['Passender Beruf und im Ausschuss', 1, 1, 'var(--akzent)'], ['Im Ausschuss, anderer Beruf', 0, 1, '#8d84b8'], ['Passender Beruf, nicht im Ausschuss', 1, 0, '#b9b3d6'], ['Weder noch', 0, 0, 'var(--cds-chart-muted)']].map(([l, b, a, c]) => ({ l, c, ...grp(b, a) }));
    const box = $('#be-kombi'); box.replaceChildren();
    const max = d3.max(g4, (d) => d.s) || 1;
    for (const d of g4) {
      const row = el('div', { class: 'ja-bar' }, el('span', { class: 'nm', text: d.l, title: d.l }), el('span', { class: 'tr' }), el('span', { class: 'v', text: d.n >= 30 ? pct(d.s) + ' · ' + fmt(d.n) + ' Anfragen' : 'zu wenige Daten' }));
      const fl = el('span', { class: 'fl' }); fl.style.display = 'block'; fl.style.width = (d.n >= 30 ? Math.max(0.5, d.s / max * 100) : 0) + '%'; fl.style.background = d.c;
      row.children[1].append(fl); row.style.cursor = 'default'; box.append(row);
    }
    $('#be-kombi-note').textContent = 'Anteil der Anfragen an Ressorts des Felds „' + z.bfeld + '“, nach Beruf (' + (D.feldBerufe.get(z.bfeld) || []).join(', ') + ') und Mitgliedschaft im passenden Fachausschuss.';
  };

  const zeichne = () => {
    if (!D) return;
    zeichneBeruf();
    // Klub-Chips
    const kl = [...d3.rollup(D.PF.filter((r) => r.g >= rom(z.von) && r.g <= rom(z.bis)), (v) => d3.sum(v, (r) => r.n), (r) => r.klub)].filter(([k]) => MODERN.includes(k)).sort((a, b) => b[1] - a[1]);
    $('#an-klubs').replaceChildren(...kl.map(([k]) => { const b = el('button', { type: 'button', class: 'ja-chip', 'data-k': k, 'aria-pressed': String(z.klubs.has(k)) }, el('span', { class: 'ja-sw' }), document.createTextNode(k)); b.firstChild.style.background = farbe(k); return b; }));
    $('#an-von').value = z.von; $('#an-bis').value = z.bis;
    const PF = D.PF.filter(imRahmen);
    const k = kennz(PF);
    // Kopfzahlen
    $('#an-lift').textContent = k.e ? fak(k.lift) : '–';
    $('#an-anteil').textContent = pct(k.anteil);
    $('#an-erw').textContent = pct(k.erw);
    $('#an-n').textContent = fmt(k.n);
    $('#an-status').textContent = 'Auswahl: ' + z.von + '. bis ' + z.bis + '. GP' + (z.klubs.size ? ', ' + [...z.klubs].join(', ') : ', alle Klubs') + (z.ohneSerien ? ', ohne Serienanfragen' : '') + '.';
    // Felder
    const F = D.F.filter((r) => r.g >= rom(z.von) && r.g <= rom(z.bis) && (!z.klubs.size || z.klubs.has(r.klub)) && (!z.ohneSerien || r.serie === 0));
    const fm = d3.rollup(F, (v) => ({ mn: d3.sum(v.filter((r) => r.mitglied), (r) => r.n), mt: d3.sum(v.filter((r) => r.mitglied), (r) => r.treffer), an: d3.sum(v.filter((r) => !r.mitglied), (r) => r.n), at: d3.sum(v.filter((r) => !r.mitglied), (r) => r.treffer) }), (r) => r.feld);
    const felder = [...fm].map(([f, o]) => ({ f, m: o.mn ? o.mt / o.mn : 0, a: o.an ? o.at / o.an : 0, mn: o.mn, mt: o.mt })).filter((d) => d.mn >= 50 && d.a > 0).map((d) => ({ ...d, lift: d.m / d.a })).sort((a, b) => b.lift - a.lift);
    const maxA = d3.max(felder, (d) => Math.max(d.m, d.a)) || 1;
    const box = $('#an-felder'); box.replaceChildren();
    for (const d of felder) {
      const zeile = el('div', { class: 'an-feld' + (z.feld === d.f ? ' sel' : ''), 'data-feld': d.f, tabindex: '0', role: 'button', 'aria-pressed': String(z.feld === d.f) },
        el('span', { class: 'an-fn', text: d.f }),
        el('span', { class: 'an-paar' }, el('span', { class: 'an-b an-m' }), el('span', { class: 'an-b an-a' })),
        el('span', { class: 'an-wert', text: pct(d.m) + ' / ' + pct(d.a) }),
        el('span', { class: 'an-x', text: fak(d.lift) }));
      zeile.querySelector('.an-m').style.width = (d.m / maxA * 100) + '%';
      zeile.querySelector('.an-a').style.width = (d.a / maxA * 100) + '%';
      zeile.title = d.f + ': Mitglieder ' + pct(d.m) + ' (' + fmt(d.mt) + ' von ' + fmt(d.mn) + ' Anfragen), andere ' + pct(d.a);
      box.append(zeile);
    }
    // je GP
    const gps = D.gps.filter((g) => rom(g) >= rom(z.von) && rom(g) <= rom(z.bis));
    balken($('#an-gp'), gps.map((g) => { const kk = kennz(PF.filter((r) => r.gp === g)); return { label: g + '. GP', w: kk.lift, text: kk.e ? fak(kk.lift) + ' · ' + pct(kk.anteil) + ' statt ' + pct(kk.erw) : '–' }; }), { max: 3.5, marke: 1 });
    // je Klub
    const klubs = d3.groups(PF, (r) => r.klub).filter(([kk]) => MODERN.includes(kk)).map(([kk, v]) => ({ kk, ...kennz(v) })).filter((d) => d.n >= 200).sort((a, b) => b.lift - a.lift);
    balken($('#an-klub'), klubs.map((d) => ({ label: d.kk, w: d.lift, color: farbe(d.kk), text: fak(d.lift) + ' · ' + pct(d.anteil) + ' statt ' + pct(d.erw) })), { max: 3.5, marke: 1 });
    // Personen
    const ag = new Map();
    for (const r of PF) {
      if (z.feld && !String(r.felder).split('|').includes(z.feld)) continue;
      const o = ag.get(r.pad) || { pad: r.pad, n: 0, t: 0, e: 0, klubs: new Set(), top: new Map() };
      o.n += N(r); o.t += T(r); o.e += N(r) * E(r); o.klubs.add(r.klub); if (r.top) o.top.set(r.top, (o.top.get(r.top) || 0) + 1); ag.set(r.pad, o);
    }
    let L = [...ag.values()].filter((o) => o.n >= 20).map((o) => ({ ...o, name: nm((D.pers.get(o.pad) || {}).name || o.pad), klub: [...o.klubs].join(', '), anteil: o.t / o.n, erw: o.e / o.n, lift: o.e ? o.t / o.e : 0, hauptfeld: [...o.top].sort((a, b) => b[1] - a[1]).map((x) => x[0])[0] || '–' }));
    L.sort((a, b) => { const x = a[z.sort], y = b[z.sort]; return typeof x === 'string' ? z.dir * x.localeCompare(y, 'de') : z.dir * (x - y); });
    $('#an-tab-note').textContent = (z.feld ? 'Mitglieder im Feld „' + z.feld + '“, ' : '') + 'Abgeordnete mit mindestens 20 Anfragen in der Auswahl: ' + fmt(L.length) + '. Anteil = Anfragen an Ressorts der eigenen Ausschussthemen; erwartet = Anteil, den man bei zufälliger Verteilung wie im Durchschnitt aller Anfragen der Periode erwarten würde.';
    $('#an-tab thead').querySelectorAll('th').forEach((th) => { const b = th.querySelector('button'); if (b) th.setAttribute('aria-sort', b.dataset.s === z.sort ? (z.dir > 0 ? 'ascending' : 'descending') : 'none'); });
    const PRO = 25, seiten = Math.max(1, Math.ceil(L.length / PRO)); if (z.seite >= seiten) z.seite = seiten - 1;
    const teil = L.slice(z.seite * PRO, (z.seite + 1) * PRO);
    $('#an-tab tbody').replaceChildren(...teil.map((o) => el('tr', {},
      el('td', {}, el('a', { href: BASIS + '/person/' + o.pad, target: '_blank', rel: 'noopener', text: o.name })), el('td', { text: o.klub }),
      el('td', { text: fmt(o.n) }), el('td', { text: pct(o.anteil) }), el('td', { text: pct(o.erw) }), el('td', { text: fak(o.lift) }), el('td', { class: 'an-hide', text: o.hauptfeld }),
      el('td', {}, el('button', { type: 'button', class: 'ja-mini', 'data-anfragen': o.pad, text: 'Anfragen →' })))));
    const btn = (l, p, aus) => el('button', { type: 'button', class: 'ja-btn', 'data-p': String(p), text: l, ...(aus ? { disabled: '' } : {}) });
    $('#an-pager').replaceChildren(el('span', { text: L.length ? (z.seite * PRO + 1) + '–' + (z.seite * PRO + teil.length) + ' von ' + fmt(L.length) : 'Keine Abgeordneten für diese Auswahl.' }),
      el('span', { class: 'ja-pair' }, btn('‹ Zurück', z.seite - 1, z.seite === 0), el('span', { text: 'Seite ' + (z.seite + 1) + ' von ' + seiten }), btn('Weiter ›', z.seite + 1, z.seite >= seiten - 1)));
  };
})();
