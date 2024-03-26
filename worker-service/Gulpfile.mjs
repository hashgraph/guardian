'use strict'

import gulp from 'gulp';
import ts from 'gulp-typescript';
import rename from 'gulp-rename';
import sourcemaps from 'gulp-sourcemaps';

gulp.task('configure:demo', () => {
    return gulp
        .src('environments/environment.demo.ts')
        .pipe(rename('environment.ts'))
        .pipe(gulp.dest('src'));
})

gulp.task('configure:production', () => {
    return gulp
        .src('environments/environment.prod.ts')
        .pipe(rename('environment.ts'))
        .pipe(gulp.dest('src'));
})

gulp.task('compile:dev', () => {
    const tsProject = ts.createProject('tsconfig.json');

    return tsProject
        .src()
        .pipe(sourcemaps.init())
        .pipe(tsProject()).js
        .pipe(sourcemaps.write({ sourceRoot: '/dist' }))
        .pipe(gulp.dest('dist'));
})

gulp.task('compile:production', () => {
    const tsProject = ts.createProject('tsconfig.production.json');

    return tsProject
        .src()
        .pipe(tsProject()).js
        .pipe(gulp.dest('dist'));
})

gulp.task('build:demo', gulp.series(['configure:demo', 'compile:dev']));
gulp.task('build:prod', gulp.series(['configure:production', 'compile:production']));
gulp.task('watch:only', () => {
    gulp.watch('src/**/*.ts', gulp.series(['compile:dev']));
})
gulp.task('watch', gulp.series(['build:demo', 'watch:only']))
