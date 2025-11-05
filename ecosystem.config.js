module.exports = {
  apps : [{
    name   : "server",
    script : "./server.js",
    error_file : "/home/node/.pm2/logs/server-error.log",
    out_file : "/home/node/.pm2/logs/server-out.log"
  }]
}
