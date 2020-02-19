#!/bin/bash

filelist="\
  /usr/share/nginx/html/index.html \
  /etc/nginx/conf.d/default.conf";

for f in ${filelist}; 
do
  if [ ! -f ${f} ]; then
    echo "${f} file not found!"
    exit 1
  fi
done;
