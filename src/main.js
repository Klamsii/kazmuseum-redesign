import './style.css';

const app = document.querySelector('#app');
const content = await fetch(`${import.meta.env.BASE_URL}content.json`).then(r => r.json());
const articles = new Map(content.articles.map(item => [item.path, item]));
const sections = new Map(content.sections.map(item => [item.slug, item]));
const getArticle = path => articles.get(path);
const sectionHref = slug => `#/section/${encodeURIComponent(slug)}`;
const articleHref = path => `#/article/${encodeURIComponent(path)}`;
const infoHref = slug => `#/info/${slug}`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const image = (item, className = '') => item?.image
  ? `<img class="${className}" src="${esc(import.meta.env.BASE_URL + item.image.replace(/^\//, ''))}" alt="${esc(item.title)}" loading="lazy">`
  : `<div class="image-fallback ${className}"><span>KAZMUSEUM</span></div>`;
const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
const searchIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.7"/><path d="m16 16 5 5"/></svg>';
const menuIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';

function sectionLink(slug, text) { return `<a href="${sectionHref(slug)}">${esc(text || sections.get(slug)?.label || slug)}</a>`; }
function articleLink(item, text) { return `<a href="${articleHref(item.path)}">${esc(text || item.title)}</a>`; }
function prettyDate(item) {
  const match = item.date?.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (match) return `${match[1].padStart(2,'0')}.${match[2].padStart(2,'0')}.${match[3]}`;
  const months = {Қаңтар:'01',Ақпан:'02',Наурыз:'03',Сәуір:'04',Мамыр:'05',Маусым:'06',Шілде:'07',Тамыз:'08',Қыркүйек:'09',Қазан:'10',Қараша:'11',Желтоқсан:'12'};
  const kazakh = item.date?.match(/(\d{1,2})\s+(Қаңтар|Ақпан|Наурыз|Сәуір|Мамыр|Маусым|Шілде|Тамыз|Қыркүйек|Қазан|Қараша|Желтоқсан)\s+(\d{4})/);
  if (kazakh) return `${kazakh[1].padStart(2,'0')}.${months[kazakh[2]]}.${kazakh[3]}`;
  return item.date || '';
}

