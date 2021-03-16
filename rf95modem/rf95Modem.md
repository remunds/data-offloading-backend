[table]: https://wiki.dragino.com/images/e/e1/Lora_hat_wiring.png
[dragino]: http://wiki.dragino.com/images/0/07/Hatpin.png
[raspberry_gpiopins]: https://www.raspberrypi.org/documentation/usage/gpio/images/GPIO-Pinout-Diagram-2.png

# rf95Modem
## Was ist das rf95 Modem?
Dragino GPS/LoRa Hat (1)
![alt text][dragino] \
Das rf95 Modem ist die Hardware Schnittstelle für LoRa. Dieses sorgt dafür, dass Daten richtig für den Transfer über LoRa vorbereitet werden und gemäß dem Protokoll verschickt werden. Die Schnittstelle zwischen Raspberry Pi und Dragino GPS/LoRa ist zur Zeit nicht hergestellt. Wir brauchen diese, um Daten letztendlich über LoRa verschicken zu können.

## [ dtn7 / rf95modem-go](https://github.com/dtn7/rf95modem-go/blob/master/rf95/modem.go)
## Was ist schon implementiert?

> "Innerhalb des BBCs stellt das Modem-Interface eine Schnittstelle zum
> Senden und Empfangen zur Verfügung. Diese wird aktuell vom Rf95Modem
> erweitert, welches, [...] , mit einem rf95modem
> über eine serielle Schnittstelle interagiert."
> Alvar Penning

Das dtn7 / rf95modem ist zur Zeit alleine über eine externe USB Schnittstelle integriert, um ein LoRa Modem mittels ESP32 anzusteuern:
#### [dtn7-go/pkg/cla/bbc/bbc.go](https://github.com/dtn7/dtn7-go/blob/34d1e3b5800a97993aa874cd9f79c0b7ee76fbd6/pkg/cla/bbc/bbc.go)

```go
switch uri.Host {
	case "rf95modem": 
	// NewRf95Modem creates a new Rf95Modem using a serial connection to the given device, e.g., /dev/ttyUSB0.
	rf95M, rf95Err := NewRf95Modem(uri.Path)
	[...]
		
    default:
    		err = fmt.Errorf("unknown host type %s", uri.Host)
    		return
}
```
Zeile 37 bis 85

Hier sieht man, dass nur die USB Schnittstelle implementiert ist.

