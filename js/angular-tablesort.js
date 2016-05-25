/*
 angular-tablesort v1.1.2
 (c) 2013-2015 Mattias Holmlund, http://mattiash.github.io/angular-tablesort
 License: MIT
*/

var tableSortModule = angular.module( 'tableSort', [] );

tableSortModule.provider('tableSortConfig', function () {
    this.filterTemplate = ""; //no filtering by default unless a template is provided
    this.filterFunction = null; //empty by default - use the built in filter function when left blank
    this.paginationTemplate = ""; //no pagination by default unless a template is provided
    this.perPageOptions = [10, 25, 50, 100];
    this.perPageDefault = this.perPageOptions[0]; //first option by default
    this.itemNameSingular = "item";
    this.itemNamePlural = this.itemNameSingular + "s";
    this.noDataText = "No " + this.itemNamePlural;
    
    if(!isNaN(this.perPageDefault) && this.perPageOptions.indexOf(this.perPageDefault) === -1){
        //If a default per-page option was added that isn't in the array, add it and sort the array 
        this.perPageOptions.push(this.perPageDefault);
        this.perPageOptions.sort(function (a,b) {return a - b;}); 
    }
    
    this.$get = function () {
        return this;
    };

});

tableSortModule.directive('tsWrapper', ['$parse', '$compile', function( $parse, $compile ) {
    'use strict';
    
    function replaceTemplateTokens($scope, templateString){
        //Replace some strings with the proper expressions to be compiled
        return templateString
            .replace(/FILTER_STRING/g, "filtering.filterString")
            .replace(/CURRENT_PAGE_RANGE/g, "pagination.getPageRangeString(TOTAL_COUNT)")
            .replace(/TOTAL_COUNT/g, $scope.pagination.itemsArrayExpression + ".length")
            .replace(/PER_PAGE_OPTIONS/g, 'pagination.perPageOptions')
            .replace(/ITEMS_PER_PAGE/g, 'pagination.perPage')
            .replace(/ITEM_NAME_SINGULAR/g, 'itemNameSingular')
            .replace(/ITEM_NAME_PLURAL/g, 'itemNamePlural')
            .replace(/FILTERED_COUNT/g, "filtering.filteredCount")
            .replace(/CURRENT_PAGE_NUMBER/g, "pagination.currentPage");
    }
    
    return {
        scope: true,
        controller: ['$scope', 'tableSortConfig', function($scope, tableSortConfig ) {
            //local scope vars for this directive
            $scope.pagination = {
                template: tableSortConfig.paginationTemplate,
                perPageOptions: tableSortConfig.perPageOptions.concat(), //copy the array, not a reference
                perPage: tableSortConfig.perPageDefault,
                itemsArrayExpression: "", //this will contain the string expression for the array of items in the table
                currentPage: 1,
                getPageRangeString: function(total) {
                    //TODO: Format these numbers, perhaps optionally
                    var maxOnPage = total !== $scope.filtering.filteredCount ? $scope.filtering.filteredCount : total;
                    return (($scope.pagination.currentPage-1) * $scope.pagination.perPage) + 1 + "-" + Math.min(($scope.pagination.currentPage) * $scope.pagination.perPage, maxOnPage);
                }
            };

            $scope.filtering = {
                template: tableSortConfig.filterTemplate,
                filterString: "",
                filterFunction: tableSortConfig.filterFunction,
                filteredCount: 0,
                filterFields: []
            };
            
            $scope.itemNameSingular = tableSortConfig.itemNameSingular;
            $scope.itemNamePlural = tableSortConfig.itemNamePlural;
            $scope.noDataText = tableSortConfig.noDataText;
            $scope.sortExpression = [];
            $scope.headings = [];
            
            //Private vars
            var parse_sortexpr = function( expr ) {
                return [$parse( expr ), null, false];
            };

            //Public directive vars for the other directives that depend on this
            this.setSortField = function( sortexpr, element ) {
                var i;
                var expr = parse_sortexpr( sortexpr );
                if( $scope.sortExpression.length === 1
                    && $scope.sortExpression[0][0] === expr[0] ) {
                    if( $scope.sortExpression[0][2] ) {
                        element.removeClass( "tablesort-desc" );
                        element.addClass( "tablesort-asc" );
                        $scope.sortExpression[0][2] = false;
                    }
                    else {
                        element.removeClass( "tablesort-asc" );
                        element.addClass( "tablesort-desc" );
                        $scope.sortExpression[0][2] = true;
                    }
                }
                else {
                    for( i=0; i<$scope.headings.length; i=i+1 ) {
                        $scope.headings[i]
                            .removeClass( "tablesort-desc" )
                            .removeClass( "tablesort-asc" );
                    }
                    element.addClass( "tablesort-asc" );
                    $scope.sortExpression = [expr];
                }
            };

            this.addSortField = function( sortexpr, element ) {
                var i;
                var toggle_order = false;
                var expr = parse_sortexpr( sortexpr );
                for( i=0; i<$scope.sortExpression.length; i=i+1 ) {
                    if( $scope.sortExpression[i][0] === expr[0] ) {
                        if( $scope.sortExpression[i][2] ) {
                            element.removeClass( "tablesort-desc" );
                            element.addClass( "tablesort-asc" );
                            $scope.sortExpression[i][2] = false;
                        }
                        else {
                            element.removeClass( "tablesort-asc" );
                            element.addClass( "tablesort-desc" );
                            $scope.sortExpression[i][2] = true;
                        }
                        toggle_order = true;
                    }
                }
                if( !toggle_order ) {
                    element.addClass( "tablesort-asc" );
                    $scope.sortExpression.push( expr );
                }
            };

            this.setTrackBy = function( trackBy ) {
                $scope.trackBy = trackBy;
            };

            this.registerHeading = function( headingelement ) {
                $scope.headings.push( headingelement );
            };

            this.addFilterField = function( sortexpr, element ) {
                var expr = parse_sortexpr( sortexpr );
                $scope.filtering.filterFields.push( expr )
            };

            this.setDataForPager = function( dataArrayExp ){
                $scope.pagination.itemsArrayExpression = dataArrayExp;
            }
        }],
        link: function($scope, $element, $attrs){
            
            if($attrs.tsItemName){
                var originalNoDataText = "No " + $scope.itemNamePlural;

                //if the table attributes has an item name on it, this takes priority
                $scope.itemNameSingular = $attrs.tsItemName;

                if($attrs.tsItemNamePlural){
                    //if a plural name was specified, use that
                    $scope.itemNamePlural = $attrs.tsItemNamePlural;
                }else{
                    //otherwise just add "s" to the singular name
                    $scope.itemNamePlural = $attrs.tsItemName + "s";
                }

                if(!$attrs.tsNoDataText && $scope.noDataText === originalNoDataText){
                    //If the noDataText was NOT specified AND it's in the same "No ITEMS" format as the default , update it to contain the new item name
                    $scope.noDataText = "No " + $scope.itemNamePlural;
                }
            }

            if($attrs.tsNoDataText){
                //If the noDataText was specified, update it
                $scope.noDataText = $attrs.tsNoDataText;
            }

            //local attribute usages of the pagination/filtering options will override the global config
            if($attrs.tsPerPageOptions){
                $scope.pagination.perPageOptions = $scope.$eval($attrs.tsPerPageOptions);
            }

            if($attrs.tsPerPageDefault){
                var defaultPerPage = $scope.$eval($attrs.tsPerPageDefault);
                if(!isNaN(defaultPerPage)){
                    $scope.pagination.perPage = defaultPerPage
                    if($scope.pagination.perPageOptions.indexOf($scope.pagination.perPage) === -1){
                        //If a default per-page option was added that isn't in the array, add it and sort the array 
                        $scope.pagination.perPageOptions.push($scope.pagination.perPage);
                        $scope.pagination.perPageOptions.sort(function (a,b) {return a - b;}); 
                    }
                }
            }

            if($attrs.tsFilterFunction){
                //if the table attributes has a filter function on it, this takes priority
                $scope.filtering.filterFunction = $scope.$eval($attrs.tsFilterFunction);
            }

            if(!angular.isFunction($scope.filtering.filterFunction)) {
                //if no custom filter function was used in the config, use this as the default one
                $scope.filtering.filterFunction = function(item){
                    var shouldInclude = false;
                    for( var i=0; i<$scope.filtering.filterFields.length; i=i+1 ) {
                        if(!shouldInclude){
                            var str = ($scope.filtering.filterFields[i][0](item) || "").toString(); //parse the item's property using the `ts-criteria` value & filter
                            shouldInclude = str.indexOf($scope.filtering.filterString.toLowerCase()) > -1;
                        }
                    }
                    return shouldInclude;
                }
            }

            $scope.filterLimitFun = function(array){
                if(!$attrs.tsFilterFunction && $scope.filtering.filterString === ""){
                    //Return unfiltered when NOT using a custom filter function and when nothing is being searched
                    $scope.filtering.filteredCount = array.length;
                    return array;
                }
                var filteredArr = array.filter($scope.filtering.filterFunction);
                $scope.filtering.filteredCount = filteredArr.length;
                return filteredArr;
            };

            $scope.sortFun = function( a, b ) {
                var i, aval, bval, descending, filterFun;
                for( i=0; i<$scope.sortExpression.length; i=i+1 ){
                    aval = $scope.sortExpression[i][0](a);
                    bval = $scope.sortExpression[i][0](b);
                    filterFun = b[$scope.sortExpression[i][1]];
                    if( filterFun ) {
                        aval = filterFun( aval );
                        bval = filterFun( bval );
                    }
                    if( aval === undefined || aval === null ) {
                        aval = "";
                    }
                    if( bval === undefined || bval === null ) {
                       bval = "";
                    }
                    descending = $scope.sortExpression[i][2];
                    if( aval > bval ) {
                        return descending ? -1 : 1;
                    }
                    else if( aval < bval ) {
                        return descending ? 1 : -1;
                    }
                }

                // All the sort fields were equal. If there is a "track by" expression,
                // use that as a tiebreaker to make the sort result stable.
                if( $scope.trackBy ) {
                    aval = a[$scope.trackBy];
                    bval = b[$scope.trackBy];
                    if( aval === undefined || aval === null ) {
                        aval = "";
                    }
                    if( bval === undefined || bval === null ) {
                        bval = "";
                    }
                    if( aval > bval ) {
                        return descending ? -1 : 1;
                    }
                    else if( aval < bval ) {
                        return descending ? 1 : -1;
                    }
                }
                return 0;
            };

            $scope.pageLimitFun = function(array){
                if($attrs.tsDisplayPagination === "false"){
                    //pagination is disabled, so return everything
                    return array;
                }
                //Only return the items that are in the correct index range for the currently selected page
                var begin = ($scope.pagination.currentPage-1) * $scope.pagination.perPage;
                var end = ($scope.pagination.currentPage) * $scope.pagination.perPage;
                var final=[];
                for(var i=0; i < array.length; i++){
                    if(i >= begin && i < end){
                        final.push(array[i]);
                    }
                }
                return final;
            };

            if($attrs.tsDisplayFiltering !== "false" && $scope.filtering.template !== ""){
                var filterString = replaceTemplateTokens($scope, $scope.filtering.template);
                var $filter = $compile(filterString)($scope);
                //Add filtering HTML BEFORE the table
                $element.parent()[0].insertBefore($filter[0], $element[0]);
            }

            if($attrs.tsDisplayPagination !== "false" && $scope.pagination.template !== ""){
                var pagerString = replaceTemplateTokens($scope, $scope.pagination.template)
                var $pager = $compile(pagerString)($scope);
                //Add pagination HTML AFTER the table
                $element.after($pager);
            }
        }
    };
}]);

