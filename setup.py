from setuptools import setup

setup (
	name			= "cme",
	version			= "0.1",
	description 		= "CME API and web UI",
	packages		= ['cme'],
	install_requires	= ["CherryPy",
					"Paste",
					"Flask",
					"rrdtool" ],
	entry_points		= {'console_scripts':
					['cme = cme.__main__:main']}
)

