(function( window, undefined ){

    // Initialize namespace
    window.scribbleLive = window.scribbleLive || {};

    function HomePageNotifier(Options) {

        // Set the default options.
        this.Options = {
            APIToken: "",
            WebsiteId: 0,
            TimeToStayOpen: 10000,
            Position: "TopRight",
            HowOftenToCheck: 31000,
            ShowCloseButton: true,
            LinkText: "<strong>[[EventTitle]]</strong> is starting now. Click here to watch live."
        };

        // Overwrite the default options with any options passed in.
        for (var opt in Options) {
            if (Options.hasOwnProperty(opt)) {
            	this.Options[opt] = Options[opt];
            }
        }
        
        // Set the last time to the current time the first time we check for newly started events.
        this.LastTime = this.FormatDateUTC(new Date());

        // Set the instance of this notifier.
        this.InstanceIndex = HomePageNotifier.StoreInstance(this);

        // Set up the queue.
        this.NotifierQueue = [];

        // Check if jQuery is available.
        this.IsjQueryAvailable = this.TestForjQuery();

        // Add jQuery if it's not already on the page.
        if (!this.IsjQueryAvailable) {
            this.AddjQuery();
        }

        // Make the initial API call for all events.
        this.GetAllEvents();

    }

    HomePageNotifier.Index = 0;

    // Get the instance of the notifier.
    HomePageNotifier.GetInstance = function (pIndex) {
        if (HomePageNotifier.__instances === undefined) {
            return null;
        }
        else {
            return HomePageNotifier.__instances["" + pIndex];
        }
    };

    // Set the instance of the notifier.
    HomePageNotifier.StoreInstance = function (pHomePageNotifierInstance) {
        if (HomePageNotifier.__instances === undefined) {
            HomePageNotifier.__instances = [];
        }
        var _Index = HomePageNotifier.Index;
        HomePageNotifier.Index++;
        HomePageNotifier.__instances[_Index] = pHomePageNotifierInstance;
        return _Index;
    };

    // Check the API response for any events that have started since the last time you checked. Create the notifier if you find one.
    HomePageNotifier.prototype.AnalyzeEvents = function (pResponse) {
        for (var i = 0; i < pResponse.Events.length; i++) {
            var EventStartTime = this.FormatDateUTC(eval("new " + (pResponse.Events[i].Start.replace(/\//g, ""))));
            if ((pResponse.Events[i].IsLive === 1) && (EventStartTime > this.LastTime)) {
                this.ConstructNotifier(pResponse.Events[i]);
                this.LastTime = this.FormatDateUTC(new Date());
            }
        }

        if (this.DetectNotifier() === false) {
            this.CheckQueue();
        }

        var CheckInterval = this.Options.HowOftenToCheck;
        if (CheckInterval < 10000) {
            CheckInterval = 10000;
        }

        var _self = this;
        var Wait = setTimeout( function(){
            HomePageNotifier.GetInstance( _self.InstanceIndex ).GetAllEvents();
        }, CheckInterval );
    };

    // Create the notifier div, add the text, and add it to the queue.
    HomePageNotifier.prototype.ConstructNotifier = function (pEvent) {

        var Notifier = document.createElement("div");
        Notifier.id = pEvent.Id;
        Notifier.className = "Notifier";

        var NotifierContent = document.createElement("a");
        NotifierContent.href = this.GetEventUrl(pEvent);
        NotifierContent.innerHTML = this.Options.LinkText.replace(/\[\[EventTitle\]\]/g, pEvent.Title);

        Notifier.appendChild(NotifierContent);

        var CloseLink = document.createElement("a");
        CloseLink.href = "#";
        CloseLink.className = "CloseNotifier";
        CloseLink.innerHTML = "x";
        CloseLink.setAttribute("onclick", "scribbleLive.HomePageNotifier.GetInstance(" + this.InstanceIndex + ").CloseNotifier(" + pEvent.Id + "); return false;");

        if (this.Options.ShowCloseButton === true) {
            Notifier.appendChild(CloseLink);
        }

        this.NotifierQueue.push(Notifier);

    };

    //Figure out if there is a notifier already on the page.
    HomePageNotifier.prototype.DetectNotifier = function () {
        var NotifierFound = false;
        var divs = document.getElementsByTagName("div");
        for (var i = 0; i < divs.length; i++) {
            if (divs[i].className === "Notifier") {
                NotifierFound = true;
            }
        }
        return NotifierFound;
    };

    // Check the queue and slide in the next notification in the queue.
    HomePageNotifier.prototype.CheckQueue = function () {
        if (this.NotifierQueue.length > 0) {
            this.SlideIn(this.NotifierQueue[0]);
            this.NotifierQueue.splice(0, 1);
        }
    };

    // Get the event's white label url.
    HomePageNotifier.prototype.GetEventUrl = function (pEvent) {
        for (var i = 0; i < pEvent.Websites.length; i++) {
            if (pEvent.Websites[i].Id === this.Options.WebsiteId) {
                return pEvent.Websites[i].Url;  
            }
        }   
    };

    HomePageNotifier.prototype.FormatDateUTC = function (pDate) {
        var FormattedDate = Date.UTC(pDate.getUTCFullYear(),pDate.getUTCMonth(),pDate.getUTCDate(),pDate.getUTCHours(),pDate.getUTCMinutes(),pDate.getUTCSeconds());
        return FormattedDate;
    };

    // Slide the notifier on to the page. Includes the styles for all of the different position possibilities.
    HomePageNotifier.prototype.SlideIn = function (pElement) {
        if (document.getElementById(pElement.id) === null) {
            pElement.style.visibility = "hidden";
            pElement.style.position = "absolute";
            if (this.Options.Position === "TopRight") {
                pElement.style.top = "0";
                pElement.style.right = "20px";
            } else if (this.Options.Position === "TopLeft") {
                pElement.style.top = "0";
                pElement.style.left = "20px";
            } else if (this.Options.Position === "BottomLeft") {
                pElement.style.bottom = "0";
                pElement.style.left = "20px";
            } else if (this.Options.Position === "BottomRight") {
                pElement.style.bottom = "0";
                pElement.style.right = "20px";
            }
            document.body.appendChild(pElement);
            var ElementHeight = pElement.offsetHeight;
            pElement.style.height = "0px";
            pElement.style.visibility = "visible";
            $("#" + pElement.id).animate({
                height: ElementHeight + "px"
            }, 1000, this.SlideOut(pElement.id));
        }
    };

    // Slide the notifier off of the page.
    HomePageNotifier.prototype.SlideOut = function (pElementId) {
        var T = this;
        var SlideOutWait = setTimeout(function () {
            $('#' + pElementId).animate({ height: 0 }, 1000, function () {
                var NotifierToRemove = document.getElementById(pElementId);
                NotifierToRemove.parentNode.removeChild(NotifierToRemove);
                T.CheckQueue();
            });
        }, this.Options.TimeToStayOpen);
    };

    // Close the notifier when the close button is clicked. Check the queue for more notices to show.
    HomePageNotifier.prototype.CloseNotifier = function (pElementId) {
        var NotifierToRemove = document.getElementById(pElementId);
        NotifierToRemove.parentNode.removeChild(NotifierToRemove);
        this.CheckQueue();
    };

    // A test to determine if jQuery is on the page.
    HomePageNotifier.prototype.TestForjQuery = function () {
        if (this.IsjQueryAvailable !== null) {
            return this.IsjQueryAvailable;
        } else {
            this.IsjQueryAvailable = false;
            try {
                this.IsjQueryAvailable = (jQuery !== null);
            }
            catch (Error) { }
            return this.IsjQueryAvailable;
        }
    };

    // Add jquery to the head of the page.
    HomePageNotifier.prototype.AddjQuery = function () {
        var jQuery = document.createElement("script");
        jQuery.type = "text/javascript";
        jQuery.src = "https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js";
        document.getElementsByTagName("head")[0].appendChild(jQuery);
    };

    // Remove any old API calling scripts, and add a new one.
    HomePageNotifier.prototype.GetAllEvents = function () { 
        var Scripts = document.head.getElementsByTagName("script");
        for (var i = 0; i < Scripts.length; i++) {
            var ScriptSource = Scripts[i].src;
            if (ScriptSource.match("^\http:\/\/apiv1\.scribblelive\.com/website/" + this.Options.WebsiteId + ".*") !== null) {
                document.head.removeChild(Scripts[i]);
            }
        }
        var LoadPostsCall = document.createElement("script");
        LoadPostsCall.type = "text/javascript";
        LoadPostsCall.src = "http://apiv1.scribblelive.com/website/" + this.Options.WebsiteId + "/events/?Token=" + this.Options.APIToken + "&format=json&callback=scribbleLive.HomePageNotifier.GetInstance(" + this.InstanceIndex + ").AnalyzeEvents";
        document.getElementsByTagName("head")[0].appendChild(LoadPostsCall);    
    };

    scribbleLive.HomePageNotifier = HomePageNotifier;

}( window ));