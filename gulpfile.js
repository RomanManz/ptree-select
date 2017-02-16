var gulp = require("gulp");
var gutil = require("gulp-util");
var karma = require("karma").server;
var lodash = require("lodash");
var path = require("path");
var uglify = require("gulp-uglify");
var minifyJS = require('gulp-minify');
var babel = require('gulp-babel'); // ES6 minifier
var cleanCSS = require('gulp-clean-css');
var directiveReplace = require('gulp-directive-replace');
var rename = require("gulp-rename");
var copy = require("gulp-copy");
var jade = require('gulp-jade');
var watch = require('gulp-watch');
var gulp_watch_jade = require('gulp-watch-jade');

var argv = require("minimist")(process.argv.slice(2));

var PATHS = {
    LIVERELOAD: [
        "src/*.js",
        "src/*.html",
        "./index.html"
    ]
};

var KARMA_CONFIG = {
    // browsers: ["Firefox"],
    browsers: ["Chrome"],
    frameworks: ["jasmine", "fixture"],
    preprocessors: {
      'src/*.html'   : ['html2js'],
      'sample/*.json'   : ['json_fixtures']
    },
    jsonFixturesPreprocessor: {
      variableName: '__json__'
    },
    files: [
        "node_modules/angular/angular.js",
        "node_modules/angular-mocks/angular-mocks.js",
        "node_modules/jquery/dist/jquery.js",
        "node_modules/jasmine-jquery/lib/jasmine-jquery.js",
        "src/ptree-select.js", // must be first since it('declares the module')
        "src/*.js",
        "test/*.spec.js",
        "src/*.html",
        { pattern: 'sample/*.json' }
    ]
};

gulp.src('src/*.jade')
    .pipe(watch('src/*.jade'))
    .pipe(gulp_watch_jade('src/*.jade', { delay: 100 }))
    .pipe(jade())
    .pipe(gulp.dest('src/'));

gulp.task('jade', function() {
  var YOUR_LOCALS = {};
 
  gulp.src('./src/*.jade')
    .pipe(jade({
      locals: YOUR_LOCALS
    }))
    .pipe(gulp.dest('./src/'))
});

gulp.task("livereload", function () {
    var livereload = require("gulp-livereload");

    livereload.listen({
        quiet: true
    });

    gulp.watch(PATHS.LIVERELOAD)
        .on("change", function(file) {
            livereload.changed(file.path);
            gutil.log(gutil.colors.yellow("Live Reload: ") + gutil.colors.magenta(file.path) + " reloaded.");
        });
});

gulp.task("play", ["jade", "livereload"], function() {

    var connect = require("connect");
    var http = require("http");
    var open = require("open");

    var serveStatic = require("serve-static");
    var serveIndex = require("serve-index");

    var port = 3000, app;

    app = connect()
        .use(serveStatic(__dirname))
        .use(serveIndex(__dirname));

    http.createServer(app).listen(port, function() {
        gutil.log("Local web server started at http://localhost:" + port);
        open("http://localhost:" + port, "chrome");
    });
});

gulp.task("test", function (done) {
    karma.start(lodash.assign(KARMA_CONFIG, {
        singleRun: true
    }), done);
});

gulp.task("tdd", function (done) {
    karma.start(KARMA_CONFIG, done);
});

gulp.task('build:directives', function(){
  return gulp.src('./src/ptree-select.directives.js')
    .pipe(directiveReplace({root: '.'}))
    .pipe(gulp.dest('stage'));
 
});

gulp.task('build:package', [ 'jade' ], function() {
    var concat = require("gulp-concat");
    return gulp.src([ "src/ptree-select.js", "stage/*.js", "!src/ptree-select.directives.js", "src/*.js" ])
       .pipe(concat("ptree-select.js"))
       .pipe(gulp.dest("dist"));
});

gulp.task('build:copy-css', [ 'jade' ], function() {
    return gulp.src("src/ptree-select.css")
       .pipe(copy("dist", { prefix: 1 }));
});

gulp.task('build:minify', [ 'build:package', 'build:directives' ], function() {
    return gulp.src("dist/ptree-select.js")
       .pipe(babel({presets: ['babili']}))
       .on("error", handleError)
       .pipe(rename('ptree-select.min.js'))
       .pipe(gulp.dest("dist"));
});

gulp.task('build:minify-css', [ 'build:copy-css' ], function() {
    return gulp.src("dist/ptree-select.css")
       .pipe(cleanCSS())
       .on("error", handleError)
       .pipe(rename('ptree-select.min.css'))
       .pipe(gulp.dest("dist"));
});

gulp.task('build', [ 'build:minify', 'build:minify-css' ], function() {
    return;
});

var breakOnError = true;
function handleError(ex) {
    var message = [
        gutil.colors.red("[" + ex.plugin + "] errored"),
        "\n\n",
        ex.message,
        "\n"
    ];
    if(ex.stack) {
        message = message.concat(["\n", ex.stack, "\n"]);
    }
    gutil.log.apply(gutil.log, message);

    if (breakOnError) {
        return process.exit(1);
    } else {
        gutil.beep();
        this.emit('end');
    }
}

gulp.task("default", ["play"]);
