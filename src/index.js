import { join } from "path";
import express from "express";
import exphbs from "express-handlebars";

const app = express();
const port = 8080;

app.engine(".hbs", exphbs({
  defaultLayout: "main",
  extname: ".hbs",
  layoutsDir: join(__dirname, "../src/views/layouts")
}));
app.set("view engine", ".hbs");
app.set("views", join(__dirname, "../src/views"));

app.get("/", (request, response) => {
  response.render("home", {
    netloc: request.header("x-forwarded-for") || request.connection.remoteAddress
  });
});

app.listen(port, (err) => {
  if (err) {
    return console.log("demo app failed to start!", err);
  }
  console.log(`demo app is listening on ${port}`);
});

import { GetRMMAgent } from "./controllers/pubAndSubControl";
import { GetConnection } from "./models/dao";
GetRMMAgent();
GetConnection();