function header() {
  const nav = [
    ['/', 'Басты бет'], ['/news', 'Жаңалықтар'], ['/section/kormeler', 'Көрмелер'],
    ['/section/aza-stan-muzejleri', 'Қазақстан музейлері'], ['/section/lem-muzejleri', 'Әлем музейлері'],
    ['/section/zhadiger-syry', 'Электронды кітапхана'],
  ];
  const current = location.hash.replace(/^#/, '') || '/';
  return `
    <div class="utility"><div class="container utility-inner"><span>ҚАЗАҚСТАН МУЗЕЙЛЕРІНІҢ АҚПАРАТТЫҚ ПОРТАЛЫ</span><div>${sectionLink('icom-qazaqstan','ICOM Қазақстан')}<a href="${infoHref('about')}">Біз туралы</a><a href="${infoHref('contact')}">Кері байланыс</a><span class="language">ҚАЗ</span></div></div></div>
    <header class="site-header"><div class="container header-inner">
      <a class="brand" href="#/" aria-label="KAZMUSEUM — басты бет"><span class="brand-mark"><span>К</span><i></i></span><span class="brand-copy"><strong>KAZMUSEUM<span>.KZ</span></strong><small>ҚАЗАҚСТАН МУЗЕЙЛЕРІ</small></span></a>
      <div class="header-right"><div class="header-caption">Музей ісі туралы ақпарат пен кәсіби білімнің ортақ кеңістігі</div><button class="header-search" id="open-search" aria-label="Іздеу">${searchIcon}<span>Іздеу</span><kbd>Ctrl K</kbd></button><button class="mobile-menu-button" id="mobile-menu" aria-label="Мәзірді ашу" aria-expanded="false">${menuIcon}</button></div>
    </div></header>
    <nav class="main-nav" aria-label="Негізгі навигация"><div class="container nav-inner">${nav.map(([path,label]) => `<a class="${current === path ? 'active' : ''}" href="#${path}">${label}</a>`).join('')}<button id="open-sections" class="all-sections">Барлық бөлімдер <span>⌄</span></button></div></nav>
    <div id="mega-menu" class="mega-menu" hidden><div class="container"><div class="mega-heading"><strong>Портал бөлімдері</strong><button id="close-sections" aria-label="Жабу">×</button></div><div class="mega-grid">${content.sections.map(item => `<a href="${sectionHref(item.slug)}">${esc(item.label)}${arrow}</a>`).join('')}</div></div></div>
    <div id="search-panel" class="search-panel" hidden><div class="container search-box"><button id="close-search" class="search-close" aria-label="Іздеуді жабу">×</button><label for="global-search">Сайттан іздеу</label><form id="search-form"><input id="global-search" autocomplete="off" placeholder="Мақала, тақырып немесе музей атауы" /><button type="submit">Іздеу ${arrow}</button></form><p>Материал атауы мен мәтіні бойынша іздеу</p></div></div>`;
}

function sectionHeading(title, slug, subtitle = '') {
  return `<div class="section-heading"><div><span class="eyebrow">KAZMUSEUM / БӨЛІМ</span><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>${slug ? `<a class="text-link" href="${sectionHref(slug)}">Барлық материалдар ${arrow}</a>` : ''}</div>`;
}
function card(item, mode = '', categoryOverride = null) {
  if (!item) return '';
  const category = categoryOverride || item.section;
  const excerpt = item.intro && mode === 'wide' ? item.intro.slice(0,190) + (item.intro.length > 190 ? '…' : '') : '';
  return `<article class="article-card ${mode}"><a class="card-image" href="${articleHref(item.path)}">${image(item)}</a><div class="card-body"><div class="card-meta"><a href="${sectionHref(category)}">${esc(sections.get(category)?.label || 'Мақала')}</a><span>${esc(prettyDate(item))}</span></div><h3>${articleLink(item)}</h3>${excerpt ? `<p>${esc(excerpt)}</p>` : ''}<a class="read-more" href="${articleHref(item.path)}">Толығырақ ${arrow}</a></div></article>`;
}
function row(item) {
  if (!item) return '';
  return `<article class="feature-row"><a href="${articleHref(item.path)}" class="feature-thumb">${image(item)}</a><div><span>${esc(prettyDate(item))}</span><h3>${articleLink(item)}</h3></div></article>`;
}
function directoryCard(section) {
  if (!section) return '';
  const first = section.paths.map(getArticle).find(Boolean);
  return `<article class="directory-card"><div class="directory-top"><span>${esc(section.label)}</span><a href="${sectionHref(section.slug)}" aria-label="${esc(section.label)}">${arrow}</a></div>${first ? `<a class="directory-image" href="${articleHref(first.path)}">${image(first)}</a><h3>${articleLink(first)}</h3>` : `<p>Материалдарды қарау</p>`}<a class="directory-bottom" href="${sectionHref(section.slug)}">Бөлімге өту ${arrow}</a></article>`;
}

function home() {
  const featured = getArticle(content.news[0]) || content.articles[0];
  const latest = content.news.slice(1, 6).map(getArticle).filter(Boolean);
  const exhibitions = (sections.get('kormeler')?.paths || []).slice(0, 3).map(getArticle).filter(Boolean);
  const groups = [
    { title: 'Музей ісі', subtitle: 'Мамандарға арналған бағыттар', slugs: ['ekskursiya-yzmeti','muzej-pedagogikasy','muzej-menedzhmenti','ekspozitsiya','muzei-zhane-expo-2017','s-khbat'] },
    { title: 'Мәдени мұра', subtitle: 'Жәдігерлер, тұлғалар мен тарихи ескерткіштер', slugs: ['eksponat-tarikhy','kolda-bar-zhadiger','konservatsiya-zh-ne-restavratsiya','e-seli-eskertkish','t-l-a','aza-stan-muzejleri'] },
    { title: 'Қоғам және кәсіби орта', subtitle: 'Сараптама, халықаралық тәжірибе және жаңа мүмкіндіктер', slugs: ['ashy-ala','lem-muzejleri','muzeologiya-m-seleleri','icom-qazaqstan','baj-aular-bos-oryndar-ta-ylymdamalar','biliktilik-arttyru-kurstary'] },
  ];
  return `<main>
    <section class="lead-section container"><div class="lead-title"><div><span class="eyebrow">ҚАЗАҚСТАН МУЗЕЙЛЕРІ</span><h1>Музей әлеміндегі маңызды оқиғалар</h1></div><p>Жаңалықтар, көрмелер және музей саласының кәсіби материалдары — бір жерде.</p></div>
    <div class="lead-grid"><article class="hero"><a href="${articleHref(featured.path)}" class="hero-image">${image(featured)}</a><div class="hero-content"><span class="hero-tag">БАС ТАҚЫРЫП <span>·</span> ${esc(prettyDate(featured))}</span><h2>${articleLink(featured)}</h2><a class="hero-link" href="${articleHref(featured.path)}">Материалды оқу ${arrow}</a></div></article>
    <aside class="latest"><div class="latest-heading"><h2>Соңғы жаңалықтар</h2><a href="#/news" aria-label="Барлық жаңалықтар">${arrow}</a></div><div class="latest-list">${latest.map((item,i) => `<article><span>${String(i+1).padStart(2,'0')}</span><div><small>${esc(prettyDate(item))}</small><h3>${articleLink(item)}</h3></div></article>`).join('')}</div><a class="latest-all" href="#/news">Барлық жаңалықтарды қарау ${arrow}</a></aside></div></section>
    <section class="quick-nav"><div class="container quick-grid"><span class="quick-label">ЖЫЛДАМ ӨТУ</span>${[['kormeler','Көрмелер'],['galym-pikiri','Заңнама'],['zhadiger-syry','Электронды кітапхана'],['biliktilik-arttyru-kurstary','Біліктілікті арттыру']].map(([slug,label])=>`<a href="${sectionHref(slug)}">${esc(label)}${arrow}</a>`).join('')}</div></section>
    <section class="container content-section">${sectionHeading('Көрмелер','kormeler','Қазақстан музейлеріндегі жаңа көрмелер мен экспозициялар')}<div class="cards-three">${exhibitions.map(item=>card(item,'','kormeler')).join('')}</div></section>
    <section class="container split-section"><div>${sectionHeading('Бас редактор бағаны','bas-redaktor-ba-any')}<div class="feature-list">${(sections.get('bas-redaktor-ba-any')?.paths || []).slice(0,3).map(p => row(getArticle(p))).join('')}</div></div><div>${sectionHeading('Музей ісіндегі заңнама','galym-pikiri')}<div class="feature-list">${(sections.get('galym-pikiri')?.paths || []).slice(0,3).map(p => row(getArticle(p))).join('')}</div></div></section>
    ${groups.map(group => `<section class="container directory-section">${sectionHeading(group.title,null,group.subtitle)}<div class="directory-grid">${group.slugs.map(slug => directoryCard(sections.get(slug))).join('')}</div></section>`).join('')}
    <section class="container content-section">${sectionHeading('KAZMUSEUM TV','video','Музейлер туралы бейнематериалдар')}<div class="cards-three video-cards">${(sections.get('video')?.paths || []).slice(0,3).map(p => card(getArticle(p),'','video')).join('')}</div></section>
    <section class="container content-section closing-section">${sectionHeading('Электронды кітапхана','zhadiger-syry','Жинақтар, зерттеулер және салалық басылымдар')}<div class="cards-three">${(sections.get('zhadiger-syry')?.paths || []).slice(0,3).map(p => card(getArticle(p),'','zhadiger-syry')).join('')}</div></section>
  </main>`;
}

function breadcrumbs(parts) {
  return `<nav class="breadcrumbs" aria-label="Бет жолы"><a href="#/">Басты бет</a>${parts.map(p => `<span>/</span>${p.href ? `<a href="${p.href}">${esc(p.label)}</a>` : `<span>${esc(p.label)}</span>`}`).join('')}</nav>`;
}
function sectionPage(slug) {
  const section = sections.get(slug);
  if (!section) return notFound();
  const items = section.paths.map(getArticle).filter(Boolean);
  return `<main class="container inner-page">${breadcrumbs([{label:section.label}])}<div class="page-header"><div><span class="eyebrow">KAZMUSEUM / БӨЛІМ</span><h1>${esc(section.label)}</h1></div><span>${items.length} материал</span></div><div class="listing-layout"><div class="listing">${items.map(item => card(item,'wide',slug)).join('') || '<p>Бұл бөлімде әзірге материал жоқ.</p>'}</div><aside class="aside-panel"><h2>Басқа бөлімдер</h2>${content.sections.filter(s=>s.slug!==slug).slice(0,10).map(s=>sectionLink(s.slug)).join('')}</aside></div></main>`;
}
function newsPage() {
  const list = content.news.map(getArticle).filter(Boolean);
  return `<main class="container inner-page">${breadcrumbs([{label:'Жаңалықтар'}])}<div class="page-header"><div><span class="eyebrow">KAZMUSEUM / ЖАҢАЛЫҚТАР</span><h1>Жаңалықтар</h1></div><span>${list.length} материал</span></div><div class="listing-layout"><div class="listing">${list.map(item=>card(item,'wide')).join('')}</div><aside class="aside-panel"><h2>Тақырыптар</h2>${[['kormeler','Көрмелер'],['aza-stan-muzejleri','Қазақстан музейлері'],['lem-muzejleri','Әлем музейлері'],['ashy-ala','Ашық алаң']].map(([slug,label])=>sectionLink(slug,label)).join('')}</aside></div></main>`;
}
function articlePage(path) {
  const item = getArticle(path);
  if (!item) return notFound();
  const related = content.articles.filter(other => other.section === item.section && other.path !== item.path).slice(0,4);
  const paragraphs = item.paragraphs?.length ? item.paragraphs : [item.intro].filter(Boolean);
  return `<main class="container inner-page article-page">${breadcrumbs([{label:sections.get(item.section)?.label || 'Материалдар',href:sectionHref(item.section)},{label:item.title}])}<div class="article-layout"><article class="story"><div class="story-heading"><span class="eyebrow">${esc(sections.get(item.section)?.label || 'KAZMUSEUM')}</span><h1>${esc(item.title)}</h1><div class="story-meta"><span>${esc(prettyDate(item))}</span><span>•</span><span>KAZMUSEUM.KZ</span></div></div>${item.image ? `<figure class="story-image">${image(item)}</figure>` : ''}<div class="story-text">${paragraphs.map((p,i) => `<p class="${i===0?'intro':''}">${esc(p)}</p>`).join('')}</div>${item.videoEmbed ? `<div class="story-video"><iframe src="${esc(item.videoEmbed)}" title="${esc(item.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>` : ''}<div class="story-source">Дереккөз: <a href="${esc(content.source + item.path)}" target="_blank" rel="noopener">kazmuseum.kz ${arrow}</a></div></article><aside class="story-aside"><div class="aside-panel"><h2>Осы бөлімде</h2>${related.map(other => `<a href="${articleHref(other.path)}">${esc(other.title)}${arrow}</a>`).join('')}<a class="aside-all" href="${sectionHref(item.section)}">Барлық материалдар ${arrow}</a></div></aside></div></main>`;
}
function infoPage(slug) {
  const page = content.infoPages.find(p=>p.slug===slug);
  if (!page) return notFound();
  return `<main class="container inner-page simple-page">${breadcrumbs([{label:page.label}])}<div class="page-header"><div><span class="eyebrow">KAZMUSEUM / АҚПАРАТ</span><h1>${esc(page.label)}</h1></div></div><div class="info-copy">${page.paragraphs.length ? page.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('') : `<p>Толық ақпаратты <a href="${esc(content.source+'/'+slug)}" target="_blank" rel="noopener">kazmuseum.kz сайтынан</a> қараңыз.</p>`}</div></main>`;
}
function searchPage(query, page = 1) {
  const q = query.trim().toLocaleLowerCase('kk');
  const matches = q ? content.articles.filter(item=> `${item.title} ${item.intro || ''} ${(item.paragraphs || []).join(' ')}`.toLocaleLowerCase('kk').includes(q)) : [];
  const pages = Math.ceil(matches.length / 12);
  const current = Math.max(1, Math.min(Number(page) || 1, pages || 1));
  const shown = matches.slice((current - 1) * 12, current * 12);
  const pageLink = number => `#/search?q=${encodeURIComponent(query)}&page=${number}`;
  return `<main class="container inner-page">${breadcrumbs([{label:'Іздеу'}])}<div class="page-header"><div><span class="eyebrow">KAZMUSEUM / ІЗДЕУ</span><h1>Іздеу нәтижелері</h1></div><span>${matches.length} материал</span></div><form class="results-search" id="results-form"><input id="results-input" value="${esc(query)}" aria-label="Іздеу сұрауы" placeholder="Не іздейсіз?"><button>${searchIcon} Іздеу</button></form>${q ? `<p class="results-label">«${esc(query)}» сұрауы бойынша</p>` : ''}<div class="listing search-results">${shown.map(item=>card(item,'wide')).join('') || `<p class="empty-results">${q ? 'Материал табылмады. Басқа сөзбен іздеп көріңіз.' : 'Іздеу үшін сөз немесе тақырып енгізіңіз.'}</p>`}</div>${pages > 1 ? `<nav class="pagination" aria-label="Нәтижелер беттері">${current > 1 ? `<a href="${pageLink(current-1)}">← Алдыңғы</a>` : ''}<span>${current} / ${pages}</span>${current < pages ? `<a href="${pageLink(current+1)}">Келесі →</a>` : ''}</nav>` : ''}</main>`;
}
function notFound() { return `<main class="container inner-page simple-page"><h1>Бет табылмады</h1><p><a href="#/">Басты бетке оралу ${arrow}</a></p></main>`; }
function footer() {
  return `<footer class="footer"><div class="container footer-main"><div><a class="footer-brand" href="#/">KAZMUSEUM<span>.KZ</span></a><p>Қазақстан музейлерінің ақпараттық-әдістемелік порталы</p><small>Материалдар kazmuseum.kz порталынан алынған.</small></div><div><h3>Портал</h3><a href="#/news">Жаңалықтар</a>${sectionLink('kormeler')}${sectionLink('aza-stan-muzejleri')}${sectionLink('zhadiger-syry')}</div><div><h3>Ақпарат</h3><a href="${infoHref('about')}">Біз туралы</a><a href="${infoHref('advertising')}">Жарнама</a><a href="${infoHref('contact')}">Кері байланыс</a></div></div><div class="container footer-bottom"><span>© 2015–2026 KAZMUSEUM.KZ</span><span>Бас редактор — Нұрсерік Жолбарыс</span></div></footer>`;
}

function render() {
  const route = (location.hash || '#/').slice(1);
  const decodePath = value => { try { return decodeURIComponent(value); } catch { return ''; } };
  let body;
  if (route === '/') body = home();
  else if (route === '/news') body = newsPage();
  else if (route.startsWith('/section/')) body = sectionPage(decodePath(route.slice(9)));
  else if (route.startsWith('/article/')) body = articlePage(decodePath(route.slice(9)));
  else if (route.startsWith('/info/')) body = infoPage(decodePath(route.slice(6)));
  else if (route.startsWith('/search')) { const params = new URLSearchParams(route.split('?')[1] || ''); body = searchPage(params.get('q') || '', params.get('page') || 1); }
  else body = notFound();
  app.innerHTML = header() + body + footer();
  bind();
  document.title = (app.querySelector('main h1')?.textContent || 'Қазақстан музейлері') + ' — KAZMUSEUM';
  window.scrollTo({top:0});
}
function navigate(hash) {
  if (location.hash === '#' + hash) render();
  else location.hash = hash;
}
function bind() {
  const menu = document.querySelector('#mega-menu');
  const search = document.querySelector('#search-panel');
  document.querySelector('#open-sections').onclick = () => { menu.hidden = !menu.hidden; search.hidden = true; document.querySelector('.main-nav').classList.remove('open'); document.querySelector('#mobile-menu').setAttribute('aria-expanded','false'); };
  document.querySelector('#close-sections').onclick = () => menu.hidden = true;
  document.querySelector('#open-search').onclick = () => { search.hidden = !search.hidden; menu.hidden = true; document.querySelector('.main-nav').classList.remove('open'); document.querySelector('#mobile-menu').setAttribute('aria-expanded','false'); if (!search.hidden) document.querySelector('#global-search').focus(); };
  document.querySelector('#close-search').onclick = () => search.hidden = true;
  document.querySelector('#mobile-menu').onclick = event => { const nav = document.querySelector('.main-nav'); nav.classList.toggle('open'); event.currentTarget.setAttribute('aria-expanded', nav.classList.contains('open')); };
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { menu.hidden = true; }));
  document.querySelector('#search-form').onsubmit = event => { event.preventDefault(); navigate('/search?q=' + encodeURIComponent(document.querySelector('#global-search').value.trim())); };
  const results = document.querySelector('#results-form');
  if (results) results.onsubmit = event => { event.preventDefault(); navigate('/search?q=' + encodeURIComponent(document.querySelector('#results-input').value.trim())); };
}
window.addEventListener('hashchange', render);
window.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector('#open-search').click(); }
  if (event.key === 'Escape') { document.querySelector('#mega-menu').hidden = true; document.querySelector('#search-panel').hidden = true; }
});
render();
