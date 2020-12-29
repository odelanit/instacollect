import express from 'express';
var router = express.Router();
import {homeGet, homePost} from "../controllers/homeController";

/* GET home page. */
router.get('/', homeGet);
router.post('/', homePost);

module.exports = router;
