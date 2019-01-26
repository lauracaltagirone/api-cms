let express = require('express');
let router = express.Router();
let cors = require('cors');
const fs = require('fs');
const fse = require('fs-extra');
var fsUtils = require("nodejs-fs-utils");
const path = require('path');
var hbs = require('express-handlebars');
const gfs = require('get-folder-size');
const uuidv1 = require('uuid/v1');
var generator = require('generate-password');
const bcrypt = require('bcrypt-nodejs');




var whitelist = [undefined, 'http://localhost:8000', 'http://localhost:3000', 'http://mybrand.pitchprototypes.eu']
var corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}


router.get('/apis-manager', isLoggedInAndCMSAdmin, (req, res) => {

    let projects = [];
    let users = [];
    if(req.user.role === "cmsSuperAdmin"){
      fse.readJsonSync(path.join(req.rootPath, `api-cms-db/projects-list.json`)).list.filter((project) => {
          projects.push(fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${project}/project.json`)));
      });
      users = fse.readJsonSync(path.join(req.rootPath, `users.json`));
    } else {
      req.user.projects.filter((project) => {
          projects.push(fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${project}/project.json`)));
      });
    }
    projects.filter((project) => {
        let size = ((fsUtils.fsizeSync(path.join(req.rootPath,`api-cms-db/${project.id}`))) / 1024 / 1024).toFixed(2);
        project.percentage = (size/project.maxSize) *100;
        project.size = size;
        project.list.filter((api) => {
          api.versions.forEach((version, index) => {
            let json = fse.readJsonSync(path.join(req.rootPath,`api-cms-db/${project.id}/${api.id}/${version.version}.json`));
            version.json = JSON.stringify(json);
          })
        });
    });

    res.render('api-cms/main', {projects, users, layout: "basic-bootstrap", user: req.user})

});

router.get('/get-project-users/:projectid', isLoggedInAndCMSAdmin,  (req, res) => {
  let users = fse.readJsonSync(path.join(req.rootPath, `users.json`));
  let activeUsers = [];
  users.filter((user) => {
    user.projects.filter((project) => {
      if(project === req.params.projectid){
        activeUsers.push(user);
      }
    });
  });
  res.send(activeUsers);
});


router.get('/apis/:project/:api', cors(corsOptions), (req, res) => {
  let api_id = req.params.api;
  let project = req.params.project;
  let apis = fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${project}/project.json`));
  let active_version;
  apis.list.filter((api) => {
    if(api.id === api_id){
      active_version = api.active_version;
    }
  });
  if(active_version === ""){
    res.send("Thsi API doesn't have an active version.");
  } else{
    res.send(fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/${req.params.api}/${active_version}.json`)));
  }
});

router.post('/apis/:project/:api', cors(corsOptions), (req, res) => {
  let api_id = req.params.api;
  let project = req.params.project;
  let apis = fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${project}/project.json`));
  let active_version;
  apis.list.filter((api) => {
    if(api.id === api_id){
      active_version = api.active_version;
    }
  });
  if(active_version === ""){
    res.send("Thsi API doesn't have an active version.");
  } else{
    res.send(fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/${req.params.api}/${active_version}.json`)));
  }
});

router.get('/add-api/:project/:name', isLoggedInAndCMSAdmin,  (req, res) => {
  let data = fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/project.json`));

  if(req.params.name === "" || req.params.name === null || req.params.name === undefined){
    res.send("emptyName");
  } else {
    let randomHash = uuidv1();
    data.list.push(
      {
        "name": req.params.name,
        "tags": ["new"],
        "id": randomHash,
        "versions": [
          {
            "version": "v1"
          }
        ],
        "active_version": "v1"
      }
    )
    fse.outputFileSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/project.json`), JSON.stringify(data));
    fse.outputFileSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/${randomHash}/v1.json`), '{"foo":"foo"}');
    res.send(req.params.id);
  }
});


router.post('/edit-api', isLoggedInAndCMSAdmin, (req, res) => {
  let data = fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${req.body.project}/project.json`));
  let payload = req.body;
  let randomHash = uuidv1();

  data.list.filter((api) => {
    if(api.id === payload.id){
      api.name = payload.name;
      api.id = randomHash;
      if(payload.tags.length){
        api.tags = payload.tags.split(';')
      } else{
        api.tags = [];
      }
    }
  });

  fse.copySync(path.join(req.rootPath, `api-cms-db/${payload.project}/${payload.id}`), path.join(req.rootPath, `api-cms-db/${payload.project}/${randomHash}`));
  fse.removeSync(path.join(req.rootPath, `api-cms-db/${payload.project}/${payload.id}`));
  fse.outputFileSync(path.join(req.rootPath, `api-cms-db/${payload.project}/project.json`), JSON.stringify(data));
  res.send(req.params.id);

});

