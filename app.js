//general settings
const boxName = '0';

//express server
const express = require('express')
const app = express()
app.use(express.json())
const port = 8000

const mongoose = require('mongoose');
const { createModel } = require('mongoose-gridfs')
const { createReadStream, unlinkSync } = require('fs');
// const stream = require('stream');

const fileUpload = require('express-fileupload');
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: './tmp/'
}));

//schemas
const schemas = require('./schemas')

contentType = {
  'json': 'application/json'
}

function checkForJSON(req, res, next, expectedType) {
  if (!req.is(expectedType)) {
    res.status(415)
    res.send({ 'error': 'wrong content type' })
  }
  next()
}

//Posts Data from Pi to Backend
//Example:
//Query: /api/postData/1?format=chunk
//Body: contains gridFS chunk JSON Data
app.post('/api/postData/:raspberryPiId', (req, res, next) => {
  checkForJSON(req, res, next, contentType.json)
},
  async (req, res) => {
    //connect to raspberryPiId
    const localDB = mongoose.connection.useDb(req.params.raspberryPiId)
    if (req.query.format == "chunk") {
      const chunkModel = localDB.model('chunkModel', schemas.chunk)
      await chunkModel.create(req.body).then((error) => {
        if (error) {
          res.status(500)
          res.send({ "error": "chunk could not be saved" })
        } else {
          res.send(200)
        }
      })
    } else if (req.query.format == "file") {
      const fileModel = localDB.model('file', schemas.file)
      await fileModel.create(req.body).then((error) => {
        if (error) {
          res.status(500)
          res.send({ "error": "file could not be saved" })
        } else {
          res.send(200)
        }
      })
    } else {
      res.status(500)
      res.send({ "error": "format must be chunk or file" })
    }
  })
//chunks Data and writes it to DB
//Example:
//Query: /api/writeData/
//Body: contains file as form-data type: 'file' and name: 'sensor' 
app.post('/api/writeData/:raspberryPiId', async (req, res) => {
  if (!req.files) {
    res.status(400)
    res.send({ 'error': 'no file' })
    return
  }
  //unnecessary for box
  const localDB = mongoose.connection.useDb(req.params.raspberryPiId)
  const File = createModel({
    modelName: 'File',
    connection: localDB
  })
  const readStream = createReadStream(req.files.sensor.tempFilePath);
  const options = ({ filename: req.files.sensor.name, contentType: req.files.sensor.mimetype });
  await File.write(options, readStream, (error, file) => {
    if (!error) {
      res.status(200).send(req.body)
      unlinkSync(req.files.sensor.tempFilePath, (err) => {
        if (err) {
          console.log("etwas ist schief gegeangen");
        }
      })
    }
  })
  console.log(req.files.sensor.tempFilePath);

})

//gets one File from certain Pi
//Example:
//Query: /api/getData/1?id=1
app.get('/api/getData/:raspberryPiId', async (req, res) => {
  const id = req.query.id
  if (!id) {
    res.status(400)
    res.send({ 'error': 'range is missing' })
  }
  if (id < 0) {
    res.status(400)
    res.send()
  }

  //connect to raspberryPiId
  const localDB = mongoose.connection.useDb(req.params.raspberryPiId)
  const fileModel = localDB.model('fs.file', schemas.files)
  documents = await fileModel.find({}).skip(parseInt(id)).limit(1)
  const File = createModel({
    modelName: 'File',
    connection: localDB
  })

  if (documents.length != 0) {
    for (var i = 0; i < documents.length; i++) {
      File.findById(documents[i]._id, (error, attachment) => {
        const readstream = attachment.read();
        readstream.on('error', (error) => {
          if (error) {
            res.status(500)
            res.send({ 'error': 'something went wrong' })
            return
          }
        });
        readstream.on('data', (content) => {
          res.write(content)
        });
        readstream.on('close', (close) => {
          res.end()
        });
      });
    }
  } else {
    res.status(400)
    res.send({ 'error': 'query exceeded range of collection' })
  }

})

