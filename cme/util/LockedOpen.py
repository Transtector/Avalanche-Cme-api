import os, fcntl

class LockedOpen(object):
	''' see https://blog.gocept.com/2013/07/15/reliable-file-updates-with-python/
	    for details regarding this class and isolating file updates.
	s'''
	def __init__(self, filename, *args, **kwargs):
		self.filename = filename
		self.open_args = args
		self.open_kwargs = kwargs
		self.fileobj = None

	def __enter__(self):
		f = open(self.filename, *self.open_args, **self.open_kwargs)
		while True:
			fcntl.flock(f, fcntl.LOCK_EX)
			fnew = open(self.filename, *self.open_args, **self.open_kwargs)
			if os.path.sameopenfile(f.fileno(), fnew.fileno()):
				fnew.close()
				break
			else:
				f.close()
				f = fnew
		self.fileobj = f
		return f

	def __exit__(self, _exc_type, _exc_value, _traceback):
		self.fileobj.close()