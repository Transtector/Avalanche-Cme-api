Cme-api
==============

Core monitoring engine (CME) API package.  This package is used to provide the http-based API layer
for the CME system.

Runs under Python version: 3.5+.

You can use the package stand-alone after installation, or you can run it as a deployed
package on end-use CME hardware.  Instructions for both are below.

Look in `requirements.txt` to find the dependent packages. 

Stand-Alone Development
-----------------------

**Prerequisites**

* Python 3.5+

Clone the Cme-api project repository to a development machine.  Generally this package should run
on nearly any machine with Python 3.5 installed.

```bash
root@cme-dev[~:501] $ git clone git@cuscsgit01.smiths.net:Avalanche/Cme-api.git
```

Create a virtual environment for the package.  Generally you can keep this within the
same folder as the top-level project.  Activate the virtual environment afterwards.

```bash
root@cme-dev[~/Cme-api:502] $ python -m venv cmeapi_venv
root@cme-dev[~/Cme-api:503] $ source cmeapi_venv/bin/activate
```

Install the `wheel` package and the dependent packages.

```bash
(cmeapi_venv)root@cme-dev[~/Cme-api:504] $ pip install wheel
(cmeapi_venv)root@cme-dev[~/Cme-api:505] $ pip install -r requirements.txt
```

Run the package.

```bash
(cmeapi_venv)root@cme-dev[~/Cme-api:506] $ python -m cmeapi
```


Building Releases
------------------

There are several steps to building a release of the project that can be used for
either the Cme device base image (i.e., the so-called "recovery" API layer) or for the
application layer.

It is best if you've got a machine with the same architecture as a Cme device 
set up to perform the release builds, although of course you can also emulate the
build machine architecture using docker and tools like Qemu.

To package the application source code into a compressed tarball, use the `build\cme-api-build.sh` script.

The newly created archive (`.tgz`) file can then be uploaded to AWS S3 (or elsewhere) for
distribution.  The archive is also used to create the Docker images that are also uploaded to
AWS and used for the application layers (and their updates).

To build the Cme-api Docker image, use the cme-api-build.docker and the cme-api.docker to:

1. build the source files into a binary distribution
2. build a docker image from the binary source distribution
3. save the docker image to AWS S3 for distribution


### Step 1.  Build the Binary Distribution


```bash
root@cme-dev[~/Cme-api:507] $ docker run --rm -v $(pwd):/app cme-api-build
```

After running the command above (note that it runs in the project root folder), there will be a binary
package, `CME_API_BIN.tgz`, in the `~/Cme-api/build/` directory.  This package is
then used to build the Cme-api docker.

### Step 2.  Build the Application Docker

```bash
root@cme-dev[~/Cme-api:508] $ cd build
root@cme-dev[~/Cme-api/build:509] $ docker build -t cmeapi -f cme-api.docker .
```

Now there's a docker image of the Cme-api layer on the local machine.

### Step 3.  Save the Docker Image

```bash
root@cme-dev[~/Cme-api/build:510] $ docker save cmeapi | gzip > 1500-005-v1.0.0-SWARE-CME_API.pkg.tgz
```

This package can be uploaded to S3 and will be listed as an available package to install
on Cme devices.
