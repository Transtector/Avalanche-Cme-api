
from . import require_auth, settings, router, render_template

@router.route('/')
@router.route('/index')
def index():
	return render_template('index.html', title='Avalanche')
