# ui routes

from flask import Blueprint, render_template
from ..util.Auth import require_auth
from ..Settings import settings

router = Blueprint('uiroutes', __name__)

# APIError wraps a simple error object
class APIError(object):
	def __init__(self, message):
		self.message = message
		self.status = 500
		self.stack = ''


# UI routes

TITLE = 'CME'

@router.route('/') # default page w/o explicit request
@router.route('/index.html')
def index():
	return render_template('index.html', title=TITLE)


@router.route('/export.html')
def export():
	return render_template('export.html', title=TITLE)


