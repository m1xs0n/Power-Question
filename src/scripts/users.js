const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const connection = require('../../db'); // Імпорт підключення до бази даних



router.post('/api/register', (req, res) => {
  const { name, password } = req.body;

  if (name.length < 4 || password.length < 8) {
    return res.json({ success: false, message: 'Ім\'я повинно містити мінімум 4 символів, а пароль мінімум 8 символів.' });
  }

  connection.query('SELECT id FROM users WHERE name = ?', [name], (err, results) => {
    if (err) {
      console.error('Помилка запиту до бази даних:', err);
      return res.status(500).send('Помилка сервера');
    }

    if (results.length > 0) {
      return res.json({ success: false, message: 'Ім\'я вже існує.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = { 
      name, 
      password: hashedPassword, 
      rating: 0, 
      level: 0, 
      xp: 0,
      icon: 'icon_1.png', 
      background: 'background_1.png',
      money: 500,
      number_responses: 0  // Add this line
    };
    

    connection.query('INSERT INTO users SET ?', user, (err, result) => {
      if (err) {
        console.error('Помилка запиту до бази даних:', err);
        return res.status(500).send('Помилка сервера');
      }

      connection.query('SELECT * FROM users WHERE name = ?', [name], (err, results) => {
        if (err) {
          console.error('Помилка запиту до бази даних:', err);
          return res.status(500).send('Помилка сервера');
        }

        const newUser = results[0];
        req.session.user = newUser;
        res.json({ success: true });
      });
    });
  });
});

// Login route
router.post('/api/login', (req, res) => {
  const { name, password } = req.body;
  const sql = 'SELECT * FROM users WHERE name = ?';

  connection.query(sql, [name], (err, result) => {
    if (err) {
      console.error('Помилка запиту до бази даних:', err);
      res.status(500).send('Помилка сервера');
      return;
    }

    if (result.length === 0) {
      res.json({ success: false });
      return;
    }

    const user = result[0];

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error('Помилка порівняння пароля:', err);
        res.status(500).send('Помилка сервера');
        return;
      }

      if (isMatch) {
        req.session.user = user;
        res.json({ success: true });
      } else {
        res.json({ success: false });
      }
    });
  });
});

// User information route
router.get('/api/user', (req, res) => {
  if (!req.session.user) {
    return res.json(null);
  }

  const userId = req.session.user.id;

  connection.query('SELECT name, level, rating, icon, background, money, number_responses FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).send('Server error');
    }

    if (results.length === 0) {
      return res.json(null);
    }

    const user = results[0];
    res.json(user);
  });
});




// Top players route
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
