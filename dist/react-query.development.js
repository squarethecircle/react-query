(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('react-dom'), require('react')) :
  typeof define === 'function' && define.amd ? define(['exports', 'react-dom', 'react'], factory) :
  (global = global || self, factory(global.ReactQuery = {}, global.ReactDOM, global.React));
}(this, (function (exports, ReactDOM, React) { 'use strict';

  ReactDOM = ReactDOM && Object.prototype.hasOwnProperty.call(ReactDOM, 'default') ? ReactDOM['default'] : ReactDOM;
  React = React && Object.prototype.hasOwnProperty.call(React, 'default') ? React['default'] : React;

  function _extends() {
    _extends = Object.assign || function (target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];

        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }

      return target;
    };

    return _extends.apply(this, arguments);
  }

  (function (QueryStatus) {
    QueryStatus["Idle"] = "idle";
    QueryStatus["Loading"] = "loading";
    QueryStatus["Error"] = "error";
    QueryStatus["Success"] = "success";
  })(exports.QueryStatus || (exports.QueryStatus = {}));

  var CancelledError = function CancelledError(silent) {
    this.silent = silent;
  }; // UTILS

  var _uid = 0;
  function uid() {
    return _uid++;
  }
  var isServer = typeof window === 'undefined';
  function noop() {
    return undefined;
  }
  var Console = console || {
    error: noop,
    warn: noop,
    log: noop
  };
  function setConsole(c) {
    Console = c;
  }
  function functionalUpdate(updater, input) {
    return typeof updater === 'function' ? updater(input) : updater;
  }

  function stableStringifyReplacer(_key, value) {
    if (typeof value === 'function') {
      throw new Error();
    }

    if (isPlainObject(value)) {
      return Object.keys(value).sort().reduce(function (result, key) {
        result[key] = value[key];
        return result;
      }, {});
    }

    return value;
  }

  function stableStringify(value) {
    return JSON.stringify(value, stableStringifyReplacer);
  }
  function deepIncludes(a, b) {
    if (a === b) {
      return true;
    }

    if (typeof a !== typeof b) {
      return false;
    }

    if (typeof a === 'object') {
      return !Object.keys(b).some(function (key) {
        return !deepIncludes(a[key], b[key]);
      });
    }

    return false;
  }
  function isValidTimeout(value) {
    return typeof value === 'number' && value >= 0 && value !== Infinity;
  }
  function isDocumentVisible() {
    // document global can be unavailable in react native
    if (typeof document === 'undefined') {
      return true;
    }

    return [undefined, 'visible', 'prerender'].includes(document.visibilityState);
  }
  function isOnline() {
    return navigator.onLine === undefined || navigator.onLine;
  }
  function getQueryArgs(arg1, arg2, arg3, arg4) {
    var queryKey;
    var queryFn;
    var config;
    var options;

    if (isPlainObject(arg1)) {
      queryKey = arg1.queryKey;
      queryFn = arg1.queryFn;
      config = arg1.config;
      options = arg2;
    } else if (isPlainObject(arg2)) {
      queryKey = arg1;
      config = arg2;
      options = arg3;
    } else {
      queryKey = arg1;
      queryFn = arg2;
      config = arg3;
      options = arg4;
    }

    config = config || {};

    if (queryFn) {
      config = _extends({}, config, {
        queryFn: queryFn
      });
    }

    return [queryKey, config, options];
  }
  /**
   * This function returns `a` if `b` is deeply equal.
   * If not, it will replace any deeply equal children of `b` with those of `a`.
   * This can be used for structural sharing between JSON values for example.
   */

  function replaceEqualDeep(a, b) {
    if (a === b) {
      return a;
    }

    var array = Array.isArray(a) && Array.isArray(b);

    if (array || isPlainObject(a) && isPlainObject(b)) {
      var aSize = array ? a.length : Object.keys(a).length;
      var bItems = array ? b : Object.keys(b);
      var bSize = bItems.length;
      var copy = array ? [] : {};
      var equalItems = 0;

      for (var i = 0; i < bSize; i++) {
        var key = array ? i : bItems[i];
        copy[key] = replaceEqualDeep(a[key], b[key]);

        if (copy[key] === a[key]) {
          equalItems++;
        }
      }

      return aSize === bSize && equalItems === aSize ? a : copy;
    }

    return b;
  } // Copied from: https://github.com/jonschlinkert/is-plain-object

  function isPlainObject(o) {
    if (!hasObjectPrototype(o)) {
      return false;
    } // If has modified constructor


    var ctor = o.constructor;

    if (typeof ctor === 'undefined') {
      return true;
    } // If has modified prototype


    var prot = ctor.prototype;

    if (!hasObjectPrototype(prot)) {
      return false;
    } // If constructor does not have an Object-specific method


    if (!prot.hasOwnProperty('isPrototypeOf')) {
      return false;
    } // Most likely a plain Object


    return true;
  }

  function hasObjectPrototype(o) {
    return Object.prototype.toString.call(o) === '[object Object]';
  }

  function isCancelable(value) {
    return typeof (value == null ? void 0 : value.cancel) === 'function';
  }
  function isError(value) {
    return value instanceof Error;
  }
  function isCancelledError(value) {
    return value instanceof CancelledError;
  }
  function sleep(timeout) {
    return new Promise(function (resolve) {
      setTimeout(resolve, timeout);
    });
  }
  function getStatusProps(status) {
    return {
      status: status,
      isLoading: status === exports.QueryStatus.Loading,
      isSuccess: status === exports.QueryStatus.Success,
      isError: status === exports.QueryStatus.Error,
      isIdle: status === exports.QueryStatus.Idle
    };
  }
  function createSetHandler(fn) {
    var removePreviousHandler;
    return function (callback) {
      // Unsub the old handler
      if (removePreviousHandler) {
        removePreviousHandler();
      } // Sub the new handler


      removePreviousHandler = callback(fn);
    };
  }
  /**
   * Schedules a microtask.
   * This can be useful to schedule state updates after rendering.
   */

  function scheduleMicrotask(callback) {
    Promise.resolve().then(callback).catch(function (error) {
      return setTimeout(function () {
        throw error;
      });
    });
  }

  // Default to a dummy "batch" implementation that just runs the callback
  var batchedUpdates = function batchedUpdates(callback) {
    callback();
  }; // Allow injecting another batching function later


  function setBatchedUpdates(fn) {
    batchedUpdates = fn;
  } // Supply a getter just to skip dealing with ESM bindings

  function getBatchedUpdates() {
    return batchedUpdates;
  }

  // CONFIG
  var defaultQueryKeySerializerFn = function defaultQueryKeySerializerFn(queryKey) {
    try {
      var arrayQueryKey = Array.isArray(queryKey) ? queryKey : [queryKey];
      var queryHash = stableStringify(arrayQueryKey);
      arrayQueryKey = JSON.parse(queryHash);
      return [queryHash, arrayQueryKey];
    } catch (_unused) {
      throw new Error('A valid query key is required!');
    }
  };
  /**
   * Config merging strategy
   *
   * When using hooks the config will be merged in the following order:
   *
   * 1. These defaults.
   * 2. Defaults from the hook query cache.
   * 3. Combined defaults from any config providers in the tree.
   * 4. Query/mutation config provided to the hook.
   *
   * When using a query cache directly the config will be merged in the following order:
   *
   * 1. These defaults.
   * 2. Defaults from the query cache.
   * 3. Query/mutation config provided to the query cache method.
   */

  var DEFAULT_CONFIG = {
    queries: {
      cacheTime: 5 * 60 * 1000,
      enabled: true,
      notifyOnStatusChange: true,
      queryFn: function queryFn() {
        return Promise.reject();
      },
      queryKeySerializerFn: defaultQueryKeySerializerFn,
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      retry: 3,
      retryDelay: function retryDelay(attemptIndex) {
        return Math.min(1000 * Math.pow(2, attemptIndex), 30000);
      },
      staleTime: 0,
      structuralSharing: true
    }
  };
  function getDefaultReactQueryConfig() {
    return {
      queries: _extends({}, DEFAULT_CONFIG.queries),
      mutations: _extends({}, DEFAULT_CONFIG.mutations)
    };
  }
  function mergeReactQueryConfigs(a, b) {
    return {
      shared: _extends({}, a.shared, b.shared),
      queries: _extends({}, a.queries, b.queries),
      mutations: _extends({}, a.mutations, b.mutations)
    };
  }
  function getResolvedQueryConfig(queryCache, queryKey, contextConfig, config) {
    var queryCacheConfig = queryCache.getDefaultConfig();

    var resolvedConfig = _extends({}, DEFAULT_CONFIG.queries, queryCacheConfig == null ? void 0 : queryCacheConfig.shared, queryCacheConfig == null ? void 0 : queryCacheConfig.queries, contextConfig == null ? void 0 : contextConfig.shared, contextConfig == null ? void 0 : contextConfig.queries, config);

    var result = resolvedConfig.queryKeySerializerFn(queryKey);
    resolvedConfig.queryCache = queryCache;
    resolvedConfig.queryHash = result[0];
    resolvedConfig.queryKey = result[1];
    return resolvedConfig;
  }
  function isResolvedQueryConfig(config) {
    return Boolean(config.queryHash);
  }
  function getResolvedMutationConfig(queryCache, contextConfig, config) {
    var queryCacheConfig = queryCache.getDefaultConfig();
    return _extends({}, DEFAULT_CONFIG.mutations, queryCacheConfig == null ? void 0 : queryCacheConfig.shared, queryCacheConfig == null ? void 0 : queryCacheConfig.mutations, contextConfig == null ? void 0 : contextConfig.shared, contextConfig == null ? void 0 : contextConfig.mutations, config);
  }

  // CLASS
  var NotifyManager = /*#__PURE__*/function () {
    function NotifyManager() {
      this.queue = [];
      this.transactions = 0;
    }

    var _proto = NotifyManager.prototype;

    _proto.batch = function batch(callback) {
      this.transactions++;
      var result = callback();
      this.transactions--;

      if (!this.transactions) {
        this.flush();
      }

      return result;
    };

    _proto.schedule = function schedule(notify) {
      if (this.transactions) {
        this.queue.push(notify);
      } else {
        scheduleMicrotask(function () {
          notify();
        });
      }
    };

    _proto.flush = function flush() {
      var queue = this.queue;
      this.queue = [];

      if (queue.length) {
        scheduleMicrotask(function () {
          var batchedUpdates = getBatchedUpdates();
          batchedUpdates(function () {
            queue.forEach(function (notify) {
              notify();
            });
          });
        });
      }
    };

    return NotifyManager;
  }(); // SINGLETON

  var notifyManager = new NotifyManager();

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
      this.listener = listener || noop;
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
      this.config = isResolvedQueryConfig(config) ? config : this.config.queryCache.getResolvedQueryConfig(this.config.queryKey, config);
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
      return this.currentQuery.fetchMore(fetchMoreVariable, options, this.config).catch(noop);
    };

    _proto.fetch = function fetch() {
      var _DEFAULT_CONFIG$queri;

      // Never try to fetch if no query function has been set
      if (this.config.queryFn === ((_DEFAULT_CONFIG$queri = DEFAULT_CONFIG.queries) == null ? void 0 : _DEFAULT_CONFIG$queri.queryFn)) {
        return Promise.resolve(this.currentResult.data);
      }

      return this.currentQuery.fetch(undefined, this.config).catch(noop);
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

      if (isServer) {
        return;
      }

      this.clearStaleTimeout();

      if (this.isStale || !isValidTimeout(this.config.staleTime)) {
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

      if (isServer) {
        return;
      }

      this.clearRefetchInterval();

      if (!this.config.enabled || !isValidTimeout(this.config.refetchInterval)) {
        return;
      }

      this.refetchIntervalId = setInterval(function () {
        if (_this2.config.refetchIntervalInBackground || isDocumentVisible()) {
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
          status = exports.QueryStatus.Success;
          data = placeholderData;
          isPlaceholderData = true;
        }
      }

      this.currentResult = _extends({}, getStatusProps(status), {
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
      notifyManager.batch(function () {
        // First trigger the configuration callbacks
        if (options.onSuccess) {
          if (onSuccess) {
            notifyManager.schedule(function () {
              onSuccess(currentResult.data);
            });
          }

          if (onSettled) {
            notifyManager.schedule(function () {
              onSettled(currentResult.data, null);
            });
          }
        } else if (options.onError) {
          if (onError) {
            notifyManager.schedule(function () {
              onError(currentResult.error);
            });
          }

          if (onSettled) {
            notifyManager.schedule(function () {
              onSettled(undefined, currentResult.error);
            });
          }
        } // Then trigger the listener


        if (options.listener && listener) {
          notifyManager.schedule(function () {
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

  function _empty() {}

  var ActionType = {
    Failed: 0,
    Fetch: 1,
    Success: 2,
    Error: 3,
    Invalidate: 4
  };

  // CLASS
  function _awaitIgnored(value, direct) {
    if (!direct) {
      return value && value.then ? value.then(_empty) : Promise.resolve();
    }
  }

  function _invoke(body, then) {
    var result = body();

    if (result && result.then) {
      return result.then(then);
    }

    return then(result);
  }

  function _await(value, then, direct) {
    if (direct) {
      return then ? then(value) : value;
    }

    if (!value || !value.then) {
      value = Promise.resolve(value);
    }

    return then ? value.then(then) : value;
  }

  function _catch(body, recover) {
    try {
      var result = body();
    } catch (e) {
      return recover(e);
    }

    if (result && result.then) {
      return result.then(void 0, recover);
    }

    return result;
  }

  function _async(f) {
    return function () {
      for (var args = [], i = 0; i < arguments.length; i++) {
        args[i] = arguments[i];
      }

      try {
        return Promise.resolve(f.apply(this, args));
      } catch (e) {
        return Promise.reject(e);
      }
    };
  }

  var Query = /*#__PURE__*/function () {
    function Query(config) {
      this.config = config;
      this.queryKey = config.queryKey;
      this.queryHash = config.queryHash;
      this.queryCache = config.queryCache;
      this.cacheTime = config.cacheTime;
      this.observers = [];
      this.state = getDefaultState(config);
      this.scheduleGc();
    }

    var _proto = Query.prototype;

    _proto.updateConfig = function updateConfig(config) {
      this.config = config;
      this.cacheTime = Math.max(this.cacheTime, config.cacheTime);
    };

    _proto.dispatch = function dispatch(action) {
      var _this = this;

      this.state = queryReducer(this.state, action);
      notifyManager.batch(function () {
        _this.observers.forEach(function (observer) {
          observer.onQueryUpdate(action);
        });

        _this.queryCache.notifyGlobalListeners(_this);
      });
    };

    _proto.scheduleGc = function scheduleGc() {
      var _this2 = this;

      if (isServer) {
        return;
      }

      this.clearGcTimeout();

      if (this.observers.length > 0 || !isValidTimeout(this.cacheTime)) {
        return;
      }

      this.gcTimeout = setTimeout(function () {
        _this2.remove();
      }, this.cacheTime);
    };

    _proto.cancel = function cancel(silent) {
      var promise = this.promise;

      if (promise && this.cancelFetch) {
        this.cancelFetch(silent);
        return promise.then(noop).catch(noop);
      }

      return Promise.resolve(undefined);
    };

    _proto.continue = function _continue() {
      var _this$continueFetch;

      (_this$continueFetch = this.continueFetch) == null ? void 0 : _this$continueFetch.call(this);
    };

    _proto.clearTimersObservers = function clearTimersObservers() {
      this.observers.forEach(function (observer) {
        observer.clearTimers();
      });
    };

    _proto.clearGcTimeout = function clearGcTimeout() {
      if (this.gcTimeout) {
        clearTimeout(this.gcTimeout);
        this.gcTimeout = undefined;
      }
    };

    _proto.setData = function setData(updater, options) {
      var _this$config$isDataEq, _this$config;

      var prevData = this.state.data; // Get the new data

      var data = functionalUpdate(updater, prevData); // Structurally share data between prev and new data if needed

      if (this.config.structuralSharing) {
        data = replaceEqualDeep(prevData, data);
      } // Use prev data if an isDataEqual function is defined and returns `true`


      if ((_this$config$isDataEq = (_this$config = this.config).isDataEqual) == null ? void 0 : _this$config$isDataEq.call(_this$config, prevData, data)) {
        data = prevData;
      } // Try to determine if more data can be fetched


      var canFetchMore = hasMorePages(this.config, data); // Set data and mark it as cached

      this.dispatch({
        type: ActionType.Success,
        data: data,
        canFetchMore: canFetchMore,
        updatedAt: options == null ? void 0 : options.updatedAt
      });
    }
    /**
     * @deprecated
     */
    ;

    _proto.clear = function clear() {
      Console.warn('react-query: clear() has been deprecated, please use remove() instead');
      this.remove();
    };

    _proto.remove = function remove() {
      this.queryCache.removeQuery(this);
    };

    _proto.destroy = function destroy() {
      this.clearGcTimeout();
      this.clearTimersObservers();
      this.cancel();
    };

    _proto.isActive = function isActive() {
      return this.observers.some(function (observer) {
        return observer.config.enabled;
      });
    };

    _proto.isStale = function isStale() {
      return this.state.isInvalidated || this.state.status !== exports.QueryStatus.Success || this.observers.some(function (observer) {
        return observer.getCurrentResult().isStale;
      });
    };

    _proto.isStaleByTime = function isStaleByTime(staleTime) {
      if (staleTime === void 0) {
        staleTime = 0;
      }

      return this.state.isInvalidated || this.state.status !== exports.QueryStatus.Success || this.state.updatedAt + staleTime <= Date.now();
    };

    _proto.onInteraction = function onInteraction(type) {
      // Execute the first observer which is enabled,
      // stale and wants to refetch on this interaction.
      var staleObserver = this.observers.find(function (observer) {
        var config = observer.config;

        var _observer$getCurrentR = observer.getCurrentResult(),
            isStale = _observer$getCurrentR.isStale;

        return config.enabled && (type === 'focus' && (config.refetchOnWindowFocus === 'always' || config.refetchOnWindowFocus && isStale) || type === 'online' && (config.refetchOnReconnect === 'always' || config.refetchOnReconnect && isStale));
      });

      if (staleObserver) {
        staleObserver.fetch();
      } // Continue any paused fetch


      this.continue();
    }
    /**
     * @deprectated
     */
    ;

    _proto.subscribe = function subscribe(listener) {
      var observer = new QueryObserver(this.config);
      observer.subscribe(listener);
      return observer;
    };

    _proto.subscribeObserver = function subscribeObserver(observer) {
      this.observers.push(observer); // Stop the query from being garbage collected

      this.clearGcTimeout();
    };

    _proto.unsubscribeObserver = function unsubscribeObserver(observer) {
      this.observers = this.observers.filter(function (x) {
        return x !== observer;
      });

      if (!this.observers.length) {
        // If the transport layer does not support cancellation
        // we'll let the query continue so the result can be cached
        if (this.isTransportCancelable) {
          this.cancel();
        }

        this.scheduleGc();
      }
    };

    _proto.invalidate = function invalidate() {
      if (!this.state.isInvalidated) {
        this.dispatch({
          type: ActionType.Invalidate
        });
      }
    }
    /**
     * @deprectated
     */
    ;

    _proto.refetch = function refetch(options, config) {
      var promise = this.fetch(undefined, config);

      if (!(options == null ? void 0 : options.throwOnError)) {
        promise = promise.catch(noop);
      }

      return promise;
    }
    /**
     * @deprectated
     */
    ;

    _proto.fetchMore = function fetchMore(fetchMoreVariable, options, config) {
      return this.fetch({
        fetchMore: {
          fetchMoreVariable: fetchMoreVariable,
          previous: (options == null ? void 0 : options.previous) || false
        }
      }, config);
    };

    _proto.fetch = function fetch(options, config) {
      try {
        var _exit2 = false;

        var _this4 = this;

        return _invoke(function () {
          if (_this4.promise) {
            return function () {
              if ((options == null ? void 0 : options.fetchMore) && _this4.state.data) {
                // Silently cancel current fetch if the user wants to fetch more
                return _awaitIgnored(_this4.cancel(true));
              } else {
                // Return current promise if we are already fetching
                _exit2 = true;
                return _this4.promise;
              }
            }();
          }
        }, function (_result2) {
          if (_exit2) return _result2;

          // Update config if passed, otherwise the config from the last execution is used
          if (config) {
            _this4.updateConfig(config);
          }

          config = _this4.config; // Get the query function params

          var filter = config.queryFnParamsFilter;
          var params = filter ? filter(_this4.queryKey) : _this4.queryKey;
          _this4.promise = _async(function () {
            return _catch(function () {
              var data;
              return _invoke(function () {
                if (config.infinite) {
                  return _await(_this4.startInfiniteFetch(config, params, options), function (_this4$startInfiniteF) {
                    data = _this4$startInfiniteF;
                  });
                } else {
                  return _await(_this4.startFetch(config, params, options), function (_this4$startFetch) {
                    data = _this4$startFetch;
                  });
                }
              }, function () {
                // Set success state
                _this4.setData(data); // Cleanup


                delete _this4.promise; // Return data

                return data;
              });
            }, function (error) {
              // Set error state if needed
              if (!(isCancelledError(error) && error.silent)) {
                _this4.dispatch({
                  type: ActionType.Error,
                  error: error
                });
              } // Log error


              if (!isCancelledError(error)) {
                Console.error(error);
              } // Cleanup


              delete _this4.promise; // Propagate error

              throw error;
            });
          })();
          return _this4.promise;
        });
      } catch (e) {
        return Promise.reject(e);
      }
    };

    _proto.startFetch = function startFetch(config, params, _options) {
      // Create function to fetch the data
      var fetchData = function fetchData() {
        return config.queryFn.apply(config, params);
      }; // Set to fetching state if not already in it


      if (!this.state.isFetching) {
        this.dispatch({
          type: ActionType.Fetch
        });
      } // Try to fetch the data


      return this.tryFetchData(config, fetchData);
    };

    _proto.startInfiniteFetch = function startInfiniteFetch(config, params, options) {
      var fetchMore = options == null ? void 0 : options.fetchMore;

      var _ref = fetchMore || {},
          previous = _ref.previous,
          fetchMoreVariable = _ref.fetchMoreVariable;

      var isFetchingMore = fetchMore ? previous ? 'previous' : 'next' : false;
      var prevPages = this.state.data || []; // Create function to fetch a page

      var fetchPage = _async(function (pages, prepend, cursor) {
        var lastPage = getLastPage(pages, prepend);

        if (typeof cursor === 'undefined' && typeof lastPage !== 'undefined' && config.getFetchMore) {
          cursor = config.getFetchMore(lastPage, pages);
        }

        return !Boolean(cursor) && typeof lastPage !== 'undefined' ? pages : _await(config.queryFn.apply(config, params.concat([cursor])), function (page) {
          return prepend ? [page].concat(pages) : [].concat(pages, [page]);
        });
      }); // Create function to fetch the data


      var fetchData = function fetchData() {
        if (isFetchingMore) {
          return fetchPage(prevPages, previous, fetchMoreVariable);
        } else if (!prevPages.length) {
          return fetchPage([]);
        } else {
          var promise = fetchPage([]);

          for (var i = 1; i < prevPages.length; i++) {
            promise = promise.then(fetchPage);
          }

          return promise;
        }
      }; // Set to fetching state if not already in it


      if (!this.state.isFetching || this.state.isFetchingMore !== isFetchingMore) {
        this.dispatch({
          type: ActionType.Fetch,
          isFetchingMore: isFetchingMore
        });
      } // Try to get the data


      return this.tryFetchData(config, fetchData);
    };

    _proto.tryFetchData = function tryFetchData(config, fn) {
      var _this5 = this;

      return new Promise(function (outerResolve, outerReject) {
        var resolved = false;
        var continueLoop;
        var cancelTransport;

        var done = function done() {
          resolved = true;
          delete _this5.cancelFetch;
          delete _this5.continueFetch;
          delete _this5.isTransportCancelable; // End loop if currently paused

          continueLoop == null ? void 0 : continueLoop();
        };

        var resolve = function resolve(value) {
          done();
          outerResolve(value);
        };

        var reject = function reject(value) {
          done();
          outerReject(value);
        }; // Create callback to cancel this fetch


        _this5.cancelFetch = function (silent) {
          reject(new CancelledError(silent));
          cancelTransport == null ? void 0 : cancelTransport();
        }; // Create callback to continue this fetch


        _this5.continueFetch = function () {
          continueLoop == null ? void 0 : continueLoop();
        }; // Create loop function


        var run = _async(function () {
          return _catch(function () {
            // Execute query
            var promiseOrValue = fn(); // Check if the transport layer support cancellation

            if (isCancelable(promiseOrValue)) {
              cancelTransport = function cancelTransport() {
                try {
                  promiseOrValue.cancel();
                } catch (_unused) {}
              };

              _this5.isTransportCancelable = true;
            } // Await data


            return _await(promiseOrValue, function (_promiseOrValue) {
              resolve(_promiseOrValue);
            });
          }, function (error) {
            // Stop if the fetch is already resolved
            if (resolved) {
              return;
            } // Do we need to retry the request?


            var failureCount = _this5.state.failureCount;
            var retry = config.retry,
                retryDelay = config.retryDelay;
            var shouldRetry = retry === true || failureCount < retry || typeof retry === 'function' && retry(failureCount, error);

            if (!shouldRetry) {
              // We are done if the query does not need to be retried
              reject(error);
              return;
            } // Increase the failureCount


            _this5.dispatch({
              type: ActionType.Failed
            }); // Delay


            return _await(sleep(functionalUpdate(retryDelay, failureCount) || 0), function () {
              // Pause retry if the document is not visible or when the device is offline
              return _invoke(function () {
                if (!isDocumentVisible() || !isOnline()) {
                  return _awaitIgnored(new Promise(function (continueResolve) {
                    continueLoop = continueResolve;
                  }));
                }
              }, function () {
                if (!resolved) {
                  run();
                }
              }); // Try again if not resolved yet
            });
          });
        }); // Start loop


        run();
      });
    };

    return Query;
  }();

  function getLastPage(pages, previous) {
    return previous ? pages[0] : pages[pages.length - 1];
  }

  function hasMorePages(config, pages, previous) {
    if (config.infinite && config.getFetchMore && Array.isArray(pages)) {
      return Boolean(config.getFetchMore(getLastPage(pages, previous), pages));
    }
  }

  function getDefaultState(config) {
    var data = typeof config.initialData === 'function' ? config.initialData() : config.initialData;
    var status = typeof data !== 'undefined' ? exports.QueryStatus.Success : config.enabled ? exports.QueryStatus.Loading : exports.QueryStatus.Idle;
    return {
      canFetchMore: hasMorePages(config, data),
      data: data,
      error: null,
      failureCount: 0,
      isFetching: status === exports.QueryStatus.Loading,
      isFetchingMore: false,
      isInitialData: true,
      isInvalidated: false,
      status: status,
      updateCount: 0,
      updatedAt: Date.now()
    };
  }

  function queryReducer(state, action) {
    var _action$updatedAt;

    switch (action.type) {
      case ActionType.Failed:
        return _extends({}, state, {
          failureCount: state.failureCount + 1
        });

      case ActionType.Fetch:
        return _extends({}, state, {
          failureCount: 0,
          isFetching: true,
          isFetchingMore: action.isFetchingMore || false,
          status: typeof state.data !== 'undefined' ? exports.QueryStatus.Success : exports.QueryStatus.Loading
        });

      case ActionType.Success:
        return _extends({}, state, {
          canFetchMore: action.canFetchMore,
          data: action.data,
          error: null,
          failureCount: 0,
          isFetching: false,
          isFetchingMore: false,
          isInitialData: false,
          isInvalidated: false,
          status: exports.QueryStatus.Success,
          updateCount: state.updateCount + 1,
          updatedAt: (_action$updatedAt = action.updatedAt) != null ? _action$updatedAt : Date.now()
        });

      case ActionType.Error:
        return _extends({}, state, {
          error: action.error,
          failureCount: state.failureCount + 1,
          isFetching: false,
          isFetchingMore: false,
          status: exports.QueryStatus.Error,
          throwInErrorBoundary: true,
          updateCount: state.updateCount + 1
        });

      case ActionType.Invalidate:
        return _extends({}, state, {
          isInvalidated: true
        });

      default:
        return state;
    }
  }

  // CLASS
  var QueryCache = /*#__PURE__*/function () {
    function QueryCache(config) {
      this.config = config || {};
      this.globalListeners = [];
      this.queries = {};
      this.queriesArray = [];
      this.isFetching = 0;
    }

    var _proto = QueryCache.prototype;

    _proto.notifyGlobalListeners = function notifyGlobalListeners(query) {
      var _this = this;

      this.isFetching = this.getQueries().reduce(function (acc, q) {
        return q.state.isFetching ? acc + 1 : acc;
      }, 0);
      notifyManager.batch(function () {
        _this.globalListeners.forEach(function (listener) {
          notifyManager.schedule(function () {
            listener(_this, query);
          });
        });
      });
    };

    _proto.getDefaultConfig = function getDefaultConfig() {
      return this.config.defaultConfig;
    };

    _proto.getResolvedQueryConfig = function getResolvedQueryConfig$1(queryKey, config) {
      return getResolvedQueryConfig(this, queryKey, undefined, config);
    };

    _proto.subscribe = function subscribe(listener) {
      var _this2 = this;

      this.globalListeners.push(listener);
      return function () {
        _this2.globalListeners = _this2.globalListeners.filter(function (x) {
          return x !== listener;
        });
      };
    };

    _proto.clear = function clear(options) {
      this.removeQueries();

      if (options == null ? void 0 : options.notify) {
        this.notifyGlobalListeners();
      }
    };

    _proto.getQueries = function getQueries(predicate, options) {
      var anyKey = predicate === true || typeof predicate === 'undefined';

      if (anyKey && !options) {
        return this.queriesArray;
      }

      var predicateFn;

      if (typeof predicate === 'function') {
        predicateFn = predicate;
      } else {
        var _ref = options || {},
            exact = _ref.exact,
            active = _ref.active,
            stale = _ref.stale;

        var resolvedConfig = this.getResolvedQueryConfig(predicate);

        predicateFn = function predicateFn(query) {
          // Check query key if needed
          if (!anyKey) {
            if (exact) {
              // Check if the query key matches exactly
              if (query.queryHash !== resolvedConfig.queryHash) {
                return false;
              }
            } else {
              // Check if the query key matches partially
              if (!deepIncludes(query.queryKey, resolvedConfig.queryKey)) {
                return false;
              }
            }
          } // Check active state if needed


          if (typeof active === 'boolean' && query.isActive() !== active) {
            return false;
          } // Check stale state if needed


          if (typeof stale === 'boolean' && query.isStale() !== stale) {
            return false;
          }

          return true;
        };
      }

      return this.queriesArray.filter(predicateFn);
    };

    _proto.getQuery = function getQuery(predicate) {
      return this.getQueries(predicate, {
        exact: true
      })[0];
    };

    _proto.getQueryByHash = function getQueryByHash(queryHash) {
      return this.queries[queryHash];
    };

    _proto.getQueryData = function getQueryData(predicate) {
      var _this$getQuery;

      return (_this$getQuery = this.getQuery(predicate)) == null ? void 0 : _this$getQuery.state.data;
    };

    _proto.removeQuery = function removeQuery(query) {
      if (this.queries[query.queryHash]) {
        query.destroy();
        delete this.queries[query.queryHash];
        this.queriesArray = this.queriesArray.filter(function (x) {
          return x !== query;
        });
        this.notifyGlobalListeners(query);
      }
    };

    _proto.removeQueries = function removeQueries(predicate, options) {
      var _this3 = this;

      this.getQueries(predicate, options).forEach(function (query) {
        _this3.removeQuery(query);
      });
    };

    _proto.cancelQueries = function cancelQueries(predicate, options) {
      this.getQueries(predicate, options).forEach(function (query) {
        query.cancel();
      });
    }
    /**
     * @return Promise resolving to an array with the invalidated queries.
     */
    ;

    _proto.invalidateQueries = function invalidateQueries(predicate, options) {
      var queries = this.getQueries(predicate, options);
      notifyManager.batch(function () {
        queries.forEach(function (query) {
          query.invalidate();
        });
      });

      var _ref2 = options || {},
          _ref2$refetchActive = _ref2.refetchActive,
          refetchActive = _ref2$refetchActive === void 0 ? true : _ref2$refetchActive,
          _ref2$refetchInactive = _ref2.refetchInactive,
          refetchInactive = _ref2$refetchInactive === void 0 ? false : _ref2$refetchInactive;

      if (!refetchInactive && !refetchActive) {
        return Promise.resolve(queries);
      }

      var refetchOptions = _extends({}, options);

      if (refetchActive && !refetchInactive) {
        refetchOptions.active = true;
      } else if (refetchInactive && !refetchActive) {
        refetchOptions.active = false;
      }

      var promise = this.refetchQueries(predicate, refetchOptions);

      if (!(options == null ? void 0 : options.throwOnError)) {
        promise = promise.catch(function () {
          return queries;
        });
      }

      return promise.then(function () {
        return queries;
      });
    }
    /**
     * @return Promise resolving to an array with the refetched queries.
     */
    ;

    _proto.refetchQueries = function refetchQueries(predicate, options) {
      var _this4 = this;

      var promises = [];
      notifyManager.batch(function () {
        _this4.getQueries(predicate, options).forEach(function (query) {
          var promise = query.fetch().then(function () {
            return query;
          });

          if (!(options == null ? void 0 : options.throwOnError)) {
            promise = promise.catch(function () {
              return query;
            });
          }

          promises.push(promise);
        });
      });
      return Promise.all(promises);
    };

    _proto.resetErrorBoundaries = function resetErrorBoundaries() {
      this.getQueries().forEach(function (query) {
        query.state.throwInErrorBoundary = false;
      });
    };

    _proto.buildQuery = function buildQuery(queryKey, config) {
      var resolvedConfig = this.getResolvedQueryConfig(queryKey, config);
      var query = this.getQueryByHash(resolvedConfig.queryHash);

      if (!query) {
        query = this.createQuery(resolvedConfig);
      }

      return query;
    };

    _proto.createQuery = function createQuery(config) {
      var query = new Query(config); // A frozen cache does not add new queries to the cache

      if (!this.config.frozen) {
        this.queries[query.queryHash] = query;
        this.queriesArray.push(query);
        this.notifyGlobalListeners(query);
      }

      return query;
    } // Parameter syntax
    ;

    // Implementation
    _proto.fetchQuery = function fetchQuery(arg1, arg2, arg3) {
      var _getQueryArgs = getQueryArgs(arg1, arg2, arg3),
          queryKey = _getQueryArgs[0],
          config = _getQueryArgs[1];

      var resolvedConfig = this.getResolvedQueryConfig(queryKey, _extends({
        // https://github.com/tannerlinsley/react-query/issues/652
        retry: false
      }, config));
      var query = this.getQueryByHash(resolvedConfig.queryHash);

      if (!query) {
        query = this.createQuery(resolvedConfig);
      }

      if (!query.isStaleByTime(config.staleTime)) {
        return Promise.resolve(query.state.data);
      }

      return query.fetch(undefined, resolvedConfig);
    } // Parameter syntax with optional prefetch options
    ;

    // Implementation
    _proto.prefetchQuery = function prefetchQuery(arg1, arg2, arg3, arg4) {
      if (isPlainObject(arg2) && (arg2.hasOwnProperty('throwOnError') || arg2.hasOwnProperty('force'))) {
        arg4 = arg2;
        arg2 = undefined;
        arg3 = undefined;
      }

      var _getQueryArgs2 = getQueryArgs(arg1, arg2, arg3, arg4),
          queryKey = _getQueryArgs2[0],
          config = _getQueryArgs2[1],
          options = _getQueryArgs2[2];

      if (options == null ? void 0 : options.force) {
        config.staleTime = 0;
      }

      var promise = this.fetchQuery(queryKey, config);

      if (!(options == null ? void 0 : options.throwOnError)) {
        promise = promise.catch(noop);
      }

      return promise;
    } // Parameter syntax
    ;

    // Implementation
    _proto.watchQuery = function watchQuery(arg1, arg2, arg3) {
      var _getQueryArgs3 = getQueryArgs(arg1, arg2, arg3),
          queryKey = _getQueryArgs3[0],
          config = _getQueryArgs3[1];

      var resolvedConfig = this.getResolvedQueryConfig(queryKey, config);
      return new QueryObserver(resolvedConfig);
    };

    _proto.setQueryData = function setQueryData(queryKey, updater, config) {
      this.buildQuery(queryKey, config).setData(updater);
    };

    return QueryCache;
  }();
  var defaultQueryCache = new QueryCache({
    frozen: isServer
  });
  var queryCaches = [defaultQueryCache];
  /**
   * @deprecated
   */

  function makeQueryCache(config) {
    return new QueryCache(config);
  }
  function onVisibilityOrOnlineChange(type) {
    if (isDocumentVisible() && isOnline()) {
      notifyManager.batch(function () {
        queryCaches.forEach(function (queryCache) {
          queryCache.getQueries().forEach(function (query) {
            query.onInteraction(type);
          });
        });
      });
    }
  }

  var setFocusHandler = createSetHandler(function () {
    return onVisibilityOrOnlineChange('focus');
  });
  setFocusHandler(function (handleFocus) {
    var _window;

    if (isServer || !((_window = window) == null ? void 0 : _window.addEventListener)) {
      return;
    } // Listen to visibillitychange and focus


    window.addEventListener('visibilitychange', handleFocus, false);
    window.addEventListener('focus', handleFocus, false);
    return function () {
      // Be sure to unsubscribe if a new handler is set
      window.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('focus', handleFocus);
    };
  });

  var setOnlineHandler = createSetHandler(function () {
    return onVisibilityOrOnlineChange('online');
  });
  setOnlineHandler(function (handleOnline) {
    var _window;

    if (isServer || !((_window = window) == null ? void 0 : _window.addEventListener)) {
      return;
    } // Listen to online


    window.addEventListener('online', handleOnline, false);
    return function () {
      // Be sure to unsubscribe if a new handler is set
      window.removeEventListener('online', handleOnline);
    };
  });

  var unstable_batchedUpdates = ReactDOM.unstable_batchedUpdates;

  var queryCacheContext = /*#__PURE__*/React.createContext(defaultQueryCache);
  var useQueryCache = function useQueryCache() {
    return React.useContext(queryCacheContext);
  };
  var ReactQueryCacheProvider = function ReactQueryCacheProvider(_ref) {
    var queryCache = _ref.queryCache,
        children = _ref.children;
    var resolvedQueryCache = React.useMemo(function () {
      return queryCache || new QueryCache();
    }, [queryCache]);
    React.useEffect(function () {
      queryCaches.push(resolvedQueryCache);
      return function () {
        // remove the cache from the active list
        var i = queryCaches.indexOf(resolvedQueryCache);

        if (i > -1) {
          queryCaches.splice(i, 1);
        } // if the resolvedQueryCache was created by us, we need to tear it down


        if (queryCache == null) {
          resolvedQueryCache.clear({
            notify: false
          });
        }
      };
    }, [resolvedQueryCache, queryCache]);
    return /*#__PURE__*/React.createElement(queryCacheContext.Provider, {
      value: resolvedQueryCache
    }, children);
  };

  var configContext = /*#__PURE__*/React.createContext(undefined);
  function useContextConfig() {
    return React.useContext(configContext);
  }
  var ReactQueryConfigProvider = function ReactQueryConfigProvider(_ref) {
    var config = _ref.config,
        children = _ref.children;
    var parentConfig = useContextConfig();
    var mergedConfig = React.useMemo(function () {
      return parentConfig ? mergeReactQueryConfigs(parentConfig, config) : config;
    }, [config, parentConfig]);
    return /*#__PURE__*/React.createElement(configContext.Provider, {
      value: mergedConfig
    }, children);
  };

  function createValue() {
    var _isReset = false;
    return {
      clearReset: function clearReset() {
        _isReset = false;
      },
      reset: function reset() {
        _isReset = true;
      },
      isReset: function isReset() {
        return _isReset;
      }
    };
  }

  var context = /*#__PURE__*/React.createContext(createValue()); // HOOK

  var useErrorResetBoundary = function useErrorResetBoundary() {
    return React.useContext(context);
  }; // COMPONENT

  var ReactQueryErrorResetBoundary = function ReactQueryErrorResetBoundary(_ref) {
    var children = _ref.children;
    var value = React.useMemo(function () {
      return createValue();
    }, []);
    return /*#__PURE__*/React.createElement(context.Provider, {
      value: value
    }, typeof children === 'function' ? children(value) : children);
  };

  function useIsMounted() {
    var mountedRef = React.useRef(false);
    var isMounted = React.useCallback(function () {
      return mountedRef.current;
    }, []);
    React[isServer ? 'useEffect' : 'useLayoutEffect'](function () {
      mountedRef.current = true;
      return function () {
        mountedRef.current = false;
      };
    }, []);
    return isMounted;
  }
  function useMountedCallback(callback) {
    var isMounted = useIsMounted();
    return React.useCallback(function () {
      if (isMounted()) {
        return callback.apply(void 0, arguments);
      }
    }, [callback, isMounted]);
  }

  function useIsFetching() {
    var isMounted = useIsMounted();
    var queryCache = useQueryCache();

    var _React$useState = React.useState(queryCache.isFetching),
        isFetching = _React$useState[0],
        setIsFetching = _React$useState[1];

    React.useEffect(function () {
      return queryCache.subscribe(function () {
        if (isMounted()) {
          setIsFetching(queryCache.isFetching);
        }
      });
    }, [queryCache, setIsFetching, isMounted]);
    return isFetching;
  }

  function _await$1(value, then, direct) {
    if (direct) {
      return then ? then(value) : value;
    }

    if (!value || !value.then) {
      value = Promise.resolve(value);
    }

    return then ? value.then(then) : value;
  }

  var ActionType$1 = {
    Reset: 0,
    Loading: 1,
    Resolve: 2,
    Reject: 3
  };

  // HOOK
  function _catch$1(body, recover) {
    try {
      var result = body();
    } catch (e) {
      return recover(e);
    }

    if (result && result.then) {
      return result.then(void 0, recover);
    }

    return result;
  }

  function _async$1(f) {
    return function () {
      for (var args = [], i = 0; i < arguments.length; i++) {
        args[i] = arguments[i];
      }

      try {
        return Promise.resolve(f.apply(this, args));
      } catch (e) {
        return Promise.reject(e);
      }
    };
  }

  function getDefaultState$1() {
    return _extends({}, getStatusProps(exports.QueryStatus.Idle), {
      data: undefined,
      error: null
    });
  }

  function mutationReducer(state, action) {
    switch (action.type) {
      case ActionType$1.Reset:
        return getDefaultState$1();

      case ActionType$1.Loading:
        return _extends({}, getStatusProps(exports.QueryStatus.Loading), {
          data: undefined,
          error: null
        });

      case ActionType$1.Resolve:
        return _extends({}, getStatusProps(exports.QueryStatus.Success), {
          data: action.data,
          error: null
        });

      case ActionType$1.Reject:
        return _extends({}, getStatusProps(exports.QueryStatus.Error), {
          data: undefined,
          error: action.error
        });

      default:
        return state;
    }
  }

  function useMutation(mutationFn, config) {
    if (config === void 0) {
      config = {};
    }

    var cache = useQueryCache();
    var contextConfig = useContextConfig(); // Get resolved config

    var resolvedConfig = getResolvedMutationConfig(cache, contextConfig, config);

    var _React$useReducer = React.useReducer(mutationReducer, null, getDefaultState$1),
        state = _React$useReducer[0],
        unsafeDispatch = _React$useReducer[1];

    var dispatch = useMountedCallback(unsafeDispatch);
    var latestMutationRef = React.useRef();
    var latestMutationFnRef = React.useRef(mutationFn);
    latestMutationFnRef.current = mutationFn;
    var latestConfigRef = React.useRef(resolvedConfig);
    latestConfigRef.current = resolvedConfig;
    var mutate = React.useCallback(_async$1(function (variables, mutateConfig) {
      if (mutateConfig === void 0) {
        mutateConfig = {};
      }

      var latestConfig = latestConfigRef.current;
      var mutationId = uid();
      latestMutationRef.current = mutationId;

      var isLatest = function isLatest() {
        return latestMutationRef.current === mutationId;
      };

      var snapshotValue;
      return _catch$1(function () {
        dispatch({
          type: ActionType$1.Loading
        });
        return _await$1(latestConfig.onMutate == null ? void 0 : latestConfig.onMutate(variables), function (_latestConfig$onMutat) {
          snapshotValue = _latestConfig$onMutat;
          var latestMutationFn = latestMutationFnRef.current;
          return _await$1(latestMutationFn(variables), function (data) {
            if (isLatest()) {
              dispatch({
                type: ActionType$1.Resolve,
                data: data
              });
            }

            return _await$1(latestConfig.onSuccess == null ? void 0 : latestConfig.onSuccess(data, variables), function () {
              return _await$1(mutateConfig.onSuccess == null ? void 0 : mutateConfig.onSuccess(data, variables), function () {
                return _await$1(latestConfig.onSettled == null ? void 0 : latestConfig.onSettled(data, null, variables), function () {
                  return _await$1(mutateConfig.onSettled == null ? void 0 : mutateConfig.onSettled(data, null, variables), function () {
                    return data;
                  });
                });
              });
            });
          });
        });
      }, function (error) {
        Console.error(error);
        return _await$1(latestConfig.onError == null ? void 0 : latestConfig.onError(error, variables, snapshotValue), function () {
          return _await$1(mutateConfig.onError == null ? void 0 : mutateConfig.onError(error, variables, snapshotValue), function () {
            return _await$1(latestConfig.onSettled == null ? void 0 : latestConfig.onSettled(undefined, error, variables, snapshotValue), function () {
              return _await$1(mutateConfig.onSettled == null ? void 0 : mutateConfig.onSettled(undefined, error, variables, snapshotValue), function () {
                if (isLatest()) {
                  dispatch({
                    type: ActionType$1.Reject,
                    error: error
                  });
                }

                if (mutateConfig.throwOnError || latestConfig.throwOnError) {
                  throw error;
                }
              });
            });
          });
        });
      });
    }), [dispatch]);
    React.useEffect(function () {
      var latestConfig = latestConfigRef.current;
      var suspense = latestConfig.suspense,
          useErrorBoundary = latestConfig.useErrorBoundary;

      if ((useErrorBoundary || suspense) && state.error) {
        throw state.error;
      }
    }, [state.error]);
    var reset = React.useCallback(function () {
      dispatch({
        type: ActionType$1.Reset
      });
    }, [dispatch]);

    var result = _extends({}, state, {
      reset: reset
    });

    return [mutate, result];
  }

  function useBaseQuery(queryKey, config) {
    var _React$useReducer = React.useReducer(function (c) {
      return c + 1;
    }, 0),
        rerender = _React$useReducer[1];

    var isMounted = useIsMounted();
    var cache = useQueryCache();
    var contextConfig = useContextConfig();
    var errorResetBoundary = useErrorResetBoundary(); // Get resolved config

    var resolvedConfig = getResolvedQueryConfig(cache, queryKey, contextConfig, config); // Create query observer

    var observerRef = React.useRef();
    var firstRender = !observerRef.current;
    var observer = observerRef.current || new QueryObserver(resolvedConfig);
    observerRef.current = observer; // Subscribe to the observer

    React.useEffect(function () {
      errorResetBoundary.clearReset();
      return observer.subscribe(function () {
        if (isMounted()) {
          rerender();
        }
      });
    }, [isMounted, observer, rerender, errorResetBoundary]); // Update config

    if (!firstRender) {
      observer.updateConfig(resolvedConfig);
    }

    var result = observer.getCurrentResult(); // Handle suspense

    if (resolvedConfig.suspense || resolvedConfig.useErrorBoundary) {
      var query = observer.getCurrentQuery();

      if (result.isError && !errorResetBoundary.isReset() && query.state.throwInErrorBoundary) {
        throw result.error;
      }

      if (resolvedConfig.enabled && resolvedConfig.suspense && !result.isSuccess) {
        errorResetBoundary.clearReset();
        var unsubscribe = observer.subscribe();
        throw observer.fetch().finally(unsubscribe);
      }
    }

    return result;
  }

  // Implementation
  function useQuery(arg1, arg2, arg3) {
    var _getQueryArgs = getQueryArgs(arg1, arg2, arg3),
        queryKey = _getQueryArgs[0],
        config = _getQueryArgs[1];

    return useBaseQuery(queryKey, config);
  }

  // as the query key changes, we keep the results from the
  // last query and use them as placeholder data in the next one
  // We DON'T use it as initial data though. That's important
  // TYPES

  // Implementation
  function usePaginatedQuery(arg1, arg2, arg3) {
    var _getQueryArgs = getQueryArgs(arg1, arg2, arg3),
        queryKey = _getQueryArgs[0],
        config = _getQueryArgs[1];

    var result = useBaseQuery(queryKey, _extends({
      keepPreviousData: true
    }, config));
    return _extends({}, result, {
      resolvedData: result.data,
      latestData: result.isPreviousData ? undefined : result.data
    });
  }

  // Implementation
  function useInfiniteQuery(arg1, arg2, arg3) {
    var _getQueryArgs = getQueryArgs(arg1, arg2, arg3),
        queryKey = _getQueryArgs[0],
        config = _getQueryArgs[1];

    return useBaseQuery(queryKey, _extends({}, config, {
      infinite: true
    }));
  }

  setBatchedUpdates(unstable_batchedUpdates);

  exports.CancelledError = CancelledError;
  exports.QueryCache = QueryCache;
  exports.ReactQueryCacheProvider = ReactQueryCacheProvider;
  exports.ReactQueryConfigProvider = ReactQueryConfigProvider;
  exports.ReactQueryErrorResetBoundary = ReactQueryErrorResetBoundary;
  exports.getDefaultReactQueryConfig = getDefaultReactQueryConfig;
  exports.isCancelledError = isCancelledError;
  exports.isError = isError;
  exports.makeQueryCache = makeQueryCache;
  exports.queryCache = defaultQueryCache;
  exports.queryCaches = queryCaches;
  exports.setBatchedUpdates = setBatchedUpdates;
  exports.setConsole = setConsole;
  exports.setFocusHandler = setFocusHandler;
  exports.setOnlineHandler = setOnlineHandler;
  exports.useErrorResetBoundary = useErrorResetBoundary;
  exports.useInfiniteQuery = useInfiniteQuery;
  exports.useIsFetching = useIsFetching;
  exports.useMutation = useMutation;
  exports.usePaginatedQuery = usePaginatedQuery;
  exports.useQuery = useQuery;
  exports.useQueryCache = useQueryCache;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=react-query.development.js.map
