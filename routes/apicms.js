let express = require('express');
let router = express.Router();
const fs = require('fs');
const fse = require('fs-extra');
var fsUtils = require("nodejs-fs-utils");
const path = require('path');
var hbs = require('express-handlebars');
const gfs = require('get-folder-size');
const uuidv1 = require('uuid/v1');
var generator = require('generate-password');
const bcrypt = require('bcrypt-nodejs');
const nodemailer = require('nodemailer');
const pause = require('../pause');
const moment = require('moment');

const httpStatus = [100,101,102,200,201,202,203,204,205,206,207,208,226,300,301,302,303,304,305,307,308,400,401,402,403,404,405,406,407,408,409,410,411,412,413,414,415,416,417,418,421,422,423,424,426,428,429,431,444,451,499,500,501,502,503,504,505,506,507,508,510,511,59];

var transporter = nodemailer.createTransport({
 service: 'gmail',
 auth: {
        user: process.env.GMAIL,
        pass: process.env.GMAIL_PASSWORD
    }
});

router.get('/apis-manager', isLoggedInAndCMSAdmin, (req, res) => {

    let projects = [];
    let users = [];
    if(req.user){
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
          let count = 0;
          let apis_chunks = [];
          let apis_chunk = [];
          project.list.filter((api) => {
            if(count === 3){
              apis_chunks.push(apis_chunk);
              apis_chunk = [];
              count = 0;
            }
            api.versions.forEach((version, index) => {
              let json = fse.readJsonSync(path.join(req.rootPath,`api-cms-db/${project.id}/${api.id}/${version.version}.json`));
              version.json = JSON.stringify(json);
            });
            apis_chunk.push(api);
            count++;
          });
          if(apis_chunk.length && project.list.length >= 4){
            apis_chunks.push(apis_chunk);
          }
          if(project.list.length >= 4){
            project.list = apis_chunks;
          } else {
            project.list = [apis_chunk];
          }
      });
      res.render('api-cms/main', {projects, users, layout: "basic-bootstrap", user: req.user})
    } else {
      res.send('Your fingerprint is valid');
    }
});

router.get('/get-all-apis/:project', isLoggedInAndCMSAdmin, (req, res) => {

    let project = fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/project.json`));
    let count = 0;
    let apis_chunks = [];
    let apis_chunk = [];
    project.list.filter((api) => {
      if(count === 3){
        apis_chunks.push(apis_chunk);
        apis_chunk = [];
        count = 0;
      }
      api.versions.forEach((version, index) => {
        let json = fse.readJsonSync(path.join(req.rootPath,`api-cms-db/${project.id}/${api.id}/${version.version}.json`));
        version.json = JSON.stringify(json);
      });
      apis_chunk.push(api);
      count++;
    });
    if(apis_chunk.length && project.list.length >= 4){
      apis_chunks.push(apis_chunk);
    }
    if(project.list.length >= 4){
      project.list = apis_chunks;
    } else {
      project.list = [apis_chunk];
    }

    fs.readFile(path.join(req.rootPath,`views/partials/apis.hbs`), 'utf8', (err, data) => {
      res.send({data: {project, template: data}});
    });

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


router.get('/apis/:project/:api', (req, res) => {
  let api_id = req.params.api;
  let project = req.params.project;
  let apis = fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${project}/project.json`));
  let active_version;
  let delay;
  let status;
  let query;
  let query_params;
  apis.list.filter((api) => {
    if(api.id === api_id){
      active_version = api.active_version;
      delay = api.delay === undefined || api.delay === null ? 0 : api.delay;;
      status = api.status;
      query_params = api.query ? api.query.split(';') : null;
        if(active_version === ""){
          res.send("Thsi API doesn't have an active version.");
        } else{
          pause(delay).then(() => {
            if (httpStatus.includes(status)){
              res.status(status);
            }
            try {
              if(query_params && query_params.length){
                let final_query = "";
                query_params.filter((param, index) => {
                  if(index === 0){
                    final_query += req.query[`${param}`].replace(/%20/g, " ");
                  }else{
                    final_query += '_' + req.query[`${param}`].replace(/%20/g, " ");
                  }
                });
                if(api.queryType === 'partial'){
                  if(api.versions[0].qs.indexOf(final_query) !== -1){
                    res.send(fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/${req.params.api}/${api.versions[0].version}.json`)));
                  } else {
                    res.send([]);
                  }
                } else {
                  let version_exists = false;
                  api.versions.filter((version)=> {
                    if (version.qs === final_query){
                      version_exists = true;
                      res.send(fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/${req.params.api}/${version.version}.json`)));
                    }
                  });
                  if(!version_exists){
                    res.send(fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/${req.params.api}/${active_version}.json`)));
                  }
                }
              } else {
                res.send(fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/${req.params.api}/${active_version}.json`)));
              }
            }
            catch(err) {
              res.status(404);
              res.send(err);
            }
          });
        }
    }
  });

});

