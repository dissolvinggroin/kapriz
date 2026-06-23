// Скачивает тематические фото под каждую категорию (реальные снимки с Unsplash CDN)
// в public/images/catalog/<slug>-<i>-<n>.jpg. Запуск: node seed/fetchImages.js
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { PRODUCTS } = require('./catalogData');

const OUT_DIR = path.join(__dirname, '..', 'public', 'images', 'catalog');
const PLACEHOLDER = path.join(OUT_DIR, 'placeholder.jpg');
const CONCURRENCY = 4;
const MAX_RETRIES = 5;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Реальные ID фото Unsplash по категориям (получены через поиск Unsplash)
const POOLS = {
  dresses: ['1567401893414-76b7b1e5a7a5','1614786269829-d24616faf56d','1515372039744-b8f02a3ae446','1511130558090-00af810c21b1','1495385794356-15371f348c31','1616313253719-c46514cddee1','1579328064848-53fe6c665058','1671848633245-79cc98b0dbe8','1534875756527-5e8e4392005f','1602010069450-0a62034f235c','1599662875272-64de8289f6d8','1563178406-4cdc2923acbc','1753192108753-81be0db2f7fe','1478146896981-b80fe463b330','1619794724492-651397287d94'],
  clothing: ['1761117228880-df2425bd70da','1708533096181-dab486856499','1613891737415-be7670d21c19','1761121317492-57feee4fc674','1611235116156-0cbda6649efb','1680690517143-d813ac08cd13','1770294758906-c8762abb2c8b','1730925355309-cb9e4af73ebb','1772037869794-d1bcfd2a8e36','1620062213761-9af24c959624','1620062161349-7abc66286084','1763017707678-2ab848ab2808','1761884108847-f9b11d26221a','1764337593519-c51a77b4fc3d','1765365353704-ed0b6e1b11c2'],
  outerwear: ['1539533113208-f6df8cc8b543','1539533018447-63fcce2678e3','1633821879282-0c4e91f96232','1608635680046-aebf91c1a9c8','1554701228-869c34a3a49f','1685703206731-0bcd26546754','1583882358307-c46d9fdd6258','1685571310105-73020ae623cd','1585215173785-7f3c2252c25a','1704926273322-86addc31fbf2','1708530520303-84fc5515e05c','1637589267610-6c66fc2a086b','1552256028-c51f32398295','1554701228-034f6009b120','1552256028-71eb9a7ff27d'],
  shoes: ['1560769629-975ec94e6a86','1551107696-a4b0c5a0d9a2','1543163521-1bf539c55dd2','1535043934128-cf0b28d52f95','1531310197839-ccf54634509e','1554062614-6da4fa67725a','1518049362265-d5b2a6467637','1515347619252-60a4bf4fff4f','1621996659490-3275b4d0d951','1534653299134-96a171b61581','1564051806-be616e3bdcec','1620114884229-65d21f8c9423','1670938258821-2956d4ce9c9b','1632761298177-51e35403e27e','1519415943484-9fa1873496d4'],
  accessories: ['1598532163257-ae3c6b2524b6','1584917865442-de89df76afd3','1614179689702-355944cd0918','1600857062241-98e5dba7f214','1705909237050-7a7625b47fac','1682745230951-8a5aa9a474a0','1590874103328-eac38a683ce7','1605733513597-a8f8341084e6','1594223274512-ad4803739b7c','1559563458-527698bf5295','1548036328-c9fa89d128fa','1683921590274-a83862cb11c3','1566150905458-1bf1fc113f0d','1591561954557-26941169b49e','1713746834176-04c0069d6593'],
};

function urlFor(id) {
  return `https://images.unsplash.com/photo-${id}?w=600&h=800&fit=crop&crop=entropy&q=72&fm=jpg`;
}

function buildTasks() {
  const tasks = [];
  for (const [slug, items] of Object.entries(PRODUCTS)) {
    const pool = POOLS[slug] || [];
    const P = pool.length;
    items.forEach((_, i) => {
      // у каждого товара 3 разных фото из пула категории
      const picks = [pool[i % P], pool[(i + 5) % P], pool[(i + 10) % P]];
      picks.forEach((id, n) => {
        tasks.push({ url: urlFor(id), file: path.join(OUT_DIR, `${slug}-${i}-${n}.jpg`) });
      });
    });
  }
  return tasks;
}

// curl пишет картинку в stdout (без -o), Node принимает буфер и сам пишет файл.
// Так антивирус не лочит файл во время сетевой записи curl (ошибка code 23).
function curlOnce(url, file) {
  return new Promise((resolve) => {
    execFile('curl', ['-sL', '--max-time', '30', url], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 }, (err, stdout) => {
      if (!err && stdout && stdout.length > 4000) {
        try { fs.writeFileSync(file, stdout); resolve(true); return; } catch (e) {}
      }
      resolve(false);
    });
  });
}

async function download(task) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    if (await curlOnce(task.url, task.file)) return true;
    await sleep(400 * attempt);
  }
  try { if (fs.existsSync(PLACEHOLDER)) fs.copyFileSync(PLACEHOLDER, task.file); } catch (e) {}
  return false;
}

async function run() {
  const tasks = buildTasks();
  console.log(`Скачиваю ${tasks.length} фото с Unsplash (${CONCURRENCY} параллельно)…`);
  let done = 0; let failed = 0; let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const t = tasks[idx++];
      const ok = await download(t);
      done += 1; if (!ok) failed += 1;
      if (done % 15 === 0 || done === tasks.length) console.log(`  ${done}/${tasks.length}${failed ? ` (заглушек: ${failed})` : ''}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`Готово. Скачано: ${tasks.length - failed}, заглушек: ${failed}.`);
}

run();
