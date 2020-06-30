#!/usr/bin/env node

const puppeteer = require('puppeteer');
const { program } = require('commander');
const fs = require('fs')
const path = require('path')
var glob = require('glob')

//pretty colors
var fail="[\033[91m+\033[0m]"
var succ="[\033[92m+\033[0m]"
var warn="[\033[93m+\033[0m]"
var info="[\033[94m+\033[0m]"
var gstart =  "\033[92m"
var bstart =  "\033[94m"
var ystart =  "\033[93m"
var rstart =  "\033[91m"
var colstop = "\033[0m"

/////////////////////////////////////////
//SET CLI PARAMETERS
program
.option('-w, --wordlist <file>', '[required] wordlist to use')
.option('-u, --url <url>', '[required] url to fuzz')
.option('-t, --threads <tcount>', 'threads to run', 5)
.option('-v, --verbose', 'verbosity')
.option('-o, --output <filename>', 'output filename')
.option('-d, --demo', 'Demo mode, hides url\'s in output, and clears terminal when run (to hide url in cli)')
.option('-s, --status', 'Show requests with unusual response codes')
.option('-oA, --outputAll', 'Output all the responses')
.option('-k, --ignoreSSL', 'Ignore ssl errors')
.option('-c, --chromePath <path>', 'Set chromium path permenantly')
program.parse(process.argv);

var pendingOutput=[]

