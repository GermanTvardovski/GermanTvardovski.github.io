function dropDown() {
    console.log(""+document.querySelector(".monM").style.position);
    if(document.querySelector(".monM").style.position == "relative") {
        document.querySelector(".monM").style.position = "absolute";
        document.querySelector(".monM").style.right = "-99999px";
        document.querySelector(".monM").style.left = "-99999px";
        document.querySelector("#lisnmon").style.color = "#161823";
        document.querySelector("#ickm").src = "img/mon1.svg";
        document.querySelector(".strelka").style.transform = "rotate(180deg)";
    }
    else {
        document.querySelector(".monM").style.position = "relative";
        document.querySelector(".monM").style.right = "0px";
        document.querySelector(".monM").style.left = "0px";
        document.querySelector("#lisnmon").style.color = "#FE2C55";
        document.querySelector("#ickm").src = "img/mon2.svg";
        document.querySelector(".strelka").style.transform = "rotate(0deg)";
    }
}

function dropDown1() {
    console.log(document.querySelector(".viewVideo").style.position);
    if(document.querySelector(".viewVideo").style.position != "relative") {
        document.querySelector(".viewVideo").style.position = "relative";
        document.querySelector(".viewVideo").style.right = "0px";
        document.querySelector(".viewVideo").style.left = "0px";
        document.querySelector("#back").style.right = "0px";
        document.querySelector("#back").style.left = "1%";
        document.querySelector("#prosmv").style.color = "#FE2C55";
    }
    if(document.documentElement.scrollWidth < 1100) {
        document.querySelector(".menuL").style.display = "none";
        document.querySelector(".menu").style.width = "1%";
    }
}

function back() {
    document.querySelector("#back").style.right = "-99999px";
    document.querySelector("#back").style.left = "-99999px";
    document.querySelector(".viewVideo").style.position = "absolute";
    document.querySelector(".viewVideo").style.right = "-99999px";
    document.querySelector(".viewVideo").style.left = "-99999px";
    document.querySelector("#prosmv").style.color = "#161823";
    if(document.documentElement.scrollWidth < 1100) {
        document.querySelector(".menuL").style.display = "block";
        document.querySelector(".menu").style.width = "90%";
    }
}

var deviceAgent = navigator.userAgent.toLowerCase(),
    agentID = deviceAgent.match(/(iphone|ipod|ipad)/),
    mobileLink = $('.lisn'); // Добавить этот класс всем ссылкам, которые должны нажиматься

touchMenuEvent = agentID ? "touchstart" : "click";
mobileLink.bind(touchMenuEvent, function() {
    $(this).click();
});