router.post('/apis/:project/:api', (req, res) => {
  let api_id = req.params.api;
  let project = req.params.project;
  let apis = fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${project}/project.json`));
  let active_version;
  let delay;
  let status;
  let query;
  let query_params;
  apis.list.filter((api) => {
    if(api.id === api_id){
      active_version = api.active_version;
      delay = api.delay === undefined || api.delay === null ? 0 : api.delay;;
      status = api.status;
      query_params = api.query ? api.query.split(';') : null;
        if(active_version === ""){
          res.send("Thsi API doesn't have an active version.");
        } else{
          pause(delay).then(() => {
            if (httpStatus.includes(status)){
              res.status(status);
            }
            try {
              if(query_params && query_params.length){
                let final_query = "";
                query_params.filter((param, index) => {
                  if(index === 0){
                    final_query += req.query[`${param}`].replace(/%20/g, " ");
                  }else{
                    final_query += '_' + req.query[`${param}`].replace(/%20/g, " ");
                  }
                });
                if(api.queryType === 'partial'){
                  if(api.versions[0].qs.indexOf(final_query) !== -1){
                    res.send(fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/${req.params.api}/${api.versions[0].version}.json`)));
                  } else {
                    res.send([]);
                  }
                } else {
                  let version_exists = false;
                  api.versions.filter((version)=> {
                    if (version.qs === final_query){
                      version_exists = true;
                      res.send(fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/${req.params.api}/${version.version}.json`)));
                    }
                  });
                  if(!version_exists){
                    res.send(fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/${req.params.api}/${active_version}.json`)));
                  }
                }
              } else {
                res.send(fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/${req.params.api}/${active_version}.json`)));
              }
            }
            catch(err) {
              res.status(404);
              res.send(err);
            }
          });
        }
    }
  });
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
        "versions": [],
        "queryType": "dry",
        "active_version": null
      }
    )
    fse.outputFileSync(path.join(req.rootPath, `api-cms-db/${req.params.project}/project.json`), JSON.stringify(data));
    res.send(req.params.id);
  }
});


router.post('/edit-api', isLoggedInAndCMSAdmin, (req, res) => {
  let data = fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${req.body.project}/project.json`));
  let payload = req.body;

  data.list.filter((api) => {
    if(api.id === payload.id){
      api.name = payload.name;
      api.status = parseInt(payload.status);
      api.delay = parseInt(payload.delay);
      api.query = payload.query;
      api.queryType = payload.queryType;
      if(payload.tags.length){
        api.tags = payload.tags.split(';')
      } else {
        api.tags = [];
      }
    }
  });

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
  let version =  uuidv1();
  let externalEditHash = uuidv1();


  data.list.filter((api) => {
    if(api.id === payload.id){
      api.versions.push({
        version,
        name: payload.name,
        externalEditHash,
        externalNewEdit: false,
        externalJSON: '{}',
        comments: []
      });
    }
  })

  fse.outputFileSync(path.join(req.rootPath, `api-cms-db/${payload.project}/project.json`), JSON.stringify(data));
  fse.outputFileSync(path.join(req.rootPath, `api-cms-db/${payload.project}/${payload.id}/${version}.json`), `${payload.json}`);
  res.send(payload.version);

});

