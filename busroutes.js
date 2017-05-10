//Spreadsheet URL goes here (This var called on lines)
var sheetURL = 'https://docs.google.com/spreadsheets/d/1AKvzOnhzNkefzeHW--kwpHB5B8rbGYu9cOsT-w1Lx28/gviz/';
//Zipcode for geolocation
var geoPostalCode = '82801';
//Session variables & options
var user = {
  location: {
    lat:false,
    long:false,
    address:false
  },
  school: '',
  bus: 0,
  dev: true,
  sheet: 'Routes'
};

function Helper() {
  var helper = this;
  //Who am I, where am I, and what am I doing??
  //(Builds key prefix for localStorage)
  var hostURL = window.location.host.split('.');
  var reverseURL = "-";
  if (hostURL.length < 2){
  	reverseURL = "localHost"+reverseURL;
  } else {
  	reverseURL = hostURL[0]+reverseURL;
  	for(var i=1; i<hostURL.length; i++){
  		reverseURL = hostURL[i]+"."+reverseURL;
  	}
  }
  var version = "busRoutes0.0-";
  //Logging
  helper.log = function(msg) {
    if (user.dev) {
      console.log(msg);
    }
  }
  //Geolocation
  helper.getUserLocation = function(callback) {
    if (!callback) {
      callback = showPosition;
    }
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(callback,showError);
    } else {
        helper.log("Geolocation is not supported by this browser.");
    }
  }
  function showPosition(position) {
      helper.log("Latitude: " + position.coords.latitude +
      ", Longitude: " + position.coords.longitude);
      user.location.lat = position.coords.latitude;
      user.location.long = position.coords.longitude;
  }
  function showError(error) {
      switch(error.code) {
          case error.PERMISSION_DENIED:
              helper.log("User denied the request for Geolocation.");
              break;
          case error.POSITION_UNAVAILABLE:
              helper.log("Location information is unavailable.");
              alert("Location information is unavailable.");
              break;
          case error.TIMEOUT:
              helper.log("The request to get user location timed out.");
              alert("The request to get user location timed out.");
              break;
          case error.UNKNOWN_ERROR:
              helper.log("An unknown error occurred.");
              alert("An unknown error occurred.");
              break;
      }
  }
  //localStorage
  helper.ls = {
    exists: function() {
      return typeof(Storage) != "undefined";
    },
    set: function(key,info) {
      if (this.exists()) {
        localStorage.setItem(reverseURL+version+key, info);
        helper.log('Saved '+localStorage.getItem(reverseURL+version+key));
      }
    },
    get: function(key) {
      if (this.exists()) {
        return localStorage.getItem(reverseURL+version+key)?localStorage.getItem(reverseURL+version+key):null;
      } else {
        return null;
      }
    },
    unset: function(key) {
      if (this.exists()) {
        localStorage.removeItem(reverseURL+version+key);
      }
    }
  }
  //Layout
  helper.setMapSize = function() {
    var margin = $('.navbar-fixed-top').height();
    var h = $(window).height()-$('.navbar-fixed-top').height()-$('.navbar-fixed-bottom').height();
    var w = $(window).width();
    $('#map').css({'height':h,'width':'100%','margin-top':margin});
  }
}

