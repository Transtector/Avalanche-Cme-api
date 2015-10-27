import os
import subprocess
from flask import Blueprint, request, Response, json, render_template

from cme import app, settings
from .auth import require_auth

# sign the cmeSession token
from itsdangerous import (TimedJSONWebSignatureSerializer
                          as Serializer, BadSignature, SignatureExpired)

import cme.util.UriParse as UriParse

router = Blueprint('apiroutes', __name__)











