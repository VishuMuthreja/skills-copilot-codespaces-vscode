// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto'); // generate random id
const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Store comments
const commentsByPostId = {};

// Route handler
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []); // return comments of post
});

// Route handler
app.post('/posts/:id/comments', async (req, res) => {
  const commentId = randomBytes(4).toString('hex'); // generate random id
  const { content } = req.body; // content of comment

  const comments = commentsByPostId[req.params.id] || []; // get comments of post
  comments.push({ id: commentId, content, status: 'pending' }); // add comment to post
  commentsByPostId[req.params.id] = comments; // update comments of post

  // Send event to event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated', // type of event
    data: {
      id: commentId, // id of comment
      content, // content of comment
      postId: req.params.id, // id of post
      status: 'pending', // status of comment
    },
  });

  res.status(201).send(comments); // return comments of post
});

// Route handler
app.post('/events', async (req, res) => {
  console.log('Received Event', req.body.type); // log event type
  const { type, data } = req.body; // get type and data of event

  // Check type of event
  if (type === 'CommentModerated') {
    const { postId, id, status, content } = data; // get data of event
    const comments = commentsByPostId[postId]; // get comments of post
    const comment = comments.find((comment) => {
      return comment.id === id; // find comment
    });
    comment.status = status; // update status of comment

    // Send event to event bus
    await axios.post('http://event-bus-srv:4005/events