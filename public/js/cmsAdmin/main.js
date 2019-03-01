var app = {
  addApi(context){
    var project = $(context).data("project");
    $("#add-api-confirm").data("project", project);
    $("#add-api").modal();
  },
  addApiConfirm(context){
    var apiName = $("#api-name").val();
    var project = $(context).data("project");
    if(apiName === ""){
      alert("Api name cannot be empty")
    } else {
      $.get(`/apicms/add-api/${project}/${apiName}`, (data) => {
        if(data === "alreadExists"){
          alert("Api already exists")
        } else {
          if(data === "emptyName"){
            alert("Api name cannot be empty")
          } else{
            setTimeout(function(){ window.location.reload() }, 500);
          }
        }
      });
    }
  },
  editAPI(context){
    var id = $(context).data("id");
    var tags = $(context).data("tags");
    var status = $(context).data("status");
    var delay = $(context).data("delay");
    var oldName = $(context).data("old-name");
    var project = $(context).data("project");
    var query = $(context).data("query");
    var queryType = $(context).data("querytype");
    $("#edit-api-confirm").data("project", project);
    $("#edit-api-confirm").data("id", id);
    $("#edit-api .tags").val(tags);
    $("#edit-api .name").val(oldName);
    $("#edit-api .status").val(status);
    $("#edit-api .delay").val(delay);
    $("#edit-api .query").val(query);
    $(`#edit-api #${queryType}`).attr('selected', 'selected');
    $("#edit-api").modal();
  },
  editAPIConfirm(context){
    var name = $("#edit-api .name").val().trim();
    var tags = $("#edit-api .tags").val().split(';').join(';');
    var status = $("#edit-api .status").val().trim();
    var delay = $("#edit-api .delay").val().trim();
    var project = $(context).data("project");
    var id = $(context).data("id");
    var query = $("#edit-api .query").val().trim();
    var queryType = $("#edit-api .queryType").val();
    localStorage.setItem("api", `${project}_${id}`);
    $.post( "/apicms/edit-api", { project, name, id, tags, delay, status, query, queryType})
    .done(function( data ) {
      if(data === "alreadExists"){
        alert("API already exists")
      } else {
        if(data === "emptyName"){
          alert("API name cannot be empty")
        } else{
          setTimeout(function(){ window.location.reload() }, 500);
        }
      }
    });
  },
  deleteAPI(context){
    let name = context.dataset.remove;
    let project = context.dataset.project;
    $("#delete-api .delete").data("remove", name);
    $("#delete-api .delete").data("project", project);
    $("#delete-api").modal();
  },
  deleteAPIConfirm(){
    $.get(`/apicms/delete-api/${$('.delete').data("project")}/${$('.delete').data("remove")}`, (data) => {
      setTimeout(function(){ window.location.reload() }, 500);
    });
  },
  addVersion(context){
    var apiName = $(context).data("name");
    var id = $(context).data("id");
    var project = $(context).data("project");
    $("#version-api-name h3").html(apiName)
    $("#add-version-confirm").data("project", project);
    $("#add-version-confirm").data("id", id);
    $("#add-version").modal();
  },
  addVersionConfirm(context){
    var project = $(context).data("project");
    var id = $(context).data("id");
    var name = $("#version-name").val();
    try {
      var json =JSON.parse($("#version-json").val())
      $.post( "/apicms/add-version", { project, id, json: JSON.stringify(json), name})
      .done(function( data ) {
        if(data === "alreadExists"){
          alert("Version already exists")
        } else {
          if(data === "emptyName"){
            alert("Version name cannot be empty")
          } else{
            setTimeout(function(){ window.location.reload() }, 500);
          }
        }
      });
    } catch (e) {
        alert("Not a valid JSON");
    }
    localStorage.setItem("api", `${project}_${id}`);
  },
  editVersion(context){
    var apiName = $(context).data("name");
    var id = $(context).data("id");
    var version = $(context).data("version");
    var project = $(context).data("project");
    var query_string = $(context).data("qs");
    var version_name = $(context).data("version_name");
    $("#edit-version-confirm").data("project", project);
    $("#edit-version-confirm").data("id", id);
    $("#edit-version-confirm").data("version", version);
    $("#edit-version-name").val(version_name);
    $("#edit-version-qs").val(query_string);
    $("#edit-version").modal();
  },
  editVersionConfirm(context){
    var project = $(context).data("project");
    var id = $(context).data("id");
    var version_id = $(context).data("version");
    var name = $("#edit-version-name").val();
    var query_string = $("#edit-version-qs").val();

    $.post( "/apicms/edit-version", { query_string,version_id, project, id, name})
    .done(function( data ) {
      if(data === "alreadExists"){
        alert("Version already exists")
      } else {
        if(data === "emptyName"){
          alert("Version name cannot be empty")
        } else{
          setTimeout(function(){ window.location.reload() }, 500);
        }
      }
    });
    localStorage.setItem("api", `${project}_${id}`);
  },
  setActiveVersion(context){
    var id = $(context).data("id");
    var project = $(context).data("project");
    var version = $(context).data("version");
    var checked = context.checked;
    localStorage.setItem("api", `${project}_${id}`);
    $.get(`/apicms/set-active-version/${project}/${id}/${version}/${checked ? 'checked' : 'unchecked'}`, (data) => {
      setTimeout(function(){ window.location.reload() }, 500);
    });
  },
  deleteVersion(context){
    var id = $(context).data("id");
    var version = $(context).data("version");
    var project = $(context).data("project");
    $("#delete-version .delete").data("id", id);
    $("#delete-version .delete").data("version", version);
    $("#delete-version .delete").data("project", project);
    $("#delete-version").modal();
  },
  deleteVersionConfirm(context){
    var id = $(context).data("id");
    var version = $(context).data("version");
    var project = $(context).data("project");
    localStorage.setItem("api", `${project}_${id}`);
    $.get(`/apicms/delete-version/${project}/${id}/${version}`, (data) => {
      setTimeout(function(){ window.location.reload() }, 500);
    });
  },
  saveJSON(context){
    var id = $(context).data("id");
    var version = $(context).data("version");
    var project = $(context).data("project");
    localStorage.setItem("api", `${project}_${id}`);
    try {
      var json = JSON.parse($(`#${project}_${id}_${version} textarea`).val());
      $.post( "/apicms/update-version-json", { project, id, version, json: JSON.stringify(json)})
      .done(function( data ) {
        setTimeout(function(){ window.location.reload() }, 500);
      });
    } catch (e) {
        alert("Not a valid JSON");
    }
  },
  ajaxReq: 'ToCancelPrevReq',
  buildApisMarkup(data){
    if(data.data.list.length){
      var source = data.template;
      var template = Handlebars.compile(source);
      $("#apis").html(template({data: data.data}));
      app.loadQrCodes();
      app.createClipBoards();
    } else {
      $("#apis").html("No apis found.")
    }
  },
  loadQrCodes(){
    $( ".qrcode" ).each(function( index, api ) {
      $(api).qrcode({width: 100,height: 100, text: `${window.location.host}/${$(this).data("path")}`});
    });
  },
  createClipBoards(){
    new ClipboardJS('.btn');
  },
  paginate(project){
    if(!project){
      let projects = $(".project");
      projects.filter((index, project) => {
        $(project).find(".chunk#tab-1").show();
        $(project).find(".pagination").twbsPagination({
          totalPages: parseInt($(project).data("chunks")),
          visiblePages: 7,
          onPageClick: function (event, page) {
            $(project).find(".chunk").hide();
            $(project).find(`.chunk#tab-${page}`).show();
          }
        });
      });
    } else {
      let project_el = $(`.project.${project.id}`);
      $(project_el).find(".chunk").hide();
      $(project_el).find(".chunk#tab-1").show();
      $(project_el).find(".pagination").html("");
      $(project_el).find(".pagination").twbsPagination('destroy');
      $(project_el).find(".pagination").twbsPagination({
        totalPages: project.list.length,
        visiblePages: 7,
        onPageClick: function (event, page) {
          $(project_el).find(".chunk").hide();
          $(project_el).find(`.chunk#tab-${page}`).show();
        }
      });
    }
  },
  buildApisMarkup(data){
    if(data.data && data.data.project.list[0].length){
      var source = data.data.template;
      var template = Handlebars.compile(source);
      $("#apis").html(template({"project": data.data.project}));
      app.loadQrCodes();
      app.createClipBoards();
      app.paginate(data.data.project);
      $('.pagination').show();
    } else {
      $("#apis").html("No apis found.")
      $('.pagination').hide();
    }
  }
}


