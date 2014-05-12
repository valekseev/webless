window.angular.module('webless', ['webless.directives','webless.services', 'webless.controllers']);
window.angular.module('webless.directives', [])
    .directive('ngcWheelmove', ['$parse', function($parse) { 'use strict';
        return {
            compile : function($element, attr) {
                var fn = $parse(attr.ngcWheelmove);
                return function(scope, element, attr) {
                    element.on('mousewheel DOMMouseScroll', function(event) {
                        scope.$apply(function() {
                            fn(scope, {
                                $event : event
                            });
                        });
                    });
                };
            }
        };
    }]).directive('ngcScrolltop', function () { 'use strict';
        return {
            link : function (scope, element, attrs) {
                scope.$watch(attrs.ngcScrolltop, function (scroll) {
                    // console.log(element.parent());
                    element[0].scrollTop = scroll;
                    element.parent()[0].focus();
                });
            }
        };
    }).directive('ngcSyncscroll', ['$parse', function($parse) { 'use strict';
        return {
            compile : function($element, attr) {
                var fn = $parse(attr.ngcSyncscroll);
                return function(scope, element, attr) {
                    element.on('scroll', function(event) {
                        scope.$apply(function() {
                            fn(scope, {
                                $fraction : element.prop('scrollTop') / element.prop('offsetHeight')
                            });
                        });
                    });
                };
            }
        };
    }]);