# ----- Stage 1: build the Web site pages ----- 

# Use a node docker image:
FROM node:13 AS src-build
WORKDIR /app
# Copy all non- docker-ignored files to the container:
COPY . .
# Build the Web site's web pages into the temporary directory './build':
RUN sh ./build.sh

# ----- Stage 2: create the final nginx docker image ----- 

FROM nginx:latest
# Copy the built web pages into it:
COPY --from=src-build /app/build /usr/share/nginx/html
# Copy the nginx config files:
COPY nginx /etc/nginx
COPY ./test.sh ./test.sh
# Make the test file executable:
RUN chmod +x ./test.sh
EXPOSE 80/tcp
