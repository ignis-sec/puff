
const fs = require('fs')

class ThreadHandler{
    constructor(browser,cbHandler){
        this.browser = browser
        this.workerCount=0
        //preload our junk to browser
        this.preloadFile = fs.readFileSync(__dirname + '/preload.js', 'utf8');
    }

    async newThread(browser,fuzzer,cbHandler){
        const page = await this.browser.newPage();
        var thread = page;
        page.id=this.workerCount++;
        await page.evaluateOnNewDocument(this.preloadFile);
        await page.exposeFunction('xssCallback', (href)=>{
            cbHandler.catchXSS(page, href)
            callback(thread)
        })

        await page.exposeFunction('jsRedirectCallback', (href)=>{
            cbHandler.catchRedirectJS(page, href)
        })

        fuzzer.loadNextUrl(thread)
        return page
    }
}


module.exports = {
    ThreadHandler: ThreadHandler
}