//graceful termination, output is not lost on sigint/sigterm
function gracefulTermination(bTerminate=true){
    console.log('Exiting....')
    if(program.output){
        if(!pendingOutput.length){
            console.log('No vulnerabilities found, not creating an output file.')
            if(bTerminate){
                process.exit(1)
            }else{
                return
            }
        }

        //there were results and output pending, write it in json format
        var result = {}
        baseUrl = program.url.replace(/^http(s)?:\/\//, '')
        baseUrl = baseUrl.replace(/\/.*$/, '')
    
        result.host = baseUrl
        result.fuzzTarget = program.url
        result.host_ip = remoteAddr
        result.port = remotePort
        result.source = 'puff-fuzzer'
        result.found = []
        for(var i=0;i<pendingOutput.length;i++){
            result.found.push(pendingOutput[i])
        }
    
        var data = JSON.stringify(result);
        fs.writeFileSync(outputFile, data);
    }

    if(bTerminate){
        process.exit(1)
    }else{
        return
    }
}

//register signal handlers
process.once('SIGINT', function (code) {
   gracefulTermination()
  });

process.once('SIGTERM', function (code) {
gracefulTermination()
});





//responsible for writing request output
function writeRequestResponse(message, clamp=process.stdout.columns-2){
    
    //if message is longer than the clamp length, clamp it and append ...
    if(message.length >=clamp)
        message = (message.substring(0, clamp - 3) + "...")
    
    //if demo mode is activated, hide base url
    if(demo){
        message = message.replace(/http(s)?:\/\/.*?\//, "https://[REDACTED]/")
    }

    //output all mode, write every response, even normal ones
    if(oa){
        process.stdout.write("\n" + message)
    }else{
        //if last output wasn't registered as important, delete the last line
        if(!bLastOutputImportant){
            process.stdout.write("\r\x1b[K")
            process.stdout.write(message)
        }else{
            process.stdout.write("\n" + message)
        }
    }

    
}


//parse cli params to variables
var verbose = program.verbose || false
var url=program.url
var wordlist=program.wordlist
var workerCount=program.threads
var demo = program.demo || false
var status = program.status || false
var oa = program.outputAll || false
var browser = false
var outputFile = program.output|| false
var sslIgnore = program.ignoreSSL|| false

var threads = []
var wlistContent = false
var wlistFpointer=0
var preloadFile;
var bLastOutputImportant=true
var remoteAddr = false
var remotePort = false

if(program.chromePath){
    var conf_temp = require(path.join(__dirname,'/config.json'))
    console.log("Chrome path changing from '" + conf_temp.chromium_path + "' to '" + program.chromePath + "'")
    conf_temp.chromium_path = program.chromePath
    fs.writeFileSync(path.join(__dirname,'/config.json'), JSON.stringify(conf_temp), 'utf8');
}

if(!(program.wordlist || program.url)){
    console.log('Wordlist and url are required parameters.')
    process.exit()
}





var config = require(path.join(__dirname,'/config.json'))

//create new thread, in this context, create new chromium tab
var threadIDCounter = 0
async function makeNewThread(browser, callback){
    const page = await browser.newPage();
    page.id=threadIDCounter++;
    await page.evaluateOnNewDocument(preloadFile);
    await page.exposeFunction('xssCallback', (href)=>{
        catchXSS(page, href)
        loadNextUrl(thread)
    })

    await page.exposeFunction('jsRedirectCallback', (href)=>{
        //page.justRedirected=true
        catchRedirectJS(page, href)
    })
    if(verbose) console.log("Created thread")
    callback(page)
    return page
}

//load a url in thread
async function loadURL(thread, url){
    try{
        thread.goto(thread.url)
        
        //capture window response
        const response = await thread.waitForNavigation();
        remoteAddr = response._remoteAddress.ip
        remotePort = response._remoteAddress.port

        //acquire possible redirect chain
        chain = (response.request().redirectChain())
        
        //get http response 
        thread.status = response.status();
        
        //if there was a redirect chain, output it. If not, its a normal response
        if(chain.length){
            thread.wasHTTPRedirect = true;
            catchRedirect(thread, chain)
        }else{
            catchNormal(thread)
        }
    }catch(e){
        //Not properly implemented yet, dom-errors, http timeouts
        catchLoadFailure(thread)
    }
    
    //recurses
    loadNextUrl(thread)
}

//Called when a pool requests next url from wlist, but wlist has finished
//Attempt terminate only once, call gracefulTermination to handle file input first
terminated = false
function terminateProgram(){
    gracefulTermination(false);
    if(!terminated){
        terminated=true
        //deletes if last output was normal
        writeRequestResponse("")
        browser.close()
    }
}

//Count how many threads were terminated
var terminatedCount = 0

//prepare thread for loading url
async function loadNextUrl(thread){
    thread.url = ""

    //if this thread is done
    if(wlistFpointer>=wlistContent.length){
        terminatedCount+=1
        wlistFpointer+=1
        
        //Only terminate program if all the threads have finished, so it doesn't lose the progress on those pending requests. 
        if(terminatedCount==workerCount){
            //TODO, timeout possible idle/stuck threads and terminate
            terminateProgram()
        }
        
        //Return because no more paylaods left in the wordlist
        return
    }else{

        //acquire next line from wordlist for pool
        var line = wlistContent[wlistFpointer]
        wlistFpointer+=1

        //not sure if needed, whitespace in url seems to be a global 400
        line = line.replace(/ /g, '%20')
        thread.pld = line
        var t=url
        t = t.replace(/FUZZ/g,line.replace(/\n|\r/g,''))
        thread.url = t
        
        loadURL(thread,thread.url)
    }   
}


//Deprecated and im too lazy to remove it from the code
function initCallback(page){
    return page.url
    //this had something else, im too lazy to change it
}

//Catch a redirect and output it
function catchRedirect(thread, chain){
    thread.url = initCallback(thread)
    writeRequestResponse(`${ystart}[${thread.status}]  [REDIRECT-HTTP] ${thread.url}${thread.pld}`)
    for(var i=0;i<chain.length;i++){
        writeRequestResponse(`       ${"    ".repeat(i)}|--> ${chain[i].response().url()}`)
    }
    writeRequestResponse(colstop)
    bLastOutputImportant=true
    
}

//catch a js based redirect, quite not ready (race condition with normal redirect, no good solution with 100% precision yet)
function catchRedirectJS(thread, target){
    return
    if(thread.wasHTTPRedirect){
        thread.wasHTTPRedirect=false;
        return
    }
    initCallback('redirect-js')
    writeRequestResponse(`${bstart}[200]  [REDIRECT-JS] ${thread.url}${thread.pld}`)
    writeRequestResponse(`       |--> ${target}`)
    writeRequestResponse(colstop)
    
}

//catch when an xss occurs
function catchXSS(thread, href){
    thread.url = initCallback(thread)
    writeRequestResponse(`${rstart}[${thread.id}][${200}]  [XSS]  ${thread.url} ${colstop}`)
    bLastOutputImportant=true
    pendingOutput.push({
        url:thread.url,
        payload:thread.pld
    })

    //xss windows tend to get load looped, but not sure if needed
    //thread.evaluate(() => window.stop());
}

//reserved for dom errors TODO
function catchLoadFailure(thread){
    thread.url = initCallback(thread)
    writeRequestResponse(`${bstart}[${thread.status}]  [FAILURE]  ${thread.pld} ${colstop}`, 5000)
    bLastOutputImportant=true
}

//just a normal response
function catchNormal(thread){
    
    thread.url = initCallback(thread)
    if(thread.justRedirected){
        thread.justRedirected=false
        return
    }
    writeRequestResponse(`${gstart}[${thread.id}][${thread.status}] ${colstop} ${thread.url}`)
    if(thread.status==200){
        bLastOutputImportant=false
    }else{
        if(status)bLastOutputImportant=true
        else bLastOutputImportant=false
    }
    return
}


//resolve chromium path
var chromium_path = glob.sync(config.chromium_path, {});
if(chromium_path.length) chromium_path=chromium_path[0]
else{
    console.log("Could not resolve the directory in the config.json file.")
    process.exit(1)
}

//init tool
(async () => {
    //if its demo mode, clear commandline, and remove the actual command (so it hides the url in cli)
    if(demo){
        process.stdout.clearLine()
        process.stdout.cursorTo(0,0)
        process.stdout.write(' '.repeat(128))
        process.stdout.cursorTo(0,0)
    }

    browser = await puppeteer.launch({executablePath:chromium_path,args: ['--no-sandbox', '--disable-setuid-sandbox'], ignoreHTTPSErrors: sslIgnore});

    //preload our junk to browser
    preloadFile = await fs.readFileSync(__dirname + '/preload.js', 'utf8');

    //read wordlist
    if(verbose) console.log(`${warn} Reading Wordlist`)
    wlistContent = await fs.readFileSync(wordlist).toString().split("\n")
    if(verbose) console.log(`${succ} Wordlist loaded, ${wlistContent.length} lines.`)
    
    //initialize threads
    for(var i=0;i<workerCount;i++){
        var newThread = makeNewThread(browser, loadNextUrl);
        threads.push(newThread)
    }

})();
