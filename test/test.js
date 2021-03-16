const supertest = require('supertest')
const should = require('should')

require('../app')
const server = supertest.agent('http://localhost:8000')

function createMacAdress() {
  return (Math.round(Math.random() * (99 - 10 + 1) + 10)) +
    ':' +
    (Math.round(Math.random() * (99 - 10 + 1) + 10)) +
    ':' +
    (Math.round(Math.random() * (99 - 10 + 1) + 10)) +
    ':' +
    (Math.round(Math.random() * (99 - 10 + 1) + 10)) +
    ':' +
    (Math.round(Math.random() * (99 - 10 + 1) + 10)) +
    ':' +
    (Math.round(Math.random() * (99 - 10 + 1) + 10))
}

const macAddress = createMacAdress()
// getPostion test
describe('Position', () => {
  it('setPosition from Pi', (done) => {
    server
      .post('/api/setPosition/1')
      .send({
        position: [
          -34.232223,
          -23.2323
        ]
      })
      .end((err, res) => {
        should.not.exist(err)
        res.status.should.equal(200)
        done()
      })
  })

  it('set Latitude without limit', (done) => {
    server
      .post('/api/setPosition/2')
      .send({
        position:
          [100,
            0]
      })
      .end((err, res) => {
        should.not.exist(err)
        res.status.should.equal(500)
        res.body.error.should.equal('Latitude not between -90 and 90 degrees')
        done()
      })
  })

  it('set Longitude without limit', (done) => {
    server
      .post('/api/setPosition/3')
      .send({
        position:
          [40,
            200]
      })
      .end((err, res) => {
        should.not.exist(err)
        res.status.should.equal(500)
        res.body.error.should.equal('Longitude not between -180 and 180 degrees')
        done()
      })
  })

  it('getPosition from Pi', (done) => {
    server
      .get('/api/getPosition/1')
      .end((err, res) => {
        should.not.exist(err)
        res.status.should.equal(200)
        res.body.should
          .containEql({
            position: [
              -34.232223,
              -23.2323
            ]
          })
        done()
      })
  })

  it('getPosition from not existing Pi', (done) => {
    server
      .get('/api/getPosition/-1')
      .end((err, res) => {
        should.not.exist(err)
        res.status.should.equal(500)
        done()
      })
  })
})
// register test
describe('register', () => {
  let name
  it('register unkown Pi', (done) => {
    server
      .get('/api/register/' + macAddress)
      .end((err, res) => {
        should.not.exist(err)
        res.status.should.equal(201)
        res.body.should.have.property('nodeName')
        res.body.nodeName.should.be.Number()
        name = res.body.nodeName
        done()
      })
  })

  it('register known Pi', (done) => {
    server
      .get('/api/register/' + macAddress)
      .end((err, res) => {
        should.not.exist(err)
        res.status.should.equal(200)
        res.body.should.have.property('nodeName')
        res.body.nodeName.should.be.Number()
        res.body.nodeName.should.equal(name)
        done()
      })
  })

  it('register wrong mac address', (done) => {
    server
      .get('/api/register/' + 1)
      .end((err, res) => {
        should.not.exist(err)
        res.status.should.equal(400)
        res.body.should.have.property('error')
        done()
      })
  })
})

describe('writeData', () => {
  it('write Data', (done) => {
    server
      .post('/api/writeData/' + 1)
      .attach('sensor', 'test/Mobile_Data_Offloading_QS.pdf')
      .end((err, res) => {
        should.not.exist(err)
        res.status.should.equal(200)
        done()
      })
  })
})

describe('postData', () => {
  it('post chunk to backend', (done) => {
    server
      .post('/api/postData/' + 1 + '?format=chunk')
      .send({
        _id: '602402bb832b602575ea91e2',
        files_id: '602402bb832b602575ea91df',
        n: 0,
        data: 'kildjfsgoijdfoijoi3u405983j4ioj398u5jh9nuze9nu032uq94u20joiedfj98802394'
      })
      .end((err, res) => {
        should.not.exist(err)
        res.status.should.equal(200)
        done()
      })
  })

  it('post files to backend', (done) => {
    server
      .post('/api/postData/' + 1 + '?format=chunk')
      .send({
        _id: '602403aa51dd022939c6c2bb',
        length: 91003,
        chunkSize: 261120,
        uploadDate: '2021-02-10T16:02:50.255Z',
        filename: 'Onlinespieleabend.jpg',
        md5: '2702a8965e79031dd9e48d602225d918',
        contentType: 'image/jpeg'
      })
      .end((err, res) => {
        should.not.exist(err)
        res.status.should.equal(200)
        done()
      })
  })
})

describe('getData', () => {
  it('get Data', (done) => {
    server
      .get('/api/getData/1?id=1')
      .end((err, res) => {
        should.not.exist(err)
        res.status.should.equal(200)
        res.body.should.not.equal(null)
        done()
      })
  })

  it('get Data without range', (done) => {
    server
      .get('/api/getData/1')
      .end((err, res) => {
        should.not.exist(err)
        res.status.should.equal(400)
        res.body.error.should.equal('range is missing')
        done()
      })
  })

  it('get Data out of range', (done) => {
    server
      .get('/api/getData/1?id=500')
      .end((err, res) => {
        should.not.exist(err)
        res.status.should.equal(400)
        res.body.error.should.equal('query exceeded range of collection')
        done()
      })
  })
})
