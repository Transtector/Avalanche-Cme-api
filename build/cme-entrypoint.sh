#!/bin/sh
set -e

if [ "$1" = 'cme' ]; then
	exec "$@"
fi

exec "$@"