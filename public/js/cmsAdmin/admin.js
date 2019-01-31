var admin = {
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
    $("#manage-users").data("projectId", projectid)
    $.get(`/apicms/get-project-users/${projectid}`, (users) => {
      $("#active-users").html("");
      admin.buildManageUsers(users, projectid);
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
        $("#search-users").html("");
        admin.buildManageUsers(users, projectid);
      });
    });
  },
  enableUser(context){
    let userid = $(context).data("userid");
    let projectid = $(context).data("projectid");
    $.post( "/apicms/enable-user", { userid, projectid, status: true})
    .done(function() {
      $.get(`/apicms/get-project-users/${projectid}`, (users) => {
        $("#active-users").html("");
        $("#search-users").html("");

        admin.buildManageUsers(users, projectid);
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
        <button class="btn btn-success btn-xs" data-userid="${user.id}" data-projectid="${projectid}" onclick="admin.removeUserFromProject(this)"><span class="glyphicon glyphicon-remove"></span> Remove</button>
        </div>`)
      });
    }else {
      $("#active-users").html("<i>No users for this Project</i>");
    }
  },
  buildManageUsersSearch(users, projectid){
    if(users.length){
      users.filter((user) => {
        if(user.projects.includes(projectid)){
          $("#search-users").append(`<div class="active-user">
          <b>${user.name} ${user.surname}</b>
          <br>
          <span>${user.email}</span>
          <br>
          <br>
          <button class="btn btn-success btn-xs" data-userid="${user.id}" data-projectid="${projectid}" onclick="admin.removeUserFromProject(this)"><span class="glyphicon glyphicon-remove"></span> Remove</button>
          </div>`)
        } else{
          $("#search-users").append(`<div class="active-user">
          <b>${user.name} ${user.surname}</b>
          <br>
          <span>${user.email}</span>
          <br>
          <br>
          <button class="btn btn-success btn-xs" data-userid="${user.id}" data-projectid="${projectid}" onclick="admin.enableUser(this)"><span class="glyphicon glyphicon-plus"></span> Enable</button>
          </div>`)
        }
      });
    }else {
      $("#search-users").html("<i>No users found</i>");
    }
  },
  ajaxReq: 'ToCancelPrevReq'
}
$(".search-users").keyup(function() {
  let projectId = $("#manage-users").data("projectId");
  $("#search-users").html('');
  let term = $(this).val();
  let url = `/apicms/search-users/${projectId}/${term}`
  if (term.length > 2) {
    $("#search-users").html('<div id="search-loading">Searching...</div>');
    admin.ajaxReq = $.ajax({
      url,
      type: 'GET',
      beforeSend: () => {
        if (admin.ajaxReq != 'ToCancelPrevReq' && admin.ajaxReq.readyState < 4) {
          admin.ajaxReq.abort();
        }
      },
      success: (users) => {
        $("#search-users").html('');
        admin.buildManageUsersSearch(users, projectId);
      },
      error: function(xhr, ajaxOptions, thrownError) {
        if (thrownError == 'abort' || thrownError == 'undefined') return;
        alert(thrownError + "\r\n" + xhr.statusText + "\r\n" + xhr.responseText);
      }
    }); //end admin.ajaxReq

  }

});
