var currentPage = 1;
changePage();

function changePage() {
    var goBackButton = document.getElementById("goBack")
    var nextButton = document.getElementById("next");

    if(currentPage == 1) {
        goBackButton.disabled = true;
    } else {
        goBackButton.disabled = false;
    }

    if(currentPage == 7) {
        nextButton.disabled = true;
    } else {
        nextButton.disabled = false;
    }

    for(var i = 1; i <= 7; i++) {
        var tutorialPage = document.getElementById("step_" + i);
        if(i == currentPage) {
            tutorialPage.style.display = "flex";
        } else {
            tutorialPage.style.display = "none";
        }
    }
}

function goBackPage() {
    currentPage--;
    changePage();
}

function nextPage() {
    currentPage++;
    changePage();
}