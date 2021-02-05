#!/bin/bash
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color
CONFIGURATIONTOML=~/dtn7-go/cmd/dtnd/configuration.toml

BACKEND='127.0.0.1:8000'

#DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

goLang='https://golang.org/dl/go1.15.6.linux-arm64.tar.gz'

echo "first time? (y, n)"
read answer
if [ $answer == "y" ] || [ $answer == "yes" ];
then
	#update
	sudo apt-get update
	sudo apt-get dist-upgrade
	sudo raspi-config nonint do_wifi_country "DE"
	echo 'export PATH=$PATH:~/go/bin' >> ~/.bashrc 
	echo "ready to reboot? You need to execute the setup script a second time. Press enter to continue or ctrl c to abort"
	read
	echo "until soon :)"
	sudo reboot
fi

#install go lang
if command -v go &> /dev/null
then
	echo -e "${GREEN}go lang installed ${NC}"
	echo -e "${NC}version: $(go version)${NC}"

else
	echo -e "${RED}go lang not found${NC}"
	echo -e "${GREEN}try to install go lang ${NC}"
	wget $goLang
	mkdir ~/go
	tar -C ~/ -xzf go1.15.6.linux-arm64.tar.gz
	rm go1.15.6.linux-arm64.tar.gz
	echo '' >> ~/.bashrc
	echo '#go' >> ~/.bashrc 
	#echo 'export PATH=$PATH:~/go/bin' >> ~/.bashrc 
	source ~/.bashrc
	if command -v go &> /dev/null
	then
		echo -e "${GREEN}successfully installed go lang ${NC}"
	else
		echo -e "${RED}did not find go lang, maybe you have to source the .bashrc${NC}"
	fi
fi
source ~/.bashrc
#install dtn7
if command -v go &> /dev/null
then
	#ich denke dass das nicht reicht damit dass der merkt, dass es installiert ist, wird auch ein fehler geworfen
	if command -v dtn &> /dev/nukk #funktioniert nicht
	then
		echo -e "${GREEN}dtn already installed${NC}"
	else
		echo -e "${RED}dtn not installed${NC}"
		echo -e "${GREEN}installing dtn${NC}"
		cd /usr/local
		git clone https://github.com/dtn7/dtn7-go.git ~/dtn7-go
		cd ~/dtn7-go
		#go build ./cmd/dtn-tool
		go build ./cmd/dtnd
		echo 'export PATH=$PATH:~/dtn7-go/' >> ~/.bashrc 
		source ~/.bashrc
		sudo mv dtnd.service /lib/systemd/system/
		echo -e "${GREEN}dtn successfully installed${NC}"
	fi
else
	echo -e "${RED}dtn could not be installed, because go is not installed${NC}"
fi

#install nodejs
if command -v node &> /dev/null
then
	echo -e "${GREEN}node version ${NC}"	
	echo -e "${NC}version: $(node -v)${NC}"
else
	echo -e "${RED}nodejs is not installed${NC}"
	echo -e "${GREEN}installing nodejs${NC}"
	curl -sL https://deb.nodesource.com/setup_15.x | sudo -E bash -
	sudo apt-get install -y nodejs
	npm install /home/pi/data-offloading-backend
	sudo mv offloading.service /lib/systemd/system/
fi

#install mongodb
if command -v mongo &> /dev/null
then
	echo -e "${GREEN}mongodb found${NC}"
	#echo -e "${NC}version: $(mongo --version)${NC}"
	#check if server is already started
	# echo -e "${NC} starting mongodb ${NC}"
	# if true
	# then
	# 	systemctl start mongod.service
	# fi
else
	echo -e "${RED}mongodb not found${NC}"
	echo -e "${GREEN}try to install mongodb ${NC}"
	wget -qO - https://www.mongodb.org/static/pgp/server-4.2.asc | sudo apt-key add -
	echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu bionic/mongodb-org/4.2 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.2.list
	sudo apt-get update
	sudo apt-get install mongodb-org
	if command -v mongo &> /dev/null
	then
		echo -e "${GREEN}successfully installed mongodb ${NC}"
		#echo -e "${GREEN} starting mongodb ${NC}"
		#sudo systemctl enable mongod.service
		#sudo systemctl start mongod.service
	else
		echo -e "${RED}failed to install mongodb ${NC}"
	fi
fi

echo -e "${NC}install jq ${NC}"
sudo apt install jq

#sensorbox
if [ $(jq '.configuration' /home/pi/data-offloading-backend/config_default.json) == 0 ];
then
	#register at backend
	echo -e "${GREEN}register at backend ${GREEN}"
	MAC=$(ip a  | awk '/link\/ether/ {print $2}')
	BACKEND=cat config.json | jq '.backendIp'
	BACKEND=$BACKEND: cat config.json | jq '.backendPort' 
	NAME=""
	URL=$(echo $BACKEND'/api/register/'$MAC)
	NAME=$(curl $URL | jq .nodeName)
	echo boxname: $NAME

	jq ".nodeName |= $NAME" /home/pi/data-offloading-backend/config_default.json  > /home/pi/data-offloading-backend/config.json
	ORG='node-id = "dtn:\/\/node-name\/"'
	TEMPLATE='node-id = "dtn:\/\/'$NAME'\/"'
	sed -i "s/$ORG/$TEMPLATE/" $CONFIGURATIONTOML

	#install raspap-webgui
	echo -e "${NC}install raspap-webgui${NC}"
	curl -sL https://install.raspap.com | bash
fi

#backend
if [ $(jq '.configuration' /home/pi/data-offloading-backend/config_default.json) == 1 ];
then
	ORG='node-id = "dtn:\/\/node-name\/"'
	TEMPLATE='node-id = "dtn:\/\/0\/"'
	sed -i "s/$ORG/$TEMPLATE/" $CONFIGURATIONTOML
	jq ".nodeName |= 0" /home/pi/data-offloading-backend/config_default.json  > /home/pi/data-offloading-backend/config.json
fi