# middleengine-website

Middle Engine Software Web Site

## Prerequisites

The following software needs to be installed on your development computer:

- Docker

You also need an account at Docker Hub. This is the service that will build the deployed Docker images.

## Local development

To run the site locally with auto reloading on changes, run the command `npm run watch`. The port used is automatically assigned and a message appears to tell you what URL to use to access the site. Generally this will be `http://localhost:3000`.

## Deployment

The deployed Web site is an `nginx` Docker image to which is added the Web site files and the required `nginx` configuration files to serve it. The following files and directories play a part in creating this Docker image:

- `.dockerignore` is to prevent problematic or irrelevant files being included in the final Docker image.
- `src` - the directory containing the raw Web site files.
- `build.js` - an ESM module script for turning the raw Web site files in `src` into the site's static HTML, CSS, JS and image files that get output to the temporary `build` directory.
- `nginx` - contains the configuration files for running the Web site using `nginx`.
- `Dockerfile` - builds the Web site image file, which includes invoking the `build.sh` file and copying into the image the resulting Web site files in the `build` directory.
- `docker-compose.test.yml` - invoked automatically by Docker Hub to test each Web site Docker image file that it builds.
- `test.sh` - the test script that is invoked by the `docker-compose.test.yml` file.

### The Nginx configuration files

The Docker image is to be run on TCP port 80 only. It is assumed that this image will be accessed via an SSL-terminating reverse proxy server.

The configuration file `nginx.conf` is a basic `nginx` server configuration. Support for `gzip` is enabled.

The configuration file `conf.d/default.conf` is the configuration for the Web site.

## Changing file permissions

```bash
ls -l
xattr -c flow-chart-1-2x.png
chmod 644 flow-chart-1-2x.png
```

### The Docker image

#### Files

The created Docker image includes the following files and directories:

- `/usr/share/nginx/html`, which contains the Web site files.
- `/etc/nginx`, which contains the nginx configuration files.
- `/app/test.sh`, which is the image test script.

### Building the Docker image

The image currently needs to be manually built locally and then pushed to Docker Hub. The image is built and pushed with a tag of `latest`.

First log in to Docker:

```bash
docker login -u middleengine
[enter your password]
```

Then build and push the image:

```bash
docker build --platform linux/amd64 --tag middleengine/website:latest --file Dockerfile .
docker push middleengine/website:latest
```

#### Building and running locally

If you want to test building and running the image locally, then run the following command from the project root: `docker-compose up --force-recreate --build --detach`. You should now be able to access the Web site at `http://localhost:3009/`.

## Services used

- [Octomments](https://github.com/krasimir/octomments) to allow GitHub Issues to be used for blog post comments.
- [Excalidraw](https://excalidraw.com/) for the hand-drawn images.
- [Favicon Converter](https://favicon.io/favicon-converter/) for favicon generation.
- [DrLinkCheck](https://www.drlinkcheck.com/) for checking for broken links.
- [SVGOMG](https://jakearchibald.github.io/svgomg/) for SVG optimisation.
- [TinyJPG](https://tinyjpg.com/) for JPG optimisation.
- [Uptime Robot](https://uptimerobot.com/) for site monitoring.
- [Pexels](https://www.pexels.com/) for images.
- [GIF maker](https://gifmaker.me/).
- [GIF cropper](https://ezgif.com/crop).
- [Hemingway App](http://www.hemingwayapp.com/)
- [Gov.UK advice for writing plain English](https://www.gov.uk/guidance/content-design/writing-for-gov-uk).
- [Carbon source code images](https://carbon.now.sh/)

## File versioning

Image files are versioned manually. I simply add a `vN`-type suffix to the image file name when necessary, and manually increment the number `N` when the image is updated.

JavaScript and CSS files are versioned automatically by the build script if they are in the `src/static` directory and have include the path part `.HASH` just before the file extension, e.g., `src/static/css/site.HASH.css`. A hash value is generated from the file content and it replaces the `HASH` part of the file name.

The result is that all of these files (images, JavaScript and CSS) can have very long cache control TTL values.
