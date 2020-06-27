# middleengine-website

Middle Engine Software Web Site

## Prerequisites

The following software needs to be installed on your development computer:

- Docker

You also need an account at Docker Hub. This is the service that will build the deployed Docker images.

## Local development

Run two console windows:

1. One building the Web site on file changes, via the command `npm run watch`.
2. One serving the built Web site, via the command `npm run serve`.

You should be able to view the site via the URL `http://127.0.0.1:8001`.

## Deployment

The deployed Web site is an `nginx` Docker image to which is added the Web site files and the required `nginx` configuration files to serve it. The following files and directories play a part in creating this Docker image:

- `.dockerignore` is to prevent problematic or irrelevant files being included in the final Docker image.
- `src` - the directory containing the raw Web site files.
- `build.js` - a script for turning the raw Web site files in `src` into the site's static HTML, CSS, JS and image files that get output to the temporary `build` directory.
- `nginx` - contains the configuration files for running the Web site using `nginx`.
- `Dockerfile` - builds the Web site image file, which includes invoking the `build.sh` file and copying into the image the resulting Web site files in the `build` directory.
- `docker-compose.test.yml` - invoked automatically by Docker Hub to test each Web site Docker image file that it builds.
- `test.sh` - the test script that is invoked by the `docker-compose.test.yml` file.

### The Nginx configuration files

The Docker image is to be run on TCP port 80 only. It is assumed that this image will be accessed via an SSL-terminating reverse proxy server.

The configuration file `nginx.conf` is a basic `nginx` server configuration. Support for `gzip` is enabled.

The configuration file `conf.d/default.conf` is the configuration for the Web site.

### The Docker image

#### Files

The created Docker image includes the following files and directories:

- `/usr/share/nginx/html`, which contains the Web site files.
- `/etc/nginx`, which contains the nginx configuration files.
- `/app/test.sh`, which is the image test script.

### Building the Docker image

The image is build automatically by Docker Hub when a commit is pushed to this repository's `master` branch. If the build succeeds and the test script in the resulting image executes successfully then the image is added to Docker Hub with a tag of `latest`.

#### Building and running locally

If you want to test building and running the image locally, then run the following commands from the project root:

1. `docker build --tag middleengine-website:latest --file Dockerfile .` to builds the image.
2. `docker run --name middleengine-website-instance --publish 80:80 --rm --detach middleengine-website` to run the image in Docker.

You can access the Web site via the URL `http://localhost/`.

## Services used

- [Favicon Converter](https://favicon.io/favicon-converter/) for favicon generation.
- [DrLinkCheck](https://www.drlinkcheck.com/) for checking for broken links.
- [SVGOMG](https://jakearchibald.github.io/svgomg/) for SVG optimisation.
- [TinyJPG](https://tinyjpg.com/) for JPG optimisation.
- [Uptime Robot](https://uptimerobot.com/) for site monitoring.
- [Pexels](https://www.pexels.com/) for images.

## File versioning

Image files are versioned by appending a `vN` style suffix to the image file name, and manually incrementing the number `N` when the image is updated.

JavaScript and CSS files are versioned automatically by the build script. A hash value is generated from the file content and appended to the file name.

The result of this versioning is that all of these files can have a very long cache control TTL value.
