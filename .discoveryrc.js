module.exports = {
  name: "Discovery Docs",
  data: () => {
      return require("./regain/crawler").default("./client/views", {
          exclude: /(node_modules|tests)/,
          extensions: /\.(ts|js|json)$/
      });
  },
  cache: false,
  //cache: __dirname + "/regain/.cache",
  prepare: __dirname + "/regain/prepare.js",
  view: {
      basedir: __dirname,
      assets: [
          "./regain/ui/page/default.js",
          "./regain/ui/page/file.js",
          "./regain/ui/page/view.js",
          "./regain/ui/sidebar.js",
          "./regain/ui/sidebar.css"
      ]
  }
};
