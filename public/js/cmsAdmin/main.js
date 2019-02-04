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
    $("#edit-api-confirm").data("project", project);
    $("#edit-api-confirm").data("id", id);
    $("#edit-api .tags").val(tags);
    $("#edit-api .name").val(oldName);
    $("#edit-api .status").val(status);
    $("#edit-api .delay").val(delay);
    $("#edit-api").modal();
  },
  editAPIConfirm(context){
    var name = $("#edit-api .name").val().trim();
    var tags = $("#edit-api .tags").val().split(';').join(';');
    var status = $("#edit-api .status").val().trim();
    var delay = $("#edit-api .delay").val().trim();
    var project = $(context).data("project");
    var id = $(context).data("id");

    $.post( "/apicms/edit-api", { project, name, id, tags, delay, status})
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
    try {
      var json =JSON.parse($("#version-json").val())
      $.post( "/apicms/add-version", { project, id, json: JSON.stringify(json)})
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
  },
  setActiveVersion(context){
    var id = $(context).data("id");
    var project = $(context).data("project");
    var version = $(context).data("version");
    var checked = context.checked;
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
    $.get(`/apicms/delete-version/${project}/${id}/${version}`, (data) => {
      setTimeout(function(){ window.location.reload() }, 500);
    });
  },
  saveJSON(context){
    var id = $(context).data("id");
    var version = $(context).data("version");
    var project = $(context).data("project");
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
    } else {
      $("#apis").html("No apis found.")
    }
  },
  loadQrCodes(){
    $( ".qrcode" ).each(function( index, api ) {
      $(api).qrcode({width: 64,height: 64, text: `${window.location.host}/${$(this).data("path")}`});
    });
  }
}

$(document).ready(function(){
  app.loadQrCodes();
});

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
