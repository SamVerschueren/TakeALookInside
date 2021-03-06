//declaring variables
var myLat;
var myLon; 
var buildingLayer;
var markerFeatures;
var activePopup;
var iconSize = new OpenLayers.Size(25,41);
var iconOffset = new OpenLayers.Pixel(-(iconSize.w/2), -iconSize.h);

/**
 * Event that is fired each time before the map div is being shown.
 * Initializes the favorites
 * Clears the route to vector if it's no longer needed to show it
 * Loads the categories in the filter.
 */
$("div#map").live('pagebeforeshow', function() {  
    if(localStorage['favorites']==null)
        localStorage['favorites']=  JSON.stringify(new Array());
    if(mapLoaded){ 
        if(typeof myRouteVector!='undefined')
            myRouteVector.destroyFeatures();
    }else{
        $.getJSON(server+'/REST/Category.json',function(data){
            $.each(data.category, function (key,val){
                var checkbox = $("<input />").attr({type: 'checkbox', id: 'filter' + val.categoryID, checked: 'checked'});
                $(checkbox).change(filterClick);
                
                var label = $("<label />").attr('for', 'filter' + val.categoryID).html(val.name);
                var li = $("<li />").attr('class', val.name.toLowerCase()).append(checkbox).append(' ').append(label); 
                $('ul#filterSection').append(li);  
            });
        });
    }              
});    

/**
 * Event that is fired each time the map div is being shown.
 * Loads the map if not yet loaded. * 
 */
$("div#map").live('pageshow', function() {
    if(!mapLoaded) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(loadMap, function() {
                navigator.notification.alert("Your position cannot be determined, the korenmarkt is used as your location now.", null, "No geolocation", "OK");  
                
            });            
        }else{
            navigator.notification.alert("Your position cannot be determined, the korenmarkt is used as your location now.", null, "No geolocation", "OK");  
        }
    }
    else {
        showMapDirectPopup();        
        //markerArray[mapDirect].erase();             
    }
    //showMapDirectPopup(); 
});

/**
 * Event that is fired after selecting or unselecting a filter in the filter menu. * 
 */
var filterClick = function(evt) {
    var target = evt.target;
    var id = target.id.replace('filter', '');
    //Get all buildings in the category
    $.getJSON(server+'/REST/Building/categoryID/' + id + '.json', function(data) {
        //for each category        
        $.each(data.building, function(key, value) {
            //if it is checked, display it
            if($(target).is(':checked')) {
                markerFeatures[value.buildingID].marker.display(true);
            }
            //if not checked, don't display
            else {
                markerFeatures[value.buildingID].marker.display(false);
            }       
        }); 
    });
}

/**
 * Method that should be called after setting the mapDirect variable
 * 
 * It makes it possible to move to the map page and show
 * a popup of the building with the buildingID that is stored in 'mapDirect'.
 * Sets center of the map to the target building.
 * Clears mapDirect afterwards
 */
function showMapDirectPopup(){    
    if(typeof mapDirect!='undefined'){
        //create popup        
        if(markerFeatures[mapDirect].popup==null )
            fillPopup(markerFeatures[mapDirect]);
        //if popup not shown
        if(markerFeatures[mapDirect].popup !=null && !markerFeatures[mapDirect].popup.visible())
            //show it       
            showPopup(markerFeatures[mapDirect].popup)
        $.getJSON(server+'/REST/Building.json?buildingID='+mapDirect , function(data) {
            //get lonlat of building to set center
            var lonlatBuilding= new OpenLayers.LonLat(
                data.building[0].longitude,data.building[0].latitude
                ).transform(new OpenLayers.Projection("EPSG:4326"),new OpenLayers.Projection("EPSG:900913"));
            map.setCenter(lonlatBuilding);
            //map.setCenter(markerFeatures[mapDirect].) 
            
        });
        //unset mapDirect
        mapDirect=undefined;
    } 
    else map.setCenter(lonlat);   
}

/**
 * Show a popup or close it if it was already shown
 * Closes other opened popup
 * Shows or hides corresponding right side buttons.
 * Also saves the popup that is shown in the activePopup variable. This is used thoughout the application
 * to determine which building that is 'active'.
 */
