#!/bin/bash
systemctl daemon-reload

systemctl enable dtnd.service
systemctl start dtnd.service

systemctl enable mongod.service
systemctl start mongod.service

systemctl enable offloading.service
systemctl start offloading.service