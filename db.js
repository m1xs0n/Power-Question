const mysql = require('mysql2');

// Параметри підключення до бази даних на Railway
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'roundhouse.proxy.rlwy.net',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'dEvuBGfqinqUxMvmaiaxxjnrzpTTRxWF',
  database: process.env.DB_NAME || 'railway',
  port: process.env.DB_PORT || 11014
});

connection.connect((err) => {
  if (err) {
    console.error('Помилка підключення до бази даних:', err);
    throw err;
  }
  console.log('З\'єднання з базою даних успішно встановлено!');
});

module.exports = connection;
