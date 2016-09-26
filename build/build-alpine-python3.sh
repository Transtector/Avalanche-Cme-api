#!/bin/bash

# This script will download source files for Python then configure, make
# and install the binary file in the usual location (/usr/local).  Finally,
# it will create an compressed tar archive of the newly created binary
# such that it can easily be distributed to another machine.

# This script meant to be run on a preconfigured docker container that
# has the necessary tools for building the binary.  To retrieve the
# newly created archive from the host machine, make sure to create an
# appropriate volume mapped to the location where this script will run
# (typically /root).

# The version of Python to build
PYVER=3.5.1

# Download and extract Python source
wget -qO- https://www.python.org/ftp/python/$PYVER/Python-$PYVER.tar.xz | tar --xz -xv

# Configure, make, then install; remove source to clean up
cd Python-$PYVER
./configure --enable-shared --prefix=/usr/local
make
make install
cd ..
rm -rf Python-$PYVER

# Create a symlink to the new python binary from a generic 'python' name
ln -sf /usr/local/bin/python3.5 /usr/local/bin/python

# Tar up the binary to /build (host-bound volume)
tar cvzf python-$PYVER-binary-dist.tgz /usr/local/*
