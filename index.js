#! /usr/bin/env node

var shell = require("shelljs");
var fs = require("fs");
var path = require("path");
var _ = require("lodash");
var format = require("string-template");
var cmdUtilities = require("./utilities");

var componentsImportText    =   "";
var componentsNameListCSV   =   "";
var configFileName          =   "ngLibJson.json"; 
var exportModuleFileText    =   `
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
{componentsImportText}
@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    {componentsNameListCSV}
  ],
  exports: [
    {componentsNameListCSV}
  ]
})
export class {libName} { }
`;

function init(){
    if(cmdUtilities.isAngularRootDir()){
        exportApp();

    }else{
        cmdUtilities.logError("Please run the command from angular project's root directory.\n (Directory with package.json file)");
    }
}

function createComponentNameImportsString(){
    var compFileNamesList   =   cmdUtilities.filesInDirRecursive("./src/app/",".component.ts");
    componentsImportText    =   "";
    componentsNameListCSV   =   "";
    compFileNamesList.forEach(file=>{
        var componentName = cmdUtilities.componentNameFromPath(file);
        if(componentName.toLowerCase() != "appcomponent"){
            componentsNameListCSV   += componentName+",";
            componentsImportText    += "import { "+ componentName +" } from '"+ cmdUtilities.componentRelPath(file) +"';\n";
        }
    })
}
function createExportModule(libName){
    createComponentNameImportsString();
    exportModuleFileText = format(exportModuleFileText,{
        componentsImportText:componentsImportText,
        componentsNameListCSV:componentsNameListCSV,
        libName:libName
    });
    fs.writeFileSync("./src/app/"+_.camelCase(libName)+".module.ts",exportModuleFileText);
}

function deleteExportModule(libName){
    fs.unlinkSync("./src/app/"+_.camelCase(libName)+".module.ts");
}

function updatePackageJson(pjson){
    pjson["scripts"]["packagr"] = "ng-packagr -p ng-package.json";
    pjson["private"] = false;
    cmdUtilities.writeFileSyncEH('package.json',JSON.stringify(pjson,null,2));
}

function createNgPackageJson(){
    var ngPackageJson = {
        "$schema": "./node_modules/ng-packagr/ng-package.schema.json",
        "lib": {
          "entryFile": "public_api.ts"
        },
        "whitelistedNonPeerDependencies":["."]
      }
    cmdUtilities.writeFileSyncEH('ng-package.json',JSON.stringify(ngPackageJson,null,2));
}

function createNgLibJson(){
    var ngLibJson = {
        installed: true,
        date: new Date()
    }
    cmdUtilities.writeFileSyncEH(configFileName,JSON.stringify(ngLibJson,null,2));
}

function createPublicApiFile(libName){
    var publicApiString = "export * from './src/app/"+libName+".module';";
    cmdUtilities.writeFileSyncEH("public_api.ts",publicApiString);
}

function logHelpInfo(pjson,libName,publishTo){
    cmdUtilities.logInfo("Library exported successfully");
    cmdUtilities.logInfo("=========How To Consume=======");
    cmdUtilities.logInfo("Install the exported library");
    if(publishTo.toLocaleLowerCase() == "npm"){
        cmdUtilities.logInfo(">npm i "+pjson["name"]);

    }else{
        cmdUtilities.logInfo(">npm i ngLib/"+pjson["name"]+"-"+pjson["version"]+".tgz");
    }
    cmdUtilities.logInfo("Import the exported library into your module(@NgModule)");
    cmdUtilities.logInfo("import {"+libName+"} from '"+pjson["name"]+"';");
    cmdUtilities.logInfo("add it to imports array of your module  imports:["+libName+ "]");
    cmdUtilities.logInfo("Now Start using the components in the exported library");


}

function moveTarFileToNgLib(tarfileName){
    var destDir = "../ngLib/";
    var srcDir = "./";
    !fs.existsSync(destDir) && fs.mkdirSync(destDir);
    fs.renameSync(srcDir+tarfileName,destDir+tarfileName);
}

function exportApp(){
    var pjson = cmdUtilities.requireFileWithEH(path.join(process.cwd(),'./package.json'));
    var libName = cmdUtilities.classNameCasing(pjson["name"]);
    //parse cli arguments to identify if it needs to be published to npm or local
    var publishTo = process.argv[2] || "local"; //default local
    createExportModule(libName);
    if(!cmdUtilities.npmModuleInstalled(configFileName)){
        cmdUtilities.addNgPackgr();
        createNgLibJson();
        updatePackageJson(pjson);
        createNgPackageJson();
        createPublicApiFile(libName);
    }
    cmdUtilities.logInfo("=======Building Angular Library("+libName+") Start===========");
    cmdUtilities.exeCmdEH(shell.exec("npm run packagr"),"npm run packagr");
    deleteExportModule(libName);
    cmdUtilities.exeCmdEH(shell.cd("dist"),"cd dist");
    if(publishTo.toLocaleLowerCase() == "npm"){
        cmdUtilities.exeCmdEH(shell.exec("npm publish"),"npm pack");
    }else{
        cmdUtilities.exeCmdEH(shell.exec("npm pack"),"npm pack");
        moveTarFileToNgLib(pjson["name"]+"-"+pjson["version"]+".tgz");
    }
    cmdUtilities.logInfo("=======Building Angular Library("+libName+") End===========");
    logHelpInfo(pjson,libName,publishTo);
    shell.exit(0);
}
init();
