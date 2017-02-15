#!/bin/bash

# Run this script to build a Cme (API layer) distribution tarball
# that can be downloaded to a CME device and installed to provide
# the recovery mode operation.

# Read the VERSION file to use in the created archive name
VERSION=$(<VERSION)
ARCHIVE=1510-000-v$VERSION-SWARE-CME_RECOVERY.tgz

# Requires Cme source folder at /root/Cme/
SRC=/root/Cme

# Source files copied to SRCDIST
SRCDIST=/root/srcdist

# System built to DIST
DIST=/root/dist

# Point PIP env paths to wheelhouse
export WHEELHOUSE=${DIST}/wheelhouse
export PIP_WHEEL_DIR=${DIST}/wheelhouse
export PIP_FIND_LINKS=${DIST}/wheelhouse

mkdir ${SRCDIST}
mkdir ${DIST}
mkdir ${WHEELHOUSE}

# Copy source files over to srcdist/
# Note: this is to avoid wheel adding a bunch of files and
# directories that are not needed in the distribution.
pushd ${SRCDIST}
cp -R ${SRC}/cme/ .
cp ${SRC}/VERSION .
cp ${SRC}/setup.py .
cp ${SRC}/MANIFEST.in .

# Activate the Cme venv
source ${SRC}/cme_venv/bin/activate

# Generate the wheels for the application.
# These will show up in WHEELHOUSE
pip wheel .

# Copy the top-level VERSION file
cp ${SRCDIST}/VERSION ${DIST}/VERSION

# Wheels are built - done with srcdist/
popd
rm -rf ${SRCDIST}

# Now generate the archive of the wheels
pushd ${DIST}

tar -czvf ../${ARCHIVE} .

# Done with the built distribution
popd
rm -rf ${DIST}

echo "Done!"
exit 0