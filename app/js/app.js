(function() {
    'use strict';

    var app = angular.module('webcorpus', [
        'ui.bootstrap',
        'ngRoute'
    ]);

    app.controller('CorpusSnippetCtrl',
        function($scope, $http) {
            $http.get('../data/corpora.json').success(function(data) {
                $scope.corpus = data.corpora[0];
            });
        }
    );

    app.controller('TabsCtrl',
        function($scope, $window) {
            $scope.tabs = [{
                title: 'The corpus',
                content: 'partials/corpus.html',
                active: true
            }, {
                title: 'Sites list',
                content: 'partials/webentities-list.html'
            }, {
                title: 'Cartography',
                content: 'partials/carto.html'
            }];
        }
    );

    app.controller('CorpusCtrl', ['$scope', '$routeParams', '$http',
        function($scope, $routeParams, $http) {
            $http.get('../data/corpora.json').success(function(data) {
                $scope.corpus = data.corpora[0];
            });
        }
    ]);

    app.controller('WebEntitiesListCtrl', ['$scope', '$http',
        function($scope, $http) {
            $http.get('../data/corpora.json').success(function(data) {
                var file = data.corpora[0].file;
                $http.get('../data/' + file + '.csv').success(function(data) {
                    var webentities = $.csv.toArrays(data);
                    $scope.totalItems = webentities.length;
                    $scope.currentPage = 1;
                    $scope.numPerPage = 10;
                    $scope.maxSize = 5;
                    $scope.webentities = webentities.slice(1, 11);

                    $scope.setPage = function(pageNo) {
                        $scope.currentPage = pageNo;
                    };

                    $scope.pageChanged = function() {
                        var startElement = $scope.numPerPage * ($scope.currentPage - 1) + 1;
                        var endElement = $scope.numPerPage * $scope.currentPage + 1;;
                        $scope.webentities = webentities.slice(startElement, endElement);
                        $(document).scrollTop($(".nav").offset().top - $('#header-inmedia_1').height() - 10);
                    };
                });
            });
        }
    ]);

    app.controller('CartoCtrl',
        function() {
            sigma.parsers.gexf(
                '../data/anne-test.gexf', {
                    container: 'carto'
                },
                function(s) {
                    s.refresh();
                }
            );
        }
    );
})();