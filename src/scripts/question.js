const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const connection = require('../../db'); // Імпорт підключення до бази даних

// Отримання питання з бази даних
router.get('/get_question', (req, res) => {
  const sql = 'SELECT * FROM questions ORDER BY RAND() LIMIT 1;';

  connection.query(sql, (err, result) => {
    if (err) {
      console.error('Помилка запиту до бази даних:', err);
      res.status(500).send('Помилка сервера');
      return;
    }
    if (result.length === 0) {
      res.status(404).send('Питання не знайдено');
      return;
    }

    const question = result[0].text;
    res.json({ question: question });
  });
});

router.get('/get_random_question', (req, res) => {
  if (!req.session.questionHistory) {
    req.session.questionHistory = [];
  }
  
  let sql = 'SELECT * FROM questions WHERE id NOT IN (?) ORDER BY RAND() LIMIT 1;';
  let historyIds = req.session.questionHistory.map(question => question.id);
  
  if (historyIds.length === 0) {
    sql = 'SELECT * FROM questions ORDER BY RAND() LIMIT 1;';
  }

  connection.query(sql, [historyIds], (err, result) => {
    if (err) {
      console.error('Помилка запиту до бази даних:', err);
      res.status(500).send('Помилка сервера');
      return;
    }
    if (result.length === 0) {
      res.json(null);
      return;
    }

    const randomQuestion = result[0];
    req.session.questionHistory.push(randomQuestion); // Додавання нового питання до історії
    res.json(randomQuestion);
  });
});

router.post('/get_question_by_id', (req, res) => {
  const questionId = req.body.questionId;
  const sql = `SELECT * FROM questions WHERE id = ${questionId};`;

  connection.query(sql, (err, result) => {
    if (err) {
      console.error('Помилка запиту до бази даних:', err);
      res.status(500).send('Помилка сервера');
      return;
    }
    if (result.length === 0) {
      res.status(404).send('Питання не знайдено');
      return;
    }

    const question = result[0];
    // Перетворення посилання Google Drive
    if (question.image.includes('drive.google.com')) {
      const fileIdMatch = question.image.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (fileIdMatch) {
        const fileId = fileIdMatch[1];
        question.image = `https://drive.google.com/uc?id=${fileId}`;
      }
    }
    res.json(question);
  });
});

// Надсилання відповіді
router.post('/submit_answer', (req, res) => {
  const userAnswer = req.body.answer;
  const questionId = req.body.questionId;
  const userId = req.session.user ? req.session.user.id : null; // Отримайте ID користувача із сесії, якщо користувач авторизований

  const sql = 'SELECT * FROM questions WHERE id = ?';

  connection.query(sql, [questionId], (err, result) => {
    if (err) {
      console.error('Помилка запиту до бази даних:', err);
      res.status(500).send('Помилка сервера');
      return;
    }
    if (result.length === 0) {
      res.status(404).send('Питання не знайдено');
      return;
    }

    const correctAnswer = result[0].answer;

    if (userAnswer === correctAnswer) {
      // Якщо відповідь правильна
      const updateRating = 'UPDATE users SET rating = rating + 20 WHERE id = ?';
      connection.query(updateRating, [userId], (err) => {
        if (err) {
          console.error('Помилка оновлення рейтингу:', err);
        }
      });

      const updateXP = 'UPDATE users SET xp = xp + 50 WHERE id = ?';
      connection.query(updateXP, [userId], (err) => {
        if (err) {
          console.error('Помилка оновлення досвіду:', err);
        } else {
          // Перевірка на досягнення нового рівня
          const updateLevel = 'UPDATE users SET level = level + 1, xp = xp - 1000 WHERE id = ? AND xp >= 1000';
          connection.query(updateLevel, [userId], (err) => {
            if (err) {
              console.error('Помилка оновлення рівня:', err);
            }
          });
        }
      });
      
      const updateMoney = 'UPDATE users SET money = money + 20 WHERE id = ?'; // Додайте цей рядок

      connection.query(updateMoney, [userId], (err) => {
        if (err) {
          console.error('Помилка оновлення грошей:', err);
        }
      });

      res.json({ correct: true });
    } else {
      // Якщо відповідь неправильна
      const updateXP = 'UPDATE users SET xp = xp + 20 WHERE id = ?';
      connection.query(updateXP, [userId], (err) => {
        if (err) {
          console.error('Помилка оновлення досвіду:', err);
        } else {
          // Перевірка на досягнення нового рівня
          const updateLevel = 'UPDATE users SET level = level + 1, xp = xp - 1000 WHERE id = ? AND xp >= 1000';
          connection.query(updateLevel, [userId], (err) => {
            if (err) {
              console.error('Помилка оновлення рівня:', err);
            }
          });
        }
      });

      res.json({ correct: false });
    }

    if (userId) {
      // Оновлення кількості відповідей для питання
      const updateResponses = 'UPDATE users SET number_responses = number_responses + 1 WHERE id = ?';
      connection.query(updateResponses, [userId], (err) => {
        if (err) {
          console.error('Помилка оновлення кількості відповідей:', err);
        }
      });
    }
  });
});

