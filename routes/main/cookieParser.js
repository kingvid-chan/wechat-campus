var CookieToJSON = exports.CookieToJSON = function(cookieArr, cookieObj, cookieStr){
	if (cookieArr) {
		cookieArr.forEach(function(value){
			if (value.indexOf("JSESSIONID")!==-1) {
				cookieObj.JSESSIONID = value.slice(11,value.indexOf(";"));
			}else if(value.indexOf("iPlanetDirectoryPro")!==-1){	
				cookieObj.iPlanetDirectoryPro = value.slice(20,value.indexOf(";"));
			}else if (value.indexOf("PHPSESSID")!==-1) {
				cookieObj.PHPSESSID = value.slice(10,value.indexOf(";"));
			}else return;
		})
	}else{
		if (cookieStr.indexOf("JSESSIONID")!==-1) {
			var jStartPos = cookieStr.indexOf("JSESSIONID")+11;
			var jEndPos = cookieStr.indexOf(";",jStartPos);
			cookieObj.JSESSIONID = cookieStr.slice(jStartPos,jEndPos);
		} 
		if (cookieStr.indexOf("PHPSESSID")!==-1) {
			var pStartPos = cookieStr.indexOf("PHPSESSID")+10;
			var pEndPos = cookieStr.indexOf(";",pStartPos);
			cookieObj.PHPSESSID = cookieStr.slice(pStartPos,pEndPos);
		}
		if (cookieStr.indexOf("iPlanetDirectoryPro")!==-1) {
			var iStartPos = cookieStr.indexOf("iPlanetDirectoryPro")+20;
			var iEndPos = cookieStr.indexOf(";",iStartPos);
			cookieObj.iPlanetDirectoryPro = cookieStr.slice(iStartPos,iEndPos);
		}
	}
}

var CookieToStr = exports.CookieToStr = function(cookieObj){
	var cookieStr = "";
	cookieStr+= cookieObj.JSESSIONID ? "JSESSIONID="+cookieObj.JSESSIONID+"; " : "";
	cookieStr+= cookieObj.iPlanetDirectoryPro ? "iPlanetDirectoryPro="+cookieObj.iPlanetDirectoryPro+"; " : "";
	cookieStr+= cookieObj.PHPSESSID ? "PHPSESSID="+cookieObj.PHPSESSID+"; " : "";
	return cookieStr;
}