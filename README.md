# middleengine-website

Middle Engine Software Web Site

## Prerequisites

The following software needs to be installed on your development computer:

- Docker

You also need an account at Docker Hub. This is the service that will build the deployed Docker images.

## Local development

Run two console windows:

1. Building the Web site on file changes, using the command `npm run watch`.
2. Serving the built Web site, using the command `npm run serve`.

You should now be able to view the site via the URL `http://127.0.0.1:8001`.

## Deployment

The deployed Web site is an `nginx` Docker image to which is added the Web site files and the required `nginx` configuration files to serve it. The following files and directories play a part in creating this Docker image:

- `.dockerignore` is to prevent problematic or irrelevant files being included in the Docker image. It currently assumes a `node` build process.
- `src` - the directory containing the raw Web site files.
- `build.js` - a script for turning the raw Web site files in `src` into the site's static HTML, CSS, JS and image files that get output to a temporary `build` directory.
- `nginx` - contains the configuration files for running the Web site using `nginx`.
- `Dockerfile` - builds the Web site image file, which includes invoking the `build.sh` file and copying into the image the resulting Web site files in the `build` directory.
- `docker-compose.test.yml` - invoked automatically by Docker Hub to test each Web site Docker image file that it builds.
- `test.sh` - the test script that is invoked by the `docker-compose.test.yml` file.

### The Nginx configuration files

The Docker image is to be run on TCP port 80 only. It is assumed that this image will be accessed via an SSL-terminating reverse proxy server.

The configuration file `nginx.conf` is a basic `nginx` server configuration. The `gzip` support is enabled.

The configuration file `conf.d/default.conf` is the configuration for the web site. It is commented.

### The Docker image

#### Files

The files in the created Docker image are located as follows:

- The Web site files - `/usr/share/nginx/html`
- The `nginx` files - `/etc/nginx`
- The test script - `/app/test.sh`

### Building the Docker image

The image is build automatically in Docker Hub when pushing to this repository's `master` branch. If the test script in that resulting image runs successfully then the image is added to Docker Hub with the tag `latest`.

#### Building and running locally

If you want to test building and running the image locally, then run the following commands from the project root:

1. `docker build --tag middleengine-website:latest --file Dockerfile .` (builds the image)
2. `docker run --name middleengine-website-instance --publish 80:80 --rm --detach middleengine-website` (runs the image in Docker)

You should now be able to access the Web site using the URL `http://localhost/`.

## Services used

- For favicon generation: [Favicon Converter](https://favicon.io/favicon-converter/).
- For images: [Unsplash](https://unsplash.com/).
- For broken links: [DrLinkCheck](https://www.drlinkcheck.com/).
- For SVG optimisation: [SVGOMG](https://jakearchibald.github.io/svgomg/).
- For site monitoring: [Uptime Robot](https://uptimerobot.com/).

## File versioning

Image files are versioned simply by appending a `vN` style suffix to the image file name, and incrementing that version number when the image is updated. JavaScript and CSS files are versioned automatically at build time by appending to the file name a hash value generated from the file content. In this way, all these files can have very long cache TTL values.

## TODO

- [Image loading](https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onloadstart)
