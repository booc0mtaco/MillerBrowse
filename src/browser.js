/**
 * @description Column Browser
 * @author Andrew Holloway aholloway@untropy.net
 * @date 2009-11-24 (revised 2011-03-14)
 * @version 1.2.0
 * @requires prototype.js Uses several objects and extensions provided by Prototype.
 */

/**
 * @class Browser
 * @description This object is the base for the browser object. All columns, and sub-
 * sequently, all column items, exist within this container object. Also,
 * any custom event functions refer to this as 'this' (the base of all the
 * objects within it).
 *
 */
var Browser = Class.create({
    /**
     * @memberOf Browser
     * @constructor Browser
     * @description Initialize the Browser Object with the following fields
     * @param title {string} the title of the widget on-screen
     * @param browserContainer {string} the display element where the widget will be loaded
     * @param autoUpdate {bool} determines whether or not the display is updated automatically
     *              or when requested.
     *
     * @returns nothing (this is called automatically)
     */
    initialize: function(title, browserContainer, autoUpdate) {
        this.browserTitle = title;
        this.containerId = browserContainer;
        this.updateOnChange = autoUpdate;
        this.columns = [];
        this.columnContainerClassSet = new ColumnContainerClassSet();
    },
    /**
     * @memberOf Browser
     * @description Add a column object to the browser. Reset the first/last/none state.
     * @param {Column} columnToAdd  
     *
     * @returns {int} the count of columns in the browser object
     */
    addColumn: function(columnToAdd) {
        var count = this.columns.push(columnToAdd), i = 0;
        
        // Reset all column states
        for (; i < this.columns.length; i++) {
            this.columns[i].setContainerClass(this.columnContainerClassSet.NONE)
        }
        
        // Set the state of the columns
        if (count > 1) {
            this.columns[0].setContainerClass(this.columnContainerClassSet.FIRST)
            this.columns[this.columns.length-1].setContainerClass(this.columnContainerClassSet.LAST)
        } else if (count == 1) {
            this.columns[0].setContainerClass(this.columnContainerClassSet.BOTH)
        } else {
            // Something is wrong; no columns exist after adding one
        }
        
        if (this.autoUpdate) this.updateColumns();
        
        columnToAdd.position = count-1;
        
        return count;
    },
    /**
     * @memberOf Browser
     * @description Gets the values from the columns (that have one) as a hash-type object.
     *
     * @returns {object} hash of all column values
     */
    getColumnValues: function() {
        var i = 0,
            params = {};
        
        for(; i < this.columns.length; i++) {
            if (this.columns[i].value != null) {
                if (!params.hasOwnProperty(this.columns[i].columnContainerId)) {
                    params[this.columns[i].columnContainerId] = 0;
                }
                params[this.columns[i].columnContainerId] = this.columns[i].value;
            }
        }
        
        return params;
    },
    /**
     * @memberOf Browser
     * @description Draws the browser to the screen, in the specified container. It calls
     * update on all dependent items by simply updating each column. Styling handled
     * by adding a 'browser' class to the base DIV, which should exist prior to
     * rendering, or can be ignored.
     *
     * @param {boolean} preserveColumnValues Should we leave the column values in-place.
     * 
     * @returns nothing
     */
    draw: function (preserveColumnValues) {
        
        var container = $(this.containerId);
        
        if (!container.hasClassName("browser"))
            container.addClassName("browser");
            
        container.update();
            
        var h2 = new Element("h2", {"class": "title"});
            h2.update(this.browserTitle);
        
        container.appendChild(h2);
        
        var columnContainer = new Element("ul", {"id": this.containerId+"_columnContainer"});
        
        for(var i = 0; i < this.columns.length; i++) {
            columnContainer.appendChild(this.columns[i].render());
            if (this.columns[i].columnContainerClass == "last") {
                var breaker = new Element("br");
                    breaker.setStyle({clear: "both"});
                columnContainer.appendChild(breaker);
            }
        }
        
        container.appendChild(columnContainer);
        
        if (typeof preserveColumnValues != 'undefined')
            this.updateColumns(preserveColumnValues);
        else
            this.updateColumns(false);
        
        container.setStyle({
           width: ((this.columns.length)*205) + "px" 
        });
        
    },
    /**
     * @memberOf Browser
     * @description This updates the columns separate from the rendering phase, which handles
     * other parts as well as updating the columns. Resets any columns' values.
     *
     * @param {boolean} preserveColumnValues Should we leave the column values in-place.
     *
     * @returns nothing
     */
    updateColumns: function (preserveColumnValues) {
        for(var i = 0; i < this.columns.length; i++) {
            
            if (typeof preserveColumnValues != 'undefined')
                this.columns[i].update({'preserveColumnValues': preserveColumnValues});
            else
                this.columns[i].update({'preserveColumnValues': false});

            this.columns[i].updateComplete();
        }
    }
});

