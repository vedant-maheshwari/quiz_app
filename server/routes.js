const express = require('express');
const router = express.Router();

// Define a route for the root URL
router.get('/', (req, res) => {
    res.sendFile(__dirname + '/../public/index.html');
});

module.exports = router;