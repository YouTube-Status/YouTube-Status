$(function() {

    // OSチェック
    chrome.runtime.getPlatformInfo(function(info){
        if (info.os != "win") {
            $(".option").hide();
            $("#os_error").show();
            return;
        };

        chrome.storage.local.get("directory", function(result) {
            let directory = result.directory;

            $(".option").show();
            $("#directory_error").hide();

            if (!directory) {
                $(".option").hide();
                $("#directory_error").show();
            };
        });
    });

    chrome.storage.local.get("status", function(result) {
        let status = result.status;

        if (status) {
            $("#status").prop("checked", true);
            chrome.storage.local.set({"status": true});
            $("#all_tabs").prop("disabled", false);
        } else {
            $("#all_tabs").prop("disabled", true);
        };
    });

    chrome.storage.local.get("all_tabs", function(result) {
        let all_tabs_status = result.all_tabs;

        if (all_tabs_status) {
            $("#all_tabs").prop("checked", true);
            chrome.storage.local.set({"all_tabs": true});
        };
    });

});

$(document).on("change", "#status", function() {
    let status = $(this).prop("checked");

    if (status) {
        $("#all_tabs").prop("disabled", false);
        chrome.storage.local.set({"status": true});
    } else {
        $("#all_tabs").prop("disabled", true);
        chrome.storage.local.set({"status": false});
        chrome.storage.local.set({"config_reset": true});
    };
});

$(document).on("change", "#all_tabs", function() {
    let status = $(this).prop("checked");

    if (status) {
        chrome.storage.local.set({"all_tabs": true});
    } else {
        chrome.storage.local.set({"all_tabs": false});
    };
});

$(document).on("click", "#reset", function() {
    $(this).prop("disabled", true);
    chrome.storage.local.set({"config_reset": true});
});