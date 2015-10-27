# api routes

from flask import Blueprint, Response, request, json

from werkzeug import secure_filename

from itsdangerous import (TimedJSONWebSignatureSerializer
                          as Serializer, BadSignature, SignatureExpired)

from cme import app, settings
from cme.util import UriParse

# the api router is a Flask 'Blueprint'
router = Blueprint('apiroutes', __name__)

# make routes available
from . import (login, logout, status, config, device,
			   general, time, http, network, snmp)
