alert = function(a=0){
    xssCallback(window.location.href)
}
test = alert
prompt = alert
confirm = alert