## Was muss gemacht werden?
In [dtn7-go/pkg/cla/bbc/bbc.go](https://github.com/dtn7/dtn7-go/blob/34d1e3b5800a97993aa874cd9f79c0b7ee76fbd6/pkg/cla/bbc/bbc.go) müsste man ein neues Modem z.B. "rf95modem_dragiono" oder "rf95modem_gpio" einfügen. Dort müsste man eine neue Klasse bezüglich des neuen Modems implementieren, ähnlich zu [dtn7-go/pkg/cla/bbc/modem_rf95.go](https://github.com/dtn7/dtn7-go/blob/master/pkg/cla/bbc/modem_rf95.go#L22), dazu müssten auch Teile des [rf95modem-go](https://github.com/dtn7/rf95modem-go) neu geschrieben werden, dazu aber im Abschnitt "Was muss programmiert werden?". Diese müsste dann über die GPIO Pins mit dem LoRa Hat kommunizieren. 

### GPIO Pins

GPIO Pin steht für "Generell Purpose Input/Out" Pin und ist für die Kommunikation mit zusätzlicher Hardware da. Diese müssen genutzt werden, um mit dem Dragino GPS/LoRa Hat zu kommunizieren. Dabei stellt sich die Frage, welche GPIO Pins für das rf95Modem vorgesehen sind und wie man diese programmieren kann. 

Die beiden Tabellen geben einen Überblick über die Verteilung der GPIO Pins für den Dragino GPS/Hat und den Raspberry Pi.

GPIO Pinverteilung vom Dragino GPS/LoRa Hat (2)
![alt text][table] 

![alt text][raspberry_gpiopins] GPIO Pinverteilung des Raspberry Pis (3)

Nach (2) zu urteilen, sind GPIO Pin 15 für transmitting und GPIO Pin 16 für recieving Data vorgesehen.
Dennoch sieht man, dass in (3) GPIO Pin 14 für transmitting und GPIO Pin 15 für recieving Data mittels UART vorgesehen ist. Zudem ist GPIO Pin 16 am anderen Ende, somit eher unwahrscheinlich, dass diese für die Übertragung der Daten genutzt werden.

Aufschluss gibt uns, wenn man jedoch (1) über (3) legt. Dann fällt auf, dass GPIO Pin 15 mit TXD und GPIO Pin 16 mit RXD übereinstimmt. So müsste das neue "rf95modem_dragiono" über GPIO Pin 14 zu sendene Daten und über GPIO Pin 15 zu empfangende Daten übertragen.

Um die Signale der Pins zu setzten, könnte man die [go-rpio](https://github.com/stianeikeland/go-rpio) Library benutzen. Die Dokumentation verrät uns, die man die Bits der Pins setzt.

### Was muss programmiert werden?

Wie wir im Abschnitt "Was ist schon implementiert" schon gesehen haben, wird  `NewRf95Modem` aufgerufen. Das instanziiert ein neues rf95Modem

```go
// NewRf95Modem creates a new Rf95Modem using a serial connection to the given device, e.g., /dev/ttyUSB0.
func NewRf95Modem(device string) (rfModem *Rf95Modem, err error) {
	if m, mErr := rf95.OpenSerial(device); mErr != nil {
		err = mErr
	} else {
		rfModem = &Rf95Modem{
			device: device,
			modem:  m,
		}
	}

	return
}
```

https://github.com/dtn7/dtn7-go/blob/master/pkg/cla/bbc/modem_rf95.go#L22

Wichtig zu verstehen ist, dass in [dtn7-go](https://github.com/dtn7/dtn7-go/blob/master/pkg/cla/bbc/modem_rf95.go#L22) ein rf95modem implementiert, dass auf das Repository [rf95modem-go](https://github.com/dtn7/rf95modem-go) zugreift. Teile aus dieser Library kann man wiederverwenden. Diese schreibt mithilfe einer weiteren Library [serial](https://github.com/tarm/serial), mittels eines Byte Streams Daten an die USB Schnittstelle.

```go
// OpenSerial creates a new Modem from a serial connection to a rf95modem. The device parameter might be
// /dev/ttyUSB0, or your operating system's equivalent.

func OpenSerial(device string) (modem *Modem, err error) {
	serialConf := &serial.Config{
		Name:        device,
		Baud:        115200,
		ReadTimeout: time.Second,
	}
	
	serialPort, serialPortErr := serial.OpenPort(serialConf)
	if serialPortErr != nil {
		err = serialPortErr
		return
	}

return OpenModem(serialPort, serialPort, serialPort)
}
```
https://github.com/dtn7/rf95modem-go/blob/master/rf95/modem.go#L53

Zum Ende hin wird das zugrunde liegend Modem instanziiert.  Dieses besitzt ein `io.Reader`, `io.Writer` und `io.Closer`. Der serialPort ist dabei die IO Schnittstelle, die von [serial](https://github.com/tarm/serial) zur Verfügung gestellt wird. Ab diesem Moment reicht [serial](https://github.com/tarm/serial) den Write Input an die USB Schnittstelle.


```go
// OpenModem creates a new Modem, connected to a Reader and a Writer. The Closer might be nil.
func OpenModem(r io.Reader, w io.Writer, c io.Closer) (modem *Modem, err error) {
	modem = &Modem{
		devReader: r,
		devWriter: w,
		devCloser: c,
		readBuff:  new(bytes.Buffer),
		msgQueue:  make(chan string, 128),
		stopSyn:   make(chan struct{}),
		stopAck:   make(chan struct{}),
	}
    
	[...]
	return
}
```

https://github.com/dtn7/rf95modem-go/blob/master/rf95/modem.go#L36

Hier zum Beispiel wird der `io.Writer` (devWriter) dazu benutzt, um den Stream zum rf95Modem zu übertragen.

```go
// sendCmdMultiline sends an AT command to the rf95modem and reads the amount of requested responding lines.
func (modem *Modem) sendCmdMultiline(cmd string, respLines int) (responses []string, err error) {
	[...]

	select {
	[...]

	default:
		if _, writeErr := modem.devWriter.Write([]byte(cmd)); writeErr != nil {
			err = writeErr
			return
		}

		[...]
	}

	return
}
```

https://github.com/dtn7/rf95modem-go/blob/master/rf95/tx.go#L7

An dieser Stelle bzw. seid Erstellung des Modems müsste anstatt des `io.Writer` ein Handler sein, der die Daten an über die GPIO Pins weiter gibt. Dies könnte man als weitere Klasse modellieren.

Zum Empfangen werden von `handleRead` nebenläufig abgearbeitet. Auch hier muss im Modem der `devReader` durch einen `io.Reader` ersetzt werden, der die GPIO Pins ansprechen kann.

```go
// handleRead dispatches the inbounding data to the rxQueue for received messages and msgQueue for everything else.
func (modem *Modem) handleRead() {
	var reader = bufio.NewReader(modem.devReader)
	for {
		select {
		case <-modem.stopSyn:
			close(modem.stopAck)
			return

		default:
			lineMsg, lineErr := reader.ReadString('\n')
			if lineErr == io.EOF {
				continue
			} else if lineErr != nil {
				return
			}

			if strings.HasPrefix(lineMsg, "+RX") {
				if rxMsg, rxErr := parsePacketRx(lineMsg); rxErr == nil {
					for _, h := range modem.rxHandlers {
						h(rxMsg)
					}
				}
			} else {
				modem.msgQueue <- lineMsg
			}
		}
	}
}
```

https://github.com/dtn7/rf95modem-go/blob/master/rf95/modem.go#L72



## Weitere Schwierigkeiten

Hier thematisiere ich weitere Schwierigkeiten, auf die ich gestoßen bin:

1. Byte to Bit in go
   Ich habe keine Möglichkeit gefunden nativ Byte Stream in Bit Stream zu konvertieren. Das ist vonnöten, da die [go-rpio](https://github.com/stianeikeland/go-rpio) Library nur Bits setzen kann.

2. Clock Speed
   Man müsste (schätzungsweise) den Takt zwischen GPIO Pins und rf95Modem synchronisieren. (Möglichweise über den GPIO Pin 11).

3. Baud & MTU
   Man muss einen Wert über die Datenübertragungsrate und Übertragungseinheit setzen können.
4. Frequency
   Man muss eine Frequenz setzen können.

# Zusammenfassung

Ich konnte `io.Reader`, `io.Writer` und `io.Closer` als zu ersetzende Objekte identifizieren. Diese müssten so ersetzt werden, dass sie ihre Daten als Bit Stream mit Berücksichtigung des Takts, Baud, MTU und Frequenz zum rf95Modem übertragen. Dazu muss insbesondere die Klasse [Modem](https://github.com/dtn7/rf95modem-go/blob/master/rf95/modem.go), [RX](https://github.com/dtn7/rf95modem-go/blob/master/rf95/rx.go) und [TX](https://github.com/dtn7/rf95modem-go/blob/master/rf95/tx.go) abgeändert werden und auf die GPIO Pins abgepasst.