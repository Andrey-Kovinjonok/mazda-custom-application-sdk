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
 * (CustomApplication)
 *
 * The main class for applications
 */

var CustomApplication = (function(){

	function CustomApplication(application) {

		this.application = application;
		
		this.__initialize();
	};

	CustomApplication.prototype = {

		storages: {},
		
		/* (initialize) */
		__initialize: function() {

			this.multicontroller = typeof(Multicontroller) != "undefined" ? new Multicontroller(this.handleControllerEvent) : false;

			this.is = CustomApplicationHelpers.is();
			
			this.surface = document.createElement("div");
			this.surface.classList.add("CustomApplicationSurface");
			this.surface.style.display = "none";

			if(backgroundColor = this.getSetting("backgroundColor"))
				this.surface.style.backgroundColor = backgroundColor;

			if(textColor = this.getSetting("textColor"))
				this.surface.style.color = textColor;

			if(this.getSetting('statusbar'))
				this.setStatusbar(true);

			document.body.appendChild(this.surface);

			this.canvas = document.createElement("div");
			this.canvas.classList.add("CustomApplicationCanvas");
			this.surface.appendChild(this.canvas);

			this.__extendApplication();

			this.__created = true;

			if(this.is.fn(this.application.created)) {
				this.application.created();
			}
		},

		/** 
		 * (wakeup)
		 */

		wakeup: function() {

			if(!this.__initialized) {

				if(this.is.fn(this.application.initialize)) {
					this.application.initialize();
				}

				this.__initialized = false;
			}

			if(this.is.fn(this.application.render)) {
				this.application.render();
			}

			this.surface.style.display = "block";
			this.surface.classList.add("visible");

		},


		/**
		 * (sleep)
		 */

		sleep: function() {

			this.canvas.classList.remove("visible");

			setTimeout(function() {
				this.canvas.style.display = "none";
			}.bind(this), 950);
		},


		/**
		 * (terminate)
		 */

		terminate: function() {

			this.sleep();

			document.body.removeChild(this.canvas);

			this.__initialized = false;

			this.__created = false;
		},

		/**
		 * (settings)
		 */

		getSetting: function(name, _default) {
			return this.application.settings[name] ? this.application.settings[name] : (_default ? _default : false);
		},

		/**
		 * (getters)
		 */

		getId: function() {
			return this.id;
		},

		getTitle: function() {
			return this.getSetting('title');
		},

		/**
		 * (setters)
		 */

		setStatusbar: function(visible)  {
			if(visible) {
				this.canvas.classList.add("withStatusBar");
			} else {
				this.canvas.classList.remove("withStatusBar");
			}
		},

		/**
		 * handleControllerEvent
		 */

		handleControllerEvent: function(eventId) {

	        var response = "ignored"; // consumed

	        CustomApplicationLog.debug(this.application.id, "Controller event received", {event: eventId});

	        if(this.is.fn(this.application.controllerEvent)) {
	        	this.application.controllerEvent(eventId);
	        }

	        /*

            switch(eventId) {
                case "select":
                case "left":
                case "right":
                case "down":
                case "up":
                case "cw":
                case "ccw":
                case "lostFocus":
        		case "acceptFocusInit":
		        case "leftStart":
        		case "left":
     		    case "rightStart":
        		case "right":
        		case "selectStart":
            };*/
	        
	        return response;
	    },


	    /**
	     * element
	     */

	    __extendApplication: function() {

	    	var that = this;

	    	this.application.element = function(tag, id, classNames, styles) {

		    	var el = document.createElement(tag);
		    	el.setAttribute("ID", id);
		    	el.setAttribute("CLASS", classNames);

		    	if(that.is.object(styles)) {

		    		CustomApplicationHelpers.iterate(styles, function(key, value) {
		    			el.style[key] = value;
		    		});
		    	}

		    	that.canvas.appendChild(el);

		    	return el;
		    };

	    },
		
	}

	return CustomApplication;
})();