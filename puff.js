const puppeteer = require('puppeteer');
const { program } = require('commander');
const fs = require('fs')

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
.requiredOption('-w, --wordlist <file>', 'wordlist to use')
.requiredOption('-u, --url <url>', 'url to fuzz')
.option('-t, --threads <tcount>', 'threads to run', 5)
.option('-v, --verbose', 'verbosity')
.option('-d, --demo', 'Demo mode, hides url\'s in output')
.option('-s, --status', 'Show requests with unusual response codes')
.option('-oA, --outputAll', 'Output all the responses')
program.parse(process.argv);

function writeRequestResponse(message, clamp=process.stdout.columns-2){
    if(message.length >=clamp)
        message = (message.substring(0, clamp - 3) + "...")
    if(demo){
        message = message.replace(/http(s)?:\/\/.*?\//, "https://[REDACTED]/")
    }

    if(oa){
        process.stdout.write("\n" + message)
    }else{
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

var threads = []
var wlistContent = false
var wlistFpointer=0
var preloadFile;
var bLastOutputImportant=true

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


async function loadURL(thread, url){
    try{
        thread.goto(thread.url)
        const response = await thread.waitForNavigation();
        chain = (response.request().redirectChain())
        thread.status = response.status();
        if(chain.length){
            thread.wasHTTPRedirect = true;
            catchRedirect(thread, chain)
        }else{
            catchNormal(thread)
        }
    }catch(e){
        catchLoadFailure(thread)
    }
    
    loadNextUrl(thread)
}

terminated = false
function terminateProgram(){
    if(!terminated){
        terminated=true
        writeRequestResponse("")
        browser.close()
    }
}

var terminatedCount = 0
async function loadNextUrl(thread){
    thread.url = ""
    //if this thread is done
    if(wlistFpointer>=wlistContent.length){
        terminatedCount+=1
        wlistFpointer+=1
        if(terminatedCount==workerCount){
            terminateProgram()
        } 
        return
    }else{

        var line = wlistContent[wlistFpointer]
        wlistFpointer+=1
        //line = line.replace(/ /g, '%20')
        thread.pld = line
        var t=url
        t = t.replace("FUZZ",line)
        thread.url = t
        
        loadURL(thread,thread.url)
    }   
}


//Callbacks from different types of events
function initCallback(page){
    return page.url
    //this had something else, im too lazy to change it
}

function catchRedirect(thread, chain){
    thread.url = initCallback(thread)
    writeRequestResponse(`${ystart}[${thread.status}]  [REDIRECT-HTTP] ${thread.url}${thread.pld}`)
    for(var i=0;i<chain.length;i++){
        writeRequestResponse(`       ${"    ".repeat(i)}|--> ${chain[i].response().url()}`)
    }
    writeRequestResponse(colstop)
    bLastOutputImportant=true
    
}

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

function catchXSS(thread, href){
    thread.url = initCallback(thread)
    writeRequestResponse(`${rstart}[${thread.id}][${200}]  [XSS]  ${thread.url} ${colstop}`)
    bLastOutputImportant=true
    //thread.evaluate(() => window.stop());
}

function catchLoadFailure(thread){
    thread.url = initCallback(thread)
    writeRequestResponse(`${bstart}[${thread.status}]  [FAILURE]  ${thread.pld} ${colstop}`, 5000)
    bLastOutputImportant=true
}

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
















(async () => {
    if(demo){
        process.stdout.clearLine()
        process.stdout.cursorTo(0,0)
        process.stdout.write(' '.repeat(128))
        process.stdout.cursorTo(0,0)
    }
    browser = await puppeteer.launch({});
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
