// Kleine Laufzeit für die Dashboards: lädt die CSV-Dateien, hält die Filter und zeichnet bei Änderungen neu.
(() => {
  const QUELLEN = {
    anfragen: 'data/anfragen.csv', betreffe: 'data/betreffe.csv', schluessel: 'data/schluessel.csv',
    antraege: 'data/antraege.csv', antraege_info: 'data/antraege_info.csv',
    personen: 'data/personen.csv', person_gp: 'data/person_gp.csv', wechsel: 'data/wechsel.csv'
  };
  const SEITEN = { J: 'anfragen.html', A: 'antraege.html', P: 'abgeordnete.html' };
  const SEITE = document.documentElement.dataset.typ || 'J';
  const STANDARD = {
    gpVon: null, gpBis: null, von: null, bis: null, klubs: [], thema: [], ressort: [], minister: [], person: [],
    aufl: 'jahr', modus: 'klub', adr: 'ressort', hm: 'klub', stapel: SEITE === 'P' ? 'gestapelt' : 'einzeln', pzahl: 'beginn', typ: SEITE
  };
  const UEBERGABE = 'nrz-uebergabe';
  let params = { ...STANDARD };
  try {
    const u = JSON.parse(localStorage.getItem(UEBERGABE) || 'null');
    if (u && u.typ === SEITE) params = { ...STANDARD, ...u, typ: SEITE };
    localStorage.removeItem(UEBERGABE);
  } catch (e) { /* ohne Speicher: Standardfilter */ }

  const speicher = {};
  const abos = [];
  let geplant = false;
  const lauf = () => {
    geplant = false;
    for (const f of abos) { try { f(); } catch (e) { console.error(e); } }
  };
  const planen = () => { if (!geplant) { geplant = true; requestAnimationFrame(lauf); } };

  const data = (id) => {
    if (!speicher[id]) {
      if (!QUELLEN[id]) { speicher[id] = { status: 'missing', data: [] }; return speicher[id]; }
      speicher[id] = { status: 'loading', data: [] };
      fetch(QUELLEN[id])
        .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then((t) => { speicher[id] = { status: 'ok', data: d3.csvParse(t) }; planen(); })
        .catch((e) => { speicher[id] = { status: 'error', data: [], message: String(e) }; planen(); });
    }
    return speicher[id];
  };

  window.dash = {
    data,
    params: () => params,
    setParams: (o) => {
      if (o.typ && o.typ !== SEITE && SEITEN[o.typ]) {
        try { localStorage.setItem(UEBERGABE, JSON.stringify({ ...params, ...o })); } catch (e) { /* Filter gehen verloren */ }
        location.href = SEITEN[o.typ];
        return;
      }
      params = { ...params, ...o, typ: SEITE };
      planen();
    },
    resetParams: () => { params = { ...STANDARD }; planen(); },
    onData: (fn) => { abos.push(fn); try { fn(); } catch (e) { console.error(e); } },
    colors: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
    refresh: () => {}
  };

  let t = null;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(planen, 150); });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', planen);

  // Betreffe (7 MB) erst laden, wenn die Liste der einzelnen Anfragen in Sichtweite kommt
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('einzelne');
    if (!el || !('IntersectionObserver' in window)) { window.__elSicht = true; return; }
    const io = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) { window.__elSicht = true; io.disconnect(); planen(); }
    }, { rootMargin: '600px 0px' });
    io.observe(el);
  });
})();
