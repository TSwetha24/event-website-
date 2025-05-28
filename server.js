const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const FILE_PATH = path.join(__dirname, 'registrations.json');

// Enable CORS for all routes
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Serve frontend static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// POST route to receive registration data
app.post('/register', (req, res) => {
  const { name, email, event } = req.body;

  if (!name || !email || !event) {
    return res.status(400).json({ error: '❌ All fields are required!' });
  }

  console.log('Received registration:', req.body);

  // Read existing registrations or initialize empty array
  let registrations = [];
  if (fs.existsSync(FILE_PATH)) {
    try {
      registrations = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
    } catch (err) {
      console.error('Error reading registrations.json:', err);
      return res.status(500).json({ error: '❌ Server error: Could not read data' });
    }
  }

  // Append new registration and save
  registrations.push({ name, email, event });

  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(registrations, null, 2), 'utf8');
    res.json({ message: '✅ Registration saved successfully!' });
  } catch (err) {
    console.error('Error writing registrations.json:', err);
    res.status(500).json({ error: '❌ Server error: Could not save data' });
  }
});

// GET route to fetch all registrations
app.get('/registrations', (req, res) => {
  if (fs.existsSync(FILE_PATH)) {
    try {
      const data = fs.readFileSync(FILE_PATH, 'utf8');
      const registrations = JSON.parse(data);
      return res.json(registrations);
    } catch (err) {
      console.error('Error reading registrations.json:', err);
      return res.status(500).json({ error: '❌ Could not read registration data' });
    }
  }
  res.status(404).json({ message: '⚠️ No registrations found yet.' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