router.post('/edit-version', isLoggedInAndCMSAdmin, (req, res) => {
  let payload = req.body;
  let data = fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${payload.project}/project.json`));


  data.list.filter((api) => {
    if(api.id === payload.id){
      api.versions.filter((version) => {
        if(version.version === payload.version_id){
          version.name = payload.name;
          version.qs = payload.query_string;
        }
      });
    }
  })

  fse.outputFileSync(path.join(req.rootPath, `api-cms-db/${payload.project}/project.json`), JSON.stringify(data));
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
      "list": [],
      "users": []
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
    let fingerprint = generator.generate({
      length: 15,
      numbers: true
    });
    let password = generator.generate({
      length: 10,
      numbers: true
    });
    let users =  fse.readJsonSync(path.join(req.rootPath, `users.json`));
    let project = fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${projectid}/project.json`));
    let fingerprints = fse.readJsonSync(path.join(req.rootPath, `fingerprints.json`));
    var mailOptions = {}

    users.filter((user) => {
      if(user.id === userid){
        if(status === 'true'){
          user.projects.push(projectid);
          project.users.push(userid);
          user.fingerprint = fingerprint;
          fingerprints.push(fingerprint);
          if(user.projects.length === 1){
            mailOptions = {
              from: 'iamadumbmailer@gmail.com', // sender address
              to: user.email, // list of receivers
              subject: 'APICMS - WELCOME', // Subject line
              html: `<h2>Hi ${user.name} ${user.surname}</h2><br> You have been added to ${project.name} project. <br>Please Login at <a href="www.api.acz-core.com">api.acz-core.com</a> `// plain text body
            };
            if(user.password === null || user.password === undefined || !user.password.length){
              user.password = bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
              user.fingerprint = fingerprint;
              mailOptions.html = `<h2>Hi ${user.name} ${user.surname}</h2><br> You have been added to ${project.name} project. <br>Please Login at <a href="www.api.acz-core.com">api.acz-core.com</a> with following credentials:<br> <b>Email:</b>${user.email}<br><b>Password:</b> ${password}<br><br>Your unique fingerprint is: ${fingerprint}`;
            }
          } else{
            mailOptions = {
              from: 'iamadumbmailer@gmail.com', // sender address
              to: user.email, // list of receivers
              subject: 'APICMS - WELCOME', // Subject line
              html: `<h2>Hi ${user.name} ${user.surname}</h2><br> You have been added to ${project.name} project. <br>Please Login at <a href="www.api.acz-core.com">api.acz-core.com</a>`// plain text body
            };
          }
        } else {
          user.projects =  user.projects.filter(e => e !== projectid);
          project.users = project.users.filter(e => e !== userid);
          if(user.projects.length === 0){
            mailOptions = {
              from: 'iamadumbmailer@gmail.com', // sender address
              to: user.email, // list of receivers
              subject: 'APICMS - WELCOME', // Subject line
              html: `<h2>Hi ${user.name} ${user.surname}</h2><br> You have been removed from ${project.name} project. <br>`// plain text body
            };
          } else {
            mailOptions = {
              from: 'iamadumbmailer@gmail.com', // sender address
              to: user.email, // list of receivers
              subject: 'APICMS - WELCOME', // Subject line
              html: `<h2>Hi ${user.name} ${user.surname}</h2><br> You have been removed from ${project.name} project. <br>`// plain text body
            };
          }
        }
        transporter.sendMail(mailOptions, function (err, info) {
           if(err)
             console.log(err)
           else
             console.log(info);
        });
      }
    });


    fse.outputFileSync(path.join(req.rootPath, `users.json`), JSON.stringify(users));
    fse.outputFileSync(path.join(req.rootPath, `fingerprints.json`), JSON.stringify(fingerprints));
    fse.outputFileSync(path.join(req.rootPath, `api-cms-db/${projectid}/project.json`), JSON.stringify(project));

    res.send(password);
});

router.get('/search-users/:projectId/:term', isLoggedInAndCMSAdmin,  (req, res) => {
    let users = fse.readJsonSync(path.join(req.rootPath, `users.json`));
    let term = req.params.term;
    let projectId = req.params.projectId;

    res.send(users.filter((user) => {
      return user.email.includes(term) && user.role === "cmsAdmin";
    }));
});

