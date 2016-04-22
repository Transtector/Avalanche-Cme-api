
from . import app, settings, router, render_template, APIError

@router.route('/')
@router.route('/index')
def index():
	return render_template('index.html', title='Avalanche')


@router.route('/hello')
def hello():
	return render_template('hello.html', title='Flask + ReactJS')


@router.route('/err')
def errors():
	return render_template('error.html', error=APIError('Error'))
