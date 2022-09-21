const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const Note = require('../models/note');
const User = require('../models/user');

const getNoteById = async (req, res, next) => {
  const noteId = req.params.id;

  let note;

  try {
    note = await Note.findById(noteId);
  } catch (err) {
    return next(new HttpError('Could not find note', 500));
  }

  if (!note) {
    return next(new HttpError("Note doesn't exist", 404));
  }

  res.json({ note });
};

const getNotesByUserId = async (req, res, next) => {
  const userId = req.params.id;

  let notes;

  try {
    notes = await Note.find({ creatorId: userId });
  } catch (err) {
    return next(new HttpError('Could not fetch notes', 500));
  }

  if (!notes || notes.length === 0) {
    return next(new HttpError('Could not find any notes of this user', 404));
  }

  res.json({ notes: notes.map((note) => note.toObject({ getters: true })) });
};

///////////////////////////////////////////////////////////////////////

const addNote = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new HttpError('Invalid inputs passed, check dataa', 422));
  }

  const { title, content, contentPreview } = req.body;
  const newNote = new Note({
    title,
    content,
    contentPreview,
    // tags,
    //   image: { type: String, required: true },
    creatorId: req.userData.userId,
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    return next(new HttpError('Did not add new note1', 500));
  }

  if (!user) {
    return next(new HttpError('Could not find author of note', 404));
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    await newNote.save({ session });
    user.notes = [newNote, ...user.notes];

    await user.save({ session });

    await session.commitTransaction();
  } catch (err) {
    return next(new HttpError('Did not add new note2', 500));
  }

  res.status(201).json({ newNote });
};

///////////////////////////////////////////////////////////////////////

const editNote = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new HttpError('Error while edit', 422));
  }
  const {
    title,
    // tags,
    content,
    contentPreview,
    creatorId,
  } = req.body;
  const { id } = req.params;

  let note;

  try {
    note = await Note.findById(id);
  } catch (err) {
    return next(new HttpError('Edit failed, could not find note', 500));
  }

  const youAreNotNoteCreator =
    note.creatorId.toString() !== req.userData.userId;
  const noteIsNotSharedWithYou = !note.sharedWith.includes(req.userData.userId);

  if (youAreNotNoteCreator && noteIsNotSharedWithYou) {
    return next(new HttpError('You are not allowed to edit this note', 401));
  }

  note.title = title;
  note.content = content;
  note.contentPreview = contentPreview;
  note.creatorId = creatorId;
  // note.tags = tags;

  try {
    await note.save();
  } catch (err) {
    return next(
      new HttpError(err + 'Edit failed, could not save changes', 500)
    );
  }

  let user;
  try {
    user = await User.findById(creatorId);
  } catch (err) {
    return next(new HttpError('Did not add new note1', 500));
  }

  if (!user) {
    return next(new HttpError('Could not find author of note', 404));
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    const notesIdsWithoutEditedId = user.notes.filter(
      (noteId) => noteId.toString() !== id
    );
    user.notes = [id, ...notesIdsWithoutEditedId];

    await user.save({ session });

    await session.commitTransaction();
  } catch (err) {
    return next(new HttpError('Did not add new note2', 500));
  }

  res.status(201).json({ note: note.toObject({ getters: true }) });
};

///////////////////////////////////////////////////////////////////////

const shareNote = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new HttpError("Couldn't share", 500));
  }

  const { targetUserId } = req.body;
  const { id: noteId } = req.params;

  let note;

  try {
    note = await Note.findById(noteId);
  } catch (err) {
    return next(new HttpError('Share failed, could not find note', 500));
  }

  const isAlreadyShared = note.sharedWith.includes(targetUserId);
  if (isAlreadyShared) {
    note.sharedWith = note.sharedWith.filter(
      (id) => id.toString() !== targetUserId
    );
  } else {
    note.sharedWith = [...note.sharedWith, targetUserId];
  }

  try {
    await note.save();
  } catch (err) {
    return next(
      new HttpError(err + 'Share failed, could not save changes', 500)
    );
  }

  let targetUser;
  try {
    targetUser = await User.findById(targetUserId);
  } catch (err) {
    return next(new HttpError('Share failed', 500));
  }

  if (!targetUser) {
    return next(new HttpError('Could not find user to share', 404));
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    if (isAlreadyShared) {
      targetUser.notes = targetUser.notes.filter(
        (id) => id.toString() !== noteId
      );
    } else {
      targetUser.notes = [...targetUser.notes, noteId];
    }

    await targetUser.save({ session });

    await session.commitTransaction();
  } catch (err) {
    return next(new HttpError('Did not share note, 500'));
  }

  res.status(201).json({ sharedWith: note.sharedWith });
};

///////////////////////////////////////////////////////////////////////

const deleteNote = async (req, res, next) => {
  const { id } = req.params;

  let note;
  try {
    note = await Note.findById(id).populate('creatorId');
  } catch (err) {
    return next(new HttpError('Could not delete this note', 422));
  }

  if (!note) {
    return next(new HttpError('Could not find and delete this note', 404));
  }

  const youAreNotNoteCreator =
    note.creatorId.toString() !== req.userData.userId;
  const noteIsNotSharedWithYou = !note.sharedWith.includes(req.userData.userId);

  if (youAreNotNoteCreator && noteIsNotSharedWithYou) {
    return next(new HttpError('You are not allowed to delete this note', 401));
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    await note.remove({ session });
    note.creatorId.notes.pull(note);
    await note.creatorId.save({ session });

    await session.commitTransaction();
  } catch (err) {
    return next(new HttpError('Could not delete this note', 422));
  }

  res.status(200).json({ message: 'Delete success', id });
};

exports.getNoteById = getNoteById;
exports.getNotesByUserId = getNotesByUserId;
exports.addNote = addNote;
exports.editNote = editNote;
exports.shareNote = shareNote;
exports.deleteNote = deleteNote;
