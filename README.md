# About this project

In support of the [Nature 4.0 project](https://www.uni-marburg.de/de/fb19/natur40) an app was developed for collecting nature data and making them available to researchers. 

This repository is for deployment on the backend server.

# Getting Started
## Requirements
1. (tested on) Raspberry Pi 4 B, at least 4GB RAM recommended
2. [Raspios 64 bit](https://downloads.raspberrypi.org/raspios_arm64/images/) (raspios_arm64-2020-08-24 and higher)
3. User named "pi"

## Installation
### Configure
Download repository via GitHub.
```
cd /home/pi/
git clone https://github.com/remunds/data-offloading-backend.git
cd data-offloading-backend
nano config_default.json
```
Then edit your specific details, such as backend IP, backend Port, db IP, db Port, dtnd IP and dtnd Port.
In a normal use case, you only have to adjust the backend IP to a static and globally available IP adress, leading to your backend server.
Do not change "configuration" and "nodeName".


   1. backend IP, 
   2. backend port, 
   3. db IP, 
   4. db port, 
   5. dtnd IP and 
   6. dtnd port.

   In a normal use case, you only have to adjust the backend IP to a static and globally available IP address, leading to your backend server.
   **Do not change "configuration" and "nodeName". **


```bash
./setup.sh
sudo mv dtnd.service /lib/systemd/system/
sudo mv offloading.service /lib/systemd/system/
sudo ./start.sh
```

3. Now the backend server should run in background and should start itself automatically after restart or crash.

#### For debugging purposes, you can run
```
sudo systemctl status offloading.service
sudo systemctl status dtnd.service
sudo systemctl status mongod.service
```

#### Terminate the process
```
sudo systemctl stop offloading.service
sudo systemctl stop dtnd.service
``` 

#### Start again
```
./start.sh
```
or
```
sudo systemctl start dtnd.service
sudo systemctl start mongod.service
sudo systemctl start offloading.service
```

## Modifying

### Add GPS positions of new or existing Sensorboxes

At this time, the position of each Sensorbox has to be updated manually. You need to update the GPS position of each Sensorbox to get position marks on the map inside the app.

In the process of setting up, every Sensorbox gets a unique "nodeName" alias ID. You can see the "nodeName" in the `config.json`. With that information and the correct GPS coordinates (e.g. acquired from the Dragino GPS/LoRa Hat (not implemented) or from your smartphone), you can easily update the position.

#### Updating via HTTP-Request

e.g. the server is running on localhost (127.0.0.1) and port 8000 using POST-method

```http
http://127.0.0.1:8000/api/setPosition/:raspberryPiId
```

POST Body

```
{
    position: [
		Number: -90: 90,
		Number: -180, 180
    ]
}
```

 #### for Example

1. the server is running on localhost (127.0.0.1) and 
2. port 8000, PiId = 1 and 
3. Coordiantes = [49.87786567552634, 8.654014690587697]

```http
http://127.0.0.1:8000/api/setPosition/1
```

POST Body

```
{
    position: [
        49.87786567552634, 
        8.654014690587697
    ]
}
```

### Add new Routes

Modify `app.js` as you wish. Be aware that all data that should be transferred to the backend has to be chunked via [gridFS](https://www.npmjs.com/package/mongoose-gridfs) first!

For example:

```js
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
```

`app.js`

For more detail visit the [node.js](https://nodejs.org/en/docs/) and [express.js](http://expressjs.com/en/5x/api.html) documentation.

### Add Data to Database

We are using MongoDB as a NoSQL Database in combination with Mongoose to structure our data. You have to add your schema in `schema.js`.

```js
const errorSchema = new mongoose.Schema({
  timestamp: String,
  error: String
})

exports.error = errorSchema
```

`/schema.js`

Please visit the [Mongoose Documentation](https://mongoosejs.com/) for more details.

Be aware that all data that should be transferred to the backend has to be chunked via [gridFS](https://www.npmjs.com/package/mongoose-gridfs) first!

### Getting Data

Instead of storing big files, all files are chunked via [gridFS](https://www.npmjs.com/package/mongoose-gridfs) to 255 kB documents. This has multiple benefits such as:

1. It can be handled by the NoSQL MongoDB instead of a file manager and 
2. people do not have to wait until the whole file has done to be downloaded.

To restore the data, you have to reassemble the files via [gridFS](https://www.npmjs.com/package/mongoose-gridfs). For this, there is already a working function. Every Sensorbox has its own unique Id. Basically all Sensorboxes are numbered incrementally, starting by 1, because 0 is reserved for the backend. The transmitted data is stored in a separate database for each Sensorbox.

With the following route, you can access a specific Sensorbox and get a certain file.

e.g. the server is running on localhost (127.0.0.1) and port 8000 using GET-method

```http
http://127.0.0.1:8000/api/getData/:raspberryPiI?=fileId
```

For Example:

```http
http://127.0.0.1:8000/api/getData/:13?=37
```

You will be receiving an error when the file you tried to request is not fully transmitted to the backend.

### Add new Tasks

For tasks, that do not generate any data (e.g. clean the box), you do not have to change anything.

Otherwise, for tasks that generate data, that should only be saved in the right database, please chunk them via [gridFS](https://www.npmjs.com/package/mongoose-gridfs) and insert them via  `/api/postData/:raspberryPiId`. 



## dtn7-go

dtnd is a delay-tolerant networking daemon. It represents a node inside the network and is able to transmit, receive and forward bundles to other nodes. A node's neighbors may be specified in the configuration or detected within the local network through a peer discovery. Bundles might be sent and received through a REST-like web interface. The features and their configuration is described inside the provided example configuration.toml.

https://github.com/dtn7/dtn7-go

# License

This project's code is licensed under the [GNU General Public License version 3 (GPL-3.0-or-later)](LICENSE).