function Busbarn() {
  var busbarn = this;
  busbarn.init = function() {
    helper.setMapSize();
    //user.bus = helper.ls.get('busNo')||0;
    user.school = helper.ls.get('school')||'';
    chooseToggle.html(user.school.length!=0?user.school:'Choose School');
    getDistrictOptions();
  }

  busbarn.schoolData = false;
  busbarn.routeData = false; // Becomes final route data that gets mapped.

  //Configure app for district settings and eventually trigger first map draw
  function getDistrictOptions() {
    var logourl = new google.visualization.Query(sheetURL+'tq?sheet=District&tq='+encodeURIComponent('SELECT A, G, H, I, J, K, L, M WHERE A != "key"'));
    console.log(logourl);
    logourl.send(handleDistrictOptions);
  }

  function handleDistrictOptions(response) {
    if (response.isError()) {
      alert('Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage());
      return;
    }
    var data = response.getDataTable();
    var img = $('<img>');
    img.attr('src', data.getValue(0,1));
    img.attr('alt', data.getValue(0,0));
    img.attr('title', data.getValue(0,0));
    var brand = $('.navbar-brand');
    brand.attr('href', data.getValue(0,7));
    brand.html(" "+data.getValue(0,0)+" Bus Routes");
    brand.prepend(img);
    colors = {
      top: (data.getValue(0,1) != null) ? $.trim(data.getValue(0,2)) : "",
      bottom: (data.getValue(0,2) != null) ? $.trim(data.getValue(0,3)) : "",
      side: (data.getValue(0,3) != null) ? $.trim(data.getValue(0,4)) : "",
      sideText: (data.getValue(0,4) != null) ? $.trim(data.getValue(0,5)) : "",
      title: (data.getValue(0,5) != null) ? $.trim(data.getValue(0,6)) : ""
    };
    setPageAppearance(colors);
    firstDraw();
  }

  function setPageAppearance(colors) {
    $('.navbar-brand').css("color", colors['title']);
    $('.navbar-fixed-top').css("background-color", colors['top']);
    $('.sidebar').css("background-color", colors['side']);
    $('.sidebar a').css("color", colors['sideText']);
    $('nav li a').css("color", colors['sideText']);
    $('.navbar-fixed-bottom').css("background-color", colors['bottom']);
  }

  var chooseSchool = $('#modal-choose');
  var schoolChoices = $('#school-choices');
  var chooseToggle = $('#choose-toggle');

  function getSchoolData() {
    if (!busbarn.schoolData) {
      var schoolQuery = new google.visualization.Query(sheetURL+'tq?sheet=Schools');
      schoolQuery.send(handleSchoolData);
    } else {
      makeSchoolLinks();
      if (user.school.length == 0) {
        setSchool('default');
      }
    }
  }

  function handleSchoolData(response) {
    busbarn.schoolData = response.getDataTable();
    //Build UI elements from data
    makeSchoolLinks();
    if (user.school.length == 0) {
      setSchool('default');
    }
    getRouteData();
  }

  function makeSchoolLinks() {
    for ( i = 0; i < busbarn.schoolData.getNumberOfRows(); i++) {
      var link = busbarn.schoolData.getValue(i,7);
      var schoolName = busbarn.schoolData.getValue(i,1);
      // Populate school links
      var li = $('<li>');
      var a = $('<a>');
      a.attr('href', link);
      a.attr('target', '_blank');
      a.text(schoolName);
      $('.dropdown-menu').prepend(li);
      li.append(a);
      // Populate school choices
      var btn = $('<button>');
      btn.attr('type','button');
      btn.attr('class','btn btn-default');
      btn.attr('data-dismiss','modal');
      btn.text(schoolName);
      btn.click(handleSchoolChange);
      schoolChoices.append(btn);
    }
  }

  function handleSchoolChange(e) {
    var old = user.school;
    setSchool($(e.target).html()?$(e.target).html():'');
    helper.log(user.school);
    if (old != user.school || showingBus()) {
      setBus();
      getRouteData();
    }
  }

  function showingBus() {
    if ($('#routeNumber').html().search('Showing') != -1) {
      return true;
    }
    return false;
  }

  function setSchool(school) {
    if (!school || school === 'none') {
      helper.ls.unset('school');
      school = '';
      chooseToggle.html('Choose School');
    } else {
      if (school === 'default') {
        school = busbarn.schoolData.getValue(0,1);
      }
      helper.ls.set('school',school);
      chooseToggle.html(school.length!=0?school:'Choose School');
      helper.ls.unset('busNo');
      user.bus = 0;
    }
    user.school = school;
  }

  function setBus(number) {
    if (!number || number == 0) {
      number = 0;
      helper.ls.unset('busNo');
    } else {
      helper.ls.set('busNo',number);
    }
    user.bus = number;
  }

  function getAlert() {
    var alertSet = new google.visualization.Query(sheetURL+'tq?sheet=Alert&tq='+encodeURIComponent('SELECT A, B WHERE A != "Alert Below"'));
    alertSet.send(announceAlert);
  }

  var intv = 0;
  var toggler = $('#alert-toggle');
  var modalAlert = $('#modal-alert');
  var alertInt = 10;

  function announceAlert(response) {
    toggler.hide();
    modalAlert.off('hidden.bs.modal');
    if (response.isError()) {
      modalAlert.find('p').text('No alerts reported.');
      helper.log('Bad response for alert');
    } else {
      var existingAlert = modalAlert.find('p').text();
      var alertData = response.getDataTable();
      if (!alertData.getNumberOfRows()) {
          modalAlert.find('p').text('No alerts reported.');
          helper.log('Alert response has no rows');
      } else {
        var districtAlert = $.trim(alertData.getValue(0,0));
        alertInt = alertData.getValue(0,1);
        if (districtAlert == "" || districtAlert == "None" || districtAlert == "none" || districtAlert == null) {
          modalAlert.find('p').text('No alerts reported.');
        } else {
          if (districtAlert != existingAlert) {
            chooseSchool.modal('hide');
            modalAlert.find('p').text(districtAlert);
            modalAlert.modal('show');
            if (intv == 0 && !helper.ls.get('school')) {
              modalAlert.on('hidden.bs.modal', function() {
                setTimeout(function () {
                  chooseSchool.modal('show');
                  modalAlert.off('hidden.bs.modal');
                }, 50);
              });
            }
          }
          toggler.show();
        }
      }
    }
    if (intv != 0) {
      clearInterval(intv);
    } else if (intv == 0 && !helper.ls.get('school') && (typeof districtAlert == 'undefined' || districtAlert == "" || districtAlert == "None" || districtAlert == "none" || districtAlert == null)) {
      chooseSchool.modal('show');
    }
    intv = window.setInterval(getAlert, alertInt*1000);
  }

  function drawMap() {
    if (user.bus != 0 && !busIsOnRoute()) {
      alert("Bus "+user.bus+" doesn't appear to directly serve "+(user.school.length?user.school:"this school")+". Clearing school selection to show route.");
      setSchool('none');
      getRouteData();
    } else if (user.bus == 0 && !user.school.length) {
      setSchool('default');
      getRouteData();
    } else {
      mapData();
    }
  }

  function getRouteData() {
    var whereStatement = "";
    if (busbarn.schoolData) {
      if (user.bus) {
        whereStatement = ' WHERE D = "'+user.bus+'"';
      } else if (user.school.length != 0) {
        var busesForSchool = "";
        var rows = busbarn.schoolData.getNumberOfRows();
        for (var r = 0; r < rows; r++) {
          if ($.trim(busbarn.schoolData.getValue(r,1)) === $.trim(user.school)) {
            busesForSchool = busbarn.schoolData.getValue(r,9);
            r = rows;
          }
        }
        busesForSchool = busesForSchool.replace(/,\s*/g,'" or D = "');
        whereStatement = ' WHERE D = "'+busesForSchool+'"';
      }
    }
    helper.log(whereStatement);
    var queryString = 'tq?sheet='+user.sheet+'&tq='+encodeURIComponent('SELECT A, B, C, D'+whereStatement);
    var query = new google.visualization.Query(sheetURL + queryString);
    query.send(handleRouteData);
  }

  function busIsOnRoute() {
    if (user.bus && busbarn.routeData) {
      var rows = busbarn.routeData.getNumberOfRows();
      for (var r = 0; r < rows; r++) {
        if ($.trim(busbarn.routeData.getValue(r,3)) == user.bus) {
          return true;
        }
      }
    }
    return false;
  }

  function handleRouteData(response) {
    if (response.isError()) {
      alert('Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage());
      return;
    }
    busbarn.routeData = response.getDataTable();
    helper.log(busbarn.routeData);

    mapData();
  }

  function mapData(type) {
    var data;
    helper.log('Mapping with bus '+user.bus);
    if (type) {
      data = new google.visualization.DataTable();
      data.addColumn('number','lat');
      data.addColumn('number','long');
      data.addColumn('string','name');
      data.addColumn('string','route');
      var rows = busbarn.schoolData.getNumberOfRows();
      for (var r = 0; r < rows; r++) {
        data.addRow([busbarn.schoolData.getValue(r,3),busbarn.schoolData.getValue(r,4),busbarn.schoolData.getValue(r,1),busbarn.schoolData.getValue(r,8)]);
      }
    } else if (user.bus) {
      data = new google.visualization.DataTable();
      data.addColumn('number','lat');
      data.addColumn('number','long');
      data.addColumn('string','name');
      data.addColumn('string','route');
      var rows = busbarn.routeData.getNumberOfRows();
      for (var r = 0; r < rows; r++) {
        if (busbarn.routeData.getValue(r,3) == user.bus) {
          data.addRow([busbarn.routeData.getValue(r,0),busbarn.routeData.getValue(r,1),busbarn.routeData.getValue(r,2),busbarn.routeData.getValue(r,3)]);
        }
      }
    } else {
      data = busbarn.routeData;
    }

    if (user.location.lat && user.location.long) {
      data.addRow([user.location.lat,user.location.long,'Your location','home']);
    }

    var map = new google.visualization.Map(document.getElementById('map'));
    google.visualization.events.addListener(map, 'error', errorHandle);

    var options = {
      showTooltip: true,
      showInfoWindow: true,
      mapType: 'busRoutes',
      useMapTypeControl: true,
      mapTypeIds: ['busRoutes','satellite'],
      maps: {
        busRoutes: {
          name: 'Default',
          styles: [
            {
              featureType: 'poi',
              stylers: [{visibility:'off'}]
            },
            {
              featureType: 'poi.park',
              stylers: [{visibility:'on'},{color:'#cccccc'}]
            },
            {
              featureType: 'landscape',
              stylers: [{color:'#eeeeee'}]
            },
            {
              featureType: 'landscape.man_made',
              stylers: [{color:'#dddddd'}]
            },
            {
              featureType: 'landscape.natural.terrain',
              stylers: [{color:'#333333'}]
            },
            {
              featureType: 'road',
              elementType: 'geometry.fill',
              stylers: [{color:'#000000'}]
            },
            {
              featureType: 'road',
              elementType: 'geometry.stroke',
              stylers: [{color:'#ffffff'}]
            },
            {
              featureType: 'road',
              elementType: 'labels.text',
              stylers: [{color:'#ffffff'}]
            },
            {
              featureType: 'road',
              elementType: 'labels.text.fill',
              stylers: [{color:'#000000'}]
            }
          ]
        }
      },
      icons: {
        home: {
          normal: 'img/bighouse.png',
          selected: 'img/selected/bighouse.png'
        },
        school: {
          normal: 'img/school.png',
          selected: 'img/selected/school.png'
        }
      }
    };

    var prefix = 'img/number_';
    var selPrefix = 'img/selected/number_';

    for (var i = 1; i <= 100 ; i++) {
      options.icons[i] = {'normal':prefix+i+'.png','selected':selPrefix+i+'.png'}
    }

    map.draw(data, options);

    labelMap(type?true:false);

    function errorHandle(response) {
      helper.log(response);

    }
  }

  function labelMap(schools) {
    var note = $('#routeNumber');
    var close = $('<a>');
    close.attr('href','#');
    close.html('<i class="fa fa-close"></i>');
    if (schools) {
      note.html(' Showing Schools');
      note.prepend(close);
      close.click(function(event) {
        user.bus = helper.ls.get('busNo')||0;
        drawMap();
      });
    } else if (user.bus) {
      note.html(' Showing Route '+user.bus);
      note.prepend(close);
      close.click(function(event) {
        setBus(0); //TODO: For some reason this doesn't work when previous route was outside school service
        drawMap();
      });
    } else {
      note.html('');
    }
  }

  $('#btn-get-route').on("click", function(event) {
    event.preventDefault();
    var old = user.bus;
    user.bus = $('#field-bus-route').val();
    $('#field-bus-route').val(null);
    user.bus = user.bus.toString().replace(/\D/g,'');
    user.bus = isNaN(parseInt(user.bus))?0:parseInt(user.bus);
    helper.ls.set('busNo',user.bus);
    if (old != user.bus) {
      drawMap();
    }
  });

  $('#showSchools').on("click", function(event) {
    event.preventDefault();
    mapData('schools');
  });

  $('#btn-search-geo').on("click", function(event) {
    event.preventDefault();
    helper.getUserLocation(setUserLocation);
    //alert("Sorry for the inconvenience, but location tracking is currently unavailable. Geolocation requires a more secure connection");
  });

  function setUserLocation(position) {
      helper.log("Latitude: " + position.coords.latitude +
      ", Longitude: " + position.coords.longitude);
      user.location.lat = position.coords.latitude;
      user.location.long = position.coords.longitude;
      getRouteByGeometry();
  }

  function getRouteByGeometry() {
    if (user.school === '' || busbarn.routeData.getNumberOfRows() == 1) {
      alert('Please select a school before searching routes.')
    } else {
      setBus(searchRoutes(busbarn.routeData));
      drawMap();
    }
  }

  function searchRoutes(coordData) {
    var lat = user.location.lat;
    var long = user.location.long;
    var shortestDist = null;
    var pickedRoute;
    for (var n = 0; n < coordData.getNumberOfRows(); n++) {
      if (coordData.getValue(n,3) != 'home' && (Math.sqrt(Math.pow((coordData.getValue(n,0) - lat), 2) + Math.pow((coordData.getValue(n,1) - long), 2)) < shortestDist || shortestDist === null)) {
        shortestDist = Math.sqrt(Math.pow((coordData.getValue(n,0) - lat), 2) + Math.pow((coordData.getValue(n,1) - long), 2));
        pickedRoute = coordData.getValue(n,3);
      }
    }
    return pickedRoute;
  }

  $('#btn-search-address').on('click', function(event) {
    event.preventDefault();
    geocodeStart($('#address-field').val());
    $('#address-field').val(null);
  });

  function geocodeStart(address) {
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({
      address: address,
      componentRestrictions: {
        postalCode: geoPostalCode
      }
    },geoCodeSearch);
  }

  function geoCodeSearch(response, status) {
    if (status == 'OK') {
      helper.log(response);
      user.location.lat = response[0]['geometry']['viewport']['f']['b'];
      user.location.long = response[0]['geometry']['viewport']['b']['b'];
      helper.log(user.location.lat + " , " + user.location.long);
      getRouteByGeometry();
    } else {
      alert('Google Address Search says: '+status);
      helper.log('Geocode Error: '+status);
    }
  }

  function firstDraw() {
    //TODO: Convert to Promise chain?
    getSchoolData();
    getAlert();
  }

}

var helper = new Helper();
var busbarn = new Busbarn();

if (!window.Promise || !window.XMLHttpRequest) {
  alert('Please update your browser to use this app.');
}

$(window).resize(function(){
  helper.setMapSize();

});
