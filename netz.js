// Ausschuss-Netzwerk: Abgeordnete und Ausschüsse je Gesetzgebungsperiode
(() => {
  const $ = (s) => document.querySelector(s);
  const BASIS = 'https://www.parlament.gv.at';
  const KLUBFARBE = { 'ÖVP': '#62C3D0', 'SPÖ': '#FF0000', 'FPÖ': '#0052FB', 'GRÜNE': '#69B12E', 'NEOS': '#E3257B',
    'BZÖ': '#FF8D04', 'LIF': '#B0D8F3', 'Team Stronach': '#F8E924', 'JETZT': '#C8C8C8' };
  const farbe = (k) => KLUBFARBE[k] || '#9aa1ad';
  const RANG = { 'Vorsitz': 5, 'Stellv. Vorsitz': 4, 'Schriftführung': 3, 'Mitglied': 2, 'Ersatzmitglied': 1 };
  const ROMV = { I: 1, V: 5, X: 10, L: 50 };
  const rom = (s) => { let n = 0; for (let i = 0; i < s.length; i++) { const a = ROMV[s[i]], b = ROMV[s[i + 1]] || 0; n += a < b ? -a : a; } return n; };
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const pct = (x) => Math.round(x * 100) + ' %';
  const nm = (n) => { const b = String(n).split('(')[0].split(',')[0].trim().split(/\s+/); if (/^(von|van|de|di)$/i.test(b[0])) return b.slice(-1).concat(b.slice(0, -1)).join(' '); return b.slice(1).concat(b.slice(0, 1)).join(' '); };
  const kurz = (n) => {
    let s = n.replace(/^Untersuchungsausschuss:\s*/, 'U-Ausschuss: ').replace(/-Untersuchungsausschuss$/, '')
      .replace(/^Ständiger Unterausschuss (des|der) /, 'UA ').replace(/^Ständiger Unterausschuss in /, 'UA ').replace(/^Unterausschuss (des|der) /, 'UA ')
      .replace(/Angelegenheiten der Europäischen Union/, 'EU').replace(/ESM-Angelegenheiten/, 'ESM')
      .replace(/^Ausschuss für /, '').replace(/ Ausschusses$/, '').replace(/^Ausschusses für /, '')
      .replace(/ausschusses/, '').replace(/ausschuss$/, '').replace(/ Ausschuss$/, '').replace(/^(UA )Ausschusses für /, '$1');
    s = s.replace(/^Ständiger gemeinsamer Ausschuss.*$/, '§ 9 F-VG-Ausschuss');
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const zustand = { gp: 'XXVIII', ansicht: 'mitwem', umfang: 'fach', ersatz: false, bruecken: false, klubs: new Set(), min: 3, auswahl: null };
  let D = null;

  const laden = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + ': HTTP ' + r.status); return r.text(); }).then((t) => d3.csvParse(t));
  Promise.all(['data/aus_mitglied.csv', 'data/aus_liste.csv', 'data/personen.csv', 'data/person_gp.csv'].map(laden)).then(([M, L, P, PG]) => {
    const aus = new Map(L.map((a) => [a.aid, a]));
    const pers = new Map(P.map((p) => [p.pad, p]));
    const klubGp = new Map(PG.map((r) => [r.pad + '|' + r.gp, r.klub]));
    D = { M, aus, pers, klubGp, gps: [...new Set(L.map((a) => a.gp))].sort((a, b) => rom(a) - rom(b)) };
    initSteuerung(); autoMin(); zeichne();
  }).catch((e) => { $('#netz-status').textContent = 'Die Daten konnten nicht geladen werden (' + e.message + '). Bitte laden Sie die Seite neu.'; });

  // ---------- Daten für die aktuelle Auswahl ----------
  const klubVon = (pad, gp) => D.klubGp.get(pad + '|' + gp) || String((D.pers.get(pad) || {}).klubs || 'ohne Angabe').split('|')[0];
  const basis = () => {
    const g = zustand.gp;
    const ok = (a) => zustand.umfang === 'alle' || (zustand.umfang === 'unter' ? a.art !== 'Untersuchungsausschuss' : a.art === 'Fachausschuss');
    const ms = D.M.filter((m) => m.gp === g && ok(D.aus.get(m.aid)) && (zustand.ersatz || m.funktion !== 'Ersatzmitglied'));
    const kl = zustand.klubs;
    return ms.filter((m) => !kl.size || kl.has(klubVon(m.pad, g)));
  };

  // Kleinste Mindestzahl gemeinsamer Ausschüsse, bei der das Netz lesbar bleibt (höchstens ~700 Verbindungen)
  const autoMin = () => {
    const ms = basis(), perAus = d3.group(ms, (m) => m.aid), pair = new Map();
    for (const [, l] of perAus) { const ps = [...new Set(l.map((m) => m.pad))].sort(); for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) { const k = ps[i] + '|' + ps[j]; pair.set(k, (pair.get(k) || 0) + 1); } }
    let k = 2; while (k < 6 && [...pair.values()].filter((v) => v >= k).length > 700) k++;
    zustand.min = k; $('#netz-min').value = k; $('#netz-min-wert').textContent = k;
  };

  // ---------- Steuerung ----------
  const initSteuerung = () => {
    const sel = $('#netz-gp');
    sel.replaceChildren(...D.gps.slice().reverse().map((g) => new Option(g + '. GP', g)));
    sel.value = zustand.gp;
    sel.addEventListener('change', () => { zustand.gp = sel.value; zustand.auswahl = null; zustand.klubs.clear(); autoMin(); zeichne(); });
    const seg = (id, key) => $(id).addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (!b) return; zustand[key] = b.dataset.v; autoMin(); zeichne(); });
    seg('#netz-umfang', 'umfang');
    $('#netz-bruecken').addEventListener('change', (e) => { zustand.bruecken = e.target.checked; zeichne(); });
    $('#netz-ersatz').addEventListener('change', (e) => { zustand.ersatz = e.target.checked; autoMin(); zeichne(); });
    $('#netz-min').addEventListener('input', (e) => { zustand.min = Number(e.target.value); $('#netz-min-wert').textContent = e.target.value; zeichne(); });
    $('#netz-klubs').addEventListener('click', (e) => { const b = e.target.closest('button[data-k]'); if (!b) return; const k = b.dataset.k; zustand.klubs.has(k) ? zustand.klubs.delete(k) : zustand.klubs.add(k); zeichne(); });
    $('#netz-suche').addEventListener('change', (e) => {
      const v = e.target.value.trim(); if (!v) return;
      const n = (graph ? graph.nodes : []).find((x) => x.label === v || x.name === v);
      if (n) waehle(n.id); e.target.value = '';
    });
    $('#netz-reset').addEventListener('click', () => { zustand.auswahl = null; zustand.klubs.clear(); zeichne(); });
    $('#netz-panel').addEventListener('click', (e) => {
      const b = e.target.closest('[data-waehle]'); if (b) { e.preventDefault(); waehle(b.dataset.waehle); return; }
      const a = e.target.closest('button[data-anfragen]');
      if (a) {
        try { localStorage.setItem('nrz-uebergabe', JSON.stringify({ typ: 'J', person: [a.dataset.anfragen] })); } catch (err) { /* ohne Speicher */ }
        location.href = 'anfragen.html';
      }
    });
  };

  // ---------- Graph ----------
  let graph = null, sim = null;
  const W = () => Math.max(320, $('#netz-graph').clientWidth);
  const H = () => (window.innerWidth < 700 ? 520 : 760);

  const baueGraph = () => {
    const g = zustand.gp, ms = basis();
    const nodes = new Map(), links = [];
    const perPerson = d3.group(ms, (m) => m.pad), perAus = d3.group(ms, (m) => m.aid);
    for (const [pad, l] of perPerson) {
      const p = D.pers.get(pad) || {};
      nodes.set('p' + pad, { id: 'p' + pad, typ: 'p', pad, name: p.name || pad, label: nm(p.name || pad), klub: klubVon(pad, g), n: l.length, geschlecht: p.geschlecht });
    }
    if (zustand.ansicht === 'bipartit') {
      for (const [aid, l] of perAus) { const a = D.aus.get(aid); nodes.set('a' + aid, { id: 'a' + aid, typ: 'a', aid, name: a.name, label: kurz(a.name), art: a.art, url: a.url, n: l.length }); }
      for (const m of ms) links.push({ source: 'p' + m.pad, target: 'a' + m.aid, f: m.funktion, w: 1 });
    } else {
      const pair = new Map();
      for (const [, l] of perAus) {
        const ps = [...new Set(l.map((m) => m.pad))].sort();
        for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) { const k = ps[i] + '|' + ps[j]; pair.set(k, (pair.get(k) || 0) + 1); }
      }
      const hat = new Set();
      for (const [k, w] of pair) {
        if (w < zustand.min) continue;
        const [a, b] = k.split('|'); const quer = klubVon(a, g) !== klubVon(b, g);
        if (zustand.bruecken && !quer) continue;
        links.push({ source: 'p' + a, target: 'p' + b, w, quer }); hat.add('p' + a); hat.add('p' + b);
      }
      for (const l of links) { nodes.get(l.source).deg = (nodes.get(l.source).deg || 0) + 1; nodes.get(l.target).deg = (nodes.get(l.target).deg || 0) + 1; }
      for (const id of [...nodes.keys()]) if (!hat.has(id)) nodes.delete(id);
      graph && (graph.pair = pair);
      return { nodes: [...nodes.values()], links, pair, ms };
    }
    return { nodes: [...nodes.values()], links, ms };
  };

  const zeichne = () => {
    if (!D) return;
    $('#netz-umfang').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === zustand.umfang)));
    // Klub-Chips
    const alle = D.M.filter((m) => m.gp === zustand.gp);
    const kc = d3.rollup(alle, (v) => new Set(v.map((m) => m.pad)).size, (m) => klubVon(m.pad, zustand.gp));
    $('#netz-klubs').replaceChildren(...[...kc].sort((a, b) => b[1] - a[1]).map(([k]) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ja-chip'; b.dataset.k = k; b.setAttribute('aria-pressed', String(zustand.klubs.has(k)));
      const s = document.createElement('span'); s.className = 'ja-sw'; s.style.background = farbe(k); b.append(s, document.createTextNode(k)); return b;
    }));
    graph = baueGraph();
    // Suchliste
    $('#netz-namen').replaceChildren(...graph.nodes.map((n) => { const o = document.createElement('option'); o.value = n.label; return o; }));
    const np = graph.nodes.filter((n) => n.typ === 'p').length, na = graph.nodes.filter((n) => n.typ === 'a').length;
    $('#netz-status').textContent = zustand.ansicht === 'bipartit'
      ? fmt(np) + ' Abgeordnete, ' + fmt(na) + ' Ausschüsse, ' + fmt(graph.links.length) + ' Mitgliedschaften in der ' + zustand.gp + '. GP'
      : fmt(np) + ' Abgeordnete, ' + fmt(graph.links.length) + (zustand.bruecken ? ' klubübergreifende' : '') + ' Verbindungen (mindestens ' + zustand.min + ' gemeinsame Ausschüsse) in der ' + zustand.gp + '. GP';
    if (zustand.auswahl && !graph.nodes.some((n) => n.id === zustand.auswahl)) zustand.auswahl = null;
    render();
    panel();
    tabellen();
  };

  let svgSel = null, gZoom = null, nodeSel = null, linkSel = null, labelSel = null;
  const render = () => {
    const box = $('#netz-graph'); box.replaceChildren();
    if (sim) sim.stop();
    const w = W(), h = H();
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('height', h).attr('viewBox', `0 0 ${w} ${h}`).attr('role', 'img')
      .attr('aria-label', 'Netzwerk der Ausschussmitgliedschaften').style('display', 'block').style('cursor', 'grab');
    svgSel = svg;
    gZoom = svg.append('g');
    let kAkt = 1;
    const zoom = d3.zoom().scaleExtent([0.3, 6])
      .on('zoom', (e) => { gZoom.attr('transform', e.transform); kAkt = e.transform.k; skaliereText(kAkt); })
      .on('end', () => beschriften(kAkt));
    svg.call(zoom);
    svg.on('click', (e) => { if (e.target.tagName === 'svg') { zustand.auswahl = null; hervorheben(); panel(); } });
    if (!graph.nodes.length) { svg.append('text').attr('x', w / 2).attr('y', h / 2).attr('text-anchor', 'middle').attr('fill', 'var(--grau)').text('Keine Verbindungen für diese Auswahl. Senken Sie die Mindestzahl oder nehmen Sie Unterausschüsse dazu.'); return; }
    const bip = zustand.ansicht === 'bipartit';
    const rP = (n) => bip ? 3.5 + Math.sqrt(n.n) * 1.6 : 3.5 + Math.sqrt(n.deg || 1) * 1.5;
    const topDeg = new Set(graph.nodes.slice().sort((a, b) => (b.deg || 0) - (a.deg || 0)).slice(0, 14).map((n) => n.id));
    const rA = (n) => 7 + Math.sqrt(n.n) * 2.2;
    const maxW = d3.max(graph.links, (l) => l.w) || 1;
    linkSel = gZoom.append('g').attr('stroke-linecap', 'round').selectAll('line').data(graph.links).join('line')
      .attr('stroke', (l) => bip ? 'var(--cds-chart-axis)' : l.quer ? 'var(--tinte)' : farbe(graph.nodes.find((n) => n.id === (l.source.id || l.source)).klub)).attr('stroke-opacity', bip ? 0.28 : 0.35)
      .attr('stroke-width', (l) => bip ? (l.f === 'Vorsitz' ? 2.2 : l.f === 'Ersatzmitglied' ? 0.6 : 1) : 0.6 + 3 * (l.w - zustand.min + 1) / (maxW - zustand.min + 1))
      .attr('stroke-dasharray', (l) => l.f === 'Ersatzmitglied' ? '2 3' : null);
    nodeSel = gZoom.append('g').selectAll('path').data(graph.nodes).join('path')
      .attr('d', (n) => n.typ === 'a' ? d3.symbol(d3.symbolSquare, Math.pow(rA(n) * 1.8, 2))() : d3.symbol(d3.symbolCircle, Math.PI * rP(n) * rP(n))())
      .attr('fill', (n) => n.typ === 'a' ? 'var(--flaeche)' : farbe(n.klub))
      .attr('stroke', (n) => n.typ === 'a' ? 'var(--tinte)' : 'var(--flaeche)').attr('stroke-width', (n) => n.typ === 'a' ? 1.5 : 1)
      .style('cursor', 'pointer')
      .on('click', (e, n) => { e.stopPropagation(); waehle(n.id); })
      .on('mouseenter', (e, n) => tipp(e, n)).on('mousemove', (e, n) => tipp(e, n)).on('mouseleave', () => { $('#netz-tip').style.display = 'none'; })
      .call(d3.drag().on('start', (e, n) => { if (!e.active) sim.alphaTarget(0.2).restart(); n.fx = n.x; n.fy = n.y; })
        .on('drag', (e, n) => { n.fx = e.x; n.fy = e.y; }).on('end', (e, n) => { if (!e.active) sim.alphaTarget(0); n.fx = null; n.fy = null; }));
    labelSel = gZoom.append('g').attr('pointer-events', 'none').selectAll('text').data(graph.nodes).join('text')
      .text((n) => n.label).attr('font-size', 12).attr('font-weight', (n) => n.typ === 'a' ? 600 : 500)
      .attr('fill', 'var(--tinte)').attr('stroke', 'var(--papier)').attr('stroke-width', 3).attr('paint-order', 'stroke')
      .attr('text-anchor', 'middle').attr('dy', (n) => n.typ === 'a' ? -rA(n) * 0.95 - 4 : -rP(n) - 4);
    sim = d3.forceSimulation(graph.nodes)
      .force('link', d3.forceLink(graph.links).id((n) => n.id).distance(bip ? 46 : (l) => 120 - 10 * Math.min(l.w, 6)).strength(bip ? 0.35 : (l) => 0.05 + 0.03 * l.w))
      .force('charge', d3.forceManyBody().strength((n) => n.typ === 'a' ? -260 : bip ? -28 : -260).distanceMax(600))
      .force('collide', d3.forceCollide((n) => (n.typ === 'a' ? rA(n) * 1.3 : rP(n)) + 16).iterations(2))
      .force('x', d3.forceX(w / 2).strength(0.035)).force('y', d3.forceY(h / 2).strength(0.045))
      .on('tick', () => {
        linkSel.attr('x1', (l) => l.source.x).attr('y1', (l) => l.source.y).attr('x2', (l) => l.target.x).attr('y2', (l) => l.target.y);
        nodeSel.attr('transform', (n) => `translate(${n.x},${n.y})`);
        labelSel.attr('x', (n) => n.x).attr('y', (n) => n.y);
      })
      .on('end', () => {
        // nach dem Einpendeln das ganze Netz in die Fläche einpassen
        const xs = graph.nodes.map((n) => n.x), ys = graph.nodes.map((n) => n.y);
        const x0 = d3.min(xs) - 90, x1 = d3.max(xs) + 90, y0 = d3.min(ys) - 40, y1 = d3.max(ys) + 30;
        const s = Math.max(0.55, Math.min(w / (x1 - x0), h / (y1 - y0), 1.6));
        const tr = d3.zoomIdentity.translate(w / 2 - s * (x0 + x1) / 2, h / 2 - s * (y0 + y1) / 2).scale(s);
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) svg.call(zoom.transform, tr); else svg.transition().duration(500).call(zoom.transform, tr);
        beschriften(s);
      });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { sim.stop(); for (let i = 0; i < 300; i++) sim.tick(); sim.on('tick')(); sim.on('end')(); }
    topDegSet = topDeg;
    hervorheben();
  };

  const nachbarn = (id) => {
    const s = new Set([id]);
    for (const l of graph.links) { const a = l.source.id || l.source, b = l.target.id || l.target; if (a === id) s.add(b); if (b === id) s.add(a); }
    return s;
  };
  let topDegSet = new Set();
  let sichtbar = new Set();
  const skaliereText = (k) => {
    if (!labelSel) return;
    labelSel.attr('font-size', 12 / k).attr('stroke-width', 3 / k);
    if (nodeSel) nodeSel.attr('stroke-width', (n) => (n.id === zustand.auswahl ? 3 : 1) / Math.sqrt(k));
  };
  // So viele Namen wie ohne Überlappung Platz haben, die am stärksten vernetzten zuerst
  const beschriften = (k) => {
    if (!graph || !labelSel) return;
    const boxen = [], neu = new Set();
    const nb = zustand.auswahl ? nachbarn(zustand.auswahl) : null;
    const kand = graph.nodes.filter((n) => !nb || nb.has(n.id)).sort((a, b) => (b.id === zustand.auswahl) - (a.id === zustand.auswahl) || (b.deg || 0) - (a.deg || 0));
    const fs = 12 / k;
    for (const n of kand) {
      if (n.x == null) continue;
      const bw = n.label.length * fs * 0.56 + 4 / k, bh = fs * 1.25, r = (3.5 + Math.sqrt(n.deg || 1) * 1.5);
      const b = { x0: n.x - bw / 2, x1: n.x + bw / 2, y0: n.y - r - 4 / k - bh, y1: n.y - r - 2 / k };
      if (boxen.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0)) continue;
      boxen.push(b); neu.add(n.id);
    }
    sichtbar = neu;
    labelSel.attr('opacity', (n) => sichtbar.has(n.id) ? 1 : 0);
  };
  const hervorheben = () => {
    if (!nodeSel) return;
    const sel = zustand.auswahl, nb = sel ? nachbarn(sel) : null;
    const bip = zustand.ansicht === 'bipartit';
    nodeSel.attr('opacity', (n) => !nb || nb.has(n.id) ? 1 : 0.12).attr('stroke-width', (n) => n.id === sel ? 3 : n.typ === 'a' ? 1.5 : 1)
      .attr('stroke', (n) => n.id === sel ? 'var(--akzent)' : n.typ === 'a' ? 'var(--tinte)' : 'var(--flaeche)');
    linkSel.attr('stroke-opacity', (l) => !sel ? (bip ? 0.28 : 0.35) : ((l.source.id || l.source) === sel || (l.target.id || l.target) === sel) ? 0.85 : 0.04)
      .attr('stroke', (l) => sel && ((l.source.id || l.source) === sel || (l.target.id || l.target) === sel) ? 'var(--akzent)' : bip ? 'var(--cds-chart-axis)' : l.quer ? 'var(--tinte)' : farbe((l.source.klub) || 'x'));
    const k = svgSel ? d3.zoomTransform(svgSel.node()).k : 1;
    beschriften(k);
  };
  const tipp = (e, n) => {
    const t = $('#netz-tip'), bb = $('#netz-graph').getBoundingClientRect();
    t.textContent = n.typ === 'a' ? n.name + ' · ' + n.n + ' Mitglieder' : n.label + ' (' + n.klub + ') · ' + (n.deg || 0) + ' Verbindungen, ' + n.n + ' Ausschüsse';
    t.style.display = 'block';
    let x = e.clientX - bb.left + 12; if (x + t.offsetWidth > bb.width) x = e.clientX - bb.left - t.offsetWidth - 12;
    t.style.left = x + 'px'; t.style.top = (e.clientY - bb.top + 12) + 'px';
  };
  const waehle = (id) => { zustand.auswahl = zustand.auswahl === id ? null : id; hervorheben(); panel(); if (window.innerWidth < 900 && zustand.auswahl) $('#netz-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };

  // ---------- Detailpanel ----------
  const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v); } e.append(...kids); return e; };
  const panel = () => {
    const p = $('#netz-panel'); p.replaceChildren();
    const g = zustand.gp, alleM = D.M.filter((m) => m.gp === g && (zustand.ersatz || m.funktion !== 'Ersatzmitglied'));
    if (!zustand.auswahl) {
      p.append(el('h3', { text: 'Klicken Sie auf eine Person' }),
        el('p', { text: 'Jeder Punkt ist ein:e Abgeordnete:r in der Farbe des Klubs, größer heißt mehr Verbindungen. Eine Linie verbindet zwei Personen, die gemeinsam in mindestens so vielen Ausschüssen sitzen wie eingestellt.' }),
        el('p', { class: 'mut', text: 'Farbige Linien verbinden Personen desselben Klubs, dunkle Linien sind klubübergreifend. Ein Klick zeigt Ausschüsse und Kolleg:innen, Ziehen verschiebt Punkte, Mausrad oder zwei Finger zoomen.' }));
      return;
    }
    if (zustand.auswahl.startsWith('a')) {
      const aid = zustand.auswahl.slice(1), a = D.aus.get(aid);
      const ms = alleM.filter((m) => m.aid === aid).sort((x, y) => RANG[y.funktion] - RANG[x.funktion]);
      const kl = d3.rollup(ms, (v) => v.length, (m) => klubVon(m.pad, g));
      p.append(el('span', { class: 'augenbraue', text: a.art + ' · ' + g + '. GP' }), el('h3', { text: a.name }));
      if (a.url) p.append(el('p', {}, el('a', { href: BASIS + a.url, target: '_blank', rel: 'noopener', text: 'Ausschussseite auf parlament.gv.at' })));
      const bar = el('div', { class: 'netz-stapel', role: 'img', 'aria-label': 'Mitglieder nach Klub' });
      for (const [k, n] of [...kl].sort((x, y) => y[1] - x[1])) { const s = el('span', { title: k + ': ' + n }); s.style.flex = n; s.style.background = farbe(k); bar.append(s); }
      p.append(el('p', { class: 'mut', text: ms.length + (zustand.ersatz ? ' Mitglieder und Ersatzmitglieder' : ' Mitglieder') }), bar,
        el('p', { class: 'mut', text: [...kl].sort((x, y) => y[1] - x[1]).map(([k, n]) => k + ' ' + n).join(' · ') }));
      const ul = el('ul', { class: 'netz-liste' });
      for (const m of ms) {
        const pp = D.pers.get(m.pad) || {};
        const li = el('li', {}, el('span', { class: 'ja-sw' }), el('a', { href: '#', 'data-waehle': 'p' + m.pad, text: nm(pp.name || m.pad) }), el('span', { class: 'mut', text: ' ' + klubVon(m.pad, g) + (m.funktion !== 'Mitglied' ? ' · ' + m.funktion : '') }));
        li.firstChild.style.background = farbe(klubVon(m.pad, g)); ul.append(li);
      }
      p.append(ul);
    } else {
      const pad = zustand.auswahl.slice(1), pp = D.pers.get(pad) || {};
      const meine = alleM.filter((m) => m.pad === pad).sort((x, y) => RANG[y.funktion] - RANG[x.funktion]);
      p.append(el('span', { class: 'augenbraue', text: klubVon(pad, g) + ' · ' + g + '. GP' }), el('h3', { text: nm(pp.name || pad) }));
      p.append(el('p', {}, el('a', { href: BASIS + '/person/' + pad, target: '_blank', rel: 'noopener', text: 'Personenseite auf parlament.gv.at' })));
      if (pp.beruf_text) p.append(el('p', { class: 'mut', text: 'Beruf: ' + pp.beruf_text }));
      p.append(el('h4', { text: 'Ausschüsse (' + meine.length + ')' }));
      const ul = el('ul', { class: 'netz-liste' });
      for (const m of meine) { const a = D.aus.get(m.aid); ul.append(el('li', {}, a.url ? el('a', { href: BASIS + a.url, target: '_blank', rel: 'noopener', text: kurz(a.name), title: a.name }) : el('span', { text: kurz(a.name) }), el('span', { class: 'mut', text: m.funktion !== 'Mitglied' ? ' · ' + m.funktion : '' }))); }
      p.append(ul);
      // häufigste Kolleg:innen
      const meineAus = new Set(meine.map((m) => m.aid));
      const ko = new Map();
      for (const m of alleM) if (m.pad !== pad && meineAus.has(m.aid)) ko.set(m.pad, (ko.get(m.pad) || 0) + 1);
      const top = [...ko].sort((a, b) => b[1] - a[1]).slice(0, 8);
      if (top.length) {
        p.append(el('h4', { text: 'Häufigste Ausschusskolleg:innen' }));
        const ul2 = el('ul', { class: 'netz-liste' });
        for (const [x, n] of top) { const li = el('li', {}, el('span', { class: 'ja-sw' }), el('a', { href: '#', 'data-waehle': 'p' + x, text: nm((D.pers.get(x) || {}).name || x) }), el('span', { class: 'mut', text: ' ' + klubVon(x, g) + ' · ' + n + ' gemeinsam' })); li.firstChild.style.background = farbe(klubVon(x, g)); ul2.append(li); }
        p.append(ul2);
      }
      p.append(el('p', {}, el('button', { type: 'button', class: 'ja-btn', 'data-anfragen': pad, text: 'Anfragen dieser Person →' })));
    }
  };

  // ---------- Tabellen unter dem Netzwerk ----------
  const tabellen = () => {
    const g = zustand.gp, ms = basis().filter((m) => m.funktion !== 'Ersatzmitglied');
    // Vielbeschäftigte
    const per = d3.rollup(ms, (v) => v.length, (m) => m.pad);
    const vb = [...per].sort((a, b) => b[1] - a[1]).slice(0, 10);
    $('#netz-viel tbody').replaceChildren(...vb.map(([pad, n]) => el('tr', {}, el('td', {}, el('a', { href: '#netz-graph', 'data-waehle': 'p' + pad, text: nm((D.pers.get(pad) || {}).name || pad) })), el('td', { text: klubVon(pad, g) }), el('td', { text: String(n) }))));
    // Tandems über Klubgrenzen
    const perAus = d3.group(ms, (m) => m.aid), pair = new Map();
    for (const [, l] of perAus) { const ps = [...new Set(l.map((m) => m.pad))].sort(); for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) { const k = ps[i] + '|' + ps[j]; pair.set(k, (pair.get(k) || 0) + 1); } }
    const cross = [...pair].filter(([k]) => { const [a, b] = k.split('|'); return klubVon(a, g) !== klubVon(b, g); }).sort((a, b) => b[1] - a[1]).slice(0, 10);
    $('#netz-tandem tbody').replaceChildren(...cross.map(([k, n]) => { const [a, b] = k.split('|'); return el('tr', {},
      el('td', {}, el('a', { href: '#netz-graph', 'data-waehle': 'p' + a, text: nm((D.pers.get(a) || {}).name || a) }), el('span', { class: 'mut', text: ' ' + klubVon(a, g) })),
      el('td', {}, el('a', { href: '#netz-graph', 'data-waehle': 'p' + b, text: nm((D.pers.get(b) || {}).name || b) }), el('span', { class: 'mut', text: ' ' + klubVon(b, g) })),
      el('td', { text: String(n) })); }));
    // Vorsitze je Klub
    const vs = D.M.filter((m) => m.gp === g && m.funktion === 'Vorsitz' && D.aus.get(m.aid).art === 'Fachausschuss');
    const vk = d3.rollup(vs, (v) => v.length, (m) => klubVon(m.pad, g));
    const sitze = d3.rollup(D.M.filter((m) => m.gp === g), (v) => new Set(v.map((m) => m.pad)).size, (m) => klubVon(m.pad, g));
    const sumS = d3.sum([...sitze.values()]), sumV = vs.length;
    $('#netz-vorsitz tbody').replaceChildren(...[...vk].sort((a, b) => b[1] - a[1]).map(([k, n]) => el('tr', {}, el('td', {}, el('span', { class: 'ja-sw', style: 'background:' + farbe(k) }), document.createTextNode(' ' + k)), el('td', { text: String(n) }), el('td', { text: pct(n / sumV) }), el('td', { text: pct((sitze.get(k) || 0) / sumS) }))));
    const fw = vs.filter((m) => (D.pers.get(m.pad) || {}).geschlecht === 'w').length;
    $('#netz-vorsitz-note').textContent = 'Vorsitze in Fachausschüssen der ' + g + '. GP, inklusive Wechsel während der Periode: ' + sumV + ', davon ' + fw + ' von Frauen (' + (sumV ? pct(fw / sumV) : '–') + '). Zum Vergleich der Anteil des Klubs an allen Abgeordneten mit Ausschussmandat.';
    // Frauen im Vorsitz je GP (kleine Balken)
    const box = $('#netz-frauen'); box.replaceChildren();
    const reihen = D.gps.map((gg) => { const v = D.M.filter((m) => m.gp === gg && m.funktion === 'Vorsitz' && D.aus.get(m.aid).art === 'Fachausschuss'); const w = v.filter((m) => (D.pers.get(m.pad) || {}).geschlecht === 'w').length; return { gp: gg, q: v.length ? w / v.length : 0, w, n: v.length }; });
    for (const r of reihen) {
      const row = el('div', { class: 'ja-bar' + (r.gp === g ? ' sel' : '') }, el('span', { class: 'nm', text: r.gp + '. GP' }), el('span', { class: 'tr' }), el('span', { class: 'v', text: pct(r.q) + ' (' + r.w + ' von ' + r.n + ')' }));
      const fl = el('span', { class: 'fl' }); fl.style.display = 'block'; fl.style.width = (r.q * 100) + '%'; fl.style.background = 'var(--akzent)'; row.children[1].append(fl); row.style.cursor = 'default'; box.append(row);
    }
  };
  document.addEventListener('click', (e) => { const a = e.target.closest('#netz-viel a, #netz-tandem a'); if (a && a.dataset.waehle) { e.preventDefault(); if (!graph.nodes.some((n) => n.id === a.dataset.waehle)) { zustand.klubs.clear(); zustand.bruecken = false; $('#netz-bruecken').checked = false; zustand.min = 2; $('#netz-min').value = 2; $('#netz-min-wert').textContent = 2; zeichne(); } zustand.auswahl = null; waehle(a.dataset.waehle); $('#netz-karte').scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
  let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (D) render(); }, 200); });
})();