Handlebars.registerHelper('equals', function(v1, v2) {
  return v1 === v2;
});

Handlebars.registerHelper('tagsToString', function(tags){
  return tags.join(';');
});

Handlebars.registerHelper('getColorFromString', function(str){
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
     hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  var c = (hash & 0x00FFFFFF)
    .toString(16)
    .toUpperCase();
  return "#00000".substring(0, 7 - c.length) + c;
});

Handlebars.registerHelper('getRandomColor', function(){
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
});

Handlebars.registerHelper('toQueryString', function(queries){
  return queries.split(';').join(' & ');
});


Handlebars.registerHelper('inc', function(val){
  return val+1;
});


$(document).ready(function(){
  app.loadQrCodes();
  app.createClipBoards();
  app.paginate();
  if(localStorage.getItem("api")){
    $(`#${localStorage.getItem("api")}`).addClass("in");
    localStorage.removeItem("api");
  }
});

$(".search").keyup(function() {
  $("#apis").html('');
  let term = $(this).val();
  let project = $("#apis").data("project");
  let url = `/apicms/search-by/${project}/${$(this).data("search")}/${term}`
  if (term.length > 2) {
    $("#apis").html('<div id="search-loading">Searching...</div>');
    app.ajaxReq = $.ajax({
      url,
      type: 'GET',
      beforeSend: function() {
        if (app.ajaxReq != 'ToCancelPrevReq' && app.ajaxReq.readyState < 4) {
          app.ajaxReq.abort();
        }
      },
      success: function(data) {
        app.buildApisMarkup(data);
      },
      error: function(xhr, ajaxOptions, thrownError) {
        if (thrownError == 'abort' || thrownError == 'undefined') return;
        alert(thrownError + "\r\n" + xhr.statusText + "\r\n" + xhr.responseText);
      }
    }); //end app.ajaxReq

  }else{
    if(term.length === 0){
      $.get(`/apicms/get-all-apis/${project}`, (data) => {
        app.buildApisMarkup(data)
      });
    } else {
      $('.pagination').hide();
      $("#apis").html('Please enter minimum 3 letters.');
    }

  }
});
