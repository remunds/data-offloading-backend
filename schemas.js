const mongoose = require('mongoose');

//create schema with all needed fields
const taskSchema = new mongoose.Schema({
    title: String,
    asdf: Number
});

const deviceSchema = new mongoose.Schema({
    macAddress: String,
    name: Number,
    position: [Number],
})

const chunkSchema = new mongoose.Schema({
    files_id: String,
    n: Number,
    data: [Buffer],
})

const fileSchema = new mongoose.Schema({
    length: Number,
    chunkSize: Number,
    uploadDate: Number,
    md5: String,
	filename: String,
	contentType: String,
	aliases: [String],
	metadate: Buffer //any
})

const errorSchema = new mongoose.Schema({
    timestamp: String,
    error: String
})

//export the mongoose model with the name Task (creates collection tasks)
exports.task = taskSchema
exports.chunks = chunkSchema
exports.files = fileSchema
exports.device = deviceSchema
exports.error = errorSchema