const express = require('express');
const { check } = require('express-validator');
const checkAuth = require('../middleware/check-auth');

const {
  getNoteById,
  getNotesByUserId,
  addNote,
  editNote,
  shareNote,
  deleteNote,
} = require('../controllers/notes-controllers');

const router = express.Router();

router.get('/:id', getNoteById);
router.get('/user/:id', getNotesByUserId);

router.use(checkAuth);

router.post(
  '/',
  [
    check('title').not().isEmpty(),
    // check('tags').isLength({ min: 1 })
  ],
  addNote
);

router.patch(
  '/:id',
  [
    check('title').not().isEmpty(),
    // check('tags').isLength({ min: 1 })
  ],
  editNote
);

router.patch(
  '/:id/share',
  [
    // check('shareWith').not().isEmpty(),
  ],
  shareNote
);

router.delete('/:id', deleteNote);

module.exports = router;
