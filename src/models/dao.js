import Sequelize from "sequelize";

// please use correct local environment settings for testing purpose
const localEnv = JSON.stringify({
  "postgresql": [{
    "credentials": {
      "uri": "postgresql://user:secret@localhost"
    }
  }]
});

const vcapServices = JSON.parse(process.env.VCAP_SERVICES || localEnv);
const dbUri = vcapServices["postgresql"][0].credentials.uri;

var sequelizeConn;

function InitDbConn() {
  // create a connection pool with cutom settings
  // options information at http://docs.sequelizejs.com/manual/installation/usage.html#options
  let dbConn = new Sequelize(dbUri, {
    /*
    dialect: "postgres",
    native: true,
    define: {
      charset: "utf8",
      timestamps: true
    },
    pool: {
      max: 3,
      acquire: 60000,
      idle: 30000
    }
    */
  });

  // test the connection
  dbConn
    .authenticate()
    .then(() => {
      console.log("Connected to postgresql service.");
      sequelizeConn = dbConn;
    })
    .catch(err => {
      console.log("Failed to connect to postgresql service: ", err);
    });
}

export function GetConnection() {
  if (typeof(serializeConn) === "undefined") {
    InitDbConn();
  } else {
    return sequelizeConn;
  }
}