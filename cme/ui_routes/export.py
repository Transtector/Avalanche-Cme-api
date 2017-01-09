
from . import require_auth, settings, router, render_template

@router.route('/')
@router.route('/export')
def export():
	return render_template('export.html', title='Avalanche')
