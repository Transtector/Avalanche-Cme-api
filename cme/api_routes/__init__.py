# api routes

from flask import Blueprint, Response, request, json, send_from_directory
from werkzeug import secure_filename

from .. import app, settings
from ..util import UriParse

# the api router is a Flask 'Blueprint'
router = Blueprint('apiroutes', __name__)

# make routes available
from . import (login, logout, user, channels, status, config, 
			   general, temperature, clock, http, network, snmp)
