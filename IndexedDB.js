<script id='1516596'>

/**
 * functionality for local storage of fields between browser sessions.
 * store in the integra module
 */
function indexedDBLib() {
	if (integra.indexedDB===undefined || integra.indexedDB===null) {
		integra.indexedDB = {
			
			/************************************************************************************************
			 * local fields and constants
			 ************************************************************************************************/
			
			initialised: false,		//whether this library has been initialised before
			idb: null,				//the indexedDB system
			db: null,				//the database to use
			version: 1,				//the version of the database being used
			openRequest: null,		//the callback promise for database operations
			viewID: null,			//where in database to store this applications local data
			
			
			/************************************************************************************************
			 * local initialisation functions
			 ************************************************************************************************/
			
			init: function(params) {
				//console.log('integra.indexedDB.init() called with', params);
				//execute code everytime here

				//make sure all other init code following is not run if already run before
				if (integra.indexedDB.initialised!==undefined && integra.indexedDB.initialised) return;
				integra.indexedDB.initialised = true;
				
				//execute code only first time here
				
				//console.log('indexedDB', window.indexedDB);
				if (!('indexedDB' in window)) {
					console.warn('This browser doesn\'t support IndexedDB');
					return;
				}
				
				integra.indexedDB.idb = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || 
				window.msIndexedDB;
				if (!('indexedDB' in window)) {
					console.warn('This browser doesn\'t support IndexedDB');
					return;
				}
				 
				window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || 
				window.msIDBTransaction;
				window.IDBKeyRange = window.IDBKeyRange || 
				window.webkitIDBKeyRange || window.msIDBKeyRange;
				
				//now open the database for transactions
				integra.indexedDB.viewID = integra.indexedDB.getCurrentViewID();
				integra.indexedDB.openStore('viewid', integra.indexedDB.viewID, function(result) {
					//console.log('init() openStore result', result);
				});
			},
			
			/**
			 * will return the viewid of this application.
			 */
			getCurrentViewID: function() {
				let viewID = null;
				let queryString = window.location.search;
				queryString = queryString.substr(1); //remove ? char
				let params = queryString.split('&');
				let values = null;
				for (let i=0, len=params.length; i<len; i++) {
					values = params[i].split('=');
					if (values[0]=='viewid') {
						viewID = values[1] || null;
					}
				}
				return viewID;
			},
			
			/**
			 * will open the current version of the database and check the schema for the store.
			 * the database schema will be upgraded if the store is missing.
			 * param String databaseName - the name of the database to use.
			 * param String storeName - the name of the store to use. (viewid)
			 * param Function callback - the result and version of the database opening.
			 */
			openStore: function(databaseName, storeName, callback) {
				//console.log('integra.indexedDB.openStore() called with database=' + databaseName + ' store=' + storeName);
				try {
					//get version and check if schema contains store with this viewid
					integra.indexedDB.getCurrentVersion(databaseName, storeName, function(result) {
						if (result && result.version) {
							//console.log('integra.indexedDB.openStore() received version' + result.version);
							integra.indexedDB.version = result.version;
							//check if schema contains store with this viewid
							let storeNames = integra.indexedDB.db.objectStoreNames;
							//console.log('found store names', storeNames);
							let match = false;
							for (let id in storeNames) {
								if (!(isNaN(id))) {
									if (storeName==storeNames[id]) {
										match = true;
										break;
									}
								}
							}
							
							//add store to schema if missing
							if (match) {
								//console.log('integra.indexedDB.openStore() matching store found');
								if (callback) {
									callback({ result: true, message: 'openStore store aleady valid' });
								}
							} else {
								//console.log('integra.indexedDB.openStore() no matching store found - creating...');
								integra.indexedDB.createStore(databaseName, integra.indexedDB.viewID, function(result2) {
									if (callback) {
										callback(result2);
									}
								});
							}
						} else {
							console.warn('!integra.indexedDB.openStore() invalid version.');
							//invalid version
							if (callback) {
								callback({ error: event, result: false, message: 'openStore invalid version' });
							}
						}
					});
					
				} catch (e) {
					console.error('openStore() error',  e);
					if (callback) {
						callback({ error: event, result: false, message: 'openStore overall error' });
					}
				}	
			},
			
			/**
			 * will open the current version of the database.
			 * param String databaseName - the name of the database to use.
			 * param String storeName - the name of the store to use. (viewid)
			 * param Function callback - the result and version of the database opening.
			 */
			getCurrentVersion: function(databaseName, storeName, callback) {
				//console.log('integra.indexedDB.getCurrentVersion() called with database=' + databaseName + ' store=' + storeName);
				try {
					if (integra.indexedDB && integra.indexedDB.idb) {
						if (integra.indexedDB.db) {
							integra.indexedDB.db.close();	
						}
						//open current default version
						let openRequest = integra.indexedDB.idb.open(databaseName);	//, version);
						
						openRequest.onerror = function(event) {
							console.error('integra.indexedDB.idb.getCurrentVersion onerror called', event, 'databaseName=' + databaseName);
							if (callback) {
								callback({ error: event, version: null });
							}
						};
						
						openRequest.onsuccess = function(event) {
							//console.log('integra.indexedDB.idb.getCurrentVersion onsuccess called', event);
							integra.indexedDB.db = openRequest.result;	//event.target.result;
							//console.log('_integra.indexedDB success:', integra.indexedDB.db, 'version=' + integra.indexedDB.db.version);
							integra.indexedDB.version = openRequest.result.version;
							if (callback) {
								callback({ version: openRequest.result.version });
							}
						};
					}
				} catch (e) {
					console.error('getCurrentVersion() error',  e);
					if (callback) {
						callback({ error: event, version: null });
					}
				}
			},
			
			/**
			 * will create a store within the database. version will be updated.
			 * param String databaseName - the name of the database to use.
			 * param String storeName - the name of the store to use. (viewid)
			 * param Function callback - the result and version of the database opening.
			 */
			createStore: function(databaseName, storeName, callback) {
				//console.log('integra.indexedDB.createStore() called with database=' + databaseName + ' store=' + storeName);
				try {
					if (integra.indexedDB && integra.indexedDB.idb) {
						if (integra.indexedDB.db) {
							integra.indexedDB.db.close();	
						}
						
						//upgrade the database version to add new schema with store
						let openRequest = integra.indexedDB.idb.open(databaseName, integra.indexedDB.version + 1);
						
						openRequest.onerror = function(event) {
							console.error('integra.indexedDB.idb.createStore onerror called', event, 'databaseName=' + databaseName);
							if (callback) {
								callback({ error: event, version: null, store: null });
							}
						};
						
						openRequest.onsuccess = function(event) {
							integra.indexedDB.db = openRequest.result;	//event.target.result;
							//console.log('_integra.indexedDB success:', integra.indexedDB.db, 'version=' + integra.indexedDB.db.version);
							integra.indexedDB.version = openRequest.result.version;
							
							if (callback) {
								callback({ version: integra.indexedDB.version, store: null });
							}
						};
						
						openRequest.onupgradeneeded = function(event) {
							integra.indexedDB.db = event.target.result;
							//console.log('_integra.indexedDB onupgradeneeded:', integra.indexedDB.db, 'version=' + integra.indexedDB.db.version);
							integra.indexedDB.version = openRequest.result.version;
							
							//!! n.b only possible within onupgradeneeded transaction !!
							let store = integra.indexedDB.db.createObjectStore(storeName, {
								keyPath: 'id',
								//autoIncrement: true
							});
							
							if (callback) {
								callback({ version: integra.indexedDB.version, store: store });
							}
						};
					}
				} catch (e) {
					console.error('createStore() error',  e);
					if (callback) {
						callback({ error: event, version: null });
					}
				}
			},			

			/**
			 * will store a new record in the database store.
			 * must have id in recordObj as unique key
			 * e.g add('673008', { id: '1', name: 'John', age: 30 });
			 * param String storeName - the name of the object store to add to.
			 * param Object recordObj - the record to store.
			 * param Function callback - where to send the result aync
			 */
			add: function(storeName, recordObj, callback) {
				//console.log('integra.indexedDB.add() called with store=' + storeName, recordObj);
				if (integra.indexedDB.db && storeName && recordObj) {
					try {
						let tx = integra.indexedDB.db.transaction(storeName, 'readwrite');
						tx.oncomplete = function() {
							//console.log('database modification complete');	
						};
						tx.onerror = function() {
							console.warn('database modification error');	
						};
						
						let store = tx.objectStore(storeName);
						//console.log('store.indexNames', store.indexNames);
						//console.log('store.keyPath', store.keyPath);
						//console.log('store.name', store.name);
						//console.log('store.transactions', store.transactions);
						//console.log('store.autoIncrement', store.autoIncrement);
						
						let request = store.add(recordObj);	//transaction will close by itself
						request.onerror = function(event) {
							console.warn('integra.indexedDB.add error', event.target.error.name);
							if (callback) { callback({ error: event.target.error.name }); }
						};
						request.onsuccess = function(event) {
							//console.log('integra.indexedDB.add successful', event);
							if (callback) { callback({ result: event.type }); }
						};
					} catch (e) {
						console.error('!integra.indexedDB.add() error', e);
						if (callback) { callback({ error: e }); }
					}
				}
			},
			
			/**
			 * will update an existing record in the database store.
			 * must have id in recordObj as unique key
			 * e.g update('673008', { id: '1', name: 'John', age: 30 });
			 * param Object recordObj - the record to store.
			 * param Function callback - where to send the result aync
			 */
			update: function(storeName, recordObj, callback) {
				///console.log('integra.indexedDB.update() called with store=' + storeName, recordObj);
				if (integra.indexedDB.db && storeName && recordObj) {
					try {
						let tx = integra.indexedDB.db.transaction(storeName, 'readwrite');
						tx.oncomplete = function() {
							//.log('database modification complete');	
						};
						tx.onerror = function() {
							console.warn('database modification error');	
						};
						
						let store = tx.objectStore(storeName);
						//console.log('store.indexNames', store.indexNames);
						//console.log('store.keyPath', store.keyPath);
						//console.log('store.name', store.name);
						//console.log('store.transactions', store.transactions);
						///console.log('store.autoIncrement', store.autoIncrement);
						
						let request = store.put(recordObj);	//transaction will close by itself
						request.onerror = function(event) {
							console.warn('integra.indexedDB.update error', event.target.error.name);
							if (callback) { callback({ error: event.target.error.name }); }
						};
						request.onsuccess = function(event) {
							//console.log('integra.indexedDB.update successful', event);
							if (callback) { callback({ result: event.type }); }
						};
					} catch (e) {
						console.error('!integra.indexedDB.update() error', e);
						if (callback) { callback({ error: e }); }
					}
				}
			},
			
			/**
			 * will get a record from the database store.
			 * e.g get('673008', '1');
			 * param String storeName - the name of the object store to read from.
			 * param String id - the unique key to look for.
			 * param Function callback - where to send the result aync
			 */
			get: function(storeName, id, callback) {
				//console.log('integra.indexedDB.get() called with ' + storeName + ' id=' + id);
				if (integra.indexedDB.db && storeName && id) {
					try {
						let tx = integra.indexedDB.db.transaction(storeName, 'readonly');
						tx.oncomplete = function() {
							//console.log('database modification complete');	
						};
						tx.onerror = function() {
							console.warn('database modification error');	
						};
							
						let store = tx.objectStore(storeName);
						//console.log('store.indexNames', store.indexNames);
						//console.log('store.keyPath', store.keyPath);
						//console.log('store.name', store.name);
						//console.log('store.transactions', store.transactions);
						//console.log('store.autoIncrement', store.autoIncrement);
							
						let request = store.get(id);	//transaction will close by itself
						request.onerror = function(event) {
							console.warn('integra.indexedDB.get error', event.target.error.name);
							if (callback) { callback({ error: event.target.error.name }); }
						};
						request.onsuccess = function(event) {
							//console.log('integra.indexedDB.get successful', event, request.result);
							if (callback) { callback({ result: request.result }); }
						};
					} catch (e) {
						console.error('!integra.indexedDB.get() error', e);
						if (callback) { callback({ error: e }); }
					}
				}
			},
			
			/**
			 * will get all records from the database store.
			 * e.g getAll('673008');
			 * !!!!! getAll() not supported by IE !!!! need to use cursors
			 * param String storeName - the name of the object store to read from.
			 * param Function callback - where to send the result aync
			 */
			getAll: function(storeName, callback) {
				//console.log('integra.indexedDB.getAll() called with ' + storeName);
				if (integra.indexedDB.db && storeName) {
					try {
						let tx = integra.indexedDB.db.transaction(storeName, 'readonly');
						tx.oncomplete = function() {
							//console.log('database modification complete');	
						};
						tx.onerror = function() {
							console.warn('database modification error');	
						};
						
						let store = tx.objectStore(storeName);
						//console.log('store.indexNames', store.indexNames);
						//console.log('store.keyPath', store.keyPath);
						//console.log('store.name', store.name);
						//console.log('store.transactions', store.transactions);
						//console.log('store.autoIncrement', store.autoIncrement);
						
						let resultObj = [];
						store.openCursor().onsuccess = function(event) {
							//console.log('store.openCursor().onsuccess() called with', event);
							let cursor = event.target.result;
							if (cursor) {
								//console.log(cursor.value);
								resultObj.push(cursor.value);
								cursor.continue();
							} else {
								//console.log('result', resultObj);
								if (callback) { callback({ result: resultObj }); }
							}
						};
						
						/* does not work in ie
						let request = store.getAll();	//transaction will close by itself
						request.onerror = function(event) {
							console.warn('integra.indexedDB.getAll error', event.target.error.name);
						};
						request.onsuccess = function(event) {
							console.log('integra.indexedDB.getAll successful', event);
						};
						*/
					} catch (e) {
						console.error('!integra.indexedDB.getAll() error', e);
						if (callback) { callback({ error: e }); }
					}
				}
			},
			
			/**
			 * will delete a record from the database store.
			 * e.g delete('673008', '1');
			 * param String storeName - the name of the object store to read from.
			 * param String id - the unique key.
			 * param Function callback - where to send the result aync
			 */
			delete: function(storeName, id, callback) {
				//console.log('integra.indexedDB.get() called with ' + storeName + ' id=' + id);
				if (integra.indexedDB.db && storeName && id) {
					try {
						let tx = integra.indexedDB.db.transaction(storeName, 'readwrite');
						let store = tx.objectStore(storeName);
						let request = store.delete(id);		//transaction will close by itself
						request.onerror = function(event) {
							console.warn('integra.indexedDB.delete error', event.target.error.name);
						};
						request.onsuccess = function(event) {
							//console.log('integra.indexedDB.delete successful', event);
						};
					} catch (e) {
						console.error('!integra.indexedDB.delete() error', e);
						if (callback) { callback({ error: e }); }
					}
				}
			},
			
			/**
			 * will clear the database store.
			 * param String storeName - the name of the object store to read from.
			 * param Function callback - where to send the result aync
			 */
			clear: function(storeName, callback) {
				//console.log('integra.indexedDB.clear() called');
				if (integra.indexedDB.db && storeName) {
					try {
						let tx = integra.indexedDB.db.transaction(storeName, 'readwrite');
						let store = tx.objectStore(storeName);
						let request = store.clear();		//transaction will close by itself
						request.onerror = function(event) {
							console.warn('integra.indexedDB.clear error', event.target.error.name);
						};
						request.onsuccess = function(event) {
							//console.log('integra.indexedDB.clear successful', event);
						};
					} catch (e) {
						console.error('!integra.indexedDB.clear() error', e);
						if (callback) { callback({ error: e }); }
					}
				}
			},

			/**
			 * will add a new value to indexedDB using the current viewID as store name.
			 * param Object dataObj - the object value to store. (must include id field)
			 * param Function callback - the async function to return result of operation to.
			 */
			addByViewID: function(dataObj, callback) {
				if (integra.indexedDB.viewID && dataObj) {
					//console.log('addByViewID() called with dataObj=', dataObj, ' into ' + integra.indexedDB.viewID);
					integra.indexedDB.add(integra.indexedDB.viewID, dataObj, callback);
				}
			},
			
			/**
			 * will update a value in indexedDB using the current viewID as store name.
			 * param Object dataObj - the object value to store. (must include id field)
			 * param Function callback - the async function to return result of operation to.
			 */
			updateByViewID: function(dataObj, callback) {
				if (integra.indexedDB.viewID && dataObj) {
					//console.log('updateByViewID() called with dataObj=', dataObj, ' into ' + integra.indexedDB.viewID);
					integra.indexedDB.update(integra.indexedDB.viewID, dataObj, callback);
				}
			},
			
			/**
			 * will get a value from indexedDB using the current viewID as store name.
			 * param Function callback - the async function to return result of operation to.
			 */
			readByViewID: function(id, callback) {
				if (integra.indexedDB.viewID && id) {
					//console.log('readByViewID() called with id=' + id + ' from ' + integra.indexedDB.viewID);
					integra.indexedDB.get(integra.indexedDB.viewID, id, callback);
				}
			},
			
			/**
			 * will get all values from indexedDB as an array using the current viewID as store name.
			 * param Function callback - the async function to return result of operation to.
			 */
			readAllByViewID: function(callback) {
				if (integra.indexedDB.viewID) {
					//console.log('readAllByViewID() called from ' + integra.indexedDB.viewID);
					integra.indexedDB.getAll(integra.indexedDB.viewID, callback);
				}
			},
			
			/**
			 * will remove a value from indexedDB using the current viewID as store name.
			 * param string id - the key of the object value to delete.
			 * param Function callback - the async function to return result of operation to.
			 */
			deleteByViewID: function(id, callback) {
				if (integra.indexedDB.viewID && id) {
					//console.log('deleteByViewID() called with id=' + id + ' from ' + integra.indexedDB.viewID);
					integra.indexedDB.delete(integra.indexedDB.viewID, id, callback);
				}
			},
			
			/**
			 * will remove a store from indexedDB using the current viewID as store name.
			 * param Function callback - the async function to return result of operation to.
			 */
			clearByViewID: function(callback) {
				if (integra.indexedDB.viewID) {
					//console.log('clearByViewID() called from ' + integra.indexedDB.viewID);
					integra.indexedDB.clear(integra.indexedDB.viewID, callback);
				}
			},


		};
		
		//now run the app, if not already initialised
		if (integra.indexedDB.initialised===undefined || !integra.indexedDB.initialised) {
			integra.indexedDB.init();
		}
		
	} else {
		//indexedDB module already initialised
	}
}

indexedDBLib();
</script>
