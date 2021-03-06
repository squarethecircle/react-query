"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

exports.__esModule = true;
exports.QueryObserver = void 0;

var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));

var _utils = require("./utils");

var _notifyManager = require("./notifyManager");

var _types = require("./types");

var _config = require("./config");

var QueryObserver = /*#__PURE__*/function () {
  function QueryObserver(config) {
    this.config = config;
    this.isStale = true;
    this.initialUpdateCount = 0; // Bind exposed methods

    this.remove = this.remove.bind(this);
    this.refetch = this.refetch.bind(this);
    this.fetchMore = this.fetchMore.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this); // Subscribe to the query

    this.updateQuery();
  }

  var _proto = QueryObserver.prototype;

  _proto.subscribe = function subscribe(listener) {
    this.listener = listener || _utils.noop;
    this.currentQuery.subscribeObserver(this);

    if (this.config.enabled && (this.config.forceFetchOnMount || this.config.refetchOnMount === 'always')) {
      this.fetch();
    } else {
      this.optionalFetch();
    }

    this.updateTimers();
    return this.unsubscribe;
  };

  _proto.unsubscribe = function unsubscribe() {
    this.listener = undefined;
    this.clearTimers();
    this.currentQuery.unsubscribeObserver(this);
  };

  _proto.updateConfig = function updateConfig(config) {
    var prevConfig = this.config;
    var prevQuery = this.currentQuery;
    this.config = (0, _config.isResolvedQueryConfig)(config) ? config : this.config.queryCache.getResolvedQueryConfig(this.config.queryKey, config);
    this.updateQuery(); // Take no further actions if there is no subscriber

    if (!this.listener) {
      return;
    } // If we subscribed to a new query, optionally fetch and update refetch


    if (this.currentQuery !== prevQuery) {
      this.optionalFetch();
      this.updateTimers();
      return;
    } // Optionally fetch if the query became enabled


    if (config.enabled && !prevConfig.enabled) {
      this.optionalFetch();
    } // Update stale interval if needed


    if (config.enabled !== prevConfig.enabled || config.staleTime !== prevConfig.staleTime) {
      this.updateStaleTimeout();
    } // Update refetch interval if needed


    if (config.enabled !== prevConfig.enabled || config.refetchInterval !== prevConfig.refetchInterval) {
      this.updateRefetchInterval();
    }
  };

  _proto.getCurrentQuery = function getCurrentQuery() {
    return this.currentQuery;
  };

  _proto.getCurrentResult = function getCurrentResult() {
    return this.currentResult;
  }
  /**
   * @deprecated
   */
  ;

  _proto.clear = function clear() {
    this.remove();
  };

  _proto.remove = function remove() {
    this.currentQuery.remove();
  };

  _proto.refetch = function refetch(options) {
    return this.currentQuery.refetch(options, this.config);
  };

  _proto.fetchMore = function fetchMore(fetchMoreVariable, options) {
    return this.currentQuery.fetchMore(fetchMoreVariable, options, this.config).catch(_utils.noop);
  };

  _proto.fetch = function fetch() {
    var _DEFAULT_CONFIG$queri;

    // Never try to fetch if no query function has been set
    if (this.config.queryFn === ((_DEFAULT_CONFIG$queri = _config.DEFAULT_CONFIG.queries) == null ? void 0 : _DEFAULT_CONFIG$queri.queryFn)) {
      return Promise.resolve(this.currentResult.data);
    }

    return this.currentQuery.fetch(undefined, this.config).catch(_utils.noop);
  };

  _proto.optionalFetch = function optionalFetch() {
    if (this.config.enabled && // Only fetch if enabled
    this.isStale && // Only fetch if stale
    !(this.config.suspense && this.currentResult.isFetched) && ( // Don't refetch if in suspense mode and the data is already fetched
    this.config.refetchOnMount || this.currentQuery.observers.length === 1)) {
      this.fetch();
    }
  };

  _proto.updateStaleTimeout = function updateStaleTimeout() {
    var _this = this;

    if (_utils.isServer) {
      return;
    }

    this.clearStaleTimeout();

    if (this.isStale || !(0, _utils.isValidTimeout)(this.config.staleTime)) {
      return;
    }

    var timeElapsed = Date.now() - this.currentResult.updatedAt;
    var timeUntilStale = this.config.staleTime - timeElapsed + 1;
    var timeout = Math.max(timeUntilStale, 0);
    this.staleTimeoutId = setTimeout(function () {
      if (!_this.isStale) {
        _this.isStale = true;

        _this.updateResult();

        _this.notify({
          listener: true,
          globalListeners: true
        });
      }
    }, timeout);
  };

  _proto.updateRefetchInterval = function updateRefetchInterval() {
    var _this2 = this;

    if (_utils.isServer) {
      return;
    }

    this.clearRefetchInterval();

    if (!this.config.enabled || !(0, _utils.isValidTimeout)(this.config.refetchInterval)) {
      return;
    }

    this.refetchIntervalId = setInterval(function () {
      if (_this2.config.refetchIntervalInBackground || (0, _utils.isDocumentVisible)()) {
        _this2.fetch();
      }
    }, this.config.refetchInterval);
  };

  _proto.updateTimers = function updateTimers() {
    this.updateStaleTimeout();
    this.updateRefetchInterval();
  };

  _proto.clearTimers = function clearTimers() {
    this.clearStaleTimeout();
    this.clearRefetchInterval();
  };

  _proto.clearStaleTimeout = function clearStaleTimeout() {
    if (this.staleTimeoutId) {
      clearInterval(this.staleTimeoutId);
      this.staleTimeoutId = undefined;
    }
  };

  _proto.clearRefetchInterval = function clearRefetchInterval() {
    if (this.refetchIntervalId) {
      clearInterval(this.refetchIntervalId);
      this.refetchIntervalId = undefined;
    }
  };

  _proto.updateResult = function updateResult() {
    var _this$previousQueryRe;

    var state = this.currentQuery.state;
    var data = state.data,
        status = state.status,
        updatedAt = state.updatedAt;
    var isPreviousData = false;
    var isPlaceholderData = false; // Keep previous data if needed

    if (this.config.keepPreviousData && state.isInitialData && ((_this$previousQueryRe = this.previousQueryResult) == null ? void 0 : _this$previousQueryRe.isSuccess)) {
      data = this.previousQueryResult.data;
      updatedAt = this.previousQueryResult.updatedAt;
      status = this.previousQueryResult.status;
      isPreviousData = true;
    }

    if (status === 'loading' && this.config.placeholderData) {
      var placeholderData = typeof this.config.placeholderData === 'function' ? this.config.placeholderData() : this.config.placeholderData;

      if (typeof placeholderData !== 'undefined') {
        status = _types.QueryStatus.Success;
        data = placeholderData;
        isPlaceholderData = true;
      }
    }

    this.currentResult = (0, _extends2.default)({}, (0, _utils.getStatusProps)(status), {
      canFetchMore: state.canFetchMore,
      clear: this.remove,
      data: data,
      error: state.error,
      failureCount: state.failureCount,
      fetchMore: this.fetchMore,
      isFetched: state.updateCount > 0,
      isFetchedAfterMount: state.updateCount > this.initialUpdateCount,
      isFetching: state.isFetching,
      isFetchingMore: state.isFetchingMore,
      isInitialData: state.isInitialData,
      isPreviousData: isPreviousData,
      isPlaceholderData: isPlaceholderData,
      isStale: this.isStale,
      refetch: this.refetch,
      remove: this.remove,
      updatedAt: updatedAt
    });
  };

  _proto.updateQuery = function updateQuery() {
    var config = this.config;
    var prevQuery = this.currentQuery;
    var query = config.queryCache.getQueryByHash(config.queryHash);

    if (!query) {
      query = config.queryCache.createQuery(config);
    }

    query.config = config;

    if (query === prevQuery) {
      return;
    }

    this.previousQueryResult = this.currentResult;
    this.currentQuery = query;
    this.initialUpdateCount = query.state.updateCount; // Update stale state on query switch

    if (query.state.isInitialData) {
      if (config.keepPreviousData && prevQuery) {
        this.isStale = true;
      } else if (typeof config.initialStale === 'function') {
        this.isStale = config.initialStale();
      } else if (typeof config.initialStale === 'boolean') {
        this.isStale = config.initialStale;
      } else {
        this.isStale = typeof query.state.data === 'undefined';
      }
    } else {
      this.isStale = query.isStaleByTime(config.staleTime);
    }

    this.updateResult();

    if (this.listener) {
      prevQuery == null ? void 0 : prevQuery.unsubscribeObserver(this);
      this.currentQuery.subscribeObserver(this);
    }
  };

  _proto.onQueryUpdate = function onQueryUpdate(action) {
    var config = this.config;
    var type = action.type; // Update stale state on success, error or invalidation

    if (type === 2 || type === 3 || type === 4) {
      this.isStale = this.currentQuery.isStaleByTime(config.staleTime);
    } // Store current result and get new result


    var prevResult = this.currentResult;
    this.updateResult();
    var currentResult = this.currentResult; // Update timers on success, error or invalidation

    if (type === 2 || type === 3 || type === 4) {
      this.updateTimers();
    } // Do not notify if the query was invalidated but the stale state did not changed


    if (type === 4 && currentResult.isStale === prevResult.isStale) {
      return;
    } // Determine which callbacks to trigger


    var notifyOptions = {};

    if (type === 2) {
      notifyOptions.onSuccess = true;
    } else if (type === 3) {
      notifyOptions.onError = true;
    }

    if ( // Always notify if notifyOnStatusChange is set
    config.notifyOnStatusChange || // Otherwise only notify on data or error change
    currentResult.data !== prevResult.data || currentResult.error !== prevResult.error) {
      notifyOptions.listener = true;
    }

    this.notify(notifyOptions);
  };

  _proto.notify = function notify(options) {
    var config = this.config,
        currentResult = this.currentResult,
        currentQuery = this.currentQuery,
        listener = this.listener;
    var onSuccess = config.onSuccess,
        onSettled = config.onSettled,
        onError = config.onError;

    _notifyManager.notifyManager.batch(function () {
      // First trigger the configuration callbacks
      if (options.onSuccess) {
        if (onSuccess) {
          _notifyManager.notifyManager.schedule(function () {
            onSuccess(currentResult.data);
          });
        }

        if (onSettled) {
          _notifyManager.notifyManager.schedule(function () {
            onSettled(currentResult.data, null);
          });
        }
      } else if (options.onError) {
        if (onError) {
          _notifyManager.notifyManager.schedule(function () {
            onError(currentResult.error);
          });
        }

        if (onSettled) {
          _notifyManager.notifyManager.schedule(function () {
            onSettled(undefined, currentResult.error);
          });
        }
      } // Then trigger the listener


      if (options.listener && listener) {
        _notifyManager.notifyManager.schedule(function () {
          listener(currentResult);
        });
      } // Then the global listeners


      if (options.globalListeners) {
        config.queryCache.notifyGlobalListeners(currentQuery);
      }
    });
  };

  return QueryObserver;
}();

exports.QueryObserver = QueryObserver;