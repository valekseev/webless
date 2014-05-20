'use strict';

module.exports = function (grunt) {

  grunt.initConfig({
    connect: {
      server: {
        options: {
          port: 8080,
          keepalive: true
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-connect');

  // Default task(s).
  grunt.registerTask('default', ['connect']);
  
};
