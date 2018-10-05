obtain(['express', 'fs', 'path'], (express, fs, path)=> {
  var fileServer = express();

  console.log(path.join(__dirname, '../client'));

  fileServer.use('', express.static(path.join(__dirname, '../../../client')));
  fileServer.use('/common', express.static(path.join(__dirname, '../../../common')));

  fileServer.listen(80, function () {
    console.log('listening on 80');
  });

  exports.fileServer = fileServer;
});
