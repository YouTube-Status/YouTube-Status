const alpha = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const repeat_milliseconds = 1000;
const host_name = "youtube_status";

function ready() {
    // 12桁のTOKENを生成
    token = "";
    for (let i = 0; i < 12; i++) {
        token += alpha[Math.floor(Math.random()*alpha.length)];
    };

    // 接続
    try {
        port = chrome.runtime.connectNative(host_name);

        // 受信
        port.onMessage.addListener(function(message) {
            if (message == "200") {
                chrome.storage.local.set({"directory": true});
            } else if (message == "404") {
                chrome.storage.local.set({"directory": false});
            };
        });

        // 切断
        port.onDisconnect.addListener(function() {
            // 再接続
            port = chrome.runtime.connectNative(host_name);
        });

    } catch(e) {
        // pass
    };

    setInterval(YouTube_Status, repeat_milliseconds);
};

function post_message(message) {
    chrome.runtime.getPlatformInfo(function(info){
        // OSチェック
        if (info.os != "win") {
            return;
        };

        try {
            port.postMessage(message);
        } catch(e) {
            try {
                port = chrome.runtime.connectNative(host_name);
                port.postMessage(message);
            } catch(e) {
                // pass
            };
        };
    });
};

function active_tab() {
    // アクティブタブ取得
    chrome.tabs.query({"active": true, "lastFocusedWindow": true}, tab => {
        // 空の配列を弾く
        if (tab.length != 1) {
            return;
        };

        url = tab[0].url;
        title = tab[0].title;
        
        // URLチェック
        if (url.startsWith("https://www.youtube.com/watch")) {
            title = title.replace(/^\([0-9]+\)/, "").replace(/(- YouTube)$/, "").replace(/^\s+|\s+$/g, "");
            post_message(`{"token":"${token}", "type":"status", "active":True, "multi":1, "active_tab":True, "title":"${title}", "url":"${url}"}`);
        } else {
            post_message(`{"token":"${token}", "type":"status", "active":False, "multi":0, "active_tab":False, "title":"null", "url":"null"}`);
        };
    });
};

function all_tabs() {
    // 全ウィンドウの全タブを取得
    chrome.tabs.query({}, function(tabs){
        // 現在のウィンドウを取得
        chrome.windows.getCurrent(function(window){
            let url_array = [];
            let title_array = [];
            let active_url_array = [];
            let active_title_array = [];
            let active_tab = false;

            for (let i = 0; i < tabs.length; i++) {
                let url = tabs[i].url;
                let title = tabs[i].title;
                title = title.replace(/^\([0-9]+\)/, "").replace(/(- YouTube)$/, "").replace(/^\s+|\s+$/g, "");

                // URLチェック
                if (url.startsWith("https://www.youtube.com/watch")) {
                    // アクティブウィンドウのアクティブタブ
                    if (tabs[i].active == true && tabs[i].windowId == window.id) {
                        active_tab = true;
                        post_message(`{"token":"${token}", "type":"status", "active":True, "multi":1, "active_tab":True, "title":"${title}", "url":"${url}"}`);
                        break;
                    };

                    // 別ウィンドウのアクティブタブ
                    if (tabs[i].active) {
                        active_url_array.push(url);
                        active_title_array.push(title);
                    };

                    url_array.push(url);
                    title_array.push(title);
                };
            };
            
            // YouTubeのタブが1つだけのとき（アクティブウィンドウのアクティブタブ）
            if (active_tab) {
                return;
            };

            // YouTubeのタブが1つだけのとき（別ウィンドウのアクティブタブ）
            if (active_url_array.length == 1) {
                post_message(`{"token":"${token}", "type":"status", "active":True, "multi":1, "active_tab":True, "title":"${active_title_array[0]}", "url":"${active_url_array[0]}"}`);
                return;
            };

            // YouTubeを視聴していないとき
            if (url_array == 0) {
                post_message(`{"token":"${token}", "type":"status", "active":False, "multi":0, "active_tab":False, "title":"null", "url":"null"}`);
                return;
            };

            // YouTubeのタブが1つだけのとき（すべてのタブ）
            if (url_array.length == 1) {
                post_message(`{"token":"${token}", "type":"status", "active":True, "multi":1, "active_tab":False, "title":"${title_array[0]}", "url":"${url_array[0]}"}`);
                return;
            };

            // YouTubeのタブが2つ以上のとき（すべてのタブ）
            post_message(`{"token":"${token}", "type":"status", "active":True, "multi":${url_array.length}, "active_tab":False, "title":"null", "url":"null"}`);
        });
    });
};

async function YouTube_Status() {
    let invalid = false;

    await chrome.storage.local.get("config_reset", function(result) {
        let config_reset = result.config_reset;

        if (config_reset) {
            post_message(`{"token":"${token}", "type":"status", "active":False, "multi":0, "active_tab":False, "title":"null", "url":"null"}`);
            chrome.storage.local.set({"config_reset": false});
        };
    });

    // 実行確認
    await chrome.storage.local.get("status", function(result) {
        let status = result.status;
        
        if (status == undefined) {
            chrome.storage.local.set({"status": true});
        };

        if (!status) {
            invalid = true;
        };
    });

    // タブ確認
    await chrome.storage.local.get("all_tabs", function(result) {
        if (invalid) {
            return;
        };

        let all_tabs_status = result.all_tabs;

        if (all_tabs_status == undefined) {
            chrome.storage.local.set({"all_tabs": true});
        };

        if (all_tabs_status) {
            all_tabs();
        } else if (!all_tabs_status) {
            active_tab();
        } else {
            chrome.storage.local.set({"all_tabs": true});
        };
    });
};

// OSチェック
chrome.runtime.getPlatformInfo(function(info){
    if (info.os == "win") {
        ready();
    };
});

// ウィンドウ終了
chrome.windows.onRemoved.addListener(function() {
    // Win以外でのエラー防止
    try {
        chrome.windows.getAll(null, function(windows) {
            if (windows.length == 0) {
                post_message(`{"token":"${token}", "type":"disconnect_all"}`);
            } else {
                post_message(`{"token":"${token}", "type":"disconnect"}`);
            };
        });
    } catch (e) {
        // pass
    };
});