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
        $http({method:'GET', url: url, headers: {'Range': 'bytes=' + from + '-' + to}})
            .success(function (data, status, headers) {
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
    var chunk=50000;

    this.init = function(url){
        cache={};
        positions=[];
        $fetcher.init(url);
    };

    //TODO: replace with one retrieveFrom call
    this.retrieveAllLines = function(positionFrom, linesNumber, scroll) {
        var actualScroll;
        var promises = [];
        var entries = this.retrieveFrom(positionFrom, -scroll, true);
        var lines = entries.lines;

        promises.push(entries.promise);
        actualScroll = lines.length;
        entries = this.retrieveFrom(positionFrom, linesNumber - lines.length );
        lines = lines.concat(entries.lines);
        promises.push(entries.promise);
        if (lines.length<linesNumber && lines.length > 0){
            entries = this.retrieveFrom(lines[0].position, lines.length - linesNumber , true);
            lines = entries.lines.concat(lines);
            promises.push(entries.promise);
            actualScroll+=linesNumber - lines.length;
        }
        return {
            lines    : lines,
            scroll   : actualScroll,
            promises : promises
        };
    };

    this.retrieveFrom = function(positionFrom, linesNumber, isSkipFirst) {
        var lines = [];
        var i;
        var position = positionFrom;
        var entry = cache[position];
        var startFrom=0;
        var fetched={};

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
                    fetched = fetchAndCache(position, isPositive? absNumber-i : i-absNumber);
                    lines = lines.concat(fetched.lines);
                }
                //TODO: handle isInit false
                break;
            }
            lines.push({position: position, line: entry.line});
            position = isPositive ? entry.next : entry.prev;
            entry = cache[position];
        }
        if (!isPositive) {
            lines=lines.reverse();
        }
        return {lines:lines, promise:fetched.promise};
    };

    function fetchAndCache(position, linesNumber) {
        var deferred = $q.defer();
        var fetchedPromise;
        var prev;
        var isPositive=true;
        var lines=[];

        var absNumber = Math.abs(linesNumber);

        if (linesNumber < 0) {
            isPositive=false;
            fetchedPromise = $fetcher.fetch(Math.max(position-chunk, 0), position);
        } else {
            fetchedPromise = $fetcher.fetch(position, position + chunk);
        }
        fetchedPromise.then(function(entries){
            // Adding all fetched values to cache
            var count=0;
            var results=[];
            for (var i = 0, l = entries.length; i < l; i++) {
                var entry = entries[i];
                if (i<linesNumber || i>l+linesNumber) {
                    results.push({placeHolder:position + (isPositive?'+':'-') + count, line:entry});
                    count++;
                }
                var lineLength = entry.length + 1;
                cache[entry.position] = {line : entry.line, next : entry.position+entry.line.length+1, prev : prev};
                positions.push(entry.position);
                prev=entry.position;
            }
            deferred.resolve(results);
        });

        for (var i = 0; i<absNumber; i++) {
            lines.push({position: position + (isPositive?'+':'-') + i, line: 'Waiting'});
        }

       return {lines:lines,promise:deferred.promise};
    }

    this.cacheSize = function () {
        return positions.length;
    };

});
})(window.angular);