function showPopup(popup){
    if(typeof activePopup!='undefined'){
        if(activePopup.id==popup.id)
            activePopup.toggle();
        else{
            activePopup.hide();
            popup.show();
        }
    }
    else
        popup.show();
    activePopup=popup;
    if(typeof activePopup!='undefined' && activePopup.visible()){
        updateRightSideButtons(activePopup.id);
        $('div#mapButtons').show();
    }
    else
        $('div#mapButtons').hide();
}
/**
 * Update the right side buttons according to a specific building
 * Shows the must see button if the user has seen the movie, otherwise it is not shown 
 */
function updateRightSideButtons(buildingID){
    if(buildingID==activePopup.id){
        var buildingList;
        buildingList=JSON.parse(localStorage["favorites"]);
        if(localStorage["seen"]!=null && checkBuildingInArray(JSON.parse(localStorage["seen"]),buildingID)){
            if(buildingList[activePopup.id]!=null  )
                $("img#mustSeeButton").attr("src","img/favorites-selected.png");
            else
                $("img#mustSeeButton").attr("src","img/favorites.png");
            $("img#mustSeeButton").show(); 
        }
        else{
            $("img#mustSeeButton").css('display', 'none');
            $("img#mustSeeButton").attr("src","");
        }   
    }
}

/**
 * Method to load the map
 *  
 * @param       position        The position of the device
 */
function loadMap(position) {
    /**
     * This is the mapbox tileset, this one is used. 
     */
    var mapBoxTiles = new OpenLayers.Layer.XYZ(
                                            "MapBox Streets",
                                            [
                                                "http://a.tiles.mapbox.com/v3/mapbox.mapbox-streets/${z}/${x}/${y}.png",
                                                "http://b.tiles.mapbox.com/v3/mapbox.mapbox-streets/${z}/${x}/${y}.png",
                                                "http://c.tiles.mapbox.com/v3/mapbox.mapbox-streets/${z}/${x}/${y}.png",
                                                "http://d.tiles.mapbox.com/v3/mapbox.mapbox-streets/${z}/${x}/${y}.png"
                                            ], {
                                                sphericalMercator: true,
                                                wrapDateLine: true,
                                                transitionEffect: "resize",
                                                buffer: 1,
                                                numZoomLevels: 18
                                            }
                                         );
                   
    /**
     * The openstreetmap tileset, this one is not used. 
     * If you want to use this tileset, changes the layers property of the map.
     */                                    
    var openStreetMapTiles = new OpenLayers.Layer.OSM("OpenStreetMap", null, { transitionEffect: "resize" });

    mapLoaded = true;    
    map = new OpenLayers.Map({
        div: "mapview",
        theme: null,
        controls: [
            new OpenLayers.Control.Attribution(),
            new OpenLayers.Control.TouchNavigation({
                dragPanOptions: {
                    enableKinetic: true
                }
            }),
            new OpenLayers.Control.Zoom()
        ],
        layers: [mapBoxTiles]                   /* Change this in [openStreetMapTiles] to change the tileset to default */
    });
    
    if(navigator.geolocation){
        //set center to the users geolocation
        myLon=position.coords.longitude;
        myLat=position.coords.latitude;
    }
    else{
        //set center to korenmarkt coordinates
        myLon=3.7219830;
        myLat=51.0546200;
    }
    
    lonlat = new OpenLayers.LonLat(myLon, myLat).transform(new OpenLayers.Projection("EPSG:4326"),new OpenLayers.Projection("EPSG:900913"));
    
    
    map.setCenter(lonlat);
    map.zoomTo(16);
    
    var locationLayer = new OpenLayers.Layer.Markers('LocationLayer');
    locationLayer.id = 'LocationLayer';
    
    buildingLayer = new OpenLayers.Layer.Markers('BuildingLayer');
    buildingLayer.id = 'BuildingLayer';
    
    var ol = new OpenLayers.Layer.OSM(); 
    myRouteVector = new OpenLayers.Layer.Vector();
    map.addLayers([ol,myRouteVector]);   
    
    map.addLayer(locationLayer);
    map.addLayer(buildingLayer);
    
    // Adding the markers to the layer
    var size = new OpenLayers.Size(25,25);
    var offset = new OpenLayers.Pixel(-(size.w/2), -(size.h/2));
    var icon = new OpenLayers.Icon('img/my-location.png', size, offset);
    locationLayer.addMarker(new OpenLayers.Marker(lonlat,icon));
    $.getJSON(server+'/REST/Building.json?select=buildingID;longitude;latitude,building.categoryID,category.name&join=category', function(data) {
       // var latDestination;
       // var lonDestination;
       markerFeatures=new Array();
        $.each(data.building, function(key, val) {
            addMarker(buildingLayer, val.longitude, val.latitude, val.buildingID,val.name);    
            latDestination=val.latitude;
            lonDestination=val.longitude;
        });
        showMapDirectPopup();                
    });   
}

