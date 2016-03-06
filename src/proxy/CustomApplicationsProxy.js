/**
 * Custom Applications SDK for Mazda Connect Infotainment System
 *
 * A mini framework that allows to write custom applications for the Mazda Connect Infotainment System
 * that includes an easy to use abstraction layer to the JCI system.
 *
 * Written by Andreas Schwarz (http://github.com/flyandi/mazda-custom-applications-sdk)
 * Copyright (c) 2016. All rights reserved.
 *
 * WARNING: The installation of this application requires modifications to your Mazda Connect system.
 * If you don't feel comfortable performing these changes, please do not attempt to install this. You might
 * be ending up with an unusuable system that requires reset by your Dealer. You were warned!
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of the
 * GNU General Public License as published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even
 * the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
 * License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see http://www.gnu.org/licenses/
 *
 */

/**
 * (Global Error Reporting)
 */

window.onerror = function() {
	console.error(arguments);
}


/**
 * (CustomApplicationsProxy)
 *
 * Registers itself between the JCI system and CustomApplication runtime.
 */

var CustomApplicationsProxyInstance = false;

var CustomApplicationsProxy = (function(){


	function CustomApplicationsProxy() {

		// singelton
		if(CustomApplicationsProxyInstance) return this = CustomApplicationsProxyInstance;

		// assing debug flag
		this._debug = false;

		// assign bootstrap flag
		this._bootstrapped = false;

		// assign attributes for configuration
		this._systemAppId = 'system',
		this._systemAppCategory = 'Applications',

		this._proxyAppName = 'vdt',
		this._proxyAppContext = 'DriveChartDetails',
		this._proxyMmuiEvent = 'SelectDriveRecord',

		this._targetAppName = 'custom',
		this._targetAppContext = 'Surface',

		// add event handler
		if(window.opera) {
			window.opera.addEventListener('AfterEvent.load', function (e) {
				this.bootstrap();
			}.bind(this));
		} else {
			setTimeout(function() {
				this.bootstrap();
			}.bind(this), 2000);
		}
	}

	/**
	 * Prototype declaration
	 */

	CustomApplicationsProxy.prototype = {

		/**
		 * (bootstrap)
		 *
		 * Bootstraps the JCI system
		 */

		 bootstrap: function() {

			// verify that core objects are available
			if(!this._bootstrapped && typeof(framework) === "object") {

				// check app
				if(framework._currentAppUiaId === this._systemAppId && !this._bootstrapped) {

					// retrieve system app
					var systemApp = framework.getAppInstance(this._systemAppId),
						result = false;

					// verify bootstrapping - yeah long name
					if(typeof(systemApp) === "object") {

						console.warn("-------------------------------------");
						console.warn("Initializing CustomApplications Proxy");
						console.warn("-------------------------------------");

						// overwrite list2 handler
						systemApp._contextTable[this.systemAppCategory].controlProperties.List2Ctrl.selectCallback = this.menuItemSelectCallback.bind(systemApp);

						// for usb changes
						if(typeof(systemApp.overwriteStatusMenuUSBAudioMsgHandler) == "undefined") {
							systemApp.overwriteStatusMenuUSBAudioMsgHandler = systemApp._StatusMenuUSBAudioMsgHandler;
							systemApp._StatusMenuUSBAudioMsgHandler = this.StatusMenuUSBAudioMsgHandler.bind(systemApp);
						}

						// overwrite framework route handler
						if(typeof(framework.overwriteRouteMmmuiMsg) == "undefined") {
							framework.overwriteRouteMmmuiMsg = framework.routeMmuiMsg;
							framework.routeMmuiMsg = this.routeMmuiMsg.bind(framework);
						}

						// ovewrite framework MMUI sender
						if(typeof(framework.overwriteSendEventToMmui) == "undefined") {
							framework.overwriteSendEventToMmui = framework.sendEventToMmui;
							framework.sendEventToMmui = this.sendEventToMmui.bind(framework);
						}

						// assign template transition
						framework.transitionsObj._genObj._TEMPLATE_CATEGORIES_TABLE.SurfaceTmplt = 'Detail with UMP';

						// set to strap - if everything fails - no harm is done :-)
						window.CustomApplicationsProxyBootstrapped = true;

						// only attach if we have successfully bootstrapped the apps
						setTimeout(function() {
							CustomApplicationsProxy.prepareCustomApplications();
						}, 20); 
					}
				}
			}
		},


		/**
		 * (Overwrite) menuItemSelectCallback
		 */

		menuItemSelectCallback: function(listCtrlObj, appData, params) {

		    var proxy = CustomApplicationsProxy;

		 	if(appData.mmuiEvent == "SelectCustomApplication") {

				// exit if handler is not available
				if(typeof(CustomApplicationsHandler) != "undefined") {

					// launch app
					if(CustomApplicationsHandler.launch(appData)) {

						// clone app data
						appData = JSON.parse(JSON.stringify(appData));

						// set app data
						appData.appName = proxy.proxyAppName;
						appData.mmuiEvent = proxy.proxyMmuiEvent;
					}
		  	 	}
		  	}

			// pass to original handler
			this._menuItemSelectCallback(listCtrlObj, appData, params);
		},


		/**
		 * (Overwrite) sendEventToMmui
		 */

		sendEventToMmui: function(uiaId, eventId, params, fromVui) {

			var proxy = CustomApplicationsProxy,
				currentUiaId = this.getCurrentApp(),
				currentContextId = this.getCurrCtxtId();

			// proxy overwrites
		    if(currentUiaId == proxy.targetAppName) {
		    	currentUiaId = this.proxyAppName;
		    	currentContextId = this.proxyAppContext;
		    }

		    console.log(uiaId, eventId, params, fromVui);

		    // pass to original handler
		    this.overwriteSendEventToMmui(uiaId, eventId, params, fromVui, currentUiaId, currentContextId);
		},


		/**
		 * (Overwrite) routeMmuiMsg
		 */

		routeMmuiMsg: function(jsObject) {

			var proxy = CustomApplicationsProxy,
				jsObjectModified = jsObject;

			// validate routing message
			switch(jsObjectModified.msgType) {

				// magic switch
				case 'ctxtChg':
					if(jsObjectModified.uiaId == proxy.proxyAppName) {
						jsObjectModified.uiaId = proxy.targetAppName;
						jsObjectModified.ctxtId = proxy.targetAppContext;
					}
					break;

				// check if our proxy app is in the focus stack
				case 'focusStack':

					if(jsObjectModified.appIdList && jsObjectModified.appIdList.length) {
						for(var i = 0; i < jsObjectModified.appIdList.length; i++) {
							var appId = jsObjectModified.appIdList[i];
							if(appId.id == proxy.proxyAppName) {
								appId.id = proxy.targetAppName;
							}
						};
					}

				case 'msg':
				case 'alert':

					if(jsObjectModified.uiaId == proxy.proxyAppName) {
						jsObjectModified.uiaId = proxy.targetAppName;
					}

					break;
				default:
					// do nothing
					break;
			}

			// assign to original jsObject
			jsObject = jsObjectModified;

			// overwrite

			this.overwriteRouteMmmuiMsg(jsObject);
		},


		/**
		 * (Overwrite) StatusMenuUSBAudioMsgHandler
		 */

		StatusMenuUSBAudioMsgHandler: function(msg) {

			// pass to original handler
			this.overwriteStatusMenuUSBAudioMsgHandler(msg);
		},


		/**
		 * (prepareCustomApplications)
		 */

		prepareCustomApplications: function() {

		    this.loadCount = 0;
		    setTimeout(function() {
		        this.loadCustomApplications();
		    }.bind(this), this.debug ? 500 : 15000); // first attempt wait 5s - the system might be booting still anyway

		},


		/**
		 * (loadCustomApplications)
		 */

		loadCustomApplications: function() {

		    try {

		        if(typeof(CustomApplicationsHandler) === "undefined") {

		        	// clear
		        	clearTimeout(this.loadTimer);

		            // try to load the script
		            utility.loadScript("apps/custom/runtime/runtime.js", false, function() {

		            	clearTimeout(this.loadTimer);

		                this.initCustomApplicationsDataList();

		            }.bind(this));

		            // safety timer
		            this.loadTimer = setTimeout(function() {

		                if(typeof(CustomApplicationsHandler) == "undefined") {

		                    this.loadCount = this.loadCount + 1;

		                    // 20 attempts or we forget it - that's almost 3min
		                    if(this.loadCount < 20) {

		                        this.loadCustomApplications();
		                    }
		                }

		            }.bind(this), 10000);

		        }

		    } catch(e) {

		        // if this fails, we won't attempt again because there could be issues with the actual handler
		        setTimeout(function() {

		            this.loadCustomApplications();

		        }.bind(this), 10000);
		    }
		},

		/**
		 * (initCustomApplicationsDataList)
		 */

		initCustomApplicationsDataList: function() {
		    // extend with custom applications

	        if(typeof(CustomApplicationsHandler) != "undefined") {

	            CustomApplicationsHandler.retrieve(function(items) {

	            	var systemApp = framework.getAppInstance(this.systemAppId);

	            	if(systemApp) {

		                items.forEach(function(item) {

		                    systemApp._masterApplicationDataList.items.push(item);

		                    framework.localize._appDicts[this.systemAppId][item.appData.appName.replace(".", "_")] = item.title;

		                    framework.common._contextCategory._contextCategoryTable[item.appData.appName + '.*'] = 'Applications';

		                }.bind(this));
		            }

	            }.bind(this));
	        }
		},
	}

	return CustomApplicationsProxy;

})();


/** EOF **/