const express = require('express');
const router = express.Router();
const io = require('socket.io');

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', null);
});

module.exports = router;