package server

import (
	"context"
	"fmt"
	"log"

	//"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var Client *mongo.Client

//ConnectToDB connects to MongoDB with the given ip address
func ConnectToDB(ip string) {
	// Set client options
	clientOptions := options.Client().ApplyURI("mongodb://" + ip)

	// Connect to MongoDB
	fmt.Println("Connecting to DB")
	client, e := mongo.Connect(context.TODO(), clientOptions)
	checkError(e, "")

	// Check the connection
	e = client.Ping(context.TODO(), nil)
	Client = client
	checkError(e, "Successfully connected to DB")
}

//Insert inserts one document in given DB in given collection
//returns HTTPstatusCode and HTTPstatusMessage
func Insert(database string, collection string, document Test_struct) (int, []byte) {
	insertResult, err := Client.Database(database).Collection(collection).InsertOne(context.TODO(), document)
	if err != nil {
		log.Fatal(err)
		return 500, []byte("500 - Something went wrong")
	}

	fmt.Println("Inserted:", insertResult.InsertedID)
	return 201, []byte("201 - record created")
}

func checkError(e error, successMessage string) {
	if e != nil {
		fmt.Println(e)
	} else if successMessage != "" {
		fmt.Println(successMessage)
	}
}
