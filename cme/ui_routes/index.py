
from . import app, settings, router, render_template, APIError, require_auth

@router.route('/')
@router.route('/index')
def index():
	return render_template('index.html', title='Avalanche')
