# Database File-System Adapter in JSS for CompleteFTP

## Description

This is a file-system adapter extension that implements a file-system whose structure is stored
in a database, but whose files are stored in the regular file-system.  It's written in JSS
(Javascript Server-Side).  This implementation uses SQL Server Compact, but it's relatively easy
to convert to another database.  E-mail support@enterprisedt.com if in doubt.

## Limitations

Currently the implementation only support creation of directories and listing of files in the
corresponding physical directories (placed there independently).  The next obvious step is to
add support for uploads and downloads.

## Requirements

CompleteFTP Enterprise Edition version 9.0 or later.

## Installation

1. Open CompleteFTP Manager.
2. Go to the Extensions panel.
3. Click 'Add extension'.
4. Select 'Javascript (JSS) extension' -> 'File system'.
5. Enter 'DBFS' in the Name field.
6. Select 'File' -> 'Open from...' -> 'File on server'.
7. Select the file, dbfs.jss, from whereever you placed it.
8. Click 'Apply changes'.
9. Go to the Folders panel.
10. Click 'Add root folder' -> 'Windows folder'
11. Select the directory in which you want to create the database and the folder
    structure in which the files will be stored.
12. Name the newly created folder, 'DBFS'.
13. Click 'Apply changes'.

## Testing the installation

The next step is to create a DBFS folder in the virtual file-system.  To do this, right-click
on an existing folder, select 'Add folder' -> 'DBFS'.  You should now be able to log in via
an FTP client and navigate into the DBFS folder.  Any directories that you create from the client
will be created inside the database, as well as the physical directory.

## Tips and Troubleshooting

* Use Windows Explorer to see the physical directories being created (via the FTP client).
* Use [Compact View](http://www.softpedia.com/get/Internet/Servers/Database-Utils/CompactView.shtml) to inspect the contents of the SQL Server Compact database.
* Place logging messages in the JSS code using ``console.log("My log message");``
* Open the real-time logging window inside CompleteFTP Manager to see log messages.
* You can edit the JSS code in your favourite editor or from within CompleteFTP.
* CompleteFTP will pick up any changes that you make in real-time.  Unlike .NET extensions,
  there's no need to restart CompleteFTP each time a change is made.