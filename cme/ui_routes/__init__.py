# ui routes

from flask import Blueprint, render_template
from ..util.Auth import require_auth
from ..Settings import settings
from .. import app

router = Blueprint('uiroutes', __name__)

# Custom 404 page
@app.errorhandler(404)
def handle_not_found(error):
	return render_template('404.html', title='Oops - not found'), 404


# UI routes

@router.route('/') # default page w/o explicit request
@router.route('/index.html')
def index():
	return render_template('index.html', title='CME')


@router.route('/export.html')
def export():
	return render_template('export.html', title='CME Export')


