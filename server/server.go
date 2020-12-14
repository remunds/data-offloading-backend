package server

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

func PostChunk(w http.ResponseWriter, r *http.Request) {
	var piID string = mux.Vars(r)["raspberryPiId"]
	var document Test_struct // has to be changed
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
	var document Test_struct // has to be changed
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
	router := mux.NewRouter()

	// Routes consist of a path and a handler function.
	router.HandleFunc("/api/postData/{raspberryPiId}", PostChunk).Methods("POST").Queries("format", "chunk").Headers("Content-Type", "application/json")
	router.HandleFunc("/api/postData/{raspberryPiId}", postFile).Methods("POST").Queries("format", "file").Headers("Content-Type", "application/json")
	router.HandleFunc("/api/getData/{raspberryPiId}", getData).Methods("GET").Headers("Content-Type", "application/json")
	router.HandleFunc("/api/getAllData", getAllData).Methods("GET").Headers("Content-Type", "application/json")

	// Bind to a port and pass our router in
	log.Fatal(http.ListenAndServe(":8000", router))
}
