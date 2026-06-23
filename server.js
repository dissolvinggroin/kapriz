const app = require('./app');
const { seedIfEmpty } = require('./seed/seed');

// На чистом хостинге (пустая БД) автоматически наполняем каталог
seedIfEmpty();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Kapriz store running on port ${PORT}`);
});
