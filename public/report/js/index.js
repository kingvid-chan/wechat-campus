(function(){

var now = { row:1, col:1 }, last = { row:0, col:0};
const towards = { up:1, right:2, down:3, left:4};
var isAnimating = false;
var maxPage = 4;
document.addEventListener("touchmove",function(event){
	event.preventDefault(); },false);

$(document).swipeUp(function(){
	if (isAnimating) return;
	last.row = now.row;
	last.col = now.col;
	if (last.row != maxPage) { now.row = last.row+1; now.col = 1; pageMove(towards.up);}	
})
$(document).swipeDown(function(){
	if (isAnimating) return;
	last.row = now.row;
	last.col = now.col;
	if (last.row!=1) { now.row = last.row-1; now.col = 1; pageMove(towards.down);}	
})

function pageMove(tw){
	var lastPage = ".page-"+last.row+"-"+last.col,
		nowPage = ".page-"+now.row+"-"+now.col;
	switch(tw) {
		case towards.up:
			outClass = "page-moveToTop";
			inClass = "page-moveFromBottom";
			isAnimating = true;
			$(nowPage).removeClass("hide");
			
			$(lastPage).addClass(outClass);
			$(nowPage).addClass(inClass);
			setTimeout(function(){
				$(lastPage).removeClass("page-current");
				$(lastPage).removeClass(outClass);
				$(lastPage).addClass("hide");
				$(nowPage).addClass("page-current");
				$(nowPage).removeClass(inClass);
				
				isAnimating = false;
			},1600);
			break;
		case towards.down:
			$(lastPage).removeClass("page-current");
			$(lastPage).addClass("hide");
			$(nowPage).addClass("page-current").removeClass('hide');
			break;
	}
	if (nowPage==".page-4-1") {
		$(".meter > span").each(function(){
	    	$(this).animate({
		    	width: $(this).attr("origWidth")
		    }, 1200);
	    })
	}
	
}

})();