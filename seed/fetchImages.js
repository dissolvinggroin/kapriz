// Скачивает фото ПОД КАЖДЫЙ ТОВАР по его типу (реальные снимки Unsplash)
// в public/images/catalog/<slug>-<i>-<n>.jpg. Запуск: node seed/fetchImages.js
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { PRODUCTS } = require('./catalogData');

const OUT_DIR = path.join(__dirname, '..', 'public', 'images', 'catalog');
const PLACEHOLDER = path.join(OUT_DIR, 'placeholder.jpg');
const MAX_RETRIES = 5;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// 3 фото Unsplash на каждый товар (индекс = позиция в catalogData.PRODUCTS).
// Подобраны по типу конкретного товара.
const IDS = {
  dresses: [
    ['1511130558090-00af810c21b1', '1733043014211-8d699f6a82b1', '1762154057377-cc9d3dd6900c'], // платье миди в цветочный принт
    ['1625158244856-e5e20f733c1f', '1578747522302-b987fbec4465', '1747396206869-75ea57b325ce'], // льняной сарафан
    ['1780301662392-6fea210dcd87', '1613415873569-02bfdd371106', '1601421415261-a22d30aa0eb8'], // платье-комбинация атласное
    ['1759830268287-eed50f169180', '1759229874810-26aa9a3dda92', '1686161099126-b0b8ead9adf5'], // трикотажное платье-водолазка
    ['1617019114583-affb34d1b3cd', '1589810635657-232948472d98', '1494228766058-1430438d10fc'], // платье-рубашка из хлопка
    ['1568252542512-9fe8fe9c87bb', '1568251188392-ae32f898cb3b', '1762430790606-bf626757a00b'], // вечернее платье макси
    ['1533659828870-95ee305cee3e', '1590131222139-91ba5992e4ed', '1614786269829-d24616faf56d'], // платье-футляр
  ],
  clothing: [
    ['1761117228880-df2425bd70da', '1761121317492-57feee4fc674', '1694243382362-14da84ba6a2d'], // шёлковая блуза оверсайз
    ['1778590328057-5cb7f6af0d2d', '1762343041454-8f1fdd459811', '1762342685668-a76f1a57d7d1'], // юбка-плиссе миди
    ['1574201635302-388dd92a4c3f', '1601379327928-bedfaf9da2d0', '1610901157620-340856d0a50f'], // джемпер из мериноса
    ['1598554747436-c9293d6a588f', '1637069585336-827b298fe84a', '1604176354204-9268737828e4'], // прямые джинсы
    ['1616065297556-f05bc00c9a3e', '1604904612715-47bf9d9bc670', '1708363390856-172663a263d1'], // костюм: жакет и брюки
    ['1610288311735-39b7facbd095', '1631541909061-71e349d1f203', '1683315565563-f72590773805'], // кардиган крупной вязки
    ['1770254081861-c1e5c80b690a', '1768818546657-8ac55c90d6c4', '1778436196655-eb8507c86a26'], // боди с длинным рукавом
    ['1762343291713-0d7f83e6c2e9', '1767884044802-5971dabdf2ab', '1763558978011-55404124a148'], // брюки палаццо
  ],
  outerwear: [
    ['1676716105765-e19fe6a01851', '1592327877233-90b9bfd92e48', '1633821879282-0c4e91f96232'], // тренч классический
    ['1611246539484-1f8e71d19ea5', '1777448067392-235aec6a10e4', '1617391258031-f8d80b22fb35'], // пальто-халат шерстяное
    ['1706765779494-2705542ebe74', '1548624313-0396c75e4b1a', '1557418669-db3f781a58c0'], // пуховик оверсайз
    ['1611312449408-fcece27cdbb7', '1537465978529-d23b17165b3b', '1543076447-215ad9ba6923'], // джинсовая куртка
    ['1591047139829-d91aecb6caea', '1602525582399-7ef5f604ff7e', '1624548140129-74786c5f1279'], // бомбер
    ['1633293822049-dee1b40a99c5', '1776533874762-f0b47cbdaed8', '1772817565731-cfae0f2c1552'], // стёганая куртка
  ],
  shoes: [
    ['1535043934128-cf0b28d52f95', '1543163521-1bf539c55dd2', '1573100925118-870b8efc799d'], // туфли-лодочки
    ['1677603142181-6e49eb1a3c10', '1621004612697-2b177e183326', '1674221525704-f4b2aa13df2c'], // балетки
    ['1562273138-f46be4ebdf33', '1762114468792-ced36e281323', '1779912421755-44ceed6c7d69'], // сандалии на платформе
    ['1608629601270-a0007becead3', '1534233812932-59b8fa1b780c', '1630837792758-604e4bd13e2c'], // челси из замши
    ['1600269452121-4f2416e55c28', '1512374382149-233c42b6a83b', '1626379616459-b2ce1d9decbc'], // белые кеды
    ['1575425939273-46ecee6d6931', '1763661300203-aa3e2702f510', '1714984115653-e9ab2a4d7d92'], // сапоги-трубы
    ['1616406432452-07bc5938759d', '1662541089338-c7d53b88be70', '1631978278971-9afda1670882'], // лоферы с пряжкой
  ],
  accessories: [
    ['1624687943971-e86af76d57de', '1637759292654-a12cb2be085e', '1654707636750-ab67a11b21b7'], // кожаная сумка-тоут
    ['1606259458027-54d2a728b6ab', '1566534335938-05f1f2949435', '1517472292914-9570a594783b'], // шёлковый платок
    ['1511499767150-a48a237f0083', '1572635196237-14b3f281503f', '1577803645773-f96470509666'], // солнцезащитные очки
    ['1609803384069-19f3e5a70e75', '1491245257527-395e9c480145', '1609803384370-0e73ef8d424f'], // шерстяной шарф
    ['1576871337632-b9aef4c17ab9', '1618354691792-d1d42acfd860', '1633964124833-f4f3928c55bb'], // шапка-бини
    ['1605733513597-a8f8341084e6', '1620786514684-ff35b5aae55e', '1718622795525-2295971921ba'], // мини-сумка кросс-боди
    ['1664286074176-5206ee5dc878', '1664285612706-b32633c95820', '1666723043169-22e29545675c'], // ремень из натуральной кожи
  ],
};

function urlFor(id) {
  return `https://images.unsplash.com/photo-${id}?w=600&h=800&fit=crop&q=72&fm=jpg`;
}

function buildTasks() {
  const tasks = [];
  for (const [slug, items] of Object.entries(PRODUCTS)) {
    const ids = IDS[slug] || [];
    items.forEach((_, i) => {
      const trio = ids[i] || ids[i % ids.length] || [];
      for (let n = 0; n < 3; n += 1) {
        const id = trio[n] || trio[0];
        if (!id) continue;
        tasks.push({ url: urlFor(id), file: path.join(OUT_DIR, `${slug}-${i}-${n}.jpg`) });
      }
    });
  }
  return tasks;
}

// curl пишет картинку в stdout (без -o), Node сам пишет файл — иначе антивирус
// Windows лочит .jpg при записи и curl падает с code 23.
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
  console.log(`Скачиваю ${tasks.length} фото под товары…`);
  let done = 0; let failed = 0;
  for (const t of tasks) {
    const ok = await download(t);
    done += 1; if (!ok) failed += 1;
    if (done % 15 === 0 || done === tasks.length) console.log(`  ${done}/${tasks.length}${failed ? ` (заглушек: ${failed})` : ''}`);
  }
  console.log(`Готово. Скачано: ${tasks.length - failed}, заглушек: ${failed}.`);
}

run();
