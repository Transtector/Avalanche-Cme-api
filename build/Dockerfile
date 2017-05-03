# This docker is used as the Cme-api application layer.
#
# The docker requires the CME_API_BIN.tgz package which
# is built using the cme-api-build docker.
#
# Note:  In order to support calling system commands
# like 'shutdown', 'ntpq', 'reboot', etc, this docker
# requires a script to be running on the docker HOST
# that is listening for these commands.  Generally,
# for a production CME system, this script is launched
# by the Cme-init system and looks something like this:
#
#	$ ~/Cme-init/cme-docker-fifo.sh &
#
# This sets up the input and output FIFO's and listens
# for system call requests coming from the container
# over the input FIFO.
#
# The cme API layer also needs some extra attention
# when running inside a docker container.  These
# command-line switches ensure that the API layer
# has access to required system resources:
#
#	$ docker run \
#		--net=host \
#		--privileged \
#		--name cme-api \
#		--volumes-from cme-web \
#		-v /data:/data \
#		-v /etc/network:/etc/network \
#		-v /etc/ntp.conf:/etc/ntp.conf \
#		-v /etc/localtime:/etc/localtime \
#		-v /tmp/cmehostinput:/tmp/cmehostinput \
#		-v /tmp/cmehostoutput:/tmp/cmehostoutput \
#		-v /media/usb:/media/usb \
#		[<private_docker_registry>:5000/]cmeapi
#

# Uses our cme-base docker image
FROM cme-base

LABEL maintainer "James Brunner <james.brunner@smithsmicrowave.com>"

# Pass the VERSION at docker build (docker build --build-arg version=1.0.0-99)
ARG version

# Add the application binaries - these must have been built for the cme-base docker!
ADD 1500-005-v$version-SWARE-CME_API.docker.tgz .

# Install cme app using pip and built wheels
RUN pip install --no-index -f wheelhouse cmeapi
RUN rm -rf wheelhouse/

CMD ["/bin/bash"]
