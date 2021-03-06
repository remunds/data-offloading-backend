// express server
const express = require('express')
const app = express()
app.use(express.json({ limit: '25mb' }))
const mongoose = require('mongoose')
mongoose.set('useFindAndModify', false)
const { createModel } = require('mongoose-gridfs')
const { createReadStream, unlink } = require('fs')
const axios = require('axios')

// general settings
let config

try {
  config = require('./config.json')
} catch (err) {
  console.log('no config file available. Did you run setup.sh?')
  process.exit(0)
}
const boxName = config.nodeName
const port = config.backendPort
const dtnd = `${config.dtndIp}:${config.dtndPort}`
let dtndUuid = false

const multer = require('multer')

// uploaded files are saved to the uploads directory to handle multipart data
const upload = multer({ dest: 'uploads/' })
// schemas
const schemas = require('./schemas')

const contentType = {
  json: 'application/json'
}

// check if the request body is in JSON format
// If the current middleware function does not end the request-response cycle,
// it must call next() to pass control to the next middleware function.
// Otherwise, the request will be left hanging.
function checkForJSON (req, res, next, expectedType) {
  if (!req.is(expectedType)) {
    res.status(415)
    res.send({ error: 'wrong content type' })
    return
  }
  next()
}

// registers at dtnd rest server and gets the uuid
async function registerDtnd () {
  axios({
    method: 'post',
    url: `http://${dtnd}/rest/register`,
    data: {
      endpoint_id: 'dtn://0/backend'
    }
  }).then((response) => {
    console.log(response.data)
    if (!response.data.err) {
      dtndUuid = response.data.uuid
      console.log('connected to dtnd')
    } else {
      console.log('cannot connect to dtnd')
    }
  }).catch(() => {
    console.log('cannot connect to dtnd')
  })
}

// Posts Data from Pi to Backend
// Example:
// Query: /api/postData/1?format=chunk
// Body: contains gridFS chunk JSON Data
// has to be tested
app.post('/api/postData/:raspberryPiId', (req, res, next) => {
  checkForJSON(req, res, next, contentType.json)
},
async (req, res) => {
  // connect to raspberryPiId
  let successfullySent = false
  const localDB = mongoose.connection.useDb(req.params.raspberryPiId)
  if (req.query.format === 'chunk') {
    const chunkModel = localDB.model('fs.chunk', schemas.chunk)
    await chunkModel.findOneAndUpdate({ _id: req.body._id }, req.body, { upsert: true }).then(() => {
      successfullySent = true
    })
  } else if (req.query.format === 'file') {
    const fileModel = localDB.model('fs.file', schemas.file)
    await fileModel.findOneAndUpdate({ _id: req.body._id }, req.body, { upsert: true }).then(() => {
      successfullySent = true
    })
  } else {
    res.status(500)
    res.send({ error: 'format must be chunk or file' })
  }
  if (successfullySent === true && dtndUuid) {
    axios({
      method: 'post',
      url: `http://${dtnd}/rest/build`,
      data: {
        uuid: dtndUuid,
        arguments: {
          destination: `dtn://${req.params.raspberryPiId}/box`,
          source: 'dtn://0/backend',
          creation_timestamp_now: 1,
          lifetime: '24h',
          payload_block: JSON.stringify({
            instruction: 'delete',
            type: req.query.format,
            objectId: req.body._id
          })
        }
      }
    }).then((response) => {
      // console.log(response.data);
      if (response.data.error) {
        res.status(500).send({ error: 'somthing went wrong' })
      } else {
        res.status(200).send()
      }
    }).catch((err) => {
      console.log(err)
      console.log('not connected to dtnd')
      res.status(503)
      res.send({ error: 'chunk saved in db but could not etablish connection to dtnd server. No deletion command was send' })
    })
  } else {
    res.status(200).send()
  }
})

// chunks Data and writes it to DB
// Example:
// Query: /api/writeData/
// Body: contains file as form-data type: 'file' and name: 'sensor'
app.post('/api/writeData/:raspberryPiId', upload.single('sensor'), async (req, res) => {
  if (!req.params.raspberryPiId) {
    res.status(500).send()
    return
  }
  const localDB = mongoose.connection.useDb(req.params.raspberryPiId)
  // create model so that our collections are called fs.files and fs.chunks
  const fs = createModel({
    modelName: 'fs',
    connection: localDB
  })

  const File = localDB.model('fs.file', schemas.file)
  const Chunk = localDB.model('fs.chunk', schemas.chunk)
  // write file to db
  console.log(req.sensor != null)
  if (req.file == null) {
    res.status(500).send()
    return
  }
  const readStream = createReadStream(req.file.path)
  const options = ({ filename: req.file.originalname, contentType: req.file.mimetype })
  await fs.write(options, readStream, async (error, file) => {
    if (error) {
      res.status(500).send({ error: 'could not chunk file' })
    }
    console.log('wrote file with id: ' + file._id)
    // add the field downloads to file and chunks; add timestamp to chunk
    File.findByIdAndUpdate(file._id, { downloads: 0 }).exec()
    Chunk.updateMany({ files_id: file._id }, { downloads: 0, timestamp: Date.now() }).exec()
    unlink(req.file.path, (err) => {
      if (err) {
        res.status(500).send({ error: 'could not delete tmp file' })
      } else {
        res.status(200).send({ error: '' })
      }
    })
  })
})

