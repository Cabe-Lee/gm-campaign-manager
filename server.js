
const app = require('express')();
const port = 3000;
const express = require('express');

// app.listen('/', (req, res) => {
//   console.log('Hello, World!');
// });

app.use(express.static('views'));
app.use(express.static('styles'));
app.use(express.static('js'));

app.listen(port, () => {
  console.log(`\nServer is running on http://localhost:${port}\nPress Ctrl+C (or Cmd+C) to stop the server.\n`);
});

