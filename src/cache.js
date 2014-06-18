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

    function checkFileSize(data, headers) {
        // Some web-servers return full length in 'Content-Range' after slash
        var contentRange = headers('Content-Range');
        if (contentRange) {
            var slashPosition = contentRange.indexOf('/');
            if (slashPosition>0) {
                return parseInt(contentRange.substr(slashPosition+1));
            }
        }

        // Some web-servers return full length in Content-Length of Range request
        var contentLength = headers('Content-Length');
        if (contentLength > data.length*2) {
            return contentLength;
        }
    }

    this.fetch = function(from, to) {
        var deferred = $q.defer();
        $http({method:'GET', url: url, headers: {'Range': 'bytes=' + from + '-' + to}})
            .success(function (data, status, headers) {
                fileSize = checkFileSize(data, headers);
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
        // using length - 1 to remove last (incomplete) line
        for (var i = 0, l = lines.length - 1; i < l; i++) {
            var line = lines[i];
            result.push({position:linePos,line: line});
            linePos += line.length + 1;
        }
        return result;
    }
}).service('$cache', function($q, $fetcher) {
    var cache={};
    var isSorted=true;
    var positions = [];
    var bs = require('binarysearch');
    var chunk=50000;

    //for debug purposes only
    this.getAll = function (){
        return cache;
    };

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
        if (entries.promise) { promises.push(entries.promise); }
        actualScroll = lines.length;
        entries = this.retrieveFrom(positionFrom, linesNumber - lines.length );
        lines = lines.concat(entries.lines);
        if (entries.promise) { promises.push(entries.promise); }
        if (lines.length<linesNumber && lines.length > 0){
            entries = this.retrieveFrom(lines[0].position, lines.length - linesNumber , true);
            lines = entries.lines.concat(lines);
            if (entries.promise) { promises.push(entries.promise); }
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
            if (!isSorted) {
                positions.sort();
                isSorted=true;
            }
            var closestPosition = positions[bs.closest(positions, position)];
            if (closestPosition!==undefined) {
                position = closestPosition;
            }
            entry = cache[position];
            if (entry!==undefined) {
                var nextEntry = entry.next;
                if (nextEntry && nextEntry.position < positionFrom) {
                    entry = undefined;
                }
            }
        }
        var isPositive = linesNumber >= 0;
        var absNumber = Math.abs(linesNumber);

        if (isSkipFirst===true) {
            if (entry !== undefined) {
                entry = isPositive ? entry.next : entry.prev;
            }
        }

        for (i=startFrom; i<absNumber; i++) {
            if (entry===undefined) {
                if ($fetcher.isInit()){
                    var fetchSlide = 0;
                    if (startFrom !== position || isSkipFirst) {
                        fetchSlide =  isPositive ? 1:-1;
                    }
                    fetched = fetchAndCache(position, isPositive? absNumber-i : i-absNumber, fetchSlide);
                    lines = lines.concat(fetched.lines);
                }
                //TODO: handle isInit false
                break;
            }
            lines.push({position: entry.position, line: entry.line});
            position=entry.position;
            entry = isPositive ? entry.next : entry.prev;
        }
        if (!isPositive) {
            lines=lines.reverse();
        }
        return {lines:lines, promise:fetched.promise};
    };

    function createCacheEntry(position, line) {
        var entry = cache[position];
        if (entry===undefined) {
            entry = {line: line, position: position};
            positions.push(position);
            cache[position] = entry;
        }
        return entry;
    }

    /**
     * Requests some bytes from $fetcher adds all results to cache and returns
     * lines with placeholders and a promise. Placeholders will be filled on promise resolve
     * First or last line of request should already be cached for concatenation
     *
     * @param position
     * @param linesNumber
     * @param slide should always have the same sign as linesNumber
     * @returns {{lines: Array, promise: (*|promise)}}
     */
    function fetchAndCache(position, linesNumber, slide) {
        var deferred = $q.defer();
        var fetchedPromise;
        var isPositive=linesNumber >= 0;
        var lines=[];

        var absSlide = Math.abs(slide);
        var absNumber = Math.abs(linesNumber) + absSlide;
        for (var i = absSlide; i<absNumber; i++) {
            lines.push({position: position + (isPositive?'+':'-') + i, line: 'Waiting'});
        }

        if (!isPositive) {
            fetchedPromise = $fetcher.fetch(Math.max(position-chunk, 0), position);
        } else {
            fetchedPromise = $fetcher.fetch(position, position + chunk);
        }

        fetchedPromise.then(function(fetchedEntries) {
            isSorted=false;
            var results=[];
            var linkedEntry;
            var prev;

            for (var i = 0, l = fetchedEntries.length; i < l; i++) {
                var fetchedEntry = fetchedEntries[i];
                if ((i < linesNumber + slide && i >= slide) || (i > l+linesNumber + slide  && i<=linesNumber+slide)) {
                    results.push({placeHolder:position + (isPositive?'+' + i:'-' + (l-i)) , line:fetchedEntry});
                }
                if (i === 0 || i === l-1){
                    linkedEntry = cache[fetchedEntry.position];
                    if (linkedEntry === undefined) {
                        linkedEntry = createCacheEntry(fetchedEntry.position, fetchedEntry.line);
                    }
                } else {
                    linkedEntry = createCacheEntry(fetchedEntry.position, fetchedEntry.line);
                }
                if (prev !== undefined) {
                    prev.next = linkedEntry;
                    linkedEntry.prev = prev;
                }
                prev=linkedEntry;
            }

            deferred.resolve(results);
        });
        return {lines:lines,promise:deferred.promise};
    }

    this.cacheSize = function () {
        return positions.length;
    };

});
})(window.angular);