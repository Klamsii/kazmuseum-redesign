import { load } from 'cheerio';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const origin = 'https://kazmuseum.kz';
const out = path.resolve('public');
const assets = path.join(out, 'assets');
await mkdir(assets, { recursive: true });

const sections = [
  ['ekskursiya-yzmeti', 'Экскурсия қызметі'],
  ['muzej-pedagogikasy', 'Музей педагогикасы'],
  ['muzej-menedzhmenti', 'Музей менеджменті'],
  ['ekspozitsiya', 'Экспозиция'],
  ['muzei-zhane-expo-2017', 'Музей экспедициясы'],
  ['s-khbat', 'Қор сақтау'],
  ['biliktilik-arttyru-kurstary', 'Біліктілікті арттыру курстары'],
  ['bas-redaktor-ba-any', 'Бас редактор бағаны'],
  ['galym-pikiri', 'Музей ісіндегі заңнама'],
  ['zhadiger-syry', 'Электронды кітапхана'],
  ['kormeler', 'Көрмелер'],
  ['eksponat-tarikhy', 'Экспонат тарихы'],
  ['kolda-bar-zhadiger', 'Қолда бар жәдігер'],
  ['konservatsiya-zh-ne-restavratsiya', 'Консервация және реставрация'],
  ['e-seli-eskertkish', 'Ескерткіштану'],
  ['t-l-a', 'Тұлға'],
  ['ashy-ala', 'Ашық алаң'],
  ['aza-stan-muzejleri', 'Қазақстан музейлері'],
  ['lem-muzejleri', 'Әлем музейлері'],
  ['muzeologiya-m-seleleri', 'Музеология мәселелері'],
  ['icom-qazaqstan', 'ICOM Қазақстан'],
  ['baj-aular-bos-oryndar-ta-ylymdamalar', 'Байқаулар, бос орындар, тағылымдамалар'],
  ['video', 'KAZMUSEUM TV'],
];

const tidy = text => (text || '').replace(/\s+/g, ' ').trim();
const absolute = value => value ? new URL(value, origin).href : null;
const itemPath = href => href?.split('#')[0].replace(origin, '');
const isArticle = href => href && /\/item\/\d+/.test(href);

async function getHtml(url) {
  const response = await fetch(absolute(url), { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KazmuseumLocal/1.0)' } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return load(await response.text());
}

const home = await getHtml('/');
const records = new Map();
function addRecord(href, title, image, section, date) {
  if (!isArticle(href)) return;
  const key = itemPath(href);
  const current = records.get(key) || { path: key };
  current.title ||= tidy(title);
  current.remoteImage ||= absolute(image);
  current.section ||= section;
  current.date ||= tidy(date);
  records.set(key, current);
}

const news = [];
home('.lenta').each((_, el) => {
  const link = home(el).find('a[href*="/item/"]').first();
  const path = itemPath(link.attr('href'));
  if (path) news.push(path);
  addRecord(path, link.text(), null, path?.split('/')[1], home(el).find('.lenta-news-date').text());
});

home('a[href*="/item/"]').each((_, el) => {
  const link = home(el);
  const container = link.closest('.newssh, li, .itemContainer, .sp-slide, .slider, .news-item');
  const image = container.find('img').first().attr('src') || link.find('img').first().attr('src');
  addRecord(link.attr('href'), link.text() || link.find('img').attr('alt'), image, itemPath(link.attr('href'))?.split('/')[1]);
});

const sectionData = [];
for (const [slug, label] of sections) {
  const info = { slug, label, paths: [] };
  try {
    const $ = await getHtml('/' + slug);
    $('.itemList .itemContainer').slice(0, 8).each((_, el) => {
      const link = $(el).find('a[href*="/item/"]').first();
      const p = itemPath(link.attr('href'));
      if (!p) return;
      info.paths.push(p);
      addRecord(p, link.text(), $(el).find('img').first().attr('src'), slug, $(el).find('.newsdate').first().text());
    });
    console.log('section', slug, info.paths.length);
  } catch (error) { console.warn('section failed', slug, String(error)); }
  sectionData.push(info);
}

const all = [...records.values()];
let next = 0;
async function worker() {
  while (next < all.length) {
    const item = all[next++];
    try {
      const $ = await getHtml(item.path);
      item.title = (tidy($('.itemHeader h2, .itemHeader h1').first().text()) || item.title).replace(/\s*Таңдаулы$/, '');
      item.date = tidy($('.itemDateCreated').first().text()) || item.date;
      item.intro = tidy($('.itemIntroText').first().text());
      item.paragraphs = $('.itemFullText p, .itemIntroText p').map((_, el) => tidy($(el).text())).get().filter(Boolean);
      if (!item.paragraphs.length) item.paragraphs = [tidy($('.itemFullText').text())].filter(Boolean);
      item.remoteImage = absolute($('.itemImage img, .itemImageBlock img, .itemBody img').first().attr('src')) || item.remoteImage;
      const videoSrc = $('.itemBody iframe[src*="youtube.com/embed/"]').first().attr('src');
      item.videoEmbed = videoSrc ? absolute(videoSrc).replace(/^http:/, 'https:') : null;
    } catch (error) { console.warn('article failed', item.path, String(error)); }
  }
}
await Promise.all(Array.from({ length: 8 }, worker));

const imageUrls = [...new Set(all.map(item => item.remoteImage).filter(Boolean))];
const images = new Map();
next = 0;
async function imageWorker() {
  while (next < imageUrls.length) {
    const url = imageUrls[next++];
    const name = path.basename(new URL(url).pathname).replace(/[^\w.-]/g, '_');
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      await writeFile(path.join(assets, name), Buffer.from(await res.arrayBuffer()));
      images.set(url, '/assets/' + name);
    } catch (error) { console.warn('image failed', url, String(error)); }
  }
}
await Promise.all(Array.from({ length: 10 }, imageWorker));
for (const item of all) item.image = images.get(item.remoteImage) || null;
for (const item of all) {
  const ownSection = item.path.split('/')[1];
  item.section = sections.some(([slug]) => slug === ownSection) ? ownSection : ({'ta-zym':'konservatsiya-zh-ne-restavratsiya'}[ownSection] || item.section);
}

const infoPages = [];
for (const [slug, label] of [['about', 'Біз туралы'], ['advertising', 'Жарнама'], ['contact', 'Кері байланыс']]) {
  try {
    const $ = await getHtml('/' + slug);
    infoPages.push({ slug, label, paragraphs: $('.itemFullText p, .itemIntroText p').map((_, el) => tidy($(el).text())).get().filter(Boolean) });
  } catch { infoPages.push({ slug, label, paragraphs: [] }); }
}

await writeFile(path.join(out, 'content.json'), JSON.stringify({
  scrapedAt: new Date().toISOString(),
  source: origin,
  sections: sectionData,
  news,
  articles: all,
  infoPages,
}, null, 2));
console.log(`saved ${all.length} articles, ${images.size} images`);
