const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const connection = require('../../db'); // Database connection import

const ICONS_DIR = path.join(__dirname, '../../src/assets/img/icon');
const BACKGROUNDS_DIR = path.join(__dirname, '../../src/assets/img/background');

function validateUserData(user) {
  const errors = [];

  if (!user.name || user.name.length < 4) {
    errors.push('Name must be at least 4 characters long');
  }

  if (!user.password || user.password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (user.icon && !fs.existsSync(path.join(ICONS_DIR, user.icon))) {
    errors.push('Icon file does not exist');
  }

  if (user.background && !fs.existsSync(path.join(BACKGROUNDS_DIR, user.background))) {
    errors.push('Background file does not exist');
  }

  if (user.rating < 0) {
    errors.push('Rating cannot be negative');
  }

  if (user.level < 0) {
    errors.push('Level cannot be negative');
  }

  if (user.xp < 0) {
    errors.push('XP cannot be negative');
  }

  if (user.money < 0) {
    errors.push('Money cannot be negative');
  }
  
  if (user.number_responses < 0) {
    errors.push('number_responses cannot be negative');
  }

  return errors;
}

router.get('/api/users', (req, res) => {
  const sql = 'SELECT * FROM users';
  connection.query(sql, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

router.get('/api/users/:id', (req, res) => {
  const sql = 'SELECT * FROM users WHERE id = ?';
  connection.query(sql, [req.params.id], (err, result) => {
    if (err) throw err;
    res.json(result[0]);
  });
});

router.post('/api/users', (req, res) => {
  const { name, password, rating = 0, level = 0, xp = 0, icon = 'icon_1.png', background = 'background_1.png', money = 500, number_responses = 0 } = req.body;

  const errors = validateUserData({ name, password, rating, level, xp, icon, background, money, number_responses });
  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const user = { 
    name, 
    password: hashedPassword, 
    rating, 
    level, 
    xp, 
    icon, 
    background, 
    money,
    number_responses
  };

  const sql = 'INSERT INTO users SET ?';
  connection.query(sql, user, (err, result) => {
    if (err) throw err;
    res.json({ id: result.insertId });
  });
});

router.put('/api/users/:id', (req, res) => {
  const { password, ...otherFields } = req.body;

  if (password) {
    otherFields.password = bcrypt.hashSync(password, 10);
  }

  const errors = validateUserData(otherFields);
  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const sql = 'UPDATE users SET ? WHERE id = ?';
  connection.query(sql, [otherFields, req.params.id], (err) => {
    if (err) throw err;
    res.sendStatus(200);
  });
});

router.delete('/api/users/:id', (req, res) => {
  const sql = 'DELETE FROM users WHERE id = ?';
  connection.query(sql, [req.params.id], (err) => {
    if (err) throw err;
    res.sendStatus(200);
  });
});

// Admin routes
router.get('/api/admins', (req, res) => {
  const sql = 'SELECT * FROM admins';
  connection.query(sql, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

router.get('/api/admins/:id', (req, res) => {
  const sql = 'SELECT * FROM admins WHERE id = ?';
  connection.query(sql, [req.params.id], (err, result) => {
    if (err) throw err;
    res.json(result[0]);
  });
});

router.post('/api/admins', (req, res) => {
  const admin = req.body;
  const sql = 'INSERT INTO admins SET ?';
  connection.query(sql, admin, (err, result) => {
    if (err) throw err;
    res.json({ id: result.insertId });
  });
});

router.put('/api/admins/:id', (req, res) => {
  const admin = req.body;
  const sql = 'UPDATE admins SET ? WHERE id = ?';
  connection.query(sql, [admin, req.params.id], (err) => {
    if (err) throw err;
    res.sendStatus(200);
  });
});

router.delete('/api/admins/:id', (req, res) => {
  const sql = 'DELETE FROM admins WHERE id = ?';
  connection.query(sql, [req.params.id], (err) => {
    if (err) throw err;
    res.sendStatus(200);
  });
});

// Question routes
router.get('/api/questions', (req, res) => {
  const sql = 'SELECT * FROM questions';
  connection.query(sql, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

router.get('/api/questions/:id', (req, res) => {
  const sql = 'SELECT * FROM questions WHERE id = ?';
  connection.query(sql, [req.params.id], (err, result) => {
    if (err) throw err;
    res.json(result[0]);
  });
});

router.post('/api/questions', (req, res) => {
  const question = req.body;
  const sql = 'INSERT INTO questions SET ?';
  connection.query(sql, question, (err, result) => {
    if (err) throw err;
    res.json({ id: result.insertId });
  });
});

router.put('/api/questions/:id', (req, res) => {
  const question = req.body;
  const sql = 'UPDATE questions SET ? WHERE id = ?';
  connection.query(sql, [question, req.params.id], (err) => {
    if (err) throw err;
    res.sendStatus(200);
  });
});

router.delete('/api/questions/:id', (req, res) => {
  const sql = 'DELETE FROM questions WHERE id = ?';
  connection.query(sql, [req.params.id], (err) => {
    if (err) throw err;
    res.sendStatus(200);
  });
});

module.exports = router;
