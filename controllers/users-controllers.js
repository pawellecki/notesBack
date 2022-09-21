const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');
const User = require('../models/user');

const getUserById = async (req, res, next) => {
  const userId = req.params.userId;

  let user;
  try {
    user = await User.findById(userId).populate('notes');
  } catch (err) {
    return next(new HttpError("couldn't find user", 500));
  }

  if (!user) {
    return next(new HttpError("couldn't find user with this id", 500));
  }

  const notesPreview = user.notes.map(
    ({ _id, creatorId, title, contentPreview, tags, sharedWith }) => ({
      _id,
      creatorId,
      title,
      contentPreview,
      tags,
      sharedWith,
    })
  );
  res.json({ userId: user.id, email: user.email, notesPreview });
};

////////////////////////////////////////////////////////////////////////////////////////

const getUsers = async (req, res, next) => {
  let users;

  try {
    users = await User.find({}, 'email name');
  } catch (err) {
    return next(new HttpError('fetching users failed', 500));
  }

  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

////////////////////////////////////////////////////////////////////////////////////////

const signup = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError('signup - Invalid inputs passed, check data', 422)
    );
  }

  const { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    return next(new HttpError('signup failed, try again later', 500));
  }

  if (existingUser) {
    return next(
      new HttpError('user exists already, please login instead', 422)
    );
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    return next(new HttpError('Could not create user, try again later', 500));
  }

  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    image:
      'https://image.shutterstock.com/image-photo/closeup-portrait-funny-ginger-cat-600w-1563541219.jpg',
    notes: [],
  });

  try {
    await newUser.save();
  } catch (err) {
    return next(new HttpError('signup failed, try again', 500));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_KEY,
      { expiresIn: '1h' }
    );
  } catch (err) {
    return next(new HttpError('signup failed, try again', 500));
  }

  res.status(201).json({ userId: newUser.id, email: newUser.email, token });
};

////////////////////////////////////////////////////////////////////////////////////////

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let user;
  try {
    user = await User.findOne({ email }).populate('notes');
  } catch (err) {
    return next(new HttpError('logging in failed, try again later', 500));
  }

  if (!user) {
    return next(new HttpError('check credentials1, could not log you in', 403));
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, user.password);
  } catch (err) {
    return next(new HttpError('--', 500));
  }

  if (!isValidPassword) {
    return next(new HttpError('check credentials, could not log you in', 403));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_KEY,
      { expiresIn: '1h' }
    );
  } catch (err) {
    return next(new HttpError('logging in failed, try again', 500));
  }

  const notesPreview = user.notes.map(
    ({ _id, creatorId, title, contentPreview, tags, sharedWith }) => ({
      _id,
      creatorId,
      title,
      contentPreview,
      tags,
      sharedWith,
    })
  );

  res.json({ userId: user.id, email: user.email, notesPreview, token });
};

exports.getUserById = getUserById;
exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
