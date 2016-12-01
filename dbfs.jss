// GLOBALS --------------------------------------------------------------------------------

var dbRoot = "/DBFS";
var homeRoot = dbRoot + "/Home";

// Directory functions --------------------------------------------------------------------

// Return a directory listing as an array of objects.
function getFileInfos(path, session, node) {
    var db = getDb();
    var folderId = findFolder(db, path);
    if (!folderId)
        throw "Folder not found: " + path;
    var files = [];
    db.readTransaction(function (tx) {
        // add sub-folders from database
        var res = tx.executeSql("SELECT * FROM folders WHERE parentFolderId=?", [folderId]);
        for (var i in res.rows) {
            var folderRow = res.rows[i];
            files.push({
                name: folderRow.name,
                isFolder: true,
                length: 0,
                modifiedTime: folderRow.modifiedTime,
                createdTime: folderRow.createdTime
            });
        }

        // add files from physical directory
        res = tx.executeSql("SELECT * FROM folders WHERE folderId=?", [folderId]);
        var vfsPath = res.rows[0].vfsPath;
        var file = system.getFile(vfsPath);
        if (!file.exists())
            throw "Folder not found: " + vfsPath;
        var dirList = file.getFiles();
        for (i in dirList)
            if (dirList[i].isFile)
                files.push(dirList[i]);
    });
    return files;
}

// Create a directory at the given path
function createDirectory(path, session, node) {
    var db = getDb();
    var path = path.split('/');      // split the path into individual directories
    var name = path[path.length - 1];  // get the name of the new folder
    path.splice(-1, 1);              // remove the new directory from the path
    var parentFolderId = findFolder(db, path);
    if (!parentFolderId)
        throw "Folder not found: " + path;
    if (getSubFolderId(db, parentFolderId, name))
        throw "Folder already exists";
    db.readTransaction(function (tx) {
        var res = tx.executeSql("SELECT vfsPath FROM folders WHERE folderId=?", [parentFolderId]);
        var parentFolderVfsPath = res.rows[0].vfsPath;
        tx.executeSql("INSERT INTO folders(parentFolderId, name, vfsPath) VALUES(?, ?, ?)",
            [parentFolderId, name, parentFolderVfsPath + "/" + name]);
    });
}

// Indicate whether or not a file exists
function directoryExists(path, session, node) {
    return findFolder(getDb(), path) !== null;
}

// Delete the directory at the given path
function deleteDirectory(path, session, node) {
    var db = getDb();
    var folderId = findFolder(db, path);
    if (!folderId)
        throw "Folder not found: " + path;
    db.readTransaction(function (tx) {
        deleteFolder(db, folderId, tx);
    });
}

// File functions -------------------------------------------------------------------

// TODO

// HELPER FUNCTIONS ----------------------------------------------------------------------

// Recursively delete the folder with the given ID
function deleteFolder(db, folderId, tx) {
    var res = tx.executeSql("SELECT folderId FROM folders WHERE parentFolderId=?", [folderId]);
    for (var i in res.rows) {
        var row = res.rows[i];
        deleteFolder(db, row.folderId, tx);
    }
    tx.executeSql("DELETE FROM folders WHERE folderId=?", [folderId]);
}

// Returns the folder ID of the folder at the given path
function findFolder(db, path) {
    if (path instanceof String)  // if it's a string then split it
        path = path.split('/');
    var parentFolderId = getHomeFolderId(db);
    for (var i = 0; i < path.length; i++) {
        if (!path[i])
            continue;
        parentFolderId = getSubFolderId(db, parentFolderId, path[i]);
        if (parentFolderId == null)
            return null;
    }
    return parentFolderId;
}

// Returns the ID of the current user's home folder
function getHomeFolderId(db) {
    var folderId = null;
    db.readTransaction(function (tx) {
        var res = tx.executeSql("SELECT homeFolderId FROM users WHERE userName=?", [system.user.userName]);
        folderId = res.rows[0].homeFolderId;
    });
    return folderId;
}

// Returns the folder ID of the subfolder with the given name
function getSubFolderId(db, parentFolderId, name) {
    var folderId = null;
    db.readTransaction(function (tx) {
        var res = tx.executeSql("SELECT folderId FROM folders WHERE parentFolderId=? AND name=?",
            [parentFolderId, name]);
        folderId = res.rows[0].folderId;
    });
    return folderId;
}

// Returns open connection to the DBFS database.
// If the database doesn't exist then it creates it.
// If the current user isn't in the database then it inserts it and its home folder.
function getDb() {
    var dbExists = system.getFile(dbRoot + "/dbfs.sdf").exists();
    var db = system.openDatabaseSync(dbRoot + "/dbfs.sdf");
    if (!dbExists)
        createDb(db);
    var homeFolder = system.getFile(homeRoot);
    if (!homeFolder.exists())
        homeFolder.createFolder();
    if (!userExists(db))
        addUser(db);
    return db;
}

// Creates the DBFS database from the SQL statements contained in the dbfs.sql file in the database directory
function createDb(db) {
    var statements = createTablesSql.split(';');
    console.log("CREATING DBFS:");
    db.transaction(function (tx) {
        for (var i in statements) {
            var statement = statements[i];
            statement = statement.replace(/[\r\n]/g, "");
            if (!statement)
                continue;
            console.log(" - " + statement);
            tx.executeSql(statement);
        }
    });
}

// Returns true if the current user exists in the database
function userExists(db) {
    var exists = false;
    db.readTransaction(function (tx) {
        var res = tx.executeSql("SELECT userName FROM users WHERE userName=?", [system.user.userName]);
        exists = res.rows.length > 0;
    });
    return exists;
}

// Adds the current user and its home folder in the database
function addUser(db) {
    db.transaction(function (tx) {
        var homeFolder = system.getFile(homeRoot + "/" + system.user.userName);
        if (!homeFolder.exists())
            homeFolder.createFolder();
        var res = tx.executeSql("INSERT INTO folders(parentFolderId, name, vfsPath) VALUES(NULL, ?, ?)",
            [system.user.userName, homeFolder.fullPath]);
        tx.executeSql("INSERT INTO Users(userName, homeFolderId) VALUES (?, ?)",
            [system.user.userName, res.insertId]);
    });
}

var createTablesSql =
    "CREATE TABLE folders ( " +
    "  folderId INT IdENTITY NOT NULL PRIMARY KEY, " +
    "  parentFolderId INT, " +
    "  name NVARCHAR(256) NOT NULL, " +
    "  vfsPath NVARCHAR(1024) NOT NULL, " +
    "  createdTime DATETIME NOT NULL DEFAULT GETDATE(), " +
    "  modifiedTime DATETIME NOT NULL DEFAULT GETDATE() " +
    "); " +
    "ALTER TABLE folders ADD CONSTRAINT fkFoldersFolders FOREIGN KEY (parentFolderId) " +
    "   REFERENCES folders(folderId) ON DELETE NO ACTION ON UPDATE NO ACTION; " +
    "CREATE TABLE users ( " +
    "  userName NVARCHAR(100) NOT NULL PRIMARY KEY, " +
    "  homeFolderId INT NOT NULL, " +
    "  createdTime DATETIME NOT NULL DEFAULT GETDATE(), " +
    "  modifiedTime DATETIME NOT NULL DEFAULT GETDATE() " +
    "); " +
    "ALTER TABLE users ADD CONSTRAINT fkUsersFolders FOREIGN KEY (homeFolderId) " +
    "   REFERENCES folders(folderId) ON DELETE NO ACTION ON UPDATE NO ACTION;";