/**
 * Method that sets the correct icon of a building
 * These can be: unseen, seen & favorited.
 * Should be called after watching the movie of a building or after favoriting/unfavoriting a building.
 * 
 * @param {Object} buildingID       building ID of the building
 * @param {Object} category         category NAME of the category to which the building belongs to, it is the NAME
 *                                  because the name is used in the iconname.
 */
function getIcon(buildingID,category){
   var icon;
   //check if building is favorited
   if(localStorage["favorites"]!=null){
        $.each(JSON.parse(localStorage["favorites"]), function(key, building) {            
            if(building!=null && building.id==buildingID)
               //if yes, use favorited icon
               icon = 'img/markers/'+category.toLowerCase()+'[fav].png';     
        });
    }
    //check if building is seen
    if(JSON.parse(localStorage["seen"]!=null)){
        if(icon==null){
            $.each(JSON.parse(localStorage["seen"]), function(key, building) {
                if(building.id==buildingID)
                    //if yes, use seen icon
                    icon = 'img/markers/'+category.toLowerCase()+'[seen].png';     
            });        
        }
    }
    //if not favorited and not seen, use unseen icon
    if(icon==null){
        icon = 'img/markers/'+category.toLowerCase()+'.png';    
    }     
    return icon;
}

/**
 * Adds marker to the specified layer.
 * 
 * @param {Object} layer        layer to add the marker to
 * @param {Object} lon          longitude of the marker
 * @param {Object} lat          latitude of the marker
 * @param {Object} id           id of the building
 * @param {Object} category     category NAME of the category
 */
function addMarker(layer, lon, lat, id,category) {
    var lonlat = new OpenLayers.LonLat(lon, lat).transform(new OpenLayers.Projection("EPSG:4326"),new OpenLayers.Projection("EPSG:900913"));    
    var icon=new OpenLayers.Icon(getIcon(id,category),iconSize,iconOffset);         
    var feature = new OpenLayers.Feature(layer, lonlat); 
    feature.data.icon = icon;
    feature.data.overflow = 'auto';
    feature.id = id;              
    var marker = feature.createMarker();   
    markerFeatures[id] = feature;
    //register touchstart & click event
    //click is needed for PC
    //touch is needed for mobile devices
    marker.events.register('touchstart', feature, markerClick);  
    marker.events.register('click', feature, markerClick);     
    layer.addMarker(marker);
}

/**
 * Event that is call when a marker is clicked, it shows the popup.
 * 
 */
var markerClick = function (evt) {
    var caller = this;
    if(caller.popup==null)
        fillPopup(caller);
    else showPopup(caller.popup);
    OpenLayers.Event.stop(evt);
}

/**
 * Fills the popup of a specific feature (=~ marker)
 * 
 * @param {Object} feature
 */
function fillPopup (feature){    
    //get building info JSON
    $.getJSON(server+'/REST/Building/buildingID/' + feature.id + '.json?select=building.*;category.name%20AS%20catName&join=category', function(data) {         
        var lonlat = new OpenLayers.LonLat(data.building[0].longitude, data.building[0].latitude).transform(new OpenLayers.Projection("EPSG:4326"),new OpenLayers.Projection("EPSG:900913"));         
        var popup= new OpenLayers.Popup(feature.id,
                  lonlat,
                  null,
                  data.building[0].name,
                  true,
                  function(){closePopup()});
        popup.autoSize=true;
        popup.setBackgroundColor('#EBECE3');
        feature.popup=popup; 
        feature.popup.contentHTML='<h1 class="' + data.building[0].catName + '">' + data.building[0].name + '</h1><p class="description">' + data.building[0].description + '<br /><br /><br /></p><p class="adres ' + data.building[0].catName + '">' + data.building[0].adres + '</p>';
        
        map.addPopup(feature.popup);
        
        showPopup(feature.popup);
        //array to store all popups in to, stores every popup in the array when they are created.
        markerFeatures[feature.id]=feature;              
    });        
}