router.get('/api/user', (req, res) => {
  if (!req.session.user) {
    return res.json(null);
  }

  res.json({
    name: req.session.user.name,
    level: req.session.user.level,
    rating: req.session.user.rating,
    icon: req.session.user.icon,
    background: req.session.user.background
  });
});

router.get('/api/top_players', (req, res) => {
  const sql = 'SELECT name, icon, rating FROM users ORDER BY rating DESC LIMIT 10;';

  connection.query(sql, (err, results) => {
    if (err) {
      console.error('Помилка запиту до бази даних:', err);
      res.status(500).send('Помилка сервера');
      return;
    }
    res.json(results);
  });
});

router.get('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Помилка завершення сесії:', err);
      res.status(500).send('Помилка сервера');
      return;
    }
    res.json({ success: true });
  });
});

router.post('/api/change_background', (req, res) => {
  const userId = req.session.user.id;
  const newBackground = req.body.background;

  connection.query('SELECT money FROM users WHERE id = ?', [userId], (error, results) => {
    if (error) {
      return res.json({ success: false, message: 'Error fetching user money' });
    }
    
    const userMoney = results[0].money;

    if (userMoney < 250) {
      return res.json({ success: false, message: 'Недостатньо грошей для зміни фону' });
    }

    connection.query('UPDATE users SET background = ?, money = money - 250 WHERE id = ?', [newBackground, userId], (error) => {
      if (error) {
        return res.json({ success: false, message: 'Error updating background' });
      }
      req.session.user.background = newBackground;
      res.json({ success: true });
    });
  });
});

router.post('/api/change_icon', (req, res) => {
  const userId = req.session.user.id;
  const newIcon = req.body.icon;

  connection.query('SELECT money FROM users WHERE id = ?', [userId], (error, results) => {
    if (error) {
      return res.json({ success: false, message: 'Error fetching user money' });
    }
    
    const userMoney = results[0].money;

    if (userMoney < 250) {
      return res.json({ success: false, message: 'Недостатньо грошей для зміни аватару' });
    }

    connection.query('UPDATE users SET icon = ?, money = money - 250 WHERE id = ?', [newIcon, userId], (error) => {
      if (error) {
        return res.json({ success: false, message: 'Error updating icon' });
      }
      req.session.user.icon = newIcon;
      res.json({ success: true });
    });
  });
});

router.get('/api/user_money', (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Користувач не авторизований' });
  }

  const userId = req.session.user.id;
  const sql = 'SELECT money FROM users WHERE id = ?';

  connection.query(sql, [userId], (err, result) => {
    if (err) {
      console.error('Помилка запиту до бази даних:', err);
      res.status(500).send('Помилка сервера');
      return;
    }

    if (result.length === 0) {
      res.json({ success: false, message: 'Користувача не знайдено' });
      return;
    }

    const money = result[0].money;
    res.json({ success: true, money: money });
  });
});

router.get('/api/check_admin_by_username/:username', (req, res) => {
  const username = req.params.username;
  
  const getUserIdSql = 'SELECT id FROM users WHERE name = ?';
  connection.query(getUserIdSql, [username], (err, userResult) => {
      if (err) {
          console.error('Помилка запиту до бази даних:', err);
          res.status(500).send('Помилка сервера');
          return;
      }

      if (userResult.length > 0) {
          const userId = userResult[0].id;
          const checkAdminSql = 'SELECT * FROM admins WHERE id_users = ?';

          connection.query(checkAdminSql, [userId], (err, adminResult) => {
              if (err) {
                  console.error('Помилка запиту до бази даних:', err);
                  res.status(500).send('Помилка сервера');
                  return;
              }

              if (adminResult.length > 0) {
                  res.json({ isAdmin: true });
              } else {
                  res.json({ isAdmin: false });
              }
          });
      } else {
          res.json({ isAdmin: false });
      }
  });
});

module.exports = router;
