const supertest = require("supertest");
const should = require("should");
const server = supertest.agent("http://localhost:8001");

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

var macAddress = createMacAdress()
//getPostion test
describe("getPosition", () => {
    it("setPosition from Pi", (done) => {
        server
            .post('/api/setPosition/1')
            .send({
                "position": [
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

    it("setPosition from Pi out of boundary", (done) => {
        server
            .post('/api/setPosition/1')
            .send({
                "position": [
                    -180.232223,
                    -23.2323
                ]
            })
            .end((err, res) => {
                should.not.exist(err)
                res.status.should.equal(500)
                done()
            })
    })

    it("getPosition from Pi", (done) => {
        server
            .get('/api/getPosition/1')
            .end((err, res) => {
                should.not.exist(err)
                res.status.should.equal(200)
                res.body.should
                    .containEql({
                        "position": [
                            -34.232223,
                            -23.2323
                        ]
                    })
                done()
            })
    })

    it("getPosition from not existing Pi", (done) => {
        server
            .get('/api/getPosition/-1')
            .end((err, res) => {
                should.not.exist(err)
                res.status.should.equal(500)
                done()
            })
    })
})
//register test
describe("register", () => {
    var name
    it("register unkown Pi", (done) => {
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

    it("register known Pi", (done) => {
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

    it("register wrong mac address", (done) => {
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

describe("postData", () => {
    it("post chunk to backend", (done) => {
        server
            .post('/api/postData/' + 1 + '/format=chunk')
            .send({
                "_id": "602402bb832b602575ea91e2",
                "files_id": "602402bb832b602575ea91df",
                "n": 0,
                "data": "kildjfsgoijdfoijoi3u405983j4ioj398u5jh9nuze9nu032uq94u20joiedfj98802394"
            })
            .end((err, res) => {
                should.not.exist(err)
                res.status.should.equal(200)
                done()
            })
    })

    it("post files to backend", (done) => {
        server
            .post('/api/postData/' + 1 + '/format=chunk')
            .send({
                "_id": "602403aa51dd022939c6c2bb",
                "length": 91003,
                "chunkSize": 261120,
                "uploadDate": "2021-02-10T16:02:50.255Z",
                "filename": "Onlinespieleabend.jpg",
                "md5": "2702a8965e79031dd9e48d602225d918",
                "contentType": "image/jpeg"
            })
            .end((err, res) => {
                should.not.exist(err)
                res.status.should.equal(200)
                done()
            })
    })
})
//nicht fertig
describe("writeData", () => {
    it("")
})

describe("getData", () => {
    it("get Data", (done) => {
        server
            .get('/api/getData/1?id=0')
            .end((err, res) => {
                should.not.exist(err)
                res.status.should.equal(200)
                res.body.should.not.eqaul(null)
                done()
            })
    })
})
//nicht fertig
describe("Position", () => {
    it("set Position within limit", (done) => {
        server
            .post('/api/setPosition/1')
            .send({position: 
                [85,
                 15]
            })
            .end((err, res) => {
                should.not.exist(err)
                res.status.should.equal(200)
                done()
            })
    })

    it("set Latitude without limit", (done) => {
        server
            .post('/api/setPosition/2')
            .send({position: 
                [100,
                 0]
            })
            .end((err, res) => {
                should.not.exist(err)
                res.status.should.equal(500)
                res.body.should.eqaul({ error: 'Latitude not between -90 and 90 degrees' })
                done()
            })
    })

    it("set Longitude without limit", (done) => {
        server
            .post('/api/setPosition/3')
            .send({position: 
                [40,
                 200]
            })
            .end((err, res) => {
                should.not.exist(err)
                res.status.should.equal(500)
                res.body.should.eqaul({ error: 'Longitude not between -180 and 180 degrees' })
                done()
            })
    })

    it("get Position successfully", (done) => {
        server
        .get('/api/getPosition/1')
        .end((err, res) => {
            should.not.exist(err)
            res.status.should.equal(200)
            res.body.should.eqaul({
                position: [
                    85,
                    15
                ]
            })
            done()
        })
    })

    it("get Position with not existing id", (done) => {
        server
        .get('/api/getPosition/2')
        .end((err, res) => {
            should.not.exist(err)
            res.status.should.equal(500)
            res.body.should.eqaul({ error: 'device or position not found' })
            done()
        })
    })
})