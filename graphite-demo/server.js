const express = require('express');
const app = express();
// Security: prevent Express from disclosing framework info via X-Powered-By
app.disable('x-powered-by');
const port = 3000;

// Fake data for the activity feed
const activityFeed = [
  {
    id: 1000,
    title: 'New Photo Uploaded',
    body: 'Alice uploaded a new photo to her album.'
  },
  {
    id: 2000,
    title: 'Comment on Post',
    body: "Bob commented on Charlie's post."
  },
  {
    id: 13,
    title: 'Status Update',
    body: 'Charlie updated their status: "Excited about the new project!"'
  }
];

app.get('/feed', (req, res) => {
  res.json(activityFeed);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});