// gets one File from certain Pi
// Example:
// Query: /api/getData/1?id=1
app.get('/api/getData/:raspberryPiId', async (req, res) => {
  const id = req.query.id
  if (!id) {
    res.status(400)
    res.send({ error: 'range is missing' })
    return
  }
  if (id < 0) {
    res.status(400)
    res.send()
    return
  }

  // connect to raspberryPiId
  const localDB = mongoose.connection.useDb(req.params.raspberryPiId)
  const fileModel = localDB.model('fs.file', schemas.file)
  const documents = await fileModel.find({}).skip(parseInt(id)).limit(1)
  const File = createModel({
    modelName: 'File',
    connection: localDB
  })

  if (documents.length !== 0) {
    for (let i = 0; i < documents.length; i++) {
      File.findById(documents[i]._id, (error, attachment) => {
        console.log(error)
        const readstream = attachment.read()
        readstream.on('error', (error) => {
          if (error) {
            res.status(500)
            res.send({ error: 'something went wrong' })
          }
        })
        readstream.on('data', (content) => {
          res.write(content)
        })
        readstream.on('close', (close) => {
          res.end()
        })
      })
    }
  } else {
    res.status(400)
    res.send({ error: 'query exceeded range of collection' })
  }
})

// Gets position of existing Pi in Database
// Example:
// Query: /api/getPosition/1
app.get('/api/getPosition/:raspberryPiId', async (req, res) => {
  const deviceId = req.params.raspberryPiId
  const localDB = mongoose.connection.useDb(boxName)
  const deviceModel = localDB.model('device', schemas.device)
  const document = await deviceModel.findOne({
    name: deviceId
  }, 'position').exec()
  if (document) {
    res.status(200)
    res.send({ position: document.position })
  } else {
    res.status(500)
    res.send({ error: 'device or position not found' })
  }
})

// Sets Position of existing Pi in Database
// Example
// Query: /api/setPosition/1
// Body: {position: [
//  number between -90 and 90
//  number between -180 and 180
// ]}
app.post('/api/setPosition/:raspberryPiId', (req, res, next) => {
  checkForJSON(req, res, next, contentType.json)
},
async (req, res, next) => {
  const deviceId = req.params.raspberryPiId
  const position = req.body.position
  if (!position) {
    res.status(400)
    res.send({ error: 'no position given' })
  }
  if (position.length === 2) {
    // Latitude is between -90 and 90 degrees
    if (position[0] > 90 || position[0] < -90) {
      res.status(500)
      res.send({ error: 'Latitude not between -90 and 90 degrees' })
      return
    }

    // Longitude is between -180 and 180 degrees
    if (position[1] > 180 || position[1] < -180) {
      res.status(500)
      res.send({ error: 'Longitude not between -180 and 180 degrees' })
      return
    }
    // connect to pi0
    const localDB = mongoose.connection.useDb(boxName)
    const deviceModel = localDB.model('device', schemas.device)
    await deviceModel.updateOne({ name: deviceId }, { position: position }).then((error) => {
      if (error.n !== error.ok) {
        res.status(500)
        res.send({ error: 'an error has occured at updating' })
      } else {
        res.status(200)
        res.send()
      }
    })
  } else {
    res.status(400)
    res.send({ error: 'invaild position' })
  }
})

// registers Pi to Backend
// Example:
// Query: /api/register/30:9c:23:de:b0:22

app.get('/api/register/:macAddress', async (req, res) => {
  const rePattern = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/
  const deviceMacAddress = req.params.macAddress

  // checks if a mac address was sent
  if (deviceMacAddress.search(rePattern) === -1) {
    res.status(400)
    res.send({ error: 'not a MAC Address' })
    return
  }

  // connect to pi0
  const localDB = mongoose.connection.useDb(boxName)
  const DeviceModel = localDB.model('device', schemas.device)
  let document = await DeviceModel.findOne({ macAddress: deviceMacAddress }, 'name').exec()
  if (document) {
    res.status(200)
    res.send({ nodeName: document.name })
  } else {
    document = await DeviceModel.find({}, 'name').sort({ name: -1 }).limit(1).exec()
    let name
    if (document[0]) {
      name = document[0].name + 1
    } else {
      name = 1
    }

    const record = new DeviceModel({
      macAddress: deviceMacAddress,
      name: name,
      position: [0, 0]
    }).save()
    if (record) {
      res.status(201)
      res.send({ nodeName: name })
    } else {
      res.status(500)
    }
  }
})

// custom error handling
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
      error: error.message
    })
})

const server = app.listen(port, () => {
  console.log(`listening at http://localhost:${port}`)
})

// mongoose controls our mongodb
mongoose.connect(`mongodb://${config.dbIp}/${boxName}`, { useNewUrlParser: true })

const db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', () => {
  // we're connected!
  console.log('connected to db')
})
registerDtnd()

module.exports = server
