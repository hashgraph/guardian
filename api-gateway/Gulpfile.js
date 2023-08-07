'use strict'

const gulp = require('gulp');
const ts = require('gulp-typescript');
const sourcemaps = require('gulp-sourcemaps');

gulp.task('dev', () => {
    const tsProject = ts.createProject('tsconfig.json');

    return tsProject
        .src()
        .pipe(sourcemaps.init())
        .pipe(tsProject()).js
        .pipe(sourcemaps.write({ sourceRoot: "/dist" }))
        .pipe(gulp.dest("dist"));
})

gulp.task('prod', () => {
    const tsProject = ts.createProject('tsconfig.production.json');

    return tsProject
        .src()
        .pipe(tsProject()).js
        .pipe(gulp.dest("dist"));
})

gulp.task('watch', () => {
    gulp.watch('src/*.ts', { events: 'all' }, (cb) => {
        gulp.series(['dev'])
    });
})
