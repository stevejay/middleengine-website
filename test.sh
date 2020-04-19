#!/bin/bash

if [ ! -f /usr/share/nginx/html/css/highlight-*.css ]; then
  echo "/usr/share/nginx/html/css/highlight-*.css file not found!"
  exit 1
fi

if [ ! -f /usr/share/nginx/html/css/normalize-*.css ]; then
  echo "/usr/share/nginx/html/css/normalize-*.css file not found!"
  exit 1
fi

if [ ! -f /usr/share/nginx/html/css/site-*.css ]; then
  echo "/usr/share/nginx/html/css/site-*.css file not found!"
  exit 1
fi

if [ ! -f /usr/share/nginx/html/js/turbolinks-*.js ]; then
  echo "/usr/share/nginx/html/js/turbolinks-*.js file not found!"
  exit 1
fi

if [ ! -f /usr/share/nginx/html/js/cookie-banner-*.js ]; then
  echo "/usr/share/nginx/html/js/cookie-banner-*.js file not found!"
  exit 1
fi

filelist="\
  /usr/share/nginx/html/images/logo-v1.svg
  /usr/share/nginx/html/index.html \
  /usr/share/nginx/html/blog.html \
  /usr/share/nginx/html/blog/posts/2019/11/10/tips-for-using-styled-components.html \
  /usr/share/nginx/html/legal.html \
  /usr/share/nginx/html/privacy.html \
  /usr/share/nginx/html/favicon.ico \
  /usr/share/nginx/html/site.webmanifest \
  /usr/share/nginx/html/robots.txt \
  /etc/nginx/nginx.conf \
  /etc/nginx/conf.d/default.conf";

for f in ${filelist}; 
do
  if [ ! -f ${f} ]; then
    echo "${f} file not found!"
    exit 1
  fi
done;
