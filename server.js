const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const connection = require('./db.js');
const questionRoutes = require('./src/scripts/question.js');
const usersRoutes = require('./src/scripts/users.js');
const adminsRoutes = require('./src/scripts/admins.js');
const app = express();
const port = process.env.PORT || 3000;
const axios = require('axios');

// Маршрут для проксі-запитів
app.get('/proxy', async (req, res) => {
  const imageUrl = req.query.url;

  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');
    res.writeHead(200, { 'Content-Type': 'image/jpeg' }); // змініть тип на відповідний, якщо зображення не JPEG
    res.end(buffer, 'binary');
  } catch (error) {
    console.error('Помилка завантаження зображення:', error);
    res.status(500).send('Помилка завантаження зображення');
  }
});

// Налаштування сесій
app.use(bodyParser.json());
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } 
}));

// Налаштування статичних файлів
app.use(express.static(path.join(__dirname)));
app.use('/src/assets/img/background', express.static(path.join(__dirname, 'src', 'img', 'background')));

// Головна сторінка
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Передача історії питань з сесії в роути питань
app.use('/src/scripts/question.js', (req, res, next) => {
  if (!req.session.questionHistory) {
    req.session.questionHistory = [];
  }
  next();
}, questionRoutes);

app.use('/src/scripts/users.js', usersRoutes);
app.use('/src/scripts/admins.js', adminsRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
