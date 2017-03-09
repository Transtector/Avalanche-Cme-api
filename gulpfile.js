'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var watchify = require('watchify');
var babelify = require('babelify');
var stylus = require('gulp-stylus');

// for production builds (future)
//var uglify = require('gulp-uglify');
//var streamify = require('gulp-streamify');

var path = {
	HTML: './cme/templates/*.html',
	CSS_GLOB: './cme/templates/css/**/*.styl',
	CSS: ['./cme/templates/css/style.styl', './cme/templates/css/style-ie.styl'],
	CSS_OUT: './cme/static/css',
	OUT: 'cme.js',
	MINIFIED_OUT: 'cme.min.js',
	DEST: './cme/static/src',
	DEST_SRC: './cme/static/src',
	DEST_BUILD: './cme/static/src',
	ENTRY_POINT: './cme/templates/src/app.jsx'
};

gulp.task('html', function () {
	// nothing for now
});


gulp.task('css', function () {
	// generate css files from stylus sources
	return gulp.src(path.CSS)
		.pipe(stylus())
		.pipe(gulp.dest(path.CSS_OUT))
});

gulp.task('watch', function () {
	gulp.watch(path.HTML, ['html']);
	gulp.watch(path.CSS_GLOB, ['css']);

	var b = browserify({
		entries: [path.ENTRY_POINT], // top-level app entry
		extensions: ['.jsx'],
		transform: [babelify], // jsx to js
		debug: true, // source maps
		plugin: [watchify],
		cache: {}, packageCache: {} // used by watchify
	});
	b.on('update', bundle);

	function bundle() {
		var name = gutil.colors.cyan("bundle");
		gutil.log("Starting '" + name + "'...");
		return b.bundle()
			.on('error', gutil.log.bind(gutil, gutil.colors.red('Browserify Error')))
			.pipe(source(path.OUT))
			.pipe(gulp.dest(path.DEST_SRC))
			.on('end', gutil.log.bind(gutil, "Finished '" + name + "'"));
	}

	return bundle();
});

gulp.task('default', ['html', 'css', 'watch']);

