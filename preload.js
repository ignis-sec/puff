alert = function(a=0){
    xssCallback(window.location.href)
}

origin = window.location.href

window.addEventListener("unload", function (event) {
    //Catch js redirects
    jsRedirectCallback(window.location.href)
 });
test = alert
prompt = alert
confirm = alert