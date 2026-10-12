// Listen button: reads the article aloud with the browser's built-in voice.
(function () {
  const synth = window.speechSynthesis;
  const share = document.querySelector('.meta .share-btn');
  if (!synth || !window.SpeechSynthesisUtterance || !share) return;

  const style = document.createElement('style');
  style.textContent = `
    .meta-actions { display: flex; gap: 8px; align-items: center; }
    .reading { background: color-mix(in srgb, var(--pink, #f5c0c0) 35%, transparent); border-radius: 6px; transition: background-color .2s; }
  `;
  document.head.append(style);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'share-btn listen-btn';
  btn.setAttribute('aria-label', 'Listen to this article');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg><span>Listen</span>';
  const wrap = document.createElement('div');
  wrap.className = 'meta-actions';
  share.replaceWith(wrap);
  wrap.append(btn, share);
  const label = btn.querySelector('span');

  // What to read: headings, paragraphs, list items and quotes in the article body.
  const SKIP = 'figure, figcaption, details, table, svg, button, .meta, .tldr, .dl-row, .controls, .panel, .legend, .cols-head, .col-label, .back-link, .demo-link, .stats, .summary, .tech-intro';
  const main = document.querySelector('main');
  const els = [...main.querySelectorAll('h1, h2, h3, p, li, blockquote')]
    .filter(el => !el.closest(SKIP))
    .filter(el => !(/^H[23]$/.test(el.tagName) && el.nextElementSibling && el.nextElementSibling.matches('table')))
    .filter((el, _, all) => !all.some(o => o !== el && o.contains(el)));

  const chunks = [];
  els.forEach(el => {
    const c = el.cloneNode(true);
    c.querySelectorAll('.num, .n, .p, .chip').forEach(n => n.remove());
    c.querySelectorAll('cite').forEach(n => n.prepend(' Quote by '));
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    if (!text) return;
    let buf = '';
    text.split(/(?<=[.!?:])\s+/).forEach(s => {
      if ((buf + ' ' + s).length > 220 && buf) { chunks.push({ el, text: buf }); buf = s; }
      else buf = buf ? buf + ' ' + s : s;
    });
    if (buf) chunks.push({ el, text: buf });
  });

  function pickVoice() {
    const v = synth.getVoices().filter(v => /^en(-|_)/i.test(v.lang));
    const prefer = ['Samantha', 'Ava', 'Allison', 'Google US English', 'Aria', 'Jenny', 'Microsoft Zira'];
    for (const name of prefer) { const m = v.find(x => x.name.includes(name)); if (m) return m; }
    return v.find(x => /en-US/i.test(x.lang)) || v[0] || null;
  }

  let i = 0, state = 'idle', current = null;
  function mark(el) {
    document.querySelectorAll('.reading').forEach(n => n.classList.remove('reading'));
    if (!el) return;
    el.classList.add('reading');
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function setState(s) {
    state = s;
    label.textContent = s === 'playing' ? 'Pause' : s === 'paused' ? 'Resume' : 'Listen';
    btn.setAttribute('aria-pressed', String(s === 'playing'));
  }
  function speakNext() {
    if (state !== 'playing') return;
    if (i >= chunks.length) { i = 0; mark(null); setState('idle'); return; }
    const { el, text } = chunks[i];
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.rate = 1;
    u.onstart = () => mark(el);
    u.onend = () => { if (current === u && state === 'playing') { i++; speakNext(); } };
    current = u;
    synth.speak(u);
  }
  btn.addEventListener('click', () => {
    if (state === 'playing') { setState('paused'); current = null; synth.cancel(); }
    else { synth.cancel(); setState('playing'); speakNext(); }
  });
  addEventListener('pagehide', () => synth.cancel());
  synth.getVoices();
})();
