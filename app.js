//general settings
const boxName = 'pi1';

//express server
const express = require('express')
const app = express()
app.use(express.json())
const port = 8000

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/getData', (req, res) => {
  res.send('Getting Data!')
})

app.get('/api/getTasks', (req, res) => {
 res.send('hallo max') 
})

app.post('/sendData', (req, res) => {
  res.send('youre trying to send ddata!')
  console.log(req.body);
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

//mongoose controls our mongodb
const mongoose = require('mongoose');
mongoose.connect(`mongodb://localhost/${boxName}`, {useNewUrlParser: true});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  // we're connected!
  console.log('connected to db');

  //access task from schmas.js
  const Task = require('./schemas').task;

  //create new task
  const TestTask = new Task({ title: 'testizzda', asdf: 1337});

  //call methods of models like this
  // TestTask.speak();

  //save task to mongodb like this
  // TestTask.save();

  //a query would normally need to be executed after save has fully finished:
  // TestTask.save().then(() => {//call find here})
  // await could also work
  Task.find((err, tasks) => {
    if (err) return console.error(err);
    console.log(tasks);
  });

});