/**
 * Event that is fired when the must see button is clicked.
 * Stores the building in or removes the building from the 'favorited' localStorage
 * Posts to the webservice with the corresponding like or dislike method
 * 
 */
function mustSeeClick(){
    var buildingID=activePopup.id;
    var method;     
    var building;    
    //get info of the selected building
    $.getJSON(server+"/REST/Building.json?join=category&select=buildingID;building.name;category.name AS catName&buildingID="+activePopup.id,function (data){        
        //create building object used in localStorage
        building=new Building(data.building[0].buildingID,data.building[0].name); 
        var buildingList={};
        //get favorites from localstorage
        if(localStorage["favorites"]!=null){
            buildingList=JSON.parse(localStorage["favorites"]);
        }
        //determine method base on if the building is in the favorites or not
        //if in favorites --> unlike
        //if not in favorites --> like
        method=(buildingList[building.id]==null)? 'like':'unlike'; 
        
        //post method to webserice, this is stored in database to be able to count the # of must sees and give a top must see
        //list on the home screen
        $.post(server+'/REST/Building', {buildingID: buildingID, method: method, device: deviceUUID}, function(data) {
              
        });
        //like --> add it to favorites in localstorage
        if(method=='like'){
            buildingList[building.id]=building;        
            localStorage["favorites"]=JSON.stringify(buildingList);       
        }
        else{
        //unlike --> remove it from favorites in localstorage    
            buildingList[building.id]=undefined;            
            localStorage["favorites"]=JSON.stringify(buildingList);    
        }
        //set corresponding icon
        if(buildingList[building.id]!=null)
            $("img#mustSeeButton").attr("src","img/favorites-selected.png")
        else
            $("img#mustSeeButton").attr("src","img/favorites.png"); 
        //update homescreen favorites
        fillCategory('favorites');
        //update icon of the selected building
        updateIcon(data.building[0].buildingID,data.building[0].catName);
        //update homescreen favorites
        initHomeContent(true);
    })     
}

/**
 * Updates the icon of a specific building according to it's category.
 * 
 * @param       buildingID      ID of the location that should be updated
 * @param       category        NAME of the category to use as icon
 */
function updateIcon(buildingID,category) {
    if(mapLoaded)
        markerFeatures[buildingID].marker.setUrl(getIcon(buildingID,category));  
}

/**
 * Click event of the route button. Uses the location of the selected building to call
 * the routeTo method. 
 */
function routeToClick(){
    
    $.getJSON(server+'/REST/Building/buildingID/' + activePopup.id + '.json', function(data) {  
        routeTo(data.building[0].longitude,data.building[0].latitude);
        closePopup();
    });
}

/**
 * Closes the active popup & hides corresponding buttons on the right side of the map.
 */
function closePopup(){
    $('div#mapButtons').hide();
    if(typeof activePopup!='undefined'){
        activePopup.hide();
        activePopup=undefined;
    }
    
}

/**
 * Gets the route from external navigation webservice and draws the route to the target location on the map.
 *  
 * @param       lon     longitue of the destination
 * @param       lat     latitude of the destination
 */
function routeTo (lon,lat) {
    //get route JSON
      var url = server+'/REST/transport.json?url=http://www.yournavigation.org/api/1.0/gosmore.php&format=geojson&'+
        'flat='+myLat+'&'+
        'flon='+myLon+'&'+
        'tlat='+lat+'&'+
        'tlon='+lon+
        '&v=foot&fast=0&layer=mapnik';      
       
        //draw route   
    myRouteVector.destroyFeatures();   
    var routeStyle = { strokeColor: '#0000ff', 
            strokeOpacity: 0.5,
            strokeWidth: 5
    };        
    $.get(url, function(data) { 
        var previouslonpos=0;
        var previouslatpos=0; 
         $.each(data.coordinates, function(num,latlonpos) {
            if(previouslatpos==0){
                previouslonpos=latlonpos[0];
                previouslatpos=latlonpos[1];
            }
            else{               
                var start_point = new OpenLayers.Geometry.Point(previouslonpos,previouslatpos); 
                var end_point = new OpenLayers.Geometry.Point(latlonpos[0],latlonpos[1]);
                previouslonpos=latlonpos[0];
                previouslatpos=latlonpos[1];
                
                myRouteVector.style=routeStyle;
                myRouteVector.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913")))]);     
            }
         });
    });
}