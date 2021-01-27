const supertest = require("supertest");
const should = require("should");
const server = supertest.agent("http://localhost:8001");

function createMacAdress() {
    return  (Math.round(Math.random() * (99 - 10 + 1) + 10)) +
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
console.log(macAddress);

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