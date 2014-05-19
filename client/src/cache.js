(function(angular, undefined) {'use strict';

angular.module('webless.services', []).service('$fetcher', function ($q, $http) {
    var lastData;
    var fileSize;
    var url;
    var isInit=false;

    this.isInit=function(){
        return isInit;
    };

    this.init = function(fileName){
        url = fileName;
        $http.head(url).success(function(data, status, headers) {
            fileSize = headers('Content-Length');
        });
        isInit=true;
    };


    this.httpData = function(){
        return lastData;
    };

    this.fileSize = function(){
        return fileSize;
    };

    this.fetch = function(from, to) {
        var deferred = $q.defer();
        $http({method:'GET', url: url, headers: {Range: 'bytes=' + from + '-' + to}})
            .success(function (data, status, headers) {
                fileSize = headers('Content-Length');
                lastData = data;
                deferred.resolve(parse(data,from));
            }).error(function (data, status, headers, config) {
                deferred.reject(data, status, headers, config);
            });
        return deferred.promise;
    };

    function parse(data, start) {
        var result=[];
        var lines=data.split('\n');
        var linePos=start;
        for (var i = 0, l = lines.length; i < l; i++) {
            var line = lines[i];
            result.push({position:linePos,line: line});
            linePos+=line.length;
        }
        return result;
    }
}).service('$cache', function($q, $fetcher) {
    var cache={};
    var positions = [];
    var bs = require('binarysearch');
    var chunk=10000; //10KB

    this.init = function(url){
        cache={};
        positions=[];
        $fetcher.init(url);
    };

    this.retrieveAllLines = function(positionFrom, linesNumber, scroll) {
        var lines = [];
        var actualScroll;
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
        var position = positionFrom;
        var entry = cache[position];
        var startFrom=0;
        if (entry === undefined) {
            var closestPosition = positions[bs.closest(positions, position)];
            if (closestPosition!==undefined) {
                position = closestPosition;
            }
            entry = cache[position];
            if (entry!==undefined) {
                var nextEntry = cache[entry.next];
                if (nextEntry && nextEntry.position < positionFrom) {
                    entry = undefined;
                }
            }
        }
        var isPositive = linesNumber >= 0;
        var absNumber = Math.abs(linesNumber);

        if (isSkipFirst===true) {
            absNumber++;
            startFrom = 1;
            if (entry!==undefined) {
                position = isPositive ? entry.next : entry.prev;
                entry = cache[position];
            }
        }

        for (i=startFrom; i<absNumber; i++) {
            if (entry===undefined) {
                if ($fetcher.isInit()){
                    lines = lines.concat(fetchAndWrap(position, isPositive? absNumber-i : i-absNumber));
                }
                break;
            }
            lines.push({position: position, line: entry.line});
            position = isPositive ? entry.next : entry.prev;
            entry = cache[position];
        }
        if (!isPositive) {
            lines=lines.reverse();
        }
        return lines;
    };

    function fetchAndWrap(position, linesNumber) {
        var deferred = [];
        var results = [];
        var fetchedPromise;
        var linePos = 0;
        var prev;

        var absNumber = Math.abs(linesNumber);
        for (var i= 0; i<absNumber; i++) {
            deferred.push($q.defer());
        }

        if (linesNumber < 0) {
            fetchedPromise = $fetcher.fetch(Math.max(position-chunk, 0), position);
        } else {
            fetchedPromise = $fetcher.fetch(position, position + chunk);
        }
        fetchedPromise.then(function(lines){
            for (var i = 0, l = lines.length; i < l; i++) {
                var line = lines[i];
                if (i<linesNumber || i>l+linesNumber) {
                    deferred[i].resolve(line.line);
                }
                var lineLength = line.length + 1;
                cache[linePos] = {line : line, next : linePos+lineLength, prev : prev};
                positions.push(linePos);
                prev=linePos;
                linePos+= lineLength;
            }
        });

        for (i = 0; i<absNumber; i++) {
            results.push({position: -i-1,
                          line: deferred[i].promise});
        }
        return results;
    }

    this.cacheSize = function () {
        return positions.length;
    };

});
})(window.angular);