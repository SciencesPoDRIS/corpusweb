(function() {
    'use strict';

    var app = angular.module('webcorpus', [
        'webcorpus.conf',
        'webcorpus.filters',
        'webcorpus.controllers',
        'webcorpus.directives',
        'webcorpus.services',
        'ui.bootstrap',
        'ngRoute',
        'ngMaterial'
    ]);

    app.config(['$routeProvider',
        function($routeProvider) {
            $routeProvider.
            when('/', {
                templateUrl: 'partials/search-entities.html',
                controller: 'QueryController'
            }).
            when('/description/', {
                templateUrl: 'partials/description.html',
                controller: 'CorpusCtrl'
            }).
            when('/WebEntity/:webEntityId', {
                templateUrl: 'partials/web-entity.html',
                controller: 'WebEntityCtrl'
            }).
            when('/templating/', {
                templateUrl: 'partials/templating.html',
                controller: 'TemplatingCtrl'
            }).
            otherwise({
                redirectTo: '/'
            });
        }
    ]);

    app.run(function(googleAnalyticsId, $rootScope, $location) {
        $rootScope.$on('$routeChangeSuccess', function() {
            ga('create', googleAnalyticsId, 'auto');
            ga('send', 'pageview');
        });
    });

})();