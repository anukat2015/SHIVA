///////////////////////////////////////////////////////////////////////////////////////////////
//  SHIVALIB TIMELINE
///////////////////////////////////////////////////////////////////////////////////////////////

//  TIMEGLIDER /////////////////////////////////////////////////////////////////////////////////////////// 
//  From Than 1/31/13

SHIVA_Show.prototype.DrawTimeGlider=function() //  DRAW TIMEGLIDER
{
  if($('#cp_colorbar').is(":visible") == true || $('#cp_colormap').is(":visible") == true) {
    return;
  }
  var i;
  var stimeline = new Object();

  if($('link[href*=timeglider]').length == 0) {
    $('head').append('<link rel="stylesheet" href="css/timeglider/Timeglider.css" type="text/css" media="screen" title="no title" charset="utf-8">');
  }

  stimeline.events=null;
  stimeline.options=this.options;
  stimeline.container=this.container;
  stimeline.con="#"+stimeline.container;

  // Always set width and height before drawing timeline as the layout depends on the container size.
  $(stimeline.con).css('width',stimeline.options['width']+"px");
  $(stimeline.con).css('height',stimeline.options['height']+"px");
  $(stimeline.con).timeline('resize');  // Resixe after setting height

  GetSpreadsheetData(stimeline.options.dataSourceUrl);   // Get data from spreadsheet, contains callback to draw timeline

  function GetSpreadsheetData(file, conditions)
  {
lastDataUrl=file.replace(/\^/g,"&").replace(/~/g,"=").replace(/\`/g,":");
    var query=new google.visualization.Query(lastDataUrl);
    if (conditions)
      query.setQuery(conditions);
      query.send(handleQueryResponse);

    function handleQueryResponse(response) {
      // Added 1-25-13 to flag query response errors. Assuming it is due to permissions not set to share Gdoc.
      if(response.isError()) {
        alert("Either your internet connection is down or the Google spreadsheet that  \n" +
         + "holds the data for this visualization has not been properly shared.\n" +
          "The owner of the spreadsheet should set permissions to 'Anyone with Link' or 'Public'.");
          return;
      }
      var i,j,key,s=0;
      var data=response.getDataTable();
      var rows=data.getNumberOfRows();
      var cols=data.getNumberOfColumns();
      eventData={ events:new Array() };
      if (!$.trim(data.getColumnLabel(0)))
        s=1;
      for (i=s;i<rows;++i) {
        o=new Object();
        for (j=0;j<cols;++j) {
          key=$.trim(data.getColumnLabel(j));
          if (!key)
            key=$.trim(data.getValue(0,j));
          if ((key == "icon") && (!data.getValue(i,j)))
            continue;
        if ((key == "startdate") || (key == "enddate")) {
          if (data.getFormattedValue(i,j))
            o[key]=ConvertTimelineDate(data.getValue(i,j));
          }
        else
          o[key]=data.getValue(i,j);
        }
        eventData.events.push(o);
      }

      stimeline.events = eventData.events;


      var stldata = [{
        "id":"stl" + (new Date()).getTime(),
        "title":stimeline.options.title,
        "description":"<p>" + stimeline.options.description + "</p>",
        "focus_date": ConvertTimelineDate(stimeline.options.focus_date),
        "timezone":stimeline.options.timezone,
        "initial_zoom":stimeline.options.initial_zoom * 1,
        "events": normalizeEventData(stimeline.events)
      }];

      if(typeof(window.shivaTimeline) == "undefined") {
        window.shivaTimeline =  $(stimeline.con).timeline({
            "min_zoom":stimeline.options.min_zoom * 1,
            "max_zoom":stimeline.options.max_zoom * 1,
            "icon_folder": 'images/timeglider/icons/', // check to see if we can make this a parameter
            "data_source":stldata,
            "show_footer":Boolean(stimeline.options.show_footer),
"display_zoom_level":Boolean(stimeline.options.display_zoom_level),
            "constrain_to_data":false,
            "image_lane_height":60,
            "loaded":function (args, data) {
              $(stimeline.con).timeline('setOptions', stimeline.options, true);
              $(stimeline.con).timeline('registerEvents', stimeline.events);
              setTimeout('$(\'' + stimeline.con + '\').timeline(\'eventList\')', 500);
              if(stimeline.options.show_desc == "false") { $('.tg-timeline-modal').fadeOut();  }
              shivaLib.SendReadyMessage(true);
            }
        });
     } else {
        var callbackObj = {
          fn : function (args, data) {
              setTimeout(function() {
                $(stimeline.con).timeline('setOptions', stimeline.options, true);
                $(stimeline.con).timeline('registerEvents', stimeline.events);
                $(stimeline.con).timeline('eventList');
                if(stimeline.options.show_desc == "false") { $('.tg-timeline-modal').fadeOut();  }
              }, 500);
          },
          args : {
            "min_zoom":stimeline.options.min_zoom * 1,
            "max_zoom":stimeline.options.max_zoom * 1,
            "icon_folder": 'images/timeglider/icons/', // check to see if we can make this a parameter
            "data_source": stldata,
            "show_footer":Boolean(stimeline.options.show_footer),
"display_zoom_level":Boolean(stimeline.options.display_zoom_level),
            "constrain_to_data":false,
            "image_lane_height":60
          },
          display : true
        };
        setTimeout(function() {
          if(typeof(console)=="object") { console.info(stldata); }
          $(stimeline.con).timeline('loadTimeline', stldata, callbackObj);
        }, 500);
      }

      // Make event modal windows draggable
      window.stlInterval = setInterval(function() {
        $('.timeglider-ev-modal').draggable({cancel : 'div.tg-ev-modal-description'});
      }, 500);

      function ConvertTimelineDate(dateTime) {
        var sign = (dateTime < 0) ? -1 : 1;  // account for BC (or minus) years
        dateTime=Date.parse(dateTime)+50000000;
        var dt = new Date(dateTime);
        dt.setFullYear(dt.getFullYear() * sign);
        var mn = padZero(dt.getMonth() + 1);
        var dy = padZero(dt.getDate());
        var hrs = padZero(dt.getHours());
        var mns = padZero(dt.getMinutes());
        var scs = padZero(dt.getSeconds());
        var dtstr = dt.getFullYear() + "-" + mn + "-" + dy + " " + hrs + ":" + mns + ":" + scs;
        return dtstr;
      }

      function padZero(n) {
        if(n < 10) { n = '0' + n; }
        return n;
      }

      function normalizeEventData(events) {
        var ct = 0;
        for(var i in events) {
          ct++;
          var ev = events[i];
          if(typeof(ev.id) == "undefined") {
            ev.id = "event-" + ct;
          } else {
            ev.id = ev.id + "-" + ct;
          }
          if(typeof(ev.startdate) == "undefined" && typeof(ev.start) != "undefined") {
            ev.startdate = ConvertTimelineDate(ev.start);
          }
          if(typeof(ev.enddate) == "undefined" && typeof(ev.end) != "undefined") {
            ev.enddate = ConvertTimelineDate(ev.end);
          }
          if(typeof(ev.enddate) == "undefined" || ev.enddate == "") {
            ev.enddate = ev.startdate;
          }
          if(typeof(ev.importance) == "undefined") {
            ev.importance = 50;
          }
          if(typeof(ev.date_display) == "undefined") {
            ev.date_display = "ye";
          }
          if(typeof(ev.icon) == "undefined") {
            ev.icon = "none";
          }
        }
        return events;
      }
    }
  }
}

//  SIMILE

SHIVA_Show.prototype.DrawTimeline=function(oldItems) 											//	DRAW TIMELINE
{
	var i;
	var eventData=null;
	var options=this.options;
	var container=this.container;
	var con="#"+container;
	var ops=new Array();
	var items=new Array();
	$(con).css('width',options['width']+"px");
	$(con).css('height',options['height']+"px");
	var eventSource=new Timeline.DefaultEventSource();
	$("#timelineCSS").attr('href',"css/timeline"+options.theme+".css");
	if (oldItems)
		items=oldItems;
	else
	   	for (var key in options) {
			if (key.indexOf("item-") != -1) {
				var o=new Object;
				var v=options[key].split(';');
				for (i=0;i<v.length;++i)
					o[v[i].split(':')[0]]=v[i].split(':')[1].replace(/\^/g,"&").replace(/~/g,"=").replace(/\`/g,":");
				items.push(o);
				}
			}
	this.items=items;
	for (i=0;i<items.length;++i) {
		if (items[i].visible == "false")
			continue;
		o=new Object();
		o.width=items[i].pct+"%";
		o.intervalUnit=eval("Timeline.DateTime."+items[i].intu.toUpperCase()); 
		o.intervalPixels=Number(items[i].intw);
		o.eventSource=eventSource;
		o.date=items[i].date;
		o.overview=(items[i].text == "false");
		var theme=Timeline.ClassicTheme.create();
		theme.event.tape.height=Number(items[i].thgt);
		theme.event.track.height=Number(items[i].thgt)+2;
		o.theme=theme;
		ops.push(Timeline.createBandInfo(o));
		if (i) {
			if (items[i].sync != "None")
				ops[i].syncWith=Number(items[i].sync)-1;
				ops[i].highlight=(items[i].high == "true");
				}
		}
	i=(options['orientation'] != "Vertical")?0:1; 		
	if (this.timeLine) 
		Timeline.timelines.pop();
	this.timeLine=Timeline.create(document.getElementById(container),ops,i);
	if (options['dataSourceUrl'])
		GetSpreadsheetData(options['dataSourceUrl'],"",this);
	else{
  		this.timeLine.loadJSON("SimileTestData.js",function(json, url) {  eventSource.loadJSON(json, url); });
		this.SendReadyMessage(true);											
		}
		
	function GetSpreadsheetData(file, conditions, _this) 
	{
  		lastDataUrl=file.replace(/\^/g,"&").replace(/~/g,"=").replace(/\`/g,":");
  		var query=new google.visualization.Query(lastDataUrl);
		if (conditions)
			query.setQuery(conditions);
   		query.send(handleQueryResponse);
 
	    function handleQueryResponse(response) {
		    var i,j,key,s=0;
			var data=response.getDataTable();
			var rows=data.getNumberOfRows();
			var cols=data.getNumberOfColumns();
	 		eventData={ events:new Array() };
			if (!$.trim(data.getColumnLabel(0)))
				s=1;
			for (i=s;i<rows;++i) {
 				o=new Object();
				for (j=0;j<cols;++j) {
					key=$.trim(data.getColumnLabel(j));
					if (!key)
						key=$.trim(data.getValue(0,j));
					if ((key == "icon") && (!data.getValue(i,j)))
						continue;
					if ((key == "start") || (key == "end")) {
						if (data.getFormattedValue(i,j))
							o[key]=_this.ConvertDateToJSON(data.getFormattedValue(i,j));
						}
					else	
						o[key]=data.getValue(i,j);
					}
 				eventData.events.push(o);
  				}
 			eventSource.loadJSON(eventData,'');
		 	shivaLib.SendReadyMessage(true);											
 	     }
  	}
}
