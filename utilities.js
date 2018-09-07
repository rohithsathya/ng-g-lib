var chalk = require('chalk');
var fs = require('fs');
var shell = require('shelljs');
var path = require('path');
var upath = require('upath');
var _ = require('lodash');

module.exports = {
    exeCmdEH:function(exeStatus,cmdTxt){
        if(exeStatus.code == 0){
            this.logInfo("cmd execution : "+cmdTxt);
        }else{
            this.logError("cmd execution : "+cmdTxt);
            process.exit(1);
        }
    },
    logInfo:function(desc){
        console.log(chalk.blue("Info\t:\t"+desc));
    },
    logError:function(desc){
        console.log(chalk.blue("Error\t:\t"+desc));
    },
    logSuccess:function(desc){
        console.log(chalk.green("Success\t:\t"+desc));
    },
    writeFileSyncEH(filepath,content){
        try{
            fs.writeFileSync(filepath,content);
            this.logInfo('create/update '+filepath);
        }catch(e){
            this.logError('create/update '+filepath);
            console.log(e);
        }
    },
    requireFileWithEH(filepath){
        try{
            return require(filepath);
        }catch(e){
            this.logInfo('required file not present '+filepath);
        }
    },
    filesInDirRecursive:function(dir,ext){
        var results =[];
        fs.readdirSync(dir).forEach(function(dirInner){
            dirInner = path.resolve(dir,dirInner);
            var stat = fs.statSync(dirInner);
            if(stat.isDirectory()){
                results = results.concat(module.exports.filesInDirRecursive(dirInner,ext));
            }
            if(stat.isFile() && dirInner.endsWith(ext)){
                results.push(dirInner);
            }
        });
        return results;
    },
    isAngularRootDir:function(){
        return (fs.existsSync("./package.json") && fs.existsSync("./node_modules"));// && fs.existsSync("./.angular-cli.json")
    },
    npmModuleInstalled:function(configFileName){
        var ngLibJson = this.requireFileWithEH(path.join(process.cwd(),'./'+configFileName));
        return Boolean(ngLibJson);
    },
    addNgPackgr:function(){
        var ngPkgInstallCmd = "npm install ng-packagr@3.0.3 --save-dev";
        this.exeCmdEH(shell.exec(ngPkgInstallCmd),"Install ng packagr");
    },
    classNameCasing:function(str){
        var camelCase = _.camelCase(str);
        return camelCase.charAt(0).toUpperCase()+camelCase.slice(1);
    },
    componentRelPath :function(absPath){
        var relFromSrcFilePath = path.relative(process.cwd()+"/src/app",absPath);
        relFromSrcFilePath = upath.toUnix("."+path.sep+relFromSrcFilePath);
        relFromSrcFilePath = relFromSrcFilePath.substring(0,relFromSrcFilePath.lastIndexOf(".")) || relFromSrcFilePath;
        return relFromSrcFilePath;
    },
    componentNameFromPath:function(filePath){
        var componentName = path.basename(filePath,".component.ts");
        return this.classNameCasing(componentName)+"Component";
    }

};