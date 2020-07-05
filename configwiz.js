
const path = require('path')
const fs = require('fs')
const glob = require('glob')
module.exports={

    setChromePath: function(new_path){
        /*
        * Set the chrome path in the config.json file
        */
        var conf_temp = require(path.join(__dirname,'/config.json'))
        console.log("Chrome path changing from '" + conf_temp.chromium_path + "' to '" + new_path + "'")
        conf_temp.chromium_path = new_path
        fs.writeFileSync(path.join(__dirname,'/config.json'), JSON.stringify(conf_temp), 'utf8');
    },

    resolveChromiumPath: function(config){
        /*
        * Resolve wildcards in the chromium path. 
        * Also resolves keyword 'default'
        * For now, default maps to '/node_modules/puppeteer/.local-chromium/*\/*\/chrome(.exe?)'
        * If default keyword is used, resolved path will be written to the config file after calling.
        */
        var chromium_path = '';
        if(!config.chromium_path) config.chromium_path='default';
        else if(config.chromium_path.includes('*')) chromium_path = glob.sync(config.chromium_path, {})[0];
        else chromium_path = config.chromium_path;

        if(chromium_path=='default'){//resolve default path
            if(process.platform=='win32') chromium_path = glob.sync(path.join(__dirname, "/node_modules/puppeteer/.local-chromium/*/*/chrome.exe"))[0]
            else chromium_path = glob.sync(path.join(__dirname, "/node_modules/puppeteer/.local-chromium/*/*/chrome"))[0]
            config.chromium_path=chromium_path
            fs.writeFileSync(path.join(__dirname,'/config.json'), JSON.stringify(config), 'utf8'); //NEEDS FIX // CAUSING TROUBLE FOR OSX
        }
        return chromium_path;
    }

}
