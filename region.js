// Regionen: Regionalbezug der Anfragen, Mandatsebene, Wirtschaftsstruktur und Ausschüsse
(() => {
  const $ = (s) => document.querySelector(s);
  const BASIS = 'https://www.parlament.gv.at';
  const KLUBFARBE = { 'ÖVP': '#62C3D0', 'SPÖ': '#FF0000', 'FPÖ': '#0052FB', 'GRÜNE': '#69B12E', 'NEOS': '#E3257B',
    'BZÖ': '#FF8D04', 'LIF': '#B0D8F3', 'Team Stronach': '#F8E924', 'JETZT': '#C8C8C8' };
  const MODERN = Object.keys(KLUBFARBE);
  const BLS = ['Burgenland', 'Kärnten', 'Niederösterreich', 'Oberösterreich', 'Salzburg', 'Steiermark', 'Tirol', 'Vorarlberg', 'Wien'];
  const KURZ = { 'Burgenland': 'Bgld.', 'Kärnten': 'Ktn.', 'Niederösterreich': 'NÖ', 'Oberösterreich': 'OÖ', 'Salzburg': 'Sbg.', 'Steiermark': 'Stmk.', 'Tirol': 'Tirol', 'Vorarlberg': 'Vbg.', 'Wien': 'Wien' };
  const EBENEN = ['Regionalwahlkreis', 'Landeswahlkreis', 'Bundesliste'];
  const SEKTOREN = ['Tourismus', 'Verkehr & Mobilität', 'Wirtschaft', 'Landwirtschaft', 'Energie', 'Finanzen & Budget'];
  const SEKTOR_NAME = { 'Tourismus': 'Beherbergung und Gastronomie', 'Verkehr & Mobilität': 'Verkehr', 'Wirtschaft': 'Industrie', 'Landwirtschaft': 'Land- und Forstwirtschaft', 'Energie': 'Energieversorgung', 'Finanzen & Budget': 'Finanz- und Versicherungsleistungen' };
  const AUSSCHUSS = { 'Tourismus': 'Tourismusausschuss', 'Verkehr & Mobilität': 'Verkehrsausschuss', 'Wirtschaft': 'Wirtschafts- bzw. Industrieausschuss', 'Landwirtschaft': 'Landwirtschaftsausschuss', 'Energie': 'Energieausschuss bzw. Wirtschaftsausschuss (Energie)', 'Finanzen & Budget': 'Finanz- bzw. Budgetausschuss' };
  const ROMV = { I: 1, V: 5, X: 10, L: 50 };
  const rom = (s) => { let n = 0; for (let i = 0; i < s.length; i++) { const a = ROMV[s[i]], b = ROMV[s[i + 1]] || 0; n += a < b ? -a : a; } return n; };
  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const pct = (x) => (x * 100).toFixed(0) + ' %';
  const fak = (x) => '×' + x.toFixed(1).replace('.', ',');
  const dez = (x, d = 1) => x.toFixed(d).replace('.', ',');
  const nm = (n) => { const b = String(n).split('(')[0].split(',')[0].trim().split(/\s+/); if (/^(von|van|de|di)$/i.test(b[0])) return b.slice(-1).concat(b.slice(0, -1)).join(' '); return b.slice(1).concat(b.slice(0, 1)).join(' '); };
  const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v); } e.append(...kids); return e; };

  const z = { von: 'XX', bis: 'XXVIII', klubs: new Set(), ebenen: new Set(), bl: 'Tirol', sektor: 'Tourismus', y: 'ausschuss' };
  let D = null;
  const laden = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + ': HTTP ' + r.status); return r.text(); }).then((t) => d3.csvParse(t));
  Promise.all(['data/mp_region.csv', 'data/bl_lq.csv', 'data/bl_matrix.csv', 'data/bl_beispiele.csv', 'data/personen.csv', 'data/person_fokus.csv'].map(laden)).then(([M, LQ, MX, BS, P, PF]) => {
    for (const r of M) { r.g = rom(r.gp); for (const k of ['n', 'nr', 'reg', 'own', 'exp', 'tage']) r[k] = +r[k]; r.aus = new Set(String(r.aus || '').split('|').filter(Boolean)); for (const s of SEKTOREN) r['h_' + s] = +r['h_' + s]; }
    for (const r of LQ) { r.g = rom(r.gp); r.lq = +r.lq; r.anteil = +r.anteil; }
    for (const r of MX) { r.g = rom(r.gp); r.n = +r.n; }
    const fokus = new Map(PF.map((r) => [r.pad + '|' + r.gp, { n: +r.n, t: +r.treffer, e: +r.n * +r.erwartet }]));
    D = { M, LQ, MX, BS, fokus, pers: new Map(P.map((p) => [p.pad, p])), gps: [...new Set(M.map((r) => r.gp))].sort((a, b) => rom(a) - rom(b)) };
    init(); zeichne();
  }).catch((e) => { $('#rg-status').textContent = 'Die Daten konnten nicht geladen werden (' + e.message + ').'; });

  const init = () => {
    for (const [id, key] of [['#rg-von', 'von'], ['#rg-bis', 'bis']]) {
      const s = $(id); s.replaceChildren(...D.gps.map((g) => new Option(g + '. GP', g))); s.value = z[key];
      s.addEventListener('change', () => { z[key] = s.value; if (rom(z.von) > rom(z.bis)) { if (key === 'von') z.bis = z.von; else z.von = z.bis; } zeichne(); });
    }
    $('#rg-klubs').addEventListener('click', (e) => { const b = e.target.closest('button[data-k]'); if (!b) return; z.klubs.has(b.dataset.k) ? z.klubs.delete(b.dataset.k) : z.klubs.add(b.dataset.k); zeichne(); });
    $('#rg-ebenen').addEventListener('click', (e) => { const b = e.target.closest('button[data-k]'); if (!b) return; z.ebenen.has(b.dataset.k) ? z.ebenen.delete(b.dataset.k) : z.ebenen.add(b.dataset.k); zeichne(); });
    $('#rg-reset').addEventListener('click', () => { Object.assign(z, { von: 'XX', bis: 'XXVIII' }); z.klubs.clear(); z.ebenen.clear(); $('#rg-von').value = 'XX'; $('#rg-bis').value = 'XXVIII'; zeichne(); });
    $('#rg-matrix').addEventListener('click', (e) => { const r = e.target.closest('tr[data-bl]'); if (!r) return; z.bl = r.dataset.bl; zeichne(); });
    $('#rg-bl-bars').addEventListener('click', (e) => { const r = e.target.closest('[data-bl]'); if (!r) return; z.bl = r.dataset.bl; zeichne(); });
    $('#rg-sektor').replaceChildren(...SEKTOREN.map((s) => new Option(SEKTOR_NAME[s] + ' → ' + AUSSCHUSS[s].split(' bzw.')[0], s)));
    $('#rg-sektor').addEventListener('change', (e) => { z.sektor = e.target.value; zeichne(); });
    $('#rg-y').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (!b) return; z.y = b.dataset.v; zeichne(); });
    $('#rg-lq').addEventListener('click', (e) => { const c = e.target.closest('[data-sektor]'); if (!c) return; z.sektor = c.dataset.sektor; $('#rg-sektor').value = z.sektor; zeichne(); $('#rg-streu-karte').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
  };

  const chips = (box, werte, aktiv, farbeFn) => box.replaceChildren(...werte.map((k) => { const b = el('button', { type: 'button', class: 'ja-chip', 'data-k': k, 'aria-pressed': String(aktiv.has(k)) }); if (farbeFn) { const s = el('span', { class: 'ja-sw' }); s.style.background = farbeFn(k); b.append(s); } b.append(document.createTextNode(k)); return b; }));
  const balken = (box, items, opts = {}) => {
    box.replaceChildren();
    if (!items.length) { box.append(el('p', { class: 'mut', text: 'Zu wenige Daten für diese Auswahl.' })); return; }
    const max = opts.max || d3.max(items, (d) => d.w) || 1;
    for (const d of items) {
      const row = el('div', { class: 'ja-bar' + (d.sel ? ' sel' : ''), ...(d.key ? { 'data-bl': d.key, tabindex: '0', role: 'button' } : {}) }, el('span', { class: 'nm', text: d.label, title: d.label }), el('span', { class: 'tr' }), el('span', { class: 'v', text: d.text }));
      const fl = el('span', { class: 'fl' }); fl.style.display = 'block'; fl.style.width = Math.max(0.5, Math.min(100, d.w / max * 100)) + '%'; fl.style.background = d.color || 'var(--akzent)';
      row.children[1].append(fl); if (!d.key) row.style.cursor = 'default';
      if (opts.marke != null) { const m = el('span', { class: 'an-marke' }); m.style.left = (opts.marke / max * 100) + '%'; row.children[1].style.position = 'relative'; row.children[1].append(m); }
      box.append(row);
    }
  };

  const zeichne = () => {
    if (!D) return;
    const gv = rom(z.von), gb = rom(z.bis);
    $('#rg-von').value = z.von; $('#rg-bis').value = z.bis;
    const kl = [...d3.rollup(D.M.filter((r) => r.g >= gv && r.g <= gb), (v) => v.length, (r) => r.klub)].filter(([k]) => MODERN.includes(k)).sort((a, b) => b[1] - a[1]).map((d) => d[0]);
    chips($('#rg-klubs'), kl, z.klubs, (k) => KLUBFARBE[k]);
    chips($('#rg-ebenen'), EBENEN, z.ebenen);
    const M = D.M.filter((r) => r.g >= gv && r.g <= gb && (!z.klubs.size || z.klubs.has(r.klub)) && (!z.ebenen.size || z.ebenen.has(r.ebene)));
    $('#rg-status').textContent = 'Auswahl: ' + z.von + '. bis ' + z.bis + '. GP' + (z.klubs.size ? ', ' + [...z.klubs].join(', ') : '') + (z.ebenen.size ? ', ' + [...z.ebenen].join(', ') : '') + '.';

    // ---------- A) eigenes Bundesland ----------
    const reg = M.filter((r) => BLS.includes(r.bundesland) && r.reg);
    const own = d3.sum(reg, (r) => r.own), nreg = d3.sum(reg, (r) => r.reg), exp = d3.sum(reg, (r) => r.exp);
    $('#rg-faktor').textContent = exp ? fak(own / exp) : '–';
    $('#rg-own').textContent = nreg ? pct(own / nreg) : '–';
    $('#rg-exp').textContent = nreg ? pct(exp / nreg) : '–';
    $('#rg-nreg').textContent = fmt(d3.sum(M, (r) => r.reg));
    // je Bundesland
    balken($('#rg-bl-bars'), BLS.map((b) => { const v = reg.filter((r) => r.bundesland === b); const o = d3.sum(v, (r) => r.own), n = d3.sum(v, (r) => r.reg), e = d3.sum(v, (r) => r.exp); return { key: b, label: b, w: n ? o / n : 0, n, text: n >= 20 ? pct(o / n) + ' statt ' + pct(e / n) + ' · ' + fmt(n) + ' Anfragen' : 'zu wenige Daten', sel: z.bl === b }; }).sort((a, b) => b.w - a.w), { max: 1 });
    // Matrix
    const MX = D.MX.filter((r) => r.g >= gv && r.g <= gb && (!z.klubs.size || z.klubs.has(r.klub)));
    const zeilen = [...BLS, 'ohne Bundesland (Bundesliste u. a.)'];
    const sum = d3.rollup(MX, (v) => d3.sum(v, (r) => r.n), (r) => r.mp_bl, (r) => r.ref_bl);
    const thead = el('tr', {}, el('th', { text: 'Abgeordnete aus … / genannt' }), ...BLS.map((b) => el('th', { text: KURZ[b], title: b })));
    $('#rg-matrix thead').replaceChildren(thead);
    $('#rg-matrix tbody').replaceChildren(...zeilen.map((zb) => {
      const m = sum.get(zb) || new Map(); const tot = d3.sum([...m.values()]);
      const tr = el('tr', { 'data-bl': BLS.includes(zb) ? zb : '' }, el('td', { text: zb === z.bl ? '▸ ' + zb : zb }));
      if (!BLS.includes(zb)) tr.removeAttribute('data-bl');
      for (const b of BLS) {
        const v = tot ? (m.get(b) || 0) / tot : 0; const c = el('td', { text: tot ? pct(v) : '' });
        if (v) c.style.background = `color-mix(in srgb, var(--akzent) ${Math.round(Math.min(1, v * 1.4) * 70)}%, transparent)`;
        if (v > 0.45) c.style.color = 'var(--papier)';
        if (b === zb) c.style.fontWeight = '700';
        tr.append(c);
      }
      return tr;
    }));
    // Beispiele
    const bs = D.BS.filter((r) => r.bundesland === z.bl && rom(r.gp) >= gv && rom(r.gp) <= gb).slice(0, 8);
    $('#rg-bsp-titel').textContent = 'Beispiele: Anfragen von Abgeordneten aus ' + z.bl + ' zu ' + z.bl;
    $('#rg-bsp').replaceChildren(...(bs.length ? bs.map((r) => el('li', {}, el('a', { href: BASIS + '/gegenstand/' + r.gp + '/J/' + r.inr, target: '_blank', rel: 'noopener', text: r.betreff }), el('span', { class: 'mut', text: ' · ' + nm((D.pers.get(r.pad) || {}).name || r.pad) + ', ' + r.inr + '/J (' + r.gp + '. GP)' }))) : [el('li', { class: 'mut', text: 'Keine Beispiele im gewählten Zeitraum.' })]));

    // ---------- B) Mandatsebene ----------
    const Mall = D.M.filter((r) => r.g >= gv && r.g <= gb && (!z.klubs.size || z.klubs.has(r.klub)));
    const eb = EBENEN.map((e) => {
      const v = Mall.filter((r) => r.ebene === e); const n = d3.sum(v, (r) => r.n), jahre = d3.sum(v, (r) => r.tage) / 365.25;
      const rv = v.filter((r) => BLS.includes(r.bundesland) && r.reg);
      let ft = 0, fe = 0; for (const r of v) { const f = D.fokus.get(r.pad + '|' + r.gp); if (f) { ft += f.t; fe += f.e; } }
      return { e, n, regional: n ? d3.sum(v, (r) => r.reg) / n : 0, proJahr: jahre ? n / jahre : 0, own: d3.sum(rv, (r) => r.reg) ? d3.sum(rv, (r) => r.own) / d3.sum(rv, (r) => r.reg) : null, fokus: fe ? ft / fe : null, personen: new Set(v.map((r) => r.pad)).size };
    });
    $('#rg-ebene tbody').replaceChildren(...eb.map((d) => el('tr', {}, el('td', { text: d.e }), el('td', { text: fmt(d.personen) }), el('td', { text: dez(d.proJahr) }), el('td', { text: pct(d.regional) }), el('td', { text: d.own == null ? '–' : pct(d.own) }), el('td', { text: d.fokus == null ? '–' : fak(d.fokus) }))));
    balken($('#rg-ebene-bars'), eb.map((d) => ({ label: d.e, w: d.regional, text: pct(d.regional) + ' regionale Anfragen' })), { max: d3.max(eb, (d) => d.regional) * 1.15 || 1 });

    // ---------- C) Wirtschaftsstruktur ----------
    const LQ = D.LQ.filter((r) => r.g >= gv && r.g <= gb);
    const lqm = d3.rollup(LQ, (v) => ({ lq: d3.mean(v, (r) => r.lq), anteil: d3.mean(v, (r) => r.anteil) }), (r) => r.bundesland, (r) => r.feld);
    // Heatmap
    $('#rg-lq thead').replaceChildren(el('tr', {}, el('th', { text: 'Bundesland' }), ...SEKTOREN.map((s) => el('th', { 'data-sektor': s, class: s === z.sektor ? 'sel' : '', text: SEKTOR_NAME[s], title: 'Klick: Streudiagramm für ' + SEKTOR_NAME[s] }))));
    const farbeLQ = (q) => q >= 1 ? `color-mix(in srgb, var(--akzent) ${Math.round(Math.min(1, (q - 1) / 1.5) * 75)}%, transparent)` : `color-mix(in srgb, #c47a2c ${Math.round(Math.min(1, (1 - q) / 0.8) * 55)}%, transparent)`;
    $('#rg-lq tbody').replaceChildren(...BLS.map((b) => el('tr', {}, el('td', { text: b }), ...SEKTOREN.map((s) => { const o = (lqm.get(b) || new Map()).get(s); const c = el('td', { 'data-sektor': s, text: o ? dez(o.lq, 2) : '–', title: o ? b + ', ' + SEKTOR_NAME[s] + ': ' + dez(o.anteil * 100) + ' % der Wertschöpfung, Standortquotient ' + dez(o.lq, 2) : '' }); if (o) c.style.background = farbeLQ(o.lq); if (o && o.lq >= 2) c.style.color = 'var(--papier)'; return c; }))));
    // Streudiagramm: LQ vs Anteil im Ausschuss bzw. Anfragen
    const MR = M.filter((r) => BLS.includes(r.bundesland) && (r.ebene === 'Regionalwahlkreis' || r.ebene === 'Landeswahlkreis'));
    const s = z.sektor;
    const pts = BLS.map((b) => {
      const v = MR.filter((r) => r.bundesland === b); const o = (lqm.get(b) || new Map()).get(s);
      const yA = v.length ? v.filter((r) => r.aus.has(s)).length / v.length : null;
      const nr = d3.sum(v, (r) => r.nr); const yQ = nr ? d3.sum(v, (r) => r['h_' + s]) / nr : null;
      return { b, x: o ? o.lq : null, y: z.y === 'ausschuss' ? yA : yQ, n: z.y === 'ausschuss' ? v.length : nr };
    }).filter((p) => p.x != null && p.y != null && p.n >= 10);
    $('#rg-y').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === z.y)));
    const box = $('#rg-streu'); box.replaceChildren();
    const W = Math.max(300, box.clientWidth), H = 340, ml = 52, mr = 16, mt = 14, mb = 40;
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Streudiagramm Standortquotient und ' + (z.y === 'ausschuss' ? 'Ausschussanteil' : 'Anfragenanteil'));
    if (pts.length >= 3) {
      const x = d3.scaleLinear([0, Math.max(2, d3.max(pts, (p) => p.x) * 1.1)], [ml, W - mr]);
      const y = d3.scaleLinear([0, Math.max(0.05, d3.max(pts, (p) => p.y) * 1.2)], [H - mb, mt]).nice();
      svg.append('g').selectAll('line').data(y.ticks(5)).join('line').attr('x1', ml).attr('x2', W - mr).attr('y1', y).attr('y2', y).attr('stroke', 'var(--cds-chart-grid)');
      svg.append('g').selectAll('text').data(y.ticks(5)).join('text').attr('x', ml - 6).attr('y', y).attr('dy', '0.32em').attr('text-anchor', 'end').attr('font-size', 11).attr('fill', 'var(--grau)').text((v) => Math.round(v * 100) + ' %');
      svg.append('g').selectAll('text').data(x.ticks(6)).join('text').attr('x', x).attr('y', H - mb + 16).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', 'var(--grau)').text((v) => dez(v, 1));
      svg.append('line').attr('x1', x(1)).attr('x2', x(1)).attr('y1', mt).attr('y2', H - mb).attr('stroke', 'var(--cds-chart-reference)').attr('stroke-dasharray', '4 4');
      svg.append('text').attr('x', x(1) + 4).attr('y', mt + 10).attr('font-size', 10).attr('fill', 'var(--grau)').text('Österreich-Schnitt');
      svg.append('text').attr('x', (ml + W - mr) / 2).attr('y', H - 6).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', 'var(--grau)').text('Standortquotient ' + SEKTOR_NAME[s] + ' (1 = Österreich-Schnitt)');
      // Regressionslinie
      const mx = d3.mean(pts, (p) => p.x), my = d3.mean(pts, (p) => p.y);
      const sxx = d3.sum(pts, (p) => (p.x - mx) ** 2), sxy = d3.sum(pts, (p) => (p.x - mx) * (p.y - my)), syy = d3.sum(pts, (p) => (p.y - my) ** 2);
      const b1 = sxx ? sxy / sxx : 0, b0 = my - b1 * mx, r = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
      const [xa, xb] = x.domain();
      svg.append('line').attr('x1', x(xa)).attr('x2', x(xb)).attr('y1', y(Math.max(0, b0 + b1 * xa))).attr('y2', y(Math.max(0, b0 + b1 * xb))).attr('stroke', 'var(--akzent)').attr('stroke-width', 1.5).attr('opacity', 0.5);
      const g = svg.append('g');
      g.selectAll('circle').data(pts).join('circle').attr('cx', (p) => x(p.x)).attr('cy', (p) => y(p.y)).attr('r', (p) => 4 + Math.sqrt(p.n) * 0.25).attr('fill', 'var(--akzent)').attr('stroke', 'var(--flaeche)').attr('stroke-width', 1.5)
        .append('title').text((p) => p.b + ': Standortquotient ' + dez(p.x, 2) + ', ' + pct(p.y) + (z.y === 'ausschuss' ? ' der Abgeordneten im ' + AUSSCHUSS[s] : ' der Anfragen an Ressorts des Felds') + ' (n = ' + fmt(p.n) + ')');
      g.selectAll('text').data(pts).join('text').attr('x', (p) => x(p.x) + 8).attr('y', (p) => y(p.y) + 4).attr('font-size', 11).attr('fill', 'var(--tinte)').attr('stroke', 'var(--flaeche)').attr('stroke-width', 3).attr('paint-order', 'stroke').text((p) => p.b);
      $('#rg-streu-note').textContent = (z.y === 'ausschuss' ? 'Anteil der Abgeordneten mit Regional- oder Landesmandat aus dem Bundesland, die im ' + AUSSCHUSS[s] + ' sitzen' : 'Anteil ihrer Anfragen an Ressorts des Felds „' + s + '“') + ', gegen die Bedeutung der Branche im Bundesland. Korrelation über die Bundesländer: r = ' + dez(r, 2) + '. Punktgröße nach Fallzahl.';
    } else { svg.append('text').attr('x', W / 2).attr('y', H / 2).attr('text-anchor', 'middle').attr('fill', 'var(--grau)').text('Zu wenige Daten für diese Auswahl.'); $('#rg-streu-note').textContent = ''; }
    // Zusammenfassung je Sektor
    const lqp = new Map(LQ.map((r) => [r.bundesland + '|' + r.gp + '|' + r.feld, r.lq]));
    const zus = SEKTOREN.map((s2) => { let hn = 0, hm = 0, ln = 0, lm = 0; for (const r of MR) { const q = lqp.get(r.bundesland + '|' + r.gp + '|' + s2); if (q == null) continue; const m = r.aus.has(s2) ? 1 : 0; if (q >= 1.25) { hn++; hm += m; } else if (q < 1) { ln++; lm += m; } } return { s: s2, hi: hn ? hm / hn : null, lo: ln ? lm / ln : null, hn, ln }; });
    const zbox = $('#rg-zus'); zbox.replaceChildren();
    const maxZ = d3.max(zus, (d) => Math.max(d.hi || 0, d.lo || 0)) || 1;
    for (const d of zus) {
      if (d.hi == null || d.lo == null || d.hn < 15) continue;
      const zeile = el('div', { class: 'an-feld' + (d.s === z.sektor ? ' sel' : ''), 'data-sektor': d.s, tabindex: '0', role: 'button' },
        el('span', { class: 'an-fn', text: SEKTOR_NAME[d.s] }), el('span', { class: 'an-paar' }, el('span', { class: 'an-b an-m' }), el('span', { class: 'an-b an-a' })),
        el('span', { class: 'an-wert', text: pct(d.hi) + ' / ' + pct(d.lo) }), el('span', { class: 'an-x', text: d.lo ? fak(d.hi / d.lo) : '–' }));
      zeile.querySelector('.an-m').style.width = (d.hi / maxZ * 100) + '%'; zeile.querySelector('.an-a').style.width = (d.lo / maxZ * 100) + '%';
      zeile.title = SEKTOR_NAME[d.s] + ': Abgeordnete aus Bundesländern mit starker Branche (Standortquotient ab 1,25) sitzen zu ' + pct(d.hi) + ' im ' + AUSSCHUSS[d.s] + ', aus Bundesländern mit schwacher Branche (unter 1) zu ' + pct(d.lo);
      zeile.addEventListener('click', () => { z.sektor = d.s; $('#rg-sektor').value = d.s; zeichne(); });
      zbox.append(zeile);
    }
    $('#rg-sektor').value = z.sektor;
  };
  let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (D) zeichne(); }, 200); });
})();
