#!/bin/bash
set -e

# Get the putS3 function
source $HOME/.bashrc

SRC=$(pwd)  # run from project source folder
APP=${SRC##*/}

CME_API_PN=1500-005

# Increment VERSION build number; the '123' in 1.0.0-123
VERSION=$(<${SRC}/VERSION)
IFS='-' read -ra PARTS <<< "${VERSION}"
BUILD_NUMBER=${PARTS[1]}
((BUILD_NUMBER++))
$(echo "${PARTS[0]}-${BUILD_NUMBER}" > ${SRC}/VERSION)
VERSION=$(<${SRC}/VERSION)

BASENAME=${CME_API_PN}-v${VERSION}-SWARE-CME_API

PACKAGE=${BASENAME}.tgz
DOCKER_PKG=${BASENAME}.pkg.tgz
DOCKER_NAME=cmeapi:${VERSION}

# Build base image
build/build.sh 

# Publish base image to S3
cd build
putS3 ${PACKAGE} Cme
cd ..

# Build docker package binaries - add '.docker' suffix
docker run --rm -v ${SRC}:/root/${APP} cme-build /root/${APP}/build/build.sh .docker

# Use docker package binaries and build docker app image
cd build
docker build -t ${DOCKER_NAME} --build-arg version=${VERSION} .

# Save docker image to package
docker save ${DOCKER_NAME} | gzip > ${DOCKER_PKG}
putS3 ${DOCKER_PKG} Cme
cd ../

echo "Done!"
