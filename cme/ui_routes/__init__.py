# All CME UI (web page) routes are detailed below.

from flask import Blueprint, render_template, abort
from .. import app
from ..Auth import authorized
from ..common import Config

router = Blueprint('uiroutes', __name__)

# Custom 404 page
@app.errorhandler(404)
def handle_not_found(error):
	return render_template('404.html', title='Oops - not found'), 404


# UI application pages

# Main application UI entry point
# (and the default page w/o explicit request)
@router.route('/')
@router.route('/index.html')
def index():
	return render_template('index.html', title='CME')


# Handles channel data history exporting
@router.route('/export.html')
def export():
	if authorized():
		return render_template('export.html', title='CME Export')

	return render_template('index.html', title='CME')
	

# Calibration UI - used in CME production and backend API
# only works when in Recovery Mode.
@router.route('/calibrate.html')
def calibrate():

	if not Config.RECOVERY:
		abort(404)

	if authorized():	
		return render_template('calibrate.html', title='CME Calibrate')

	return render_template('index.html', title='CME')
