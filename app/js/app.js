(function() {
    'use strict';

    var app = angular.module('corpusweb', [
        'ui.bootstrap',
        'ngRoute',
        'elasticsearch',
        'ngMaterial'
    ]);

    app.config(['$routeProvider',
        function($routeProvider) {
            $routeProvider.
            when('/', {
                templateUrl: 'partials/search-list.html',
                controller: 'QueryController'
            }).
            when('/description', {
                templateUrl: 'partials/description.html',
                controller: 'CorpusCtrl'
            }).
            otherwise({
                redirectTo: '/'
            });
        }
    ]);

    app.controller('CorpusSnippetCtrl',
        function($scope, $http) {
            $http.get('../data/corpora.json').success(function(data) {
                $scope.corpus = data.corpora[0];
            });
        }
    );

    app.controller('CorpusCtrl', ['$scope', '$routeParams', '$http',
        function($scope, $routeParams, $http) {
            $http.get('../data/corpora.json').success(function(data) {
                $scope.corpus = data.corpora[0];
            });
        }
    ]);


    // We define an Angular controller that returns the server health
    // Inputs: $scope and the 'es' service

    // Create the es service from the esFactory
    app.service('es', function(esFactory) {
        return esFactory({
            host: 'localhost:9200'
        });
    });

    // We define an Angular controller that returns query results,
    // Inputs: $scope and the 'es' service

    app.controller('QueryController',
        function($scope, $http, es) {
            // Initialise search input
            $scope.selectedItem = 0;
            $scope.searchText = '';

            // Initialise slider default value
            $scope.slider = 1;

            // Load facets
            $scope.facets = [];
            $http.get('../data/corpora.json').success(function(data) {
                $scope.facets = data.corpora[0].facets;
            });

            // Launch search
            $scope.search = function() {
                    if (!$scope.queryTerm == '') {
                        es.search({
                            index: 'anne-test',
                            size: 10,
                            body: {
                                "query": {
                                    "query_string": {
                                        "query": "*" + $scope.queryTerm.toLowerCase() + "*",
                                        "fields": ["name", "start pages"]
                                    }
                                },
                            }
                        }).then(function(response) {
                            $scope.tiles = response.hits.hits;
                        });
                    } else {
                        es.search({
                            index: 'anne-test',
                            size: 10,
                            body: {
                                "query": {
                                    "match_all": {}
                                },
                            }
                        }).then(function(response) {
                            $scope.tiles = response.hits.hits;
                        });
                    }
                }
                // Initialize search as full search
            $scope.search();

            $scope.formatFacet = function(values) {
                return values.sort().map(function(value) {
                    return {
                        value: value.toLowerCase(),
                        display: value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
                    }
                });
            }

            sigma.parsers.gexf(
                '../../data/arctic.gexf', {
                    container: 'carto'
                },
                function(s) {
                    s.refresh();
                }
            );
        }
    );

    app.controller('SearchCtrl', ['$scope', 'ejsResource',
        function($scope, ejsResource) {
            var ejs = ejsResource('http://localhost:9200');
            var index = 'anne-test';

            var highlightPost = ejs.Highlight(["text"])
                .fragmentSize(150, "text")
                .numberOfFragments(1, "text")
                .preTags("<b>", "text")
                .postTags("</b>", "text");

            var hashtagFacet = ejs.TermsFacet('Hashtag')
                .field('hashtag.text')
                .size(10);

            var statusRequest = ejs.Request()
                .indices(index)
                .types('webentity')
                .highlight(highlightPost)
                .facet(hashtagFacet);

            var activeFilters = {};
            var results = {};

            $scope.resultsArr = [];

            $scope.search = function() {
                $scope.resultsArr = [];
                if (!$scope.queryTerm == '') {
                    results = statusRequest
                        .query(applyFilters(ejs.MatchQuery('_all', $scope.queryTerm)))
                        // .fields(['name', 'prefixes', 'start pages'])
                        .doSearch();
                    $scope.resultsArr.push(results);
                } else {
                    results = {};
                    $scope.resultsArr = [];
                    activeFilters = {};
                }
            }

            var applyFilters = function(query) {
                var filter = null;
                var filters = Object.keys(activeFilters).map(function(k) {
                    return activeFilters[k];
                });
                // if more than one filter, use AND operator
                if (filters.length > 1) {
                    filter = ejs.AndFilter(filters);
                } else if (filters.length === 1) {
                    filter = filters[0];
                }

                return filter ? ejs.FilteredQuery(query, filter) : query;
            };
        }
    ]);
})();