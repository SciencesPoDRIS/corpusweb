(function() {
    'use strict';

    /* Services */

    var app = angular.module('webcorpus.services', []);

    // Create factory to load the json corpora
    app.factory('loadCorpora', ['$http',
        function($http) {
            return {
                getCorpora: function() {
                    return $http.get('../data/corpora.json').then(function(data) {
                        return data.data.corpora;
                    });
                }
            }
        }
    ]);

})();