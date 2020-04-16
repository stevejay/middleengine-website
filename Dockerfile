# ----- Stage 1: build the Web site pages ----- 

# Use a node docker image:
FROM node:13.12.0-stretch AS src-build

COPY package.json package-lock.json /tmp/
RUN cd /tmp && npm ci
RUN mkdir -p /app && cp -a /tmp/node_modules /app/

WORKDIR /app
# Copy all non- docker-ignored files to the container:
COPY . .
# Build the Web pages into the directory './build':
RUN node ./build.js

# ----- Stage 2: create the final nginx docker image ----- 

FROM nginx:latest
# Copy the built Web pages into it:
COPY --from=src-build /app/build /usr/share/nginx/html
# Copy the nginx config files:
COPY nginx /etc/nginx
COPY ./test.sh ./test.sh
# Make the test file executable:
RUN chmod +x ./test.sh
EXPOSE 80/tcp
