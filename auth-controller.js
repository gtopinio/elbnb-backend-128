exports.helloWorld = (req, res) => {
  res.send("Hello World!");
}

exports.getUsers = (pool) => (req, res) => {
pool.getConnection((err, connection) => {
  if (err) console.log(err);

  connection.query('SELECT * FROM User', (err, results, fields) => {
    if (err) console.log("Query Error:\n" + err);
    console.log(results);

    connection.release();

    res.send(results);
  });
});
}
