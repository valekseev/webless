(function(angular, console, undefined) {'use strict';

angular.module('webless.controllers', []).controller('ViewController', function($scope, $cache, $fetcher) {
    $scope.viewHeight = 30;
    $scope.viewWidth = 110;

    $scope.lineHeight = 15;
    $scope.letterHeight = 13;
    $scope.letterWidth = Math.round($scope.letterHeight*0.6);
//    $scope.letterWidth = $scope.letterHeight*0.6; // in IE

    $scope.isWrapped = true;
    $scope.firstStart = 0;
    $scope.pagesBuffer = 2;
    $scope.viewRenderedPages = $scope.pagesBuffer * 2 + 1; // 2 before and 2 after

    $scope.viewScroll = 0;
    $scope.viewUnwrappedScroll = function() {return wrappedToLineMap[$scope.viewScroll]; };
    $scope.viewUnwrappedEnd = function() {return wrappedToLineMap[$scope.viewScroll+$scope.viewHeight-1]; };
    $scope.cacheSize = function() {return $cache.cacheSize();};
    $scope.fileSize = function() {return $fetcher.fileSize();};
    $scope.fileName = 'filename.txt';
    $scope.pullThreshold = 0.15;

    $scope.showSelect = true;
    $scope.showVicinity = true;
    $scope.showScrollbar = true;
    wrappedToLineMap=[];
    lineToWrappedMap=[];

    $scope.httpData = function() {
        return $fetcher.httpData();
    };

    var wrappingLength;
    var wrappedToLineMap;
    var lineToWrappedMap;

    var lastScreenStart;

    //TODO: replace $scope.lines with array-backed map class
    function search(position) {
        for (var i=0, l=$scope.lines.length;i<l;i++) {
            if (position===$scope.lines[i].position){
                return i;
            }
        }
        return -1;
    }

    function processPromise(promise){
        return promise.then(function(entries) {
            var entry;
            var pos;
            for (var i = 0, l=entries.length;i<l;i++) {
                entry = entries[i];
                pos = search(entry.placeHolder);
                if (pos!==-1) {
                    $scope.lines[pos] = entry.line;
                }
            }
            recalculateWrappedMap();
        });
    }

    function retrieve(positionFrom, lines, skipFirst) {
        var newData = $cache.retrieveFrom(positionFrom, lines, skipFirst);
        if (newData.promise) {
            processPromise(newData.promise);
        }
        return newData.lines;
    }

    $scope.lines = retrieve($scope.fileSize, -$scope.viewHeight);

    if ($scope.lines.length > 0) {
        lastScreenStart = $scope.lines[wrappedToLineMap[wrappedToLineMap.length - $scope.viewHeight]].position;
    }

    $scope.lines = retrieve($scope.firstStart, bufferedLines());

    $scope.init = function (){
        $cache.init($scope.fileName);
        $scope.lines = retrieve($scope.firstStart, bufferedLines());
    };

    function bufferedLines() {
        return ($scope.pagesBuffer * 2 + 1) * $scope.viewHeight;
    }

    $scope.viewStyle = function () {
        return {
            'height': $scope.viewHeight * $scope.lineHeight,
            'width': $scope.viewWidth * $scope.letterWidth + 21,
            'font-size': $scope.letterHeight  + 'px',
            'white-space': $scope.isWrapped ? 'normal' : 'nowrap'
        };
    };

    $scope.vicinityScrollStyle = function () {
        return {
            'top': $scope.viewUnwrappedScroll() * 3,
            'height': ($scope.viewUnwrappedEnd() - $scope.viewUnwrappedScroll() + 2) * 3
        };
    };

    $scope.scrollTop = function () {
        return $scope.viewScroll * $scope.lineHeight;
    };

    $scope.scrollbarScroll = function() {
        var line = $scope.lines[$scope.viewUnwrappedScroll()];
        if (line && lastScreenStart) {
            return Math.round(line.position / lastScreenStart * $scope.viewHeight * $scope.lineHeight * $scope.pagesBuffer * 2);
        }
    };

    $scope.updateViewSize = function (){
        var diff = $scope.lines.length - bufferedLines();
        if (diff > 0) {
            $scope.lines = $scope.lines.concat(retrieve($scope.lines[$scope.lines.length-1].position, diff));
        } else if (diff < 0) {
            $scope.lines = $scope.lines.slice(0, bufferedLines());
        }
        recalculateWrappedMap();
    };

    // Validates new position(wrapped) and requests new lines from cache if needed
    $scope.moveView = function (shift) {
        var newWrappedStart = $scope.viewScroll + shift;
        var wrappedLength = wrappedToLineMap.length;

        if (newWrappedStart < 0) { newWrappedStart = 0; }
        if (newWrappedStart + $scope.viewHeight > wrappedLength) { newWrappedStart = wrappedLength - $scope.viewHeight; }
        if ($scope.viewScroll === newWrappedStart) { return; }
        $scope.viewScroll = newWrappedStart;

        // Update buffer if threshold is reached
        if (newWrappedStart < wrappedLength * $scope.pullThreshold && $scope.lines[0].position !== 0) {
            requestUp();
        } else if (   newWrappedStart + $scope.viewHeight > wrappedLength * (1 - $scope.pullThreshold)) {
            requestDown();
        }

    };

    function requestUp() {
        var unwrappedScroll = wrappedToLineMap[$scope.viewScroll];
        var partLineOffset = $scope.viewScroll - lineToWrappedMap[unwrappedScroll];
        var slide = unwrappedScroll - $scope.pagesBuffer * $scope.viewHeight;
        if ($scope.isWrapped) {
            slide -= Math.round($scope.viewHeight * (1 - $scope.lines.length/wrappedToLineMap.length) / 2);
        }

        var newData = retrieve($scope.lines[0].position, slide, true);
        if (newData.length === 0) { return; }
        $scope.lines = newData.concat($scope.lines).slice(0, bufferedLines());
        recalculateWrappedMap();
        $scope.viewScroll = lineToWrappedMap[unwrappedScroll + newData.length] + partLineOffset;
    }

    function requestDown() {
        var unwrappedScroll = wrappedToLineMap[$scope.viewScroll];
        var partLineOffset = $scope.viewScroll - lineToWrappedMap[unwrappedScroll];
        var slide = unwrappedScroll - $scope.pagesBuffer * $scope.viewHeight;
        if ($scope.isWrapped) {
            slide -= Math.round($scope.viewHeight * (1 - $scope.lines.length/wrappedToLineMap.length) / 2);
        }

        var newData = retrieve($scope.lines[$scope.lines.length -1].position, slide, true);
        var realSlide = newData.length;
        if (realSlide === 0) { return; }
        $scope.lines = $scope.lines.concat(newData).slice(realSlide);

        recalculateWrappedMap();
        $scope.viewScroll = lineToWrappedMap[unwrappedScroll - realSlide] + partLineOffset;
    }

    function prepareScroll() {
        var i,l;
        var reg = new RegExp('\\d\\d\\d\\d-\\d\\d-\\d\\d \\d\\d:\\d\\d:\\d\\d\\.\\d\\d\\d ');
        $scope.scrollText='';
        for (i=0, l=$scope.lines.length; i<l; i++) {
            $scope.scrollText+=$scope.lines[i].line.replace(reg,'') + '\n';
        }
//        console.log($scope.scrollText);
    }

    function recalculateWrappedMap() {
        var renderedLength = $scope.lines.length;
        wrappingLength = $scope.viewWidth;
        wrappedToLineMap = [];
        lineToWrappedMap = [];
        $scope.lineWrappedSizes = [];
        var wrappedLineNum = 0;
        for (var i = 0; i < renderedLength; i++) {
            var wrappedPos = 0;
            var wrappedSize = 0;
            var line = $scope.lines[i].line;
            lineToWrappedMap[i] = wrappedLineNum;
            do {
                wrappedToLineMap[wrappedLineNum] = i;
                wrappedLineNum++;
                wrappedSize++;
            } while ((wrappedPos += wrappingLength) < line.length && $scope.isWrapped);
            $scope.lineWrappedSizes[i] = wrappedSize;
        }
        prepareScroll();
    }

    $scope.keyPressed = function(e) {
        switch(e.keyCode) {
            case 36: $scope.scrollTo(0);                  break; //Home
            case 35: $scope.scrollTo(1);                  break; //End
            case 87:                                             //w
            case 33: $scope.moveView(-$scope.viewHeight); break; //page up
            case 32:                                             //space
            case 34: $scope.moveView($scope.viewHeight);  break; //page down
            case 38: $scope.moveView(-1);                 break; //up
            case 40: $scope.moveView(1);                  break; //down
        }
//        console.log(e.keyCode);
    };

    $scope.wheelMoved = function(e) {
        var delta = 0;
        if (e.wheelDelta) {
            delta = e.wheelDelta;
        } else if (e.detail) {
            delta = -e.detail;
        }

        if (delta < 0) {
            $scope.moveView(1);
        } else {
            $scope.moveView(-1);
        }
    };

    $scope.scrollTo = function (fraction) {
        var pos = Math.round(lastScreenStart * fraction);

        var newData = $cache.retrieveAllLines(pos, bufferedLines(), $scope.pagesBuffer * $scope.viewHeight);
        for (var i=0, l=newData.promises.length; i<l; i++){
            processPromise(newData.promises[i]);
        }
        $scope.lines = newData.lines;
        recalculateWrappedMap();
        $scope.viewScroll = Math.min(wrappedToLineMap.length-$scope.viewHeight, lineToWrappedMap[newData.scroll]);
    };
});

})(window.angular, window.console);