//Gets position of existing Pi in Database
//Example:
//Query: /api/getPosition/1
app.get('/api/getPosition/:raspberryPiId', async (req, res) => {
  var deviceId = req.params.raspberryPiId
  const localDB = mongoose.connection.useDb(boxName)
  const deviceModel = localDB.model('device', schemas.device)
  var document = await deviceModel.findOne({
    name: deviceId
  }, 'position').exec()
  if (document) {
    res.status(200)
    res.send({ 'position': document.position })
  } else {
    res.status(500)
    res.send({ error: "device or position not found" })
  }
})

//Sets Position of existing Pi in Database
//Example
// Query: /api/setPosition/1
// Body: {position: [
//  number between -90 and 90
//  number between -180 and 180
//]} 
app.post('/api/setPosition/:raspberryPiId', (req, res, next) => {
  checkForJSON(req, res, next, contentType.json)
},
  async (req, res, next) => {
    var deviceId = req.params.raspberryPiId
    var position = req.body.position
    if (!position) {
      res.status(400)
      res.send({ 'error': 'no position given' })
    }
    if (position.length == 2) {

      //Latitude is between -90 and 90 degrees
      if (position[0] > 90 || position[0] < -90) {
        res.status(500)
        res.send({ error: "Latitude not between -90 and 90 degrees" })
        return
      }

      //Longitude is between -180 and 180 degrees
      if (position[1] > 180 || position[1] < -180) {
        res.status(500)
        res.send({ error: "Longitude not between -180 and 180 degrees" })
        return
      }
      //connect to pi0
      const localDB = mongoose.connection.useDb(boxName)
      const deviceModel = localDB.model('device', schemas.device);
      await deviceModel.updateOne({ name: deviceId }, { position: position }).then((error) => {
        if (error.n != error.ok) {
          res.status(500)
          res.send({ error: "an error has occured at updating" })
        } else {
          res.status(200)
          res.send()
        }
      })
    } else {
      res.status(400)
      res.send({ error: "invaild position" })
    }
  })

//registers Pi to Backend
//Example:
//Query: /api/register/30:9c:23:de:b0:22

app.get('/api/register/:macAddress', async (req, res) => {

  var rePattern = new RegExp(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)
  var deviceMacAddress = req.params.macAddress

  //checks if a mac address was sent
  if (deviceMacAddress.search(rePattern) == -1) {
    res.status(400)
    res.send("not a MAC Address")
    return
  }

  //connect to pi0
  const localDB = mongoose.connection.useDb(boxName)
  const deviceModel = localDB.model('device', schemas.device);
  var document = await deviceModel.findOne({ macAddress: deviceMacAddress }, 'name').exec()
  if (document) {
    res.status(200)
    res.send({ nodeName: document.name })
  } else {
    document = await deviceModel.find({}, 'name').sort({ name: -1 }).limit(1).exec()
    var name
    if (document[0]) {
      name = document[0].name + 1
    } else {
      name = 1
    }

    const record = new deviceModel({
      macAddress: deviceMacAddress,
      name: name,
      position: [0, 0],
    }).save()
    if (record) {
      res.status(201)
      res.send({ nodeName: name })
    } else {
      res.status(500)
    }
  }
})

app.get('/api/test/', (res, req) => {
  if (req.body.test == 2) {
    res.send({ 'message': 'alles gucci' })
  }
})

//custom error handling
app.use((error, req, res, next) => {
  const localDB = mongoose.connection.useDb(boxName)
  const errorModel = localDB.model('error', schemas.error)
  errorModel.create({
    timestamp: new Date().toISOString(),
    error: error.stack
  })
  res
    .status(500)
    .send({
      'error': error.message
    })
});


app.listen(port, () => {
  console.log(`listening at http://localhost:${port}`)
})

//mongoose controls our mongodb
mongoose.connect(`mongodb://192.168.0.102/${boxName}`, { useNewUrlParser: true })

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', () => {
  // we're connected!
  console.log('connected to db')

});