/**
 * @class ColumnContainerClassSet
 * 
 * @description This contains static values for the columns' 'state' class value, so it can be styled properly.
 */
var ColumnContainerClassSet = function() {
    this.FIRST = "first";
    this.LAST = "last";
    this.NONE = "";
    this.BOTH = this.FIRST + " " + this.LAST;
    
    this.ALL_VALUES = [
        this.FIRST,
        this.LAST,
        this.BOTH,
        this.NONE
    ];
};

/**
 * @class Column
 * 
 * @description This object is for the columns, and should be inside the Browser object.
 * Columns have state and labeling information, and lists of items inside them.
 */
var Column = Class.create({
    /**
     * @memberOf Column
     * @description Initialize the column with the following details
     * @constructor
     * @param {String} label the label for the particular column
     * @param {String} columnContainerId A coded name for the column (no spaces, special characters, etc.)
     * @param {boolean} state determines whether the column is enabled or disabled to start
     * @param {String} position is this column supposed to be the first or last column (or both?)
     *
     * @returns nothing
     */
    initialize: function(label, columnContainerId, state) {
        /// draw the default column with no items except a default message if specified
        this.valueName = null;
        this.value = null;
        
        this.isEnabled = state;
        this.label = label + "&#160;";
        this.columnContainerId = columnContainerId;
        
        // Position of the column, set by the browser object when added
        this.position = -1;
        this.scrollTop = 0;
        
        this.items = [];
        
        // This is a sentinel setting for developers. UpdateCompleted needs to
        // run, so this is set when it gets run, or logs an error when it
        // doesn't get executed when onUpdateComplete is used.
        this.isUpdateCompleted = true;
    },
    /**
     * @memberOf Column
     * @description Set the container class (first, last, none, both) for the given column
     * @param {String} toValue The container class value
     *
     * @returns {String} the old container class value
     */
    setContainerClass: function(newClass) {
        var oldValue = this.columnContainerClass;
        this.columnContainerClass = newClass;
        
        return oldValue;
    },
    /**
     * @memberOf Column
     * @description change the label for a given column
     * @param {String} newLabel the label to replace the existing one
     *
     * @returns {String} the old label
     */
    setLabel: function(newLabel) {
        var oldLabel = this.label;
        this.label = newLabel;
        return oldLabel;
    },
    /**
     * @memberOf Column
     * @description Add an item to the given column
     * @param itemToAdd {ColumnItem} the item being added to the Column
     *
     * @returns {int} the number of items in the column
     */
    addItem: function(itemToAdd) {
        itemToAdd.machineName = this.columnContainerId.toLowerCase().replace(/ /g, "_") + "__" + itemToAdd.machineName;
        return this.items.push(itemToAdd);
    },
    /**
     * @memberOf Column
     * @description Remove all items from a Column's list of items
     *
     * @returns {int} the number of items in the Column (which should be zero)
     */
    clearItems: function() {
        // AHFG 3102 : memory leak perhaps? please destroy all the items in the
        // list individually.
        this.items = [];
        this.value = null;
        return this.items.length;
    },
    /**
     * @memberOf Column
     * @description Set the Column to be enabled
     *
     * @returns nothing
     */
    enable: function() {
        this.isEnabled = true;
    },
    /**
     * @memberOf Column
     * @description Set the Column to be disabled
     *
     * @returns nothing
     */
    disable: function() {
        this.isEnabled = false;
    },
    /** 
     * @memberOf Column
     * @description Draws the shell around the list that will be updated. should have the DOM
     * structure like the following:
     *  <li class="${this.isEnabled} list">
     *      <h3>${this.label}</h3>
     *      <ul id="${this.columnContainerId}" class="${this.columnContainerClass}">
     *          ...<!-- ColumnItems for this Column -->
     *      </ul>
     *  </li>
     *
     *  @returns {DOMElement} the outer list item where the contents will be
     */
    render: function() {
        var outerLi = new Element("li", {"class": ((this.isEnabled) ? "enabled-list":"disabled-list")});
        var h3      = new Element("h3").update(this.label);
        var innerUl = new Element("ul", {"id": this.columnContainerId, "class": this.columnContainerClass});
        
        outerLi.appendChild(h3);
        outerLi.appendChild(innerUl);
        
        // Attach an 'onscroll' event to the inner UL, so we can track positions across re-draws
        innerUl.observe('scroll', function(event) {
            this.scrollTop = innerUl.scrollTop;
        }.bindAsEventListener(this));
        
        return outerLi;
    },
    /**
     * @memberOf Column
     * @description This will update the content of the Column's list of ColumnItems. While
     * processing, it will set a loading class, which can be styled appropriately.
     *
     * @param {boolean} preserveColumnValues Should we leave the column values in-place.
     * 
     * Binds 'this' in the specified functions to the Column clicked, and the element receives
     * the event that occurred.
     *
     * @returns nothing
     */
    updateList: function(preserveColumnValues) {
        var myUl = $(this.columnContainerId),
            i = 0;
            myUl.update(),
            num_items = this.items.length;
            
        if (typeof preserveColumnValues != 'undefined' && !preserveColumnValues) {
            this.value = null;
            this.valueName = null;
        }
        
        // Set the label
        $$('#'+this.columnContainerId)[0].previous("h3").update(this.label);
        
        // Update the enabled/disabled state here
        var outerLi = $(this.columnContainerId).up("li");
            outerLi.removeClassName("disabled-list");
            outerLi.removeClassName("enabled-list");
            outerLi.addClassName(((this.isEnabled) ? "enabled-list":"disabled-list"));
        
        for (; i < num_items; i++) {
            var freshlyAddedElement = myUl.appendChild(this.items[i].render());
            
            // By binding to the current item, we can make 'this' refer to the proper
            // column and items. do this to set the selected state, and any other
            // event functions to run.
            // True / False determine if the regular state updating things will run.
            freshlyAddedElement.observe('click', this._bind_func('click', true).bindAsEventListener(this));
            freshlyAddedElement.observe('dblclick', this._bind_func('dblclick', true).bindAsEventListener(this));
            freshlyAddedElement.observe('mouseover', this._bind_func('mouseover', false).bindAsEventListener(this));
            
        }
        
    },
    /**
     * @memberOf Column
     * @description Function used to bind events to new column items. It will do
     * event handling for the browser, then pass it off to the custom or default
     * handler, updating the item at the very end.
     * @param {String} eventName The name of the event to observe and dispatch as a handler
     *
     * @returns {Function} the bound function
     */
    _bind_func: function(eventName, updateElement_p) {
        return function(event) {
            var clicked = Event.element(event);
            for (var i =0; i < this.items.length; i++) {
                if (clicked.id == this.items[i].machineName) {
                    if (updateElement_p) {
                        // Set the column state and value
                        this.items[i].selected = true;
                        this.value = this.items[i].value;
                        this.valueName = this.items[i].name;
                    }
                    
                    // This tricky bit binds the function to 'this' then
                    // immediately runs the result with the event as a
                    // parameter, then passes off to the custom handler.
                    if (typeof this.items[i][eventName+"Handler"] != 'undefined')
                        (this.items[i][eventName+"Handler"].bind(this))(event);
                        
                } else
                    if (updateElement_p)
                        this.items[i].selected = false;
                    
                this.items[i].updateItem();
            }
        };
    },
    /**
     * @memberOf Column
     * @description This will be how the updates are applied to the column. Wraps in a set
     * of functions that allow for callbacks at different stages along the way.
     * @param {Object} definedCallbacks Object containing functions to run at specified points during execution,
     *                                     and other values to use.
     * 
     * @returns nothing
     */
    update: function(definedCallbacks) {
        var myUl = $(this.columnContainerId);
        
        if (typeof definedCallbacks != 'undefined' && typeof definedCallbacks["beforeUpdate"] != 'undefined')
            definedCallbacks["beforeUpdate"]();
            
        // Set the regular update start call
        this.updateStart();
        
        if (typeof definedCallbacks != 'undefined' && typeof definedCallbacks["preserveColumnValues"] != 'undefined') {
            this.updateList(definedCallbacks['preserveColumnValues']);
        } else
            this.updateList();
        
        if (typeof definedCallbacks != 'undefined' && typeof definedCallbacks["onUpdateComplete"] != 'undefined')
            // Use the provided callback (which should call 'updateComplete' somewhere)
            definedCallbacks["onUpdateComplete"]();
            
        else {
            // run the regular update complete function
            this.updateComplete();
        }
    },
    /**
     * @memberOf Column
     * @description This removes the 'browser-loading' class from the specified
     * column. Paired with the update method, which sets the loading class,
     * this can allow AJAX requests to be run asynchronously, and remove the
     * loading class state after it has actually completed.
     *
     * @returns nothing
     */
    updateComplete: function () {
        var myUl = $(this.columnContainerId)
            i = 0;
        myUl.removeClassName("browser-loading");
        
        // Update the scroll position
        $(this.columnContainerId).scrollTop = this.scrollTop;
        
        this.isUpdateCompleted = true;
    },
    /**
     * @memberOf Column
     * @description This function adds the 'bwoser-loading' class to the specified
     * column. Paired with the update method, which updateComplete function, which
     * removes the loading class, this can allow AJAX requests to be run asynchronously.
     *
     * @returns nothing
     */
    updateStart: function () {
        var myUl = $(this.columnContainerId);
        myUl.addClassName("browser-loading");
        this.isUpdateCompleted = false;
    }
});

