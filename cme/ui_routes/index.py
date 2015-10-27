from flask import Blueprint, render_template

router = Blueprint('uiroutes', __name__)

# APIError wraps a simple error object
class APIError(object):
	def __init__(self, message):
		self.message = message
		self.status = 500
		self.stack = ''

@router.route('/')
def index():
	return render_template('index.html', title='Avalanche')

@router.route('/err')
def errors():
	return render_template('error.html', error=APIError('Error'))
