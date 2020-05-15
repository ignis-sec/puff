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
.option('-T, --timeout <ms>', 'timeout for each worker to wait until js code finishes in milliseconds', 500)
.option('-t, --threads <tcount>', 'threads to run', 5)
.option('-v, --verbose', 'verbosity')
.option('-W, --window', 'show window')
.option('-m, --manual', 'manual mode');
program.parse(process.argv);

console.log = function(message){
    
    if(!bLastOutputImportant){
        process.stdout.write("\r\x1b[K")
        process.stdout.write(message)
    }else{
        process.stdout.write("\n" + message)
    }
    
}

//parse cli params to variables
var verbose = program.verbose || false
var url=program.url
var wordlist=program.wordlist
var workerCount=program.threads
var timeoutLen=program.timeout //deprecated
var window = program.window || false
var browser = false

var threads = []
var wlistContent = false
var preloadFile;
var bLastOutputImportant=true
async function makeNewThread(browser, callback){
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(preloadFile);
    await page.exposeFunction('xssCallback', (href)=>{
        catchXSS(href)
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
    thread.goto(url)
    const response = await thread.waitForNavigation();
    chain = (response.request().redirectChain())
    thread.status = response.status();
    if(chain.length){
        thread.wasHTTPRedirect = true;
        catchRedirect(thread, chain)
    }else{
        catchNormal(thread)
    }
    return loadNextUrl(thread)
}

terminated = false
function terminateProgram(){
    if(!terminated){
        terminated=true
        browser.close()
    }
}

var terminatedCount = 0
async function loadNextUrl(thread){

    //if this thread is done
    if(wlistFpointer>=wlistContent.length){
        terminatedCount+=1
        if(terminatedCount==workerCount){
            terminateProgram()
        } 
        return
    }else{

        var line = wlistContent[wlistFpointer]
        line = line.replace(/ /g, '%20')
        thread.pld = line
        

        //create fuzz target
        var t = url.replace("FUZZ",(line))
        thread.url = t
        
        //increment file pointer counter
        wlistFpointer+=1;
        //if its manual mode, update menu
        return await loadURL(thread,t)
    }   
}


//Callbacks from different types of events
function initCallback(_url){
    url = _url;
    if(_url.length>150) url = (_url.substring(0, 150) + "...")
    return url
}

function catchRedirect(thread, chain){
    thread.url = initCallback(thread.url)
    console.log(`${ystart}[${thread.status}]  [REDIRECT-HTTP] ${thread.url}${thread.pld}`)
    for(var i=0;i<chain.length;i++){
        console.log(`       ${"    ".repeat(i)}|--> ${chain[i].response().url()}`)
    }
    console.log(colstop)
    bLastOutputImportant=true
    
}

function catchRedirectJS(thread, target){
    return
    if(thread.wasHTTPRedirect){
        thread.wasHTTPRedirect=false;
        return
    }
    initCallback('redirect-js')
    console.log(`${bstart}[200]  [REDIRECT-JS] ${thread.url}${thread.pld}`)
    console.log(`       |--> ${target}`)
    console.log(colstop)
    
}

function catchXSS(href){
    href = initCallback(href)
    console.log(`${rstart}[${200}]  [XSS]  ${href} ${colstop}`)
    bLastOutputImportant=true
}

function catchLoadFailure(thread){
    thread.url = initCallback(thread.url)
    console.log(`${bstart}[${thread.status}]  [FAILURE]  ${thread.pld} ${colstop}`)
    bLastOutputImportant=true
}

function catchNormal(thread){
    
    thread.url = initCallback(thread.url)
    if(thread.justRedirected){
        thread.justRedirected=false
        return
    }
    if(thread.status==200){
        console.log(`${gstart}[${thread.status}] ${colstop} ${thread.url}`)
        bLastOutputImportant=false
    }else{
        console.log(`${rstart}[${thread.status}] ${colstop} ${thread.url}`)
        bLastOutputImportant=true
    }
    return
}
















(async () => {
    browser = await puppeteer.launch({});
    preloadFile = await fs.readFileSync('./preload.js', 'utf8');
    //read wordlist
    if(verbose) console.log(`${warn} Reading Wordlist`)
    wlistContent = await fs.readFileSync(wordlist).toString().split("\n")
   
    if(verbose) console.log(`${succ} Wordlist loaded, ${wlistContent.length} lines.`)
    wlistFpointer=0;
    

    //initialize threads
    for(var i=0;i<workerCount;i++){
        var newThread = makeNewThread(browser, loadNextUrl);
        threads.push(newThread)
    }

})();