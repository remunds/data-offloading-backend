const mongoose = require('mongoose')

const deviceSchema = new mongoose.Schema({
  macAddress: String,
  name: Number,
  position: [Number]
})

const chunkSchema = new mongoose.Schema({
  _id: mongoose.Types.ObjectId,
  files_id: mongoose.Types.ObjectId,
  n: Number,
  data: [Buffer]
})

const fileSchema = new mongoose.Schema({
  _id: mongoose.Types.ObjectId,
  length: Number,
  chunkSize: Number,
  uploadDate: Date,
  md5: String,
  filename: String,
  contentType: String,
  aliases: [String],
  metadate: Object // any
})

const errorSchema = new mongoose.Schema({
  timestamp: String,
  error: String
})

exports.chunk = chunkSchema
exports.file = fileSchema
exports.device = deviceSchema
exports.error = errorSchema