tableSortModule.directive('tsCriteria', function() {
    return {
        require: "^tsWrapper",
        link: function(scope, element, attrs, tsWrapperCtrl) {
            var clickingCallback = function(event) {
                scope.$apply( function() {
                    if( event.shiftKey ) {
                        tsWrapperCtrl.addSortField(attrs.tsCriteria, element);
                    }
                    else {
                        tsWrapperCtrl.setSortField(attrs.tsCriteria, element);
                    }
                } );
            };
            element.bind('click', clickingCallback);
            element.addClass('tablesort-sortable');
            if( "tsDefault" in attrs && attrs.tsDefault !== "0" ) {
                tsWrapperCtrl.addSortField( attrs.tsCriteria, element );
                if( attrs.tsDefault == "descending" ) {
                    tsWrapperCtrl.addSortField( attrs.tsCriteria, element );
                }
            }
            if( "tsFilter" in attrs) {
                tsWrapperCtrl.addFilterField( attrs.tsCriteria, element );
            }
            tsWrapperCtrl.registerHeading( element );
        }
    };
});

tableSortModule.directive("tsRepeat", ['$compile', function($compile) {
    return {
        terminal: true,
        multiElement: true,
        require: "^tsWrapper",
        priority: 1000000,
        link: function(scope, element, attrs, tsWrapperCtrl) {
            var repeatAttrs = ["ng-repeat", "data-ng-repeat", "ng-repeat-start", "data-ng-repeat-start"];
            var ngRepeatDirective = repeatAttrs[0];
            var tsRepeatDirective = "ts-repeat";
            for (var i = 0; i < repeatAttrs.length; i++) {
                 if (angular.isDefined(element.attr(repeatAttrs[i]))) {
                    ngRepeatDirective = repeatAttrs[i];
                    tsRepeatDirective = ngRepeatDirective.replace(/^(data-)?ng/, '$1ts');
                    break;
                }
            }

            var repeatExpr = element.attr(ngRepeatDirective);
            var trackBy = null;
            var repeatExprRegex = /^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(\s+track\s+by\s+[\s\S]+?)?\s*$/;
            var trackByMatch = repeatExpr.match(/\s+track\s+by\s+\S+?\.(\S+)/);
            var repeatInMatch = repeatExpr.match(repeatExprRegex);
            if( trackByMatch ) {
                trackBy = trackByMatch[1];
                tsWrapperCtrl.setTrackBy(trackBy);
            }
            
            //Limit Sort the results, then limit them to only include what matches the filter, then only what's on the current page
            if (repeatExpr.search(/tablesort/) != -1) {
                repeatExpr = repeatExpr.replace(/tablesort/,"tablesortOrderBy:sortFun | tablesortLimit:filterLimitFun | tablesortLimit:pageLimitFun");
            } else {
                repeatExpr = repeatExpr.replace(repeatExprRegex, "$1 in $2 | tablesortOrderBy:sortFun | tablesortLimit:filterLimitFun | tablesortLimit:pageLimitFun$3");
            }

            if (angular.isUndefined(attrs.tsHideNoData)) {
                var noDataRow = angular.element(element[0]).clone();
                noDataRow.removeAttr(ngRepeatDirective);
                noDataRow.removeAttr(tsRepeatDirective);
                noDataRow.addClass("showIfLast");
                noDataRow.children().remove();
                noDataRow.append('<td colspan="' + element[0].childElementCount + '">{{noDataText}}</td>');
                noDataRow = $compile(noDataRow)(scope);
                element.parent().prepend(noDataRow);
            }

            //pass the `itemsList` from `item in itemsList` to the master directive as a string so it can be used in expressions 
            tsWrapperCtrl.setDataForPager(repeatInMatch[2])

            angular.element(element[0]).attr(ngRepeatDirective, repeatExpr);
            $compile(element, null, 1000000)(scope);
        }
    };
}]);

tableSortModule.filter( 'tablesortLimit', function(){
    return function(array, limitFun) {
       if(!array) return;
       return limitFun(array);
    };
} );

tableSortModule.filter( 'tablesortOrderBy', function(){
    return function(array, sortfun ) {
        if(!array) return;
        var arrayCopy = array.concat();
        return arrayCopy.sort( sortfun );
    };
} );

tableSortModule.filter( 'parseInt', function(){
    return function(input) {
        return parseInt( input ) || null;
    };
} );

tableSortModule.filter( 'parseFloat', function(){
    return function(input) {
        return parseFloat( input ) || null;
    };
} );