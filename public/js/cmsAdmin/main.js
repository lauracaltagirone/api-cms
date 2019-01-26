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
    var oldName = $(context).data("old-name");
    var project = $(context).data("project");
    $("#edit-api-confirm").data("project", project);
    $("#edit-api-confirm").data("id", id);
    $("#edit-api .tags").val(tags);
    $("#edit-api .name").val(oldName);
    $("#edit-api").modal();
  },
  editAPIConfirm(context){
    var name = $("#edit-api .name").val().trim();
    var tags = $("#edit-api .tags").val().split(';').join(';');
    var project = $(context).data("project");
    var id = $(context).data("id");

    $.post( "/apicms/edit-api", { project, name, id, tags})
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
  addUser(){
    $("#add-user").modal();
  },
  addUserConfirm(context){
    let email = $("#email").val();
    $.get(`/apicms/add-user/${email}`, (data) => {
      alert(data);
      setTimeout(function(){ window.location.reload() }, 500);
    });
  },
  addProject(){
    $("#add-project").modal();
  },
  addProjectConfirm(){
    let name = $("#project-name").val();
    $.get(`/apicms/add-project/${name}`, (data) => {
      setTimeout(function(){ window.location.reload() }, 500);
    });
  },
  manageUsers(context){
    let projectid = $(context).data("id");
    $.get(`/apicms/get-project-users/${projectid}`, (users) => {
      $("#active-users").html("");
      app.buildManageUsers(users, projectid);
    });

    $("#manage-users").modal()
  },
  removeUserFromProject(context){
    let userid = $(context).data("userid");
    let projectid = $(context).data("projectid");
    $.post( "/apicms/enable-user", { userid, projectid, status: false})
    .done(function() {
      $.get(`/apicms/get-project-users/${projectid}`, (users) => {
        $("#active-users").html("");
        app.buildManageUsers(users, projectid);
      });
    });
  },
  buildManageUsers(users, projectid){
    if(users.length){
      users.filter((user) => {
        $("#active-users").append(`<div class="active-user">
        <b>${user.name} ${user.surname}</b>
        <br>
        <span>${user.email}</span>
        <br>
        <br>
        <button class="btn btn-success btn-xs" data-userid="${user.id}" data-projectid="${projectid}" onclick="app.removeUserFromProject(this)"><span class="glyphicon glyphicon-remove"></span> Remove</button>
        </div>`)
      });
    }else {
      $("#active-users").html("<i>No users for this Project</i>");
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

$(".search").keyup(function() {
  $("#apis").html('');
  let term = $(this).val();
  let url = `/apicms/search-by-${$(this).data("search")}/${term}`
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
      $.get(`/apicms/get-all-apis`, (data) => {
        app.buildApisMarkup(data)
      });
    } else {
      $("#apis").html('Please enter minimum 3 letters.');
    }

  }

})

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
