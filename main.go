package main

import (
	"github.com/remunds/data-offloading-backend/server"
)

func main() {
	server.ConnectToDB("192.168.0.102:27017")
	server.SetupServer()
}
