const express = require('express');
const path = require('path');
const app = express();

// Sajikan folder public secara statis
app.use(express.static(path.join(__dirname, 'public')));

// Route default ke index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(3000, () => {
    console.log('Frontend Static Server running on port 3000');
});