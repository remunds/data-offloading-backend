#!/bin/bash
CONFIGURATION=1
NAME='1'
ORG='node-id = "dtn:\/\/node-name\/"'
TEMPLATE='node-id = "dtn:\/\/'$NAME'\/"'
CONFIGURATIONTOML=~/dtn7-go/cmd/dtnd/configuration.toml

sed -i "s/$ORG/$TEMPLATE/" $CONFIGURATIONTOML