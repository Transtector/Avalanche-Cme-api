# ui routes

from flask import Blueprint, render_template

from .. import app, settings, require_auth

router = Blueprint('uiroutes', __name__)

# APIError wraps a simple error object
class APIError(object):
	def __init__(self, message):
		self.message = message
		self.status = 500
		self.stack = ''


# UI routes
from . import index