(function() {

    'use strict';

    /* Filters */

    var app = angular.module('webcorpus.filters', []);

    app.filter('translate', ['categories',
        function(categories, input) {
            return function(input, facet) {
                if (input === undefined) {
                    return '';
                } else {
                    var index = 0;
                    while (categories[facet].values[index].id != input) {
                        index++;
                    }
                    return categories[facet].values[index].name;
                }
            };
        }
    ]);

})();