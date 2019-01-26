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
    req.user.projects.filter((project) => {
        projects.push(fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${project}/project.json`)));
    });
    projects.filter((project) => {
        let size = ((fsUtils.fsizeSync(path.join(req.rootPath,`api-cms-db/${project.name}`))) / 1024 / 1024).toFixed(2);
        project.percentage = (size/project.maxSize) *100;
        project.size = size;
        project.list.filter((api) => {
          api.versions.forEach((version, index) => {
            let json = fse.readJsonSync(path.join(req.rootPath,`api-cms-db/${project.name}/${api.id}/${version.version}.json`));
            version.json = JSON.stringify(json);
          })
        });
    });

    res.render('api-cms/main', {projects, layout: "basic-bootstrap", user: req.user})

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


function isLoggedInAndCMSAdmin(req, res, next) {
  // if user is authenticated in the session, carry on
  if (req.isAuthenticated() && ((req.user.role === 'cmsAdmin') || (req.user.role === 'cmsSuperAdmin')))
    return next();

  // if they aren't redirect them to the home page
  res.redirect('/');
}

module.exports = router;
