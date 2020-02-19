#!/bin/bash

# Currently this just copies verbatim the src files
# into the build directory.

mkdir -p build
cp -R ./src/* ./build