/**
 * @class ColumnItem
 * @description these items fit inside the columns and contain label, value and function
 * information. When clicked, column items perform various actions, depending
 * on the users' requirements.
 */
var ColumnItem = Class.create({
    /**
     * @memberOf ColumnItem
     * @description Initializes the ColumnItem with the following information
     * @param name {string} the name of the item in the Column
     * @param value {string} the id (or value) associated with the particular ColumnItem
     * @param isPlaceholder {string} determines if the ColumnItem should have content, or is just around for show.
     * @param eventHandlers {object} custom object containing methods to run when the ColumnItem is accessed, based on the action
     *
     * @returns nothing
     */
    initialize: function(name, value, isPlaceholder, eventHandlers) {
        this.name = name;
        
        // Don't store and use this name
        // It's internal and may get mangled along the way.
        this.machineName = name.toLowerCase().replace(/ /g, "_") +"__"+value;

        this.value = value;
        this.description = "";
        this.isEmpty = isPlaceholder;
        this.selected = false;
        
        this.eventHandlers = eventHandlers;
        
        // Assign each event handler to the proper event. Set all missing handlers to null.
        for (eventName in eventHandlers) {
            if (typeof eventHandlers[eventName] != 'undefined') {
                this[eventName+"Handler"] = eventHandlers[eventName];
            } else {
                this[eventName+"Handler"] = null;
            }
        }
    },
    /** 
     * @memberOf ColumnItem
     * @description Sets the placeholder state of the listed ColumnItem
     * @param {boolean} newIsPlaceholder The new placeholder value (true/false)
     *
     * @returns {boolean} The previous value used.
     */
    setIsPlaceholder: function (newIsPlaceholder) {
        var oldValue = this.isEmpty;
        this.isEmpty = newIsPlaceholder;
        return oldValue;
    },
    /**
     * @memberOf ColumnItem
     * @description This adds description text to the ColumnItem. It can be of any length,
     * or an empty string.
     *
     * @param {String} descriptionText The text used to describe the column item.
     *
     * @returns nothing
     */
    setDescription: function(descriptionText) {
        this.description = descriptionText;
    },
    /**
     * @memberOf ColumnItem
     * @description This draws the ColumnItem
     *
     * @returns {DOMElement} the DOM structure for the new ColumnItem
     */
    render: function() {
        var newLi = new Element("li", {"id": this.machineName, "title": this.description});
        if (this.isEmpty) newLi.addClassName("empty");
        newLi.update(this.name);
        (this.selected) ? newLi.addClassName("picked") : newLi.removeClassName("picked");
        
        return newLi;
    },
    /**
     * @memberOf ColumnItem
     * @description Find, then update, the ColumnItem by its generated machineName
     *
     * @returns nothing
     */
    updateItem: function() {
        var newLi = $(this.machineName);
        (this.selected) ? newLi.addClassName("picked") : newLi.removeClassName("picked");
        
    },
    /** ********************* Function Event Handlers ********************** **/
    /** ********************** SEE Column#_bind_func *********************** **/
    /**
     * @memberOf ColumnItem
     * @description Method to run right after a ColumnItem is clicked. Can be set to do nothing,
     * (function(){}) or any number of things. Click handler can deal with multiple click types,
     * so check for those using the event object. Helper function to aid in development/testing.
     *
     * @param {Event} event The event attached to the action being performed.
     *
     * The scope is the parent widget object ('this'). The event refers to the
     * item clicked.
     */
    clickHandler: function(event) {
        /// overwrite this function so that the individual items can run
        if (Event.isLeftClick(event))
            alert("CLICK: Specify a function, which takes 'event' as parameter for this item.");
        else
            alert("RIGHT-CLICK: Specify a function, which takes 'event' as a parameter for this item (and detects for right-click).")
    },
    /**
     * @memberOf ColumnItem
     * @description Method to run right after a ColumnItem is double-clicked. Can be set to do nothing,
     * (function(){}) or any number of things. Helper function to clue developers in.
     *
     * @param {Event} event The event attached to the action being performed.
     *
     * The scope is the parent widget object ('this'). The event refers to the
     * item clicked.
     */
    dblclickHandler: function(event) {
        /// overwrite this function so that the individual items can run
        alert("DOUBLE-CLICK: Specify a function, which takes 'event' as parameter for this item.");
    }
});
