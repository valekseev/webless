(function(angular, undefined) {'use strict';

angular.module('webless.services', []).service('$fetcher', function ($q, $http) {

    this.init = function(url){
        this.url = url;
        $http.head(url).success(function(data, status) {
            this.httpData = data;
        });
    };

    this.fetch = function(from, to){

    };
}).service('$cache', function($fetcher) {
    var cache={};
    var positions = [];
    var bs = require('binarysearch');

    this.init = function(url){
        $fetcher.load(url);
    };

    this.retrieveAllLines = function(positionFrom, linesNumber, scroll) {
        var lines = [];
        var actualScroll;
        if (positionFrom<0 || positionFrom > this.fileSize()) { return lines; }
        lines = this.retrieveFrom(positionFrom, -scroll, true);
        actualScroll = lines.length;
        lines = lines.concat(this.retrieveFrom(positionFrom, linesNumber - lines.length));
        if (lines.length<linesNumber && lines.length > 0){
            actualScroll+=linesNumber - lines.length;
            lines = this.retrieveFrom(lines[0].position, lines.length - linesNumber , true).concat(lines);
        }
        return {
            lines : lines,
            scroll : actualScroll
        };
    };

    this.retrieveFrom = function(positionFrom, linesNumber, isSkipFirst) {
        var lines = [];
        var i;
        if (positionFrom<0 || positionFrom > this.fileSize()) { return lines; }
        var position = positionFrom;
        var entry = cache[position];
        if (entry === undefined) {
            position = positions[bs.closest(positions, position)];
            entry = cache[position];
            //TODO: add prev check
        }
        var isPositive = linesNumber >= 0;
        var absNumber = Math.abs(linesNumber);

        for (i=0; i<absNumber && entry!==undefined; i++) {
            if (isSkipFirst!==true) {
                lines.push({position: position, line: entry.line});
            }
            position = isPositive ? entry.next : entry.prev;
            entry = cache[position];
            if (isSkipFirst===true && entry!==undefined) {
                lines.push({position: position, line: entry.line});
            }
        }
        if (!isPositive) {
            lines=lines.reverse();
        }
        return lines;
    };

    this.cacheSize = function () {
        return positions.length;
    };

    this.fileSize = function () {
        return $fetcher.fileSize;
    };

    this.httpData = function () {
        return $fetcher.httpData;
    };
});
})(window.angular);