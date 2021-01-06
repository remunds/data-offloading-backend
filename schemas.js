const mongoose = require('mongoose');

//create schema with all needed fields
const taskSchema = new mongoose.Schema({
    title: String,
    asdf: Number
});


/* add methods like this:
*/

// taskSchema.methods.speak = function () {
//   const greeting = this.title
//     ? "Meow name is " + this.title
//     : "I don't have a name";
//   console.log(greeting);
// }

//export the mongoose model with the name Task (creates collection tasks)
module.exports.task = mongoose.model('Task', taskSchema);