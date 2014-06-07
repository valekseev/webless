'use strict';

module.exports = function (grunt) {

  grunt.initConfig({
    //Simple web server supporting Range headers
    connect: {
      server: {
        options: {
          port: 8080
        }
      }
    }, 
    //HTTP proxy adding bandwidth limits and latency delays simulation
    throttle: {
      default: {
        remote_port: 8080,
        local_port: 8081,
        upstream: 256*1024,
        downstream: 512*1024,
        keepalive: true,
        latency: 300
      }
    }
  });


  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-throttle');

  grunt.registerTask('default', ['connect','throttle']);
  
};
