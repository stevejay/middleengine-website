# ----- Stage 1: build the Web site pages ----- 

# Use a node docker image:
FROM node:13.12.0-stretch AS src-build

# Make the necessary Unsplash API variables available to the build script.

ARG UNSPLASH_APP_NAME
ARG UNSPLASH_APP_ACCESS_KEY
ARG UNSPLASH_APP_SECRET_KEY

ENV UNSPLASH_APP_NAME $UNSPLASH_APP_NAME
ENV UNSPLASH_APP_ACCESS_KEY $UNSPLASH_APP_ACCESS_KEY
ENV UNSPLASH_APP_SECRET_KEY $UNSPLASH_APP_SECRET_KEY

# Copy just the files required to install the required node modules.
COPY package.json package-lock.json /tmp/
RUN cd /tmp && npm ci
RUN mkdir -p /app && cp -a /tmp/node_modules /app/

WORKDIR /app

# Copy all non- docker-ignored files to the container
# (which excludes node_modules):
COPY . .

# Build the Web pages into the directory './build':
RUN node ./build.js

# ----- Stage 2: create the final nginx docker image ----- 

FROM nginx:1.17.10

# Copy the built Web pages into it:
COPY --from=src-build /app/build /usr/share/nginx/html

# Copy the nginx config files:
COPY nginx /etc/nginx

# Copy the image test script...
COPY ./test.sh ./test.sh
# ... and make it executable:
RUN chmod +x ./test.sh

EXPOSE 80/tcp
