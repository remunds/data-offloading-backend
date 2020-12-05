package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

func postChunk(w http.ResponseWriter, r *http.Request) {
	var piID string = mux.Vars(r)["raspberryPiId"]
	var document Test_struct // muss geändert werden
	err := json.NewDecoder(r.Body).Decode(&document)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	statusCode, statusMessage := Insert(piID, "chunk", document)
	w.WriteHeader(statusCode)
	w.Write(statusMessage)
}

func postFile(w http.ResponseWriter, r *http.Request) {
	var piID string = mux.Vars(r)["raspberryPiId"]
	var document Test_struct // muss geändert werden
	err := json.NewDecoder(r.Body).Decode(&document)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	statusCode, statusMessage := Insert(piID, "chunk", document)
	w.WriteHeader(statusCode)
	w.Write(statusMessage)
}

func getData(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(501)
}

func getAllData(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(501)
}

//SetupServer will set up a HTTP Server with given handler functions
func SetupServer() {
	r := mux.NewRouter()

	// Routes consist of a path and a handler function.
	r.HandleFunc("/api/postData/{raspberryPiId}", postChunk).Methods("POST").Queries("format", "chunk").Headers("Content-Type", "application/json")
	r.HandleFunc("/api/postData/{raspberryPiId}", postFile).Methods("POST").Queries("format", "file").Headers("Content-Type", "application/json")
	r.HandleFunc("/api/getData/{raspberryPiId}", getData).Methods("GET").Headers("Content-Type", "application/json")
	r.HandleFunc("/api/getAllData", getAllData).Methods("GET").Headers("Content-Type", "application/json")
	fmt.Println("HTTP Server only")

	// Bind to a port and pass our router in
	log.Fatal(http.ListenAndServe(":8000", r))
}