router.get('/search-by/:projectId/:what/:term', isLoggedInAndCMSAdmin,  (req, res) => {
    let what = req.params.what;
    let project = fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${req.params.projectId}/project.json`));
    let filtered_apis = [];
    let count = 0;
    let apis_chunks = [];
    let apis_chunk = [];
    switch (what) {
      case 'name':
        project.list.filter((api) => {
          if(api.name.includes(req.params.term)){
            filtered_apis.push(api);
          }
        });
        break;
      case 'tag':
          project.list.filter((api) => {
            api.tags.filter((tag) => {
              if(tag.includes(req.params.term) && !filtered_apis.includes(api)){
                filtered_apis.push(api);
              }
            });
          });
        break;

      case 'hash':
          project.list.filter((api) => {
            if(api.id === req.params.term){
              filtered_apis.push(api);
            }
          });
          break;
      default:

    }
    project.list = filtered_apis;
    project.list.filter((api) => {
      if(count === 3){
        apis_chunks.push(apis_chunk);
        apis_chunk = [];
        count = 0;
      }
      api.versions.forEach((version, index) => {
        let json = fse.readJsonSync(path.join(req.rootPath,`api-cms-db/${project.id}/${api.id}/${version.version}.json`));
        version.json = JSON.stringify(json);
      });
      apis_chunk.push(api);
      count++;
    });
    if(apis_chunk.length && project.list.length >= 4){
      apis_chunks.push(apis_chunk);
    }
    if(project.list.length >= 4){
      project.list = apis_chunks;
    } else {
      project.list = [apis_chunk];
    }
    fs.readFile(path.join(req.rootPath,`views/partials/apis.hbs`), 'utf8', (err, data) => {
      res.send({data: {project, template: data}});
    });
});

router.get('/external-edit/:projectId/:apiId/:externalEditHash', (req, res) => {
  let projectId = req.params.projectId;
  let externalEditHash = req.params.externalEditHash;
  let apiId = req.params.apiId;
  let project = fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${projectId}/project.json`));
  let versionFound = false;
  project.list.filter((api) => {
    if(api.id === apiId){
      api.versions.filter((version) => {
        if(version.externalEditHash === externalEditHash){
          versionFound = true;
          let versionJSON = fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${projectId}/${apiId}/${version.version}.json`));
          res.render('api-cms/external-edit', {
            'versionJSON': JSON.stringify(versionJSON),
            'externalJSON': version.externalJSON,
            'versionName': version.name,
            'apiName': api.name,
            'projectName': project.name,
            version,
            'user': req.user
          })
        }
      });
    }
  });
  if(!versionFound){
    res.send("Version not found");
  }
});

router.post('/external-save/:projectId/:apiId/:externalEditHash', (req, res) => {
  let json = req.body.externalJSON;
  let projectId = req.params.projectId;
  let externalEditHash = req.params.externalEditHash;
  let apiId = req.params.apiId;
  let project = fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${projectId}/project.json`));
  let versionFound = false;
  project.list.filter((api) => {
    if(api.id === apiId){
      api.versions.filter((version) => {
        if(version.externalEditHash === externalEditHash){
          versionFound = true;
          version.externalJSON = json;
          version.externalNewEdit = true;
          fse.outputFileSync(path.join(req.rootPath, `api-cms-db/${projectId}/project.json`), JSON.stringify(project));
          res.send("success");
        }
      });
    }
  });
  if(!versionFound){
    res.send("Version not found");
  }
});
router.post('/external-save-comment/:projectId/:apiId/:externalEditHash', (req, res) => {
  let comment = req.body.comment;
  let issuer = req.body.issuer;
  let projectId = req.params.projectId;
  let externalEditHash = req.params.externalEditHash;
  let apiId = req.params.apiId;
  let project = fse.readJsonSync(path.join(req.rootPath, `api-cms-db/${projectId}/project.json`));
  let versionFound = false;
  project.list.filter((api) => {
    if(api.id === apiId){
      api.versions.filter((version) => {
        if(version.externalEditHash === externalEditHash){
          versionFound = true;
          version.comments.push({
            comment,
            date: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
            issuer,
            isInternal: req.user ? true : false
          });
          fse.outputFileSync(path.join(req.rootPath, `api-cms-db/${projectId}/project.json`), JSON.stringify(project));
          res.send("success");
        }
      });
    }
  });
  if(!versionFound){
    res.send("Version not found");
  }
});

function isLoggedInAndCMSAdmin(req, res, next) {
  let fingerPrints = fse.readJsonSync(path.join(req.rootPath, `fingerprints.json`));
  let fingerprint = req.headers.fingerprint;
  let validFingerPrint = fingerPrints.includes(fingerprint);
  // if user is authenticated in the session, carry on
  if(validFingerPrint){
    req.validFingerPrint = true;
  }
  if ((req.isAuthenticated() && ((req.user.role === 'cmsAdmin') || (req.user.role === 'cmsSuperAdmin'))) || validFingerPrint)
    return next();
  // if they aren't redirect them to the home page
  res.redirect('/');
}

function isLoggedInAndCmsSuperAdmin(req, res, next){
  let fingerPrints = fse.readJsonSync(path.join(req.rootPath, `fingerprints.json`));
  let fingerprint = req.headers.fingerprint;
  let validFingerPrint = fingerPrints.includes(fingerprint);
  // if user is authenticated in the session, carry on
  if(validFingerPrint){
    req.validFingerPrint = true;
  }
  if ((req.isAuthenticated() && req.user.role === 'cmsSuperAdmin') || validFingerPrint)
    return next();

  // if they aren't redirect them to the home page
  res.redirect('/');
}

module.exports = router;