router.get('/delete-api/:project/:id', isLoggedInAndCMSAdmin, (req, res) => {
  let data = fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/project.json`));

  let api_list = data.list.filter((api) => {
    return api.id !== req.params.id;
  });

  data.list = api_list;


  fse.outputFileSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/project.json`), JSON.stringify(data));
  fse.removeSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/${req.params.id}`));
  res.send(req.params.id);

});

router.post('/add-version', isLoggedInAndCMSAdmin, (req, res) => {
  let payload = req.body;
  let data = fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${payload.project}/project.json`));
  let versionName = "";

  data.list.filter((api) => {
    if(api.id === payload.id){
      versionName = `v${api.versions.length+1}`;
      api.versions.push({"version": versionName});
    }
  })

  fse.outputFileSync(path.join(req.rootPath, `api-cms-db/${payload.project}/project.json`), JSON.stringify(data));
  fse.outputFileSync(path.join(req.rootPath, `api-cms-db/${payload.project}/${payload.id}/${versionName}.json`), `${payload.json}`);
  res.send(payload.version);

});

router.get('/set-active-version/:project/:id/:version/:status', isLoggedInAndCMSAdmin, (req, res) => {
  let data = fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/project.json`));
  data.list.filter((api) => {
    if(api.id === req.params.id){
      if(req.params.status === "checked"){
        api.active_version = req.params.version;
      } else {
        api.active_version = "";
      }
    }
  });

  fse.outputFileSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/project.json`), JSON.stringify(data));
  res.send(req.params.id);

});

router.get('/delete-version/:project/:id/:version', isLoggedInAndCMSAdmin, (req, res) => {
  let data = fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/project.json`));
  let new_versions = [];
  data.list.filter((api) => {
    if(api.id === req.params.id){
      api.versions.filter((version) => {
        if(version.version !== req.params.version){
          new_versions.push(version);
        } else{
          if(api.active_version === version.version){
            api.active_version = "";
          }
        }
      });
      api.versions = new_versions;
    }
  });

  fse.outputFileSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/project.json`), JSON.stringify(data));
  fse.removeSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/${req.params.id}/${req.params.version}.json`));

  res.send(req.params.version);

});

router.post('/update-version-json', isLoggedInAndCMSAdmin, (req, res) => {
  let payload = req.body;

  fse.outputFileSync(path.join(req.rootPath, `api-cms-db/${payload.project}/${payload.id}/${payload.version}.json`), `${payload.json}`);
  res.send(payload.version);

});


router.get('/add-user/:email', isLoggedInAndCmsSuperAdmin, (req, res) => {
  let users = fse.readJsonSync(path.join(req.rootPath, `users.json`));
  let unique = uuidv1();
  let email = req.params.email

  users.push({
    "id" : unique,
    "name" : "Random",
    "surname" : "Lama",
    "email" : email,
    "password" : "",
    "role" : "cmsAdmin",
    "projects" : []
  });

  fse.outputFileSync(path.join(req.rootPath, `users.json`), JSON.stringify(users));

  res.send(email);

});

router.get('/add-project/:name', isLoggedInAndCMSAdmin,  (req, res) => {
    let projects =  fse.readJsonSync(path.join(req.rootPath, `api-cms-db/projects-list.json`));
    let name = req.params.name;
    let randomHash = uuidv1();
    let project = {
      "name": name,
      "id": randomHash,
      "description": `This is Project ${name}`,
      "maxSize": 10,
      "list": []
    }
    projects.list.push(randomHash);
    fse.outputFileSync(path.join(req.rootPath, `api-cms-db/${randomHash}/project.json`), JSON.stringify(project));
    fse.outputFileSync(path.join(req.rootPath, `api-cms-db/projects-list.json`), JSON.stringify(projects));

    res.send(randomHash);
});

router.post('/enable-user', isLoggedInAndCMSAdmin,  (req, res) => {

    let userid = req.body.userid;
    let projectid = req.body.projectid;
    let status = req.body.status;
    let password = generator.generate({
      length: 10,
      numbers: true
    });
    let users =  fse.readJsonSync(path.join(req.rootPath, `users.json`));
    let project = fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${projectid}/project.json`));


    users.filter((user) => {
      if(user.id === userid){
        if(status === false){
          user.projects.push(projectid);
          project.users.push(userid);
          if(user.projects.length === 1){
            // TODO: sendUser Notification and password
            user.password = bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
          } else{
            // TODO: sendUser Notification
          }
        } else {
          user.projects =  user.projects.filter(e => e !== projectid);
          project.users = project.users.filter(e => e !== userid);
          if(user.projects.length === 0){
            user.password = "";
            // TODO: send User Notification and password deleted
          } else {
            // TODO: sendUser Notification
          }
        }
      }
    });


    fse.outputFileSync(path.join(req.rootPath, `users.json`), JSON.stringify(users));
    fse.outputFileSync(path.join(req.rootPath, `api-cms-db/${projectid}/project.json`), JSON.stringify(project));

    res.send(password);
});

function isLoggedInAndCMSAdmin(req, res, next) {
  // if user is authenticated in the session, carry on
  if (req.isAuthenticated() && ((req.user.role === 'cmsAdmin') || (req.user.role === 'cmsSuperAdmin')))
    return next();

  // if they aren't redirect them to the home page
  res.redirect('/');
}

function isLoggedInAndCmsSuperAdmin(req, res, next){
  // if user is authenticated in the session, carry on
  if (req.isAuthenticated() && req.user.role === 'cmsSuperAdmin')
    return next();

  // if they aren't redirect them to the home page
  res.redirect('/');
}

module.exports = router;
