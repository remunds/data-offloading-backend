#!/bin/bash
systemctl daemon-reload
systemctl start dtnd.service
systemctl start mongod.service
systemctl start offloading.service